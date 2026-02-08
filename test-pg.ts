import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config();

async function main() {
    console.log('Testing direct PG connection...');
    const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

    try {
        const client = await pool.connect();
        console.log('Connected successfully!');
        const res = await client.query('SELECT NOW()');
        console.log('Query result:', res.rows[0]);
        client.release();
    } catch (e) {
        console.error('Connection failed:', e);
    } finally {
        await pool.end();
    }
}

main();
