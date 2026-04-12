# APEX AUDIT — Hackathon PRD
> Immutable AI Agent Audit Trail for Legal Services, built on Hedera Consensus Service

**Deadline:** 10am today (April 11, 2026) · **Build budget:** ~4 hours

---

## 1. Problem Statement

In August 2026 the EU AI Act comes into force. Legal services is explicitly classified as **high-risk AI**. Every AI agent decision touching case assessment, benefits eligibility, contract review, or legal advice must produce a verifiable audit trail. Penalties reach €35 million or 7% of global revenue.

The majority of law firms, government legal departments, and legal AI platforms have **no compliant audit infrastructure**. Worse — there is no infrastructure they *could* use even if they wanted to. AI agent decisions are unattributable: the input received, the reasoning applied, and the output produced disappear when the context window closes.

**Target Users:** Legal AI platform vendors, law firms deploying AI caseworkers, government legal departments, compliance officers.

**Current Solutions:** Database audit logs (mutable, internal, not independently verifiable), PDF reports (not tamper-proof), enterprise logging SaaS (centralised — a court will ask "who controls the server?").

**Why Web3?** The defining property that no Web2 system can provide is **independent verifiability by a third party who trusts neither party**. A regulator, a court, or opposing counsel can independently verify the APEX AUDIT trail using only a topic ID and HashScan. No access to internal systems required. No trust in the operator required. This is structurally impossible with any centralised log.

---

## 2. Solution Overview

APEX AUDIT intercepts the AI agent workflow at three precisely-defined checkpoints and posts a structured JSON message to a Hedera HCS topic at each point. The messages are immutably timestamped and globally sequenced by Hedera network consensus — not by any server APEX controls.

**The three checkpoints:**

1. `CASE_RECEIVED` — agent receives input; SHA-256 hash of the case data logged on-chain
2. `AGENT_RECOMMENDATION` — Claude produces its recommendation; reasoning summary and outcome logged
3. `HUMAN_ATTESTATION` — human reviewer approves or overrides; reviewer ID and decision logged

**The result:** A court-ready, publicly verifiable decision trail. Anyone with the topic ID can query HashScan and reproduce the full sequence independently.

**Demo:** A synthetic Universal Credit (UK benefits) eligibility case. A Claude-powered caseworker agent assesses eligibility. Three HCS messages post in sequence. A live dashboard polls the Hedera mirror node and renders the trail in real time. Judges click a HashScan link and verify on-chain themselves.

**Hackathon Track Alignment:** AI + Compliance, Real-World Utility, Hedera Core Services.

### Key Features (MVP)
1. **HCS Audit Logging** — three-stage decision trail written immutably to HCS
2. **Claude Caseworker Agent** — real Anthropic API call producing structured eligibility recommendation
3. **Live Dashboard** — vanilla HTML/JS polling the Hedera mirror node REST API every 3 seconds, no framework needed
4. **HashScan Verification Link** — direct deep-link so judges can independently verify on-chain

### Non-Goals (v1)
- No HTS token transfers or staking
- No authentication or wallet UI
- No database or persistent storage
- No real case data (synthetic demo only)
- No multi-agent negotiation
- No smart contracts
- No production security hardening

---

## 3. Hedera Integration Architecture

### Network Services Used

| Service | Purpose | Why This Service? |
|---------|---------|-------------------|
| **HCS (TopicCreateTransaction)** | Create the immutable audit topic | Ordered, consensus-timestamped messages — tamper-proof by network design, not by policy |
| **HCS (TopicMessageSubmitTransaction)** | Post the 3 audit checkpoints | Each message gets a globally unique sequence number and running hash — mathematically verifiable |
| **Mirror Node REST API** | Dashboard polling for live updates | Stateless, no SDK needed for reads; base64 message decode is 1 line of JS |

### Ecosystem Integrations

| Platform | Integration | Value |
|----------|-------------|-------|
| **HashScan** | Direct link to topic message trail | Judges can independently verify without any APEX infrastructure — the killer demo moment |

### Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     APEX AUDIT FLOW                     │
│                                                         │
│  Case Input ──► agent.js ──► Claude API                 │
│      │              │           │                       │
│      │         [CASE_RECEIVED]  │                       │
│      │              │     [AGENT_RECOMMENDATION]        │
│      │              │           │                       │
│  Human Review ──────────► [HUMAN_ATTESTATION]           │
│                    │                                    │
│                    ▼                                    │
│           Hedera HCS Topic                              │
│           (immutable, sequenced, timestamped)           │
│                    │                                    │
│                    ▼                                    │
│        Mirror Node REST API                             │
│                    │                                    │
│                    ▼                                    │
│        index.html Dashboard ◄── polls every 3s         │
│        + HashScan deep-link                             │
└─────────────────────────────────────────────────────────┘
```

---

## 4. Hedera Network Impact

### Account Creation
- Every legal AI platform that deploys APEX AUDIT must create a Hedera operator account to write to HCS.
- Target: 50 early-adopter platforms × 1–3 accounts each = **50–150 new accounts** in year 1.

### Active Accounts
- Each deployed instance posts 3 HCS messages per case processed.
- A mid-size legal AI platform processes ~500 cases/month → 1,500 monthly HCS transactions per customer.
- At 50 customers: **75,000 monthly HCS transactions → ~2,500 monthly active accounts** (operators + review agents).

### Transactions Per Second (TPS)
- High-volume legal platforms (NHS, HMRC, large law firms) process thousands of cases daily.
- UK Universal Credit alone processes ~400,000 decisions/month. A 0.1% market share = 400 cases/day = 1,200 daily HCS messages.
- At scale (100 platforms): **~120,000 daily HCS transactions**.

### Audience Exposure
- **Target market:** 10,000+ law firms in the EU required to comply with the AI Act; 500+ legal AI SaaS platforms.
- **New audience for Hedera:** Compliance officers, GovTech buyers, LegalTech VCs — none of whom are in the current Hedera ecosystem.
- **TAM:** €2.1B EU AI Act compliance tooling market (2026–2030 projection).

---

## 5. Innovation & Differentiation

### Ecosystem Gap
No project in the Hedera ecosystem today provides a compliance-grade AI decision audit trail. DeFi and tokenisation dominate. APEX AUDIT brings a completely new vertical — AI governance infrastructure — to Hedera.

### Cross-Chain Comparison
- Ethereum/Polygon: audit log approaches exist but transaction fees and 12-second finality make per-decision logging economically unviable at scale. Hedera's ~$0.0001 per HCS message and 3-5 second finality make it the only viable choice.
- Solana: fast, but no equivalent to HCS ordered message semantics. Mirror node + immutable sequence is uniquely Hedera.
- No direct competitor exists on any chain today.

### Novel Hedera Usage
Using HCS not as a pub/sub event bus (its typical framing) but as a **legal evidence ledger** — where the running hash and sequence number are the proof of non-tampering cited in a compliance submission. This reframes HCS from developer infrastructure to court-admissible record-keeping.

---

## 6. Feasibility & Business Model

### Technical Feasibility
- **Services Required:** HCS only — the simplest Hedera integration possible
- **Team Capabilities:** Node.js, Anthropic SDK, REST APIs — standard modern web stack
- **Technical Risks:** Mirror node latency (~3–5s), Anthropic API cold start
- **Mitigation:** 3-second poll interval in dashboard absorbs mirror node delay; Claude API call is synchronous in the agent flow

### Why Web3 is Required
A centralised audit log answers the question "what does APEX AUDIT's database say happened?" A Hedera HCS trail answers the question "what does the Hedera network's consensus say happened?" — a fundamentally different evidentiary standard. Courts and regulators asking about AI system behaviour under the EU AI Act need the second answer, not the first. Only a distributed consensus network can provide it.

### Business Model (Lean Canvas)

| Element | Description |
|---------|-------------|
| **Problem** | No EU AI Act-compliant audit infrastructure exists; AI decisions are unattributable; internal logs are inadmissible |
| **Solution** | HCS-backed immutable audit trail; three-checkpoint agent interception; HashScan-verifiable |
| **Key Metrics** | Cases audited/month, HCS messages written, compliance certifications issued, time-to-audit-report |
| **Unique Value Prop** | "The only AI audit trail a court can verify without trusting you" |
| **Unfair Advantage** | Hedera's $0.0001/message economics; regulatory deadline creating a forcing function; first-mover in legal AI compliance on Hedera |
| **Channels** | LegalTech conferences (ILTACON, Legal Geek), direct outreach to GovTech AI vendors, EU AI Act compliance consultants |
| **Customer Segments** | Legal AI SaaS platforms (primary), law firms with AI tools (secondary), government legal departments (tertiary) |
| **Cost Structure** | Hedera HCS fees (~$0.0001/message), Anthropic API usage, hosting (~$50/month) |
| **Revenue Streams** | SaaS per-audit pricing ($0.10–$1.00/case audited), compliance report export ($99/month), enterprise plans ($2,000–$10,000/month) |

---

## 7. Execution Plan

### MVP Scope (Hackathon — 4 hours)

| Feature | Priority | Effort | Hedera Service | File |
|---------|----------|--------|----------------|------|
| HCS topic creation | P0 | 20 min | HCS | `scripts/setup.js` |
| Claude caseworker agent + 3 HCS posts | P0 | 90 min | HCS | `src/agent.js` |
| Live mirror node dashboard | P0 | 60 min | Mirror Node REST | `public/index.html` |
| Orchestrator / demo runner | P0 | 30 min | — | `scripts/runDemo.js` |
| Test + fix | P0 | 40 min | — | — |

### Build Order

```
1. scripts/setup.js         (20 min) — create HCS topic, write HEDERA_TOPIC_ID to .env
2. src/agent.js             (90 min) — Claude call + 3 sequential HCS posts
3. public/index.html        (60 min) — vanilla JS polling mirror node, live table + HashScan link
4. scripts/runDemo.js       (30 min) — orchestrate full flow with 3s pauses for demo effect
5. End-to-end test + fix    (40 min)
```

### Design Decisions

| Decision | Options | Choice | Rationale |
|----------|---------|--------|-----------|
| SDK | `@hiero-ledger/sdk` vs `@hashgraph/sdk` | `@hashgraph/sdk` | Better maintained, wider community, same API surface |
| Dashboard | Streamlit vs vanilla HTML | `index.html` with fetch | Zero dependencies, runs anywhere, judges can open file:// |
| Mirror node reads | SDK subscription vs REST polling | REST polling | No persistent connection needed; simpler for demo; 3s interval is fine |
| Message format | Raw string vs JSON | JSON | Structured data enables dashboard rendering and future parsing |
| Case data | Real vs synthetic | Synthetic Universal Credit | Eliminates GDPR risk, still demonstrates real workflow |

### Post-Hackathon Roadmap
- **Month 1–2:** Productise as SDK middleware — `apexAudit.wrap(agent)` intercepts any agent call automatically
- **Month 3–6:** EU AI Act compliance report generator (PDF export from HCS trail), first paying beta customers
- **Month 6–12:** Multi-topic support (per-agent, per-client), SOC 2 audit, enterprise sales to legal AI platforms

---

## 8. Validation Strategy

### Feedback Sources
- **During hackathon:** Judges' reactions to the live HashScan verification moment — does it land? Adjust pitch accordingly.
- **Week 1 post-hackathon:** Post in LegalTech Slack communities (Legal Hackers, LawTech UK), ask: "Would you pay $0.10/case for this?"
- **Month 1:** Outreach to 5 EU-based legal AI vendors currently scrambling for AI Act compliance tooling.

### Validation Milestones

| Milestone | Target | Timeline |
|-----------|--------|----------|
| Judges verify on HashScan live | 3/5 judges click the link | Demo day |
| Positive responses from LegalTech community | 10 upvotes / replies | Week 1 |
| Discovery calls booked | 3 calls | Month 1 |
| Letter of intent / paid trial | 1 customer | Month 2 |

### Market Feedback Cycles
1. **Cycle 1:** Post demo video to LegalTech communities; measure engagement and collect "would you use this?" responses
2. **Cycle 2:** 5 discovery calls with legal AI vendors; validate willingness to pay and pricing model

---

## 9. Go-To-Market Strategy

### Target Market
- **TAM:** €2.1B — all organisations subject to EU AI Act AI system audit requirements
- **SAM:** €420M — legal AI platform vendors and law firms in the EU needing automated compliance tooling
- **Initial Target:** 50 EU-based legal AI SaaS vendors deploying AI to process legal cases before August 2026

### Distribution Channels
1. **Direct developer outreach** — GitHub, LegalTech Slack, Hacker News "Show HN" — reach teams building the AI systems that need auditing
2. **EU AI Act compliance consultants** — they advise law firms; position APEX AUDIT as the recommended technical solution

### Growth Strategy
- Regulatory deadline (August 2026) creates a forcing function — every legal AI platform needs this
- Network effect: every firm that publishes a HashScan topic ID normalises the standard, creating demand from regulators to see it from others

---

## 10. Pitch Outline

1. **The Problem (30s):** "In August 2026, the EU AI Act makes AI audit trails mandatory for legal services. Penalties are €35 million. Right now, no compliant infrastructure exists. We built it."

2. **The Solution (60s):** "APEX AUDIT intercepts AI agent decisions at three points and writes them permanently to Hedera HCS. Input hash. Reasoning summary. Human attestation. Each message is immutably timestamped by network consensus — not by us." *(run demo)*

3. **Hedera Integration (45s):** "We chose Hedera because it's the only network where this is economically viable. €0.0001 per audit message. 3-second finality. And — uniquely — HashScan gives a third party an independent verification URL. A court doesn't need to trust us. They just need this link." *(click HashScan link)*

4. **Traction (30s):** "The EU AI Act creates a forcing function. Legal AI is a €2.1B compliance market being created by regulation. We've already had conversations with [X] — they asked us 'when can we integrate this?'"

5. **The Opportunity (30s):** "$0.10 per case audited. A mid-size legal AI platform processes 10,000 cases a month — that's $1,000/month from a single customer. 50 customers = $50,000 MRR."

6. **The Ask (15s):** "We're raising a pre-seed to productise the SDK and land our first 5 enterprise customers before the August 2026 deadline."

### Key Metrics to Present
- €35M penalty exposure (EU AI Act) — [Source: EU AI Act Article 99]
- €0.0001 per HCS message — [Source: Hedera fee schedule]
- 3–5 second HCS finality — [Source: Hedera documentation]
- €2.1B compliance TAM — [Source: EU AI Act economic impact assessments]

---

## Parking Lot (Post-Hackathon)

- HTS attestation token: mint a non-fungible "compliance certificate" for each completed audit trail
- Scheduled Transactions: auto-escalate un-attested recommendations after 24 hours
- Multi-agent: log cross-agent handoffs (agent A → agent B) with full chain of custody
- IPFS/HFS: store full case documents (hashed) alongside HCS references
- Webhook integration: `POST /audit/wrap` endpoint so any existing legal AI platform can integrate in minutes

---

## Predicted Score Assessment

| Section | Predicted Score | Rationale | How to Improve |
|---------|----------------|-----------|----------------|
| Innovation (10%) | **4/5** | First AI Act compliance audit trail on Hedera; novel reframing of HCS as legal evidence ledger | Add HTS attestation token to claim "previously unseen cross-service usage" |
| Feasibility (10%) | **4/5** | HCS-only stack is maximally simple; regulatory forcing function is strong business model signal | Present Lean Canvas verbally during pitch; name a specific potential customer |
| Execution (20%) | **4/5** | Full working demo with live on-chain verification is strong; single developer is a risk | Ensure dashboard loads cleanly with no errors; add a 60s "happy path" demo script |
| Integration (15%) | **3/5** | Deep HCS usage but only one Hedera service | Adding HashScan as the verification UX is clever but not a Hedera *service* — consider minting an HTS attestation token |
| Validation (15%) | **2/5** | Regulatory deadline is compelling but no external user feedback yet | During hackathon: get 2–3 people outside your team to watch the demo and quote them |
| Success (20%) | **3/5** | Clear account creation and TPS story; niche vertical limits near-term scale | Quantify the "0.1% of Universal Credit = 1,200 HCS messages/day" number in the pitch |
| Pitch (10%) | **5/5** | Regulatory hook, live on-chain verification, clear revenue model — extremely pitchable | Rehearse the HashScan moment so it lands cleanly |

**Projected weighted score: ~73/100**

### Highest-Impact Improvement
Add a single HTS `TokenMintTransaction` at the end of the flow to mint an "AUDIT_COMPLETE" NFT. This lifts Integration from 3→4 and potentially unlocks the "creative cross-service usage" 5 — worth +3 weighted points.

---

## SDK Note

The project uses `@hashgraph/sdk` (not `@hiero-ledger/sdk`). These share the same API surface — `@hashgraph/sdk` is the original package with the largest install base. Run:

```bash
npm install @hashgraph/sdk
```

All `TopicCreateTransaction`, `TopicMessageSubmitTransaction` imports are identical between the two packages.
