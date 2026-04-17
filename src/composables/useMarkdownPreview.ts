import { onUnmounted, ref, toValue, watch, type MaybeRefOrGetter, type Ref } from 'vue';
import type { MarkdownPreviewRenderResult, MarkdownPreviewRenderer } from '../core/MarkdownEditorTypes';
import { debounce } from '../utils/debounce';

type UseMarkdownPreviewOptions = {
    markdownBody: MaybeRefOrGetter<string>;
    enabled: MaybeRefOrGetter<boolean>;
    previewRenderer?: MaybeRefOrGetter<MarkdownPreviewRenderer | undefined>;
    initialPreviewHtml?: string;
    initialUnknownTags?: string[];
    debounceMs?: number;
};

type UseMarkdownPreviewResult = {
    previewHtml: Ref<string>;
    previewUnknownTags: Ref<string[]>;
    previewFailed: Ref<boolean>;
    previewLoading: Ref<boolean>;
    refreshPreview: (force?: boolean) => Promise<void>;
};

/**
 * Handles debounced preview updates using a host-provided async renderer.
 */
export function useMarkdownPreview(options: UseMarkdownPreviewOptions): UseMarkdownPreviewResult {
    const previewHtml = ref<string>(options.initialPreviewHtml ?? '');
    const previewUnknownTags = ref<string[]>([...(options.initialUnknownTags ?? [])]);
    const previewFailed = ref<boolean>(false);
    const previewLoading = ref<boolean>(false);

    const shouldForceInitialRender = ref<boolean>((options.initialPreviewHtml ?? '').trim() === '');
    const lastPreviewMarkdown = ref<string>('');
    const requestSeq = ref<number>(0);

    const debounceMs = options.debounceMs ?? 350;

    async function refreshPreview(force = false): Promise<void> {
        const enabled = !!toValue(options.enabled);
        const markdown = toValue(options.markdownBody) ?? '';
        const renderer = toValue(options.previewRenderer);

        if (!enabled || !renderer) {
            return;
        }

        if (!force && markdown === lastPreviewMarkdown.value) {
            return;
        }

        const currentRequestId = requestSeq.value + 1;
        requestSeq.value = currentRequestId;

        previewLoading.value = true;
        previewFailed.value = false;

        try {
            const result = (await renderer(markdown)) as MarkdownPreviewRenderResult;
            if (currentRequestId !== requestSeq.value) {
                return;
            }

            previewHtml.value = typeof result.html === 'string' ? result.html : '';
            previewUnknownTags.value = Array.isArray(result.unknownTags) ? result.unknownTags : [];
            lastPreviewMarkdown.value = markdown;
        } catch {
            if (currentRequestId !== requestSeq.value) {
                return;
            }

            previewFailed.value = true;
        } finally {
            if (currentRequestId === requestSeq.value) {
                previewLoading.value = false;
            }
        }
    }

    const schedulePreview = debounce((force: boolean) => {
        void refreshPreview(force);
    }, debounceMs);

    watch(
        () => toValue(options.markdownBody),
        () => {
            if (!toValue(options.enabled) || !toValue(options.previewRenderer)) {
                return;
            }

            schedulePreview(false);
        },
    );

    watch(
        () => [toValue(options.enabled), toValue(options.previewRenderer)] as const,
        ([enabled, renderer]) => {
            if (!enabled || !renderer) {
                return;
            }

            schedulePreview.cancel();
            void refreshPreview(shouldForceInitialRender.value);
            shouldForceInitialRender.value = false;
        },
        { immediate: true },
    );

    onUnmounted(() => {
        schedulePreview.cancel();
    });

    return {
        previewHtml,
        previewUnknownTags,
        previewFailed,
        previewLoading,
        refreshPreview,
    };
}

export type { UseMarkdownPreviewOptions, UseMarkdownPreviewResult };
