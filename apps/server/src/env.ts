/**
 * Environment access for the server.
 *
 * Read once, at startup, and fail loudly rather than letting an undefined
 * connection string or model ID surface as a confusing error deep inside Mastra.
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
	/** Model router ID, "provider/model" — see .env.example. */
	generalAgentModel: required('AGENT_GENERAL_MODEL')
} as const;
