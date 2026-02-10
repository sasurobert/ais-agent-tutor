import * as fs from 'node:fs';
import * as path from 'node:path';
import { ChapterExtract, CourseMetadata, IngestionResult } from './scds/types.js';

// ─── Configuration ────────────────────────────────────

export interface IngestionConfig {
    outputDir: string;
}

/** Section definition for OpenStax scraping */
interface SectionSpec {
    slug: string;   // e.g. "4-1-visualize-fractions"
    title: string;  // Human-readable section title
}

/** Chapter definition with its sections */
export interface ChapterSpec {
    chapterNumber: number;
    title: string;
    sections: SectionSpec[];
}

/** OpenStax book definition */
export interface OpenStaxBookSpec {
    slug: string;       // e.g. "prealgebra-2e"
    title: string;
    baseUrl: string;    // e.g. "https://openstax.org/books/prealgebra-2e/pages"
    chapters: ChapterSpec[];
}

// ─── Known OpenStax Books ─────────────────────────────

export const OPENSTAX_BOOKS: Record<string, OpenStaxBookSpec> = {
    'prealgebra-2e': {
        slug: 'prealgebra-2e',
        title: 'Prealgebra 2e',
        baseUrl: 'https://openstax.org/books/prealgebra-2e/pages',
        chapters: [
            {
                chapterNumber: 4,
                title: 'Fractions',
                sections: [
                    { slug: '4-1-visualize-fractions', title: 'Visualize Fractions' },
                    { slug: '4-2-multiply-and-divide-fractions', title: 'Multiply and Divide Fractions' },
                    { slug: '4-3-multiply-and-divide-mixed-numbers-and-complex-fractions', title: 'Multiply and Divide Mixed Numbers and Complex Fractions' },
                    { slug: '4-4-add-and-subtract-fractions-with-common-denominators', title: 'Add and Subtract Fractions with Common Denominators' },
                    { slug: '4-5-add-and-subtract-fractions-with-different-denominators', title: 'Add and Subtract Fractions with Different Denominators' },
                    { slug: '4-6-add-and-subtract-mixed-numbers', title: 'Add and Subtract Mixed Numbers' },
                    { slug: '4-7-solve-equations-with-fractions', title: 'Solve Equations with Fractions' },
                ],
            },
            {
                chapterNumber: 5,
                title: 'Decimals',
                sections: [
                    { slug: '5-1-decimals', title: 'Decimals' },
                    { slug: '5-2-decimal-operations', title: 'Decimal Operations' },
                    { slug: '5-3-decimals-and-fractions', title: 'Decimals and Fractions' },
                    { slug: '5-4-solve-equations-with-decimals', title: 'Solve Equations with Decimals' },
                    { slug: '5-5-averages-and-probability', title: 'Averages and Probability' },
                    { slug: '5-6-ratios-and-rate', title: 'Ratios and Rate' },
                    { slug: '5-7-simplify-and-use-square-roots', title: 'Simplify and Use Square Roots' },
                ],
            },
            {
                chapterNumber: 9,
                title: 'Math Models and Geometry',
                sections: [
                    { slug: '9-1-use-a-problem-solving-strategy', title: 'Use a Problem Solving Strategy' },
                    { slug: '9-2-solve-money-applications', title: 'Solve Money Applications' },
                    { slug: '9-3-use-properties-of-angles-triangles-and-the-pythagorean-theorem', title: 'Use Properties of Angles, Triangles, and the Pythagorean Theorem' },
                    { slug: '9-4-use-properties-of-rectangles-triangles-and-trapezoids', title: 'Use Properties of Rectangles, Triangles, and Trapezoids' },
                    { slug: '9-5-solve-geometry-applications-circles-and-irregular-figures', title: 'Solve Geometry Applications: Circles and Irregular Figures' },
                    { slug: '9-6-solve-geometry-applications-volume-and-surface-area', title: 'Solve Geometry Applications: Volume and Surface Area' },
                    { slug: '9-7-solve-a-formula-for-a-specific-variable', title: 'Solve a Formula for a Specific Variable' },
                ],
            },
        ],
    },
    'biology-2e': {
        slug: 'biology-2e',
        title: 'Biology 2e',
        baseUrl: 'https://openstax.org/books/biology-2e/pages',
        chapters: [
            {
                chapterNumber: 4,
                title: 'Cell Structure',
                sections: [
                    { slug: '4-1-studying-cells', title: 'Studying Cells' },
                    { slug: '4-2-prokaryotic-cells', title: 'Prokaryotic Cells' },
                    { slug: '4-3-eukaryotic-cells', title: 'Eukaryotic Cells' },
                    { slug: '4-4-the-endomembrane-system-and-proteins', title: 'The Endomembrane System and Proteins' },
                    { slug: '4-5-the-cytoskeleton', title: 'The Cytoskeleton' },
                    { slug: '4-6-connections-between-cells-and-cellular-activities', title: 'Connections Between Cells and Cellular Activities' },
                ],
            },
            {
                chapterNumber: 8,
                title: 'Photosynthesis',
                sections: [
                    { slug: '8-1-overview-of-photosynthesis', title: 'Overview of Photosynthesis' },
                    { slug: '8-2-the-light-dependent-reactions-of-photosynthesis', title: 'The Light-Dependent Reactions of Photosynthesis' },
                    { slug: '8-3-using-light-energy-to-make-organic-molecules', title: 'Using Light Energy to Make Organic Molecules' },
                ],
            },
            {
                chapterNumber: 23,
                title: 'Protists',
                sections: [
                    { slug: '23-1-eukaryotic-origins', title: 'Eukaryotic Origins' },
                    { slug: '23-2-characteristics-of-protists', title: 'Characteristics of Protists' },
                    { slug: '23-3-groups-of-protists', title: 'Groups of Protists' },
                    { slug: '23-4-ecology-of-protists', title: 'Ecology of Protists' },
                ],
            },
        ],
    },
    'us-history': {
        slug: 'us-history',
        title: 'U.S. History',
        baseUrl: 'https://openstax.org/books/us-history/pages',
        chapters: [
            {
                chapterNumber: 7,
                title: 'Creating Republican Governments, 1776-1790',
                sections: [
                    { slug: '7-1-common-sense-from-monarchy-to-an-american-republic', title: 'Common Sense: From Monarchy to an American Republic' },
                    { slug: '7-2-how-much-revolutionary-change', title: 'How Much Revolutionary Change?' },
                    { slug: '7-3-debating-democracy', title: 'Debating Democracy' },
                    { slug: '7-4-the-constitutional-convention-and-federal-constitution', title: 'The Constitutional Convention and Federal Constitution' },
                ],
            },
            {
                chapterNumber: 9,
                title: 'Industrial Transformation in the North, 1800-1850',
                sections: [
                    { slug: '9-1-early-industrialization-in-the-northeast', title: 'Early Industrialization in the Northeast' },
                    { slug: '9-2-a-vibrant-capitalist-republic', title: 'A Vibrant Capitalist Republic' },
                    { slug: '9-3-on-the-move-the-transportation-revolution', title: 'On the Move: The Transportation Revolution' },
                    { slug: '9-4-a-new-social-order-class-divisions', title: 'A New Social Order: Class Divisions' },
                ],
            },
            {
                chapterNumber: 15,
                title: 'The Civil War, 1860-1865',
                sections: [
                    { slug: '15-1-the-origins-and-outbreak-of-the-civil-war', title: 'The Origins and Outbreak of the Civil War' },
                    { slug: '15-2-early-mobilization-and-war', title: 'Early Mobilization and War' },
                    { slug: '15-3-1863-the-changing-nature-of-the-war', title: '1863: The Changing Nature of the War' },
                    { slug: '15-4-the-union-triumphant', title: 'The Union Triumphant' },
                ],
            },
        ],
    },
};

