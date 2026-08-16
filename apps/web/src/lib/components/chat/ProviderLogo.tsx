export interface ProviderLogoProps {
	/** The provider slug, tilde already stripped — `providerName()` gives it. */
	provider: string;
}

export function ProviderLogo({ provider }: ProviderLogoProps) {
	return (
		/* Lazy: clearing the picker's search mounts the whole catalog at once, and
		   every row wants a logo the moment it exists. */
		<img
			alt={`${provider} logo`}
			className="size-3 shrink-0 dark:invert"
			height={12}
			width={12}
			loading="lazy"
			decoding="async"
			src={`https://models.dev/logos/${provider}.svg`}
		/>
	);
}
