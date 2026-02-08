import { PrismaClient } from '@prisma/client';

export class ReportingService {
    private prisma: PrismaClient;

    constructor(prisma: PrismaClient) {
        this.prisma = prisma;
    }

    /**
     * Generate a student progress report.
     */
    async generateStudentReport(studentDid: string) {
        const state = await (this.prisma as any).studentState.findUnique({
            where: { studentDid }
        });

        const traits = await (this.prisma as any).trait.findMany({
            where: { studentDid }
        });

        const report = `
# Student Progress Report: ${studentDid}
**Mode**: ${state?.mode || 'ASSISTANT'}

## Traits & Growth
${traits.map((t: any) => `- **${t.name}**: ${t.value.toFixed(2)} (${t.evidence || 'No evidence yet'})`).join('\n')}

## Recent Activity
- **Current Quest**: ${state?.currentQuest || 'None'}
- **Help Requests**: ${state?.helpClickCount || 0}
        `;

        return report.trim();
    }
}