// ─── HTML Cleaning ────────────────────────────────────

function stripHtml(html: string): string {
    // Remove <script>, <style>, <noscript> blocks
    let clean = html.replace(/<(script|style|noscript)[^>]*>[\s\S]*?<\/\1>/gi, '');
    // Remove <nav>, <header>, <footer> blocks
    clean = clean.replace(/<(nav|header|footer)[^>]*>[\s\S]*?<\/\1>/gi, '');
    // Remove image tags (they'd be broken links)
    clean = clean.replace(/<img[^>]*>/gi, '');
    // Remove HTML tags, keep content
    clean = clean.replace(/<[^>]+>/g, '');
    // Decode HTML entities
    clean = clean.replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&nbsp;/g, ' ');
    // Remove "Access for free at..." boilerplate
    clean = clean.replace(/Access for free at https?:\/\/openstax\.org\/[^\n]*/g, '');
    // Collapse multiple blank lines
    clean = clean.replace(/\n{3,}/g, '\n\n');
    return clean.trim();
}

// ─── IngestionService ─────────────────────────────────

/**
 * Ingestion service that scrapes OpenStax chapters via HTTP.
 * Replaces the old Marker PDF pipeline with fast web scraping.
 *
 * For a teacher workflow: they provide an OpenStax book URL,
 * we identify the book slug, look up chapters, and scrape sections.
 */
