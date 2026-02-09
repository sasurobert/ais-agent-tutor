import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConductorStudentService } from './ConductorStudentService';
import { PrismaClient } from '@prisma/client';

const prismaMock = {
    schedule: {
        findMany: vi.fn(),
        update: vi.fn()
    },
    studentProfile: {
        update: vi.fn()
    }
} as unknown as PrismaClient;

describe('ConductorStudentService', () => {
    let service: ConductorStudentService;

    beforeEach(() => {
        vi.clearAllMocks();
        service = new ConductorStudentService(prismaMock);
    });

    describe('markSickDay', () => {
        it('should shift today\'s tasks to next available days', async () => {
            // Mock finding tasks for today with Correct property 'startTime'
            (prismaMock.schedule.findMany as any).mockResolvedValue([
                { id: 't1', startTime: new Date('2023-10-10') },
                { id: 't2', startTime: new Date('2023-10-10') }
            ]);

            await service.markSickDay('s1', new Date('2023-10-10'));

            // verify update calls to shift dates
            expect(prismaMock.schedule.update).toHaveBeenCalledTimes(2);
        });
    });

    describe('changePreferredHours', () => {
        it('should update profile hours', async () => {
            await service.changePreferredHours('s1', 16, 18); // 4pm - 6pm

            expect(prismaMock.studentProfile.update).toHaveBeenCalledWith({
                where: { id: 's1' },
                data: {
                    preferredStart: 16,
                    preferredEnd: 18
                }
            });
        });
    });
});
