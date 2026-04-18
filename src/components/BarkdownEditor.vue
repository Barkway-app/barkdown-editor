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
    Redo2,
    SeparatorHorizontal,
    Undo2,
} from 'lucide';
import { DEFAULT_MARKDOWN_TOOLBAR_ACTIONS } from '../core/MarkdownToolbarActions';
import type { MarkdownAction, MarkdownPreviewRenderer, MarkdownToolbarAction } from '../core/MarkdownEditorTypes';
import { useMarkdownEditorToolbar } from '../composables/useMarkdownEditorToolbar';
import { useMarkdownPreview } from '../composables/useMarkdownPreview';

const model = defineModel<string>({ default: '' });
defineOptions({ name: 'BarkdownEditor' });

type BarkdownThemeOption = 'light' | 'dark' | 'auto';
type BarkdownResolvedTheme = 'light' | 'dark';

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
        showTitles?: boolean;
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
        theme?: BarkdownThemeOption;
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
        showTitles: true,
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
        theme: 'auto',
    },
);

type MergeTagOption = { value: string; label: string };

const textareaRef = ref<HTMLTextAreaElement | null>(null);
const rootElement = ref<HTMLElement | null>(null);
const iconsInitialized = ref<boolean>(false);
const resolvedTheme = ref<BarkdownResolvedTheme>('light');
const prefersDarkScheme = ref<boolean>(false);
const themeMediaQuery = ref<MediaQueryList | null>(null);
const themeMediaQueryBound = ref<boolean>(false);
const LUCIDE_NAME_ATTR = 'data-markdown-lucide';
const DARK_MODE_QUERY = '(prefers-color-scheme: dark)';
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
    Redo2,
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

function getThemeMediaQuery(): MediaQueryList | null {
    if (themeMediaQuery.value) {
        return themeMediaQuery.value;
    }

    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
        return null;
    }

    themeMediaQuery.value = window.matchMedia(DARK_MODE_QUERY);
    return themeMediaQuery.value;
}

function syncResolvedTheme(): void {
    if (props.theme === 'light' || props.theme === 'dark') {
        resolvedTheme.value = props.theme;
        return;
    }

    resolvedTheme.value = prefersDarkScheme.value ? 'dark' : 'light';
}

function onSystemThemeChange(event: MediaQueryListEvent): void {
    prefersDarkScheme.value = event.matches;
    if (props.theme === 'auto') {
        syncResolvedTheme();
    }
}

function bindThemeMediaQuery(): void {
    const query = getThemeMediaQuery();
    if (!query || themeMediaQueryBound.value) {
        return;
    }

    if (typeof query.addEventListener === 'function') {
        query.addEventListener('change', onSystemThemeChange);
    } else {
        query.addListener(onSystemThemeChange);
    }

    themeMediaQueryBound.value = true;
}

function unbindThemeMediaQuery(): void {
    const query = themeMediaQuery.value;
    if (!query || !themeMediaQueryBound.value) {
        return;
    }

    if (typeof query.removeEventListener === 'function') {
        query.removeEventListener('change', onSystemThemeChange);
    } else {
        query.removeListener(onSystemThemeChange);
    }

    themeMediaQueryBound.value = false;
}

function refreshThemeState(): void {
    const query = getThemeMediaQuery();
    prefersDarkScheme.value = query?.matches ?? false;

    if (props.theme === 'auto') {
        bindThemeMediaQuery();
    } else {
        unbindThemeMediaQuery();
    }

    syncResolvedTheme();
}

refreshThemeState();

const {
    mergeTagSelection,
    initializeHistory,
    applyToolbarAction,
    onTextareaInput,
    onTextareaKeydown,
    onTextareaSelectionChange,
    onMergeTagChange,
    isActionDisabled,
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
    if (isActionDisabled(action)) {
        return;
    }

    onTextareaSelectionChange();
    applyToolbarAction(action);
}

function onToolbarKeydown(action: MarkdownAction): void {
    if (isActionDisabled(action)) {
        return;
    }

    applyToolbarAction(action);
}

