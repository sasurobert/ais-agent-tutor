import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

async function audit() {
    const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
    try {
        console.log("Auditing tutor.StudentState column names...");
        const res = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_schema = 'tutor' AND table_name = 'StudentState'
        `);
        console.log("Columns found:", JSON.stringify(res.rows, null, 2));
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}
audit();
