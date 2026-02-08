import dotenv from 'dotenv';
import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

dotenv.config();

async function main() {
    console.log('Starting diagnostic...');
    const dbUrl = "postgresql://admin:admin@localhost:5432/aischoolos?schema=tutor&connection_limit=5";
    console.log('Using hardcoded URL:', dbUrl);
    const pool = new pg.Pool({ connectionString: dbUrl });
    console.log('Pool created');
    const adapter = new PrismaPg(pool);
    console.log('Adapter created');
    const prisma = new PrismaClient({ adapter });
    console.log('Prisma client initialized');

    try {
        console.log('Attempting simple query...');
        const result = await (prisma as any).studentState.count();
        console.log('Query successful, count:', result);
    } catch (e) {
        console.error('Query failed:', e);
    } finally {
        await pool.end();
    }
}

main();
