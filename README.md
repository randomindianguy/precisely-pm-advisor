# Precisely Data Integrity Advisor

**A conversational AI diagnostic tool that helps organizations identify their data integrity gaps and generates a personalized implementation roadmap across Precisely's seven Data Integrity Suite services.**

Built by [Sidharth Sundaram](https://www.linkedin.com/in/sidharthsundaram/) as a prototype for Precisely's AI Product Manager Intern role (Summer 2026).

[View Live](https://precisely-pm-advisor.vercel.app/)

---

## The Problem

Precisely offers seven interoperable cloud services in its Data Integrity Suite: Data Integration, Data Quality, Data Governance, Data Observability, Geo Addressing, Spatial Analytics, and Data Enrichment.

For a prospect evaluating Precisely, the question isn't *whether* they need data integrity — 67% of organizations already don't trust their data. The question is **where to start**.

Today, the answer is: "Engage with our Consulting Services team." That's a scaling bottleneck. Every prospect's first conversation follows the same diagnostic pattern — understand the industry, identify the goal, surface the pain, recommend a starting point. That pattern is productizable.

## The Insight

Through the lens of Fogg's B=MAT framework (Behavior = Motivation × Ability × Trigger):

- **Motivation** already exists — organizations know their data is a problem.
- **Ability** is the blocker — seven services create a paradox of choice that raises mental effort to a point where inaction wins.
- **Trigger** is missing — there's no facilitator that collapses the decision into an obvious next step.

This tool is that facilitator. It reduces the decision from "research all 7 services" to "answer 4 questions."

## How It Works

### Stage 1: Visual Diagnostic Wizard (4 Steps)

| Step | What It Asks | What It Collects | Format |
|------|-------------|-----------------|--------|
| 1 | Your data landscape | Industry + data source scale | Card selectors |
| 2 | What are you building toward? | Primary strategic objective | Single-select with radio indicators |
| 3 | Where does it hurt? | Top 1–3 pain points (mapped to services) | Multi-select checkboxes |
| 4 | One question for you | AI-generated deep-dive, personalized to Steps 1–3 | Typed response |

Steps 1–3 are structured collection — fast, visual, zero typing. Step 4 is where the AI surfaces: it synthesizes the structured inputs and asks the single most diagnostic question a senior consultant would ask. This is the only place the user types, and the only place AI is visible.

### Stage 2: Visual Diagnosis

- **Radar chart** scoring the organization across Precisely's three pillars: Accuracy, Consistency, Context (1–5 scale, lower = larger gap)
- **Service Priority Map** ranking all 7 services by relevance, color-coded by urgency (critical / high / medium / low)
- **Plain-English diagnosis** summarizing the core gap in 2–3 sentences, specific to their situation

### Stage 3: Personalized Roadmap

- **Phase 1 (Months 1–3):** The single most urgent service, with a rationale tied to their specific pain
- **Phase 2 (Months 3–6):** Complementary services that make Phase 1 sustainable
- **Phase 3 (Months 6–12):** Remaining relevant services that unlock advanced capabilities
- Each phase includes a **"You'll know it's working when..."** success signal
- Visual timeline connecting all three phases

## Technical Architecture

- **Frontend:** React (single-file `.jsx`)
- **AI Backend:** Claude Sonnet API — 3 calls total:
  1. Adaptive question generation (after Step 3)
  2. Structured diagnosis (JSON output from conversation data)
  3. Personalized roadmap generation (JSON output from diagnosis + intake)
- **Visualizations:** Recharts (radar chart)
- **Design system:** Custom dark theme, DM Sans + JetBrains Mono typography

### Where AI Earns Its Place vs. Where It Doesn't

| AI-Powered | Deterministic Code |
|-----------|-------------------|
| Adaptive follow-up question (Step 4) | Card selection UI and state management |
| Diagnosis synthesis (unstructured → structured JSON) | Radar chart and service heatmap rendering |
| Personalized roadmap prose | Service dependency logic |
| | Phase color-coding and timeline |

This split is intentional. AI handles the three moments where human-like judgment matters. Clean deterministic code handles everything else. Knowing when *not* to use AI is a product decision.

## How This Maps to the JD

**Initiative 1 — Accelerate a core roadmap feature:**
This tool *is* a product feature Precisely could ship. It sits at the top of the sales funnel, converting website visitors from "I'm interested" to "I know exactly where to start." It replaces the first consulting conversation with a scalable, always-on experience.

**Initiative 2 — Automate a PM workflow via an agent:**
The diagnostic logic demonstrates agent-building skills. The structured intake → AI synthesis → actionable output pipeline is the same pattern that powers internal PM workflow automation (competitive intel, customer conversation prep, segment analysis).

## What I'd Build Next (Internship Scope)

- **Weeks 1–3:** Validate diagnostic logic with real Precisely customers and sales team
- **Weeks 4–8:** Add industry-specific benchmarks, integrate with Precisely's service documentation, expand pain point taxonomy
- **Weeks 9–10:** Build feedback loop tracking which recommendations lead to service adoption
- **Weeks 11–12:** Ship, present learnings, document the methodology

---

*Built with React, Claude API, and Recharts. Frameworks referenced: B=MAT (Fogg), ReCURS prioritization, and systems thinking*
