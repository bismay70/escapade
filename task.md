# Executive Summary  
Agentic AI orchestration coordinates multiple autonomous agents to automate complex, end-to-end workflows.  The goal is to evolve the existing Vanes app into a **unique agentic orchestrator** that leverages modern multi-agent patterns, memory, planning, and robust tooling to solve real-world problems.  We surveyed state-of-the-art frameworks (e.g. LangGraph, CrewAI, OpenAI Agents, Google ADK) and products (AI Agent, SuperAGI) and identified best practices like directed graph workflows, human-in-the-loop checkpoints, and rich context management.  Based on this, we propose advanced features (e.g. specialist agent roles, dynamic task planning, integrated tools, collaborative workspaces) and a modular architecture to enable extensibility.  The plan includes an implementation roadmap, API designs, and security/compliance recommendations.  The resulting Vanes orchestrator will provide a managed platform where users can define workflows, spin up agent teams, interact with outputs, and monitor progress through a unified interface.

# Current Vanes App Inventory (Hypothetical)  
To modernize Vanes, we must first **audit its current state**.  This involves reviewing the codebase, architecture diagrams, and deployment details to list existing features and components. Typical points of investigation include:  

- **Features:** Does Vanes currently support only a single-agent chat interface, or any automation?  Are there workflows or scheduled tasks? What “tools” or APIs (e.g. email, databases) does it call?  
- **Architecture:** Is it a monolithic app or microservices?  What languages and frameworks?  Where is business logic versus UI?  
- **Data Flows:** How does a user request propagate? (e.g. UI → backend → LLM API → response).  Where and how is intermediate state stored (e.g. in-memory, database)?  
- **APIs & Integrations:** Identify which external services (LLM providers like OpenAI/GPT, data sources, third-party APIs) it uses.  Examine existing API contracts and data schemas.  
- **Storage & Auth:** What databases or file stores are used? How are user accounts managed, and what authentication (JWT, OAuth, etc) is in place?  
- **Deployment:** Is Vanes hosted (cloud, on-premises)? Does it use containers, serverless, or VMs? What CI/CD pipelines and environment configurations exist?  

This inventory will reveal **gaps**: for example, if Vanes currently only handles one-at-a-time LLM calls with no long-term memory, it lacks basic agentic orchestration.  Common refactor opportunities include decoupling the workflow engine from the UI, abstracting LLM calls into a service layer, and adding state management. If there is no clear separation between components (e.g. mixing UI and logic), introducing a modular design now will ease adding multi-agent support later. 

# State-of-the-Art: Agentic Orchestration Patterns  
Recent advances in AI emphasize **workflow orchestration** over isolated model calls.  By design, agentic orchestration means running *teams* of agents (each with specialized roles) under an orchestrator that manages task delegation, context sharing, and governance.  For example, LangChain’s LangGraph uses *directed graph workflows* with conditional edges and checkpointing for long-running stateful tasks.  Other frameworks use *event-driven flows* (CrewAI’s “crews” mapping roles to tasks) or *session-based graphs* (Microsoft’s Agent Framework for concurrent tasks with human review).  

Key patterns include:  
- **Graph-based Workflows:** Directed acyclic graphs where each node is a function or subtask. Nodes can spawn or trigger other nodes conditionally. LangGraph illustrates this with stateful graph execution and built-in checkpointing.  
- **Agent Chains and Loops:** Prompt-chaining or feedback loops, where an LLM agent produces an output that feeds into the next agent. LangChain docs differentiate *prompt chaining* (fixed steps) from *true agents* that decide their next tool call dynamically.  
- **Tool-Assisted Agents:** Agents that call external tools (search, calculators, code execution). Modern systems embed *tool calling* as a primitive, allowing agents to query databases, APIs, or custom functions.  
- **Parallel Subagents:** Systems like OpenAI’s multi-agent support let a **root agent** split a task among parallel **subagents**. Each subagent has its own context and works independently, after which the root synthesizes the final answer.  This “model-directed coordination” improves speed for independent subtasks (e.g. code search, multi-document review) without extra orchestration code.  

On the academic side, Papamarkou et al. (ICML 2026) argue for **Bayesian decision frameworks at the orchestration layer**, allowing the system to maintain probabilistic beliefs about tasks and choose actions under uncertainty.  This highlights a trend toward treating planning as a decision-theoretic problem (calibrating when to call which expert or tool).  In practice, orchestration layers incorporate *utility-aware policies* and confidence scoring to decide when to continue autonomously or seek human input.  

