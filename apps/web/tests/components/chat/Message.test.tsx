import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Message } from '../../../src/lib/components/chat/Message.tsx';

describe('Message', () => {
	it('renders as an article carrying the message role for e2e and styling hooks alike', () => {
		render(<Message from="assistant">Hi</Message>);

		const article = screen.getByRole('article');
		expect(article).toHaveAttribute('data-role', 'assistant');
	});

	it('carries the user role the same way', () => {
		render(<Message from="user">Hi</Message>);

		expect(screen.getByRole('article')).toHaveAttribute('data-role', 'user');
	});
});
