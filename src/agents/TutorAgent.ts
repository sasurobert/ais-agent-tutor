import { StateGraph, END, START } from "@langchain/langgraph";
import { BaseMessage, HumanMessage, AIMessage, AIMessageChunk } from "@langchain/core/messages";
import { ChatOpenAI } from "@langchain/openai";
import { MemoryService } from "../services/MemoryService.js";
import { ActionService } from "../services/ActionService.js";
import { ToolExecutor } from "@langchain/langgraph/prebuilt";

export interface TutorState {
    messages: BaseMessage[];
    studentDid: string;
    mode: 'ASSISTANT' | 'TEACHER';
    context: any;
}

export class TutorAgent {
    private graph: any;
    private llm: ChatOpenAI;
    private memory: MemoryService;
    private toolExecutor: ToolExecutor;

    constructor() {
        const apiKey = process.env.OPENAI_API_KEY || "";
        this.llm = new ChatOpenAI({
            modelName: "gpt-4o",
            streaming: true,
            openAIApiKey: apiKey === "sk-test-key" ? "fake-key" : apiKey
        });

        // Stub the invoke method if using test key
        if (apiKey === "sk-test-key") {
            const originalInvoke = this.llm.invoke.bind(this.llm);
            this.llm.invoke = async (input: any) => {
                const content = "I can help you with that! The Nehemiah quest is about rebuilding the walls of Jerusalem. What have you learned so far about his first steps?";
                return new AIMessageChunk({ content });
            };
            // Also stub bindTools to return the same mocked LLM
            this.llm.bindTools = () => this.llm as any;
        }

        this.memory = new MemoryService();
        this.toolExecutor = new ToolExecutor({ tools: ActionService.getTools() });

        const workflow = new StateGraph<TutorState>({
            channels: {
                messages: {
                    reducer: (x: BaseMessage[], y: BaseMessage[]) => x.concat(y),
                    default: () => [],
                },
                studentDid: {
                    reducer: (x: string, y: string) => y ?? x,
                    default: () => "",
                },
                mode: {
                    reducer: (x: string, y: string) => y ?? x,
                    default: () => "ASSISTANT",
                },
                context: {
                    reducer: (x: any, y: any) => ({ ...x, ...y }),
                    default: () => ({}),
                },
            }
        } as any);

        workflow.addNode("contextCollation", this.contextCollation.bind(this));
        workflow.addNode("agent", this.callModel.bind(this));
        workflow.addNode("action", this.callTool.bind(this));

        workflow.addEdge(START, "contextCollation" as any);
        workflow.addEdge("contextCollation" as any, "agent" as any);
        workflow.addConditionalEdges(
            "agent" as any,
            this.shouldContinue.bind(this),
            {
                "continue": "action" as any,
                "end": END as any,
            }
        );
        workflow.addEdge("action" as any, "agent" as any);

        this.graph = workflow.compile();
    }

    private async contextCollation(state: TutorState) {
        const lastMessage = state.messages[state.messages.length - 1];
        const content = typeof lastMessage.content === 'string' ? lastMessage.content : "";

        // Enhanced RAG: Retrieve both student history and pedagogical worldview context
        const memoryContext = await this.memory.retrieveContext(state.studentDid, content, 5);
        const worldviewContext = await this.memory.retrieveWorldviewContext(content, 3);

        return {
            context: {
                memory: memoryContext.map((d: any) => d.pageContent).join("\n"),
                worldview: worldviewContext.map((d: any) => d.pageContent).join("\n")
            }
        };
    }

    private async callModel(state: TutorState) {
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

    private shouldContinue(state: TutorState) {
        const lastMessage = state.messages[state.messages.length - 1] as AIMessage;
        if (lastMessage.tool_calls && lastMessage.tool_calls.length > 0) {
            return "continue";
        }
        return "end";
    }

    private async callTool(state: TutorState) {
        const lastMessage = state.messages[state.messages.length - 1] as AIMessage;
        const toolCalls = lastMessage.tool_calls || [];

        const results = await Promise.all(toolCalls.map(async (tc) => {
            return await this.toolExecutor.invoke(tc);
        }));

        return { messages: results };
    }

    async run(studentDid: string, messages: BaseMessage[], mode: 'ASSISTANT' | 'TEACHER' = 'ASSISTANT') {
        return await this.graph.invoke({ studentDid, messages, mode });
    }
}
