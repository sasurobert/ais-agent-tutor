import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../index';

describe('Health Check', () => {
    it('should return 200 and healthy status', async () => {
        const res = await request(app).get('/health');
        expect(res.status).toBe(200);
        expect(res.body).toEqual({ status: 'healthy', service: 'ais-agent-tutor' });
    });
});
