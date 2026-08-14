import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Joins class names, resolving Tailwind conflicts so the last one wins — a caller's
 * `className` must beat a variant's own class, which plain concatenation leaves to
 * CSS source order.
 */
export function cn(...inputs: ClassValue[]): string {
	return twMerge(clsx(inputs));
}
