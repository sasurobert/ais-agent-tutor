import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

async function setup() {
    const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
    try {
        console.log("Setting up tutor schema (SNAKE_CASE fresh start)...");
        await pool.query('CREATE SCHEMA IF NOT EXISTS tutor');

        await pool.query('DROP TABLE IF EXISTS "tutor"."trait"');
        await pool.query('DROP TABLE IF EXISTS "tutor"."student_state"');

        await pool.query(`
            CREATE TABLE "tutor"."student_state" (
                "id" TEXT NOT NULL,
                "student_did" TEXT NOT NULL,
                "current_quest" TEXT,
                "help_click_count" INTEGER NOT NULL DEFAULT 0,
                "last_help_at" TIMESTAMP(3),
                "mode" TEXT NOT NULL DEFAULT 'ASSISTANT',
                "grit_score" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
                "traits" JSONB,
                "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT "student_state_pkey" PRIMARY KEY ("id")
            )
        `);

        await pool.query('CREATE UNIQUE INDEX "student_state_student_did_key" ON "tutor"."student_state"("student_did")');

        await pool.query(`
            CREATE TABLE "tutor"."trait" (
                "id" TEXT NOT NULL,
                "student_did" TEXT NOT NULL,
                "name" TEXT NOT NULL,
                "value" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
                "evidence" TEXT,
                "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT "trait_pkey" PRIMARY KEY ("id")
            )
        `);

        await pool.query('CREATE UNIQUE INDEX "trait_student_did_name_key" ON "tutor"."trait"("student_did", "name")');

        console.log("Tutor schema setup completed successfully.");
    } catch (err) {
        console.error("Setup failed:", err);
    } finally {
        await pool.end();
    }
}
setup();
