import type { WrapMarker, WrapRange } from './MarkdownEditorTypes';

/**
 * Formatter input state.
 *
 * This state mirrors textarea content and current selection.
 */
export type MarkdownFormatterState = {
    /** Full markdown value to transform. */
    value: string;
    /** Selection start index. */
    selectionStart: number;
    /** Selection end index. */
    selectionEnd: number;
};

/**
 * Formatter output state.
 *
 * The result always includes transformed content and the next selection range.
 */
export type MarkdownFormatterResult = MarkdownFormatterState;

/**
 * Pure markdown transformation engine.
 *
 * Design goals:
 * - deterministic edits based on explicit input state
 * - no direct DOM access
 * - selection-safe transforms for toolbar commands
 *
 * Usage:
 * - create instance with current `value + selection`
 * - call one action method
 * - apply returned state to textarea/model
 */
export class MarkdownFormatter {
    private readonly value: string;
    private readonly selectionStart: number;
    private readonly selectionEnd: number;

    /**
     * Build formatter from current editor state.
     *
     * Safety:
     * - normalizes line endings to `\n`
     * - clamps and normalizes selection bounds
     */
    public constructor(state: MarkdownFormatterState) {
        this.value = MarkdownFormatter.normalizeLineEndings(state.value ?? '');
        const max = this.value.length;
        const start = Math.min(Math.max(0, state.selectionStart ?? 0), max);
        const end = Math.min(Math.max(0, state.selectionEnd ?? 0), max);
        this.selectionStart = Math.min(start, end);
        this.selectionEnd = Math.max(start, end);
    }

    /**
     * Replace current selection with plain text and move caret to inserted end.
     */
    public insertText(text: string): MarkdownFormatterResult {
        const replacement = text ?? '';
        const next = this.replaceRange(this.selectionStart, this.selectionEnd, replacement);
        const caret = this.selectionStart + replacement.length;
        return {
            ...next,
            selectionStart: caret,
            selectionEnd: caret,
        };
    }

    /**
     * Wrap selection in markdown link syntax.
     *
     * Behavior:
     * - if selection is empty, inserts `[link text](url)`
     * - URL portion is selected after insertion for quick replacement
     */
    public insertLink(url = 'url'): MarkdownFormatterResult {
        const selectedText = this.selectedText();
        const selected = selectedText.length > 0 ? selectedText : 'link text';
        const replacement = `[${selected}](${url})`;
        const next = this.replaceRange(this.selectionStart, this.selectionEnd, replacement);
        const urlStart = this.selectionStart + replacement.indexOf(url);
        const urlEnd = urlStart + url.length;

        return {
            ...next,
            selectionStart: urlStart,
            selectionEnd: urlEnd,
        };
    }

    /**
     * Insert a horizontal rule block (`---`) with surrounding newline hygiene.
     */
    public insertHorizontalRule(): MarkdownFormatterResult {
        const before = this.value.slice(0, this.selectionStart);
        const after = this.value.slice(this.selectionEnd);

        const prefix = before.endsWith('\n\n') || before.length === 0 ? '' : before.endsWith('\n') ? '\n' : '\n\n';
        const suffix = after.startsWith('\n\n') || after.length === 0 ? '' : after.startsWith('\n') ? '\n' : '\n\n';
        const replacement = `${prefix}---${suffix}`;
        const next = this.replaceRange(this.selectionStart, this.selectionEnd, replacement);
        const caret = this.selectionStart + replacement.length;

        return {
            ...next,
            selectionStart: caret,
            selectionEnd: caret,
        };
    }

    /**
     * Toggle heading level for all lines intersecting current selection.
     *
     * Behavior:
     * - same-level heading is removed
     * - different level heading is replaced
     * - plain line receives heading marker
     */
    public toggleHeading(level: number): MarkdownFormatterResult {
        const marker = '#'.repeat(Math.min(Math.max(1, level), 6));
        const range = this.currentLineRange();
        const block = this.value.slice(range.start, range.end);
        const lines = block.split('\n');

        const transformed = lines.map((line) => {
            if (line.trim() === '') {
                return line;
            }

            const leadingWhitespace = (line.match(/^\s*/) ?? [''])[0];
            const body = line.slice(leadingWhitespace.length);
            const parsedHeading = MarkdownFormatter.parseHeadingLine(body);

            if (!parsedHeading) {
                const cleanedBody = body.replace(/\r/g, '').replace(/^\uFEFF/, '');
                return `${leadingWhitespace}${marker} ${cleanedBody}`;
            }

            if (parsedHeading.level === marker.length) {
                return `${leadingWhitespace}${parsedHeading.content}`;
            }

            return parsedHeading.content.length > 0
                ? `${leadingWhitespace}${marker} ${parsedHeading.content}`
                : `${leadingWhitespace}${marker}`;
        });

        const replacement = transformed.join('\n');
        return this.replaceRange(range.start, range.end, replacement, range.start, range.start + replacement.length);
    }

