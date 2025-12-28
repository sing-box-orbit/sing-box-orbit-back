export interface SuiResponse<T = unknown> {
	success: boolean;
	msg?: string;
	obj?: T;
}

export interface SuiStatus {
	running: boolean;
	version: string;
	startTime: number;
}

export interface SuiClient {
	id: number;
	name: string;
	enable: boolean;
	inbounds: number[];
	config: {
		uuid?: string;
		password?: string;
		flow?: string;
	};
	traffic?: {
		total: number;
		up: number;
		down: number;
	};
	expiry?: number;
}

export interface SuiInbound {
	id: number;
	tag: string;
	type: string;
	listen: string;
	listen_port: number;
	tls_id?: number;
	users?: string[];
}

export interface SuiTlsReality {
	enabled: boolean;
	private_key: string;
	short_id: string[];
	handshake?: {
		server: string;
		server_port: number;
	};
}

export interface SuiTlsServer {
	enabled: boolean;
	server_name?: string;
	alpn?: string[];
	reality?: SuiTlsReality;
}

export interface SuiTlsClientReality {
	enabled: boolean;
	public_key: string;
	short_id: string;
}

export interface SuiTlsClient {
	enabled: boolean;
	server_name?: string;
	reality?: SuiTlsClientReality;
}

export interface SuiTls {
	id: number;
	name: string;
	server: SuiTlsServer;
	client?: SuiTlsClient;
}

export interface SuiLoadData {
	inbounds: SuiInbound[];
	outbounds: unknown[];
	endpoints: unknown[];
	clients: SuiClient[];
	tls: SuiTls[];
	config: Record<string, unknown>;
}

export interface SuiClientSaveData {
	id?: number;
	enable: boolean;
	name: string;
	desc?: string;
	group?: string;
	inbounds: number[];
	config: Record<string, unknown>;
	links?: unknown[];
	volume?: number;
	expiry?: number;
	up?: number;
	down?: number;
}
