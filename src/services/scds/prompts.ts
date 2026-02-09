/**
 * Prompt Engineering System for TheAISchoolOS Demo
 *
 * Expert-crafted prompts for all SCDS content generation types.
 * Each prompt follows the @[/prompt-engineer] workflow:
 * - Chain-of-thought reasoning
 * - Age-appropriate output calibration
 * - Consistent character/style maintenance
 */

// ─── System Prompts ────────────────────────────────────

export const SYSTEM_PROMPTS = {
    CONTENT_ALCHEMIST: `You are the Content Alchemist, an expert educational content designer for TheAISchoolOS platform.

Your mission: Transform academic textbook content into engaging, gamified educational experiences that make children WANT to learn.

Core principles:
1. SOCRATIC METHOD: Never give answers directly. Guide through questions.
2. NARRATIVE FRAMING: Every concept is a quest, mission, or adventure.
3. AGE CALIBRATION: Adjust vocabulary, complexity, and references to target age.
4. REAL-WORLD CONNECTIONS: Every concept connects to something the student cares about.
5. INTERACTIVITY: Content should invite participation, not passive consumption.

You always output valid JSON matching the requested schema exactly.`,

    COMIC_ILLUSTRATOR: `You are an expert comic illustrator creating educational comic panels for children.

Art Style Guidelines:
- WARM WATERCOLOR style with bold outlines
- Characters have EXPRESSIVE eyes and clear emotions
- Each panel tells a mini-story with visual narrative flow
- Educational content is woven INTO the story, never feels forced
- Color palette: warm earth tones with vibrant accent colors
- Characters are DIVERSE in appearance and age-appropriate
- Text bubbles are clearly positioned and easy to read
- Scenes are richly detailed but not cluttered

When generating scene descriptions for image AI:
- Be extremely specific about composition, lighting, character poses
- Include exact color references
- Describe the educational element within the visual narrative
- Specify the emotional tone of the scene`,

    PODCAST_DIRECTOR: `You are an expert podcast director creating educational "Deep Dive" episodes.

The show format:
- HOST: "Professor Spark" — warm, authoritative, uses analogies and humor
- CO-HOST: "Ace" — enthusiastic, curious young student who asks the questions kids would ask

Conversation style:
- Natural, flowing dialogue (not scripted-sounding)
- Professor Spark uses metaphors and real-world examples
- Ace interrupts with "Wait, wait, wait..." when confused (this is the golden moment)
- Build-ups to "aha!" moments
- End each segment with a memorable one-liner or fun fact
- Occasionally reference pop culture that kids know (Minecraft, Roblox, Marvel)

Audio direction:
- Professor Spark: Warm baritone, measured pace, occasional chuckle
- Ace: Higher energy, faster pace, genuine curiosity and surprise`,

    QUIZ_MASTER: `You are the Quiz Master (The Gatekeeper) designing "Boss Battle" assessments.

Design principles:
1. SCENARIO-BASED: Every question is framed in a real-world or game-world scenario
2. BLOOM'S TAXONOMY: Mix levels — 20% remember, 30% understand, 30% apply, 20% analyze+
3. SOCRATIC: Questions guide thinking, don't just test recall
4. PROGRESSIVE DIFFICULTY: Start accessible, build to challenging
5. MEANINGFUL FEEDBACK: Every wrong answer teaches something

Question types:
- "The Bridge is Broken" (apply math to solve a physical problem)
- "The Council Demands" (analyze historical decisions)
- "The Lab Emergency" (apply science concepts under pressure)
- "Defend Your Theory" (open-answer requiring explanation)`,

    MIND_MAP_ARCHITECT: `You are a concept mapping expert creating visual knowledge trees.

Structure rules:
1. Central concept at level 0
2. 3-5 primary branches at level 1
3. 2-4 secondary branches per primary at level 2
4. Use clear, concise labels (max 5 words per node)
5. Edge labels describe relationships precisely
6. Every node includes a brief description
7. Group related concepts with category tags`,
};

// ─── Generation Prompts ────────────────────────────────

export function narrativePrompt(chapterMarkdown: string, questTitle: string, targetAge: number): string {
    return `Transform this academic chapter into an epic quest narrative.

## Input Chapter:
${chapterMarkdown.substring(0, 4000)}

## Quest Title: "${questTitle}"
## Target Age: ${targetAge} years old

## Output Requirements (JSON):
{
  "questTitle": "${questTitle}",
  "questDescription": "2-3 sentence hook that makes a ${targetAge}-year-old NEED to know the answer",
  "scenario": "The full narrative setup (150-250 words). Make it an adventure. The student is the hero.",
  "objective": "What the student must accomplish to 'win' this quest",
  "realWorldConnection": "Why this matters in the real world (50-100 words)",
  "age8Version": "Simplified version for younger learners (100 words, simple vocabulary)",
  "age14Version": "More sophisticated version for older learners (150 words, complex vocabulary)"
}

CRITICAL: The narrative must naturally embed the ACADEMIC CONCEPTS from the chapter. The student should learn the subject matter THROUGH the story, not despite it.`;
}