    /**
     * Toggle a line prefix (e.g. bullet or quote) on selected lines.
     */
    public toggleLinePrefix(prefix: string): MarkdownFormatterResult {
        const range = this.currentLineRange();
        const block = this.value.slice(range.start, range.end);
        const lines = block.split('\n');
        const nonEmptyLines = lines.filter((line) => line.trim() !== '');
        const prefixRegex = new RegExp(`^(\\s*)${MarkdownFormatter.escapeRegex(prefix)}`);
        const allPrefixed = nonEmptyLines.length > 0 && nonEmptyLines.every((line) => prefixRegex.test(line));

        const transformed = lines.map((line) => {
            if (line.trim() === '') {
                return line;
            }

            if (allPrefixed) {
                return line.replace(prefixRegex, '$1');
            }

            return `${prefix}${line}`;
        });

        const replacement = transformed.join('\n');
        return this.replaceRange(range.start, range.end, replacement, range.start, range.start + replacement.length);
    }

    /**
     * Toggle numbered list formatting for selected lines.
     */
    public toggleNumberedList(): MarkdownFormatterResult {
        const range = this.currentLineRange();
        const block = this.value.slice(range.start, range.end);
        const lines = block.split('\n');
        const nonEmptyLines = lines.filter((line) => line.trim() !== '');
        const numberedRegex = /^(\s*)\d+\.\s+/;
        const allNumbered = nonEmptyLines.length > 0 && nonEmptyLines.every((line) => numberedRegex.test(line));

        const transformed = lines.map((line, index) => {
            if (line.trim() === '') {
                return line;
            }

            if (allNumbered) {
                return line.replace(numberedRegex, '$1');
            }

            const n = lines.slice(0, index + 1).filter((l) => l.trim() !== '').length;
            return `${n}. ${line}`;
        });

        const replacement = transformed.join('\n');
        return this.replaceRange(range.start, range.end, replacement, range.start, range.start + replacement.length);
    }

    /**
     * Toggle inline wrapper format for current selection.
     *
     * Examples:
     * - `**text**` for bold
     * - `*text*` for italic
     *
     * Key rule:
     * - selecting full wrapped content unwraps cleanly
     * - partial non-collapsed selections do not unwrap larger parent spans
     */
    public toggleWrap(
        prefix: string,
        suffix: string,
        placeholder: string,
        markerVariants?: WrapMarker[],
    ): MarkdownFormatterResult {
        const variants = markerVariants && markerVariants.length > 0 ? markerVariants : [{ prefix, suffix }];
        const selected = this.selectedText();
        const isCollapsed = this.selectionStart === this.selectionEnd;

        for (const variant of variants) {
            if (
                selected.length > 0 &&
                selected.startsWith(variant.prefix) &&
                selected.endsWith(variant.suffix) &&
                selected.length >= variant.prefix.length + variant.suffix.length
            ) {
                const unwrapped = selected.slice(variant.prefix.length, selected.length - variant.suffix.length);
                return this.replaceRange(
                    this.selectionStart,
                    this.selectionEnd,
                    unwrapped,
                    this.selectionStart,
                    this.selectionStart + unwrapped.length,
                );
            }
        }

        for (const variant of variants) {
            const hasOuterPrefix =
                variant.prefix.length > 0 &&
                this.selectionStart >= variant.prefix.length &&
                this.value.slice(this.selectionStart - variant.prefix.length, this.selectionStart) === variant.prefix;
            const hasOuterSuffix =
                variant.suffix.length > 0 &&
                this.selectionEnd + variant.suffix.length <= this.value.length &&
                this.value.slice(this.selectionEnd, this.selectionEnd + variant.suffix.length) === variant.suffix;

            if (!isCollapsed && hasOuterPrefix && hasOuterSuffix) {
                const outerStart = this.selectionStart - variant.prefix.length;
                const outerEnd = this.selectionEnd + variant.suffix.length;
                return this.replaceRange(outerStart, outerEnd, selected, outerStart, outerStart + selected.length);
            }
        }

        for (const variant of variants) {
            const wrapRange = this.findEnclosingWrapRange(variant);
            if (!wrapRange) {
                continue;
            }

            const selectionMatchesEntireWrappedContent =
                this.selectionStart === wrapRange.contentStart && this.selectionEnd === wrapRange.contentEnd;

            // For non-collapsed selections, only unwrap when selection matches full wrapped content.
            // This avoids surprising edits spanning broader ranges.
            if (!isCollapsed && !selectionMatchesEntireWrappedContent) {
                continue;
            }

            const unwrapped = this.value.slice(wrapRange.contentStart, wrapRange.contentEnd);
            const nextSelectionStart = wrapRange.start + Math.max(0, this.selectionStart - wrapRange.contentStart);
            const nextSelectionEnd = wrapRange.start + Math.max(0, this.selectionEnd - wrapRange.contentStart);
            return this.replaceRange(wrapRange.start, wrapRange.end, unwrapped, nextSelectionStart, nextSelectionEnd);
        }

        const body = selected || placeholder;
        const replacement = `${prefix}${body}${suffix}`;
        const nextSelectionStart = this.selectionStart + prefix.length;
        const nextSelectionEnd = nextSelectionStart + body.length;
        return this.replaceRange(
            this.selectionStart,
            this.selectionEnd,
            replacement,
            nextSelectionStart,
            nextSelectionEnd,
        );
    }