function isToolbarActionDisabled(action: MarkdownAction): boolean {
    return isActionDisabled(action);
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

watch(
    () => props.theme,
    refreshThemeState,
);

onMounted(() => {
    refreshThemeState();
    initializeHistory();
    requestIconRender();

    window.addEventListener('mouseup', onTextareaSelectionChange);
    window.addEventListener('keyup', onTextareaSelectionChange);
});

onUnmounted(() => {
    unbindThemeMediaQuery();
    window.removeEventListener('mouseup', onTextareaSelectionChange);
    window.removeEventListener('keyup', onTextareaSelectionChange);
});
</script>

<template>
    <div ref="rootElement" class="barkdown barkdown__layout" :data-theme="resolvedTheme">
        <div class="barkdown__column">
            <label v-if="props.showTitles" :for="props.id" class="barkdown__label">
                {{ props.label }}
            </label>

            <div class="barkdown__panel barkdown__editor-panel">
                <div class="barkdown__panel-header">
                    <div role="toolbar" aria-label="Markdown formatting actions" class="barkdown__toolbar">
                        <button
                            v-for="action in props.toolbarActions"
                            :key="action.action"
                            type="button"
                            class="barkdown__toolbar-btn"
                            :class="
                                isToolbarActionDisabled(action.action)
                                    ? 'barkdown__toolbar-btn--disabled'
                                    : 'barkdown__toolbar-btn--enabled'
                            "
                            :title="action.title"
                            :aria-label="action.title"
                            :aria-disabled="isToolbarActionDisabled(action.action) ? 'true' : 'false'"
                            :disabled="isToolbarActionDisabled(action.action)"
                            @mousedown="onToolbarMouseDown($event, action.action)"
                            @click.prevent
                            @keydown.enter.prevent="onToolbarKeydown(action.action)"
                            @keydown.space.prevent="onToolbarKeydown(action.action)"
                        >
                            <i :data-markdown-lucide="action.icon" class="barkdown__toolbar-icon" aria-hidden="true" />
                            <span class="barkdown__sr-only">{{ action.label }}</span>
                        </button>
                    </div>
                </div>

                <div v-if="props.showMergeTagSelect && mergeTagOptions.length > 1" class="barkdown__merge-tag-row">
                    <label :for="`${props.id}_merge_tag_select`" class="barkdown__sr-only">Merge tags</label>
                    <select
                        :id="`${props.id}_merge_tag_select`"
                        v-model="mergeTagSelection"
                        class="barkdown__merge-tag-select"
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
                    :aria-label="props.showTitles ? undefined : props.label"
                    class="barkdown__textarea"
                    @input="onTextareaInput"
                    @keydown="onTextareaKeydown"
                    @select="onTextareaSelectionChange"
                    @keyup="onTextareaSelectionChange"
                    @click="onTextareaSelectionChange"
                    @mouseup="onTextareaSelectionChange"
                />
            </div>
        </div>

        <div v-if="previewEnabled" class="barkdown__column barkdown__preview-column">
            <div v-if="props.showTitles" class="barkdown__label">{{ props.previewLabel }}</div>

            <div class="barkdown__panel barkdown__preview-panel">
                <div
                    v-if="props.showPreviewBanner"
                    class="barkdown__preview-banner"
                >
                    <i data-markdown-lucide="info" class="barkdown__preview-banner-icon" aria-hidden="true" />
                    <span>{{ props.previewBannerText }}</span>
                </div>

                <div
                    class="barkdown__preview-body"
                    :class="props.showPreviewBanner ? 'barkdown__preview-body--with-banner' : ''"
                >
                    <div v-if="previewFailed" class="barkdown__alert barkdown__alert--danger">
                        {{ props.previewErrorText }}
                    </div>

                    <div
                        v-if="previewUnknownTags.length > 0"
                        class="barkdown__alert barkdown__alert--warning"
                    >
                        <div class="barkdown__alert-title">{{ props.unknownTagsLabel }}</div>
                        <div class="barkdown__alert-content">{{ previewUnknownTags.join(', ') }}</div>
                    </div>

                    <div
                        v-if="previewHtml"
                        class="barkdown-preview barkdown__preview-content"
                        v-html="previewHtml"
                    />

                    <div v-else class="barkdown__muted">
                        {{ previewLoading ? props.previewLoadingText : props.previewEmptyText }}
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
