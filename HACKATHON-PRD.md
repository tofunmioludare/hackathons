# APEX AUDIT — Product Requirements Document
> Immutable AI Decision Audit Infrastructure · Built on Hedera · LLM-Agnostic via MCP

**Version:** 2.0 — Post-Build PRD  
**Date:** April 2026  
**Stage:** MVP Delivered → Pre-Seed Fundraise

---

## 1. Problem Statement

### The Regulatory Forcing Function

In August 2026, the EU AI Act comes into full enforcement. Legal services, credit scoring, hiring, benefits decisions, and medical triage are all classified as **high-risk AI**. Every automated decision must produce a verifiable, tamper-proof audit trail with human oversight documentation. Penalties reach **€35 million or 7% of global revenue**.

**The infrastructure gap is total.** There is no compliant audit trail product available today — not because nobody thought of it, but because the requirements are structurally unsatisfiable by centralised systems. A court or regulator asking "what did this AI decide, why, and who approved it?" needs an answer that cannot be altered by the operator. No database, no SaaS log, no PDF report can provide that.

### The AI Agent Accountability Crisis

Beyond compliance, the broader AI industry has a trust problem. As AI agents make decisions at scale — legal judgements, financial recommendations, medical triage — there is no standard for attributing, verifying, or disputing those decisions after the fact. The input disappears. The reasoning disappears. The approval record exists only in whoever's database they control.

### Target Users

| Segment | Pain | Urgency |
|---------|------|---------|
| Legal AI SaaS vendors | Must provide audit trail to clients before Aug 2026 | Critical |
| Law firms deploying AI caseworkers | Liability exposure without verified decision records | High |
| Government legal departments | Parliamentary / FOI accountability requirements | High |
| AI compliance officers | No tooling exists to satisfy Art. 14/17 requirements | Critical |
| Any enterprise deploying high-risk AI | Same EU AI Act requirements apply across sectors | Medium–High |

---

## 2. Solution Overview

APEX AUDIT is **AI decision audit infrastructure** — not a legal tool, not an AI model, not a compliance SaaS dashboard. It is the layer that sits between any AI agent and the permanent record of what that agent decided.

### The Three-Checkpoint Audit Trail

Every case processed through APEX AUDIT generates three immutable records on Hedera HCS:

```
CASE_RECEIVED          ──► SHA-256 hash of all input data locked on-chain
AGENT_RECOMMENDATION   ──► Claude reasoning summary, outcome, confidence logged
HUMAN_ATTESTATION      ──► Reviewer ID, decision (APPROVED/REJECTED), note logged
```

Each message is ordered, consensus-timestamped, and assigned a globally unique sequence number by the Hedera network — not by APEX AUDIT. The running hash across messages makes any gap or tampering mathematically detectable. This is the evidentiary standard courts require.

### What We Actually Built (MVP)

**`src/agent.js`** — Claude-powered legal caseworker that runs the full 3-checkpoint audit flow. Accepts any structured case data, calls `claude-opus-4-6`, posts results to HCS. Exports `runCasePhase1`, `runAttestation`, `runAuditedCase`.

**`src/mcp-server.js`** — Model Context Protocol server exposing three tools:
- `apex_log_case` — submit a case, get CASE_RECEIVED + AGENT_RECOMMENDATION on HCS
- `apex_attest` — record human attestation, completing the Art. 14 chain
- `apex_run_audit` — full automated 3-checkpoint flow in one call

**`server.js`** — HTTP dashboard server with endpoints:
- `POST /run-case` — trigger Phase 1 async, immediate 202 response
- `POST /attest` — record Phase 2 attestation
- `GET /pending` — list cases awaiting human review

**`public/index.html`** — Full case management dashboard:
- File upload with SHA-256 hashing in-browser (content never leaves client)
- Active, Pending Review, and Completed case queues
- Urgent case auto-processing (workflow triggers automatically on open)
- Standard case manual trigger (reviewer controls timing)
- Real-time HCS checkpoint timeline per case
- HashScan deep-links on every confirmed checkpoint
- Dark mode, case detail view, attestation panel

**`src/hedera/`** — Hedera client singleton and HCS helpers (create, submit, subscribe, query)

**`scripts/`** — One-time setup (`setup.js`), topic creation (`createTopics.js`), demo runner (`runDemo.js`)

