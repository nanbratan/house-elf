import { createFileRoute } from '@tanstack/react-router';

import { HomePage } from '../lib/components/home/HomePage.tsx';

export const Route = createFileRoute('/')({
	component: HomePage
});
