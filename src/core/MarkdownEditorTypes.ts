/**
 * Toolbar command identifiers supported by the markdown editor.
 *
 * Notes:
 * - These values are used by UI buttons and the toolbar command dispatcher.
 * - Keep this list aligned with `DEFAULT_MARKDOWN_TOOLBAR_ACTIONS`.
 */
export type MarkdownAction =
    | 'undo'
    | 'redo'
    | 'h1'
    | 'h2'
    | 'h3'
    | 'bold'
    | 'italic'
    | 'hr'
    | 'bullet'
    | 'number'
    | 'quote'
    | 'link';

/**
 * Metadata required to render a toolbar button.
 */
export type MarkdownToolbarAction = {
    /** Command identifier mapped by the toolbar dispatcher. */
    action: MarkdownAction;
    /** Lucide icon name rendered by `createIcons`. */
    icon: string;
    /** Screen-reader label text. */
    label: string;
    /** Tooltip and `aria-label` text. */
    title: string;
};

/**
 * Snapshot entry used by undo history.
 */
export type MarkdownSnapshot = {
    /** Full markdown content at the snapshot point. */
    value: string;
    /** Selection start index in `value`. */
    selectionStart: number;
    /** Selection end index in `value`. */
    selectionEnd: number;
};

/**
 * Marker pair describing inline wrappers (e.g. `**...**`).
 */
export type WrapMarker = {
    /** Opening marker text. */
    prefix: string;
    /** Closing marker text. */
    suffix: string;
};

/**
 * Internal representation of an enclosing wrapped range in text.
 */
export type WrapRange = {
    /** Full wrapper start index (including prefix). */
    start: number;
    /** Full wrapper end index (including suffix). */
    end: number;
    /** Content start index (after prefix). */
    contentStart: number;
    /** Content end index (before suffix). */
    contentEnd: number;
};

/**
 * Parsed heading metadata for a line.
 */
export type ParsedHeading = {
    /** Heading level (1-6). */
    level: number;
    /** Heading content without marker and trailing hashes. */
    content: string;
};

/**
 * Result contract for async markdown preview rendering.
 */
export type MarkdownPreviewRenderResult = {
    /** Rendered/sanitized HTML output for preview display. */
    html: string;
    /** Optional unknown merge-tag names discovered during rendering. */
    unknownTags?: string[];
};

/**
 * Async preview renderer callback contract used by Barkdown.
 */
export type MarkdownPreviewRenderer = (markdown: string) => Promise<MarkdownPreviewRenderResult>;
