<script setup lang="ts">
import { ref } from 'vue';
import { BarkdownEditor } from '../src';
import type { MarkdownPreviewRenderResult } from '../src';

const markdown = ref(`# Barkdown Demo\n\nHello **Barkway**.\n\nUse merge tags like {{ customer.first_name }}.`);

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
</script>

<template>
    <main class="min-h-screen bg-slate-100 p-6 lg:p-10">
        <div class="mx-auto max-w-6xl space-y-4">
            <h1 class="demo-title text-5xl leading-none text-slate-900 md:text-6xl">Barkdown</h1>
            <p class="text-sm text-slate-600">Vue 3 component preview with merge tags and async live preview callback.</p>

            <BarkdownEditor
                v-model="markdown"
                name="demo_markdown"
                label="Message template"
                :merge-tags="mergeTags"
                :preview-renderer="previewRenderer"
                preview-label="Live preview"
            />

            <section class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <h2 class="text-sm font-semibold text-slate-900">Current v-model value</h2>
                <pre class="mt-2 overflow-x-auto rounded-md bg-slate-900 p-3 text-xs leading-6 text-slate-100">{{ markdown }}</pre>
            </section>

            <footer class="pt-2 text-center text-xs text-slate-500">
                Made with <span class="text-orange-500" aria-hidden="true">&hearts;</span>
                by the team at
                <a class="text-slate-600 underline decoration-slate-300 underline-offset-2 hover:text-orange-600" href="https://barkway.app">Barkway.app</a>
            </footer>
        </div>
    </main>
</template>

<style>
@import url('https://fonts.googleapis.com/css2?family=Pacifico&display=swap');

.demo-title {
    font-family: 'Pacifico', cursive;
    font-weight: 400;
}
</style>
