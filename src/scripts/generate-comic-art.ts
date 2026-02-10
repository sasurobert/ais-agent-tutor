#!/usr/bin/env npx tsx
/**
 * Comic Art Generator (Single Panel) — Generates ONE panel image via Gemini.
 *
 * Usage:
 *   npx tsx src/scripts/generate-comic-art.ts --course math_course.json --module math_ch4 --panel 1
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { GeminiClient } from '../lib/GeminiClient.js';

// Catch unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
    console.error('⚠️  Unhandled rejection:', reason);
    process.exit(1);
});

// ─── Configuration ────────────────────────────────────

const DATA_DIR = process.env.DATA_FOR_DEMO_PATH || '/Users/user/TheAISchoolOS/ais-specs/data_for_demo';
const SCDS_DIR = path.join(DATA_DIR, 'scds_output');
const OUTPUT_ROOT = '/Users/user/TheAISchoolOS/ais-assets/images/comics';

const STYLE_PREFIX = `Educational comic panel illustration. Warm watercolor style with bold outlines. Expressive characters with large eyes. Vibrant colors with earth tones and bright accents. No text, speech bubbles, or captions — visual storytelling only.`;

// ─── Main ─────────────────────────────────────────────

async function main() {
    const args = process.argv.slice(2);
    let courseFile = '';
    let moduleId = '';
    let panelNum = 0;

    for (let i = 0; i < args.length; i++) {
        switch (args[i]) {
            case '--course': courseFile = args[++i]; break;
            case '--module': moduleId = args[++i]; break;
            case '--panel': panelNum = parseInt(args[++i], 10); break;
        }
    }

    if (!courseFile || !moduleId || !panelNum) {
        console.error('Usage: --course [file] --module [id] --panel [num]');
        process.exit(1);
    }

    const coursePath = path.join(SCDS_DIR, courseFile);
    if (!fs.existsSync(coursePath)) {
        console.error(`Missing course file: ${coursePath}`);
        process.exit(1);
    }

    const course = JSON.parse(fs.readFileSync(coursePath, 'utf-8'));
    const mod = course.modules.find((m: any) => m.id === moduleId);

    if (!mod) {
        console.error(`Module ${moduleId} not found in ${courseFile}`);
        process.exit(1);
    }

    const panel = mod.comicScript?.panels?.find((p: any) => p.panelNumber === panelNum);
    if (!panel) {
        console.error(`Panel ${panelNum} not found in ${moduleId}`);
        process.exit(1);
    }

    const moduleDir = path.join(OUTPUT_ROOT, course.subject, mod.id);
    fs.mkdirSync(moduleDir, { recursive: true });

    const filename = `panel_${String(panel.panelNumber).padStart(2, '0')}.png`;
    const outputPath = path.join(moduleDir, filename);

    if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 1000) {
        console.log(`⏭️  Panel ${panelNum} already exists`);
        process.exit(0);
    }

    const gemini = new GeminiClient({
        apiKey: process.env.GEMINI_API_KEY!,
        imageModel: process.env.GEMINI_IMAGE_MODEL || 'gemini-2.5-flash-image',
    });

    const prompt = buildPanelPrompt(panel);

    console.log(`🖌️  Generating ${moduleId} panel ${panelNum}...`);
    try {
        await gemini.generateImage({
            prompt,
            outputPath,
            aspectRatio: panel.layout === 'full_page' ? '3:4' : '16:9',
        });
        const size = fs.statSync(outputPath).size;
        console.log(`✅ Saved ${filename} (${(size / 1024).toFixed(0)} KB)`);
    } catch (err: any) {
        console.error(`❌ Failed panel ${panelNum}: ${err.message}`);
        process.exit(1);
    }
}

function buildPanelPrompt(panel: any): string {
    let prompt = `${STYLE_PREFIX}\n\nSCENE: ${panel.sceneDescription}`;
    if (panel.characters?.length) prompt += `\n\nCHARACTERS: ${panel.characters.join(', ')}`;
    if (panel.dialogue?.length) {
        const mood = panel.dialogue.map((d: any) => `${d.character} is expressing: "${d.text.substring(0, 50)}"`).join('. ');
        prompt += `\n\nEMOTIONAL CONTEXT: ${mood}`;
    }
    prompt += `\n\nIMPORTANT: Do NOT include any text, letters, words, speech bubbles, or captions.`;
    return prompt;
}

main().catch(err => {
    console.error('Fatal:', err);
    process.exit(1);
});
