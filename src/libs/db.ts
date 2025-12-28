import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { appConfig } from '@/libs/appConfig';

const adapter = new PrismaPg({ connectionString: appConfig.DATABASE_URL });

export const db = new PrismaClient({ adapter });
