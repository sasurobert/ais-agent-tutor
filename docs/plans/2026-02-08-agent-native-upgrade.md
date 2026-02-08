# Student Tutor Agent-Native Upgrade Plan

**Goal:** Ensure `ais-agent-tutor` is fully "agent-native" by refining its internal service calling logic and service mesh connectivity.

**Architecture:** Enhancing the current implementation to ensure the agent has direct, structured access to `Edu`, `Identity`, and `Infra` services via internal SDKs or standardized API calls.

**Tech Stack:** Node.js, TypeScript, LangGraph, Prisma.

---

### Task 1: Refine Service Integration Tools

**Files:**
- Modify: `src/services/ActionService.ts`
- Create: `src/services/EduService.ts`

**Step 1: Implement structured EduService caller**
Instead of simple fetch, use a standard client pattern for curriculum data.

**Step 2: Update `ActionService` tools**
Ensure `get_app_state` and `list_available_quests` use the new `EduService`.

**Step 3: Commit**
```bash
git add src/services/
git commit -m "refactor: agent-native service integration"
```

---

### Task 4: Advanced RAG Tuning (Theological Analogies)

**Files:**
- Modify: `src/services/MemoryService.ts`
- Modify: `src/lib/faith_knowledge.ts`

**Step 1: Expand faith-aligned knowledge base**
Add more structured analogies for common academic struggles.

**Step 2: Implement re-ranking for RAG results**
Ensure the most relevant biblical analogy is picked by the agent.

**Step 3: Commit**
```bash
git add src/
git commit -m "feat: improve theological RAG relevance"
```
