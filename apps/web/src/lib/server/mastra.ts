export function mastraUrl(): string {
	const url = process.env.MASTRA_URL;
	if (!url) {
		throw new Error('MASTRA_URL is not set. See apps/web/.env.example.');
	}
	return url;
}
