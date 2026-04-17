# @barkway.app/barkdown-editor

Barkdown is a lightweight Vue 3 + TypeScript markdown editor for template-driven apps. It gives you a clean textarea editor, practical toolbar actions, merge tag insertion, and optional async live preview without coupling your app to backend-specific conventions.

## Screenshot

![Barkdown editor demo screenshot](https://raw.githubusercontent.com/Barkway-app/barkdown-editor/main/docs/images/barkdown-editor-demo.png)

## Why Barkdown

- Fast to integrate into existing Vue 3 apps
- Markdown-first editing with familiar toolbar actions
- Built-in merge tag insertion for message/template workflows
- Optional preview via your own async renderer callback
- Polished default UI with portable Tailwind 4 utility classes

## Quick Start

Install:

```bash
npm install @barkway.app/barkdown-editor
```

Import styles once in your app entry:

```ts
import '@barkway.app/barkdown-editor/style.css';
```

Use the editor:

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { BarkdownEditor } from '@barkway.app/barkdown-editor';

const markdown = ref('Hello Barkway');
</script>

<template>
  <BarkdownEditor
    v-model="markdown"
    name="message_body"
    label="Message body"
  />
</template>
```

## Merge Tags Example

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { BarkdownEditor } from '@barkway.app/barkdown-editor';

const markdown = ref('Hi {{ customer.first_name }}');
const mergeTags = ['customer.first_name', 'customer.last_name', 'business.name'];
</script>

<template>
  <BarkdownEditor
    v-model="markdown"
    name="message_template"
    :merge-tags="mergeTags"
    merge-tag-placeholder="Insert tag..."
  />
</template>
```

## Async Preview Renderer Example

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { BarkdownEditor } from '@barkway.app/barkdown-editor';
import type { MarkdownPreviewRenderResult } from '@barkway.app/barkdown-editor';

const markdown = ref('# Hello');

async function previewRenderer(input: string): Promise<MarkdownPreviewRenderResult> {
  const html = input.replace(/^#\s+(.*)$/gm, '<h1>$1</h1>');

  return {
    html,
    unknownTags: [],
  };
}
</script>

<template>
  <BarkdownEditor
    v-model="markdown"
    name="markdown"
    :preview-renderer="previewRenderer"
    preview-label="Live preview"
  />
</template>
```

`previewRenderer` contract:

```ts
(markdown: string) => Promise<{ html: string; unknownTags?: string[] }>
```

Important: `BarkdownEditor` renders preview HTML via `v-html`. Your `previewRenderer` should return sanitized HTML (or HTML from a trusted sanitizer/renderer) before returning `html`.

## API Notes

Primary export:
- `BarkdownEditor`

Common props:
- `v-model`
- `toolbarActions`
- `mergeTags`
- `showMergeTagSelect`
- `showPreview`
- `previewRenderer`
- `previewDebounceMs`
- `initialPreviewHtml`
- `initialUnknownTags`
- `enableHotkeys` (default `true`)
- label/text customization props (`label`, `previewLabel`, `previewEmptyText`, etc.)

## Keyboard Shortcuts

Shortcuts apply while the editor textarea is focused.

Set `:enable-hotkeys="false"` to disable all editor keyboard shortcuts, including undo/redo.

| Action | Windows / Linux | macOS |
| --- | --- | --- |
| Undo | `Ctrl+Z` | `Cmd+Z` |
| Redo | `Ctrl+Shift+Z` or `Ctrl+Y` | `Cmd+Shift+Z` or `Cmd+Y` |
| Bold | `Ctrl+B` | `Cmd+B` |
| Italic | `Ctrl+I` | `Cmd+I` |
| Link | `Ctrl+K` | `Cmd+K` |
| Heading 1 | `Ctrl+Alt+1` | `Cmd+Alt+1` |
| Heading 2 | `Ctrl+Alt+2` | `Cmd+Alt+2` |
| Heading 3 | `Ctrl+Alt+3` | `Cmd+Alt+3` |

Also exported:
- `MarkdownFormatter`
- `DEFAULT_MARKDOWN_TOOLBAR_ACTIONS`
- core TypeScript types
- `useMarkdownEditorToolbar`
- `useMarkdownPreview`

## Built by Barkway

Barkdown is built by the team at Barkway as part of our work on practical tools for modern, template-driven communication workflows.

Learn more about Barkway and the Barkway platform: https://barkway.app

## Development

Run the local demo:

```bash
npm install
npm run dev
```

Notes:
- Demo source: `demo/App.vue`
- Package source: `src/`

## Testing

Run the test suite:

```bash
npm run test
```

Watch mode during development:

```bash
npm run test:watch
```

Generate coverage reports:

```bash
npm run coverage
```

The test suite covers:
- core markdown formatting behavior (`MarkdownFormatter`)
- preview and toolbar composables
- `BarkdownEditor` component contract behavior (v-model, toolbar, merge tags, preview states)