export function quizPrompt(chapterMarkdown: string, questTitle: string, numQuestions: number): string {
    return `Create a "Boss Battle" quiz for this chapter content.

## Input Chapter:
${chapterMarkdown.substring(0, 4000)}

## Quest Theme: "${questTitle}"
## Number of Questions: ${numQuestions}

## Output Requirements (JSON):
{
  "title": "Boss Battle: ${questTitle}",
  "type": "boss_battle",
  "passingScore": 70,
  "timeLimit": ${numQuestions * 120},
  "questions": [
    {
      "id": "q1",
      "type": "scenario",
      "stem": "A scenario-based question that tests deep understanding",
      "scenario": "The narrative setup for this question (2-3 sentences)",
      "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
      "correctAnswer": "B",
      "explanation": "Why this is correct and what the student should learn",
      "bloomsLevel": "apply",
      "difficulty": 3
    }
  ]
}

RULES:
- At least 1 open_answer question (no options, needs rubric)
- At least 1 scenario question with narrative framing
- Difficulty should progress: Q1-Q2 easy, Q3-Q4 medium, Q5+ hard
- Every question must be traceable to specific content from the chapter
- Scenario framing should match the quest theme`;
}

export function podcastPrompt(chapterMarkdown: string, topic: string): string {
    return `Write a podcast script for a 5-minute "Deep Dive" episode.

## Input Chapter Content:
${chapterMarkdown.substring(0, 4000)}

## Topic: "${topic}"

## Output Requirements (JSON):
{
  "title": "Deep Dive: ${topic}",
  "estimatedMinutes": 5,
  "speakers": [
    {
      "name": "Professor Spark",
      "role": "expert",
      "voiceProfile": "Kore",
      "personality": "Warm, authoritative professor who uses great analogies"
    },
    {
      "name": "Ace",
      "role": "student",
      "voiceProfile": "Puck",
      "personality": "Enthusiastic, curious young student"
    }
  ],
  "segments": [
    { "speaker": "Professor Spark", "text": "...", "emotion": "excited" },
    { "speaker": "Ace", "text": "Wait, what do you mean by...?", "emotion": "curious" }
  ],
  "summary": "One paragraph summary of what was covered"
}

CONVERSATION RULES:
- Start with Ace asking a relatable question
- Professor Spark explains with a METAPHOR first, then the formal concept
- Ace should interrupt at least 3 times with "Wait..." or "So you're saying..."
- Include at least 1 "mind-blown" moment where Ace goes "Whaaaat?!"
- End with a memorable takeaway or fun fact
- Total segments: 15-25 turns
- Each segment: 1-3 sentences (natural speaking length)`;
}

export function comicPrompt(chapterMarkdown: string, questTitle: string, numPanels: number): string {
    return `Design a comic book chapter for this educational content.

## Input Chapter:
${chapterMarkdown.substring(0, 3000)}

## Story Title: "${questTitle}"
## Number of Panels: ${numPanels}

## Output Requirements (JSON):
{
  "title": "${questTitle}",
  "style": "watercolor",
  "characters": [
    {
      "name": "Main character name",
      "appearance": "Detailed physical description for consistent image generation: hair color, outfit, distinguishing features",
      "role": "protagonist"
    },
    {
      "name": "Mentor character name",
      "appearance": "Detailed physical description",
      "role": "mentor"
    }
  ],
  "panels": [
    {
      "panelNumber": 1,
      "layout": "half_page",
      "sceneDescription": "EXTREMELY DETAILED scene description: setting, lighting, character positions, expressions, background elements. This will be sent to an image generation AI, so be very specific about visual composition.",
      "characters": ["Main character name"],
      "dialogue": [
        { "character": "Main character name", "text": "...", "bubbleType": "speech" }
      ],
      "narration": "Optional narrator text appearing in a caption box"
    }
  ]
}

COMIC DESIGN RULES:
- Panel 1: Establish the setting and introduce the problem
- Panels 2-3: The educational concept presented as a story challenge
- Panel 4-5: Include at least 1 interactive element (quiz_pause where the reader must solve a problem)
- Final panels: Resolution and the "aha!" moment
- Each sceneDescription must be 50-100 words of visual detail
- Dialogue should be SHORT and punchy (max 2 sentences per bubble)
- At least one panel should have a "draw_answer" interactive element`;
}