### The MCP Differentiator — LLM-Agnostic Audit Infrastructure

This is the feature that separates APEX AUDIT from every other AI compliance tool announced for the EU AI Act.

**Every other solution is locked to one LLM vendor.** They call OpenAI, or Anthropic, or Mistral, and wrap the output in their own logging format.

APEX AUDIT's MCP server means **any MCP-compatible AI client can trigger a legally compliant, Hedera-verified audit trail without knowing anything about the underlying infrastructure.** Claude, GPT-4o, Gemini, Llama 3 via a local bridge — any of them can call `apex_log_case` and get the same immutable HCS record.

This is not a minor technical detail. It means:
- A firm running GPT-4o for contract review can use APEX AUDIT
- A government department running a locally-hosted Llama model can use APEX AUDIT
- A legal AI platform running five different models for different jurisdictions can use APEX AUDIT
- **APEX AUDIT becomes the compliance layer for the entire AI ecosystem, not just one LLM's customers**

The MCP protocol is becoming the standard tool interface for AI agents. Being compliant with it from day one means APEX AUDIT is infrastructure — like an API — not a SaaS product tied to one vendor's ecosystem.

---

## 3. Hedera Integration Architecture

### Network Services — Current (MVP)

| Service | How Used | Depth |
|---------|----------|-------|
| **HCS — TopicCreateTransaction** | Create immutable per-client audit topics with admin key | Core |
| **HCS — TopicMessageSubmitTransaction** | Post the 3 structured JSON checkpoints per case | Core |
| **HCS — TopicMessageQuery** | Subscribe to topic for real-time dashboard updates | Core |
| **HCS — TopicInfoQuery** | Query topic state for dashboard meta | Supporting |
| **Mirror Node REST API** | Dashboard polling for confirmed messages, sequence numbers | Supporting |
| **HashScan** | Deep-link verification URL on every confirmed checkpoint | UX / Verification |

### Network Services — Roadmap (Phase 2: Agentic Commerce)

| Service | Purpose | Phase |
|---------|---------|-------|
| **HTS — TokenCreateTransaction** | Mint `AUDIT_CERT` NFT on completion of each 3-checkpoint trail | Phase 2 |
| **HTS — TokenMintTransaction** | Issue compliance certificates as transferable on-chain assets | Phase 2 |
| **HTS — Custom Fees** | Attach per-audit royalty fee to token transfers for revenue | Phase 2 |
| **HBAR Micropayments** | Pay-per-audit billing — each `apex_run_audit` tool call settles in HBAR | Phase 2 |
| **Scheduled Transactions** | Auto-escalate un-attested recommendations after configurable SLA | Phase 2 |
| **Smart Contracts (EVM)** | Chainlink oracle integration for regulatory threshold feeds | Phase 3 |

### Ecosystem Integrations — Roadmap

| Partner | Integration | Value |
|---------|-------------|-------|
| **HashPack** | Wallet connect for reviewer identity and HBAR payment signing | Reviewer authentication, payment UX |
| **Chainlink** | Price feeds for HBAR/EUR billing, regulatory threshold data feeds | Reliable billing, automated compliance thresholds |
| **SaucerSwap** | HBAR liquidity for agentic commerce settlement | Enables agents to acquire HBAR for audit payments autonomously |

### Architecture — Current

```
┌──────────────────────────────────────────────────────────────────┐
│                       APEX AUDIT v1 FLOW                         │
│                                                                  │
│  ┌─────────────┐    MCP Tool Call      ┌──────────────────────┐  │
│  │ Any LLM     │ ──────────────────►   │  src/mcp-server.js   │  │
│  │ (Claude,    │   apex_log_case        │  (MCP stdio server)  │  │
│  │  GPT-4o,    │   apex_attest          └──────────┬───────────┘  │
│  │  Gemini,    │   apex_run_audit                  │              │
│  │  Llama...)  │                                   ▼              │
│  └─────────────┘                       ┌──────────────────────┐  │
│                                        │    src/agent.js      │  │
│  ┌─────────────┐    HTTP POST          │  (Claude caseworker) │  │
│  │  Dashboard  │ ──────────────────►   │  + HCS checkpoints   │  │
│  │  (browser)  │   /run-case           └──────────┬───────────┘  │
│  │             │   /attest                        │              │
│  │  File Upload│◄──────────────────               ▼              │
│  │  Case Queue │   /pending            ┌──────────────────────┐  │
│  │  Attestation│                       │   Hedera HCS Topic   │  │
│  └─────────────┘                       │  CASE_RECEIVED #n    │  │
│                                        │  AGENT_REC    #n+1   │  │
│                                        │  HUMAN_ATTEST #n+2   │  │
│                                        └──────────┬───────────┘  │
│                                                   │              │
│                                         Mirror Node + HashScan   │
└──────────────────────────────────────────────────────────────────┘
```

