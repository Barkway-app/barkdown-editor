import { defineComponent, h, ref, type Ref } from 'vue';
import { mount } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { MarkdownPreviewRenderer } from '../core/MarkdownEditorTypes';
import { useMarkdownPreview, type UseMarkdownPreviewResult } from './useMarkdownPreview';

type HarnessState = {
    markdown: Ref<string>;
    enabled: Ref<boolean>;
    renderer: Ref<MarkdownPreviewRenderer | undefined>;
};

function flushPromises(): Promise<void> {
    return Promise.resolve().then(() => Promise.resolve());
}

function deferred<T>() {
    let resolve!: (value: T) => void;
    let reject!: (reason?: unknown) => void;

    const promise = new Promise<T>((res, rej) => {
        resolve = res;
        reject = rej;
    });

    return { promise, resolve, reject };
}

function mountHarness(
    state: HarnessState,
    options?: {
        debounceMs?: number;
        initialPreviewHtml?: string;
    },
) {
    let api: UseMarkdownPreviewResult | undefined;

    const Harness = defineComponent({
        setup() {
            api = useMarkdownPreview({
                markdownBody: state.markdown,
                enabled: state.enabled,
                previewRenderer: state.renderer,
                debounceMs: options?.debounceMs ?? 25,
                initialPreviewHtml: options?.initialPreviewHtml,
            });

            return () => h('div');
        },
    });

    const wrapper = mount(Harness);

    if (api === undefined) {
        throw new Error('Failed to initialize preview harness');
    }

    return { wrapper, api: api as UseMarkdownPreviewResult };
}

describe('useMarkdownPreview', () => {
    afterEach(() => {
        vi.useRealTimers();
    });

    it('schedules debounced refreshes for markdown changes', async () => {
        vi.useFakeTimers();

        const renderer = vi.fn(async (markdown: string) => ({ html: `<p>${markdown}</p>` }));

        const state: HarnessState = {
            markdown: ref('first'),
            enabled: ref(true),
            renderer: ref(renderer),
        };

        const { wrapper } = mountHarness(state, { debounceMs: 20, initialPreviewHtml: 'seed' });

        renderer.mockClear();

        state.markdown.value = 'second';
        state.markdown.value = 'third';

        await vi.advanceTimersByTimeAsync(19);
        expect(renderer).not.toHaveBeenCalled();

        await vi.advanceTimersByTimeAsync(1);
        await flushPromises();

        expect(renderer).toHaveBeenCalledTimes(1);
        expect(renderer).toHaveBeenLastCalledWith('third');

        wrapper.unmount();
    });

    it('keeps latest async response and ignores stale responses', async () => {
        const oldResponse = deferred<{ html: string }>();
        const newResponse = deferred<{ html: string }>();

        const renderer = vi
            .fn()
            .mockImplementationOnce(() => oldResponse.promise)
            .mockImplementationOnce(() => newResponse.promise);

        const state: HarnessState = {
            markdown: ref('old'),
            enabled: ref(false),
            renderer: ref(renderer),
        };

        const { wrapper, api } = mountHarness(state, { debounceMs: 0, initialPreviewHtml: 'seed' });

        state.enabled.value = true;
        await flushPromises();

        state.markdown.value = 'new';
        void api.refreshPreview(true);
        await flushPromises();

        newResponse.resolve({ html: '<p>new</p>' });
        await flushPromises();

        oldResponse.resolve({ html: '<p>old</p>' });
        await flushPromises();

        expect(api.previewHtml.value).toBe('<p>new</p>');

        wrapper.unmount();
    });

    it('sets previewFailed when renderer throws', async () => {
        const state: HarnessState = {
            markdown: ref('content'),
            enabled: ref(true),
            renderer: ref(async () => {
                throw new Error('fail');
            }),
        };

        const { wrapper, api } = mountHarness(state, { debounceMs: 0, initialPreviewHtml: 'seed' });

        await api.refreshPreview(true);
        await flushPromises();

        expect(api.previewFailed.value).toBe(true);

        wrapper.unmount();
    });

    it('does nothing when disabled or renderer is missing', async () => {
        const renderer = vi.fn(async (markdown: string) => ({ html: markdown }));

        const state: HarnessState = {
            markdown: ref('content'),
            enabled: ref(false),
            renderer: ref(renderer),
        };

        const { wrapper, api } = mountHarness(state, { debounceMs: 0, initialPreviewHtml: 'seed' });

        await api.refreshPreview(true);
        expect(renderer).not.toHaveBeenCalled();

        state.enabled.value = true;
        state.renderer.value = undefined;

        await api.refreshPreview(true);
        expect(renderer).not.toHaveBeenCalled();

        wrapper.unmount();
    });
});
