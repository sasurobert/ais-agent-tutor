# AIS Agent Tutor

## Overview
The **AIS Agent Tutor** is the student-facing AI assistant in the AISchoolOS ecosystem. It provides personalised, Socratic-style tutoring that adapts to each student's learning level, worldview filter, and curriculum context.

## Key Features
- **Socratic Dialogue**: Guides students to answers through questions rather than giving direct answers
- **Worldview Filtering**: Applies configurable Biblical/secular worldview filters to all responses
- **Curriculum Awareness**: Integrates with the Edu Service to align tutoring with the current syllabus
- **Multi-Agent Pipeline**: LangGraph-powered agentic reasoning with tool use and retrieval
- **Safety Layer**: All interactions pass through the Agent Shield for content moderation

## Tech Stack
- Node.js / TypeScript
- LangGraph (Agentic Reasoning)
- LangChain (LLM Orchestration)
- Prisma (Data Persistence)

## Getting Started
```bash
npm install
npx prisma generate
npm run dev
```

## Scripts
| Command | Description |
|---|---|
| `npm run dev` | Start in development mode with hot reload |
| `npm run build` | Build for production |
| `npm test` | Run tests with Vitest |

## License
This project is licensed under the GPL-3.0 License — see the [LICENSE](LICENSE) file for details.