### Architecture — Phase 2: Agentic Commerce

```
┌──────────────────────────────────────────────────────────────────┐
│                   APEX AUDIT v2 — AGENTIC COMMERCE               │
│                                                                  │
│  AI Agent calls apex_run_audit via MCP                           │
│        │                                                         │
│        ▼                                                         │
│  Smart Contract verifies HBAR payment (Chainlink price feed)     │
│        │                                                         │
│        ▼                                                         │
│  3-checkpoint HCS audit trail written                            │
│        │                                                         │
│        ▼                                                         │
│  HTS NFT minted → AUDIT_CERT token sent to client wallet         │
│        │                                                         │
│        ▼                                                         │
│  HashPack: reviewer signs attestation with wallet identity       │
│        │                                                         │
│        ▼                                                         │
│  Chainlink: regulatory threshold breach → auto-escalation        │
│        │                                                         │
│        ▼                                                         │
│  SaucerSwap: agent acquires HBAR liquidity for next audit        │
└──────────────────────────────────────────────────────────────────┘
```

---

## 4. Hedera Network Impact

### Account Creation

| Source | Accounts | Timeline |
|--------|----------|----------|
| Each legal AI platform deploying APEX AUDIT | 1–3 operator accounts | Year 1 |
| Each enterprise customer with multi-client setup | 1 account per client shard | Year 1–2 |
| Phase 2: each reviewer using HashPack identity | 1 account per human reviewer | Year 2 |
| Phase 2: each autonomous AI agent billing in HBAR | 1 account per agent instance | Year 2–3 |

**Year 1 target:** 50 platforms × 2 accounts = **100–150 new Hedera accounts**  
**Year 2 target (Phase 2):** +500 reviewer accounts + agent accounts = **650+ accounts**

### Transaction Volume

| Scenario | HCS Messages/Month | Notes |
|----------|--------------------|-------|
| 1 mid-size legal AI platform (500 cases/month) | 1,500 | 3 per case |
| 10 platforms onboarded | 15,000 | — |
| 50 platforms (Year 1 target) | 75,000 | — |
| NHS / HMRC equivalent (400k decisions/month at 0.1% share) | 1,200/day | ~36,000/month |
| Phase 2: HTS mint per completed audit | +1 per case | Additional TPS |

**Year 1 steady state:** ~75,000–120,000 HCS messages/month across 50 customers.

### New Audiences for Hedera

APEX AUDIT brings three entirely new buyer categories to the Hedera ecosystem — none of whom are currently Hedera users:

1. **GovTech procurement officers** — EU government AI compliance budgets are in the hundreds of millions
2. **Legal AI SaaS CFOs** — signing 3-year compliance infrastructure contracts
3. **EU AI Act compliance consultants** — recommending tooling stacks to hundreds of clients each
4. **Enterprise AI teams** — deploying LLMs at scale outside the crypto/DeFi space

---

## 5. Innovation & Differentiation

### What Doesn't Exist Yet

No project in the Hedera ecosystem, and no project on any other blockchain, currently provides:
- A **multi-LLM, MCP-native** audit trail
- **Three-checkpoint AI decision logging** mapped explicitly to EU AI Act Art. 14 (human oversight) and Art. 17 (quality management)
- A **file upload → hash → AI analysis → HCS log → attestation** end-to-end workflow

### The MCP Moat

The Model Context Protocol is emerging as the standard interface for AI tool use. Anthropic released it, but Google, Microsoft, and the open-source community are all converging on it. By building APEX AUDIT as an MCP server today:

- Any AI assistant that supports MCP can call our tools with zero integration effort
- We become **infrastructure**, not a point solution — the same positioning as Stripe (payment infrastructure) or Twilio (communication infrastructure)
- No competitor can replicate this without rebuilding from scratch against a protocol that's already deployed

### Why Hedera vs. Other Chains

| Property | Hedera | Ethereum | Solana |
|----------|--------|----------|--------|
| Cost per HCS message | ~$0.0001 | ~$0.50–$5.00 | N/A (no equivalent) |
| Finality | 3–5 seconds | 12–64 seconds | ~0.4s but probabilistic |
| Ordered message semantics | ✓ Native HCS | ✗ | ✗ |
| Running hash proof | ✓ Native HCS | ✗ | ✗ |
| Legal evidence framing | ✓ Sequence + hash | Complex, expensive | Unsuitable |

Hedera is the only viable choice for per-decision audit logging at scale. This is not a marketing claim — it is an economic fact. At $5 per Ethereum transaction, logging every AI decision is impossible for any real business.

### Novel Hedera Usage

- **HCS as legal evidence ledger** — reframing the running hash and sequence number as court-admissible proof of non-tampering, not just a developer pub/sub mechanism
- **MCP-to-HCS bridge** — first published implementation connecting the MCP tool protocol directly to HCS, making Hedera compliance infrastructure accessible to every LLM ecosystem
- **Phase 2: Agentic commerce on Hedera** — AI agents autonomously paying for audit services in HBAR, acquiring liquidity via SaucerSwap, and settling compliance obligations without human payment intervention

---

## 6. Feasibility & Business Model

### Technical Feasibility

| Component | Stack | Status |
|-----------|-------|--------|
| HCS audit logging | `@hashgraph/sdk` v2.81 | ✅ Built and tested |
| Claude caseworker agent | `@anthropic-ai/sdk` v0.40 | ✅ Built and tested |
| MCP server | `@modelcontextprotocol/sdk` v1.29 | ✅ Built and tested |
| Dashboard + case management | Vanilla HTML/JS, no framework | ✅ Built and tested |
| File upload + SHA-256 hashing | SubtleCrypto API (browser-native) | ✅ Built and tested |
| Urgent/Standard case routing | Frontend state + polling | ✅ Built and tested |

**Technical risks and mitigations:**

| Risk | Mitigation |
|------|-----------|
| Mirror node latency (3–5s) | Poll interval absorbs delay; dashboard shows "Analysing…" state |
| Claude API cold start | 202 async response pattern — user never blocks on API call |
| MCP client compatibility | Tested against Claude Desktop; stdio transport is universal |
| HEDERA_TOPIC_ID misconfiguration | `scripts/setup.js` auto-writes to .env |

### Why Web3 is Structurally Required

A centralised audit log answers: *"What does APEX AUDIT's database say happened?"*  
A Hedera HCS trail answers: *"What does global network consensus say happened?"*

These are different evidentiary standards. Courts and regulators enforcing the EU AI Act need the second answer. The EU AI Act's Art. 17 quality management requirement specifically contemplates records that cannot be altered by the operator — this is structurally impossible with any centralised system.

### Business Model — Lean Canvas

| Element | Description |
|---------|-------------|
| **Problem** | No EU AI Act-compliant AI decision audit infrastructure exists; AI decisions are unattributable; internal logs are inadmissible as independent evidence |
| **Solution** | MCP-native, LLM-agnostic audit trail on Hedera HCS; three-checkpoint Art. 14/17 workflow; HashScan-verifiable by any third party |
| **Key Metrics** | Cases audited/month · HCS messages written · Compliance certs issued · MCP tool calls/month · HBAR payment volume (Phase 2) |
| **Unique Value Prop** | "The only AI audit trail any court can verify — for any LLM, via MCP, at $0.0001 per decision" |
| **Unfair Advantage** | MCP-native from day one · Hedera economics make per-decision logging viable · August 2026 deadline creates captive demand · First-mover in legal AI compliance on Hedera |
| **Channels** | MCP tool registry · LegalTech conferences (ILTACON, Legal Geek) · EU AI Act compliance consultants · Direct outreach to legal AI SaaS vendors |
| **Customer Segments** | Legal AI SaaS platforms (primary) · Enterprise AI compliance teams (secondary) · Government legal departments (tertiary) · Any MCP-compatible AI workflow (Phase 2) |
| **Cost Structure** | Hedera HCS fees (~$0.0001/message) · Anthropic API usage · Hosting ($50–200/month) · Phase 2: smart contract deployment |
| **Revenue Streams** | Per-audit pricing ($0.10–$1.00/case) · Compliance report export ($99/month) · Enterprise plan ($2,000–$10,000/month) · Phase 2: HBAR micropayments per MCP tool call |

