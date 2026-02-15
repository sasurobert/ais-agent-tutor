import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ReportingService } from '../services/ReportingService.js';

const mockPrisma = {
    studentState: {
        findUnique: vi.fn(),
    },
    trait: {
        findMany: vi.fn(),
    },
};

describe('ReportingService', () => {
    let service: ReportingService;

    beforeEach(() => {
        vi.clearAllMocks();
        service = new ReportingService(mockPrisma as any);
    });

    describe('generateStudentReport', () => {
        it('should generate a report with student state and traits', async () => {
            mockPrisma.studentState.findUnique.mockResolvedValue({
                mode: 'EXPLORER',
                currentQuest: 'fractions-101',
                helpClickCount: 3,
            });
            mockPrisma.trait.findMany.mockResolvedValue([
                { name: 'grit', value: 0.85, evidence: 'Completed 5 quests without help' },
                { name: 'curiosity', value: 0.72, evidence: 'Asked 12 follow-up questions' },
            ]);

            const report = await service.generateStudentReport('did:student:001');
            expect(report).toContain('Student Progress Report: did:student:001');
            expect(report).toContain('EXPLORER');
            expect(report).toContain('grit');
            expect(report).toContain('0.85');
            expect(report).toContain('fractions-101');
            expect(report).toContain('3');
        });

        it('should handle missing student state gracefully', async () => {
            mockPrisma.studentState.findUnique.mockResolvedValue(null);
            mockPrisma.trait.findMany.mockResolvedValue([]);

            const report = await service.generateStudentReport('did:student:missing');
            expect(report).toContain('ASSISTANT'); // default mode
            expect(report).toContain('None'); // no current quest
            expect(report).toContain('0'); // no help clicks
        });

        it('should handle traits without evidence', async () => {
            mockPrisma.studentState.findUnique.mockResolvedValue({ mode: 'ASSISTANT' });
            mockPrisma.trait.findMany.mockResolvedValue([
                { name: 'resilience', value: 0.5, evidence: null },
            ]);

            const report = await service.generateStudentReport('did:student:002');
            expect(report).toContain('No evidence yet');
        });

        it('should call Prisma with correct studentDid', async () => {
            mockPrisma.studentState.findUnique.mockResolvedValue(null);
            mockPrisma.trait.findMany.mockResolvedValue([]);

            await service.generateStudentReport('did:student:abc');
            expect(mockPrisma.studentState.findUnique).toHaveBeenCalledWith({
                where: { studentDid: 'did:student:abc' },
            });
            expect(mockPrisma.trait.findMany).toHaveBeenCalledWith({
                where: { studentDid: 'did:student:abc' },
            });
        });

        it('should return trimmed report', async () => {
            mockPrisma.studentState.findUnique.mockResolvedValue({ mode: 'ASSISTANT' });
            mockPrisma.trait.findMany.mockResolvedValue([]);

            const report = await service.generateStudentReport('did:student:trim');
            expect(report).not.toMatch(/^\s+/);
            expect(report).not.toMatch(/\s+$/);
        });
    });
});
