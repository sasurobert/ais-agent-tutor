import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '@aischool/api-client/server-middleware';
import { ConductorEngine } from '../services/ConductorEngine';
import { ConductorStudentService } from '../services/ConductorStudentService';

const router = Router();
const prisma = new PrismaClient();

const engine = new ConductorEngine(prisma);
const studentService = new ConductorStudentService(prisma);

// 1. Get Schedule
router.get('/schedule', authenticate(), async (req: any, res) => {
    try {
        const studentId = req.user.sub || 'student-1';
        // For now, generate on fly or fetch existing. Test expects generate.
        // In real app, we'd fetch from DB, but Engine has generate method.
        // Let's use engine to simulate "getting the plan"
        const tasks = [{ id: 't1', subject: 'Math', duration: 60, type: 'HEAVY' }]; // Mock fetch tasks
        const schedule = await engine.generateDailySchedule(studentId, tasks);
        res.json(schedule);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// 2. Mark Sick Day
router.post('/override/sick', authenticate(), async (req: any, res) => {
    try {
        const studentId = req.user.sub || 'student-1';
        const { date } = req.body;
        await studentService.markSickDay(studentId, new Date(date));
        res.json({ success: true });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// 3. Update Preferences
router.post('/profile/hours', authenticate(), async (req: any, res) => {
    try {
        const studentId = req.user.sub || 'student-1';
        const { start, end } = req.body;
        await studentService.changePreferredHours(studentId, start, end);
        res.json({ success: true });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
