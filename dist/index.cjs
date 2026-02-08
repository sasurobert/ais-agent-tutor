"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  default: () => index_default
});
module.exports = __toCommonJS(index_exports);
var import_express = __toESM(require("express"), 1);
var import_cors = __toESM(require("cors"), 1);
var import_helmet = __toESM(require("helmet"), 1);
var import_dotenv = __toESM(require("dotenv"), 1);
var import_client = require("@prisma/client");

// src/agents/TutorAgent.ts
var import_langgraph = require("@langchain/langgraph");
var import_messages = require("@langchain/core/messages");
var import_openai2 = require("@langchain/openai");

// src/services/MemoryService.ts
var import_pinecone = require("@pinecone-database/pinecone");
var import_pinecone2 = require("@langchain/pinecone");
var import_openai = require("@langchain/openai");
var import_documents = require("@langchain/core/documents");
var MemoryService = class {
  vectorStore = null;
  embeddings;
  isStub;
  constructor() {
    this.isStub = process.env.OPENAI_API_KEY === "sk-test-key";
    this.embeddings = new import_openai.OpenAIEmbeddings({
      openAIApiKey: process.env.OPENAI_API_KEY
    });
  }
  async getVectorStore() {
    if (this.isStub) return null;
    if (this.vectorStore) return this.vectorStore;
    const pinecone = new import_pinecone.Pinecone({
      apiKey: process.env.PINECONE_API_KEY
    });
    const index = pinecone.Index(process.env.PINECONE_INDEX);
    this.vectorStore = await import_pinecone2.PineconeStore.fromExistingIndex(this.embeddings, {
      pineconeIndex: index
    });
    return this.vectorStore;
  }
  /**
   * Store a student interaction in the vector memory.
   */
  async storeInteraction(studentDid, content, metadata = {}) {
    if (this.isStub) {
      console.log(`[MemoryService] Stub: Storing interaction for ${studentDid}`);
      return;
    }
    const store = await this.getVectorStore();
    if (!store) return;
    await store.addDocuments([
      new import_documents.Document({
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
    if (this.isStub) {
      console.log(`[MemoryService] Stub: Retrieving context for ${studentDid}`);
      return [];
    }
    const store = await this.getVectorStore();
    if (!store) return [];
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
    if (this.isStub) {
      console.log(`[MemoryService] Stub: Retrieving worldview context`);
      return [];
    }
    const store = await this.getVectorStore();
    if (!store) return [];
    const results = await store.similaritySearch(query, k, {
      type: "worldview"
    });
    console.log(`Retrieved ${results.length} worldview documents for query: ${query}`);
    return results;
  }
};

// src/services/ActionService.ts
var import_tools = require("@langchain/core/tools");
var import_zod = require("zod");
var import_tavily = require("@langchain/tavily");
var ActionService = class {
  /**
   * Get the set of tools available to the tutor.
   */
  static getTools() {
    const searchTool = new import_tavily.TavilySearch({
      apiKey: process.env.TAVILY_API_KEY,
      maxResults: 3
    });
    const appNavigationTool = new import_tools.DynamicStructuredTool({
      name: "navigate_to_quest",
      description: "Navigates the student to a specific quest or course page.",
      schema: import_zod.z.object({
        path: import_zod.z.string().describe("The URL path to navigate to, e.g. /quests/123"),
        reason: import_zod.z.string().describe("The pedagogical reason for this navigation")
      }),
      func: async ({ path, reason }) => {
        console.log(`Navigating to ${path}. Reason: ${reason}`);
        return `Successfully triggered navigation to ${path}`;
      }
    });
    const progressCheckTool = new import_tools.DynamicTool({
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
var import_prebuilt = require("@langchain/langgraph/prebuilt");
var TutorAgent = class {
  graph;
  llm;
  memory;
  toolExecutor;
  constructor() {
    const apiKey = process.env.OPENAI_API_KEY || "";
    this.llm = new import_openai2.ChatOpenAI({
      modelName: "gpt-4o",
      streaming: true,
      openAIApiKey: apiKey === "sk-test-key" ? "fake-key" : apiKey
    });
    if (apiKey === "sk-test-key") {
      const originalInvoke = this.llm.invoke.bind(this.llm);
      this.llm.invoke = async (input) => {
        const content = "I can help you with that! The Nehemiah quest is about rebuilding the walls of Jerusalem. What have you learned so far about his first steps?";
        return new import_messages.AIMessageChunk({ content });
      };
      this.llm.bindTools = () => this.llm;
    }
    this.memory = new MemoryService();
    this.toolExecutor = new import_prebuilt.ToolExecutor({ tools: ActionService.getTools() });
    const workflow = new import_langgraph.StateGraph({
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
    workflow.addEdge(import_langgraph.START, "contextCollation");
    workflow.addEdge("contextCollation", "agent");
    workflow.addConditionalEdges(
      "agent",
      this.shouldContinue.bind(this),
      {
        "continue": "action",
        "end": import_langgraph.END
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
      new import_messages.HumanMessage(systemPrompt),
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
    console.log(`[Tutor] Received event: ${eventType} from ${creatorDid}`);
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
    console.log(`[Tutor] Student ${studentDid} help count: ${state.helpClickCount}`);
    if (state.helpClickCount >= 5) {
      await this.prisma.studentState.update({
        where: { studentDid },
        data: { mode: "TEACHER" }
      });
      console.log(`[Tutor] Student ${studentDid} switched to TEACHER mode due to help abuse.`);
      console.log(`[Tutor] Notifying Teacher Service via bridge for student: ${studentDid}`);
      await this.bridge.notifyTeacher(studentDid, "teacher-123", state);
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
var import_messages2 = require("@langchain/core/messages");
var import_morgan = __toESM(require("morgan"), 1);
var import_pg = __toESM(require("pg"), 1);
var import_adapter_pg = require("@prisma/adapter-pg");
import_dotenv.default.config();
var app = (0, import_express.default)();
app.use((0, import_morgan.default)("dev"));
var pool = new import_pg.default.Pool({ connectionString: process.env.DATABASE_URL });
pool.on("connect", (client) => {
  client.query("SET search_path TO tutor");
});
var adapter = new import_adapter_pg.PrismaPg(pool);
var prisma = new import_client.PrismaClient({ adapter });
var port = process.env.PORT || 3006;
var tutorAgent = new TutorAgent();
var eventSubscriber = new EventSubscriber(prisma);
var reportingService = new ReportingService(prisma);
app.use((0, import_helmet.default)());
app.use((0, import_cors.default)());
app.use(import_express.default.json());
app.get("/health", (req, res) => {
  res.json({ status: "healthy", service: "ais-agent-tutor" });
});
app.post("/events", async (req, res) => {
  try {
    await eventSubscriber.handleEvent(req.body);
    res.status(202).json({ success: true });
  } catch (error) {
    console.error(`[Tutor] Error in /events:`, error);
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
      [new import_messages2.HumanMessage(message)],
      state?.mode || "ASSISTANT"
    );
    const responseContent = result.messages[result.messages.length - 1].content;
    res.json({
      response: typeof responseContent === "string" ? responseContent : JSON.stringify(responseContent),
      mode: state?.mode || "ASSISTANT"
    });
  } catch (error) {
    console.error(`[Tutor] Error in /chat:`, error);
    res.status(500).json({ error: error.message });
  }
});
app.get("/student/:did/summary", async (req, res) => {
  try {
    const report = await reportingService.generateStudentReport(req.params.did);
    res.json({ report });
  } catch (error) {
    console.error(`[Tutor] Error in /student/summary:`, error);
    res.status(500).json({ error: error.message });
  }
});
if (process.env.NODE_ENV !== "test") {
  app.listen(port, () => {
    console.log(`PersonalAITutor Service running on port ${port}`);
  });
}
var index_default = app;
