/**
 * SCDS — Structured Course Data Schema
 * The canonical data format for AI-generated educational content
 */

// ─── Core Types ────────────────────────────────────────

export interface Course {
    id: string;
    title: string;
    subject: 'math' | 'science' | 'history' | 'language_arts' | 'other';
    sourceBook: string;
    gradeRange: [number, number]; // e.g., [6, 8]
    modules: Module[];
    metadata: CourseMetadata;
    createdAt: string;
}

export interface CourseMetadata {
    authors: string[];
    license: string;
    sourceUrl: string;
    totalPages: number;
    chaptersExtracted: number;
}

export interface Module {
    id: string;
    courseId: string;
    chapterNumber: number;
    title: string;
    questTitle: string; // Gamified title e.g., "The Bridge Builder"
    order: number;
    sourceMarkdown: string;
    narrative: NarrativeHook;
    quiz: Quiz;
    podcastScript: PodcastScript;
    comicScript: ComicScript;
    mindMap: MindMap;
    estimatedMinutes: number;
    gradeLevel: number;
}

// ─── Narrative Hook ────────────────────────────────────

export interface NarrativeHook {
    questTitle: string;
    questDescription: string;
    scenario: string; // The story setup
    objective: string; // What the student needs to accomplish
    realWorldConnection: string; // Why this matters
    age8Version: string; // Simplified for young learners
    age14Version: string; // More sophisticated version
}

// ─── Quiz / Boss Battle ────────────────────────────────

export interface Quiz {
    title: string;
    type: 'boss_battle' | 'checkpoint' | 'practice';
    questions: QuizQuestion[];
    passingScore: number; // 0-100
    timeLimit?: number; // seconds
}

export interface QuizQuestion {
    id: string;
    type: 'multiple_choice' | 'open_answer' | 'drag_and_drop' | 'scenario';
    stem: string; // The question text (Socratic, scenario-based)
    scenario?: string; // Optional narrative framing
    options?: string[]; // For multiple choice
    correctAnswer: string;
    rubric?: string; // For AI grading of open answers
    explanation: string; // Why this is the answer
    bloomsLevel: 'remember' | 'understand' | 'apply' | 'analyze' | 'evaluate' | 'create';
    difficulty: 1 | 2 | 3 | 4 | 5;
}

// ─── Podcast Script ────────────────────────────────────

export interface PodcastScript {
    title: string;
    estimatedMinutes: number;
    speakers: PodcastSpeaker[];
    segments: PodcastSegment[];
    summary: string;
}

export interface PodcastSpeaker {
    name: string;
    role: 'host' | 'expert' | 'student' | 'narrator';
    voiceProfile: string; // TTS voice name
    personality: string; // Brief description for TTS prompting
}

export interface PodcastSegment {
    speaker: string;
    text: string;
    emotion?: 'excited' | 'thoughtful' | 'curious' | 'surprised' | 'encouraging';
    pauseAfter?: number; // seconds
}

// ─── Comic Script ──────────────────────────────────────

export interface ComicScript {
    title: string;
    style: 'watercolor' | 'manga' | 'cartoon' | 'realistic';
    panels: ComicPanel[];
    characters: ComicCharacter[];
}

export interface ComicPanel {
    panelNumber: number;
    layout: 'full_page' | 'half_page' | 'third' | 'quarter';
    sceneDescription: string; // Detailed visual description for image gen
    characters: string[]; // Character names present
    dialogue: ComicDialogue[];
    narration?: string;
    interactiveElement?: {
        type: 'quiz_pause' | 'draw_answer' | 'drag_drop';
        prompt: string;
        answer: string;
    };
}

export interface ComicDialogue {
    character: string;
    text: string;
    bubbleType: 'speech' | 'thought' | 'shout' | 'whisper';
}

export interface ComicCharacter {
    name: string;
    appearance: string; // Visual description for consistent image gen
    role: 'protagonist' | 'mentor' | 'sidekick' | 'antagonist';
}

// ─── Mind Map ──────────────────────────────────────────

export interface MindMap {
    title: string;
    centralConcept: string;
    nodes: MindMapNode[];
    edges: MindMapEdge[];
}

export interface MindMapNode {
    id: string;
    label: string;
    description: string;
    level: number; // 0 = central, 1 = primary, 2 = secondary, etc.
    category?: string;
}

export interface MindMapEdge {
    from: string;
    to: string;
    label?: string;
    relationship: 'contains' | 'requires' | 'relates_to' | 'leads_to' | 'example_of';
}

// ─── Ingestion Types ───────────────────────────────────

export interface ChapterExtract {
    chapterNumber: number;
    title: string;
    markdown: string;
    images: string[]; // Paths to extracted images
    pageRange: [number, number];
}

export interface IngestionResult {
    courseName: string;
    chapters: ChapterExtract[];
    metadata: CourseMetadata;
    rawMarkdownPath: string;
}
