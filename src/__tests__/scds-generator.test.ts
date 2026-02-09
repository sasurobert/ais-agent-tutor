import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ScdsGenerator } from '../services/scds/ScdsGenerator.js';
import { ChapterExtract } from '../services/scds/types.js';
import {
    narrativePrompt,
    quizPrompt,
    podcastPrompt,
    comicPrompt,
    mindMapPrompt,
    SYSTEM_PROMPTS,
} from '../services/scds/prompts.js';

// ─── Mock GeminiClient ────────────────────────────────

const mockGenerateJSON = vi.fn();

vi.mock('../lib/GeminiClient.js', () => ({
    GeminiClient: class MockGeminiClient {
        generateJSON = mockGenerateJSON;
        generateText = vi.fn();
        generateImage = vi.fn();
        generateTTS = vi.fn();
        generateEmbedding = vi.fn();
        constructor(_config: unknown) { }
    },
}));

// Need to import after mock
const { GeminiClient } = await import('../lib/GeminiClient.js');

// ─── Test Data ─────────────────────────────────────────

const sampleChapter: ChapterExtract = {
    chapterNumber: 4,
    title: 'Fractions',
    markdown: `# Chapter 4: Fractions

## 4.1 Introduction to Fractions
A fraction represents a part of a whole. The number above the line is the numerator,
and the number below the line is the denominator.

## 4.2 Equivalent Fractions
Two fractions are equivalent if they represent the same value. For example, 1/2 = 2/4 = 3/6.

## 4.3 Adding Fractions
To add fractions with the same denominator, add the numerators and keep the denominator.`,
    images: [],
    pageRange: [45, 72],
};

// ─── Tests ─────────────────────────────────────────────

describe('ScdsGenerator', () => {
    let generator: ScdsGenerator;

    beforeEach(() => {
        vi.clearAllMocks();
        const gemini = new GeminiClient({ apiKey: 'test-key' });
        generator = new ScdsGenerator({ gemini });
    });

    describe('generateNarrative', () => {
        it('should generate a narrative hook with correct structure', async () => {
            const mockNarrative = {
                questTitle: 'The Bridge Builder',
                questDescription: 'The ancient bridge has crumbled...',
                scenario: 'You stand before the ruins...',
                objective: 'Master fractions to rebuild the bridge',
                realWorldConnection: 'Fractions are used in cooking, construction...',
                age8Version: 'A bridge is broken! You need to fix it...',
                age14Version: 'The structural analysis reveals fractional load distribution...',
            };
            mockGenerateJSON.mockResolvedValue(mockNarrative);

            const result = await generator.generateNarrative(sampleChapter, 'The Bridge Builder');

            expect(result).toEqual(mockNarrative);
            expect(mockGenerateJSON).toHaveBeenCalledWith(
                expect.objectContaining({
                    systemInstruction: SYSTEM_PROMPTS.CONTENT_ALCHEMIST,
                    temperature: 0.8,
                })
            );
        });
    });

    describe('generateQuiz', () => {
        it('should generate a quiz with Boss Battle structure', async () => {
            const mockQuiz = {
                title: 'Boss Battle: The Bridge Builder',
                type: 'boss_battle',
                passingScore: 70,
                timeLimit: 720,
                questions: [
                    {
                        id: 'q1', type: 'scenario', stem: 'The bridge needs...',
                        options: ['A) 1/2', 'B) 1/3', 'C) 2/3', 'D) 3/4'],
                        correctAnswer: 'C', explanation: 'Because...', bloomsLevel: 'apply', difficulty: 3,
                    },
                ],
            };
            mockGenerateJSON.mockResolvedValue(mockQuiz);

            const result = await generator.generateQuiz(sampleChapter, 'The Bridge Builder');

            expect(result.title).toContain('Boss Battle');
            expect(result.questions.length).toBeGreaterThan(0);
        });
    });

    describe('generatePodcast', () => {
        it('should generate a multi-speaker podcast script', async () => {
            const mockPodcast = {
                title: 'Deep Dive: Fractions',
                estimatedMinutes: 5,
                speakers: [
                    { name: 'Professor Spark', role: 'expert', voiceProfile: 'Kore', personality: 'Warm' },
                    { name: 'Ace', role: 'student', voiceProfile: 'Puck', personality: 'Curious' },
                ],
                segments: [
                    { speaker: 'Ace', text: 'So what exactly ARE fractions?' },
                    { speaker: 'Professor Spark', text: 'Think of a pizza, Ace...' },
                ],
                summary: 'Explains fractions using pizza analogies.',
            };
            mockGenerateJSON.mockResolvedValue(mockPodcast);

            const result = await generator.generatePodcast(sampleChapter, 'Fractions');

            expect(result.speakers.length).toBe(2);
            expect(result.segments.length).toBeGreaterThan(0);
        });
    });

    describe('generateComic', () => {
        it('should generate a comic script with panels and characters', async () => {
            const mockComic = {
                title: 'The Bridge Builder',
                style: 'watercolor',
                characters: [{ name: 'Alex', appearance: 'Young adventurer', role: 'protagonist' }],
                panels: [{
                    panelNumber: 1, layout: 'half_page',
                    sceneDescription: 'A crumbling stone bridge...',
                    characters: ['Alex'],
                    dialogue: [{ character: 'Alex', text: 'The bridge is broken!', bubbleType: 'speech' }],
                }],
            };
            mockGenerateJSON.mockResolvedValue(mockComic);

            const result = await generator.generateComic(sampleChapter, 'The Bridge Builder');

            expect(result.style).toBe('watercolor');
            expect(result.panels.length).toBeGreaterThan(0);
            expect(result.characters.length).toBeGreaterThan(0);
        });
    });

    describe('generateMindMap', () => {
        it('should generate a mind map with hierarchical nodes', async () => {
            const mockMindMap = {
                title: 'Mind Map: Fractions',
                centralConcept: 'Fractions',
                nodes: [
                    { id: 'center', label: 'Fractions', description: 'Parts of a whole', level: 0 },
                    { id: 'n1', label: 'Numerator', description: 'Top number', level: 1 },
                    { id: 'n2', label: 'Denominator', description: 'Bottom number', level: 1 },
                ],
                edges: [
                    { from: 'center', to: 'n1', relationship: 'contains' },
                    { from: 'center', to: 'n2', relationship: 'contains' },
                ],
            };
            mockGenerateJSON.mockResolvedValue(mockMindMap);

            const result = await generator.generateMindMap(sampleChapter, 'Fractions');

            expect(result.centralConcept).toBe('Fractions');
            expect(result.nodes.length).toBeGreaterThanOrEqual(3);
        });
    });

    describe('generateAll', () => {
        it('should generate all 5 content types in parallel', async () => {
            mockGenerateJSON
                .mockResolvedValueOnce({ questTitle: 'Test', questDescription: 'Test', scenario: '', objective: '', realWorldConnection: '', age8Version: '', age14Version: '' })
                .mockResolvedValueOnce({ title: 'Boss Battle', type: 'boss_battle', passingScore: 70, questions: [] })
                .mockResolvedValueOnce({ title: 'Deep Dive', estimatedMinutes: 5, speakers: [], segments: [], summary: '' })
                .mockResolvedValueOnce({ title: 'Comic', style: 'watercolor', characters: [], panels: [] })
                .mockResolvedValueOnce({ title: 'Mind Map', centralConcept: 'Test', nodes: [], edges: [] });

            const result = await generator.generateAll(sampleChapter, 'The Bridge Builder');

            expect(result.chapterNumber).toBe(4);
            expect(result.title).toBe('Fractions');
            expect(result.narrative).toBeDefined();
            expect(result.quiz).toBeDefined();
            expect(result.podcastScript).toBeDefined();
            expect(result.comicScript).toBeDefined();
            expect(result.mindMap).toBeDefined();
            expect(mockGenerateJSON).toHaveBeenCalledTimes(5);
        });
    });
});

