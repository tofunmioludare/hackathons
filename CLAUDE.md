# CLAUDE.md

## Project Overview

- **Name:** APEX — Agent Prediction Exchange
- **Description:** Agent-to-agent prediction market where AI agents negotiate, create, and settle prediction markets on Hedera
- **Stack:** Node.js ESM, @hiero-ledger/sdk, @anthropic-ai/sdk, Hedera testnet
- **Package Manager:** npm

## Core Behaviors

- Read before writing — understand existing code before modifying it
- Prefer editing existing files over creating new ones
- Run tests after changes to verify correctness
- Keep changes focused — don't refactor unrelated code
- Follow existing patterns in the codebase
- Don't add features beyond what was requested
- **Learn from corrections** — after any correction, update MEMORY.md with the lesson
- **Parallel sessions** — check `git status` for conflicts before editing
- **Load deep context on demand** — check Triggers below when editing unfamiliar areas

## Triggers

| File Pattern | Load |
|---|---|
| src/apex/hedera/* | Read: docs/HEDERA.md |
| src/apex/agents/* | Read: docs/AGENTS.md |
| src/apex/market/* | Read: docs/MARKET.md |
| tests/* | Read: docs/TESTING.md |
| .env.example | Read: docs/CONFIGURATION.md |

## Build & Run Commands

```bash
npm install                        # Install deps
node scripts/createTopics.js       # One-time HCS topic setup
node src/main.js                   # Run APEX
node scripts/runDemo.js            # Run demo market
npm test                           # Run tests
```

## Naming Conventions

| Element | Convention | Example |
|---------|-----------|---------|
| Files | camelCase | `predictionMarket.js` |
| Functions | camelCase | `createTopic()` |
| Classes | PascalCase | `PredictionMarket` |
| Constants | UPPER_SNAKE | `TESTNET_MIRROR_URL` |
| Env vars | UPPER_SNAKE | `HEDERA_ACCOUNT_ID` |

## Architecture

```
src/
├── hedera/
│   ├── client.js      # Hedera client singleton + operator
│   └── topics.js      # HCS create/submit/subscribe helpers
├── agents/            # Anthropic-powered market agents
├── market/            # Prediction market logic + settlement
└── main.js            # Entry point / orchestrator
scripts/
├── createTopics.js    # One-time HCS topic creation
└── runDemo.js         # Demo run
```

## Test-First Development

- Write or update tests before implementation when possible
- Test command: `npm test`
- Never commit with failing tests

## Git Commit Rules

- Use conventional commits: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`
- Stage specific files (never `git add -A`)
- Write commit messages that explain WHY, not just WHAT

## Forbidden Files

Never read, create, commit, or modify:
- `.env` files — use `.env.example` for reference only
- Private keys or credentials
- `node_modules/`, `venv/`, `dist/`

## Environment Variables

Required vars — see `.env.example`. Never log or commit values.
- `HEDERA_ACCOUNT_ID` — testnet account (0.0.XXXXX)
- `HEDERA_PRIVATE_KEY` — DER or hex encoded private key
- `ANTHROPIC_API_KEY` — for agent reasoning