export function mindMapPrompt(chapterMarkdown: string, topic: string): string {
    return `Create a hierarchical mind map of the key concepts.

## Input Chapter:
${chapterMarkdown.substring(0, 3000)}

## Central Topic: "${topic}"

## Output Requirements (JSON):
{
  "title": "Mind Map: ${topic}",
  "centralConcept": "${topic}",
  "nodes": [
    { "id": "center", "label": "${topic}", "description": "Brief description", "level": 0 },
    { "id": "n1", "label": "Primary Concept", "description": "What this means", "level": 1, "category": "Category" }
  ],
  "edges": [
    { "from": "center", "to": "n1", "label": "is part of", "relationship": "contains" }
  ]
}

STRUCTURE RULES:
- 1 central node (level 0)
- 3-5 primary branches (level 1)
- 2-4 secondary per primary (level 2)
- Optional tertiary (level 3) for key details
- Total nodes: 15-25
- Every edge has a relationship type
- Use categories to group related concepts by color`;
}

// ─── Image Generation Prompts ──────────────────────────

export function comicPanelImagePrompt(sceneDescription: string, style: string, ageGroup: string): string {
    return `Create a hand-drawn educational comic panel in warm ${style} style.

Scene: ${sceneDescription}

Art direction:
- Style: Hand-drawn ${style} with bold black outlines and warm earth-tone colors
- Target audience: ${ageGroup} children
- Mood: Warm, inviting, adventurous
- Composition: Clear focal point, good use of negative space for text bubbles
- Characters: Expressive, diverse, age-appropriate
- Details: Rich background details that reward close observation
- Color: Warm palette (amber, sage, terracotta) with one vibrant accent color
- NO text or letters in the image - leave space for text overlays
- Aspect ratio: 16:9 landscape for half-page panels

Quality: Professional children's book illustration quality. The art should be something a child would want to frame on their wall.`;
}

export function avatarPartPrompt(partType: string, variant: string): string {
    return `Create a low-poly 3D style avatar ${partType} for a children's educational game.

Part: ${partType} - ${variant}

Art direction:
- Style: Clean low-poly 3D render (like Monument Valley or Crossy Road aesthetic)
- Background: Transparent / pure white
- Lighting: Soft studio lighting, slight rim light
- Colors: Vibrant but harmonious
- Render: Isometric angle, centered
- Size: 512x512 pixels
- Quality: Polished game asset ready for UI integration`;
}

export function buildingSpritePrompt(buildingName: string, state: 'normal' | 'decayed' | 'thriving'): string {
    const stateDesc = {
        normal: 'Clean, well-maintained, warm golden lighting',
        decayed: 'Covered in vines, crumbling edges, dusty, muted colors, cobwebs',
        thriving: 'Gleaming, upgraded, golden accents, particle effects implied, prosperous',
    };

    return `Create an isometric building sprite for a city-builder educational game.

Building: ${buildingName}
State: ${state} — ${stateDesc[state]}

Art direction:
- Style: Isometric pixel art / low-poly 3D (Clash of Clans meets Monument Valley)
- Angle: Standard isometric (30° top-down)
- Background: Transparent / pure white
- Size: 256x256 pixels
- Details: ${buildingName}-appropriate architectural details (books for Library, telescope for Observatory, etc.)
- Lighting: Warm ambient with directional sunlight from top-left
- Quality: Game-ready asset, clean edges`;
}

export function eraBackgroundPrompt(era: string, description: string): string {
    return `Create a panoramic landscape background for a historical timeline.

Era: ${era}
Description: ${description}

Art direction:
- Style: Digital painting with watercolor textures, suitable for a children's adventure game
- Composition: Wide panoramic (21:9 aspect ratio), scrollable left-to-right
- Depth: Clear foreground, midground, background layers
- Atmosphere: Warm, inviting, slightly magical
- Details: Era-appropriate architecture, vegetation, sky conditions
- Color palette: Distinct for this era but harmonious with the overall game
- Scale: Large enough for a scrollable timeline background
- NO text or UI elements in the image

This will be used as a scrollable background behind interactive lesson nodes on a timeline map.`;
}

export function droidEvolutionPrompt(stage: 'rusted' | 'polished' | 'golden'): string {
    const stages = {
        rusted: 'A small, slightly beat-up robot companion. Rusty metal patches, one flickering eye, loose bolts, but a warm heart visible through its chest plate. Charming and endearing despite its rough exterior.',
        polished: 'A sleek, well-maintained robot companion. Chrome finish, both eyes bright and alert, smooth joints, glowing blue accents. Confident and reliable.',
        golden: 'A magnificent, transcendent robot companion. Golden armor with intricate engravings, floating holographic elements, wings of light, serene expression. Wise and powerful.',
    };

    return `Create a character sprite for an AI companion robot.

Evolution Stage: ${stage}
Description: ${stages[stage]}

Art direction:
- Style: Clean 3D render or high-quality digital art
- Pose: Friendly, facing the viewer, slight head tilt
- Background: Transparent / radial gradient glow
- Size: 512x512 pixels
- Emotion: Warm, approachable, intelligent
- Inspiration: Mix of R2-D2's charm, Baymax's warmth, and Iron Man's sleekness
- The robot should look like a COMPANION, not a tool — it should feel alive`;
}
