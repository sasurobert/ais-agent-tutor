#!/usr/bin/env npx tsx
/**
 * Minimal SCDS test — runs a single chapter through generateAll to debug issues.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { GeminiClient } from '../lib/GeminiClient.js';
import { ScdsGenerator } from '../services/scds/ScdsGenerator.js';
import { ChapterExtract } from '../services/scds/types.js';

async function testSingleChapter() {
    console.log('=== Single Chapter SCDS Test ===\n');

    const gemini = new GeminiClient({
        apiKey: process.env.GEMINI_API_KEY!,
        textModel: process.env.GEMINI_TEXT_MODEL,
    });

    const generator = new ScdsGenerator({
        gemini,
        targetAge: 12,
        numQuizQuestions: 6,
        numComicPanels: 8,
    });

    // Load a small chapter from disk
    const textbookDir = '/Users/user/TheAISchoolOS/ais-assets/textbooks/prealgebra-2e/ch04-fractions';
    const combinedFile = fs.readdirSync(textbookDir).find(f => f.startsWith('_chapter-'));
    if (!combinedFile) {
        console.error('No chapter file found');
        process.exit(1);
    }

    const markdown = fs.readFileSync(path.join(textbookDir, combinedFile), 'utf-8');
    console.log(`Loaded chapter: ${combinedFile} (${markdown.length} chars)`);

    const chapter: ChapterExtract = {
        chapterNumber: 4,
        title: 'Fractions',
        markdown,
        images: [],
        pageRange: [0, 0],
    };

    console.log('\nCalling generateAll (5 generators in parallel)...\n');

    try {
        const result = await generator.generateAll(chapter, 'The Bridge Builder');
        console.log('\n=== SUCCESS ===');
        console.log('Quiz questions:', result.quiz?.questions?.length || 'N/A');
        console.log('Comic panels:', result.comicScript?.panels?.length || 'N/A');
        console.log('Podcast segments:', result.podcastScript?.segments?.length || 'N/A');
        console.log('Mind map nodes:', result.mindMap?.nodes?.length || 'N/A');
        console.log('Narrative quest:', result.narrative?.questTitle || 'N/A');
    } catch (err: any) {
        console.error('\n=== FAILED ===');
        console.error('Error:', err.message);
        console.error('Stack:', err.stack);
    }
}

testSingleChapter().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
