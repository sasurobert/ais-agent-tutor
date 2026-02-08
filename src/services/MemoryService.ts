import { Pinecone } from '@pinecone-database/pinecone';
import { PineconeStore } from '@langchain/pinecone';
import { OpenAIEmbeddings } from '@langchain/openai';
import { Document } from '@langchain/core/documents';

export class MemoryService {
    private vectorStore: PineconeStore | null = null;
    private embeddings: OpenAIEmbeddings;
    private isStub: boolean;

    constructor() {
        this.isStub = process.env.OPENAI_API_KEY === 'sk-test-key';
        this.embeddings = new OpenAIEmbeddings({
            openAIApiKey: process.env.OPENAI_API_KEY,
        });
    }

    private async getVectorStore() {
        if (this.isStub) return null;
        if (this.vectorStore) return this.vectorStore;

        const pinecone = new Pinecone({
            apiKey: process.env.PINECONE_API_KEY!,
        });

        const index = pinecone.Index(process.env.PINECONE_INDEX!);

        this.vectorStore = await PineconeStore.fromExistingIndex(this.embeddings, {
            pineconeIndex: index,
        });

        return this.vectorStore;
    }

    /**
     * Store a student interaction in the vector memory.
     */
    async storeInteraction(studentDid: string, content: string, metadata: any = {}) {
        if (this.isStub) {
            console.log(`[MemoryService] Stub: Storing interaction for ${studentDid}`);
            return;
        }
        const store = await this.getVectorStore();
        if (!store) return;
        await store.addDocuments([
            new Document({
                pageContent: content,
                metadata: {
                    ...metadata,
                    studentDid,
                    type: 'interaction',
                    timestamp: new Date().toISOString(),
                },
            }),
        ]);
    }

    /**
     * Retrieve relevant memory context for a student with optional metadata filtering.
     */
    async retrieveContext(studentDid: string, query: string, k: number = 5, filter: any = {}) {
        if (this.isStub) {
            console.log(`[MemoryService] Stub: Retrieving context for ${studentDid}`);
            return [];
        }
        const store = await this.getVectorStore();
        if (!store) return [];
        const results = await store.similaritySearch(query, k, {
            ...filter,
            studentDid: studentDid,
        });
        return results;
    }

    /**
     * Retrieve faith-aligned pedagogical context with advanced weighting.
     */
    async retrieveWorldviewContext(query: string, k: number = 3) {
        if (this.isStub) {
            console.log(`[MemoryService] Stub: Retrieving worldview context`);
            return [];
        }
        const store = await this.getVectorStore();
        if (!store) return [];

        const results = await store.similaritySearch(query, k, {
            type: 'worldview',
        });

        console.log(`Retrieved ${results.length} worldview documents for query: ${query}`);

        return results;
    }
}
