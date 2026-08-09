import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { MessageResponse } from '../../../src/lib/components/chat/MessageResponse.tsx';

describe('MessageResponse', () => {
	it('renders markdown with highlighted code fences', async () => {
		render(<MessageResponse>{'```ts\nconst answer = 42;\n```'}</MessageResponse>);

		expect(await screen.findByText('const answer = 42;')).toBeInTheDocument();
		expect(document.querySelector('pre code')).not.toBeNull();
	});

	it('renders https images from model output', () => {
		render(<MessageResponse>{'![cat](https://example.com/cat.png)'}</MessageResponse>);

		expect(screen.getByRole('img', { name: 'cat' })).toBeInTheDocument();
	});
});
