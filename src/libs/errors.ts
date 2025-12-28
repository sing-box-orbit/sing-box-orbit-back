import { GraphQLError } from 'graphql';
import { createChildLogger } from './logger';

const logger = createChildLogger('error');

export type ErrorCode =
	| 'VALIDATION_ERROR'
	| 'NOT_FOUND'
	| 'DUPLICATE'
	| 'UNAUTHORIZED'
	| 'FORBIDDEN'
	| 'CONNECTION_FAILED'
	| 'SYNC_FAILED'
	| 'EXTERNAL_API_ERROR'
	| 'INTERNAL_ERROR';

export class AppError extends Error {
	constructor(
		message: string,
		public readonly code: ErrorCode,
		public readonly details?: Record<string, unknown>,
	) {
		super(message);
		this.name = 'AppError';
	}

	toGraphQLError(): GraphQLError {
		return new GraphQLError(this.message, {
			extensions: { code: this.code, details: this.details },
		});
	}
}

export class NotFoundError extends AppError {
	constructor(resource: string, id?: string) {
		super(id ? `${resource} with id "${id}" not found` : `${resource} not found`, 'NOT_FOUND', { resource, id });
		this.name = 'NotFoundError';
	}
}

export class DuplicateError extends AppError {
	constructor(resource: string, field: string, value: string) {
		super(`${resource} with ${field} "${value}" already exists`, 'DUPLICATE', { resource, field, value });
		this.name = 'DuplicateError';
	}
}

export class ValidationError extends AppError {
	constructor(message: string, details?: Record<string, unknown>) {
		super(message, 'VALIDATION_ERROR', details);
		this.name = 'ValidationError';
	}
}

export class ExternalApiError extends AppError {
	constructor(service: string, operation: string, originalError?: Error) {
		const message = originalError?.message || `${service} ${operation} failed`;
		super(message, 'EXTERNAL_API_ERROR', { service, operation });
		this.name = 'ExternalApiError';
		this.cause = originalError;
	}
}

export class ConnectionError extends AppError {
	constructor(service: string, url?: string) {
		super(`Failed to connect to ${service}`, 'CONNECTION_FAILED', { service, url });
		this.name = 'ConnectionError';
	}
}

export function requireResource<T>(resource: T | null | undefined, resourceName: string, id?: string): T {
	if (resource === null || resource === undefined) {
		throw new NotFoundError(resourceName, id);
	}
	return resource;
}

export async function withRetry<T>(
	fn: () => Promise<T>,
	options: { retries?: number; delay?: number; onRetry?: (attempt: number, error: Error) => void } = {},
): Promise<T> {
	const { retries = 3, delay = 1000, onRetry } = options;
	let lastError: Error | undefined;

	for (let attempt = 1; attempt <= retries; attempt++) {
		try {
			return await fn();
		} catch (error) {
			lastError = error instanceof Error ? error : new Error(String(error));

			if (attempt < retries) {
				onRetry?.(attempt, lastError);
				logger.warn({ attempt, retries, error: lastError.message }, 'Retrying operation');
				await new Promise((resolve) => setTimeout(resolve, delay * attempt));
			}
		}
	}

	throw lastError;
}

export function handleError(error: unknown, context?: Record<string, unknown>): never {
	if (error instanceof AppError) {
		logger.error({ code: error.code, details: error.details, ...context }, error.message);
		throw error.toGraphQLError();
	}

	if (error instanceof GraphQLError) {
		throw error;
	}

	const message = error instanceof Error ? error.message : 'An unexpected error occurred';
	logger.error({ error, ...context }, message);

	throw new GraphQLError(message, {
		extensions: { code: 'INTERNAL_ERROR' },
	});
}
