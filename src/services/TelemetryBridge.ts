import fetch from 'node-fetch';

export class TelemetryBridge {
    private teacherServiceUrl: string;

    constructor() {
        this.teacherServiceUrl = process.env.TEACHER_SERVICE_URL || 'http://localhost:3007';
    }

    /**
     * Notify the Teacher Assistant service about an event.
     */
    async notifyTeacher(studentDid: string, teacherDid: string, state: any) {
        try {
            const response = await fetch(`${this.teacherServiceUrl}/events/telemetry`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ studentDid, teacherDid, state })
            });

            if (!response.ok) {
                console.warn(`Failed to notify Teacher Service: ${response.statusText}`);
            } else {
                console.log(`Successfully notified Teacher Service of event for ${studentDid}`);
            }
        } catch (error) {
            console.error('Error in TelemetryBridge:', error);
        }
    }
}
