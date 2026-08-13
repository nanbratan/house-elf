import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { AppSidebar } from '../../../src/lib/components/shell/AppSidebar.tsx';
import { withRouter } from '../../helpers/router.tsx';

function renderSidebar(pathname: string, open = true) {
	return render(withRouter(<AppSidebar open={open} />, pathname));
}

describe('AppSidebar', () => {
	it('links each conversation to its own route', () => {
		renderSidebar('/');

		expect(screen.getByRole('link', { name: 'Placeholder conversation' })).toHaveAttribute(
			'href',
			'/c/1'
		);
		expect(screen.getByRole('link', { name: 'Another placeholder' })).toHaveAttribute(
			'href',
			'/c/2'
		);
	});

	it('offers a link to start a new conversation', () => {
		renderSidebar('/');

		expect(screen.getByRole('link', { name: 'New chat' })).toHaveAttribute('href', '/c/new');
	});

	it('marks only the conversation matching the current path as current', () => {
		renderSidebar('/c/2');

		expect(screen.getByRole('link', { name: 'Another placeholder' })).toHaveAttribute(
			'aria-current',
			'page'
		);
		expect(screen.getByRole('link', { name: 'Placeholder conversation' })).not.toHaveAttribute(
			'aria-current'
		);
	});

	it('marks nothing as current outside a conversation route', () => {
		renderSidebar('/');

		for (const link of screen.getAllByRole('link')) {
			expect(link).not.toHaveAttribute('aria-current');
		}
	});

	it('gives the current conversation the active styling and the others the muted styling', () => {
		renderSidebar('/c/2');

		const active = screen.getByRole('link', { name: 'Another placeholder' });
		const inactive = screen.getByRole('link', { name: 'Placeholder conversation' });

		expect(active).toHaveClass('bg-sidebar-accent', 'text-sidebar-accent-foreground');
		expect(active).not.toHaveClass('text-muted-foreground');

		expect(inactive).toHaveClass('text-muted-foreground');
		expect(inactive).not.toHaveClass('bg-sidebar-accent', 'text-sidebar-accent-foreground');
	});

	describe('when closed', () => {
		// jsdom parses `inert` but implements none of its behaviour, so this asserts
		// only that the attribute is set. That it actually removes the links from the
		// tab order and the accessibility tree needs a real browser (house-elf-shi.15).
		it('is inert, so its links leave the tab order', () => {
			renderSidebar('/', false);

			expect(screen.getByRole('complementary', { hidden: true })).toHaveAttribute('inert');
		});

		it('is not inert while open', () => {
			renderSidebar('/', true);

			expect(screen.getByRole('complementary')).not.toHaveAttribute('inert');
		});
	});
});