    /**
     * Return selected substring from current state.
     */
    private selectedText(): string {
        return this.value.slice(this.selectionStart, this.selectionEnd);
    }

    /**
     * Compute line-bounded range intersecting the current selection.
     */
    private currentLineRange(): { start: number; end: number } {
        const lineStart = this.value.lastIndexOf('\n', Math.max(0, this.selectionStart - 1)) + 1;
        const nextBreak = this.value.indexOf('\n', this.selectionEnd);
        const lineEnd = nextBreak === -1 ? this.value.length : nextBreak;

        return {
            start: lineStart,
            end: lineEnd,
        };
    }

    /**
     * Replace a range and return updated content + selection.
     */
    private replaceRange(
        start: number,
        end: number,
        replacement: string,
        selectionStart = start,
        selectionEnd = start + replacement.length,
    ): MarkdownFormatterResult {
        const value = `${this.value.slice(0, start)}${replacement}${this.value.slice(end)}`;
        return {
            value,
            selectionStart,
            selectionEnd,
        };
    }

    /**
     * Find enclosing wrapper range around current selection for a marker pair.
     */
    private findEnclosingWrapRange(variant: WrapMarker): WrapRange | null {
        const isCollapsed = this.selectionStart === this.selectionEnd;
        let searchFrom = this.selectionStart;

        while (searchFrom >= 0) {
            const start = this.value.lastIndexOf(variant.prefix, searchFrom - 1);
            if (start === -1) {
                return null;
            }

            const contentStart = start + variant.prefix.length;
            if (contentStart > this.selectionStart && !isCollapsed) {
                searchFrom = start;
                continue;
            }

            const suffixSearchStart = Math.max(this.selectionEnd, contentStart);
            const contentEnd = this.value.indexOf(variant.suffix, suffixSearchStart);
            if (contentEnd === -1) {
                searchFrom = start;
                continue;
            }

            if (!isCollapsed && contentEnd < this.selectionEnd) {
                searchFrom = start;
                continue;
            }

            if (isCollapsed && (this.selectionStart < contentStart || this.selectionStart > contentEnd)) {
                searchFrom = start;
                continue;
            }

            const beforeSelection = this.value.slice(contentStart, this.selectionStart);
            const afterSelection = this.value.slice(this.selectionEnd, contentEnd);
            if (
                beforeSelection.includes('\n') ||
                afterSelection.includes('\n') ||
                beforeSelection.includes('\r') ||
                afterSelection.includes('\r')
            ) {
                searchFrom = start;
                continue;
            }

            return {
                start,
                end: contentEnd + variant.suffix.length,
                contentStart,
                contentEnd,
            };
        }

        return null;
    }

    /**
     * Escape user-provided text for regex construction.
     */
    private static escapeRegex(value: string): string {
        return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    /**
     * Normalize line endings to `\n` for stable index calculations.
     */
    private static normalizeLineEndings(value: string): string {
        return value.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    }

    /**
     * Parse heading marker + content from a line body.
     */
    private static parseHeadingLine(body: string): { level: number; content: string } | null {
        const normalized = body
            .replace(/^\uFEFF/, '')
            .replace(/^[\u200B\u200C\u200D]/, '')
            .replace(/\r/g, '');

        if (!normalized.startsWith('#')) {
            return null;
        }

        let level = 0;
        while (level < normalized.length && normalized[level] === '#' && level < 6) {
            level += 1;
        }

        if (level === 0) {
            return null;
        }

        const remainder = normalized.slice(level);
        const contentRaw = remainder.trimStart();
        const content = contentRaw.replace(/\s+#+\s*$/u, '').trimEnd();

        return { level, content };
    }
}
