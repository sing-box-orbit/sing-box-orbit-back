import type { Inbound, Server } from '@prisma/client';

export interface ServerConfig {
	server: Server;
	inbounds: Inbound[];
	uuid: string;
}

export interface ProxyEntry {
	name: string;
	type: string;
	server: string;
	port: number;
	uuid: string;
	settings: Record<string, unknown>;
}

const buildProxyName = (server: Server, inbound: Inbound): string => {
	const location = server.location ?? server.name;
	return `${location} - ${inbound.tag}`;
};

const parseSettings = (settings: unknown): Record<string, unknown> => {
	if (!settings || typeof settings !== 'object') return {};
	return settings as Record<string, unknown>;
};

const buildVlessSecurityParams = (settings: Record<string, unknown>, sni: unknown): string => {
	if (settings.reality) {
		const sid = settings.shortId ? `&sid=${settings.shortId}` : '';
		return `security=reality&pbk=${settings.publicKey}${sid}&sni=${sni}`;
	}

	if (settings.tls) {
		return `security=tls&sni=${sni}`;
	}

	return `security=none&sni=${sni}`;
};

export function formatV2ray(configs: ServerConfig[]): string {
	const links: string[] = [];

	for (const config of configs) {
		for (const inbound of config.inbounds) {
			if (!inbound.enabled) continue;

			const settings = parseSettings(inbound.settings);
			const name = encodeURIComponent(buildProxyName(config.server, inbound));
			const host = new URL(config.server.url).hostname;

			switch (inbound.type) {
				case 'VLESS': {
					const flow = settings.flow ? `&flow=${settings.flow}` : '';
					const sni = settings.server_name ?? host;

					const securityParams = buildVlessSecurityParams(settings, sni);

					links.push(`vless://${config.uuid}@${host}:${inbound.port}?type=tcp&${securityParams}${flow}#${name}`);
					break;
				}

				case 'VMESS': {
					const vmessConfig = {
						v: '2',
						ps: buildProxyName(config.server, inbound),
						add: host,
						port: inbound.port,
						id: config.uuid,
						aid: 0,
						net: settings.network ?? 'tcp',
						type: 'none',
						host: settings.host ?? '',
						path: settings.path ?? '',
						tls: settings.tls ? 'tls' : '',
						sni: settings.server_name ?? host,
					};
					links.push(`vmess://${Buffer.from(JSON.stringify(vmessConfig)).toString('base64')}`);
					break;
				}

				case 'TROJAN': {
					const sni = settings.server_name ?? host;
					links.push(`trojan://${config.uuid}@${host}:${inbound.port}?sni=${sni}#${name}`);
					break;
				}

				case 'SHADOWSOCKS': {
					const method = settings.method ?? 'chacha20-ietf-poly1305';
					const password = settings.password ?? config.uuid;
					const userinfo = Buffer.from(`${method}:${password}`).toString('base64');
					links.push(`ss://${userinfo}@${host}:${inbound.port}#${name}`);
					break;
				}

				case 'HYSTERIA2': {
					const sni = settings.server_name ?? host;
					links.push(`hysteria2://${config.uuid}@${host}:${inbound.port}?sni=${sni}#${name}`);
					break;
				}

				default:
					break;
			}
		}
	}

	return Buffer.from(links.join('\n')).toString('base64');
}

export function formatClash(configs: ServerConfig[]): string {
	const proxies: Record<string, unknown>[] = [];
	const proxyNames: string[] = [];

	for (const config of configs) {
		for (const inbound of config.inbounds) {
			if (!inbound.enabled) continue;

			const settings = parseSettings(inbound.settings);
			const name = buildProxyName(config.server, inbound);
			const host = new URL(config.server.url).hostname;

			proxyNames.push(name);

			switch (inbound.type) {
				case 'VLESS': {
					const proxy: Record<string, unknown> = {
						name,
						type: 'vless',
						server: host,
						port: inbound.port,
						uuid: config.uuid,
						network: settings.network ?? 'tcp',
						tls: true,
					};

					if (settings.reality) {
						proxy['reality-opts'] = {
							'public-key': settings.publicKey,
							'short-id': settings.shortId,
						};
					}

					if (settings.flow) {
						proxy.flow = settings.flow;
					}

					proxies.push(proxy);
					break;
				}

				case 'VMESS': {
					proxies.push({
						name,
						type: 'vmess',
						server: host,
						port: inbound.port,
						uuid: config.uuid,
						alterId: 0,
						cipher: 'auto',
						network: settings.network ?? 'tcp',
						tls: !!settings.tls,
					});
					break;
				}

				case 'TROJAN': {
					proxies.push({
						name,
						type: 'trojan',
						server: host,
						port: inbound.port,
						password: config.uuid,
						sni: settings.server_name ?? host,
					});
					break;
				}

				case 'SHADOWSOCKS': {
					proxies.push({
						name,
						type: 'ss',
						server: host,
						port: inbound.port,
						cipher: settings.method ?? 'chacha20-ietf-poly1305',
						password: settings.password ?? config.uuid,
					});
					break;
				}

				case 'HYSTERIA2': {
					proxies.push({
						name,
						type: 'hysteria2',
						server: host,
						port: inbound.port,
						password: config.uuid,
						sni: settings.server_name ?? host,
					});
					break;
				}

				default:
					break;
			}
		}
	}

	let yaml = 'proxies:\n';
	for (const proxy of proxies) {
		yaml += `  - ${JSON.stringify(proxy)}\n`;
	}

	yaml += '\nproxy-groups:\n';
	yaml += `  - name: "Proxy"\n`;
	yaml += `    type: select\n`;
	yaml += `    proxies:\n`;
	for (const name of proxyNames) {
		yaml += `      - "${name}"\n`;
	}

	yaml += `\n  - name: "Auto"\n`;
	yaml += `    type: url-test\n`;
	yaml += `    proxies:\n`;
	for (const name of proxyNames) {
		yaml += `      - "${name}"\n`;
	}
	yaml += `    url: http://www.gstatic.com/generate_204\n`;
	yaml += `    interval: 300\n`;

	return yaml;
}

