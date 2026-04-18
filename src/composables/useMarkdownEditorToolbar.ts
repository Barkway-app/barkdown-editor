import { nextTick, ref, type Ref } from 'vue';
import type { MarkdownAction, MarkdownSnapshot, WrapMarker } from '../core/MarkdownEditorTypes';
import { MarkdownFormatter } from '../core/MarkdownFormatter';

/**
 * Configuration options for toolbar behavior.
 */
export type UseMarkdownEditorToolbarOptions = {
    /** Reactive markdown value source (v-model backing state). */
    value: Ref<string>;
    /** Accessor for active textarea DOM element. */
    getTextarea: () => HTMLTextAreaElement | null;
    /** Optional callback fired after value updates. */
    onValueChanged?: () => void;
    /** Optional debug hook for structured log output. */
    debug?: (message: string, payload?: unknown) => void;
    /** Max undo history size before oldest snapshots are dropped. */
    maxHistorySnapshots?: number;
    /** Enable or disable editor keyboard shortcuts. */
    enableHotkeys?: boolean | (() => boolean);
};

/**
 * Public API returned by the toolbar composable.
 */
export type UseMarkdownEditorToolbarResult = {
    /** Current merge-tag dropdown selection value. */
    mergeTagSelection: Ref<string>;
    /** Prime undo history with initial editor state. */
    initializeHistory: () => void;
    /** Execute a toolbar command. */
    applyToolbarAction: (action: MarkdownAction) => void;
    /** Input handler for snapshot tracking and value sync hooks. */
    onTextareaInput: () => void;
    /** Keydown handler (undo/redo + formatting shortcuts). */
    onTextareaKeydown: (event: KeyboardEvent) => void;
    /** Selection synchronization handler. */
    onTextareaSelectionChange: () => void;
    /** Merge-tag dropdown change handler. */
    onMergeTagChange: (tag: string) => void;
    /** Whether a toolbar action is currently unavailable. */
    isActionDisabled: (action: MarkdownAction) => boolean;
};

/**
 * Orchestrate markdown toolbar commands with selection + undo state.
 *
 * Responsibilities:
 * - keep selection indices synchronized
 * - dispatch commands to `MarkdownFormatter`
 * - apply result back to model/textarea
 * - maintain bounded undo history
 */
