import './styles.css';

export { default as BarkdownEditor } from './components/BarkdownEditor.vue';
export { DEFAULT_MARKDOWN_TOOLBAR_ACTIONS } from './core/MarkdownToolbarActions';
export { MarkdownFormatter } from './core/MarkdownFormatter';
export { useMarkdownEditorToolbar } from './composables/useMarkdownEditorToolbar';
export { useMarkdownPreview } from './composables/useMarkdownPreview';

export type {
    MarkdownAction,
    MarkdownPreviewRenderResult,
    MarkdownPreviewRenderer,
    MarkdownSnapshot,
    MarkdownToolbarAction,
    ParsedHeading,
    WrapMarker,
    WrapRange,
} from './core/MarkdownEditorTypes';

export type { UseMarkdownEditorToolbarOptions, UseMarkdownEditorToolbarResult } from './composables/useMarkdownEditorToolbar';
export type { UseMarkdownPreviewOptions, UseMarkdownPreviewResult } from './composables/useMarkdownPreview';
