import catppuccinMocha from '@shikijs/themes/catppuccin-mocha';
import bash from '@shikijs/langs/bash';
import css from '@shikijs/langs/css';
import diff from '@shikijs/langs/diff';
import html from '@shikijs/langs/html';
import json from '@shikijs/langs/json';
import markdown from '@shikijs/langs/markdown';
import python from '@shikijs/langs/python';
import sql from '@shikijs/langs/sql';
import svelte from '@shikijs/langs/svelte';
import typescript from '@shikijs/langs/typescript';
import yaml from '@shikijs/langs/yaml';
import { Marked } from 'marked';
import remend from 'remend';
import { createHighlighterCore } from 'shiki/core';
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript';

/**
 * The one place to change how code looks. Swap the import above and this
 * constant follows it.
 */
export const codeTheme = catppuccinMocha;

/**
 * Languages worth the bytes. Anything else falls back to unhighlighted text
 * rather than throwing — see `highlight`.
 *
 * `typescript` covers JavaScript too; `@shikijs/langs` entries carry their own
 * aliases, so ```` ```ts ```` and ```` ```js ```` both resolve.
 */
const languages = [bash, css, diff, html, json, markdown, python, sql, svelte, typescript, yaml];

/**
 * Shiki's highlighter is expensive to build and cheap to reuse, and building it
 * is the *only* asynchronous part of rendering: `codeToHtml` is synchronous once
 * the grammars are loaded.
 *
 * So it is awaited here, at module scope, rather than inside the renderer. That
 * makes `renderMarkdown` synchronous, which in turn lets the component render
 * with a plain `$derived` instead of an effect that assigns to state. The cost
 * is that importing this module waits for the grammars — they are local, and
 * the chat cannot show model output before it has any.
 */
const shiki = await createHighlighterCore({
	themes: [codeTheme],
	langs: languages,
	// The JavaScript engine avoids shipping and instantiating the Oniguruma WASM
	// binary. Slower on huge files, irrelevant on chat-sized snippets.
	engine: createJavaScriptRegexEngine()
});

/** Escapes text so it can never be read as markup. */
function escapeHtml(text: string): string {
	return text
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&#39;');
}

/**
 * Only schemes that cannot execute script. A model can write any URL it likes,
 * including `javascript:` and `data:text/html`, and it is repeating text from
 * sources we do not control.
 */
const safeSchemes = new Set(['http:', 'https:', 'mailto:']);

function safeHref(href: string): string | undefined {
	let url: URL;
	try {
		// A base is needed for relative hrefs; its origin is never used, only the
		// resolved scheme.
		url = new URL(href, 'https://example.invalid');
	} catch {
		return undefined;
	}

	return safeSchemes.has(url.protocol) ? href : undefined;
}

/**
 * Renders one block of code as highlighted HTML. Unknown languages are rendered
 * as plain text: a reply mentioning ```` ```brainfuck ```` should not blank the
 * message.
 *
 * Exported because tool arguments and results are code too, and should not be
 * highlighted by a second, differently-configured copy of Shiki.
 *
 * Safe to inject: Shiki escapes the text it wraps, so the only markup in the
 * result is the markup it generated.
 */
export function highlightCode(code: string, lang: string): string {
	const loaded = shiki.getLoadedLanguages();
	return shiki.codeToHtml(code, {
		lang: loaded.includes(lang) ? lang : 'text',
		theme: codeTheme.name ?? 'catppuccin-mocha'
	});
}

/**
 * The renderer overrides are what make the output safe, so they are supplied as
 * an extension: a `renderer` passed straight to `parse` would *replace* marked's
 * renderer rather than override parts of it.
 */
const parser = new Marked(
	{
		gfm: true,
		// Chat messages use single newlines as line breaks far more often than they
		// mean to continue a paragraph.
		breaks: true,
		async: false
	},
	{
		renderer: {
			code({ text, lang }) {
				return highlightCode(text, lang ?? '');
			},

			// Raw HTML, both block (`<div>`) and inline (`<b>`), becomes text.
			html({ text }) {
				return escapeHtml(text);
			},

			link({ href, title, tokens }) {
				const text = this.parser.parseInline(tokens);
				const safe = safeHref(href);
				if (!safe) return text;

				const titleAttribute = title ? ` title="${escapeHtml(title)}"` : '';
				// Chat links are external by definition; `noreferrer` also covers
				// `noopener` in older browsers.
				return `<a href="${escapeHtml(safe)}"${titleAttribute} target="_blank" rel="noreferrer">${text}</a>`;
			},

			image({ href, title, text }) {
				const safe = safeHref(href);
				if (!safe) return escapeHtml(text);

				const titleAttribute = title ? ` title="${escapeHtml(title)}"` : '';
				return `<img src="${escapeHtml(safe)}" alt="${escapeHtml(text)}"${titleAttribute} loading="lazy" />`;
			}
		}
	}
);

/**
 * Closes markdown constructs that are still being typed.
 *
 * `remend` is the self-healing half of Vercel's `streamdown`, published on its
 * own with no framework attached (Apache-2.0). `htmlTags` is left on for tidy
 * output only — safety comes from the renderer escaping every raw tag, not from
 * this.
 */
function repair(source: string): string {
	return remend(source, {
		// A half-typed link shows its text and nothing else. The default instead
		// invents a `streamdown:incomplete-link` URL, which `safeHref` would refuse
		// anyway — better to say so here than to rely on the sanitiser.
		linkMode: 'text-only',
		// Off by default in remend, and it stays off: a lone `$` is far more likely
		// to be a price than the start of an equation, and nothing renders KaTeX.
		inlineKatex: false
	});
}

/**
 * Turns model output into HTML that is safe to inject with `{@html}`.
 *
 * Everything the model writes is untrusted: it repeats text from tool results,
 * web pages and files. Rather than allowing HTML and filtering the dangerous
 * subset with a denylist, no raw HTML survives at all — `<script>` in a reply
 * renders as the literal characters. That leaves markdown constructs as the
 * only source of markup, and links restricted to schemes that cannot execute.
 *
 * The source is repaired first. Text arrives a token at a time, so the renderer
 * is asked to parse things like `a **bol` — which is valid markdown meaning two
 * literal asterisks, and so renders as `a **bol` until the closing pair lands
 * and the whole phrase snaps into bold. `remend` closes the open constructs so
 * the text is styled as it arrives instead of flickering.
 */
export function renderMarkdown(source: string): string {
	return parser.parse(repair(source), { async: false });
}
