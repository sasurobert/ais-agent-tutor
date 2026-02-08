import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventSubscriber } from '../services/EventSubscriber.js';

const mockPrisma = {
    studentState: {
        upsert: vi.fn(),
        update: vi.fn(),
    }
};

describe('EventSubscriber', () => {
    let subscriber: EventSubscriber;

    beforeEach(() => {
        subscriber = new EventSubscriber(mockPrisma as any);
        vi.clearAllMocks();
    });

    it('should track help usage and switch to TEACHER mode on abuse', async () => {
        mockPrisma.studentState.upsert.mockResolvedValue({ studentDid: 's1', helpClickCount: 5 });

        await subscriber.handleEvent({
            eventType: 'HELP_CLICK',
            creatorDid: 's1',
            payload: {}
        });

        expect(mockPrisma.studentState.upsert).toHaveBeenCalled();
        expect(mockPrisma.studentState.update).toHaveBeenCalledWith(expect.objectContaining({
            data: { mode: 'TEACHER' }
        }));
    });

    it('should update current location on page view', async () => {
        await subscriber.handleEvent({
            eventType: 'PAGE_VIEW',
            creatorDid: 's1',
            payload: { path: '/quests/math' }
        });

        expect(mockPrisma.studentState.upsert).toHaveBeenCalledWith(expect.objectContaining({
            update: { currentQuest: '/quests/math' }
        }));
    });
});
