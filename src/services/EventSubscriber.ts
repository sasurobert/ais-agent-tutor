import { PrismaClient } from '@prisma/client';
import { TelemetryBridge } from './TelemetryBridge.js';

export class EventSubscriber {
    private prisma: PrismaClient;
    private bridge: TelemetryBridge;

    constructor(prisma: PrismaClient) {
        this.prisma = prisma;
        this.bridge = new TelemetryBridge();
    }

    /**
     * Handle incoming telemetry events.
     */
    async handleEvent(event: any) {
        const { eventType, payload, creatorDid } = event;

        if (eventType === 'HELP_CLICK') {
            await this.trackHelpUsage(creatorDid);
        }

        if (eventType === 'PAGE_VIEW') {
            await this.updateCurrentLocation(creatorDid, payload.path);
        }
    }

    private async trackHelpUsage(studentDid: string) {
        const state = await (this.prisma as any).studentState.upsert({
            where: { studentDid },
            update: {
                helpClickCount: { increment: 1 },
                lastHelpAt: new Date(),
            },
            create: {
                studentDid,
                helpClickCount: 1,
                lastHelpAt: new Date(),
            },
        });

        // Abuse Threshold Check
        if (state.helpClickCount >= 5) {
            await (this.prisma as any).studentState.update({
                where: { studentDid },
                data: { mode: 'TEACHER' },
            });
            console.log(`Student ${studentDid} switched to TEACHER mode due to help abuse.`);

            // Notify Teacher Service (Telemetry Bridge)
            // In a real scenario, we'd look up the teacher for this student
            await this.bridge.notifyTeacher(studentDid, 'teacher-456', state);
        }
    }

    private async updateCurrentLocation(studentDid: string, path: string) {
        await (this.prisma as any).studentState.upsert({
            where: { studentDid },
            update: { currentQuest: path },
            create: {
                studentDid,
                currentQuest: path,
            },
        });
    }
}