In summary, the cutting edge of agent orchestration combines: multi-agent graphs or workflows, memory for long-term context, explicit tool integration, and built-in human handoffs.  Frameworks like LangGraph (LangChain), CrewAI, OpenAI’s Agents SDK, and Google’s internal Agent Development Kit exemplify these ideas.  They typically support protocols for agent-to-agent messaging (A2A) and tool connections (MCP – Model Context Protocol) that Vanes should adopt.

# Competitor Analysis  
We compared several existing platforms/tools to identify features Vanes could emulate or surpass. The table below summarizes six representative agentic AI systems (frameworks and products):  

| **Name**           | **Category**        | **Orchestration Model**                | **Human-in-loop**                  | **Primary Strengths**                                   | **Limitations/Notes**                       |
|--------------------|---------------------|----------------------------------------|------------------------------------|---------------------------------------------------------|---------------------------------------------|
| **AI Agent** (aiagent.app)  | SaaS (No-code)     | Teams of AI agents + workflow builder    | Supports user approvals and oversight (HITL)  | No-code agent builder; integrates with common SaaS (CRM, email); multi-model support (Claude, Gemini, etc) | Tightly coupled UI; usage-based pricing; business-domain focus |
| **SuperAGI**  | SaaS (Sales Automation)   | 30+ specialized AI “apps” (agents)     | Built-in approval steps for sequences           | All-in-one GTM (sales/marketing) platform; drag-drop workflows; compliant (SOC2, GDPR)  | Narrow focus on sales/marketing; credit-based cost; complex learning curve |
| **LangGraph**      | OSS Framework      | Directed state graphs (LangChain)       | Interruptible; can insert reviews (via LangSmith) | Highly flexible graph workflows; built-in persistence and debugging | Requires coding (TypeScript/Python); steep learning curve for non-devs |
| **CrewAI**         | OSS Framework      | Role-based “crews” + event-driven flows   | Supported but not primary design point         | Fast prototyping for team-like workflows; explicit state passing | Newer, less mature ecosystem; smaller community |
| **OpenAI Agents SDK** | Framework/SDK     | Root agent with specialist “branches”   | Native approve/pause; session-based memory     | Seamless multi-agent (beta) in GPT API; simple handoffs; MCP built in | Tied to OpenAI API; currently in beta (GPT-6.1 Sol); usage costs |
| **Google ADK**     | Platform           | Hierarchical agent trees + workflows   | Native (both workflows and Task API)         | Integrates with Google Cloud/Gemini; pluggable session state; supports A2A  | Internal (not public); likely optimized for Google stack |
 
Each offers guidance.  For example, LangGraph’s **stateful graphs** with *checkpoints* and *time-travel replay* are ideal for long tasks, suggesting Vanes adopt a graph execution engine.  The AI Agent platform shows the importance of a polished UI and *pre-built use cases*.  The OpenAI Agents SDK reveals the power of a “branching” multi-agent API where agents coordinate without extra code.  Notably, AI Agent and SuperAGI target business users, implying Vanes should consider domain-specific templates (e.g. for customer support, finance) and compliance (GDPR, etc) to be competitive.

# Proposed Advanced Features  
To stand out as a fully agentic orchestrator, Vanes should incorporate the following advanced capabilities:

- **Specialist Agent Roles:** Allow users to spin up multiple agents with defined roles (e.g. “Researcher”, “Assistant”, “Analyst”).  For instance, an “AI SDR” agent (as in SuperAGI) could handle prospecting, while an “AI Auditor” could perform data QC.  These roles come with specialized prompts and toolsets.  
- **Dynamic Task Decomposition & Planning:** Implement a planner that breaks high-level goals into sub-tasks. The orchestrator should support hierarchical planning (like a task tree) and **conditional routing**. For example, use a graph node to check if “joke has a punchline” and then route accordingly.  
- **Inter-Agent Coordination & Messaging:** Adopt a standard protocol (such as MCP/A2A) so agents can send messages or call tools on behalf of each other. Agents should be able to delegate to subagents (see OpenAI multi-agent) and wait for results, enabling parallelism and specialized computations.  
- **Persistent Memory:** Provide both *short-term* (current conversation/workflow context) and *long-term* memory (user profiles, facts) storage.  This lets agents recall past interactions or learned facts.  For example, store key decisions or user preferences in a database so agents can personalize responses over time.  
- **Tool/Plugin Ecosystem:** Integrate common APIs (search, calendar, email, CRM, Slack, code execution, etc.) as “tools” that agents can call. Include an SDK for adding new tools.  For instance, an agent should be able to call a “send_email” tool with parameters, or launch a web scraper.  Structured output schemas (JSON/Zod) can ensure reliable tool use.  
- **Human-in-the-Loop Controls:** Enable defined checkpoints where agents pause for human review or approval. Use patterns like the **Approval Gate** (agent halts until a user approves a draft) or **Escalation Trigger** (agent flags low-confidence tasks).  Provide a UI for humans to view agent outputs and easily resume or edit.  
- **Observability & Debugging:** Build integrated logging and tracing. Every agent action (tool call, message, decision) should be logged.  For example, hook into platforms like LangSmith or OpenTelemetry to trace execution flows. Provide dashboards showing active workflows, pending tasks, and performance metrics (latency, success rates).  Enable replaying or debugging an agent’s state graph.  
- **Safety & Governance:** Implement guardrails and access controls. Use content filters for LLM outputs, sandbox tools to prevent malicious actions, and rate limits on sensitive operations. Maintain audit logs (who triggered what).  For sensitive data, apply encryption and ensure compliance (SOC2/GDPR if needed, as SuperAGI did).  Allow users to define policies (e.g. disallow certain topics).  
- **Learning & Adaptation:** Optionally include feedback loops or simple reinforcement learning to improve agents over time. For instance, if agents consistently fail a subtask, the system could retrain or adjust prompts.  Also consider multi-tenant “shared knowledge” — if one user’s agent solves a problem, that solution could become a reusable workflow template for others.  
- **Collaboration & Task Routing:** Support team workflows where multiple users can assign tasks to agents or each other. For example, agents could assign a generated ticket to a human user when unable to proceed.  Incorporate a “shared workspace” of files/records where agents and humans can collaborate (as described by Fastio).  
- **Rich Interaction Patterns:** Beyond chat, offer dashboards, file interfaces, email summaries, and notifications. Allow voice or messaging integration for agents. Provide real-time updates of agent progress (e.g. “Agent A completed step 2 of 5”).  Use templates (wizard flows) for common orchestration scenarios.

Each proposed feature draws on observed needs in the field: specialized agents and parallel delegation (OpenAI multi-agent), persistent memory (LangChain frameworks), HIL checkpoints (Fastio guide), and observability (LangSmith integration). Incorporating these will make Vanes a comprehensive agent orchestration platform.

# Architecture Design  

A modular, service-oriented architecture will best support these features. One possible layout is:  

```mermaid
graph TD
    subgraph Frontend
        U[User Interface] 
    end
    subgraph Orchestrator Service
        OR[Orchestrator Engine]
        ST[State & Memory Store]
        WF[Workflow/Graph Store]
        AG[Agent Manager]
        TM[Tool Manager]
        SM[Security/Auth Module]
    end
    subgraph Agents
        A1["Agent A"] 
        A2["Agent B"]
        ... 
    end
    subgraph External Integrations
        LL[LLM API (OpenAI, Anthropic...)]
        SVC["Third-party Services"]
        DB[(Database / KV store)]
    end

    U -->|API Requests| OR
    OR -->|fetch/save| WF
    OR -->|read/write| ST
    OR -->|launch/monitor| AG
    OR --> SM
    AG -->|spawn| A1
    AG -->|spawn| A2
    A1 -->|tool calls| TM
    A2 --> TM
    TM --> SVC
    A1 -->|LLM calls| LL
    A2 --> LL
    OR -->|query| DB
    U -->|authentication| SM
```

