import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TelemetryBridge } from '../services/TelemetryBridge';

describe('TelemetryBridge', () => {
    let bridge: TelemetryBridge;

    beforeEach(() => {
        bridge = new TelemetryBridge();
        vi.clearAllMocks();
        vi.stubGlobal('fetch', vi.fn());
    });

    it('should notify the teacher service', async () => {
        vi.mocked(fetch).mockResolvedValue({
            ok: true,
            json: async () => ({})
        } as Response);

        await bridge.notifyTeacher('s1', 't1', { helpClickCount: 5 });

        expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/events/telemetry'), expect.objectContaining({
            method: 'POST',
            body: JSON.stringify({ studentDid: 's1', teacherDid: 't1', state: { helpClickCount: 5 } })
        }));
    });
});
