import { Gql } from 'gqtx';
import { db } from '@/libs/db';
import { createSubscriptionTemplateSchema, updateSubscriptionTemplateSchema, validate } from '@/libs/validation';
import '@/graphql/types';
import {
	type CreateSubscriptionTemplateInputType,
	createSubscriptionTemplateInput,
	subscriptionTemplateGqlType,
	type UpdateSubscriptionTemplateInputType,
	updateSubscriptionTemplateInput,
} from './subscriptionTemplateTypes';

export const createSubscriptionTemplateMutation = Gql.Field({
	name: 'createSubscriptionTemplate',
	type: Gql.NonNull(subscriptionTemplateGqlType),
	args: {
		input: Gql.Arg({ type: Gql.NonNullInput(createSubscriptionTemplateInput) }),
	},
	resolve: async (_src, args: { input: CreateSubscriptionTemplateInputType }) => {
		validate(createSubscriptionTemplateSchema, args.input);
		return db.subscriptionTemplate.create({
			data: {
				name: args.input.name,
				profileTitle: args.input.profileTitle ?? undefined,
				updateInterval: args.input.updateInterval ?? undefined,
				updateAlways: args.input.updateAlways ?? undefined,
				announce: args.input.announce ?? undefined,
				announceUrl: args.input.announceUrl ?? undefined,
				routing: args.input.routing ?? undefined,
				trafficTotal: args.input.trafficTotal ? BigInt(args.input.trafficTotal) : undefined,
			},
		});
	},
});

export const updateSubscriptionTemplateMutation = Gql.Field({
	name: 'updateSubscriptionTemplate',
	type: Gql.NonNull(subscriptionTemplateGqlType),
	args: {
		id: Gql.Arg({ type: Gql.NonNullInput(Gql.ID) }),
		input: Gql.Arg({ type: Gql.NonNullInput(updateSubscriptionTemplateInput) }),
	},
	resolve: async (_src, args: { id: string; input: UpdateSubscriptionTemplateInputType }) => {
		validate(updateSubscriptionTemplateSchema, args.input);
		return db.subscriptionTemplate.update({
			where: { id: args.id },
			data: {
				name: args.input.name ?? undefined,
				profileTitle: args.input.profileTitle ?? undefined,
				updateInterval: args.input.updateInterval ?? undefined,
				updateAlways: args.input.updateAlways ?? undefined,
				announce: args.input.announce ?? undefined,
				announceUrl: args.input.announceUrl ?? undefined,
				routing: args.input.routing ?? undefined,
				trafficTotal: args.input.trafficTotal ? BigInt(args.input.trafficTotal) : undefined,
			},
		});
	},
});

export const deleteSubscriptionTemplateMutation = Gql.Field({
	name: 'deleteSubscriptionTemplate',
	type: Gql.NonNull(Gql.Boolean),
	args: {
		id: Gql.Arg({ type: Gql.NonNullInput(Gql.ID) }),
	},
	resolve: async (_src, args: { id: string }) => {
		await db.subscriptionTemplate.delete({
			where: { id: args.id },
		});
		return true;
	},
});
