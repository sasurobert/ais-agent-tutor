import { PrismaClient } from '@prisma/client';

export class ConductorStudentService {
    constructor(private prisma: PrismaClient) { }

    /**
     * Mark a day as sick/unavailable.
     * Logic: Move all tasks from Date X to Date X+1? 
     * Simple Logic: find all tasks on that day, update date to next day.
     * (Real logic would trigger full replan, but for this scope we shift).
     */
    async markSickDay(studentId: string, date: Date): Promise<void> {
        const tasks = await this.prisma.schedule.findMany({
            where: {
                studentId,
                // Simple date match - distinct from time
                startTime: {
                    gte: new Date(date.setHours(0, 0, 0, 0)),
                    lt: new Date(date.setHours(23, 59, 59, 999))
                }
            }
        });

        for (const task of tasks) {
            // Shift by 24h
            const newDate = new Date(task.startTime.getTime() + 86400000);
            await this.prisma.schedule.update({
                where: { id: task.id },
                data: { startTime: newDate }
            });
        }
        // In real app, we'd trigger Engine.distributeLoad() here
    }

    async changePreferredHours(studentId: string, startHour: number, endHour: number): Promise<void> {
        await this.prisma.studentProfile.update({
            where: { id: studentId },
            data: {
                preferredStart: startHour,
                preferredEnd: endHour
            }
        });
    }
}
