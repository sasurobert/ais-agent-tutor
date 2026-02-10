#!/usr/bin/env npx tsx
/**
 * Quick Gemini API test — verifies connectivity before running the full pipeline.
 */
import { GeminiClient } from '../lib/GeminiClient.js';

async function test() {
    console.log('API Key prefix:', process.env.GEMINI_API_KEY?.substring(0, 15) + '...');
    console.log('Text model:', process.env.GEMINI_TEXT_MODEL || '(default: gemini-2.5-flash)');

    const gemini = new GeminiClient({
        apiKey: process.env.GEMINI_API_KEY!,
        textModel: process.env.GEMINI_TEXT_MODEL,
    });

    console.log('\n1. Testing generateText...');
    try {
        const text = await gemini.generateText({
            prompt: 'Say "hello world" in exactly 3 words.',
            temperature: 0.1,
        });
        console.log('   ✅ generateText:', text.trim());
    } catch (err: any) {
        console.error('   ❌ generateText failed:', err.message);
    }

    console.log('\n2. Testing generateJSON...');
    try {
        const json = await gemini.generateJSON<{ greeting: string }>({
            prompt: 'Return a JSON object with a single key "greeting" and value "hello world".',
            temperature: 0.1,
        });
        console.log('   ✅ generateJSON:', JSON.stringify(json));
    } catch (err: any) {
        console.error('   ❌ generateJSON failed:', err.message);
    }

    console.log('\nDone!');
}

test().catch(err => {
    console.error('Fatal:', err);
    process.exit(1);
});