- **User Interface:** A dashboard for users to define workflows, interact with agents, and approve tasks.  
- **Orchestrator Engine:** Core logic handling incoming tasks, scheduling sub-tasks, and maintaining workflow graphs.  It coordinates state (via State & Memory Store) and triggers agents.  
- **Agent Manager:** Handles agent lifecycle (creating, pausing, stopping agents). Each agent (A1, A2, …) runs as a separate process or microservice, pulling tasks from the orchestrator.  
- **State & Memory Store:** A database (e.g. PostgreSQL, Redis, or vector DB) storing short-term state (current conversation/workflow context) and long-term memory (persistent knowledge, user profiles).  
- **Workflow/Graph Store:** Stores definitions of workflows or graphs (possibly as JSON/Schemas) that the orchestrator uses to route tasks.  
- **Tool Manager:** A registry that defines and invokes external tools. Agents call tools through this layer, which handles API keys and transforms.  
- **Security/Auth Module:** Authenticates users (OAuth2/JWT) and enforces permissions on workflows and data.  
- **LLM API Connector:** Interfaces with external LLM providers (OpenAI, Anthropic, etc.) using their SDKs or REST APIs.  
- **Third-party Services:** Email/SMS gateways, CRM, calendar, databases, or any external system.  

This architecture is modular: new agent types or tools can be added without changing core services. The Orchestrator and Agent processes communicate via internal APIs or a message bus (e.g. RabbitMQ, Kafka) using a protocol like MCP/A2A for structured messages. Mermaid diagrams can be used similarly to depict data flows or sequence of steps (not shown).

# Integration Points and API Contracts  

Integration is key. Some recommended interfaces and APIs:  

- **REST/gRPC API:** Expose endpoints for creating jobs/workflows (e.g. `POST /workflows` with a JSON graph), querying status (`GET /workflows/{id}`), and controlling execution (`POST /workflows/{id}/resume?decision=approve`). The API should allow embedding in other apps (e.g. allow Zapier to call `POST /startAgentTask`).  
- **Webhooks & Event Bus:** Support event callbacks. For example, when an agent finishes a subtask or hits a HITL checkpoint, emit an event or webhook so external systems/humans are notified. Conversely, external triggers (new email, scheduled time) can initiate workflows.  
- **Agent Communication Protocol:** Internally, use a standard protocol (like A2A) for agents to message each other or request tools. Each agent exposes a minimal API (e.g. `POST /agents/{agentId}/runStep`) so the Orchestrator can drive them.  
- **Tool SDK/API Contract:** Define a schema for adding new tools: a tool must specify its input schema and description. Agents then call tools via a common interface (like `invokeTool(toolName, args)`) that returns structured JSON. This abstracts away auth and endpoints.  
- **Memory/Database Interface:** Agents should have an API (or direct DB access layer) to store and retrieve memory items (key-value or embedding queries). For example, `GET /memory?query=...` or an SDK to log a memory.  
- **Auth/Permission API:** Enforce tenant/user-based access. Provide endpoints to manage tokens, roles, and policies. Agents and services should validate JWTs on each call.  

These integrations ensure Vanes can interoperate with existing infrastructure and be extended. For example, a CRM connector tool might have an API contract: input `{contactQuery: String}` and output `{email: String, name: String}`, which agents can call as a black box. All APIs should be documented (OpenAPI spec, developer portal).

# Data Privacy, Security & Compliance  

Given Vanes may handle sensitive data and enterprise workflows, security is crucial. Recommendations include:  

- **Authentication & Access Control:** Use industry-standard auth (OAuth2 or OIDC with JWTs). Microservices should validate tokens on every request. Support RBAC or scopes so users can only run agents or view data as permitted.  
- **Encryption:** Encrypt data at rest in databases (e.g. AES encryption) and enforce TLS for all in-transit communication (API calls, tool usage). For secrets (API keys, tokens), use a secure vault (HashiCorp Vault, AWS Secrets Manager).  
- **Least Privilege & Sandboxing:** Each agent’s execution environment should have minimal privileges. For example, if an agent calls a code-execution tool, run it in a sandbox/container to prevent malicious code from affecting the host. Limit agent write permissions (e.g. read-only by default).  
- **Input Validation & Sanitization:** Sanitize any inputs from agents before sending to tools. For example, if an agent formulates an SQL query, validate or parameterize it to avoid injection.  
- **Content Filtering:** Use guardrails (such as an LLM-based filter) to check agent outputs against policy. Block or flag outputs containing disallowed content (to mitigate hallucinations or offensive language).  
- **Audit Logging:** Log every critical action (agent creation, tool call, human approval, data change) with timestamp and user context. This supports traceability and compliance audits.  
- **Compliance Standards:** If targeting regulated industries, ensure compliance frameworks (SOC2, ISO 27001, HIPAA, GDPR, etc.) are considered. For GDPR, ensure data deletion and user consent mechanisms exist. The user research of SuperAGI notes compliance (SOC2, ISO, HIPAA, GDPR) as a selling point.  
- **Disaster Recovery & Backups:** Regularly backup critical data (workflows, memory stores) and have a plan for service continuity. Use multi-region deployment if needed for high availability.  

