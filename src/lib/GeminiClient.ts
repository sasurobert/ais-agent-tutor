import { GoogleGenAI } from '@google/genai';
import * as fs from 'node:fs';
import * as path from 'node:path';

export interface GeminiConfig {
    apiKey: string;
    textModel?: string;
    imageModel?: string;
    ttsModel?: string;
    embeddingModel?: string;
}

export interface GenerateTextOptions {
    prompt: string;
    systemInstruction?: string;
    temperature?: number;
    maxOutputTokens?: number;
    responseSchema?: object;
}

export interface GenerateImageOptions {
    prompt: string;
    outputPath: string;
    aspectRatio?: string;
}

export interface GenerateTTSOptions {
    text: string;
    outputPath: string;
    voiceName?: string;
    speakers?: Array<{ name: string; voiceName: string }>;
}

export interface EmbeddingOptions {
    content: string;
    taskType?: string;
}

export class GeminiClient {
    private ai: GoogleGenAI;
    private textModel: string;
    private imageModel: string;
    private ttsModel: string;
    private embeddingModel: string;

    constructor(config: GeminiConfig) {
        this.ai = new GoogleGenAI({ apiKey: config.apiKey });
        this.textModel = config.textModel || 'gemini-2.5-flash';
        this.imageModel = config.imageModel || 'gemini-2.5-flash-image';
        this.ttsModel = config.ttsModel || 'gemini-2.5-flash-preview-tts';
        this.embeddingModel = config.embeddingModel || 'text-embedding-004';
    }

    /**
     * Generate text content using Gemini
     */
    async generateText(options: GenerateTextOptions): Promise<string> {
        const config: Record<string, unknown> = {};
        if (options.temperature !== undefined) config.temperature = options.temperature;
        if (options.maxOutputTokens !== undefined) config.maxTokens = options.maxOutputTokens;
        if (options.systemInstruction) config.systemInstruction = options.systemInstruction;

        const response = await this.ai.models.generateContent({
            model: this.textModel,
            contents: options.prompt,
            config,
        });

        return response.text || '';
    }

    /**
     * Generate JSON content using Gemini with structured output
     */
    async generateJSON<T = unknown>(options: GenerateTextOptions): Promise<T> {
        const config: Record<string, unknown> = {
            responseMimeType: 'application/json',
        };
        if (options.temperature !== undefined) config.temperature = options.temperature;
        if (options.systemInstruction) config.systemInstruction = options.systemInstruction;
        if (options.responseSchema) config.responseSchema = options.responseSchema;

        const response = await this.ai.models.generateContent({
            model: this.textModel,
            contents: options.prompt,
            config,
        });

        const text = response.text || '{}';
        return JSON.parse(text) as T;
    }

    /**
     * Generate an image using Gemini Nano Banana
     */
    async generateImage(options: GenerateImageOptions): Promise<string> {
        const config: Record<string, unknown> = {
            responseModalities: ['IMAGE', 'TEXT'],
        };
        if (options.aspectRatio) config.aspectRatio = options.aspectRatio;

        const response = await this.ai.models.generateContent({
            model: this.imageModel,
            contents: options.prompt,
            config,
        });

        for (const part of response.candidates?.[0]?.content?.parts || []) {
            if (part.inlineData) {
                const imageData = part.inlineData.data;
                if (imageData) {
                    const dir = path.dirname(options.outputPath);
                    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
                    const buffer = Buffer.from(imageData, 'base64');
                    fs.writeFileSync(options.outputPath, buffer);
                    return options.outputPath;
                }
            }
        }

        throw new Error('No image generated in response');
    }

    /**
     * Generate speech audio using Gemini TTS
     */
    async generateTTS(options: GenerateTTSOptions): Promise<string> {
        const config: Record<string, unknown> = {
            responseModalities: ['AUDIO'],
        };

        if (options.speakers && options.speakers.length > 1) {
            // Multi-speaker TTS
            config.speechConfig = {
                multiSpeakerVoiceConfig: {
                    speakerVoiceConfigs: options.speakers.map(s => ({
                        speaker: s.name,
                        voiceConfig: { prebuiltVoiceConfig: { voiceName: s.voiceName } },
                    })),
                },
            };
        } else if (options.voiceName) {
            // Single-speaker TTS
            config.speechConfig = {
                voiceConfig: {
                    prebuiltVoiceConfig: { voiceName: options.voiceName },
                },
            };
        }

        const response = await this.ai.models.generateContent({
            model: this.ttsModel,
            contents: options.text,
            config,
        });

        for (const part of response.candidates?.[0]?.content?.parts || []) {
            if (part.inlineData?.data) {
                const dir = path.dirname(options.outputPath);
                if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
                const buffer = Buffer.from(part.inlineData.data, 'base64');
                fs.writeFileSync(options.outputPath, buffer);
                return options.outputPath;
            }
        }

        throw new Error('No audio generated in response');
    }

    /**
     * Generate text embeddings
     */
    async generateEmbedding(options: EmbeddingOptions): Promise<number[]> {
        const response = await this.ai.models.embedContent({
            model: this.embeddingModel,
            contents: options.content,
            config: options.taskType ? { taskType: options.taskType as 'RETRIEVAL_DOCUMENT' } : undefined,
        });

        return response.embeddings?.[0]?.values || [];
    }

    /**
     * Get the underlying GoogleGenAI instance for advanced use cases
     */
    getClient(): GoogleGenAI {
        return this.ai;
    }
}

/**
 * Create a GeminiClient from environment variables
 */
export function createGeminiClientFromEnv(): GeminiClient {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error('GEMINI_API_KEY environment variable is not set');
    }

    return new GeminiClient({
        apiKey,
        textModel: process.env.GEMINI_TEXT_MODEL,
        imageModel: process.env.GEMINI_IMAGE_MODEL,
        ttsModel: process.env.GEMINI_TTS_MODEL,
        embeddingModel: process.env.GEMINI_EMBEDDING_MODEL,
    });
}
