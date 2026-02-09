#!/usr/bin/env ts-node
/**
 * Master Demo Orchestrator
 *
 * Runs all demo generation scripts in the correct order:
 * 1. PDF → Markdown (Marker)
 * 2. Markdown → SCDS JSON (Gemini)
 * 3. Comic panel images (Gemini Image Gen)
 * 4. Podcast audio (Gemini TTS)
 * 5. Visual assets (Gemini Image Gen)
 *
 * Usage:
 *   npx dotenv -e ../../.env.demo -- npx ts-node src/scripts/run-demo-pipeline.ts
 *
 * Options:
 *   --skip-pdf          Skip PDF conversion (use existing Marker output)
 *   --skip-scds         Skip SCDS generation (use existing JSON)
 *   --skip-images       Skip image generation
 *   --skip-audio        Skip audio generation
 *   --only=<stage>      Run only one stage: pdf|scds|images|audio|comics
 */

import { execSync } from 'node:child_process';
import * as path from 'node:path';
import * as fs from 'node:fs';

const ROOT = path.resolve(__dirname, '../..');
const SCRIPTS_DIR = path.resolve(__dirname);
const ENV_FILE = path.resolve(ROOT, '../../.env.demo');

// Parse command line args
const args = process.argv.slice(2);
const skipPdf = args.includes('--skip-pdf');
const skipScds = args.includes('--skip-scds');
const skipImages = args.includes('--skip-images');
const skipAudio = args.includes('--skip-audio');
const onlyArg = args.find(a => a.startsWith('--only='));
const only = onlyArg ? onlyArg.split('=')[1] : null;

function banner(title: string): void {
    console.log(`\n${'═'.repeat(70)}`);
    console.log(`  🚀 ${title}`);
    console.log(`${'═'.repeat(70)}\n`);
}

function runScript(scriptName: string): void {
    const scriptPath = path.join(SCRIPTS_DIR, scriptName);
    const envFlag = fs.existsSync(ENV_FILE) ? `-e ${ENV_FILE}` : '';

    console.log(`▶️ Running: ${scriptName}`);
    const startTime = Date.now();

    try {
        execSync(
            `npx dotenv ${envFlag} -- npx ts-node ${scriptPath}`,
            {
                cwd: ROOT,
                stdio: 'inherit',
                timeout: 3600000, // 1 hour timeout
                env: { ...process.env },
            }
        );

        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(`\n✅ ${scriptName} completed in ${elapsed}s\n`);
    } catch (error) {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        console.error(`\n❌ ${scriptName} failed after ${elapsed}s: ${error}\n`);
    }
}

async function main(): Promise<void> {
    banner('TheAISchoolOS — Master Demo Pipeline');

    console.log('📋 Configuration:');
    console.log(`   ENV file:    ${fs.existsSync(ENV_FILE) ? '✅ Found' : '❌ Missing'}`);
    console.log(`   Skip PDF:    ${skipPdf}`);
    console.log(`   Skip SCDS:   ${skipScds}`);
    console.log(`   Skip Images: ${skipImages}`);
    console.log(`   Skip Audio:  ${skipAudio}`);
    console.log(`   Only stage:  ${only || 'all'}`);
    console.log();

    const stages = [
        { name: 'pdf', label: 'Stage 1: PDF Ingestion (Marker)', script: 'seed-demo.ts', skip: skipPdf || skipScds },
        { name: 'scds', label: 'Stage 2: SCDS Content Generation (Gemini)', script: 'seed-demo.ts', skip: skipScds },
        { name: 'images', label: 'Stage 3: Visual Asset Generation (Gemini Image)', script: 'generate-assets.ts', skip: skipImages },
        { name: 'comics', label: 'Stage 4: Comic Panel Generation (Gemini Image)', script: 'generate-comic-panels.ts', skip: skipImages },
        { name: 'audio', label: 'Stage 5: Audio Generation (Gemini TTS)', script: 'generate-audio.ts', skip: skipAudio },
    ];

    for (const stage of stages) {
        if (only && stage.name !== only) continue;
        if (stage.skip && !only) {
            console.log(`⏭️ Skipping: ${stage.label}`);
            continue;
        }

        banner(stage.label);
        runScript(stage.script);
    }

    banner('Pipeline Complete!');

    // Summary
    const assets = process.env.ASSETS_PATH || '/Users/user/TheAISchoolOS/ais-assets';
    const scds = process.env.DATA_FOR_DEMO_PATH
        ? path.join(process.env.DATA_FOR_DEMO_PATH, 'scds_output')
        : '/Users/user/TheAISchoolOS/ais-specs/data_for_demo/scds_output';

    if (fs.existsSync(scds)) {
        const courses = fs.readdirSync(scds).filter(f => f.endsWith('.json'));
        console.log(`📊 SCDS courses generated: ${courses.length}`);
        for (const c of courses) {
            const data = JSON.parse(fs.readFileSync(path.join(scds, c), 'utf-8'));
            console.log(`   📖 ${data.title}: ${data.modules?.length || 0} modules`);
        }
    }

    if (fs.existsSync(assets)) {
        const countFiles = (dir: string): number => {
            if (!fs.existsSync(dir)) return 0;
            return fs.readdirSync(dir).reduce((sum, f) => {
                const p = path.join(dir, f);
                return sum + (fs.statSync(p).isDirectory() ? countFiles(p) : 1);
            }, 0);
        };
        console.log(`\n🎨 Assets generated:`);
        console.log(`   🔊 Audio: ${countFiles(path.join(assets, 'audio'))} files`);
        console.log(`   🖼️ Images: ${countFiles(path.join(assets, 'images'))} files`);
        console.log(`   📹 Video: ${countFiles(path.join(assets, 'video'))} files`);
    }

    console.log(`\n🏁 All done! The demo is ready.\n`);
}

main().catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
});