In summary, treat each agent action as a potential security boundary crossing. Apply standard best-practices from cloud security and data protection. 

# Implementation Roadmap (Milestones & Effort)  

A phased rollout is prudent. Below is a tentative roadmap with milestones, rough effort (L/M/H), and relative cost:  

| **Phase**               | **Milestone**                                              | **Effort** | **Notes/Dependencies**                            |
|-------------------------|------------------------------------------------------------|----------|---------------------------------------------------|
| **Phase 1: Core Platform**         | **– Inventory & Refactor:** Audit current code and modularize (split frontend/backend, define interfaces).<br>**– Foundation:** Set up base services (Orchestrator, Agent Manager, Memory DB).<br>**– Basic Agent Loop:** Implement one agent type that takes user input → calls LLM via openAI/Anthropic, returns response.  | Medium   | Requires senior devs familiar with LLM APIs.       |
| **Phase 2: Workflow Engine**       | **– Graph Engine:** Develop a directed-graph workflow engine (like LangGraph).<br>**– Persistence:** Add state checkpointing to resume flows.  | High     | Complex logic; likely 3–4 dev-weeks.              |
| **Phase 3: Tools & Integrations**  | **– Tool Library:** Build connectors for email, search, code execution, etc.<br>**– Tool SDK/API:** Define schema for adding new tools.    | Medium   | Integration-heavy; depends on tool APIs.         |
| **Phase 4: Memory Systems**        | **– Short-term Memory:** Implement conversation/thread memory (persist chat history, task state).<br>**– Long-term Memory:** Integrate a vector DB or knowledge base for facts.  | Medium   | Use existing solutions (Redis/Mongo or Pinecone etc). |
| **Phase 5: Human-in-Loop**        | **– HIL Patterns:** Enable approval gates and escalation points in workflows (pause/resume).<br>**– UI for approvals:** Build interfaces for humans to review results.  | Medium   | Complex UX (dashboard) plus flow logic.        |
| **Phase 6: Observability & UI**    | **– Logging/Tracing:** Integrate LangSmith or OpenTelemetry for tracing agent execution.<br>**– Metrics Dashboard:** Expose key metrics (task throughput, error rates).<br>**– Enhanced UI:** Workspaces, agent configuration UI, usage analytics.  | High     | UI/UX heavy plus instrumentation work.           |
| **Phase 7: Scaling & Reliability** | **– Microservices:** Containerize components (Docker/K8s).<br>**– Scaling:** Load testing, ensure horizontal scaling of agent workers.<br>**– Resilience:** Implement retries, dead-letter queues for failed tasks.  | Medium   | DevOps-heavy.                                     |
| **Phase 8: Security & Compliance** | **– Security Audit:** Penetration testing, code review for vulnerabilities.<br>**– Compliance Prep:** Privacy policies, GDPR features if needed.  | Medium   | Engage security experts.                         |
| **Phase 9: Extensions & Domain**   | **– Template Workflows:** Pre-built examples (e.g. “Sales outreach agent”, “Data auditor agent”).<br>**– Customization:** Allow users to import models, connect to their accounts.  | Low      | Ongoing; can be updated iteratively.             |
| **Phase 10: Refinement**          | **– Testing:** Comprehensive unit/integration tests (agents, workflows).<br>**– Beta Rollout:** Collect user feedback, iterate on features.<br>**– Documentation:** Publish API and user docs.  | Medium   | Continuous; never done.                          |

- **Effort** is a rough T-shirt estimate.  “High” might translate to 4–6 developer-months of work, “Medium” ~2–4, “Low” ~1–2.  
- **Cost Ranges:** Largely depends on team size. For example, Phase 2 (High) might be a 1–2 senior dev effort. Pricing tools and APIs (like OpenAI usage) should be monitored (SuperAGI uses a credit system).  
- **Milestones:** Each can have sub-milestones. For instance, Phase 2’s Graph Engine could first support linear workflows, then add branching logic.  
- **Dependencies:** Some features (like observability, scaling) can be built in parallel after core features. Security and compliance can run throughout.  

