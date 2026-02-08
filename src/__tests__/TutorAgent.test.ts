import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TutorAgent } from '../agents/TutorAgent.js';
import { HumanMessage, AIMessage } from '@langchain/core/messages';

vi.mock('@langchain/openai', () => {
    return {
        ChatOpenAI: class {
            invoke = vi.fn().mockResolvedValue(new AIMessage("I can help you with that Socratic style."));
            bindTools = vi.fn().mockReturnThis();
        }
    };
});

vi.mock('@langchain/tavily', () => {
    return {
        TavilySearch: class {
            name = "tavily_search-results_json";
            description = "A search engine optimized for comprehensive, accurate, and trusted results.";
        }
    };
});

vi.mock('../services/MemoryService.js', () => {
    return {
        MemoryService: class {
            retrieveContext = vi.fn().mockResolvedValue([{ pageContent: "Student history" }]);
            retrieveWorldviewContext = vi.fn().mockResolvedValue([{ pageContent: "Biblical context" }]);
        }
    };
});

vi.mock('../services/ActionService.js', () => {
    return {
        ActionService: {
            getTools: vi.fn().mockReturnValue([])
        }
    };
});

describe('TutorAgent', () => {
    let agent: TutorAgent;

    beforeEach(() => {
        agent = new TutorAgent();
    });

    it('should run the agent flow and return a message', async () => {
        const result = await agent.run('student-123', [new HumanMessage("How do I solve 2+2?")]);
        expect(result.messages).toHaveLength(2); // contextCollation doesn't add a message, but START -> agent adds one, and START?
        // Wait, contextCollation is a node, callModel is a node. 
        // START -> contextCollation -> agent -> END
        // Result messages should include the new AI message.
        const lastMessage = result.messages[result.messages.length - 1];
        expect(lastMessage.content).toContain('Socratic style');
    });
});
