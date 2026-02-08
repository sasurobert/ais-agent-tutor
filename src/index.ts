import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { TutorAgent } from './agents/TutorAgent.js';
import { EventSubscriber } from './services/EventSubscriber.js';
import { ReportingService } from './services/ReportingService.js';
import { HumanMessage } from '@langchain/core/messages';
import morgan from 'morgan';

import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

dotenv.config();

const app = express();
app.use(morgan('dev'));

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
pool.on('connect', (client) => {
    client.query('SET search_path TO tutor');
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const port = process.env.PORT || 3006;

const tutorAgent = new TutorAgent();
const eventSubscriber = new EventSubscriber(prisma);
const reportingService = new ReportingService(prisma);

app.use(helmet());
app.use(cors());
app.use(express.json());

app.get('/health', (req: Request, res: Response) => {
    res.json({ status: 'healthy', service: 'ais-agent-tutor' });
});

/**
 * Handle incoming telemetry events (Webhook/Consumer)
 */
app.post('/events', async (req: Request, res: Response) => {
    try {
        await eventSubscriber.handleEvent(req.body);
        res.status(202).json({ success: true });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * Chat with the Personal AI Tutor
 */
app.post('/chat', async (req: Request, res: Response) => {
    try {
        const { message, studentDid } = req.body;

        // Fetch current student state
        const state = await (prisma as any).studentState.findUnique({
            where: { studentDid }
        });

        const result = await tutorAgent.run(
            studentDid,
            [new HumanMessage(message)],
            state?.mode || 'ASSISTANT'
        );

        const responseContent = result.messages[result.messages.length - 1].content;

        res.json({
            response: typeof responseContent === 'string' ? responseContent : JSON.stringify(responseContent),
            mode: state?.mode || 'ASSISTANT'
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * Get student summary (Memory + Traits + Proactive suggestion)
 */
app.get('/student/:did/summary', async (req: Request, res: Response) => {
    try {
        const report = await reportingService.generateStudentReport(req.params.did);
        res.json({ report });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

if (process.env.NODE_ENV !== 'test') {
    app.listen(port, () => {
        console.log(`PersonalAITutor Service running on port ${port}`);
    });
}

export default app;
