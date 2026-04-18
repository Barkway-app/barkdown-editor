import type { MarkdownToolbarAction } from './MarkdownEditorTypes';

/**
 * Default markdown toolbar layout and button metadata.
 *
 * This list defines both:
 * - visual toolbar ordering
 * - command availability in the default editor instance
 */
export const DEFAULT_MARKDOWN_TOOLBAR_ACTIONS: MarkdownToolbarAction[] = [
    { action: 'undo', icon: 'undo-2', label: 'Undo', title: 'Undo (Ctrl/Cmd+Z)' },
    { action: 'redo', icon: 'redo-2', label: 'Redo', title: 'Redo (Ctrl/Cmd+Shift+Z / Ctrl/Cmd+Y)' },
    { action: 'h1', icon: 'heading-1', label: 'Heading 1', title: 'Heading 1' },
    { action: 'h2', icon: 'heading-2', label: 'Heading 2', title: 'Heading 2' },
    { action: 'h3', icon: 'heading-3', label: 'Heading 3', title: 'Heading 3' },
    { action: 'bold', icon: 'bold', label: 'Bold', title: 'Bold' },
    { action: 'italic', icon: 'italic', label: 'Italic', title: 'Italic' },
    { action: 'hr', icon: 'separator-horizontal', label: 'Horizontal Rule', title: 'Horizontal Rule' },
    { action: 'bullet', icon: 'list', label: 'Bulleted List', title: 'Bulleted List' },
    { action: 'number', icon: 'list-ordered', label: 'Numbered List', title: 'Numbered List' },
    { action: 'quote', icon: 'quote', label: 'Blockquote', title: 'Blockquote' },
    { action: 'link', icon: 'link', label: 'Link', title: 'Link' },
];
