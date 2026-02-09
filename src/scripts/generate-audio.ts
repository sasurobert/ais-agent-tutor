#!/usr/bin/env ts-node
/**
 * Audio Generation Script
 *
 * Generates all audio assets for the demo using Gemini TTS:
 * - Podcast episodes (multi-speaker: Professor Spark + Ace)
 * - R2D2 Droid voice lines (single-speaker)
 * - Cinematic narration for onboarding
 *
 * Usage:
 *   npx dotenv -e ../../.env.demo -- npx ts-node src/scripts/generate-audio.ts
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { GeminiClient } from '../lib/GeminiClient';

const ASSETS_DIR = process.env.ASSETS_PATH || '/Users/user/TheAISchoolOS/ais-assets';
const SCDS_DIR = process.env.DATA_FOR_DEMO_PATH
    ? path.join(process.env.DATA_FOR_DEMO_PATH, 'scds_output')
    : '/Users/user/TheAISchoolOS/ais-specs/data_for_demo/scds_output';

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function generateAudio(): Promise<void> {
    console.log('🎙️ TheAISchoolOS Audio Generator');
    console.log('='.repeat(60));

    const gemini = new GeminiClient({
        apiKey: process.env.GEMINI_API_KEY!,
        ttsModel: process.env.GEMINI_TTS_MODEL || 'gemini-2.5-flash-preview-tts',
    });

    // ─── R2D2 Droid Voice Lines ───────────────
    console.log('\n🤖 Generating R2D2 Droid voice lines...');
    const droidLines = [
        { id: 'greeting', text: 'Hey there, Guardian! Ready for another adventure? The knowledge realm awaits!' },
        { id: 'encouragement', text: "You're doing amazing! Every question you answer makes our city stronger." },
        { id: 'hint', text: "Hmm, this is a tricky one. Want me to give you a hint? Think about what we learned earlier." },
        { id: 'correct', text: "YES! That's exactly right! You just earned 50 XP and your city is growing!" },
        { id: 'wrong', text: "Not quite, but don't worry! Even the greatest scholars make mistakes. Let's think about this differently." },
        { id: 'level_up', text: "INCREDIBLE! You've leveled up! Your knowledge city is now a thriving metropolis!" },
        { id: 'welcome_back', text: "Welcome back, Guardian! I've been studying while you were away. I have some new things to show you!" },
        { id: 'boss_battle', text: "Alert! A Boss Battle approaches! Get ready to put everything you've learned to the test!" },
        { id: 'quest_complete', text: "Quest complete! You've mastered this chapter. The Council of Knowledge is impressed!" },
        { id: 'comic_intro', text: "Let me show you the story of this chapter. It's quite an adventure!" },
        { id: 'podcast_intro', text: "Want to hear Professor Spark and Ace discuss this topic? Plug in and listen!" },
        { id: 'time_portal', text: "The Time Portal is glowing! Step through and discover history for yourself!" },
    ];

    for (const line of droidLines) {
        try {
            const outputPath = path.join(ASSETS_DIR, 'audio', 'droid', `droid_${line.id}.wav`);
            await gemini.generateTTS({
                text: line.text,
                outputPath,
                voiceName: 'Puck', // Friendly, enthusiastic voice for the droid
            });
            console.log(`  ✅ Droid ${line.id}`);
        } catch (error) {
            console.error(`  ❌ Droid ${line.id} failed: ${error}`);
        }
        await sleep(2000);
    }

    // ─── Podcast Episodes from SCDS ───────────────
    console.log('\n🎙️ Generating podcast episodes from SCDS data...');

    const scdsFiles = fs.existsSync(SCDS_DIR)
        ? fs.readdirSync(SCDS_DIR).filter(f => f.endsWith('_course.json'))
        : [];

    for (const scdsFile of scdsFiles) {
        try {
            const courseData = JSON.parse(fs.readFileSync(path.join(SCDS_DIR, scdsFile), 'utf-8'));
            const courseName = courseData.subject as string;

            for (const module of courseData.modules || []) {
                if (!module.podcastScript?.segments?.length) continue;

                const script = module.podcastScript;
                console.log(`\n  📻 Generating podcast: ${script.title}`);

                // Combine all segments into a multi-speaker TTS prompt
                const ttsText = script.segments
                    .map((seg: { speaker: string; text: string }) => `${seg.speaker}: ${seg.text}`)
                    .join('\n');

                const outputPath = path.join(
                    ASSETS_DIR, 'audio', 'podcasts',
                    `${courseName}_ch${module.chapterNumber}_podcast.wav`
                );

                try {
                    await gemini.generateTTS({
                        text: ttsText,
                        outputPath,
                        speakers: [
                            { name: 'Professor Spark', voiceName: 'Kore' },
                            { name: 'Ace', voiceName: 'Puck' },
                        ],
                    });
                    console.log(`    ✅ ${outputPath}`);
                } catch (error) {
                    console.error(`    ❌ TTS failed: ${error}`);
                }
                await sleep(3000);
            }
        } catch (error) {
            console.error(`  ❌ Processing ${scdsFile} failed: ${error}`);
        }
    }

    // ─── Cinematic Onboarding Narration ───────────────
    console.log('\n🎬 Generating cinematic onboarding narration...');
    const onboardingNarrations = [
        {
            id: 'intro',
            text: 'In a time not so different from our own, the great Library of Civilization fell silent. The knowledge that once connected all people was scattered, lost, and forgotten. But legends speak of young Guardians who would rise — brave, curious minds who could rebuild what was lost. You... are one of those Guardians.',
        },
        {
            id: 'tutorial',
            text: 'Every quest you complete rebuilds a piece of your knowledge city. Answer questions, explore stories, and solve puzzles to unlock the lost wisdom. Your AI companion will guide you. Together, you will restore the light of learning.',
        },
        {
            id: 'first_quest',
            text: "Your first quest awaits, Guardian. The ancient Bridge of Numbers has crumbled. Only by understanding fractions can you rebuild it. Are you ready? Let's go!",
        },
    ];

    for (const narration of onboardingNarrations) {
        try {
            const outputPath = path.join(ASSETS_DIR, 'audio', 'droid', `narration_${narration.id}.wav`);
            await gemini.generateTTS({
                text: narration.text,
                outputPath,
                voiceName: 'Charon', // Deep, cinematic narration voice
            });
            console.log(`  ✅ Narration ${narration.id}`);
        } catch (error) {
            console.error(`  ❌ Narration ${narration.id} failed: ${error}`);
        }
        await sleep(2000);
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log('🎉 Audio generation complete!');
    console.log(`📁 Output: ${ASSETS_DIR}/audio/`);
    console.log(`${'='.repeat(60)}\n`);
}

generateAudio().catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
});
