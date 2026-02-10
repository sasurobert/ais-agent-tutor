#!/usr/bin/env npx tsx
/**
 * Audio Asset Generator — Generate all voice lines and podcasts via Gemini TTS.
 *
 * Usage:
 *   npx dotenv -e ../.env.demo -- npx tsx src/scripts/generate-audio-assets.ts
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
const OUTPUT_ROOT = '/Users/user/TheAISchoolOS/ais-assets/audio';

const COURSES = ['math_course.json', 'science_course.json', 'history_course.json'];

// ─── Types ────────────────────────────────────────────

interface PodcastTurn {
    speakerId: string;
    text: string;
    emotion?: string;
    duration?: number;
}

interface Speaker {
    id: string;
    name: string;
    role: 'expert' | 'student' | 'host' | 'guest';
    voiceProfile?: string;
    personality?: string;
}

interface PodcastScript {
    title: string;
    topic: string;
    estimatedDuration: number;
    speakers: Speaker[];
    turns?: PodcastTurn[];
    segments?: { speaker: string; text: string; emotion?: string }[];
}

interface GeneratedEpisode {
    episodeId: string;
    title: string;
    audioPath: string;
    turnAudioPaths: string[];
    duration: number;
    speakers: string[];
    success: boolean;
    error?: string;
}

// ─── Voice Profile Mapping ────────────────────────────

const VOICE_PROFILES: Record<string, string> = {
    'Professor Spark': 'Kore',    // Warm, authoritative
    'Ace': 'Puck',                // Enthusiastic, youthful
    'Narrator': 'Charon',         // Deep, storytelling
    'Dr. Ada': 'Aoede',           // Calm, scientific
    'Coach Max': 'Fenrir',        // Energetic, motivating
    'R2D2': 'Puck',               // Energetic robot
};

// ─── Pipeline Classes ─────────────────────────────────

class PodcastAudioPipeline {
    private config: { outputDir: string };

    constructor(config: { outputDir: string }) {
        this.config = config;
        fs.mkdirSync(this.config.outputDir, { recursive: true });
    }

    async generateEpisode(
        script: PodcastScript,
        courseId: string,
        moduleId: string,
        generateSpeech: (text: string, speakers?: { speaker: string; voiceName: string }[]) => Promise<{ data: Buffer; mimeType: string } | null>
    ): Promise<GeneratedEpisode> {
        const episodeDir = path.join(this.config.outputDir, courseId, moduleId);
        fs.mkdirSync(episodeDir, { recursive: true });

        const episodeId = `ep-${courseId}-${moduleId}`;

        try {
            // Strategy 1: Try multi-speaker mode (entire script as one request)
            const fullText = this.buildMultiSpeakerScript(script);
            const speakerConfigs = script.speakers.map(s => ({
                speaker: s.name,
                voiceName: s.voiceProfile || VOICE_PROFILES[s.name] || 'Kore',
            }));

            const fullAudio = await generateSpeech(fullText, speakerConfigs);

            if (fullAudio) {
                const ext = fullAudio.mimeType.includes('wav') ? '.wav' : '.mp3';
                const audioPath = path.join(episodeDir, `episode${ext}`);
                fs.writeFileSync(audioPath, fullAudio.data);

                return {
                    episodeId,
                    title: script.title,
                    audioPath,
                    turnAudioPaths: [audioPath],
                    duration: script.estimatedDuration,
                    speakers: script.speakers.map(s => s.name),
                    success: true,
                };
            }

            return {
                episodeId,
                title: script.title,
                audioPath: '',
                turnAudioPaths: [],
                duration: 0,
                speakers: [],
                success: false,
                error: 'Generation returned null'
            };
        } catch (err: unknown) {
            return {
                episodeId,
                title: script.title,
                audioPath: '',
                turnAudioPaths: [],
                duration: 0,
                speakers: [],
                success: false,
                error: err instanceof Error ? err.message : String(err),
            };
        }
    }

    private buildMultiSpeakerScript(script: PodcastScript): string {
        // Handle both 'turns' and 'segments'
        const turns = script.turns || script.segments?.map(s => ({ speakerId: s.speaker, text: s.text })) || [];

        return turns.map(turn => {
            // If speakerId matches a speaker definition, use its name. Otherwise assume it IS the name.
            const speakerDef = script.speakers.find(s => s.id === turn.speakerId || s.name === turn.speakerId);
            const speakerName = speakerDef?.name || turn.speakerId || 'Narrator';
            return `${speakerName}: ${turn.text}`;
        }).join('\n\n');
    }
}

class DroidVoiceGenerator {
    private outputDir: string;

    constructor(outputDir: string) {
        this.outputDir = outputDir;
        fs.mkdirSync(this.outputDir, { recursive: true });
    }

    async generateVoiceLines(
        generateSpeech: (text: string, speakers?: { speaker: string; voiceName: string }[]) => Promise<{ data: Buffer; mimeType: string } | null>
    ): Promise<Record<string, string>> {
        const lines: Record<string, string> = {
            'greeting_morning': "Good morning, Guardian! Ready for another day of discovery? Let's make it count!",
            'greeting_afternoon': "Welcome back! The afternoon is the perfect time for a deep dive. What shall we explore?",
            'greeting_evening': "Evening session! Your dedication is impressive. Let's keep the momentum going, but remember to rest too!",
            'streak_reminder': "Hey! Your learning streak is at risk. Just five minutes of review will keep it alive!",
            'quiz_encourage': "Don't worry about that score. Every mistake is a step closer to mastery. Shall we review together?",
            'level_up': "Incredible! You've leveled up! Your knowledge is growing stronger every day!",
            'feynman_prompt': "You've been studying hard. The best way to really understand something is to teach it. Want to explain it to me?",
            'inactivity_nudge': "I've missed you! It's been a while since our last session. Ready to jump back in?",
            'boss_battle_prep': "A Boss Battle approaches! Let me help you prepare. Review your notes and I'll quiz you on the key concepts.",
            'celebration': "You did it! Another chapter conquered! Take a moment to celebrate — you've earned it!",
            'goodnight': "Great session today! Your brain needs rest now to consolidate everything you learned. See you tomorrow, Guardian!",
        };

        const results: Record<string, string> = {};
        const voiceName = 'Puck';

        for (const [key, text] of Object.entries(lines)) {
            const outputPath = path.join(this.outputDir, `${key}.wav`);
            if (fs.existsSync(outputPath)) {
                console.log(`  ⏭️  ${key}: already exists`);
                results[key] = outputPath;
                continue;
            }

            try {
                const audio = await generateSpeech(text, [{ speaker: 'R2D2', voiceName }]);
                if (audio) {
                    fs.writeFileSync(outputPath, audio.data);
                    results[key] = outputPath;
                    console.log(`  ✅ Saved ${key}.wav`);
                }
            } catch {
                console.warn(`Failed to generate voice line: ${key}`);
            }
            await new Promise(r => setTimeout(r, 1000));
        }

        return results;
    }
}

// ─── Onboarding Voice Lines ───────────────────────────

const ONBOARDING_LINES: Record<string, string> = {
    'welcome': "Welcome to The AI School! I'm your AI Tutor. I'm here to help you learn anything you want, in any way that works best for you.",
    'question_1': "First, tell me a bit about yourself. what are your favorite hobbies or interests?",
    'question_2': "That's awesome! Now, how do you like to learn? Do you prefer listening to stories, solving puzzles, or building things?",
    'question_3': "Got it. One last question: what's a big goal you have for this year?",
    'avatar_creation': "Great! Now let's design your Avatar. This is how you'll appear in the virtual world.",
    'covenant': "This is our Learning Covenant. It's a promise between us to do our best. Take a look and sign when you're ready.",
    'ready': "Everything is set! Your custom learning journey is ready. Let's precise explore!",
};

// ─── Main ─────────────────────────────────────────────

async function generateAudioAssets() {
    console.log('🎧 Audio Asset Generator — Gemini TTS');
    console.log('='.repeat(60));

    const gemini = new GeminiClient({
        apiKey: process.env.GEMINI_API_KEY!,
        ttsModel: process.env.GEMINI_TTS_MODEL || 'gemini-2.5-flash-preview-tts',
    });

    // 1. Generate R2D2 Voice Lines
    console.log('\n🤖 Generating R2D2 Voice Lines...');
    const droidGen = new DroidVoiceGenerator(path.join(OUTPUT_ROOT, 'voice/r2d2'));
    await droidGen.generateVoiceLines(async (text, speakers) => {
        try {
            const tempPath = path.join(OUTPUT_ROOT, 'temp_droid.wav');
            const resultPath = await gemini.generateTTS({
                text,
                voiceName: speakers?.[0]?.voiceName || 'Puck',
                outputPath: tempPath
            });
            return {
                data: fs.readFileSync(resultPath),
                mimeType: 'audio/wav'
            };
        } catch (e) {
            console.error(`Error generating droid line: ${e}`);
            return null;
        }
    });

    // 2. Generate Onboarding Voice Lines
    console.log('\n👋 Generating Onboarding Voice Lines...');
    const onboardingDir = path.join(OUTPUT_ROOT, 'voice/onboarding');
    fs.mkdirSync(onboardingDir, { recursive: true });

    for (const [key, text] of Object.entries(ONBOARDING_LINES)) {
        const outputPath = path.join(onboardingDir, `${key}.wav`);
        if (fs.existsSync(outputPath)) {
            console.log(`  ⏭️  ${key}: already exists`);
            continue;
        }

        try {
            console.log(`  🎙️  Generating ${key}...`);
            await gemini.generateTTS({
                text,
                voiceName: 'Kore', // Warm, welcoming voice
                outputPath
            });
            console.log(`  ✅ Saved ${key}.wav`);
        } catch (err: any) {
            console.error(`  ❌ Failed ${key}: ${err.message}`);
        }
        await new Promise(r => setTimeout(r, 1000));
    }

    // 3. Generate Podcasts (Multi-Speaker)
    console.log('\n🎙️  Generating Podcasts...');
    const podcastPipeline = new PodcastAudioPipeline({
        outputDir: path.join(OUTPUT_ROOT, 'podcasts')
    });

    for (const courseFile of COURSES) {
        const coursePath = path.join(SCDS_DIR, courseFile);
        if (!fs.existsSync(coursePath)) continue;

        const course = JSON.parse(fs.readFileSync(coursePath, 'utf-8'));

        for (const mod of course.modules) {
            if (!mod.podcastScript) continue;

            // Skip if already generated
            const episodePath = path.join(OUTPUT_ROOT, 'podcasts', course.id || course.subject, mod.id, 'episode.wav');
            if (fs.existsSync(episodePath)) {
                console.log(`  ⏭️  ${mod.id}: podcast already exists`);
                continue;
            }

            console.log(`  📻 ${mod.id}: ${mod.podcastScript.title}`);
            const result = await podcastPipeline.generateEpisode(
                mod.podcastScript,
                course.id || course.subject,
                mod.id,
                async (text, speakers) => {
                    try {
                        const tempPath = path.join(OUTPUT_ROOT, 'temp_podcast.wav');
                        const resultPath = await gemini.generateTTS({
                            text,
                            speakers: speakers?.map(s => ({ name: s.speaker, voiceName: s.voiceName })),
                            outputPath: tempPath
                        });
                        return {
                            data: fs.readFileSync(resultPath),
                            mimeType: 'audio/wav'
                        };
                    } catch (e) {
                        console.error(`Error generating podcast segment: ${e}`);
                        return null;
                    }
                }
            );

            if (result.success) {
                console.log(`    ✅ Generated episode (${(result.duration / 60).toFixed(1)} min)`);
            } else {
                console.error(`    ❌ Failed: ${result.error}`);
            }

            // Rate limit
            await new Promise(r => setTimeout(r, 2000));
        }
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log('🎉 Audio generation complete!');
}

generateAudioAssets().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
