#!/usr/bin/env ts-node
/**
 * Visual Asset Generation Script
 *
 * Generates all visual assets for the demo using Gemini Nano Banana Pro 3:
 * - Comic panels for each course
 * - R2D2 Droid evolution sprites (Rusted → Polished → Golden)
 * - Isometric city buildings (normal + decayed + thriving states)
 * - Era landscape backgrounds for Timeline Map
 * - Avatar parts for Guardian character creator
 * - Timeline node icons
 *
 * Usage:
 *   npx dotenv -e ../../.env.demo -- npx ts-node src/scripts/generate-assets.ts
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { GeminiClient } from '../lib/GeminiClient';
import {
    comicPanelImagePrompt,
    droidEvolutionPrompt,
    buildingSpritePrompt,
    eraBackgroundPrompt,
    avatarPartPrompt,
} from '../services/scds/prompts';

const ASSETS_DIR = process.env.ASSETS_PATH || '/Users/user/TheAISchoolOS/ais-assets';

async function generateAssets(): Promise<void> {
    console.log('🎨 TheAISchoolOS Visual Asset Generator');
    console.log('='.repeat(60));

    const gemini = new GeminiClient({
        apiKey: process.env.GEMINI_API_KEY!,
        imageModel: process.env.GEMINI_IMAGE_MODEL || 'gemini-2.5-flash-image',
    });

    // ─── R2D2 Droid Evolution ───────────────
    console.log('\n🤖 Generating R2D2 Droid evolution sprites...');
    const droidStages: Array<'rusted' | 'polished' | 'golden'> = ['rusted', 'polished', 'golden'];

    for (const stage of droidStages) {
        try {
            const prompt = droidEvolutionPrompt(stage);
            const outputPath = path.join(ASSETS_DIR, 'images', 'droid', `droid_${stage}.png`);
            await gemini.generateImage({ prompt, outputPath });
            console.log(`  ✅ Droid ${stage}: ${outputPath}`);
        } catch (error) {
            console.error(`  ❌ Droid ${stage} failed: ${error}`);
        }
        // Rate limit protection
        await sleep(2000);
    }

    // ─── Isometric City Buildings ───────────────
    console.log('\n🏗️ Generating isometric city buildings...');
    const buildings = ['Library', 'Market', 'Observatory', 'Workshop', 'Town Hall'];
    const states: Array<'normal' | 'decayed' | 'thriving'> = ['normal', 'decayed', 'thriving'];

    for (const building of buildings) {
        for (const state of states) {
            try {
                const prompt = buildingSpritePrompt(building, state);
                const fileName = `${building.toLowerCase()}_${state}.png`;
                const outputPath = path.join(ASSETS_DIR, 'images', 'city', fileName);
                await gemini.generateImage({ prompt, outputPath });
                console.log(`  ✅ ${building} (${state}): ${fileName}`);
            } catch (error) {
                console.error(`  ❌ ${building} (${state}) failed: ${error}`);
            }
            await sleep(2000);
        }
    }

    // ─── Era Landscape Backgrounds ───────────────
    console.log('\n🌄 Generating era landscape backgrounds...');
    const eras = [
        { name: 'ancient', desc: 'Ancient civilization: pyramids, stone temples, lush river valleys, star-filled sky, torches and campfires, desert meeting fertile land' },
        { name: 'classical', desc: 'Classical era: Greek/Roman architecture, marble columns, amphitheaters, olive groves, Mediterranean blue sky, scrolls and philosophy' },
        { name: 'industrial', desc: 'Industrial revolution: factories with smoke stacks, steam trains, brick buildings, gas lamps, iron bridges, bustling city streets' },
        { name: 'information', desc: 'Information age: futuristic cityscape, holographic displays, clean energy, glass towers, satellite dishes, digital particle effects' },
    ];

    for (const era of eras) {
        try {
            const prompt = eraBackgroundPrompt(era.name, era.desc);
            const outputPath = path.join(ASSETS_DIR, 'images', 'backgrounds', `era_${era.name}.png`);
            await gemini.generateImage({ prompt, outputPath });
            console.log(`  ✅ Era ${era.name}: era_${era.name}.png`);
        } catch (error) {
            console.error(`  ❌ Era ${era.name} failed: ${error}`);
        }
        await sleep(2000);
    }

    // ─── Guardian Avatar Parts ───────────────
    console.log('\n👤 Generating Guardian avatar parts...');
    const avatarParts = [
        { type: 'hair', variants: ['short_brown', 'long_black', 'curly_red', 'braids_blonde', 'mohawk_purple', 'bun_silver'] },
        { type: 'uniform', variants: ['explorer_green', 'scholar_blue', 'builder_orange', 'guardian_gold'] },
        { type: 'tool', variants: ['wrench', 'telescope', 'ancient_book'] },
    ];

    for (const { type, variants } of avatarParts) {
        for (const variant of variants) {
            try {
                const prompt = avatarPartPrompt(type, variant);
                const outputPath = path.join(ASSETS_DIR, 'images', 'avatars', `${type}_${variant}.png`);
                await gemini.generateImage({ prompt, outputPath });
                console.log(`  ✅ Avatar ${type}/${variant}: ${type}_${variant}.png`);
            } catch (error) {
                console.error(`  ❌ Avatar ${type}/${variant} failed: ${error}`);
            }
            await sleep(2000);
        }
    }

    // ─── Timeline Node Icons ───────────────
    console.log('\n📍 Generating timeline node icons...');
    const nodeIcons = [
        { name: 'bridge_builder', desc: 'A stone bridge under construction, mathematical blueprints visible' },
        { name: 'market_trader', desc: 'A bustling medieval market stall with a merchant counting coins' },
        { name: 'architect', desc: 'Geometric shapes and architectural blueprints with a compass and ruler' },
        { name: 'life_engineer', desc: 'A microscope revealing a glowing cell with labeled organelles' },
        { name: 'garden_guardian', desc: 'A magical garden with glowing plants converting sunlight to energy' },
        { name: 'stewards_domain', desc: 'A balanced ecosystem with interconnected animals, plants, and water' },
        { name: 'founding_fathers', desc: 'Quill pen signing a glowing parchment document, colonial setting' },
        { name: 'constitution_builder', desc: 'A grand hall with columns and a document being crafted' },
        { name: 'divided_nation', desc: 'A map of the United States with a dramatic crack down the middle' },
    ];

    for (const icon of nodeIcons) {
        try {
            const prompt = `Create a circular icon (like an app icon or map marker) for a children's educational game. Subject: ${icon.desc}. Style: Clean, colorful, simple, recognizable at small size. Background: Dark circular frame with golden border. Size: 256x256. Quality: Game-ready icon asset.`;
            const outputPath = path.join(ASSETS_DIR, 'images', 'timeline', `node_${icon.name}.png`);
            await gemini.generateImage({ prompt, outputPath });
            console.log(`  ✅ Node ${icon.name}: node_${icon.name}.png`);
        } catch (error) {
            console.error(`  ❌ Node ${icon.name} failed: ${error}`);
        }
        await sleep(2000);
    }

    // ─── Time Portal Background ───────────────
    console.log('\n📺 Generating Time Portal background...');
    try {
        const prompt = `Create a retro CRT monitor screen background for a children's educational game. The screen shows a greenish phosphor glow with subtle scan lines. The border is a chunky 1980s computer monitor frame in beige/cream. The screen area shows a mysterious swirling portal effect in green and gold tones. Style: Nostalgic but clean. Suitable as a chat interface background.`;
        const outputPath = path.join(ASSETS_DIR, 'images', 'ui', 'time_portal_bg.png');
        await gemini.generateImage({ prompt, outputPath });
        console.log(`  ✅ Time Portal background`);
    } catch (error) {
        console.error(`  ❌ Time Portal background failed: ${error}`);
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log('🎉 Visual asset generation complete!');
    console.log(`📁 Output: ${ASSETS_DIR}/images/`);
    console.log(`${'='.repeat(60)}\n`);
}

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

generateAssets().catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
});
