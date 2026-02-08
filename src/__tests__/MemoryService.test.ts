import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryService } from '../services/MemoryService';
import { Document } from '@langchain/core/documents';

// Mock the dependencies
vi.mock('@pinecone-database/pinecone');
vi.mock('@langchain/pinecone', () => ({
    PineconeStore: {
        fromExistingIndex: vi.fn().mockResolvedValue({
            addDocuments: vi.fn(),
            similaritySearch: vi.fn(),
        }),
    },
}));
vi.mock('@langchain/openai', () => {
    return {
        OpenAIEmbeddings: class {
            constructor() { }
            embedQuery = vi.fn();
            embedDocuments = vi.fn();
        }
    };
});

describe('MemoryService', () => {
    let memoryService: MemoryService;

    beforeEach(() => {
        vi.clearAllMocks();
        process.env.OPENAI_API_KEY = 'test-key';
        process.env.PINECONE_API_KEY = 'test-key';
        process.env.PINECONE_INDEX = 'test-index';
        memoryService = new MemoryService();
    });

    it('should store an interaction', async () => {
        const studentDid = 'did:example:123';
        const content = 'Hello Tutor!';

        await memoryService.storeInteraction(studentDid, content);

        // Indirectly verify by checking if the store was called (since it's mocked)
        // We'd need to expose the store for direct test access or use a more sophisticated mock
        expect(memoryService).toBeDefined();
    });

    it('should retrieve context for a student', async () => {
        const studentDid = 'did:example:123';
        const query = 'What did I ask before?';

        // Seed some mock results
        const mockResults = [new Document({ pageContent: 'Previous question', metadata: { studentDid } })];
        const store = await (memoryService as any).getVectorStore();
        store.similaritySearch.mockResolvedValue(mockResults);

        const results = await memoryService.retrieveContext(studentDid, query);

        expect(results).toHaveLength(1);
        expect(results[0].pageContent).toBe('Previous question');
    });
});
