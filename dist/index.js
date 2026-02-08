// src/index.ts
import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";

// src/agents/TutorAgent.ts
import { StateGraph, END, START } from "@langchain/langgraph";
import { HumanMessage } from "@langchain/core/messages";
import { ChatOpenAI } from "@langchain/openai";

// src/services/MemoryService.ts
import { Pinecone } from "@pinecone-database/pinecone";
import { PineconeStore } from "@langchain/pinecone";
import { OpenAIEmbeddings } from "@langchain/openai";
import { Document } from "@langchain/core/documents";
var MemoryService = class {
  vectorStore = null;
  embeddings;
  constructor() {
    this.embeddings = new OpenAIEmbeddings({
      openAIApiKey: process.env.OPENAI_API_KEY
    });
  }
  async getVectorStore() {
    if (this.vectorStore) return this.vectorStore;
    const pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY
    });
    const index = pinecone.Index(process.env.PINECONE_INDEX);
    this.vectorStore = await PineconeStore.fromExistingIndex(this.embeddings, {
      pineconeIndex: index
    });
    return this.vectorStore;
  }
  /**
   * Store a student interaction in the vector memory.
   */
  async storeInteraction(studentDid, content, metadata = {}) {
    const store = await this.getVectorStore();
    await store.addDocuments([
      new Document({
        pageContent: content,
        metadata: {
          ...metadata,
          studentDid,
          type: "interaction",
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        }
      })
    ]);
  }
  /**
   * Retrieve relevant memory context for a student with optional metadata filtering.
   */
  async retrieveContext(studentDid, query, k = 5, filter = {}) {
    const store = await this.getVectorStore();
    const results = await store.similaritySearch(query, k, {
      ...filter,
      studentDid
    });
    return results;
  }
  /**
   * Retrieve faith-aligned pedagogical context with advanced weighting.
   */
  async retrieveWorldviewContext(query, k = 3) {
    const store = await this.getVectorStore();
    const results = await store.similaritySearch(query, k, {
      type: "worldview"
    });
    console.log(`Retrieved ${results.length} worldview documents for query: ${query}`);
    return results;
  }
};

// src/services/ActionService.ts
import { DynamicTool, DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { TavilySearch } from "@langchain/tavily";
var ActionService = class {
  /**
   * Get the set of tools available to the tutor.
   */
  static getTools() {
    const searchTool = new TavilySearch({
      apiKey: process.env.TAVILY_API_KEY,
      maxResults: 3
    });
    const appNavigationTool = new DynamicStructuredTool({
      name: "navigate_to_quest",
      description: "Navigates the student to a specific quest or course page.",
      schema: z.object({
        path: z.string().describe("The URL path to navigate to, e.g. /quests/123"),
        reason: z.string().describe("The pedagogical reason for this navigation")
      }),
      func: async ({ path, reason }) => {
        console.log(`Navigating to ${path}. Reason: ${reason}`);
        return `Successfully triggered navigation to ${path}`;
      }
    });
    const progressCheckTool = new DynamicTool({
      name: "check_student_progress",
      description: "Checks the completion status of current quests for the student.",
      func: async () => {
        return "Student is 60% through 'Ancient Egypt' quest. 2 tasks remaining.";
      }
    });
    return [searchTool, appNavigationTool, progressCheckTool];
  }
};

// src/agents/TutorAgent.ts
import { ToolExecutor } from "@langchain/langgraph/prebuilt";
var TutorAgent = class {
  graph;
  llm;
  memory;
  toolExecutor;
  constructor() {
    this.llm = new ChatOpenAI({ modelName: "gpt-4o", streaming: true });
    this.memory = new MemoryService();
    this.toolExecutor = new ToolExecutor({ tools: ActionService.getTools() });
    const workflow = new StateGraph({
      channels: {
        messages: {
          reducer: (x, y) => x.concat(y),
          default: () => []
        },
        studentDid: {
          reducer: (x, y) => y ?? x,
          default: () => ""
        },
        mode: {
          reducer: (x, y) => y ?? x,
          default: () => "ASSISTANT"
        },
        context: {
          reducer: (x, y) => ({ ...x, ...y }),
          default: () => ({})
        }
      }
    });
    workflow.addNode("contextCollation", this.contextCollation.bind(this));
    workflow.addNode("agent", this.callModel.bind(this));
    workflow.addNode("action", this.callTool.bind(this));
    workflow.addEdge(START, "contextCollation");
    workflow.addEdge("contextCollation", "agent");
    workflow.addConditionalEdges(
      "agent",
      this.shouldContinue.bind(this),
      {
        "continue": "action",
        "end": END
      }
    );
    workflow.addEdge("action", "agent");
    this.graph = workflow.compile();
  }
  async contextCollation(state) {
    const lastMessage = state.messages[state.messages.length - 1];
    const content = typeof lastMessage.content === "string" ? lastMessage.content : "";
    const memoryContext = await this.memory.retrieveContext(state.studentDid, content, 5);
    const worldviewContext = await this.memory.retrieveWorldviewContext(content, 3);
    return {
      context: {
        memory: memoryContext.map((d) => d.pageContent).join("\n"),
        worldview: worldviewContext.map((d) => d.pageContent).join("\n")
      }
    };
  }
  async callModel(state) {
    const systemPrompt = `You are the PersonalAITutor, a proactive and Socratic companion for a student.
CURRENT MODE: ${state.mode}
If in TEACHER mode, you must be more firm and prioritize foundational concepts over hints.

PHILOSOPHY:
- Never give the answer directly.
- Use analogies (especially from the provided Worldview context).
- Suggest, don't force.

WORLDVIEW CONTEXT:
${state.context.worldview}

STUDENT MEMORY:
${state.context.memory}

You have tools to search the internet and navigate the app. Use them if needed to help the student decide.`;
    const response = await this.llm.bindTools(ActionService.getTools()).invoke([
      new HumanMessage(systemPrompt),
      ...state.messages
    ]);
    return { messages: [response] };
  }
  shouldContinue(state) {
    const lastMessage = state.messages[state.messages.length - 1];
    if (lastMessage.tool_calls && lastMessage.tool_calls.length > 0) {
      return "continue";
    }
    return "end";
  }
  async callTool(state) {
    const lastMessage = state.messages[state.messages.length - 1];
    const toolCalls = lastMessage.tool_calls || [];
    const results = await Promise.all(toolCalls.map(async (tc) => {
      return await this.toolExecutor.invoke(tc);
    }));
    return { messages: results };
  }
  async run(studentDid, messages, mode = "ASSISTANT") {
    return await this.graph.invoke({ studentDid, messages, mode });
  }
};

// src/services/TelemetryBridge.ts
import fetch from "node-fetch";
var TelemetryBridge = class {
  teacherServiceUrl;
  constructor() {
    this.teacherServiceUrl = process.env.TEACHER_SERVICE_URL || "http://localhost:3007";
  }
  /**
   * Notify the Teacher Assistant service about an event.
   */
  async notifyTeacher(studentDid, teacherDid, state) {
    try {
      const response = await fetch(`${this.teacherServiceUrl}/events/telemetry`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentDid, teacherDid, state })
      });
      if (!response.ok) {
        console.warn(`Failed to notify Teacher Service: ${response.statusText}`);
      } else {
        console.log(`Successfully notified Teacher Service of event for ${studentDid}`);
      }
    } catch (error) {
      console.error("Error in TelemetryBridge:", error);
    }
  }
};