export function useMarkdownEditorToolbar(options: UseMarkdownEditorToolbarOptions): UseMarkdownEditorToolbarResult {
    const history = ref<MarkdownSnapshot[]>([]);
    const historyIndex = ref<number>(-1);
    const suppressHistory = ref<boolean>(false);
    const mergeTagSelection = ref<string>('');
    const lastSelectionStart = ref<number>(0);
    const lastSelectionEnd = ref<number>(0);
    const maxSnapshots = options.maxHistorySnapshots ?? 200;

    /**
     * Resolve current hotkey-enabled state.
     */
    function hotkeysEnabled(): boolean {
        if (typeof options.enableHotkeys === 'function') {
            return options.enableHotkeys();
        }

        return options.enableHotkeys ?? true;
    }

    /**
     * Optional debug proxy.
     */
    function debug(message: string, payload?: unknown): void {
        if (!options.debug) {
            return;
        }

        options.debug(message, payload);
    }

    /**
     * Read current markdown value.
     *
     * Prefers textarea value to avoid stale model timing edge cases.
     */
    function getValue(): string {
        const textarea = options.getTextarea();
        if (textarea) {
            return normalizeLineEndings(textarea.value ?? '');
        }

        return normalizeLineEndings(options.value.value ?? '');
    }

    /**
     * Write markdown value to model and textarea (when available).
     */
    function setValue(value: string): void {
        const normalized = normalizeLineEndings(value);
        options.value.value = normalized;

        const textarea = options.getTextarea();
        if (textarea && textarea.value !== normalized) {
            textarea.value = normalized;
        }
    }

    /**
     * Normalize line endings to `\n` for stable index math.
     */
    function normalizeLineEndings(value: string): string {
        return value.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    }

    /**
     * Capture current selection from textarea into cached refs.
     */
    function syncSelectionFromTextarea(): void {
        const textarea = options.getTextarea();
        if (!textarea) {
            return;
        }

        lastSelectionStart.value = textarea.selectionStart ?? 0;
        lastSelectionEnd.value = textarea.selectionEnd ?? 0;
    }

    /**
     * Retrieve normalized selection range.
     *
     * Falls back to cached values if textarea reference is unavailable.
     */
    function getSelection(): { start: number; end: number } | null {
        const textarea = options.getTextarea();
        if (textarea) {
            const start = textarea.selectionStart ?? lastSelectionStart.value;
            const end = textarea.selectionEnd ?? lastSelectionEnd.value;
            const normalizedStart = Math.min(start, end);
            const normalizedEnd = Math.max(start, end);
            lastSelectionStart.value = normalizedStart;
            lastSelectionEnd.value = normalizedEnd;

            return {
                start: normalizedStart,
                end: normalizedEnd,
            };
        }

        return {
            start: lastSelectionStart.value,
            end: lastSelectionEnd.value,
        };
    }

    /**
     * Append current state to undo history when changed.
     */
    function recordSnapshot(): void {
        const textarea = options.getTextarea();
        if (!textarea) {
            return;
        }

        const snapshot: MarkdownSnapshot = {
            value: getValue(),
            selectionStart: lastSelectionStart.value,
            selectionEnd: lastSelectionEnd.value,
        };

        const current = history.value[historyIndex.value];
        if (
            current &&
            current.value === snapshot.value &&
            current.selectionStart === snapshot.selectionStart &&
            current.selectionEnd === snapshot.selectionEnd
        ) {
            return;
        }

        if (historyIndex.value < history.value.length - 1) {
            history.value = history.value.slice(0, historyIndex.value + 1);
        }

        history.value.push(snapshot);

        if (history.value.length > maxSnapshots) {
            const overflow = history.value.length - maxSnapshots;
            history.value.splice(0, overflow);
        }

        historyIndex.value = history.value.length - 1;
    }

    /**
     * Restore snapshot state and selection.
     */
    function applySnapshot(snapshot: MarkdownSnapshot): void {
        const textarea = options.getTextarea();
        if (!textarea) {
            return;
        }

        suppressHistory.value = true;
        setValue(snapshot.value);
        options.onValueChanged?.();

        nextTick(() => {
            const target = options.getTextarea();
            if (!target) {
                suppressHistory.value = false;
                return;
            }

            target.focus();
            target.setSelectionRange(snapshot.selectionStart, snapshot.selectionEnd);
            lastSelectionStart.value = snapshot.selectionStart;
            lastSelectionEnd.value = snapshot.selectionEnd;
            suppressHistory.value = false;
        });
    }

    /**
     * Step backward in undo history.
     */
    function undo(): void {
        if (historyIndex.value <= 0) {
            return;
        }

        historyIndex.value -= 1;
        applySnapshot(history.value[historyIndex.value]);
    }

    /**
     * Step forward in undo history.
     */
    function redo(): void {
        if (historyIndex.value >= history.value.length - 1) {
            return;
        }

        historyIndex.value += 1;
        applySnapshot(history.value[historyIndex.value]);
    }

    /**
     * Whether undo can be applied from current history position.
     */
    function canUndo(): boolean {
        return historyIndex.value > 0;
    }

    /**
     * Whether redo can be applied from current history position.
     */
    function canRedo(): boolean {
        return historyIndex.value >= 0 && historyIndex.value < history.value.length - 1;
    }

    /**
     * Determine whether a toolbar action should be shown as disabled.
     */
    function isActionDisabled(action: MarkdownAction): boolean {
        switch (action) {
            case 'undo':
                return !canUndo();
            case 'redo':
                return !canRedo();
            default:
                return false;
        }
    }

    /**
     * Apply formatter output to model/textarea and record undo snapshot.
     */
    function applyFormatterResult(result: { value: string; selectionStart: number; selectionEnd: number }): void {
        const normalizedResultValue = normalizeLineEndings(result.value);
        setValue(normalizedResultValue);
        options.onValueChanged?.();

        nextTick(() => {
            const textarea = options.getTextarea();
            if (!textarea) {
                return;
            }

            textarea.focus();
            textarea.setSelectionRange(result.selectionStart, result.selectionEnd);
            lastSelectionStart.value = result.selectionStart;
            lastSelectionEnd.value = result.selectionEnd;
            recordSnapshot();
        });
    }

    /**
     * Execute inline wrapper command (bold/italic) against current selection.
     */
    function wrapSelection(prefix: string, suffix: string, placeholder: string, markerVariants?: WrapMarker[]): void {
        const selection = getSelection();
        if (!selection) {
            return;
        }

        debug('wrap_selection_start', {
            selectionStart: selection.start,
            selectionEnd: selection.end,
            selectedLength: getValue().slice(selection.start, selection.end).length,
            selectedPreview: getValue().slice(selection.start, selection.end).slice(0, 120),
            prefix,
            suffix,
        });

        const result = new MarkdownFormatter({
            value: getValue(),
            selectionStart: selection.start,
            selectionEnd: selection.end,
        }).toggleWrap(prefix, suffix, placeholder, markerVariants);

        applyFormatterResult(result);
    }

    /**
     * Insert plain text at current selection.
     */
    function insertText(text: string): void {
        const selection = getSelection();
        if (!selection) {
            return;
        }

        const result = new MarkdownFormatter({
            value: getValue(),
            selectionStart: selection.start,
            selectionEnd: selection.end,
        }).insertText(text);

        applyFormatterResult(result);
    }

    /**
     * Wrap selection as markdown link.
     */
    function insertLink(): void {
        const selection = getSelection();
        if (!selection) {
            return;
        }

        const result = new MarkdownFormatter({
            value: getValue(),
            selectionStart: selection.start,
            selectionEnd: selection.end,
        }).insertLink();

        applyFormatterResult(result);
    }

    /**
     * Insert horizontal rule block.
     */
    function insertHorizontalRule(): void {
        const selection = getSelection();
        if (!selection) {
            return;
        }

        const result = new MarkdownFormatter({
            value: getValue(),
            selectionStart: selection.start,
            selectionEnd: selection.end,
        }).insertHorizontalRule();

        applyFormatterResult(result);
    }

    /**
     * Toggle list/quote style on line range.
     */
    function prefixSelectedLines(prefix: string, numbered = false): void {
        const selection = getSelection();
        if (!selection) {
            return;
        }

        const formatter = new MarkdownFormatter({
            value: getValue(),
            selectionStart: selection.start,
            selectionEnd: selection.end,
        });

        const result = numbered ? formatter.toggleNumberedList() : formatter.toggleLinePrefix(prefix);

        applyFormatterResult(result);
    }

    /**
     * Toggle heading level on line range.
     */
    function applyHeading(level: number): void {
        const selection = getSelection();
        if (!selection) {
            return;
        }

        const result = new MarkdownFormatter({
            value: getValue(),
            selectionStart: selection.start,
            selectionEnd: selection.end,
        }).toggleHeading(level);

        applyFormatterResult(result);
    }

    /**
     * Dispatch toolbar command to concrete formatter action.
     */
    function applyToolbarAction(action: MarkdownAction): void {
        syncSelectionFromTextarea();
        debug('toolbar_action', { action });
        if (isActionDisabled(action)) {
            return;
        }

        switch (action) {
            case 'undo':
                undo();
                return;
            case 'redo':
                redo();
                return;
            case 'h1':
                applyHeading(1);
                return;
            case 'h2':
                applyHeading(2);
                return;
            case 'h3':
                applyHeading(3);
                return;
            case 'bold':
                wrapSelection('**', '**', 'bold text', [
                    { prefix: '**', suffix: '**' },
                    { prefix: '__', suffix: '__' },
                ]);
                return;
            case 'italic':
                wrapSelection('*', '*', 'italic text', [
                    { prefix: '*', suffix: '*' },
                    { prefix: '_', suffix: '_' },
                ]);
                return;
            case 'hr':
                insertHorizontalRule();
                return;
            case 'bullet':
                prefixSelectedLines('- ');
                return;
            case 'number':
                prefixSelectedLines('', true);
                return;
            case 'quote':
                prefixSelectedLines('> ');
                return;
            case 'link':
                insertLink();
                return;
        }
    }

    /**
     * Input event handler.
     *
     * Keeps selection cache synchronized and stores undo snapshots.
     */
    function onTextareaInput(): void {
        syncSelectionFromTextarea();
        options.onValueChanged?.();

        if (!suppressHistory.value) {
            recordSnapshot();
        }
    }

    /**
     * Keydown handler with undo/redo + markdown shortcuts.
     */
    function onTextareaKeydown(event: KeyboardEvent): void {
        syncSelectionFromTextarea();
        if (!hotkeysEnabled()) {
            return;
        }

        if (!event.ctrlKey && !event.metaKey) {
            return;
        }

        const key = event.key.toLowerCase();

        if (!event.altKey && !event.shiftKey && key === 'z') {
            event.preventDefault();
            undo();
            return;
        }

        if (!event.altKey && event.shiftKey && key === 'z') {
            event.preventDefault();
            redo();
            return;
        }

        if (!event.altKey && !event.shiftKey && key === 'y') {
            event.preventDefault();
            redo();
            return;
        }

        if (!event.altKey && !event.shiftKey && key === 'b') {
            event.preventDefault();
            applyToolbarAction('bold');
            return;
        }

        if (!event.altKey && !event.shiftKey && key === 'i') {
            event.preventDefault();
            applyToolbarAction('italic');
            return;
        }

        if (!event.altKey && !event.shiftKey && key === 'k') {
            event.preventDefault();
            applyToolbarAction('link');
            return;
        }

        if (event.altKey && !event.shiftKey) {
            switch (event.code) {
                case 'Digit1':
                    event.preventDefault();
                    applyToolbarAction('h1');
                    return;
                case 'Digit2':
                    event.preventDefault();
                    applyToolbarAction('h2');
                    return;
                case 'Digit3':
                    event.preventDefault();
                    applyToolbarAction('h3');
                    return;
            }
        }
    }

    /**
     * Explicit selection-change handler.
     */
    function onTextareaSelectionChange(): void {
        syncSelectionFromTextarea();
    }

    /**
     * Insert selected merge-tag token into markdown body.
     */
    function onMergeTagChange(tag: string): void {
        if (!tag) {
            return;
        }

        insertText(`{{ ${tag} }}`);
        mergeTagSelection.value = '';
    }

    /**
     * Capture initial state so first undo has a baseline snapshot.
     */
    function initializeHistory(): void {
        setValue(getValue());
        syncSelectionFromTextarea();
        recordSnapshot();
    }

    return {
        mergeTagSelection,
        initializeHistory,
        applyToolbarAction,
        onTextareaInput,
        onTextareaKeydown,
        onTextareaSelectionChange,
        onMergeTagChange,
        isActionDisabled,
    };
}