---

## 7. Execution Plan

### MVP — Delivered ✅

| Feature | Status | Hedera Service |
|---------|--------|----------------|
| HCS topic creation + setup | ✅ | HCS |
| Claude caseworker agent + 3 HCS checkpoints | ✅ | HCS |
| MCP server (3 tools) | ✅ | HCS via agent.js |
| Dashboard + case management UI | ✅ | Mirror Node |
| File upload + in-browser SHA-256 hashing | ✅ | — |
| Active / Pending / Completed case queues | ✅ | — |
| Urgent auto-process, Standard manual trigger | ✅ | — |
| HashScan deep-links per checkpoint | ✅ | HashScan |
| Dark mode, responsive layout | ✅ | — |
| Demo runner script | ✅ | — |

### Phase 2 Roadmap — Agentic Commerce (Months 1–6)

| Feature | Hedera Service | Partner | Value |
|---------|---------------|---------|-------|
| `AUDIT_CERT` NFT mint on audit completion | HTS — TokenMint | — | Transferable compliance certificate; new asset class |
| HBAR micropayment per audit | HBAR transfer | — | Pay-per-use billing without credit cards or subscriptions |
| HashPack wallet connect for reviewer identity | HTS + HBAR | HashPack | Cryptographically verified reviewer identity on-chain |
| Chainlink HBAR/EUR price feed | Smart Contract + Chainlink | Chainlink | Fixed-EUR billing settled in HBAR; no exchange rate risk for customers |
| Chainlink regulatory threshold feeds | Smart Contract + Chainlink | Chainlink | Auto-trigger escalation when AI confidence drops below regulatory threshold |
| SaucerSwap HBAR liquidity for agents | Smart Contract | SaucerSwap | AI agents acquire HBAR autonomously to pay for audits — fully agentic commerce |
| Scheduled Transaction auto-escalation | Scheduled Transactions | — | Un-attested cases escalate automatically after configurable SLA |

### Phase 3 Roadmap — Scale (Months 6–18)

| Feature | Description |
|---------|-------------|
| SDK middleware: `apexAudit.wrap(agent)` | One-line integration wrapping any AI agent call with automatic audit trail |
| Multi-topic architecture | Per-client or per-jurisdiction isolated topic namespaces |
| Webhook integration | `POST /audit/wrap` for existing legal AI platforms with no code change |
| HFS document anchoring | Full case documents stored on Hedera File Service, referenced from HCS |
| SOC 2 Type II audit | Enterprise sales requirement |
| Multi-agent chain of custody | Log handoffs between AI agents with full attribution |

### Design Decisions

| Decision | Options | Choice | Rationale |
|----------|---------|--------|-----------|
| Transport | HTTP server vs MCP | Both | Dashboard for human UX; MCP for agent-to-agent integration |
| LLM coupling | Anthropic-only vs MCP-native | MCP-native | Any LLM can call tools; Claude is the default implementation only |
| Case routing | Single queue vs priority split | Urgent/Standard split | Maps to real legal workflow; Urgent auto-processes, Standard awaits review |
| File hashing | Server-side vs browser | Browser (SubtleCrypto) | File content never leaves client; only hash goes to server and HCS |
| SDK | `@hiero-ledger/sdk` vs `@hashgraph/sdk` | `@hashgraph/sdk` | Largest install base; identical API surface |

---

## 8. Validation Strategy

### Current Traction

- MVP is **fully functional and deployed** to GitHub
- End-to-end flow verified: file upload → Claude analysis → HCS log → attestation → HashScan verification
- MCP server tested with Claude Desktop via `.mcp.json` config

### Validation Plan