export class IngestionService {
    private outputDir: string;

    constructor(config: IngestionConfig) {
        this.outputDir = config.outputDir;
        if (!fs.existsSync(this.outputDir)) {
            fs.mkdirSync(this.outputDir, { recursive: true });
        }
    }

    /**
     * Resolve an OpenStax book from a URL or slug.
     * Accepts:
     *   - Full URL: "https://openstax.org/books/prealgebra-2e/pages/..."
     *   - Book slug: "prealgebra-2e"
     *   - Friendly name: "Prealgebra 2e" or "biology-2e"
     */
    resolveBook(input: string): OpenStaxBookSpec | null {
        // Try exact slug match
        if (OPENSTAX_BOOKS[input]) return OPENSTAX_BOOKS[input];

        // Try extracting slug from URL
        const urlMatch = input.match(/openstax\.org\/books\/([^/]+)/);
        if (urlMatch && OPENSTAX_BOOKS[urlMatch[1]]) {
            return OPENSTAX_BOOKS[urlMatch[1]];
        }

        // Try fuzzy match on title
        const lower = input.toLowerCase().replace(/[\s_]+/g, '-');
        for (const [slug, book] of Object.entries(OPENSTAX_BOOKS)) {
            if (slug.includes(lower) || book.title.toLowerCase().replace(/[\s_]+/g, '-').includes(lower)) {
                return book;
            }
        }

        return null;
    }

    /**
     * Scrape a single OpenStax section page and return clean markdown.
     */
    async scrapeSection(url: string): Promise<string | null> {
        try {
            const response = await fetch(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
                    'Accept': 'text/html',
                },
            });

            if (!response.ok) {
                console.log(`   ⚠️  HTTP ${response.status} for ${url}`);
                return null;
            }

            const html = await response.text();

            // Extract main content area
            const mainContentMatch = html.match(/<div[^>]*id="main-content"[^>]*>([\s\S]*?)<\/div>\s*(?:<div|<footer|<\/body)/i)
                || html.match(/<main[^>]*>([\s\S]*?)<\/main>/i);

            const rawContent = mainContentMatch ? mainContentMatch[1] : html;

            // Convert to clean text (simple HTML → Markdown-ish)
            let content = rawContent;

            // Convert headings
            content = content.replace(/<h1[^>]*>(.*?)<\/h1>/gi, (_, t) => `\n# ${stripHtml(t)}\n`);
            content = content.replace(/<h2[^>]*>(.*?)<\/h2>/gi, (_, t) => `\n## ${stripHtml(t)}\n`);
            content = content.replace(/<h3[^>]*>(.*?)<\/h3>/gi, (_, t) => `\n### ${stripHtml(t)}\n`);
            content = content.replace(/<h4[^>]*>(.*?)<\/h4>/gi, (_, t) => `\n#### ${stripHtml(t)}\n`);

