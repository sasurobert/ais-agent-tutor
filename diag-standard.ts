import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

dotenv.config();

async function main() {
    console.log('Starting standard diagnostic...');
    const prisma = new PrismaClient({
        datasources: {
            db: {
                url: process.env.DATABASE_URL
            }
        }
    });
    console.log('Prisma client initialized');

    try {
        console.log('Attempting simple query...');
        const result = await (prisma as any).studentState.count();
        console.log('Query successful, count:', result);
    } catch (e) {
        console.error('Query failed:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
