import { Pinecone } from '@pinecone-database/pinecone';
import { PineconeStore } from '@langchain/pinecone';
import { OpenAIEmbeddings } from '@langchain/openai';
import { Document } from '@langchain/core/documents';

export class MemoryService {
    private vectorStore: PineconeStore | null = null;
    private embeddings: OpenAIEmbeddings;

    constructor() {
        this.embeddings = new OpenAIEmbeddings({
            openAIApiKey: process.env.OPENAI_API_KEY,
        });
    }

    private async getVectorStore() {
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
    async storeInteraction(studentDid: String, content: string, metadata: any = {}) {
        const store = await this.getVectorStore();
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
     * Retrieve relevant memory context for a student.
     */
    async retrieveContext(studentDid: string, query: string, k: number = 5) {
        const store = await this.getVectorStore();
        const results = await store.similaritySearch(query, k, {
            studentDid: studentDid,
        });
        return results;
    }

    /**
     * Retrieve faith-aligned pedagogical context.
     */
    async retrieveWorldviewContext(query: string, k: number = 3) {
        const store = await this.getVectorStore();
        // Here we'd filter for 'worldview' type documents
        const results = await store.similaritySearch(query, k, {
            type: 'worldview',
        });
        return results;
    }
}