            // Convert lists
            content = content.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_, t) => `- ${stripHtml(t)}\n`);

            // Convert bold/italic
            content = content.replace(/<(strong|b)[^>]*>(.*?)<\/\1>/gi, (_, _tag, t) => `**${t}**`);
            content = content.replace(/<(em|i)[^>]*>(.*?)<\/\1>/gi, (_, _tag, t) => `*${t}*`);

            // Convert paragraphs
            content = content.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, (_, t) => `\n${stripHtml(t)}\n`);

            // Strip remaining HTML
            content = stripHtml(content);

            // Remove license boilerplate
            content = content.replace(/This book may not be used in the training[\s\S]*$/i, '');
            content = content.replace(/Want to cite, share, or modify[\s\S]*$/i, '');
            content = content.replace(/Creative Commons Attribution License[\s\S]{0,500}/i, '');

            // Clean whitespace
            const lines = content.split('\n');
            const cleaned: string[] = [];
            let prevBlank = false;
            for (const line of lines) {
                const stripped = line.trimEnd();
                const isBlank = !stripped;
                if (isBlank && prevBlank) continue;
                cleaned.push(stripped);
                prevBlank = isBlank;
            }

            return cleaned.join('\n').trim();
        } catch (err) {
            console.log(`   ❌ Error scraping ${url}: ${err}`);
            return null;
        }
    }

    /**
     * Scrape an entire chapter (all its sections) and return a ChapterExtract.
     */
    async scrapeChapter(book: OpenStaxBookSpec, chapter: ChapterSpec): Promise<ChapterExtract> {
        console.log(`  📖 Chapter ${chapter.chapterNumber}: ${chapter.title} (${chapter.sections.length} sections)`);

        const sectionMarkdowns: string[] = [];

        for (const section of chapter.sections) {
            const url = `${book.baseUrl}/${section.slug}`;
            console.log(`     📥 ${section.slug}...`);

            const md = await this.scrapeSection(url);
            if (md) {
                sectionMarkdowns.push(`## ${section.title}\n\n${md}`);
                console.log(`     ✅ ${section.slug} (${md.length} chars)`);
            }

            // Rate-limit: be nice to OpenStax servers
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        const combinedMarkdown = `# Chapter ${chapter.chapterNumber}: ${chapter.title}\n\n` +
            sectionMarkdowns.join('\n\n---\n\n');

        // Save to disk
        const chapterDir = path.join(this.outputDir, book.slug);
        if (!fs.existsSync(chapterDir)) {
            fs.mkdirSync(chapterDir, { recursive: true });
        }
        const filePath = path.join(chapterDir, `ch${chapter.chapterNumber.toString().padStart(2, '0')}.md`);
        fs.writeFileSync(filePath, combinedMarkdown, 'utf-8');

        return {
            chapterNumber: chapter.chapterNumber,
            title: chapter.title,
            markdown: combinedMarkdown,
            images: [],
            pageRange: [0, 0],
        };
    }

    /**
     * Ingest from pre-scraped markdown files on disk (from scrape-openstax.py or previous runs).
     * Searches for combined chapter files in the textbooks directory.
     */
    ingestFromDisk(bookSlug: string, chapterNumbers: number[]): ChapterExtract[] {
        const textbooksDir = path.join(path.dirname(path.dirname(this.outputDir)), 'ais-assets', 'textbooks', bookSlug);
        const chapters: ChapterExtract[] = [];

        if (!fs.existsSync(textbooksDir)) {
            console.log(`  ⚠️  No pre-scraped data found at ${textbooksDir}`);
            return [];
        }

        // Walk chapter directories
        const dirs = fs.readdirSync(textbooksDir, { withFileTypes: true })
            .filter(d => d.isDirectory());

        for (const dir of dirs) {
            // Extract chapter number from directory name (e.g., "ch04-fractions" → 4)
            const numMatch = dir.name.match(/^ch(\d+)/);
            if (!numMatch) continue;
            const chNum = parseInt(numMatch[1], 10);

            if (!chapterNumbers.includes(chNum)) continue;

            // Find the combined chapter file
            const chapterDir = path.join(textbooksDir, dir.name);
            const combinedFile = fs.readdirSync(chapterDir).find(f => f.startsWith('_chapter-'));
            if (!combinedFile) continue;

            const markdown = fs.readFileSync(path.join(chapterDir, combinedFile), 'utf-8');
            const titleMatch = markdown.match(/Chapter\s+\d+:\s+(.+)/);

            chapters.push({
                chapterNumber: chNum,
                title: titleMatch ? titleMatch[1].trim() : `Chapter ${chNum}`,
                markdown,
                images: [],
                pageRange: [0, 0],
            });

            console.log(`  ♻️  Loaded from disk: Ch.${chNum} (${markdown.length} chars)`);
        }

        return chapters;
    }

    /**
     * Full ingestion pipeline: OpenStax URL → Scrape → ChapterExtracts
     *
     * First checks for pre-scraped data on disk, then scrapes missing chapters live.
     */
    async ingest(
        bookInput: string,
        courseName: string,
        chapterNumbers?: number[],
    ): Promise<IngestionResult> {
        console.log(`\n🚀 Starting OpenStax ingestion for: ${courseName}`);

        const book = this.resolveBook(bookInput);
        if (!book) {
            throw new Error(`Unknown OpenStax book: "${bookInput}". Known books: ${Object.keys(OPENSTAX_BOOKS).join(', ')}`);
        }

        const targetChapters = chapterNumbers
            ? book.chapters.filter(c => chapterNumbers.includes(c.chapterNumber))
            : book.chapters;

        if (targetChapters.length === 0) {
            throw new Error(`No matching chapters found for ${chapterNumbers} in ${book.title}`);
        }

        // Step 1: Try loading from pre-scraped disk data
        const diskChapters = this.ingestFromDisk(
            book.slug,
            targetChapters.map(c => c.chapterNumber),
        );
        const diskChapterNums = new Set(diskChapters.map(c => c.chapterNumber));

        // Step 2: Scrape any missing chapters live
        const missingChapters = targetChapters.filter(c => !diskChapterNums.has(c.chapterNumber));
        const scrapedChapters: ChapterExtract[] = [];

        if (missingChapters.length > 0) {
            console.log(`\n  🌐 Scraping ${missingChapters.length} chapters from OpenStax...`);
            for (const chapter of missingChapters) {
                const extract = await this.scrapeChapter(book, chapter);
                scrapedChapters.push(extract);
            }
        }

        // Combine and sort
        const allChapters = [...diskChapters, ...scrapedChapters]
            .sort((a, b) => a.chapterNumber - b.chapterNumber);

        const metadata: CourseMetadata = {
            authors: ['OpenStax'],
            license: 'CC-BY 4.0',
            sourceUrl: `https://openstax.org/books/${book.slug}`,
            totalPages: 0,
            chaptersExtracted: allChapters.length,
        };

        console.log(`\n📊 Ingestion complete for ${courseName}:`);
        console.log(`  📚 Chapters: ${allChapters.length} (${diskChapters.length} from disk, ${scrapedChapters.length} scraped live)`);

        return {
            courseName,
            chapters: allChapters,
            metadata,
            rawMarkdownPath: path.join(this.outputDir, book.slug),
        };
    }
}

/**
 * Create IngestionService from environment variables
 */
export function createIngestionServiceFromEnv(): IngestionService {
    const outputDir = process.env.MARKER_OUTPUT_DIR || '/Users/user/TheAISchoolOS/ais-specs/data_for_demo/marker_output';

    return new IngestionService({ outputDir });
}
