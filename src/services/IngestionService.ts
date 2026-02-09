import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { ChapterExtract, CourseMetadata, IngestionResult } from './scds/types';

export interface IngestionConfig {
    markerVenvPath: string;
    outputDir: string;
}

/**
 * Wrapper around Marker PDF converter for Node.js
 */
export class IngestionService {
    private markerBin: string;
    private outputDir: string;

    constructor(config: IngestionConfig) {
        this.markerBin = path.join(config.markerVenvPath, 'bin', 'marker_single');
        this.outputDir = config.outputDir;

        if (!fs.existsSync(this.markerBin)) {
            throw new Error(`Marker binary not found at ${this.markerBin}. Ensure the venv is set up.`);
        }
    }

    /**
     * Convert a PDF to structured markdown using Marker
     */
    convertPdf(pdfPath: string, pageRange?: string): string {
        const pdfName = path.basename(pdfPath, path.extname(pdfPath));
        const outDir = path.join(this.outputDir, pdfName);

        if (!fs.existsSync(outDir)) {
            fs.mkdirSync(outDir, { recursive: true });
        }

        const args = [
            this.markerBin,
            pdfPath,
            '--output_format', 'markdown',
            '--output_dir', outDir,
        ];

        if (pageRange) {
            args.push('--page_range', pageRange);
        }

        console.log(`📄 Converting PDF: ${pdfName}${pageRange ? ` (pages ${pageRange})` : ''}`);
        const startTime = Date.now();

        execSync(args.join(' '), {
            env: {
                ...process.env,
                PATH: `${path.join(path.dirname(this.markerBin))}:${process.env.PATH}`,
                VIRTUAL_ENV: path.dirname(path.dirname(this.markerBin)),
            },
            stdio: 'pipe',
            timeout: 600000, // 10 minute timeout
        });

        const elapsedSeconds = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(`  ✅ PDF converted in ${elapsedSeconds}s`);

        // Find the generated markdown file
        const mdFiles = fs.readdirSync(outDir).filter(f => f.endsWith('.md'));
        if (mdFiles.length === 0) {
            throw new Error(`No markdown output found in ${outDir}`);
        }

        return path.join(outDir, mdFiles[0]);
    }

    /**
     * Split a markdown file into chapters based on headings
     */
    splitChapters(markdownPath: string): ChapterExtract[] {
        const content = fs.readFileSync(markdownPath, 'utf-8');
        const lines = content.split('\n');

        const chapters: ChapterExtract[] = [];
        let currentChapter: Partial<ChapterExtract> | null = null;
        let currentContent: string[] = [];
        let chapterNum = 0;

        for (const line of lines) {
            // Match top-level chapter headings (# Chapter X: Title or ## Chapter X)
            const chapterMatch = line.match(/^#{1,2}\s+(?:Chapter\s+)?(\d+)[\s.:]+(.+)/i);

            if (chapterMatch) {
                // Save previous chapter
                if (currentChapter && currentContent.length > 0) {
                    currentChapter.markdown = currentContent.join('\n');
                    chapters.push(currentChapter as ChapterExtract);
                }

                chapterNum = parseInt(chapterMatch[1], 10);
                currentChapter = {
                    chapterNumber: chapterNum,
                    title: chapterMatch[2].replace(/\*\*/g, '').trim(),
                    images: [],
                    pageRange: [0, 0],
                };
                currentContent = [line];
            } else if (currentChapter) {
                currentContent.push(line);

                // Track images
                const imgMatch = line.match(/!\[.*?\]\((.+?)\)/);
                if (imgMatch && currentChapter.images) {
                    currentChapter.images.push(imgMatch[1]);
                }
            }
        }

        // Save last chapter
        if (currentChapter && currentContent.length > 0) {
            currentChapter.markdown = currentContent.join('\n');
            chapters.push(currentChapter as ChapterExtract);
        }

        console.log(`  📚 Split into ${chapters.length} chapters`);
        return chapters;
    }

    /**
     * Extract metadata from the markdown content
     */
    extractMetadata(markdownPath: string, sourcePdfPath: string): CourseMetadata {
        const content = fs.readFileSync(markdownPath, 'utf-8');
        const authorMatch = content.match(/(?:AUTHORS?|authors?)\s*[:\n](.+)/i);
        const licenseMatch = content.match(/(?:licensed under|license)\s+(.+?)(?:\.|$)/im);

        return {
            authors: authorMatch ? [authorMatch[1].trim()] : ['OpenStax'],
            license: licenseMatch ? licenseMatch[1].trim() : 'CC-BY 4.0',
            sourceUrl: 'https://openstax.org',
            totalPages: 0, // Will be filled from Marker metadata
            chaptersExtracted: 0, // Will be updated after splitting
        };
    }

    /**
     * Full ingestion pipeline: PDF → Markdown → Chapters → Metadata
     */
    async ingest(pdfPath: string, courseName: string, pageRange?: string): Promise<IngestionResult> {
        console.log(`\n🚀 Starting ingestion for: ${courseName}`);

        // Step 1: Convert PDF to Markdown
        const markdownPath = this.convertPdf(pdfPath, pageRange);

        // Step 2: Split into chapters
        const chapters = this.splitChapters(markdownPath);

        // Step 3: Extract metadata
        const metadata = this.extractMetadata(markdownPath, pdfPath);
        metadata.chaptersExtracted = chapters.length;

        console.log(`\n📊 Ingestion complete for ${courseName}:`);
        console.log(`  📄 Markdown: ${markdownPath}`);
        console.log(`  📚 Chapters: ${chapters.length}`);

        return {
            courseName,
            chapters,
            metadata,
            rawMarkdownPath: markdownPath,
        };
    }
}

/**
 * Create IngestionService from environment variables
 */
export function createIngestionServiceFromEnv(): IngestionService {
    const venvPath = process.env.MARKER_VENV_PATH || '/Users/user/TheAISchoolOS/.venv-marker';
    const outputDir = process.env.MARKER_OUTPUT_DIR || '/Users/user/TheAISchoolOS/ais-specs/data_for_demo/marker_output';

    return new IngestionService({
        markerVenvPath: venvPath,
        outputDir,
    });
}