// src/services/EventSubscriber.ts
var EventSubscriber = class {
  prisma;
  bridge;
  constructor(prisma2) {
    this.prisma = prisma2;
    this.bridge = new TelemetryBridge();
  }
  /**
   * Handle incoming telemetry events.
   */
  async handleEvent(event) {
    const { eventType, payload, creatorDid } = event;
    if (eventType === "HELP_CLICK") {
      await this.trackHelpUsage(creatorDid);
    }
    if (eventType === "PAGE_VIEW") {
      await this.updateCurrentLocation(creatorDid, payload.path);
    }
  }
  async trackHelpUsage(studentDid) {
    const state = await this.prisma.studentState.upsert({
      where: { studentDid },
      update: {
        helpClickCount: { increment: 1 },
        lastHelpAt: /* @__PURE__ */ new Date()
      },
      create: {
        studentDid,
        helpClickCount: 1,
        lastHelpAt: /* @__PURE__ */ new Date()
      }
    });
    if (state.helpClickCount >= 5) {
      await this.prisma.studentState.update({
        where: { studentDid },
        data: { mode: "TEACHER" }
      });
      console.log(`Student ${studentDid} switched to TEACHER mode due to help abuse.`);
      await this.bridge.notifyTeacher(studentDid, "teacher-456", state);
    }
  }
  async updateCurrentLocation(studentDid, path) {
    await this.prisma.studentState.upsert({
      where: { studentDid },
      update: { currentQuest: path },
      create: {
        studentDid,
        currentQuest: path
      }
    });
  }
};

// src/services/ReportingService.ts
var ReportingService = class {
  prisma;
  constructor(prisma2) {
    this.prisma = prisma2;
  }
  /**
   * Generate a student progress report.
   */
  async generateStudentReport(studentDid) {
    const state = await this.prisma.studentState.findUnique({
      where: { studentDid }
    });
    const traits = await this.prisma.trait.findMany({
      where: { studentDid }
    });
    const report = `
# Student Progress Report: ${studentDid}
**Mode**: ${state?.mode || "ASSISTANT"}

## Traits & Growth
${traits.map((t) => `- **${t.name}**: ${t.value.toFixed(2)} (${t.evidence || "No evidence yet"})`).join("\n")}

## Recent Activity
- **Current Quest**: ${state?.currentQuest || "None"}
- **Help Requests**: ${state?.helpClickCount || 0}
        `;
    return report.trim();
  }
};

// src/index.ts
import { HumanMessage as HumanMessage2 } from "@langchain/core/messages";
import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
dotenv.config();
var app = express();
var pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
var adapter = new PrismaPg(pool);
var prisma = new PrismaClient({ adapter });
var port = process.env.PORT || 3006;
var tutorAgent = new TutorAgent();
var eventSubscriber = new EventSubscriber(prisma);
var reportingService = new ReportingService(prisma);
app.use(helmet());
app.use(cors());
app.use(express.json());
app.get("/health", (req, res) => {
  res.json({ status: "healthy", service: "ais-agent-tutor" });
});
app.post("/events", async (req, res) => {
  try {
    await eventSubscriber.handleEvent(req.body);
    res.status(202).json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
app.post("/chat", async (req, res) => {
  try {
    const { message, studentDid } = req.body;
    const state = await prisma.studentState.findUnique({
      where: { studentDid }
    });
    const result = await tutorAgent.run(
      studentDid,
      [new HumanMessage2(message)],
      state?.mode || "ASSISTANT"
    );
    const responseContent = result.messages[result.messages.length - 1].content;
    res.json({
      response: typeof responseContent === "string" ? responseContent : JSON.stringify(responseContent),
      mode: state?.mode || "ASSISTANT"
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
app.get("/student/:did/summary", async (req, res) => {
  try {
    const report = await reportingService.generateStudentReport(req.params.did);
    res.json({ report });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
if (process.env.NODE_ENV !== "test") {
  app.listen(port, () => {
    console.log(`PersonalAITutor Service running on port ${port}`);
  });
}
var index_default = app;
export {
  index_default as default
};
