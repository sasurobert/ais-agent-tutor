#!/usr/bin/env ts-node
/**
 * Demo Seed Script
 *
 * Runs the full ingestion + SCDS generation pipeline for all 3 OpenStax books.
 * Uses the OpenStax web scraper (no PDF/Marker dependency).
 * Outputs JSON data files ready for the demo.
 *
 * Usage:
 *   npx dotenv -e ../../.env.demo -- npx ts-node src/scripts/seed-demo.ts
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { GeminiClient } from '../lib/GeminiClient.js';
import { IngestionService } from '../services/IngestionService.js';
import { ScdsGenerator } from '../services/scds/ScdsGenerator.js';
import { Course, Module } from '../services/scds/types.js';

// ─── Configuration ────────────────────────────────────

const DATA_DIR = process.env.DATA_FOR_DEMO_PATH || '/Users/user/TheAISchoolOS/ais-specs/data_for_demo';
const OUTPUT_DIR = path.join(DATA_DIR, 'scds_output');

interface BookConfig {
    /** OpenStax book slug (e.g. "prealgebra-2e") or full URL */
    openstaxBook: string;
    courseName: string;
    subject: Course['subject'];
    gradeRange: [number, number];
    selectedChapters: Array<{
        chapterNumber: number;
        questTitle: string;
    }>;
}

const BOOKS: BookConfig[] = [
    {
        openstaxBook: 'prealgebra-2e',
        courseName: 'Prealgebra 2e',
        subject: 'math',
        gradeRange: [6, 8],
        selectedChapters: [
            { chapterNumber: 4, questTitle: 'The Bridge Builder' },
            { chapterNumber: 5, questTitle: 'The Market Trader' },
            { chapterNumber: 9, questTitle: 'The Architect' },
        ],
    },
    {
        openstaxBook: 'biology-2e',
        courseName: 'Biology 2e',
        subject: 'science',
        gradeRange: [9, 10],
        selectedChapters: [
            { chapterNumber: 4, questTitle: 'The Life Engineer' },
            { chapterNumber: 8, questTitle: 'The Garden Guardian' },
            { chapterNumber: 23, questTitle: "The Steward's Domain" },
        ],
    },
    {
        openstaxBook: 'us-history',
        courseName: 'US History',
        subject: 'history',
        gradeRange: [8, 12],
        selectedChapters: [
            { chapterNumber: 7, questTitle: 'The Founding Fathers' },
            { chapterNumber: 9, questTitle: 'The Constitution Builder' },
            { chapterNumber: 15, questTitle: 'The Divided Nation' },
        ],
    },
];

// ─── Main Pipeline ────────────────────────────────────

async function seedDemo(): Promise<void> {
    console.log('🎯 TheAISchoolOS Demo Seed Script');
    console.log('   (OpenStax Web Scraper — no PDF/Marker required)');
    console.log('='.repeat(60));

    // Ensure output directory exists
    if (!fs.existsSync(OUTPUT_DIR)) {
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    // Initialize services
    const gemini = new GeminiClient({
        apiKey: process.env.GEMINI_API_KEY!,
        textModel: process.env.GEMINI_TEXT_MODEL,
        imageModel: process.env.GEMINI_IMAGE_MODEL,
        ttsModel: process.env.GEMINI_TTS_MODEL,
        embeddingModel: process.env.GEMINI_EMBEDDING_MODEL,
    });

    const ingestion = new IngestionService({
        outputDir: path.join(DATA_DIR, 'openstax_output'),
    });

    const generator = new ScdsGenerator({
        gemini,
        targetAge: 12,
        numQuizQuestions: 6,
        numComicPanels: 8,
    });

    // Process each book
    for (const book of BOOKS) {
        console.log(`\n${'='.repeat(60)}`);
        console.log(`📖 Processing: ${book.courseName}`);
        console.log(`   Source: OpenStax ${book.openstaxBook}`);
        console.log(`${'='.repeat(60)}`);

        // Step 1: Ingest from OpenStax (disk-first, then live scrape)
        const result = await ingestion.ingest(
            book.openstaxBook,
            book.courseName,
            book.selectedChapters.map(c => c.chapterNumber),
        );

        // Step 2: Match chapters to quest titles
        const selectedChapters = book.selectedChapters
            .map(sel => {
                const chapter = result.chapters.find(c => c.chapterNumber === sel.chapterNumber);
                if (!chapter) {
                    console.warn(`  ⚠️ Chapter ${sel.chapterNumber} not found, skipping`);
                    return null;
                }
                return { chapter, questTitle: sel.questTitle };
            })
            .filter((c): c is NonNullable<typeof c> => c !== null);

        console.log(`  📚 Found ${selectedChapters.length}/${book.selectedChapters.length} selected chapters`);

        // Step 3: Generate SCDS for each selected chapter
        const modules: Partial<Module>[] = [];

        for (const { chapter, questTitle } of selectedChapters) {
            try {
                const moduleData = await generator.generateAll(chapter, questTitle);
                modules.push({
                    ...moduleData,
                    id: `${book.subject}_ch${chapter.chapterNumber}`,
                    courseId: book.subject,
                    order: modules.length + 1,
                    sourceMarkdown: chapter.markdown.substring(0, 500) + '...', // Truncate for storage
                });
            } catch (error) {
                console.error(`  ❌ Failed to generate SCDS for Ch. ${chapter.chapterNumber}: ${error}`);
            }
        }

        // Step 4: Assemble course object
        const course: Partial<Course> = {
            id: book.subject,
            title: book.courseName,
            subject: book.subject,
            sourceBook: book.openstaxBook,
            gradeRange: book.gradeRange,
            modules: modules as Module[],
            metadata: result.metadata,
            createdAt: new Date().toISOString(),
        };

        // Step 5: Save SCDS JSON output
        const outputPath = path.join(OUTPUT_DIR, `${book.subject}_course.json`);
        fs.writeFileSync(outputPath, JSON.stringify(course, null, 2));
        console.log(`\n  💾 Saved: ${outputPath}`);
        console.log(`  📊 Modules: ${modules.length}, with ${modules.reduce((sum, m) => sum + (m.quiz?.questions?.length || 0), 0)} quiz questions total`);
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log('🎉 Demo seed complete!');
    console.log(`📁 Output: ${OUTPUT_DIR}`);
    console.log(`${'='.repeat(60)}\n`);
}

// Run
seedDemo().catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
});
