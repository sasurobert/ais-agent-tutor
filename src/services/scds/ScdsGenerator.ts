import { GeminiClient } from '../../lib/GeminiClient';
import {
    Module,
    NarrativeHook,
    Quiz,
    PodcastScript,
    ComicScript,
    MindMap,
    ChapterExtract,
} from './types';
import {
    SYSTEM_PROMPTS,
    narrativePrompt,
    quizPrompt,
    podcastPrompt,
    comicPrompt,
    mindMapPrompt,
} from './prompts';

export interface ScdsGeneratorConfig {
    gemini: GeminiClient;
    targetAge?: number;
    numQuizQuestions?: number;
    numComicPanels?: number;
}

export class ScdsGenerator {
    private gemini: GeminiClient;
    private targetAge: number;
    private numQuizQuestions: number;
    private numComicPanels: number;

    constructor(config: ScdsGeneratorConfig) {
        this.gemini = config.gemini;
        this.targetAge = config.targetAge || 12;
        this.numQuizQuestions = config.numQuizQuestions || 6;
        this.numComicPanels = config.numComicPanels || 8;
    }

    /**
     * Generate a narrative hook for a chapter
     */
    async generateNarrative(chapter: ChapterExtract, questTitle: string): Promise<NarrativeHook> {
        const prompt = narrativePrompt(chapter.markdown, questTitle, this.targetAge);

        const result = await this.gemini.generateJSON<NarrativeHook>({
            prompt,
            systemInstruction: SYSTEM_PROMPTS.CONTENT_ALCHEMIST,
            temperature: 0.8,
        });

        return result;
    }

    /**
     * Generate a Socratic quiz / "Boss Battle" for a chapter
     */
    async generateQuiz(chapter: ChapterExtract, questTitle: string): Promise<Quiz> {
        const prompt = quizPrompt(chapter.markdown, questTitle, this.numQuizQuestions);

        const result = await this.gemini.generateJSON<Quiz>({
            prompt,
            systemInstruction: SYSTEM_PROMPTS.QUIZ_MASTER,
            temperature: 0.7,
        });

        return result;
    }

    /**
     * Generate a multi-speaker podcast script
     */
    async generatePodcast(chapter: ChapterExtract, topic: string): Promise<PodcastScript> {
        const prompt = podcastPrompt(chapter.markdown, topic);

        const result = await this.gemini.generateJSON<PodcastScript>({
            prompt,
            systemInstruction: SYSTEM_PROMPTS.PODCAST_DIRECTOR,
            temperature: 0.85,
        });

        return result;
    }

    /**
     * Generate a comic script with panel descriptions
     */
    async generateComic(chapter: ChapterExtract, questTitle: string): Promise<ComicScript> {
        const prompt = comicPrompt(chapter.markdown, questTitle, this.numComicPanels);

        const result = await this.gemini.generateJSON<ComicScript>({
            prompt,
            systemInstruction: SYSTEM_PROMPTS.COMIC_ILLUSTRATOR,
            temperature: 0.8,
        });

        return result;
    }

    /**
     * Generate a mind map of key concepts
     */
    async generateMindMap(chapter: ChapterExtract, topic: string): Promise<MindMap> {
        const prompt = mindMapPrompt(chapter.markdown, topic);

        const result = await this.gemini.generateJSON<MindMap>({
            prompt,
            systemInstruction: SYSTEM_PROMPTS.MIND_MAP_ARCHITECT,
            temperature: 0.6,
        });

        return result;
    }

    /**
     * Generate ALL SCDS content for a single chapter
     */
    async generateAll(chapter: ChapterExtract, questTitle: string): Promise<Omit<Module, 'id' | 'courseId' | 'order' | 'sourceMarkdown'>> {
        console.log(`\n🔮 Generating SCDS for Chapter ${chapter.chapterNumber}: "${chapter.title}" → Quest: "${questTitle}"`);

        // Run generators in parallel for speed
        const [narrative, quiz, podcast, comic, mindMap] = await Promise.all([
            this.generateNarrative(chapter, questTitle).then(r => {
                console.log(`  ✅ Narrative generated`);
                return r;
            }),
            this.generateQuiz(chapter, questTitle).then(r => {
                console.log(`  ✅ Quiz generated (${r.questions?.length || 0} questions)`);
                return r;
            }),
            this.generatePodcast(chapter, chapter.title).then(r => {
                console.log(`  ✅ Podcast script generated (${r.segments?.length || 0} segments)`);
                return r;
            }),
            this.generateComic(chapter, questTitle).then(r => {
                console.log(`  ✅ Comic script generated (${r.panels?.length || 0} panels)`);
                return r;
            }),
            this.generateMindMap(chapter, chapter.title).then(r => {
                console.log(`  ✅ Mind map generated (${r.nodes?.length || 0} nodes)`);
                return r;
            }),
        ]);

        return {
            chapterNumber: chapter.chapterNumber,
            title: chapter.title,
            questTitle,
            narrative,
            quiz,
            podcastScript: podcast,
            comicScript: comic,
            mindMap,
            estimatedMinutes: 30,
            gradeLevel: this.targetAge <= 10 ? 4 : this.targetAge <= 13 ? 7 : 10,
        };
    }
}