| Milestone | Target | Timeline |
|-----------|--------|----------|
| Judges verify live on HashScan | 3/5 judges click the link | Demo day |
| Judges call out MCP as differentiator | Unprompted mention in Q&A | Demo day |
| LegalTech community engagement | 10+ upvotes / responses on Show HN or Legal Hackers Slack | Week 1 |
| Discovery calls booked | 3 calls with legal AI vendors | Month 1 |
| Letter of intent | 1 customer LOI | Month 2 |
| Paid trial | 1 paying customer | Month 3 |
| MCP tool registry listing | APEX AUDIT listed as verified MCP server | Month 1 |

### Market Feedback Cycles

1. **Cycle 1 (Demo day):** Pitch the EU AI Act deadline + live HashScan moment. Measure: do judges understand the compliance value immediately? Does the MCP angle land?
2. **Cycle 2 (Week 1):** Post to Legal Hackers Slack, LawTech UK, Hacker News. Ask: "Would you pay $0.10/case for an independently verifiable AI audit trail?" Measure: sentiment, price sensitivity, use-case variety in responses.
3. **Cycle 3 (Month 1):** 5 discovery calls with EU legal AI vendors. Validate: integration path, pricing model, procurement timeline, who owns the compliance budget.

---

## 9. Go-To-Market Strategy

### Target Market

| Market | Size | Notes |
|--------|------|-------|
| **TAM** | €2.1B | All organisations subject to EU AI Act AI system audit requirements |
| **SAM** | €420M | Legal AI platform vendors + law firms in EU needing automated compliance tooling |
| **SOM (Year 1)** | €5M | 50 EU-based legal AI SaaS vendors + 10 enterprise deployments |

### Distribution

1. **MCP tool registry** — list APEX AUDIT as a verified MCP server; any developer building with MCP discovers it organically
2. **Direct developer outreach** — GitHub, LegalTech Slack, "Show HN" — reach teams building the AI systems that need auditing
3. **EU AI Act compliance consultants** — they advise dozens of firms each; a single partnership multiplies reach
4. **Conference presence** — ILTACON, Legal Geek, EU AI Act compliance summits (Q3–Q4 2026)

### Competitive Moat

```
MCP-native (LLM-agnostic) × Hedera economics ($0.0001/message) × Regulatory deadline (Aug 2026)
= Infrastructure position before any competitor ships
```

No competitor can reach this position without:
- Rebuilding their product as an MCP server (6+ months)
- Migrating to Hedera from whatever chain they started on
- Racing against a regulatory deadline that creates captive demand right now

---

## 10. Pitch Outline

### The Pitch (3 minutes)

**1. The Problem (30s)**
> "In August 2026, the EU AI Act makes AI audit trails mandatory for high-risk decisions — legal, financial, medical, benefits. Penalties are €35 million. Right now, no infrastructure exists that a court can independently verify. We built it."

**2. The Demo (60s)**
> "Watch this." *(Upload a case. Show Claude analysing. Show the HCS checkpoint timeline appearing in real time. Click HashScan link.)*
> "That's a permanently recorded, court-verifiable AI decision trail. SHA-256 hash of the input. Claude's reasoning. Human attestation. All on Hedera HCS — not on our servers. Anyone can verify this with just a topic ID."

**3. The MCP Differentiator (30s)**
> "Here's what makes this infrastructure, not a point solution. We implemented the Model Context Protocol. That means this isn't just for Claude. GPT-4o, Gemini, Llama, any MCP-compatible AI — they all call `apex_log_case` and get the same Hedera-verified audit trail. We're not in the LLM business. We're the compliance layer underneath all of them."

**4. The Business (30s)**
> "$0.10 per case audited. A mid-size legal AI platform processes 10,000 cases a month — $1,000/month per customer. Our Phase 2 roadmap adds HBAR micropayments — AI agents pay per audit autonomously, via HashPack wallet integration and Chainlink price feeds for EUR-settled billing. Zero human payment friction."

**5. The Opportunity (15s)**
> "€2.1 billion compliance market. August 2026 enforcement. First-mover on Hedera. We're raising pre-seed to land 5 enterprise customers before the deadline."

### Key Numbers to Present

| Metric | Value | Source |
|--------|-------|--------|
| EU AI Act penalty | €35M or 7% global revenue | EU AI Act Art. 99 |
| HCS message cost | ~$0.0001 | Hedera fee schedule |
| HCS finality | 3–5 seconds | Hedera documentation |
| Compliance market TAM | €2.1B (2026–2030) | EU AI Act economic impact assessments |
| Ethereum equivalent cost | ~$0.50–$5.00 per log | Etherscan gas tracker |

