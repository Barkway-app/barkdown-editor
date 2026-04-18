<script setup lang="ts">
import { Moon, Sun, createIcons } from 'lucide';
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { BarkdownEditor } from '../src';
import type { MarkdownPreviewRenderResult } from '../src';

const markdown = ref(`# Barkdown Demo\n\nHello **Barkway**.\n\nUse merge tags like {{ customer.first_name }}.`);
const demoTheme = ref<'light' | 'dark'>('light');
const isDark = computed<boolean>(() => demoTheme.value === 'dark');
const themeToggleLabel = computed<string>(() => (isDark.value ? 'Switch to light mode' : 'Switch to dark mode'));
const DEMO_LUCIDE_ATTR = 'data-demo-lucide';
const demoIcons: Record<string, unknown> = { Moon, Sun };

const mergeTags = ['customer.first_name', 'customer.last_name', 'business.name', 'appointment.date'];
const demoMergeTagValues: Record<string, string> = {
    'customer.first_name': 'Charlie',
    'customer.last_name': 'Marshall',
    'business.name': 'Barkway',
    'appointment.date': 'Friday, April 17, 2026',
};

function escapeHtml(text: string): string {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function formatInlineMarkdown(text: string): string {
    return text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\*(.*?)\*/g, '<em>$1</em>');
}

function renderInlineMarkdown(text: string): string {
    return formatInlineMarkdown(escapeHtml(text));
}

function renderDemoMarkdownBlock(block: string): string {
    const singleLineBlock = block.indexOf('\n') === -1;
    const headingMatch = singleLineBlock ? block.match(/^(#{1,3})\s+(.+)$/) : null;
    if (headingMatch) {
        const headingLevel = headingMatch[1].length;
        const headingText = renderInlineMarkdown(headingMatch[2]);
        return `<h${headingLevel}>${headingText}</h${headingLevel}>`;
    }

    const lines = block.split('\n');
    const isBlockquote = lines.every((line) => /^\s*>\s?/.test(line));
    if (isBlockquote) {
        const blockquoteHtml = lines.map((line) => renderInlineMarkdown(line.replace(/^\s*>\s?/, ''))).join('<br/>');
        return `<blockquote>${blockquoteHtml}</blockquote>`;
    }

    return `<p>${lines.map((line) => renderInlineMarkdown(line)).join('<br/>')}</p>`;
}

function applyDemoMergeTagValues(input: string): string {
    return input.replace(/{{\s*([^{}\s]+)\s*}}/g, (match, tag: string) => demoMergeTagValues[tag] ?? match);
}

async function previewRenderer(input: string): Promise<MarkdownPreviewRenderResult> {
    const unknownTags = Array.from(input.matchAll(/{{\s*([^{}\s]+)\s*}}/g))
        .map((match) => match[1])
        .filter((tag) => !mergeTags.includes(tag));

    const renderedInput = applyDemoMergeTagValues(input);

    const html = renderedInput
        .split(/\n{2,}/)
        .map((block) => block.trim())
        .filter((block) => block.length > 0)
        .map((block) => renderDemoMarkdownBlock(block))
        .join('');

    await new Promise((resolve) => setTimeout(resolve, 180));

    return {
        html,
        unknownTags,
    };
}

function toggleTheme(): void {
    demoTheme.value = demoTheme.value === 'dark' ? 'light' : 'dark';
}

function renderDemoIcons(): void {
    void nextTick(() => {
        createIcons({
            icons: demoIcons,
            nameAttr: DEMO_LUCIDE_ATTR,
        });
    });
}

watch(() => isDark.value, renderDemoIcons);

onMounted(() => {
    renderDemoIcons();
});
</script>

<template>
    <main :class="['min-h-screen p-6 transition-colors duration-300 lg:p-10', isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-100 text-slate-900']">
        <div class="mx-auto max-w-6xl space-y-4">
            <header class="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h1 class="demo-title text-5xl leading-none md:text-6xl" :class="isDark ? 'text-[#cad2c5]' : 'text-[#2f3e46]'">Barkdown</h1>
                    <p class="demo-tagline text-sm py-4" :class="isDark ? 'text-slate-300' : 'text-slate-600'">
                        Vue 3 component preview with merge tags and async live preview callback.
                    </p>
                </div>

                <button
                    type="button"
                    class="inline-flex h-10 w-10 items-center justify-center rounded-md border transition"
                    :class="
                        isDark
                            ? 'border-slate-600 bg-slate-800 text-slate-100 hover:border-slate-500 hover:bg-slate-700'
                            : 'border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50'
                    "
                    :title="themeToggleLabel"
                    :aria-label="themeToggleLabel"
                    :aria-pressed="isDark ? 'true' : 'false'"
                    @click="toggleTheme"
                >
                    <i :data-demo-lucide="isDark ? 'sun' : 'moon'" class="h-4 w-4" aria-hidden="true" />
                    <span class="sr-only">{{ themeToggleLabel }}</span>
                </button>
            </header>

            <BarkdownEditor
                v-model="markdown"
                name="demo_markdown"
                label="Message template"
                :merge-tags="mergeTags"
                :preview-renderer="previewRenderer"
                preview-label="Live preview"
                :theme="demoTheme"
            />

            <section class="rounded-xl border p-4 shadow-sm transition-colors duration-300" :class="isDark ? 'border-slate-700 bg-slate-900' : 'border-slate-200 bg-white'">
                <h2 class="text-sm font-semibold" :class="isDark ? 'text-[#cad2c5]' : 'text-[#2f3e46]'">Current v-model value</h2>
                <pre class="mt-2 overflow-x-auto rounded-md p-3 text-xs leading-6" :class="isDark ? 'bg-slate-950 text-slate-200' : 'bg-slate-900 text-slate-100'">{{ markdown }}</pre>
            </section>

            <footer class="pt-2 text-center text-xs" :class="isDark ? 'text-slate-400' : 'text-slate-500'">
                Made with <span :class="isDark ? 'text-orange-400' : 'text-orange-500'" aria-hidden="true">&hearts;</span>
                by the team at
                <a
                    class="underline underline-offset-2"
                    :class="
                        isDark
                            ? 'text-slate-300 decoration-slate-600 hover:text-orange-400'
                            : 'text-slate-600 decoration-slate-300 hover:text-orange-600'
                    "
                    href="https://barkway.app"
                >
                    Barkway.app
                </a>
            </footer>
        </div>
    </main>
</template>

<style>
@import url('https://fonts.googleapis.com/css2?family=Pacifico&display=swap');

html,
body,
#app {
    margin: 0;
    min-height: 100%;
}

.demo-title {
    font-family: 'Pacifico', cursive;
    font-weight: 400;
}
</style>
