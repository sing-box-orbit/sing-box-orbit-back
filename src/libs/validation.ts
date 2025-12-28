import { type Static, Type } from 'typebox';
import { Value } from 'typebox/value';
import { createGraphQLError } from '@/graphql/utils';

export const createClientSchema = Type.Object({
	username: Type.String({ minLength: 1, maxLength: 64, pattern: '^[a-zA-Z0-9_-]+$' }),
	email: Type.Optional(Type.Union([Type.String({ format: 'email' }), Type.Null()])),
	expiresAt: Type.Optional(Type.Union([Type.String({ format: 'date-time' }), Type.Null()])),
	serverIds: Type.Array(Type.String({ minLength: 1 }), { minItems: 1 }),
	subscriptionTemplateId: Type.Optional(Type.Union([Type.String(), Type.Null()])),
});

export const updateClientSchema = Type.Object({
	username: Type.Optional(
		Type.Union([Type.String({ minLength: 1, maxLength: 64, pattern: '^[a-zA-Z0-9_-]+$' }), Type.Null()]),
	),
	email: Type.Optional(Type.Union([Type.String({ format: 'email' }), Type.Null()])),
	enabled: Type.Optional(Type.Union([Type.Boolean(), Type.Null()])),
	expiresAt: Type.Optional(Type.Union([Type.String({ format: 'date-time' }), Type.Null()])),
	subscriptionTemplateId: Type.Optional(Type.Union([Type.String(), Type.Null()])),
});

export const createServerSchema = Type.Object({
	name: Type.String({ minLength: 1, maxLength: 128 }),
	url: Type.String({ format: 'uri' }),
	apiToken: Type.String({ minLength: 1 }),
	location: Type.Optional(Type.Union([Type.String({ maxLength: 128 }), Type.Null()])),
});

export const updateServerSchema = Type.Object({
	name: Type.Optional(Type.Union([Type.String({ minLength: 1, maxLength: 128 }), Type.Null()])),
	url: Type.Optional(Type.Union([Type.String({ format: 'uri' }), Type.Null()])),
	apiToken: Type.Optional(Type.Union([Type.String({ minLength: 1 }), Type.Null()])),
	location: Type.Optional(Type.Union([Type.String({ maxLength: 128 }), Type.Null()])),
});

export const createSubscriptionTemplateSchema = Type.Object({
	name: Type.String({ minLength: 1, maxLength: 128 }),
	profileTitle: Type.Optional(Type.Union([Type.String({ maxLength: 256 }), Type.Null()])),
	updateInterval: Type.Optional(Type.Union([Type.Integer({ minimum: 0 }), Type.Null()])),
	updateAlways: Type.Optional(Type.Union([Type.Boolean(), Type.Null()])),
	announce: Type.Optional(Type.Union([Type.String({ maxLength: 512 }), Type.Null()])),
	announceUrl: Type.Optional(Type.Union([Type.String({ format: 'uri' }), Type.Null()])),
	routing: Type.Optional(Type.Union([Type.String(), Type.Null()])),
	trafficTotal: Type.Optional(Type.Union([Type.String({ pattern: '^[0-9]+$' }), Type.Null()])),
});

export const updateSubscriptionTemplateSchema = Type.Object({
	name: Type.Optional(Type.Union([Type.String({ minLength: 1, maxLength: 128 }), Type.Null()])),
	profileTitle: Type.Optional(Type.Union([Type.String({ maxLength: 256 }), Type.Null()])),
	updateInterval: Type.Optional(Type.Union([Type.Integer({ minimum: 0 }), Type.Null()])),
	updateAlways: Type.Optional(Type.Union([Type.Boolean(), Type.Null()])),
	announce: Type.Optional(Type.Union([Type.String({ maxLength: 512 }), Type.Null()])),
	announceUrl: Type.Optional(Type.Union([Type.String({ format: 'uri' }), Type.Null()])),
	routing: Type.Optional(Type.Union([Type.String(), Type.Null()])),
	trafficTotal: Type.Optional(Type.Union([Type.String({ pattern: '^[0-9]+$' }), Type.Null()])),
});

export type CreateClientInput = Static<typeof createClientSchema>;
export type UpdateClientInput = Static<typeof updateClientSchema>;
export type CreateServerInput = Static<typeof createServerSchema>;
export type UpdateServerInput = Static<typeof updateServerSchema>;
export type CreateSubscriptionTemplateInput = Static<typeof createSubscriptionTemplateSchema>;
export type UpdateSubscriptionTemplateInput = Static<typeof updateSubscriptionTemplateSchema>;

export function validate<T>(schema: T, data: unknown): void {
	const errors = [...Value.Errors(schema as Parameters<typeof Value.Errors>[0], data)];
	if (errors.length > 0) {
		const messages = errors.map((e) => `${e.instancePath || '/'}: ${e.message}`).join('; ');
		throw createGraphQLError(`Validation failed: ${messages}`, 'VALIDATION_ERROR');
	}
}
