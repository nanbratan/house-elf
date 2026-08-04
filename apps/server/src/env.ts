/**
 * Environment access for the server.
 *
 * Read once, at startup, and fail loudly rather than letting an undefined
 * connection string surface as a confusing error deep inside Mastra.
 */

function required(name: string): string {
	const value = process.env[name];
	if (value === undefined || value.trim() === '') {
		throw new Error(
			`Missing required environment variable ${name}. ` +
				`Copy .env.example to .env at the repo root and fill it in.`
		);
	}
	return value;
}

export const env = {
	databaseUrl: required('DATABASE_URL'),
	// Read by the catalog fetch, which is account-scoped. Mastra's model router
	// picks OPENROUTER_API_KEY up from process.env itself; requiring it here is
	// what turns a missing key into a startup failure naming the variable,
	// instead of a raw provider 401 on the first message someone sends.
	openrouterApiKey: required('OPENROUTER_API_KEY')
} as const;
