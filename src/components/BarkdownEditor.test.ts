import { defineComponent, nextTick, ref } from 'vue';
import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import BarkdownEditor from './BarkdownEditor.vue';

vi.mock('lucide', () => ({
    Bold: {},
    Heading1: {},
    Heading2: {},
    Heading3: {},
    Info: {},
    Italic: {},
    Link: {},
    List: {},
    ListOrdered: {},
    Quote: {},
    Redo2: {},
    SeparatorHorizontal: {},
    Undo2: {},
    createIcons: vi.fn(),
}));

function flushPromises(): Promise<void> {
    return Promise.resolve().then(() => Promise.resolve());
}

function deferred<T>() {
    let resolve!: (value: T) => void;
    let reject!: (error?: unknown) => void;

    const promise = new Promise<T>((res, rej) => {
        resolve = res;
        reject = rej;
    });

    return { promise, resolve, reject };
}

describe('BarkdownEditor', () => {
    it('updates v-model from textarea input', async () => {
        const Host = defineComponent({
            components: { BarkdownEditor },
            setup() {
                const markdown = ref('Hello');
                return { markdown };
            },
            template: '<BarkdownEditor v-model="markdown" name="body" label="Body" />',
        });

        const wrapper = mount(Host);

        await wrapper.find('textarea').setValue('Updated value');

        expect((wrapper.vm as { markdown: string }).markdown).toBe('Updated value');
    });

    it('applies toolbar formatting actions', async () => {
        const Host = defineComponent({
            components: { BarkdownEditor },
            setup() {
                const markdown = ref('Hello');
                return { markdown };
            },
            template: '<BarkdownEditor v-model="markdown" name="body" label="Body" />',
        });

        const wrapper = mount(Host);
        const textarea = wrapper.find('textarea').element as HTMLTextAreaElement;

        textarea.setSelectionRange(0, 5);

        await wrapper.find('button[aria-label="Bold"]').trigger('mousedown', { button: 0 });
        await nextTick();

        expect((wrapper.vm as { markdown: string }).markdown).toBe('**Hello**');
    });

    it('reflects undo/redo disabled states', async () => {
        const Host = defineComponent({
            components: { BarkdownEditor },
            setup() {
                const markdown = ref('## Hello');
                return { markdown };
            },
            template: '<BarkdownEditor v-model="markdown" name="body" label="Body" />',
        });

        const wrapper = mount(Host);
        const textarea = wrapper.find('textarea').element as HTMLTextAreaElement;
        const undoButton = wrapper.find('button[aria-label^="Undo"]');
        const redoButton = wrapper.find('button[aria-label^="Redo"]');
        const boldButton = wrapper.find('button[aria-label="Bold"]');

        expect(undoButton.attributes('disabled')).toBeDefined();
        expect(redoButton.attributes('disabled')).toBeDefined();
        expect(boldButton.attributes('aria-pressed')).toBeUndefined();

        textarea.setSelectionRange(3, 8);
        await boldButton.trigger('mousedown', { button: 0 });
        await nextTick();

        expect((wrapper.vm as { markdown: string }).markdown).toBe('## **Hello**');
        expect(undoButton.attributes('disabled')).toBeUndefined();
        expect(redoButton.attributes('disabled')).toBeDefined();

        await undoButton.trigger('mousedown', { button: 0 });
        await nextTick();

        expect((wrapper.vm as { markdown: string }).markdown).toBe('## Hello');
        expect(undoButton.attributes('disabled')).toBeDefined();
        expect(redoButton.attributes('disabled')).toBeUndefined();

        await redoButton.trigger('mousedown', { button: 0 });
        await nextTick();

        expect((wrapper.vm as { markdown: string }).markdown).toBe('## **Hello**');
        expect(undoButton.attributes('disabled')).toBeUndefined();
        expect(redoButton.attributes('disabled')).toBeDefined();
    });

    it('applies keyboard shortcuts by default', async () => {
        const Host = defineComponent({
            components: { BarkdownEditor },
            setup() {
                const markdown = ref('Hello');
                return { markdown };
            },
            template: '<BarkdownEditor v-model="markdown" name="body" label="Body" />',
        });

        const wrapper = mount(Host);
        const textarea = wrapper.find('textarea').element as HTMLTextAreaElement;

        textarea.setSelectionRange(0, 5);

        await wrapper.find('textarea').trigger('keydown', { key: 'b', ctrlKey: true });
        await nextTick();

        expect((wrapper.vm as { markdown: string }).markdown).toBe('**Hello**');
    });

    it('does not apply keyboard shortcuts when enableHotkeys is false', async () => {
        const Host = defineComponent({
            components: { BarkdownEditor },
            setup() {
                const markdown = ref('Hello');
                return { markdown };
            },
            template: '<BarkdownEditor v-model="markdown" name="body" label="Body" :enable-hotkeys="false" />',
        });

        const wrapper = mount(Host);
        const textarea = wrapper.find('textarea').element as HTMLTextAreaElement;

        textarea.setSelectionRange(0, 5);

        await wrapper.find('textarea').trigger('keydown', { key: 'b', ctrlKey: true });
        await nextTick();

        expect((wrapper.vm as { markdown: string }).markdown).toBe('Hello');

        await wrapper.find('button[aria-label="Bold"]').trigger('mousedown', { button: 0 });
        await nextTick();
        expect((wrapper.vm as { markdown: string }).markdown).toBe('**Hello**');

        await wrapper.find('textarea').trigger('keydown', { key: 'z', ctrlKey: true });
        await nextTick();
        expect((wrapper.vm as { markdown: string }).markdown).toBe('**Hello**');
    });

    it('reacts to enableHotkeys prop changes at runtime', async () => {
        const Host = defineComponent({
            components: { BarkdownEditor },
            setup() {
                const markdown = ref('Hello');
                const enableHotkeys = ref(true);
                return { markdown, enableHotkeys };
            },
            template: '<BarkdownEditor v-model="markdown" name="body" label="Body" :enable-hotkeys="enableHotkeys" />',
        });

        const wrapper = mount(Host);
        const textarea = wrapper.find('textarea').element as HTMLTextAreaElement;

        textarea.setSelectionRange(0, 5);
        await wrapper.find('textarea').trigger('keydown', { key: 'b', ctrlKey: true });
        await nextTick();
        expect((wrapper.vm as { markdown: string }).markdown).toBe('**Hello**');

        (wrapper.vm as { enableHotkeys: boolean }).enableHotkeys = false;
        await nextTick();

        textarea.setSelectionRange(2, 7);
        await wrapper.find('textarea').trigger('keydown', { key: 'i', ctrlKey: true });
        await nextTick();
        expect((wrapper.vm as { markdown: string }).markdown).toBe('**Hello**');
    });

    it('inserts merge tags when select is used', async () => {
        const Host = defineComponent({
            components: { BarkdownEditor },
            setup() {
                const markdown = ref('Hi ');
                const mergeTags = ['customer.first_name'];
                return { markdown, mergeTags };
            },
            template: '<BarkdownEditor v-model="markdown" name="body" :merge-tags="mergeTags" />',
        });

        const wrapper = mount(Host);
        const textarea = wrapper.find('textarea').element as HTMLTextAreaElement;
        textarea.setSelectionRange(3, 3);

        const select = wrapper.find('select');
        await select.setValue('customer.first_name');
        await nextTick();

        expect((wrapper.vm as { markdown: string }).markdown).toContain('{{ customer.first_name }}');
    });

    it('shows preview loading, then html + unknown tags', async () => {
        const pending = deferred<{ html: string; unknownTags?: string[] }>();

        const Host = defineComponent({
            components: { BarkdownEditor },
            setup() {
                const markdown = ref('Hello');
                const previewRenderer = () => pending.promise;
                return { markdown, previewRenderer };
            },
            template:
                '<BarkdownEditor v-model="markdown" name="body" :preview-renderer="previewRenderer" preview-loading-text="Loading now..." />',
        });

        const wrapper = mount(Host);
        await nextTick();

        expect(wrapper.text()).toContain('Loading now...');

        pending.resolve({ html: '<p>Rendered</p>', unknownTags: ['missing.value'] });
        await flushPromises();

        expect(wrapper.find('.bw-markdown').exists()).toBe(true);
        expect(wrapper.find('.bw-markdown').html()).toContain('Rendered');
        expect(wrapper.text()).toContain('missing.value');
    });

    it('shows preview error state when renderer fails', async () => {
        const Host = defineComponent({
            components: { BarkdownEditor },
            setup() {
                const markdown = ref('Hello');
                const previewRenderer = async () => {
                    throw new Error('renderer failed');
                };

                return { markdown, previewRenderer };
            },
            template: '<BarkdownEditor v-model="markdown" name="body" :preview-renderer="previewRenderer" />',
        });

        const wrapper = mount(Host);
        await flushPromises();

        expect(wrapper.text()).toContain('Preview could not be refreshed right now');
    });

    it('hides preview panel when showPreview is false', () => {
        const wrapper = mount(BarkdownEditor, {
            props: {
                modelValue: 'Hello',
                name: 'body',
                showPreview: false,
                'onUpdate:modelValue': () => undefined,
            },
        });

        expect(wrapper.text()).not.toContain('Preview');
    });
});
