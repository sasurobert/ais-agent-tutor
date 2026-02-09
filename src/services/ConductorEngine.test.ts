import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConductorEngine } from './ConductorEngine';
import { PrismaClient } from '@prisma/client';

const prismaMock = {
    schedule: { create: vi.fn() },
    progression: { findMany: vi.fn() },
    globalSettings: { findFirst: vi.fn() }
} as unknown as PrismaClient;

describe('ConductorEngine', () => {
    let engine: ConductorEngine;

    beforeEach(() => {
        vi.clearAllMocks();
        engine = new ConductorEngine(prismaMock);
    });

    describe('calculatePriority', () => {
        it('should rank urgent deadline higher', () => {
            const urgent = { id: 'm1', deadline: new Date(Date.now() + 86400000) }; // 1 day
            const later = { id: 'm2', deadline: new Date(Date.now() + 86400000 * 5) }; // 5 days

            const p1 = engine.calculatePriority(urgent as any);
            const p2 = engine.calculatePriority(later as any);

            expect(p1).toBeGreaterThan(p2);
        });

        it('should boost low mastery subjects', () => {
            const lowMastery = { id: 'm1', subject: 'Math', mastery: 40 };
            const highMastery = { id: 'm2', subject: 'History', mastery: 90 };

            const p1 = engine.calculatePriority(lowMastery as any);
            const p2 = engine.calculatePriority(highMastery as any);

            expect(p1).toBeGreaterThan(p2);
        });
    });

    describe('distributeLoad', () => {
        it('should respect age-based time caps (Student Age 9 = 4 hours max)', async () => {
            const studentProfile = { id: 's1', age: 9 };
            const tasks = Array(10).fill({ id: 'task', duration: 60 }); // 10 hours of work

            const dailySchedule = await engine.distributeLoad(studentProfile as any, tasks);

            const totalDuration = dailySchedule.reduce((sum: number, slot: any) => sum + slot.duration, 0);
            expect(totalDuration).toBeLessThanOrEqual(240); // 4 hours * 60 min
        });

        it('should avoid back-to-back heavy subjects', async () => {
            const tasks = [
                { id: 't1', subject: 'Math', type: 'HEAVY' },
                { id: 't2', subject: 'Science', type: 'HEAVY' },
                { id: 't3', subject: 'Art', type: 'LIGHT' }
            ];

            const schedule = await engine.generateDailySchedule('s1', tasks);

            // simplistic check: if Math and Science are adjacent
            const mathIndex = schedule.findIndex((s: any) => s.subject === 'Math');
            const scienceIndex = schedule.findIndex((s: any) => s.subject === 'Science');

            // If they exist, ensure there's a gap or break
            if (mathIndex !== -1 && scienceIndex !== -1) {
                expect(Math.abs(mathIndex - scienceIndex)).toBeGreaterThan(1);
            }
        });
    });
});
