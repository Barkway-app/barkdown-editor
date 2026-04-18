import { describe, expect, it } from 'vitest';
import { MarkdownFormatter } from './MarkdownFormatter';

describe('MarkdownFormatter', () => {
    it('wraps and unwraps bold text (including alternate markers)', () => {
        const wrapped = new MarkdownFormatter({
            value: 'Hello world',
            selectionStart: 0,
            selectionEnd: 5,
        }).toggleWrap('**', '**', 'bold text', [
            { prefix: '**', suffix: '**' },
            { prefix: '__', suffix: '__' },
        ]);

        expect(wrapped.value).toBe('**Hello** world');

        const unwrapped = new MarkdownFormatter({
            value: wrapped.value,
            selectionStart: 0,
            selectionEnd: '**Hello**'.length,
        }).toggleWrap('**', '**', 'bold text', [
            { prefix: '**', suffix: '**' },
            { prefix: '__', suffix: '__' },
        ]);

        expect(unwrapped.value).toBe('Hello world');

        const unwrapAlternate = new MarkdownFormatter({
            value: '__Hello__ world',
            selectionStart: 0,
            selectionEnd: '__Hello__'.length,
        }).toggleWrap('**', '**', 'bold text', [
            { prefix: '**', suffix: '**' },
            { prefix: '__', suffix: '__' },
        ]);

        expect(unwrapAlternate.value).toBe('Hello world');
    });

    it('does not unwrap outer wrapper for partial selection', () => {
        const value = '**Hello world**';
        const result = new MarkdownFormatter({
            value,
            selectionStart: 2,
            selectionEnd: 7,
        }).toggleWrap('**', '**', 'bold text', [{ prefix: '**', suffix: '**' }]);

        expect(result.value).not.toBe('Hello world');
        expect(result.value.startsWith('**')).toBe(true);
        expect(result.value.endsWith('**')).toBe(true);
    });

    it('toggles heading levels (add/remove/switch)', () => {
        const add = new MarkdownFormatter({
            value: 'Booking Agreement',
            selectionStart: 0,
            selectionEnd: 'Booking Agreement'.length,
        }).toggleHeading(2);

        expect(add.value).toBe('## Booking Agreement');

        const removeSameLevel = new MarkdownFormatter({
            value: add.value,
            selectionStart: 0,
            selectionEnd: add.value.length,
        }).toggleHeading(2);

        expect(removeSameLevel.value).toBe('Booking Agreement');

        const switchLevel = new MarkdownFormatter({
            value: '# Booking Agreement',
            selectionStart: 0,
            selectionEnd: '# Booking Agreement'.length,
        }).toggleHeading(3);

        expect(switchLevel.value).toBe('### Booking Agreement');
    });

    it('toggles bullet/number/quote across multiline selections', () => {
        const lines = 'first\nsecond\nthird';

        const bullets = new MarkdownFormatter({
            value: lines,
            selectionStart: 0,
            selectionEnd: lines.length,
        }).toggleLinePrefix('- ');

        expect(bullets.value).toBe('- first\n- second\n- third');

        const quote = new MarkdownFormatter({
            value: lines,
            selectionStart: 0,
            selectionEnd: lines.length,
        }).toggleLinePrefix('> ');

        expect(quote.value).toBe('> first\n> second\n> third');

        const numbered = new MarkdownFormatter({
            value: lines,
            selectionStart: 0,
            selectionEnd: lines.length,
        }).toggleNumberedList();

        expect(numbered.value).toBe('1. first\n2. second\n3. third');

        const unnumbered = new MarkdownFormatter({
            value: numbered.value,
            selectionStart: 0,
            selectionEnd: numbered.value.length,
        }).toggleNumberedList();

        expect(unnumbered.value).toBe(lines);
    });

    it('inserts links with and without selected text', () => {
        const selected = new MarkdownFormatter({
            value: 'Book appointment',
            selectionStart: 5,
            selectionEnd: 'Book appointment'.length,
        }).insertLink();

        expect(selected.value).toBe('Book [appointment](url)');

        const collapsed = new MarkdownFormatter({
            value: 'Book now',
            selectionStart: 8,
            selectionEnd: 8,
        }).insertLink();

        expect(collapsed.value).toBe('Book now[link text](url)');
    });

    it('inserts horizontal rule with newline hygiene', () => {
        const result = new MarkdownFormatter({
            value: 'Line one\nLine two',
            selectionStart: 8,
            selectionEnd: 8,
        }).insertHorizontalRule();

        expect(result.value).toContain('\n\n---\n\n');
    });

    it('normalizes CRLF line endings before transformations', () => {
        const result = new MarkdownFormatter({
            value: 'first\r\nsecond',
            selectionStart: 0,
            selectionEnd: 5,
        }).toggleHeading(1);

        expect(result.value).toBe('# first\nsecond');
    });
});
