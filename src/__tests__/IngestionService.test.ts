import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { IngestionService, OPENSTAX_BOOKS } from '../services/IngestionService.js';

// ── Mock fetch globally ──────────────────────────────────────
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// ── Use fake timers to avoid rate-limiter delays ─────────────
vi.useFakeTimers();

// ── Mock fs for disk operations ──────────────────────────────
vi.mock('node:fs', async () => {
    const actual = await vi.importActual<typeof fs>('node:fs');
    return {
        ...actual,
        existsSync: vi.fn().mockReturnValue(true),
        mkdirSync: vi.fn(),
        writeFileSync: vi.fn(),
        readdirSync: vi.fn().mockReturnValue([]),
        readFileSync: vi.fn().mockReturnValue(''),
    };
});

describe('IngestionService', () => {
    let service: IngestionService;

    beforeEach(() => {
        vi.clearAllMocks();
        (fs.existsSync as any).mockReturnValue(true);
        service = new IngestionService({ outputDir: '/tmp/test-output' });
    });

    // ── resolveBook ──────────────────────────────────────────

    describe('resolveBook', () => {
        it('should resolve by exact slug', () => {
            const book = service.resolveBook('prealgebra-2e');
            expect(book).toBeDefined();
            expect(book!.slug).toBe('prealgebra-2e');
            expect(book!.title).toBe('Prealgebra 2e');
        });

        it('should resolve by full URL', () => {
            const book = service.resolveBook('https://openstax.org/books/biology-2e/pages/4-1-studying-cells');
            expect(book).toBeDefined();
            expect(book!.slug).toBe('biology-2e');
        });

        it('should resolve by fuzzy title match', () => {
            const book = service.resolveBook('us history');
            expect(book).toBeDefined();
            expect(book!.slug).toBe('us-history');
        });

        it('should return null for unknown books', () => {
            expect(service.resolveBook('quantum-physics')).toBeNull();
        });

        it('should return null for empty string', () => {
            expect(service.resolveBook('')).toBeNull();
        });

        it('should resolve partial URL without matching slug', () => {
            const book = service.resolveBook('https://openstax.org/books/prealgebra-2e/pages/intro');
            expect(book).toBeDefined();
            expect(book!.slug).toBe('prealgebra-2e');
        });
    });

    // ── OPENSTAX_BOOKS registry ──────────────────────────────

    describe('OPENSTAX_BOOKS registry', () => {
        it('should contain 3 books', () => {
            expect(Object.keys(OPENSTAX_BOOKS)).toHaveLength(3);
        });

        it('should have prealgebra-2e with 3 chapters', () => {
            const book = OPENSTAX_BOOKS['prealgebra-2e'];
            expect(book.chapters).toHaveLength(3);
            expect(book.chapters.map(c => c.chapterNumber)).toEqual([4, 5, 9]);
        });

        it('should have biology-2e with 3 chapters', () => {
            const book = OPENSTAX_BOOKS['biology-2e'];
            expect(book.chapters).toHaveLength(3);
        });

        it('should have us-history with 3 chapters', () => {
            const book = OPENSTAX_BOOKS['us-history'];
            expect(book.chapters).toHaveLength(3);
        });

        it('every chapter should have at least 3 sections', () => {
            for (const book of Object.values(OPENSTAX_BOOKS)) {
                for (const ch of book.chapters) {
                    expect(ch.sections.length).toBeGreaterThanOrEqual(3);
                }
            }
        });

        it('every section should have slug and title', () => {
            for (const book of Object.values(OPENSTAX_BOOKS)) {
                for (const ch of book.chapters) {
                    for (const sec of ch.sections) {
                        expect(sec.slug).toBeTruthy();
                        expect(sec.title).toBeTruthy();
                    }
                }
            }
        });
    });

    // ── scrapeSection ────────────────────────────────────────

    describe('scrapeSection', () => {
        it('should extract clean text from HTML response', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                text: () => Promise.resolve('<main><h2>Test Section</h2><p>Hello world.</p></main>'),
            });

            const result = await service.scrapeSection('https://openstax.org/books/test/pages/1-1');
            expect(result).toBeDefined();
            expect(result).toContain('Test Section');
            expect(result).toContain('Hello world');
        });

        it('should return null on HTTP error', async () => {
            mockFetch.mockResolvedValueOnce({ ok: false, status: 404 });

            const result = await service.scrapeSection('https://openstax.org/books/test/pages/bad');
            expect(result).toBeNull();
        });

        it('should return null on network error', async () => {
            mockFetch.mockRejectedValueOnce(new Error('Network error'));

            const result = await service.scrapeSection('https://openstax.org/fail');
            expect(result).toBeNull();
        });

        it('should strip script/style tags', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                text: () => Promise.resolve('<main><script>alert("xss")</script><p>Clean content</p><style>.hidden{}</style></main>'),
            });

            const result = await service.scrapeSection('https://example.com');
            expect(result).not.toContain('alert');
            expect(result).not.toContain('.hidden');
            expect(result).toContain('Clean content');
        });

        it('should convert headings to markdown', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                text: () => Promise.resolve('<main><h1>Title</h1><h2>Subtitle</h2><h3>SubSub</h3></main>'),
            });

            const result = await service.scrapeSection('https://example.com');
            expect(result).toContain('# Title');
            expect(result).toContain('## Subtitle');
            expect(result).toContain('### SubSub');
        });

        it('should convert list items', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                text: () => Promise.resolve('<main><ul><li>Item A</li><li>Item B</li></ul></main>'),
            });

            const result = await service.scrapeSection('https://example.com');
            expect(result).toContain('- Item A');
            expect(result).toContain('- Item B');
        });

        it('should remove license boilerplate', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                text: () => Promise.resolve('<main><p>Content</p><p>This book may not be used in the training of AI models.</p></main>'),
            });

            const result = await service.scrapeSection('https://example.com');
            expect(result).toContain('Content');
            expect(result).not.toContain('training of AI');
        });

        it('should decode HTML entities', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                text: () => Promise.resolve('<main><p>A &amp; B &lt; C &gt; D &quot;quoted&quot;</p></main>'),
            });

            const result = await service.scrapeSection('https://example.com');
            expect(result).toContain('A & B');
            expect(result).toContain('"quoted"');
        });
    });

    // ── scrapeChapter ────────────────────────────────────────

    describe('scrapeChapter', () => {
        it('should combine sections into a single chapter markdown', async () => {
            const book = OPENSTAX_BOOKS['biology-2e'];
            const chapter = {
                chapterNumber: 4, title: 'Cell Structure', sections: [
                    { slug: '4-1-studying-cells', title: 'Studying Cells' },
                    { slug: '4-2-prokaryotic-cells', title: 'Prokaryotic Cells' },
                ]
            };

            mockFetch
                .mockResolvedValueOnce({ ok: true, text: () => Promise.resolve('<main><p>Cells intro</p></main>') })
                .mockResolvedValueOnce({ ok: true, text: () => Promise.resolve('<main><p>Prokaryotic content</p></main>') });

            const result = await service.scrapeChapter(book, chapter);
            expect(result.chapterNumber).toBe(4);
            expect(result.title).toBe('Cell Structure');
            expect(result.markdown).toContain('# Chapter 4: Cell Structure');
            expect(result.markdown).toContain('## Studying Cells');
            expect(result.markdown).toContain('## Prokaryotic Cells');
        });

        it('should write chapter file to disk', async () => {
            const book = OPENSTAX_BOOKS['prealgebra-2e'];
            const chapter = {
                chapterNumber: 4, title: 'Fractions', sections: [
                    { slug: '4-1-test', title: 'Test' },
                ]
            };

            mockFetch.mockResolvedValueOnce({ ok: true, text: () => Promise.resolve('<main><p>Test</p></main>') });

            await service.scrapeChapter(book, chapter);
            expect(fs.writeFileSync).toHaveBeenCalled();
        });
    });

    // ── ingestFromDisk ───────────────────────────────────────

    describe('ingestFromDisk', () => {
        it('should return empty array when textbooks dir does not exist', () => {
            (fs.existsSync as any).mockReturnValue(false);

            const result = service.ingestFromDisk('prealgebra-2e', [4]);
            expect(result).toEqual([]);
        });

        it('should load chapter files from disk', () => {
            (fs.existsSync as any).mockReturnValue(true);
            (fs.readdirSync as any).mockImplementation((dir: string, opts?: any) => {
                if (opts?.withFileTypes) {
                    return [{ name: 'ch04-fractions', isDirectory: () => true }];
                }
                return ['_chapter-04-fractions.md'];
            });
            (fs.readFileSync as any).mockReturnValue('Chapter 4: Fractions\n\nContent here');

            const result = service.ingestFromDisk('prealgebra-2e', [4]);
            expect(result).toHaveLength(1);
            expect(result[0].chapterNumber).toBe(4);
        });

        it('should filter by requested chapter numbers', () => {
            (fs.existsSync as any).mockReturnValue(true);
            (fs.readdirSync as any).mockImplementation((dir: string, opts?: any) => {
                if (opts?.withFileTypes) {
                    return [
                        { name: 'ch04-fractions', isDirectory: () => true },
                        { name: 'ch05-decimals', isDirectory: () => true },
                    ];
                }
                return ['_chapter-combined.md'];
            });
            (fs.readFileSync as any).mockReturnValue('Chapter content');

            const result = service.ingestFromDisk('prealgebra-2e', [5]);
            expect(result).toHaveLength(1);
            expect(result[0].chapterNumber).toBe(5);
        });
    });

    // ── ingest (full pipeline) ───────────────────────────────

    describe('ingest', () => {
        it('should throw for unknown book', async () => {
            await expect(service.ingest('unknown-book', 'Test Course'))
                .rejects.toThrow('Unknown OpenStax book');
        });

        it('should throw for non-matching chapters', async () => {
            await expect(service.ingest('prealgebra-2e', 'Test', [999]))
                .rejects.toThrow('No matching chapters');
        });

        it('should combine disk + scraped chapters', async () => {
            // Mock disk: chapter 4 found
            (fs.existsSync as any).mockReturnValue(true);
            (fs.readdirSync as any).mockImplementation((dir: string, opts?: any) => {
                if (opts?.withFileTypes) {
                    return [{ name: 'ch04-fractions', isDirectory: () => true }];
                }
                return ['_chapter-04.md'];
            });
            (fs.readFileSync as any).mockReturnValue('Chapter 4: Fractions\n\nDisk content');

            // Mock scrape: chapter 5
            mockFetch.mockImplementation(() =>
                Promise.resolve({ ok: true, text: () => Promise.resolve('<main><p>Scraped</p></main>') })
            );

            const result = await service.ingest('prealgebra-2e', 'Math', [4, 5]);
            expect(result.chapters).toHaveLength(2);
            expect(result.courseName).toBe('Math');
            expect(result.metadata.authors).toContain('OpenStax');
            expect(result.metadata.license).toBe('CC-BY 4.0');
        });

        it('should return valid metadata', async () => {
            (fs.existsSync as any).mockReturnValue(true);
            (fs.readdirSync as any).mockImplementation((dir: string, opts?: any) => {
                if (opts?.withFileTypes) {
                    return [{ name: 'ch04-fractions', isDirectory: () => true }];
                }
                return ['_chapter-04.md'];
            });
            (fs.readFileSync as any).mockReturnValue('Chapter 4: Fractions\n\nContent');

            const result = await service.ingest('prealgebra-2e', 'Course', [4]);
            expect(result.metadata.sourceUrl).toContain('openstax.org');
            expect(result.metadata.chaptersExtracted).toBe(1);
            expect(result.rawMarkdownPath).toContain('prealgebra-2e');
        });
    });

    // ── Constructor ──────────────────────────────────────────

    describe('constructor', () => {
        it('should create output directory if it does not exist', () => {
            (fs.existsSync as any).mockReturnValue(false);
            new IngestionService({ outputDir: '/tmp/new-dir' });
            expect(fs.mkdirSync).toHaveBeenCalledWith('/tmp/new-dir', { recursive: true });
        });

        it('should not create directory if it exists', () => {
            (fs.existsSync as any).mockReturnValueOnce(true);
            vi.clearAllMocks();
            (fs.existsSync as any).mockReturnValue(true);
            new IngestionService({ outputDir: '/tmp/existing' });
            expect(fs.mkdirSync).not.toHaveBeenCalled();
        });
    });
});
