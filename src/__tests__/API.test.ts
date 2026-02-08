import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

vi.mock('pg', () => {
    return {
        default: {
            Pool: class {
                on = vi.fn();
                connect = vi.fn();
            }
        }
    };
});

vi.mock('@prisma/adapter-pg', () => {
    return {
        PrismaPg: class { }
    };
});

import app from '../index.js';
import { TutorAgent } from '../agents/TutorAgent.js';

vi.mock('../agents/TutorAgent.js', () => {
    return {
        TutorAgent: class {
            run = vi.fn().mockResolvedValue({
                messages: [{ content: "Mocked response" }]
            });
        }
    };
});

vi.mock('../services/ReportingService.js', () => {
    return {
        ReportingService: class {
            generateStudentReport = vi.fn().mockResolvedValue({
                studentDid: 's1',
                summary: 'Doing great',
                traits: []
            });
        }
    };
});

vi.mock('@prisma/client', () => {
    const mockPrisma = {
        studentState: {
            findUnique: vi.fn().mockResolvedValue({ mode: 'ASSISTANT' }),
            upsert: vi.fn().mockResolvedValue({ studentDid: 's1', helpClickCount: 1 }),
            update: vi.fn(),
            findMany: vi.fn().mockResolvedValue([])
        },
        trait: {
            findMany: vi.fn().mockResolvedValue([])
        },
        $connect: vi.fn(),
        $disconnect: vi.fn(),
    };
    return {
        PrismaClient: class {
            constructor() {
                return mockPrisma;
            }
        }
    };
});

describe('API Endpoints', () => {
    it('POST /chat should return a tutor response', async () => {
        const res = await request(app)
            .post('/chat')
            .send({ message: 'Hello', studentDid: 's1' });

        expect(res.status).toBe(200);
        expect(res.body.response).toBe('Mocked response');
    });

    it('POST /events should process telemetry', async () => {
        const res = await request(app)
            .post('/events')
            .send({ eventType: 'HELP_CLICK', creatorDid: 's1' });

        if (res.status !== 202) console.log(JSON.stringify(res.body));
        expect(res.status).toBe(202);
        expect(res.body.success).toBe(true);
    });

    it('GET /student/:did/summary should return a report', async () => {
        const res = await request(app).get('/student/s1/summary');
        expect(res.status).toBe(200);
        expect(res.body.report).toBeDefined();
    });
});
