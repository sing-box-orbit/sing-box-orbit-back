import pino from 'pino';

const isDev = process.env.NODE_ENV !== 'production';

export const logger = pino({
	level: process.env.LOG_LEVEL ?? (isDev ? 'debug' : 'info'),
	transport: isDev
		? {
				target: 'pino-pretty',
				options: {
					colorize: true,
					translateTime: 'yyyy-mm-dd HH:MM:ss',
					ignore: 'pid,hostname,module',
					messageFormat: '{if module}[{module}] {end}{msg}',
				},
			}
		: undefined,
});

export const createChildLogger = (name: string) =>
	logger.child({ module: name.charAt(0).toUpperCase() + name.slice(1) });
