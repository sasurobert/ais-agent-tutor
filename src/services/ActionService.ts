import { DynamicTool, DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { TavilySearch } from '@langchain/tavily';

export class ActionService {
    /**
     * Get the set of tools available to the tutor.
     */
    static getTools() {
        const searchTool = new TavilySearch({
            apiKey: process.env.TAVILY_API_KEY,
            maxResults: 3,
        });

        const appNavigationTool = new DynamicStructuredTool({
            name: "navigate_to_quest",
            description: "Navigates the student to a specific quest or course page.",
            schema: z.object({
                path: z.string().describe("The URL path to navigate to, e.g. /quests/123"),
                reason: z.string().describe("The pedagogical reason for this navigation"),
            }),
            func: async ({ path, reason }) => {
                console.log(`Navigating to ${path}. Reason: ${reason}`);
                return `Successfully triggered navigation to ${path}`;
            },
        });

        const progressCheckTool = new DynamicTool({
            name: "check_student_progress",
            description: "Checks the completion status of current quests for the student.",
            func: async () => {
                // Placeholder for calling ais-backend-edu
                return "Student is 60% through 'Ancient Egypt' quest. 2 tasks remaining.";
            },
        });

        return [searchTool, appNavigationTool, progressCheckTool];
    }
}
