import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { HomePage } from '../../../src/lib/components/home/HomePage.tsx';

describe('HomePage', () => {
	it('renders the app name as the page heading', () => {
		render(<HomePage />);

		expect(screen.getByRole('heading', { name: 'house-elf' })).toBeInTheDocument();
	});
});
