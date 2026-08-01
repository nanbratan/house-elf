// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { renderMarkdown } from '../../src/lib/utils/markdown';

describe('markdown rendering', () => {
	// Nothing here re-tests marked or Shiki. What is tested is our configuration
	// of them: the renderer overrides, the URL allowlist, the repair pass, and the
	// language set — the parts that break silently and stay broken.
	it('treats a single newline as a line break, as chat authors expect', () => {
		// `breaks: true` is our choice, not marked's default.
		expect(renderMarkdown('first\nsecond')).toContain('<br>');
	});

	describe('code blocks', () => {
		it('highlights a fenced block in a language we loaded', () => {
			const html = renderMarkdown('```ts\nconst x = 1;\n```');

			// Highlighted, not merely wrapped: tokens carry inline colours.
			expect(html).toContain('<pre');
			expect(html).toContain('style="color:');
		});

		it('falls back to plain text for a language it does not know', () => {
			// Shiki throws on an unloaded language, and the languages are ours to
			// register, so an unknown one has to degrade rather than take the reply
			// down with it.
			const html = renderMarkdown('```brainfuck\n+[----->+++<]>+.\n```');

			expect(html).toContain('<pre');
			// Shiki escapes `<` as a numeric entity rather than `&lt;`.
			expect(html).toContain('+[----->+++&#x3C;]>+.');
		});
	});

	describe('half-arrived text', () => {
		// Every reply is rendered repeatedly as it streams, so the renderer is asked
		// to parse prefixes of the final text. Without repair these show their
		// markup as literal characters until the closing marker lands.
		it.each([
			{ construct: 'bold', source: 'a **bol', tag: 'strong' },
			{ construct: 'italic', source: 'a *ital', tag: 'em' },
			{ construct: 'inline code', source: 'run `bun ru', tag: 'code' },
			{ construct: 'strikethrough', source: 'not ~~wron', tag: 'del' }
		])('styles $construct before it is closed', ({ source, tag }) => {
			expect(renderMarkdown(source)).toContain(`<${tag}>`);
		});

		it('shows the text of a link whose URL has not finished arriving', () => {
			const html = renderMarkdown('see [the docs](https://svelte.dev/do');

			expect(html).toContain('the docs');
			// No half-built href, and no `streamdown:` placeholder either.
			expect(html).not.toContain('<a');
			expect(html).not.toContain('streamdown:');
		});

		it('leaves a finished construct alone', () => {
			const html = renderMarkdown('a **bold** word');

			expect(html).toContain('<strong>bold</strong>');
			expect(html).not.toContain('****');
		});

		it('does not mistake a range for strikethrough', () => {
			// `20~25` is a range, not an unclosed `~`.
			expect(renderMarkdown('costs 20~25 euros')).toContain('20~25');
		});
	});

	describe('untrusted model output', () => {
		it('renders a script tag as text rather than markup', () => {
			const html = renderMarkdown('<script>alert(1)</script>');

			expect(html).not.toContain('<script>');
			expect(html).toContain('&lt;script&gt;');
		});

		it('renders inline HTML as text, attributes and all', () => {
			const html = renderMarkdown('Look: <img src=x onerror="alert(1)"> done');

			expect(html).not.toContain('onerror="alert(1)"');
			expect(html).toContain('&lt;img src=x onerror=');
		});

		it.each(['javascript:alert(1)', 'data:text/html;base64,PHNjcmlwdD4='])(
			'refuses to link %s, keeping only its text',
			(href) => {
				const html = renderMarkdown(`[click me](${href})`);

				expect(html).not.toContain('<a');
				expect(html).toContain('click me');
			}
		);

		it('refuses to load an image from an unsafe scheme, keeping its alt text', () => {
			const html = renderMarkdown('![a cat](javascript:alert(1))');

			expect(html).not.toContain('<img');
			expect(html).toContain('a cat');
		});

		it('links ordinary URLs, opening them away from the app', () => {
			const html = renderMarkdown('[docs](https://svelte.dev/docs)');

			expect(html).toContain('href="https://svelte.dev/docs"');
			expect(html).toContain('rel="noreferrer"');
			expect(html).toContain('target="_blank"');
		});

		it('escapes a title rather than letting it close the attribute', () => {
			const html = renderMarkdown('[x](https://example.com "a\\" onmouseover=alert(1)")');

			// The quote inside the title is escaped, so everything after it stays
			// part of the title value instead of becoming a new attribute.
			expect(html).toContain('title="a&quot; onmouseover=alert(1)"');
		});
	});
});
