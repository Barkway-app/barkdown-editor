#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const cssPath = resolve(process.cwd(), 'dist/style.css');
const allowedPrefixes = ['barkdown', 'bd-'];

if (!existsSync(cssPath)) {
    console.error(`[check:css-scope] Missing CSS bundle: ${cssPath}`);
    process.exit(1);
}

const css = readFileSync(cssPath, 'utf8');
const selectors = css.match(/[^{}]+\{/g) ?? [];
const offenders = new Set();

for (const selectorWithBrace of selectors) {
    const selectorGroup = selectorWithBrace.slice(0, -1).trim();
    if (!selectorGroup || selectorGroup.startsWith('@')) {
        continue;
    }

    const selectorList = selectorGroup.split(',');
    for (const selector of selectorList) {
        const classMatches = selector.match(/\.(-?[_a-zA-Z]+[_a-zA-Z0-9-]*)/g) ?? [];
        for (const classMatch of classMatches) {
            const className = classMatch.slice(1);
            const isAllowed = allowedPrefixes.some((prefix) => className.startsWith(prefix));
            if (!isAllowed) {
                offenders.add(className);
            }
        }
    }
}

if (offenders.size > 0) {
    const offenderList = [...offenders].sort();
    console.error('[check:css-scope] Found unscoped CSS class selectors in dist/style.css:');
    for (const className of offenderList) {
        console.error(`  - .${className}`);
    }
    process.exit(1);
}

console.log(`[check:css-scope] OK: all class selectors in dist/style.css are Barkdown-scoped (${allowedPrefixes.join(', ')}).`);
