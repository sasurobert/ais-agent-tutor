import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TelemetryBridge } from '../services/TelemetryBridge.js';
vi.mock('node-fetch', () => {
    return {
        default: vi.fn()
    };
});
import fetch from 'node-fetch';

describe('TelemetryBridge', () => {
    let bridge: TelemetryBridge;

    beforeEach(() => {
        bridge = new TelemetryBridge();
        vi.clearAllMocks();
    });

    it('should notify the teacher service', async () => {
        (fetch as any).mockResolvedValue({ ok: true });

        await bridge.notifyTeacher('s1', 't1', { helpClickCount: 5 });

        expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/events/telemetry'), expect.objectContaining({
            method: 'POST',
            body: JSON.stringify({ studentDid: 's1', teacherDid: 't1', state: { helpClickCount: 5 } })
        }));
    });
});
