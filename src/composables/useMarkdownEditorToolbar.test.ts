import { nextTick, ref } from 'vue';
import { describe, expect, it } from 'vitest';
import { useMarkdownEditorToolbar } from './useMarkdownEditorToolbar';

type MockTextarea = {
    value: string;
    selectionStart: number;
    selectionEnd: number;
    focus: () => void;
    setSelectionRange: (start: number, end: number) => void;
};

function createTextarea(initialValue: string): HTMLTextAreaElement {
    const textarea: MockTextarea = {
        value: initialValue,
        selectionStart: 0,
        selectionEnd: 0,
        focus: () => undefined,
        setSelectionRange(start: number, end: number) {
            textarea.selectionStart = start;
            textarea.selectionEnd = end;
        },
    };

    return textarea as unknown as HTMLTextAreaElement;
}

function setCaretToEnd(textarea: HTMLTextAreaElement): void {
    const end = textarea.value.length;
    textarea.selectionStart = end;
    textarea.selectionEnd = end;
}

describe('useMarkdownEditorToolbar', () => {
    it('inserts merge tags and resets selection state', async () => {
        const value = ref('Hello ');
        const textarea = createTextarea(value.value);
        setCaretToEnd(textarea);

        const toolbar = useMarkdownEditorToolbar({
            value,
            getTextarea: () => textarea,
        });

        toolbar.initializeHistory();
        toolbar.mergeTagSelection.value = 'customer.first_name';

        toolbar.onMergeTagChange('customer.first_name');
        await nextTick();

        expect(value.value).toBe('Hello {{ customer.first_name }}');
        expect(toolbar.mergeTagSelection.value).toBe('');
    });

    it('supports undo via Ctrl/Cmd+Z shortcut', async () => {
        const value = ref('Hello');
        const textarea = createTextarea(value.value);
        textarea.selectionStart = 0;
        textarea.selectionEnd = 5;

        const toolbar = useMarkdownEditorToolbar({
            value,
            getTextarea: () => textarea,
        });

        toolbar.initializeHistory();
        toolbar.applyToolbarAction('bold');
        await nextTick();

        expect(value.value).toBe('**Hello**');

        toolbar.onTextareaKeydown(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true }));
        await nextTick();

        expect(value.value).toBe('Hello');
    });

    it('honors maxHistorySnapshots by dropping oldest snapshots', async () => {
        const value = ref('');
        const textarea = createTextarea(value.value);
        const toolbar = useMarkdownEditorToolbar({
            value,
            getTextarea: () => textarea,
            maxHistorySnapshots: 3,
        });

        toolbar.initializeHistory();

        const tags = ['one', 'two', 'three', 'four'];
        for (const tag of tags) {
            setCaretToEnd(textarea);
            toolbar.onMergeTagChange(tag);
            await nextTick();
        }

        const currentValue = value.value;

        toolbar.onTextareaKeydown(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true }));
        await nextTick();
        const afterUndo1 = value.value;

        toolbar.onTextareaKeydown(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true }));
        await nextTick();
        const afterUndo2 = value.value;

        toolbar.onTextareaKeydown(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true }));
        await nextTick();

        expect(currentValue).not.toBe(afterUndo1);
        expect(afterUndo1).not.toBe(afterUndo2);
        expect(value.value).toBe(afterUndo2);
    });

    it('restores caret selection after formatter actions', async () => {
        const value = ref('hello');
        const textarea = createTextarea(value.value);
        textarea.selectionStart = 0;
        textarea.selectionEnd = 5;

        const toolbar = useMarkdownEditorToolbar({
            value,
            getTextarea: () => textarea,
        });

        toolbar.initializeHistory();
        toolbar.applyToolbarAction('bold');
        await nextTick();

        expect(value.value).toBe('**hello**');
        expect(textarea.selectionStart).toBe(2);
        expect(textarea.selectionEnd).toBe(7);
    });
});
