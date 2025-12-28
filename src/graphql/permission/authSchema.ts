import type { AuthSchema } from '@graphql-authz/core';

import { rulesKeys } from './rules';

export const authSchema: AuthSchema = {
	Query: {
		health: { __authz: { rules: [rulesKeys.IsPublic] } },
		servers: { __authz: { rules: [rulesKeys.IsAdmin] } },
		serversConnection: { __authz: { rules: [rulesKeys.IsAdmin] } },
		server: { __authz: { rules: [rulesKeys.IsAdmin] } },
		clients: { __authz: { rules: [rulesKeys.IsAdmin] } },
		clientsConnection: { __authz: { rules: [rulesKeys.IsAdmin] } },
		client: { __authz: { rules: [rulesKeys.IsAdmin] } },
		subscriptionTemplates: { __authz: { rules: [rulesKeys.IsAdmin] } },
		subscriptionTemplatesConnection: { __authz: { rules: [rulesKeys.IsAdmin] } },
		subscriptionTemplate: { __authz: { rules: [rulesKeys.IsAdmin] } },
		'*': { __authz: { rules: [rulesKeys.Reject] } },
	},
	Mutation: {
		createServer: { __authz: { rules: [rulesKeys.IsAdmin] } },
		updateServer: { __authz: { rules: [rulesKeys.IsAdmin] } },
		deleteServer: { __authz: { rules: [rulesKeys.IsAdmin] } },
		syncServer: { __authz: { rules: [rulesKeys.IsAdmin] } },
		createClient: { __authz: { rules: [rulesKeys.IsAdmin] } },
		updateClient: { __authz: { rules: [rulesKeys.IsAdmin] } },
		deleteClient: { __authz: { rules: [rulesKeys.IsAdmin] } },
		addClientToServer: { __authz: { rules: [rulesKeys.IsAdmin] } },
		removeClientFromServer: { __authz: { rules: [rulesKeys.IsAdmin] } },
		regenerateSubscriptionToken: { __authz: { rules: [rulesKeys.IsAdmin] } },
		createSubscriptionTemplate: { __authz: { rules: [rulesKeys.IsAdmin] } },
		updateSubscriptionTemplate: { __authz: { rules: [rulesKeys.IsAdmin] } },
		deleteSubscriptionTemplate: { __authz: { rules: [rulesKeys.IsAdmin] } },
		'*': { __authz: { rules: [rulesKeys.Reject] } },
	},
};
