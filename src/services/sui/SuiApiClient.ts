import { ConnectionError, ExternalApiError, withRetry } from '@/libs/errors';
import { createChildLogger } from '@/libs/logger';
import type { SuiClientSaveData, SuiLoadData, SuiResponse, SuiStatus } from './types';

const logger = createChildLogger('sui');

export class SuiApiClient {
	private baseUrl: string;
	private token: string;

	constructor(url: string, token: string) {
		this.baseUrl = url.replace(/\/$/, '');
		this.token = token;
	}

	private async request<T>(endpoint: string, options: RequestInit = {}): Promise<SuiResponse<T>> {
		const url = `${this.baseUrl}/apiv2/${endpoint}`;

		try {
			const response = await fetch(url, {
				...options,
				headers: {
					'Content-Type': 'application/json',
					Token: this.token,
					...options.headers,
				},
			});

			if (!response.ok) {
				logger.error({ endpoint, status: response.status }, 'S-UI API request failed');
				throw new ExternalApiError('S-UI', endpoint, new Error(`HTTP ${response.status}: ${response.statusText}`));
			}

			return response.json();
		} catch (error) {
			if (error instanceof ExternalApiError) throw error;
			logger.error({ endpoint, error }, 'S-UI API connection failed');
			throw new ConnectionError('S-UI', this.baseUrl);
		}
	}

	private async requestWithRetry<T>(endpoint: string, options: RequestInit = {}): Promise<SuiResponse<T>> {
		return withRetry(() => this.request<T>(endpoint, options), {
			retries: 3,
			delay: 500,
			onRetry: (attempt, error) => {
				logger.warn({ endpoint, attempt, error: error.message }, 'Retrying S-UI request');
			},
		});
	}

	async getStatus(): Promise<SuiStatus> {
		const response = await this.requestWithRetry<SuiStatus>('status');

		if (!response.success || !response.obj) {
			throw new Error(response.msg || 'Failed to get S-UI status');
		}

		return response.obj;
	}

	async load(): Promise<SuiLoadData> {
		const response = await this.requestWithRetry<SuiLoadData>('load');

		if (!response.success || !response.obj) {
			throw new Error(response.msg || 'Failed to load S-UI data');
		}

		return response.obj;
	}

	async getClients(): Promise<SuiLoadData['clients']> {
		const response = await this.request<SuiLoadData['clients']>('clients');

		if (!response.success) {
			throw new Error(response.msg || 'Failed to get clients');
		}

		return response.obj || [];
	}

	async getInbounds(): Promise<SuiLoadData['inbounds']> {
		const response = await this.request<SuiLoadData['inbounds']>('inbounds');

		if (!response.success) {
			throw new Error(response.msg || 'Failed to get inbounds');
		}

		return response.obj || [];
	}

	private async saveRequest(object: string, action: string, data: unknown): Promise<void> {
		return withRetry(
			async () => {
				const url = `${this.baseUrl}/apiv2/save`;

				const formData = new URLSearchParams();
				formData.append('object', object);
				formData.append('action', action);
				formData.append('data', JSON.stringify(data, null, 2));

				try {
					const response = await fetch(url, {
						method: 'POST',
						headers: {
							'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
							Token: this.token,
						},
						body: formData.toString(),
					});

					if (!response.ok) {
						logger.error({ object, action, status: response.status }, 'S-UI save request failed');
						throw new ExternalApiError('S-UI', `save/${object}/${action}`, new Error(`HTTP ${response.status}`));
					}

					const result: SuiResponse<unknown> = await response.json();

					if (!result.success) {
						logger.error({ object, action, msg: result.msg }, 'S-UI save operation failed');
						throw new ExternalApiError('S-UI', `save/${object}/${action}`, new Error(result.msg || 'Operation failed'));
					}

					logger.debug({ object, action }, 'S-UI save operation completed');
				} catch (error) {
					if (error instanceof ExternalApiError) throw error;
					logger.error({ object, action, error }, 'S-UI save connection failed');
					throw new ConnectionError('S-UI', this.baseUrl);
				}
			},
			{
				retries: 2,
				delay: 500,
				onRetry: (attempt, error) => {
					logger.warn({ object, action, attempt, error: error.message }, 'Retrying S-UI save');
				},
			},
		);
	}

	async createClient(client: SuiClientSaveData): Promise<void> {
		await this.saveRequest('clients', 'new', client);
	}

	async updateClient(client: SuiClientSaveData): Promise<void> {
		await this.saveRequest('clients', 'edit', client);
	}

	async deleteClient(clientId: number): Promise<void> {
		await this.saveRequest('clients', 'del', clientId);
	}

	async restartSingBox(): Promise<void> {
		const response = await this.request<void>('restartSb', {
			method: 'POST',
		});

		if (!response.success) {
			throw new Error(response.msg || 'Failed to restart Sing-Box');
		}
	}

	async testConnection(): Promise<boolean> {
		try {
			await this.getStatus();
			return true;
		} catch {
			return false;
		}
	}
}
