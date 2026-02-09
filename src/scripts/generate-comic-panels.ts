#!/usr/bin/env ts-node
/**
 * Comic Panel Image Generation Script
 *
 * Takes SCDS comic scripts and generates actual comic panel images using Gemini.
 * Also generates a composite comic page layout.
 *
 * Usage:
 *   npx dotenv -e ../../.env.demo -- npx ts-node src/scripts/generate-comic-panels.ts
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { GeminiClient } from '../lib/GeminiClient';
import { comicPanelImagePrompt } from '../services/scds/prompts';

const ASSETS_DIR = process.env.ASSETS_PATH || '/Users/user/TheAISchoolOS/ais-assets';
const SCDS_DIR = process.env.DATA_FOR_DEMO_PATH
    ? path.join(process.env.DATA_FOR_DEMO_PATH, 'scds_output')
    : '/Users/user/TheAISchoolOS/ais-specs/data_for_demo/scds_output';

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function generateComicPanels(): Promise<void> {
    console.log('📖 TheAISchoolOS Comic Panel Generator');
    console.log('='.repeat(60));

    const gemini = new GeminiClient({
        apiKey: process.env.GEMINI_API_KEY!,
        imageModel: process.env.GEMINI_IMAGE_MODEL || 'gemini-2.5-flash-image',
    });

    const scdsFiles = fs.existsSync(SCDS_DIR)
        ? fs.readdirSync(SCDS_DIR).filter(f => f.endsWith('_course.json'))
        : [];

    if (scdsFiles.length === 0) {
        console.log('⚠️ No SCDS files found. Run seed-demo.ts first.');
        return;
    }

    for (const scdsFile of scdsFiles) {
        const courseData = JSON.parse(fs.readFileSync(path.join(SCDS_DIR, scdsFile), 'utf-8'));
        const courseName = courseData.subject as string;

        console.log(`\n📚 Processing course: ${courseData.title} (${courseName})`);

        for (const module of courseData.modules || []) {
            if (!module.comicScript?.panels?.length) {
                console.log(`  ⏭️ Skipping Ch.${module.chapterNumber} — no comic script`);
                continue;
            }

            const comic = module.comicScript;
            console.log(`\n  🎨 Generating panels for: "${comic.title}" (${comic.panels.length} panels)`);

            const panelDir = path.join(ASSETS_DIR, 'images', 'comic', courseName);
            if (!fs.existsSync(panelDir)) {
                fs.mkdirSync(panelDir, { recursive: true });
            }

            for (const panel of comic.panels) {
                const panelFile = `ch${module.chapterNumber}_panel_${String(panel.panelNumber).padStart(2, '0')}.png`;
                const outputPath = path.join(panelDir, panelFile);

                // Skip if already generated
                if (fs.existsSync(outputPath)) {
                    console.log(`    ♻️ Panel ${panel.panelNumber} already exists, skipping`);
                    continue;
                }

                try {
                    const prompt = comicPanelImagePrompt(
                        panel.sceneDescription,
                        comic.style || 'watercolor',
                        courseName === 'math' ? '10-14 year old' : courseName === 'science' ? '14-16 year old' : '12-16 year old'
                    );

                    await gemini.generateImage({ prompt, outputPath });
                    console.log(`    ✅ Panel ${panel.panelNumber}: ${panelFile}`);
                } catch (error) {
                    console.error(`    ❌ Panel ${panel.panelNumber} failed: ${error}`);
                }

                // Rate limit
                await sleep(3000);
            }
        }
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log('🎉 Comic panel generation complete!');
    console.log(`📁 Output: ${ASSETS_DIR}/images/comic/`);
    console.log(`${'='.repeat(60)}\n`);
}

generateComicPanels().catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
});
