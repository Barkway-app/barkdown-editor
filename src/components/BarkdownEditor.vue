<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import {
    Bold,
    createIcons,
    Heading1,
    Heading2,
    Heading3,
    Info,
    Italic,
    Link,
    List,
    ListOrdered,
    Quote,
    SeparatorHorizontal,
    Undo2,
} from 'lucide';
import { DEFAULT_MARKDOWN_TOOLBAR_ACTIONS } from '../core/MarkdownToolbarActions';
import type { MarkdownAction, MarkdownPreviewRenderer, MarkdownToolbarAction } from '../core/MarkdownEditorTypes';
import { useMarkdownEditorToolbar } from '../composables/useMarkdownEditorToolbar';
import { useMarkdownPreview } from '../composables/useMarkdownPreview';

const model = defineModel<string>({ default: '' });
defineOptions({ name: 'BarkdownEditor' });

const props = withDefaults(
    defineProps<{
        id?: string;
        name?: string;
        label?: string;
        rows?: number;
        enableHotkeys?: boolean;
        toolbarActions?: MarkdownToolbarAction[];
        mergeTags?: string[];
        mergeTagPlaceholder?: string;
        showMergeTagSelect?: boolean;
        showPreview?: boolean;
        previewLabel?: string;
        previewRenderer?: MarkdownPreviewRenderer;
        previewDebounceMs?: number;
        initialPreviewHtml?: string;
        initialUnknownTags?: string[];
        previewBannerText?: string;
        showPreviewBanner?: boolean;
        previewEmptyText?: string;
        previewLoadingText?: string;
        previewErrorText?: string;
        unknownTagsLabel?: string;
    }>(),
    {
        id: 'barkdown-editor',
        name: 'markdown',
        label: 'Markdown',
        rows: 18,
        enableHotkeys: true,
        toolbarActions: () => DEFAULT_MARKDOWN_TOOLBAR_ACTIONS,
        mergeTags: () => [],
        mergeTagPlaceholder: 'Insert merge tag...',
        showMergeTagSelect: true,
        showPreview: true,
        previewLabel: 'Preview',
        previewDebounceMs: 350,
        initialPreviewHtml: '',
        initialUnknownTags: () => [],
        previewBannerText: 'Sample merge-tag values shown while drafting.',
        showPreviewBanner: true,
        previewEmptyText: 'Preview appears here after rendering.',
        previewLoadingText: 'Rendering preview...',
        previewErrorText: 'Preview could not be refreshed right now. Keep editing and try again.',
        unknownTagsLabel: 'Unknown merge tags',
    },
);

type MergeTagOption = { value: string; label: string };

const textareaRef = ref<HTMLTextAreaElement | null>(null);
const rootElement = ref<HTMLElement | null>(null);
const iconsInitialized = ref<boolean>(false);
const LUCIDE_NAME_ATTR = 'data-markdown-lucide';
const availableIcons: Record<string, unknown> = {
    Bold,
    Heading1,
    Heading2,
    Heading3,
    Info,
    Italic,
    Link,
    List,
    ListOrdered,
    Quote,
    SeparatorHorizontal,
    Undo2,
};

function toPascalCaseIconName(name: string): string {
    return name
        .split(/[-_\s]+/g)
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join('');
}

function getTextarea(): HTMLTextAreaElement | null {
    return textareaRef.value;
}

const {
    mergeTagSelection,
    initializeHistory,
    applyToolbarAction,
    onTextareaInput,
    onTextareaKeydown,
    onTextareaSelectionChange,
    onMergeTagChange,
} = useMarkdownEditorToolbar({
    value: model,
    getTextarea,
    enableHotkeys: () => props.enableHotkeys,
});

const previewEnabled = computed<boolean>(() => !!props.showPreview);
const livePreviewEnabled = computed<boolean>(() => !!props.showPreview && !!props.previewRenderer);

const { previewHtml, previewUnknownTags, previewFailed, previewLoading } = useMarkdownPreview({
    markdownBody: model,
    enabled: livePreviewEnabled,
    previewRenderer: () => props.previewRenderer,
    initialPreviewHtml: props.initialPreviewHtml,
    initialUnknownTags: props.initialUnknownTags,
    debounceMs: props.previewDebounceMs,
});

const mergeTagOptions = computed<MergeTagOption[]>(() => {
    const tags = [...props.mergeTags].filter((tag) => tag && typeof tag === 'string').sort();
    return [{ value: '', label: props.mergeTagPlaceholder }, ...tags.map((tag) => ({ value: tag, label: `{{ ${tag} }}` }))];
});

async function renderIcons(): Promise<void> {
    if (iconsInitialized.value) {
        return;
    }

    await nextTick();

    const root = rootElement.value;
    if (!root) {
        return;
    }

    const iconElements = Array.from(root.querySelectorAll<HTMLElement>(`[${LUCIDE_NAME_ATTR}]`));
    if (!iconElements.length) {
        iconsInitialized.value = true;
        return;
    }

    const requestedNames = new Set<string>();
    iconElements.forEach((element) => {
        const iconName = element.getAttribute(LUCIDE_NAME_ATTR);
        if (iconName) {
            requestedNames.add(iconName);
        }
    });

    const requestedIcons: Record<string, unknown> = {};

    requestedNames.forEach((iconName) => {
        const key = toPascalCaseIconName(iconName);
        if (availableIcons[key]) {
            requestedIcons[key] = availableIcons[key];
        }
    });

    if (Object.keys(requestedIcons).length) {
        createIcons({
            icons: requestedIcons,
            nameAttr: LUCIDE_NAME_ATTR,
        });
    }

    iconsInitialized.value = true;
}

function requestIconRender(): void {
    void renderIcons();
}

