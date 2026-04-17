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

function createKeydownEvent(init: KeyboardEventInit): KeyboardEvent {
    return new KeyboardEvent('keydown', {
        cancelable: true,
        ...init,
    });
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

    it('supports undo + redo via keyboard shortcuts', async () => {
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

        toolbar.onTextareaKeydown(createKeydownEvent({ key: 'z', ctrlKey: true }));
        await nextTick();

        expect(value.value).toBe('Hello');

        toolbar.onTextareaKeydown(createKeydownEvent({ key: 'z', ctrlKey: true, shiftKey: true }));
        await nextTick();

        expect(value.value).toBe('**Hello**');

        toolbar.onTextareaKeydown(createKeydownEvent({ key: 'z', ctrlKey: true }));
        await nextTick();

        expect(value.value).toBe('Hello');

        toolbar.onTextareaKeydown(createKeydownEvent({ key: 'y', ctrlKey: true }));
        await nextTick();

        expect(value.value).toBe('**Hello**');
    });

    it('applies bold, italic, and link keyboard shortcuts', async () => {
        const boldValue = ref('hello');
        const boldTextarea = createTextarea(boldValue.value);
        boldTextarea.selectionStart = 0;
        boldTextarea.selectionEnd = 5;

        const boldToolbar = useMarkdownEditorToolbar({
            value: boldValue,
            getTextarea: () => boldTextarea,
        });

        boldToolbar.initializeHistory();
        boldToolbar.onTextareaKeydown(createKeydownEvent({ key: 'b', ctrlKey: true }));
        await nextTick();
        expect(boldValue.value).toBe('**hello**');

        const italicValue = ref('hello');
        const italicTextarea = createTextarea(italicValue.value);
        italicTextarea.selectionStart = 0;
        italicTextarea.selectionEnd = 5;

        const italicToolbar = useMarkdownEditorToolbar({
            value: italicValue,
            getTextarea: () => italicTextarea,
        });

        italicToolbar.initializeHistory();
        italicToolbar.onTextareaKeydown(createKeydownEvent({ key: 'i', ctrlKey: true }));
        await nextTick();
        expect(italicValue.value).toBe('*hello*');

        const linkValue = ref('hello');
        const linkTextarea = createTextarea(linkValue.value);
        linkTextarea.selectionStart = 0;
        linkTextarea.selectionEnd = 5;

        const linkToolbar = useMarkdownEditorToolbar({
            value: linkValue,
            getTextarea: () => linkTextarea,
        });

        linkToolbar.initializeHistory();
        linkToolbar.onTextareaKeydown(createKeydownEvent({ key: 'k', ctrlKey: true }));
        await nextTick();
        expect(linkValue.value).toBe('[hello](https://barkway.app)');
    });

    it('applies heading shortcuts with Ctrl/Cmd+Alt+1/2/3', async () => {
        const value = ref('Title');
        const textarea = createTextarea(value.value);
        textarea.selectionStart = 0;
        textarea.selectionEnd = value.value.length;

        const toolbar = useMarkdownEditorToolbar({
            value,
            getTextarea: () => textarea,
        });

        toolbar.initializeHistory();

        toolbar.onTextareaKeydown(createKeydownEvent({ key: '1', code: 'Digit1', ctrlKey: true, altKey: true }));
        await nextTick();
        expect(value.value).toBe('# Title');

        textarea.selectionStart = 0;
        textarea.selectionEnd = value.value.length;
        toolbar.onTextareaKeydown(createKeydownEvent({ key: '2', code: 'Digit2', ctrlKey: true, altKey: true }));
        await nextTick();
        expect(value.value).toBe('## Title');

        textarea.selectionStart = 0;
        textarea.selectionEnd = value.value.length;
        toolbar.onTextareaKeydown(createKeydownEvent({ key: '3', code: 'Digit3', ctrlKey: true, altKey: true }));
        await nextTick();
        expect(value.value).toBe('### Title');
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

        toolbar.onTextareaKeydown(createKeydownEvent({ key: 'z', ctrlKey: true }));
        await nextTick();
        const afterUndo1 = value.value;

        toolbar.onTextareaKeydown(createKeydownEvent({ key: 'z', ctrlKey: true }));
        await nextTick();
        const afterUndo2 = value.value;

        toolbar.onTextareaKeydown(createKeydownEvent({ key: 'z', ctrlKey: true }));
        await nextTick();

        expect(currentValue).not.toBe(afterUndo1);
        expect(afterUndo1).not.toBe(afterUndo2);
        expect(value.value).toBe(afterUndo2);
    });

    it('disables all keyboard shortcuts when enableHotkeys is false', async () => {
        const value = ref('hello');
        const textarea = createTextarea(value.value);
        textarea.selectionStart = 0;
        textarea.selectionEnd = 5;

        const toolbar = useMarkdownEditorToolbar({
            value,
            getTextarea: () => textarea,
            enableHotkeys: false,
        });

        toolbar.initializeHistory();

        const boldEvent = createKeydownEvent({ key: 'b', ctrlKey: true });
        toolbar.onTextareaKeydown(boldEvent);
        await nextTick();
        expect(value.value).toBe('hello');
        expect(boldEvent.defaultPrevented).toBe(false);

        toolbar.applyToolbarAction('bold');
        await nextTick();
        expect(value.value).toBe('**hello**');

        toolbar.onTextareaKeydown(createKeydownEvent({ key: 'z', ctrlKey: true }));
        await nextTick();
        expect(value.value).toBe('**hello**');

        toolbar.onTextareaKeydown(createKeydownEvent({ key: 'z', ctrlKey: true, shiftKey: true }));
        await nextTick();
        expect(value.value).toBe('**hello**');

        toolbar.onTextareaKeydown(createKeydownEvent({ key: 'y', ctrlKey: true }));
        await nextTick();
        expect(value.value).toBe('**hello**');

        toolbar.onTextareaKeydown(createKeydownEvent({ key: '1', code: 'Digit1', ctrlKey: true, altKey: true }));
        await nextTick();
        expect(value.value).toBe('**hello**');
    });

    it('ignores non-matching shortcuts and does not prevent default', () => {
        const value = ref('hello');
        const textarea = createTextarea(value.value);
        const toolbar = useMarkdownEditorToolbar({
            value,
            getTextarea: () => textarea,
        });

        toolbar.initializeHistory();

        const event = createKeydownEvent({ key: 'x', ctrlKey: true });
        toolbar.onTextareaKeydown(event);

        expect(value.value).toBe('hello');
        expect(event.defaultPrevented).toBe(false);
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
