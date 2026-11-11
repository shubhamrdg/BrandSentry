# BrandSentry — Enterprise Brand Governance Platform

> **Team DviCoders — Hackathon Project**
> An autonomous, in-browser brand governance suite ensuring marketing copy, emails, and product updates strictly adhere to approved claims, executive voice rules, and governed terminology before publication.

**[Live Demo →](https://brandsentry-gamma.vercel.app/)** · **[Repository](https://github.com/shubhamrdg/BrandSentry.git)**

---

## Overview

**BrandSentry** is an end-to-end brand governance platform that runs **100% in-browser** — zero backend, zero API keys, zero authentication, zero build steps. Built with React 18 (CDN), Tailwind CSS, and a pure JavaScript detection engine, it gives content creators and brand reviewers an automated compliance workflow modelled after enterprise B2B SaaS products like **Linear**, **Vercel**, and **GitHub**.

### Design Philosophy

| Principle | Implementation |
|-----------|---------------|
| **Typography** | Inter (primary) + JetBrains Mono (code/metrics). Strict typographic scale with high-contrast primary text (`#0F172A`), muted secondary (`#64748B`). |
| **Surfaces & Depth** | Crisp 1px borders (`border-slate-200/80`) with micro-shadows (`shadow-xs`). Zero heavy drop-shadows or neon AI gradients. |
| **Primary Actions** | Solid slate dark buttons (`bg-slate-900 hover:bg-slate-800 text-white`). |
| **Severity Badges** | Refined soft tones: Rose (Claims/High), Amber (Tone/Medium), Sky (Terminology/Low). |
| **Layout Density** | Compact B2B SaaS density. Professional padding, no bloated card spacing. |

---

## Key Features & Views

### 1. Review Workspace (Default Landing)

The app loads directly into the workspace — no login, no splash screen.

- **Content Formats**: Email Campaign, Web Page / Landing, Social Post.
- **Quick Presets**:
  - **Load Sample Copy**: Pre-fills the standard test copy triggering all 3 violation categories.
  - **Load Extended**: Extended copy to verify dynamically added glossary terms.
- **Split-Screen Layout**: 7:5 asymmetric grid — left panel for the draft editor with a segmented **Draft Editor / Live Inspection** toggle, right panel for the GitHub PR-style issue stream.
- **Live Inspection View**: Non-destructive inline highlights over flagged text using colored tints (`.flag-claim`, `.flag-tone`, `.flag-terminology`) that clear in real time as issues are resolved.
- **GitHub PR-Style Diff Cards**: Each issue shows a line/rule anchor, severity badge, guideline citation (e.g. `Claims Sheet v2.3 §4`), and a `-`/`+` diff preview for the suggested fix.
- **Issue Resolution**:
  - **Accept**: Applies the recommended compliant rewrite instantly.
  - **Edit**: Allows a custom inline replacement.
  - **Dismiss**: Requires a mandatory one-line justification before clearing.
- **Strict Quality Gate**: *"Send for Approval"* stays disabled until every open issue is resolved.

---

### 2. Approval Board (Kanban Governance)

Three-column minimalist Kanban pipeline:

| Column | Description |
|--------|-------------|
| **Pending Review** | Submissions awaiting compliance sign-off. |
| **Approved** | Passed copy marked with approval timestamp. |
| **Sent Back** | Returned to author with mandatory reviewer feedback. |

- **Role Switcher** (top navigation segmented toggle):
  - **Creator Mode**: Read-only pipeline status view.
  - **Reviewer Mode**: Unlocks *Approve* and *Send Back* (with required feedback modal) actions.
- **Reopen & Resubmit Loop**: Sent-back cards have a *"Reopen in Workspace ↩"* button that reloads the draft with the reviewer's comment displayed as a revision banner.

---

### 3. Knowledge Base

Centralized brand guidelines that feed the detection engine in real time:

- **Governed Terminology**: Avoid → Approved pairs (e.g. `Sign-Up Portal` → `Onboarding Portal`, `Customers` → `Members`).
- **Live Add Form**: New terms are picked up by the engine immediately — zero reload needed.
- **Approved Metric Claims**: Verified proof points with source citations (e.g. `"Up to 35% faster in batch-processing tests"` → `Claims Sheet v2.3, section 4`).
- **Brand Voice Charter**: Rules prohibiting street slang (`yo`, `dope`, `gonna`, `lol`, `omg`, `lit`) and repeated exclamation marks to maintain professional tone.

---

### 4. Insights & Session Analytics

- **Live Metric Cards**: Total violations, Claims (High), Tone (Medium), Terminology (Low) — with percentage breakdowns.
- **Segmented Ratio Sparkline**: Linear-style progress bar showing category distribution.
- **Filterable Audit Stream**: Table of every flagged snippet with timestamp, category badge, and resolution status. Filter by `all`, `claim`, `tone`, or `terminology`.

---

## Detection Engine

The core governance engine is a pure, standalone function with zero side effects:

```javascript
reviewContent(text, glossary, claims, voiceRules) → Issue[]
```

### Rule Checks

| # | Category | Severity | Pattern | Action |
|---|----------|----------|---------|--------|
| 1 | **Unsupported Claims** | High | `/\b\d{1,3}x\b/i`, `/\b100%\b/`, `/#1\b/`, `/\bguaranteed\b/i` | Cites approved metrics, recommends benchmark-backed rewrite |
| 2 | **Tone Mismatch** | Medium | Slang words + `/!{2,}/` | Strips slang, normalizes capitalization, enforces professional voice |
| 3 | **Terminology** | Low | Live glossary word-boundary match | Suggests approved term substitution |

---

## Content Lifecycle State Machine

```
[draft] ──(Run Brand Review)──► [in_review] ──(Send for Approval)──► [pending_approval]
                                      ▲                                       │
                                      │                                       ├─(Approve)───► [approved] ✓
                                      │                                       │
                                      └───(Reopen & Resubmit)─── [sent_back] ◄─(Send Back)─┘
```

---

## Responsive Design

| Viewport | Behaviour |
|----------|-----------|
| **Desktop** | Sticky top bar with segmented pill-tab navigation and role switcher. Full split-screen workspace. |
| **Tablet** | Stacked layout with preserved grid structure. |
| **Mobile** | Bottom thumb navigation bar, stacked single-column views, zero horizontal scroll. |

---

## Project Structure

```
BrandSentry/
├── index.html        # Self-contained SPA (all React code inlined for file:// compatibility)
├── app.js            # Modular React components & state management (reference copy)
├── styles.css        # Enterprise design system: fonts, scrollbars, diff styles, flag highlights
├── .gitignore        # OS, IDE, and temporary file exclusions
└── README.md         # This file
```

> **Architecture Note**: All React/JSX code is inlined inside `index.html` within a `<script type="text/babel">` block. This guarantees zero CORS errors when opened via `file://` double-click. The standalone `app.js` file is kept in sync as the canonical reference source.

---

## Quick Start

No Node.js, npm, or dev server required:

```bash
# Clone
git clone https://github.com/shubhamrdg/BrandSentry.git
cd BrandSentry

# Option 1: Just open it
# Double-click index.html in your file explorer

# Option 2: Local server (optional)
npx serve .
# or
python -m http.server 3000
```

Then click **"Load Sample Copy"** → **"Run Brand Review"** to start governing brand copy.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| UI Framework | React 18 (CDN, no build step) |
| Styling | Tailwind CSS (CDN) + custom CSS variables |
| Transpilation | Babel Standalone (CDN, in-browser JSX) |
| Typography | Inter + JetBrains Mono (Google Fonts) |
| Icons | Custom Lucide-style inline SVGs |
| State | React `useState` — fully in-memory, no persistence layer |
| Hosting | Vercel (static deploy) |

---

## Verification Checklist

- [x] App loads directly into Review Workspace — no login or landing page
- [x] "Load Sample Copy" → "Run Brand Review" → all 3 issue types appear with correct severities
- [x] Accept / Edit / Dismiss visibly change issue and draft state
- [x] "Send for Approval" respects the strict quality gate (disabled while issues remain open)
- [x] Approving and Sending Back visibly update the Approval Board columns
- [x] Adding a glossary term in Knowledge Base is picked up immediately by the engine
- [x] Insights reflects real session data, not static numbers
- [x] Fully usable on narrow / phone-width viewports with no horizontal scroll
- [x] Zero dead buttons, zero placeholder text, zero auth code paths

---

**Built by Team DviCoders** · Hackathon 2026