This roadmap is flexible: exact timeline depends on resources. It should be refined into a Gantt chart in project planning. 

# Testing and Monitoring Plan  
Ensuring reliability in an AI orchestration platform requires thorough testing and observability:  

- **Unit Tests:** Write unit tests for each component: orchestrator logic, agent decision functions, tool invocation routines, and memory modules. Mocks should simulate LLM responses and tool outputs.  
- **Integration Tests:** Simulate full workflows (e.g. “agent creates a ticket and emails user”) in a testing environment. Use end-to-end tests with a test LLM that returns predictable outputs.  
- **Chaos Testing:** For agents that call external APIs, simulate failures (API timeouts, tool errors) to ensure the orchestrator can retry or fail gracefully.  
- **Validation & Monitoring:** Instrument code to capture detailed logs of agent decisions and tool calls. Use a tracing system (e.g. OpenTelemetry) so that each workflow run has a trace ID and timeline.  
- **Metrics:** Define key performance indicators (KPIs): task completion rate, average latency per step, number of manual interventions, error rates (LLM timeouts, hallucination incidents), and user satisfaction ratings (if applicable). Log these metrics and create dashboards (e.g. Grafana).  
- **Drift Detection:** Monitor agent output quality over time. If an agent’s tasks start failing more often or producing nonsensical results, raise alerts. This could involve periodic human audits of a sample of results.  
- **Security Testing:** Include vulnerability scans and penetration tests. Ensure that agent communications cannot be hijacked.  
- **Beta Testing:** Before full release, run a closed beta with real users for at least one or two months. Collect feedback on usability, feature gaps, and any failures not caught in dev tests.  

By combining automated tests, monitoring dashboards, and real-user feedback, Vanes can iteratively improve stability.  Tracing every agent step (as in LangSmith) will make debugging much simpler.

# UX and Interaction Patterns  
A powerful backend needs an intuitive UX. Consider:  

- **Dashboard/Home:** Show active workflows, agent statuses, and key metrics (e.g. queued tasks, completed tasks). Users should quickly grasp “what my agents did today”.  
- **Workflow Builder UI:** For no-code/low-code users, provide a visual workflow editor (drag-and-drop nodes for tasks, conditionals, approvals). Templates can guide non-technical users. AI Agent and SuperAGI both offer visual workflow composition (the former via a “Board” interface, the latter via drag-drop GTM flows).  
- **Chat/Message Interface:** Allow direct conversational interaction with agents, with agent messages clearly labelled (and which agent sent them). Group chats (multi-agent channels) may be useful.  
- **Approval Queues:** A section for human-in-the-loop tasks: e.g. “5 pending approvals” with quick action buttons (Approve/Reject) and context (e.g. agent’s draft). This matches the Fastio pattern of a shared folder or task list.  
- **Agent Profiles:** Pages showing an agent’s configuration (prompt, tools allowed, memory scope). Users could edit an agent’s settings here.  
- **Notifications:** Email or in-app alerts when important events occur (e.g. “Agent X completed task Y”, or “Agent X awaits approval”).  
- **Collaboration:** Support multiple users/roles. For example, a manager might spawn agents, and a compliance officer reviews outputs. Integrate with SSO (OAuth/OIDC) and allow sharing workflows among team members.  
- **Mobile Support & APIs:** As a stretch goal, allow agents to send messages/notifications to mobile apps (like Slack or Teams) or expose a mobile-friendly web portal. Also, provide a developer API so companies can embed Vanes in existing tools (e.g. a web CRM calls Vanes via API to triage leads).  

Through these UX patterns, Vanes can appeal to both technical users (who want detailed control) and non-technical business users (who want point-and-click setup).  The AI Agent and SuperAGI examples show the need for clear terminology (e.g. calling agents “Autopilots” or “AI SDR”) and visual indicators of progress.

# Sources  

Primary sources and recent references were used throughout to ensure up-to-date insights. Key citations include a definition of agentic orchestration, an ODSC roundup of leading frameworks, LangChain documentation on workflows and memory, OpenAI’s multi-agent guide, and practitioner articles on human-in-the-loop design. Competitive analysis draws on vendor literature for AI Agent and SuperAGI. These informed the feature set and architecture design to ensure Vanes incorporates best practices from the latest industry and academic developments.