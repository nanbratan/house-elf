import { readFileSync } from 'node:fs';

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Shimmer } from '../../../src/lib/components/chat/Shimmer.tsx';

describe('Shimmer', () => {
	it('renders its text', () => {
		render(<Shimmer>Waiting for a reply…</Shimmer>);

		expect(screen.getByText('Waiting for a reply…')).toBeInTheDocument();
	});

	it('keeps a reduced-motion fallback that restores a visible colour', () => {
		const css = readFileSync('src/styles/app.css', 'utf8');
		const reducedMotion = css.split('@media (prefers-reduced-motion: reduce)')[1] ?? '';

		// The shimmer works by colour: transparent text over background-clip. Stopping
		// the animation without restoring a colour would leave the text invisible.
		expect(reducedMotion).toContain('.shimmer-text');
		expect(reducedMotion).toContain('color:');
	});
});
