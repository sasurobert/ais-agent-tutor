import { describe, it, expect, vi } from 'vitest';
import { ActionService } from '../services/ActionService.js';

vi.mock('@langchain/tavily', () => {
    return {
        TavilySearch: class {
            name = "tavily_search-results_json";
            description = "A search engine optimized for comprehensive, accurate, and trusted results.";
            apiKey = "test";
        }
    };
});

describe('ActionService', () => {
    it('should provide exactly 3 tools', () => {
        const tools = ActionService.getTools();
        expect(tools).toHaveLength(3);
        expect(tools.map(t => t.name)).toContain('navigate_to_quest');
        expect(tools.map(t => t.name)).toContain('check_student_progress');
    });
});
