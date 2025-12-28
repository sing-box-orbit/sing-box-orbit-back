import { preExecRule, type RulesObject } from '@graphql-authz/core';

import type { GraphQLContext } from '@/graphql/types';

const IsAuthenticated = preExecRule()((context: GraphQLContext) => {
	return !!context?.user;
});

const IsAdmin = preExecRule()((context: GraphQLContext) => {
	return context?.user?.role === 'admin';
});

const IsPublic = preExecRule()(() => true);

const Reject = preExecRule()(() => false);

export const authZRules: RulesObject = {
	IsAuthenticated,
	IsAdmin,
	IsPublic,
	Reject,
} as const;

const getKeysByRules = <T extends object>(rules: T) => {
	const keys: { [key: string]: string } = {};

	Object.keys(rules).forEach((rule) => {
		keys[rule] = rule;
	});

	return <{ [P in keyof typeof rules]: P }>keys;
};

export const rulesKeys = getKeysByRules(authZRules);