---

## 11. Non-Goals (Current Version)

- No real case data — synthetic demo only (eliminates GDPR risk for demo)
- No production authentication or access control
- No persistent storage (in-memory pendingCases — stateless restart)
- No multi-tenant isolation between customers
- No HBAR payments (Phase 2)
- No HTS token minting (Phase 2)
- No smart contracts (Phase 3)

---

## Predicted Score Assessment

| Section | Predicted Score | Rationale | How to Improve |
|---------|----------------|-----------|----------------|
| **Innovation (10%)** | **5/5** | MCP-native + Hedera = genuinely novel in any ecosystem; reframing HCS as legal evidence ledger; first AI governance infrastructure on Hedera | This is already a 5 — demonstrate it clearly in the pitch |
| **Feasibility (10%)** | **4/5** | Fully working MVP; regulatory forcing function is real; team demonstrated delivery; no dependency on anything not built | Name a specific potential customer in the pitch; "we've had a conversation with [X]" |
| **Execution (20%)** | **4/5** | End-to-end working demo; polished dashboard with dark mode, case management, file upload; urgent/standard routing shows product thinking | Fix the in-memory persistence before demo (add a JSON file store); ensure zero console errors on live demo |
| **Integration (15%)** | **4/5** | Deep HCS usage; MCP bridge is novel; HashScan verification UX is strong | Add one HTS `TokenMintTransaction` for the AUDIT_CERT NFT — lifts to 5/5 by showing multi-service usage |
| **Validation (15%)** | **3/5** | Regulatory deadline is strong structural validation; no external user feedback yet | Get 2–3 people outside the team to watch the demo and quote them: "a solicitor at X said..." |
| **Success (20%)** | **4/5** | Clear account creation story; Phase 2 HBAR + SaucerSwap path shows Hedera network growth; MCP means any LLM ecosystem drives Hedera transactions | Quantify the Phase 2 agentic commerce TPS in the pitch; "every GPT-4o audit call = 3 Hedera transactions" |
| **Pitch (10%)** | **5/5** | Regulatory hook is undeniable; live HashScan moment is the killer demo; MCP differentiator is clear and defensible; Phase 2 roadmap is credible | Rehearse so the HashScan click happens in under 5 seconds |

**Projected weighted score: ~81/100**

### Highest-Impact Actions Before Demo Day

1. **Add HTS AUDIT_CERT NFT mint** (2 hours) — lifts Integration from 4→5 (+1.5 weighted points)
2. **Add a JSON file store for pendingCases** (1 hour) — removes the obvious "what happens on restart" question from judges
3. **Get one external quote** — send the demo to one lawyer or compliance officer and quote their reaction verbatim in the pitch (+Validation)
4. **Rehearse the HashScan moment** — open HashScan on a second screen, have the topic ID ready, click the link live without fumbling

---

## Appendix: SDK and Environment Reference

```bash
npm install                        # Install all dependencies
node scripts/setup.js              # One-time: create HCS topic, write HEDERA_TOPIC_ID to .env
node scripts/createTopics.js       # (Alternative) Create named topics
node src/mcp-server.js             # Run MCP server (stdio transport)
node server.js                     # Run dashboard server (http://localhost:3000)
node scripts/runDemo.js            # Run full demo audit flow
npm test                           # Run test suite
```

**Required environment variables** (see `.env.example`):
```
HEDERA_ACCOUNT_ID=0.0.XXXXX
HEDERA_PRIVATE_KEY=<DER or hex encoded ECDSA key>
HEDERA_TOPIC_ID=0.0.XXXXX
ANTHROPIC_API_KEY=sk-ant-...
```

**MCP client config** (`.mcp.json` in project root — already configured):
```json
{
  "mcpServers": {
    "apex-audit": {
      "command": "node",
      "args": ["/absolute/path/to/apex/src/mcp-server.js"],
      "env": { "HEDERA_ACCOUNT_ID": "...", "HEDERA_PRIVATE_KEY": "...", "HEDERA_TOPIC_ID": "...", "ANTHROPIC_API_KEY": "..." }
    }
  }
}
```