export function formatSingbox(configs: ServerConfig[]): string {
	const outbounds: Record<string, unknown>[] = [];
	const tags: string[] = [];

	for (const config of configs) {
		for (const inbound of config.inbounds) {
			if (!inbound.enabled) continue;

			const settings = parseSettings(inbound.settings);
			const tag = buildProxyName(config.server, inbound);
			const host = new URL(config.server.url).hostname;

			tags.push(tag);

			switch (inbound.type) {
				case 'VLESS': {
					const outbound: Record<string, unknown> = {
						type: 'vless',
						tag,
						server: host,
						server_port: inbound.port,
						uuid: config.uuid,
					};

					if (settings.flow) {
						outbound.flow = settings.flow;
					}

					const tls: Record<string, unknown> = {
						enabled: true,
						server_name: settings.server_name ?? host,
					};

					if (settings.reality) {
						tls.reality = {
							enabled: true,
							public_key: settings.publicKey,
							short_id: settings.shortId,
						};
					}

					outbound.tls = tls;
					outbounds.push(outbound);
					break;
				}

				case 'VMESS': {
					outbounds.push({
						type: 'vmess',
						tag,
						server: host,
						server_port: inbound.port,
						uuid: config.uuid,
						alter_id: 0,
						security: 'auto',
						tls: settings.tls
							? {
									enabled: true,
									server_name: settings.server_name ?? host,
								}
							: undefined,
					});
					break;
				}

				case 'TROJAN': {
					outbounds.push({
						type: 'trojan',
						tag,
						server: host,
						server_port: inbound.port,
						password: config.uuid,
						tls: {
							enabled: true,
							server_name: settings.server_name ?? host,
						},
					});
					break;
				}

				case 'SHADOWSOCKS': {
					outbounds.push({
						type: 'shadowsocks',
						tag,
						server: host,
						server_port: inbound.port,
						method: settings.method ?? 'chacha20-ietf-poly1305',
						password: settings.password ?? config.uuid,
					});
					break;
				}

				case 'HYSTERIA2': {
					outbounds.push({
						type: 'hysteria2',
						tag,
						server: host,
						server_port: inbound.port,
						password: config.uuid,
						tls: {
							enabled: true,
							server_name: settings.server_name ?? host,
						},
					});
					break;
				}

				default:
					break;
			}
		}
	}

	outbounds.push({
		type: 'selector',
		tag: 'proxy',
		outbounds: tags,
	});

	outbounds.push({
		type: 'urltest',
		tag: 'auto',
		outbounds: tags,
		url: 'http://www.gstatic.com/generate_204',
		interval: '5m',
	});

	return JSON.stringify({ outbounds }, null, 2);
}

export function formatOutline(configs: ServerConfig[]): string {
	const links: string[] = [];

	for (const config of configs) {
		for (const inbound of config.inbounds) {
			if (!inbound.enabled || inbound.type !== 'SHADOWSOCKS') continue;

			const settings = parseSettings(inbound.settings);
			const name = encodeURIComponent(buildProxyName(config.server, inbound));
			const host = new URL(config.server.url).hostname;
			const method = settings.method ?? 'chacha20-ietf-poly1305';
			const password = settings.password ?? config.uuid;
			const userinfo = Buffer.from(`${method}:${password}`).toString('base64');

			links.push(`ss://${userinfo}@${host}:${inbound.port}#${name}`);
		}
	}

	return links.join('\n');
}
