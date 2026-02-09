#!/usr/bin/env ts-node
/**
 * Demo Seed Script
 *
 * Runs the full ingestion + SCDS generation pipeline for all 3 OpenStax books.
 * Outputs JSON data files ready for the demo.
 *
 * Usage:
 *   npx dotenv -e ../../.env.demo -- npx ts-node src/scripts/seed-demo.ts
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { GeminiClient } from '../lib/GeminiClient';
import { IngestionService } from '../services/IngestionService';
import { ScdsGenerator } from '../services/scds/ScdsGenerator';
import { Course, Module } from '../services/scds/types';

// ─── Configuration ────────────────────────────────────

const DATA_DIR = process.env.DATA_FOR_DEMO_PATH || '/Users/user/TheAISchoolOS/ais-specs/data_for_demo';
const OUTPUT_DIR = path.join(DATA_DIR, 'scds_output');
const MARKER_VENV = process.env.MARKER_VENV_PATH || '/Users/user/TheAISchoolOS/.venv-marker';
const MARKER_OUTPUT = path.join(DATA_DIR, 'marker_output');

interface BookConfig {
    pdfFile: string;
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
        pdfFile: 'Prealgebra2e-WEB_0qbw93r.pdf',
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
        pdfFile: 'Biology2e-WEB.pdf',
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
        pdfFile: 'US_History_-_WEB.pdf',
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
        markerVenvPath: MARKER_VENV,
        outputDir: MARKER_OUTPUT,
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
        console.log(`${'='.repeat(60)}`);

        const pdfPath = path.join(DATA_DIR, book.pdfFile);
        if (!fs.existsSync(pdfPath)) {
            console.error(`  ❌ PDF not found: ${pdfPath}`);
            continue;
        }

        // Step 1: Check if Marker output already exists (skip conversion if so)
        const pdfName = path.basename(pdfPath, path.extname(pdfPath));
        const existingMdDir = path.join(MARKER_OUTPUT, pdfName);
        let markdownPath: string;

        if (fs.existsSync(existingMdDir)) {
            const mdFiles = fs.readdirSync(existingMdDir).filter(f => f.endsWith('.md'));
            if (mdFiles.length > 0) {
                markdownPath = path.join(existingMdDir, mdFiles[0]);
                console.log(`  ♻️ Using existing Marker output: ${markdownPath}`);
            } else {
                const result = await ingestion.ingest(pdfPath, book.courseName);
                markdownPath = result.rawMarkdownPath;
            }
        } else {
            const result = await ingestion.ingest(pdfPath, book.courseName);
            markdownPath = result.rawMarkdownPath;
        }

        // Step 2: Split into chapters
        const chapters = ingestion.splitChapters(markdownPath);

        // Step 3: Filter to selected chapters
        const selectedChapters = book.selectedChapters
            .map(sel => {
                const chapter = chapters.find(c => c.chapterNumber === sel.chapterNumber);
                if (!chapter) {
                    console.warn(`  ⚠️ Chapter ${sel.chapterNumber} not found, skipping`);
                    return null;
                }
                return { chapter, questTitle: sel.questTitle };
            })
            .filter((c): c is NonNullable<typeof c> => c !== null);

        console.log(`  📚 Found ${selectedChapters.length}/${book.selectedChapters.length} selected chapters`);

        // Step 4: Generate SCDS for each selected chapter
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

        // Step 5: Assemble course object
        const course: Partial<Course> = {
            id: book.subject,
            title: book.courseName,
            subject: book.subject,
            sourceBook: book.pdfFile,
            gradeRange: book.gradeRange,
            modules: modules as Module[],
            metadata: {
                authors: ['OpenStax'],
                license: 'CC-BY 4.0',
                sourceUrl: `https://openstax.org/details/books/${book.courseName.toLowerCase().replace(/\s+/g, '-')}`,
                totalPages: 0,
                chaptersExtracted: chapters.length,
            },
            createdAt: new Date().toISOString(),
        };

        // Step 6: Save SCDS JSON output
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