function resetIconRender(): void {
    iconsInitialized.value = false;
    requestIconRender();
}

function onToolbarMouseDown(event: MouseEvent, action: MarkdownAction): void {
    event.preventDefault();
    if (event.button !== 0) {
        return;
    }

    onTextareaSelectionChange();
    applyToolbarAction(action);
}

function onToolbarKeydown(action: MarkdownAction): void {
    applyToolbarAction(action);
}

function onMergeTagSelectChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    onMergeTagChange(target.value);
}

watch(
    () => props.toolbarActions.map((action) => action.icon).join(','),
    resetIconRender,
);

watch(
    () => previewEnabled.value,
    resetIconRender,
);

watch(
    () => props.showPreviewBanner,
    resetIconRender,
);

onMounted(() => {
    initializeHistory();
    requestIconRender();

    window.addEventListener('mouseup', onTextareaSelectionChange);
    window.addEventListener('keyup', onTextareaSelectionChange);
});

onUnmounted(() => {
    window.removeEventListener('mouseup', onTextareaSelectionChange);
    window.removeEventListener('keyup', onTextareaSelectionChange);
});
</script>

<template>
    <div ref="rootElement" class="grid gap-6 lg:grid-cols-2 lg:items-start">
        <div class="flex min-h-0 flex-col gap-2">
            <label :for="props.id" class="text-sm font-semibold text-slate-800">
                {{ props.label }}
            </label>

            <div class="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <div class="border-b border-slate-200 bg-slate-50/80 p-2">
                    <div role="toolbar" aria-label="Markdown formatting actions" class="flex flex-wrap items-center gap-2">
                        <button
                            v-for="action in props.toolbarActions"
                            :key="action.action"
                            type="button"
                            class="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-600 transition hover:border-orange-300 hover:text-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-300"
                            :title="action.title"
                            :aria-label="action.title"
                            @mousedown="onToolbarMouseDown($event, action.action)"
                            @click.prevent
                            @keydown.enter.prevent="onToolbarKeydown(action.action)"
                            @keydown.space.prevent="onToolbarKeydown(action.action)"
                        >
                            <i :data-markdown-lucide="action.icon" class="h-4 w-4" aria-hidden="true" />
                            <span class="sr-only">{{ action.label }}</span>
                        </button>
                    </div>
                </div>

                <div v-if="props.showMergeTagSelect && mergeTagOptions.length > 1" class="border-b border-slate-200 bg-white p-2">
                    <label :for="`${props.id}_merge_tag_select`" class="sr-only">Merge tags</label>
                    <select
                        :id="`${props.id}_merge_tag_select`"
                        v-model="mergeTagSelection"
                        class="h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-300"
                        @change="onMergeTagSelectChange"
                    >
                        <option v-for="option in mergeTagOptions" :key="option.value || 'placeholder'" :value="option.value">
                            {{ option.label }}
                        </option>
                    </select>
                </div>

                <textarea
                    :id="props.id"
                    ref="textareaRef"
                    v-model="model"
                    :name="props.name"
                    :rows="props.rows"
                    class="min-h-[20rem] w-full flex-1 resize-y border-0 bg-white p-3 font-mono text-sm leading-6 text-slate-900 outline-none ring-0 placeholder:text-slate-400 focus:ring-0"
                    @input="onTextareaInput"
                    @keydown="onTextareaKeydown"
                    @select="onTextareaSelectionChange"
                    @keyup="onTextareaSelectionChange"
                    @click="onTextareaSelectionChange"
                    @mouseup="onTextareaSelectionChange"
                />
            </div>
        </div>

        <div v-if="previewEnabled" class="flex min-h-0 flex-col gap-2">
            <div class="text-sm font-semibold text-slate-800">{{ props.previewLabel }}</div>

            <div class="relative overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <div
                    v-if="props.showPreviewBanner"
                    class="pointer-events-none absolute left-4 top-3 z-10 inline-flex max-w-[calc(100%-2rem)] items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-[11px] font-medium leading-4 text-orange-700 shadow-sm"
                >
                    <i data-markdown-lucide="info" class="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    <span>{{ props.previewBannerText }}</span>
                </div>

                <div class="max-h-[32rem] overflow-y-auto p-4" :class="props.showPreviewBanner ? 'pt-11' : ''">
                    <div v-if="previewFailed" class="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                        {{ props.previewErrorText }}
                    </div>

                    <div
                        v-if="previewUnknownTags.length > 0"
                        class="mb-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800"
                    >
                        <div class="font-semibold">{{ props.unknownTagsLabel }}</div>
                        <div class="mt-1">{{ previewUnknownTags.join(', ') }}</div>
                    </div>

                    <div
                        v-if="previewHtml"
                        class="bw-markdown max-w-none text-sm leading-6 text-slate-800 [&_a]:text-orange-700 [&_a]:underline [&_blockquote]:border-l-4 [&_blockquote]:border-orange-200 [&_blockquote]:pl-3 [&_h1]:mt-5 [&_h1]:text-2xl [&_h1]:font-semibold [&_h2]:mt-4 [&_h2]:text-xl [&_h2]:font-semibold [&_h3]:mt-3 [&_h3]:text-lg [&_h3]:font-semibold [&_li]:ml-6 [&_ol>li]:list-decimal [&_p]:my-3 [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:bg-slate-900 [&_pre]:p-3 [&_pre]:text-slate-100 [&_ul>li]:list-disc [&_code]:rounded [&_code]:bg-slate-100 [&_code]:px-1 [&_hr]:my-5 [&_hr]:border-slate-200"
                        v-html="previewHtml"
                    />

                    <div v-else class="text-sm text-slate-500">
                        {{ previewLoading ? props.previewLoadingText : props.previewEmptyText }}
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