describe('Prompt Templates', () => {
    it('narrativePrompt includes chapter content and quest title', () => {
        const prompt = narrativePrompt(sampleChapter.markdown, 'The Bridge Builder', 12);
        expect(prompt).toContain('Fractions');
        expect(prompt).toContain('The Bridge Builder');
        expect(prompt).toContain('12');
    });

    it('quizPrompt includes question count', () => {
        const prompt = quizPrompt(sampleChapter.markdown, 'The Bridge Builder', 6);
        expect(prompt).toContain('The Bridge Builder');
        expect(prompt).toContain('6');
    });

    it('podcastPrompt includes multi-speaker format', () => {
        const prompt = podcastPrompt(sampleChapter.markdown, 'Fractions');
        expect(prompt).toContain('Professor Spark');
        expect(prompt).toContain('Ace');
    });

    it('comicPrompt includes panel count', () => {
        const prompt = comicPrompt(sampleChapter.markdown, 'The Bridge Builder', 8);
        expect(prompt).toContain('8');
    });

    it('mindMapPrompt includes central concept', () => {
        const prompt = mindMapPrompt(sampleChapter.markdown, 'Fractions');
        expect(prompt).toContain('Fractions');
        expect(prompt).toContain('level 0');
    });
});

describe('System Prompts', () => {
    it('has all 5 expert system prompts', () => {
        expect(SYSTEM_PROMPTS.CONTENT_ALCHEMIST).toBeDefined();
        expect(SYSTEM_PROMPTS.COMIC_ILLUSTRATOR).toBeDefined();
        expect(SYSTEM_PROMPTS.PODCAST_DIRECTOR).toBeDefined();
        expect(SYSTEM_PROMPTS.QUIZ_MASTER).toBeDefined();
        expect(SYSTEM_PROMPTS.MIND_MAP_ARCHITECT).toBeDefined();
    });

    it('Content Alchemist mentions Socratic method', () => {
        expect(SYSTEM_PROMPTS.CONTENT_ALCHEMIST).toContain('SOCRATIC');
    });
});
