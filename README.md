# BrandSentry — Enterprise Brand Governance Platform

> **Team DviCoders — Hackathon Submission**  
> An autonomous, client-side brand governance platform ensuring marketing copy, emails, and landing pages strictly comply with verified performance claims, executive voice rules, and governed terminology before release.

**[Live Web Application →](https://brandsentry-gamma.vercel.app/)** · **[GitHub Repository](https://github.com/shubhamrdg/BrandSentry.git)**

---

## Table of Contents

1. [Executive Summary & Core Value](#executive-summary--core-value)
2. [High-Level Architecture](#high-level-architecture)
3. [The Brand Detection Engine (`window.reviewContent`)](#the-brand-detection-engine-windowreviewcontent)
   - [Escaping Utility](#escaping-utility)
   - [Rule 1: Unsupported Claims Detection](#rule-1-unsupported-claims-detection-high-severity)
   - [Rule 2: Tone Mismatch Detection & Neutralization](#rule-2-tone-mismatch-detection--neutralization-medium-severity)
   - [Rule 3: Terminology Inconsistency Detection](#rule-3-terminology-inconsistency-detection-low-severity)
   - [Issue Data Schema](#issue-data-schema)
4. [Data Models & In-Memory Store](#data-models--in-memory-store)
   - [ContentItem Schema](#contentitem-schema)
   - [Knowledge Base Schemas](#knowledge-base-schemas)
   - [Preloaded Seed State](#preloaded-seed-state)
5. [Finite State Machine & Governance Workflow](#finite-state-machine--governance-workflow)
   - [State Diagram](#state-diagram)
   - [Transition Rules & Quality Gates](#transition-rules--quality-gates)
6. [Detailed Component Breakdown](#detailed-component-breakdown)
   - [Shell: `BrandSentryApp`](#shell-brandsentryapp)
   - [View 1: `ReviewWorkspaceView`](#view-1-reviewworkspaceview)
     - [Non-Destructive Live Inspection Algorithm](#non-destructive-live-inspection-algorithm)
     - [GitHub PR-Style Diff Cards (`IssueDiffView`)](#github-pr-style-diff-cards-issuediffview)
     - [Issue Action Mechanics (Accept, Edit, Dismiss)](#issue-action-mechanics-accept-edit-dismiss)
     - [Strict Quality Gate Logic](#strict-quality-gate-logic)
   - [View 2: `ApprovalBoardView`](#view-2-approvalboardview)
     - [Kanban Column Filtering](#kanban-column-filtering)
     - [Role-Based Access Control (Creator vs Reviewer)](#role-based-access-control-creator-vs-reviewer)
     - [Rejection Modal & Mandatory Feedback](#rejection-modal--mandatory-feedback)
     - [Reopen & Resubmit Loop](#reopen--resubmit-loop)
   - [View 3: `KnowledgeBaseView`](#view-3-knowledgebaseview)
     - [Live In-Memory Terminology Injection](#live-in-memory-terminology-injection)
   - [View 4: `InsightsView`](#view-4-insightsview)
     - [Live Telemetry Aggregator](#live-telemetry-aggregator)
     - [Segmented Ratio Sparkline](#segmented-ratio-sparkline)
     - [Interactive Audit Stream Table](#interactive-audit-stream-table)
7. [Enterprise Design System & Styling](#enterprise-design-system--styling)
8. [End-to-End User Journeys (Walkthroughs)](#end-to-end-user-journeys-walkthroughs)
9. [Verification & Hackathon Checklist](#verification--hackathon-checklist)
10. [Local Development & Zero-CORS Setup](#local-development--zero-cors-setup)

---

## Executive Summary & Core Value

In fast-paced organizations, marketing, product, and sales teams frequently publish customer-facing communications across multiple channels. Without continuous oversight, three costly risks emerge:
1. **Legal & Compliance Exposure**: Exaggerated, unverified metric claims (e.g. *"10x faster"*, *"100% guaranteed"*) invite regulatory scrutiny and breach advertising standards.
2. **Brand Dilution**: Casual street slang, emojis, or multiple exclamation marks erode an executive enterprise brand identity.
3. **Product Terminology Inconsistency**: Legacy terms (e.g. *"Sign-Up Portal"*, *"Customers"*) confuse buyers and undermine newly launched product positioning.

**BrandSentry** solves this by inserting an automated, real-time governance checkpoint directly into the drafting workflow. It acts like an intelligent linter for brand identity, enforcing strict citations, professional tone, and controlled terminology before any copy can be submitted for release.

---

## High-Level Architecture

BrandSentry is engineered as a **100% client-side, zero-backend Single-Page Application (SPA)** with no build steps, no API keys, and no authentication walls.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            Browser Client Runtime                           │
│                                                                             │
│  ┌───────────────────────┐   ┌───────────────────────────────────────────┐  │
│  │ Pure Detection Engine │   │            React 18 Shell                 │  │
│  │ (window.reviewContent)│◄──┤          (BrandSentryApp)                 │  │
│  └──────────┬────────────┘   └──────┬────────────┬───────────┬───────────┘  │
│             │                       │            │           │              │
│             ▼                       ▼            ▼           ▼              │
│    Issue Array Stream      Review Workspace  Approval   Knowledge  Insights │
│   (Claim / Tone / Term)      (Split View)     Board       Base     (Session)│
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ Tailwind CSS CDN + Google Fonts (Inter + JetBrains Mono) + styles.css  │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Architectural Highlights
- **Static Four-File Packaging**: The detection engine is contained in [`engine.js`](file:///e:/Antigravity/BrandSentry/engine.js), the React application is in [`app.js`](file:///e:/Antigravity/BrandSentry/app.js), presentation rules are in [`styles.css`](file:///e:/Antigravity/BrandSentry/styles.css), and [`index.html`](file:///e:/Antigravity/BrandSentry/index.html) contains only the document shell and external links. This keeps the app deployable to static hosts like Vercel while remaining usable via `file://`.
- **In-Memory Reactive State**: App-level state is maintained in React hooks (`useState`), reacting immediately across views without local storage delays or database latencies.
- **Pure Functional Detection**: The scanning logic is completely decoupled from UI components, accepting text and rule arrays and returning structured violation descriptors.

---

## The Brand Detection Engine (`window.reviewContent`)

The engine resides in [`engine.js`](file:///e:/Antigravity/BrandSentry/engine.js) and attaches directly to `window.reviewContent`. It is pure, deterministic, and free of side effects.

```javascript
window.reviewContent = function(text, glossary = [], claims = [], voiceRules = []) { ... }
```

### Escaping Utility
To prevent RegExp injection when users supply custom glossary terms containing hyphens, parentheses, or dots, all user inputs are sanitized with `escapeRegExp`:
```javascript
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
```

---

### Rule 1: Unsupported Claims Detection (High Severity)
- **Objective**: Prevent unverified competitive boasts and absolute guarantees.
- **Detection Pattern**:
  ```javascript
  const claimRegex = /\b\d{1,3}x\b|\b100%\b|#1\b|\bguaranteed\b/i;
  ```
- **Execution Logic**:
  When matched (e.g. `"10x"`), the engine fetches the authorized proof point from `claims[0]` (default: *"Up to 35% faster in batch-processing tests"* citing *Claims Sheet v2.3, section 4*).
- **Suggested Rewrite**:
  Generates an approved, defensible alternative:
  ```javascript
  suggestedRewrite: `${claimRef.text} based on our internal benchmark.`
  ```
- **Severity**: `High` (Flagged in Rose `#be123c`).

---

### Rule 2: Tone Mismatch Detection & Neutralization (Medium Severity)
- **Objective**: Enforce an executive, confident, friendly tone free of casual street slang or excessive punctuation.
- **Detection Patterns**:
  1. **Slang Lexicon**: `["yo", "dope", "gonna", "lol", "omg", "lit"]` evaluated via `\b(word)\b`.
  2. **Exclamation Density**: `/!{2,}/` (two or more consecutive exclamation marks).
- **Neutralization Algorithm**:
  1. Replaces all `/!{2,}/g` with a formal period (`.`).
  2. Maps informal colloquialisms to professional counterparts:
     - `dope` → `great`
     - `gonna` → `going to`
     - `lit` → `impressive`
     - `yo`, `lol`, `omg` → *stripped with whitespace cleanup*
  3. Trims whitespace and ensures sentence-case capitalization (`charAt(0).toUpperCase()`).
- **Severity**: `Medium` (Flagged in Amber `#b45309`).

---

### Rule 3: Terminology Inconsistency Detection (Low Severity)
- **Objective**: Enforce approved brand nomenclature and deprecate stale terminology.
- **Detection Pattern**:
  Dynamically iterates through the live `glossary` array, constructing a word-boundary regular expression for each `avoidTerm`:
  ```javascript
  new RegExp(`\\b${escapeRegExp(item.avoidTerm)}\\b`, 'i');
  ```
- **Replacement Mapping**:
  Directly suggests `item.approvedTerm` (e.g. `"Sign-Up Portal"` → `"Onboarding Portal"`).
- **Severity**: `Low` (Flagged in Sky `#0369a1`).

---

### Issue Data Schema
Every violation detected by `reviewContent` adheres to this structured schema:
```typescript
interface Issue {
  id: string;               // Unique timestamped identifier (e.g. 'issue-claim-1710000000-1')
  type: string;             // 'Unsupported claim' | 'Tone mismatch' | 'Terminology inconsistency'
  severity: 'High' | 'Medium' | 'Low';
  snippet: string;          // Offending substring (e.g. '10x', 'Yo!, !!', 'Sign-Up Portal')
  reason: string;           // Human-readable rationale citing guidelines
  sourceRef: string;        // Specific citation (e.g. 'Claims Sheet v2.3, section 4')
  suggestedRewrite: string; // Compliant replacement string
  status: 'open' | 'resolved';
  resolution?: string;      // Recorded action ('Accepted', 'Custom edit', 'Dismissed: reason')
}
```

---

## Data Models & In-Memory Store

The application state lives inside the root component (`BrandSentryApp`) and propagates to child views via unidirectional props and callbacks.

### ContentItem Schema
Every draft evaluated in the platform is managed as a `ContentItem`:
```typescript
interface ContentItem {
  id: string;
  text: string;
  contentType: 'Email' | 'Web Page' | 'Social Post';
  submittedAt: string | null;      // Formatted timestamp (e.g. '10:30 AM')
  approvedAt: string | null;       // Timestamp added upon sign-off
  issues: Issue[];                 // Associated list of detected violations
  status: 'draft' | 'in_review' | 'pending_approval' | 'approved' | 'sent_back';
  reviewerComment: string;         // Mandatory feedback when rejected
}
```

### Knowledge Base Schemas
- **Glossary Item**: `{ id: string, avoidTerm: string, approvedTerm: string }`
- **Claim Item**: `{ id: string, text: string, source: string }`
- **Voice Rule Item**: `{ id: string, text: string }`
- **Session Issue Telemetry Item**: `{ id, type, severity, snippet, status, detectedAt, contentType }`

### Preloaded Seed State
To ensure immediate exploration without empty-state confusion, BrandSentry bootstraps with:
1. `ci-init-1`: Active blank draft in `draft` state ready for immediate typing or sample loading.
2. `ci-preload-pending`: Pre-resolved draft with 3 verified checks sitting in **Pending Review**.
3. `ci-preload-approved`: Production-ready release stamped with reviewer verification sitting in **Approved**.
4. Initial Glossary: `"Sign-Up Portal"` → `"Onboarding Portal"`, `"Customers"` → `"Members"`.
5. Initial Claims: `"Up to 35% faster in batch-processing tests"` (`Claims Sheet v2.3, section 4`).
6. Initial Voice Rule: `"Confident and friendly, never slang-heavy"`.

---

## Finite State Machine & Governance Workflow

The movement of copy through BrandSentry is strictly governed by a 5-stage deterministic finite state machine.

### State Diagram

```
                 ┌─────────────┐
                 │    draft    │
                 └──────┬──────┘
                        │
                [Run Brand Review]
                        │
                        ▼
                 ┌─────────────┐
       ┌────────►│  in_review  │
       │         └──────┬──────┘
       │                │
[Reopen & Resubmit]     │ [All Issues Resolved] + [Send for Approval]
       │                │
       │                ▼
       │         ┌────────────────────┐
       │         │  pending_approval  │
       │         └──────┬──────┬──────┘
       │                │      │
       │  [Send Back]   │      │ [Approve]
       │  (with comment)│      │
       │                ▼      ▼
┌──────┴─────┐              ┌───────────┐
│ sent_back  │              │ approved  │ ──► Release Published ✓
└────────────┘              └───────────┘
```

### Transition Rules & Quality Gates

| From State | Trigger Action | Guard Condition | To State |
|---|---|---|---|
| `draft` | *"Run Brand Review"* | `text.trim().length > 0` | `in_review` |
| `in_review` | *"Send for Approval"* | **Strict Quality Gate**: `openIssues.length === 0` | `pending_approval` |
| `pending_approval` | *"Approve"* (Reviewer Only) | Reviewer role active | `approved` |
| `pending_approval` | *"Send Back"* (Reviewer Only) | Non-empty feedback comment | `sent_back` |
| `sent_back` | *"Reopen in Workspace"* | Content author clicks card action | Loads draft in editor |
| `sent_back` (in editor) | *"Resubmit & Review"* | Re-evaluates copy through detection engine | `in_review` |

---

## Detailed Component Breakdown

### Shell: `BrandSentryApp`
The master container providing the application shell:
- **Sticky Enterprise Header**:
  - Geometric Brand Mark (`SentryLogo`) and application version tag (`v1.2`).
  - Center Segmented Pill-Tabs: Navigation between **Review Workspace**, **Approval Board**, **Knowledge Base**, and **Insights**, displaying live numeric badges.
  - Role Switcher Segmented Switch: Instantly toggles persona between **Creator** and **Reviewer** with a live emerald indicator dot.
- **Mobile Thumb Navigation**: Pinned bottom navigation bar for touch devices.

---

### View 1: `ReviewWorkspaceView`
The core split-screen interface (7:5 asymmetric grid).

#### 1. Left Editor Panel
- **Format Selector**: Adjusts copy type (`Email`, `Web Page`, `Social Post`) and updates status badge.
- **Quick Preset Controls**:
  - `Load Sample Copy`: Injects `"Yo! Our product is 10x faster than any competitor, and new users can get started right away on the Sign-Up Portal!!"`
  - `Load Extended`: Injects copy containing extended vocabulary (e.g. `cheap setup is guaranteed`) to test live glossary additions.
- **Segmented View Mode Switch**:
  - **Draft Editor**: Full-featured textarea with dynamic line count, word count, and character tally.
  - **Live Inspection**: Interactive preview showing non-destructive inline highlights.

#### 2. Non-Destructive Live Inspection Algorithm
`renderLiveHighlights(text, issues)` renders the draft as rich JSX without modifying the underlying raw text:
1. Filters for open issues (`issue.status === 'open'`).
2. Splits multi-snippet issues (e.g. tone mismatches like `"Yo!, !!"`) on commas to isolate individual tokens.
3. Uses RegExp match positions (`m.index` to `m.index + length`) to record slice offsets.
4. Sorts match ranges and discards overlapping boundaries.
5. Slices text into plain text chunks and wraps matched tokens in `<mark>` elements:
   - Claim matches → `.flag-claim` (soft rose background, 2px rose border-bottom)
   - Tone matches → `.flag-tone` (soft amber background, 2px amber border-bottom)
   - Terminology matches → `.flag-terminology` (soft sky background, 2px sky border-bottom)
6. As the author resolves issues in the right panel, matches disappear from the inspection preview in real time.

#### 3. GitHub PR-Style Diff Cards (`IssueDiffView`)
Each detected issue is rendered as an isolated review comment:
- **Card Anchor**: Header shows issue severity pill, rule name, and line reference.
- **Guideline Citation**: Subtext links directly to the authorized source (e.g. `Style Guide v2 §4` or `Claims Sheet v2.3`).
- **Diff Display**:
  - Red Strikethrough Line (`-` with `.diff-del`): Shows the offending snippet.
  - Green Addition Line (`+` with `.diff-add`): Shows the suggested replacement.

#### 4. Issue Action Mechanics
- **Accept Action**:
  - For Terminology: Replaces unapproved term with `approvedTerm`.
  - For Claim: Detects `10x faster` and seamlessly substitutes the authorized internal benchmark without grammatical duplication.
  - For Tone: Strips slang tokens, normalizes exclamation marks to periods, and capitalizes the leading character.
  - Transitions `issue.status` to `'resolved'`.
- **Edit Action**:
  - Expands an inline textarea pre-filled with `suggestedRewrite`.
  - Author types custom wording and clicks *"Save Edit"*.
  - Applies custom string to copy and marks issue `'resolved'`.
- **Dismiss Action**:
  - Expands a justification input.
  - Enforces mandatory validation: dismissal is rejected if justification is blank.
  - Preserves original copy and marks issue `'resolved'` with justification recorded.

#### 5. Strict Quality Gate Logic
Directly beneath the editor sits the Quality Gate Banner:
- **Locked State** (`openCount > 0`):
  - Banner renders in slate grey with lock icon.
  - *"Send for Approval"* button is strictly disabled (`cursor-not-allowed bg-slate-200 text-slate-400`).
  - Tooltip and label explain: *"Draft has N unresolved violations. You must Accept, Edit, or Dismiss all flags before submission."*
- **Unlocked State** (`openCount === 0`):
  - Banner turns soft emerald with a checkmark icon.
  - Displays: *"Quality Gate Passed • 0 Open Violations"*.
  - *"Send for Approval"* button activates in solid slate dark (`bg-slate-900 text-white cursor-pointer`).

---

### View 2: `ApprovalBoardView`
A minimalist 3-column Kanban board representing the release pipeline.

#### Kanban Column Filtering
Items in `contentItems` are filtered live by status:
1. **Pending Review Column**: Items where `status === 'pending_approval'`. Cards display format tag, submission time, snippet preview, and resolved checks counter.
2. **Approved Release Column**: Items where `status === 'approved'`. Cards display green "Passed ✓" ribbon, approval timestamp, and reviewer sign-off comment.
3. **Sent Back Column**: Items where `status === 'sent_back'`. Cards display red "Needs Revision" badge and highlighted reviewer feedback quote.

#### Role-Based Access Control (Creator vs Reviewer)
- **Creator Mode**:
  - Action buttons are hidden.
  - Banner shows: *"Creator Mode Active: Viewing pipeline status."*
- **Reviewer Mode**:
  - Action controls illuminate on all Pending Review cards:
    - **Approve**: One-click approval stamping the current time and moving the card to Approved.
    - **Send Back**: Opens the Rejection Modal.

#### Rejection Modal & Mandatory Feedback
Clicking "Send Back" opens a modal requiring substantive feedback:
- Shows draft snippet for context.
- Textarea with placeholder: *"Specify required citations, guideline violations, or tone corrections..."*
- If submitted empty, an inline error triggers: *"A specific review comment is required before sending back."*
- Upon submission, attaches comment to `item.reviewerComment` and moves card to Sent Back.

#### Reopen & Resubmit Loop
On every Sent Back card, a prominent **"Reopen in Workspace ↩"** button:
1. Sets `activeItemId` to the rejected item's ID.
2. Switches `activeTab` to `'review'`.
3. Displays a top warning banner in the workspace with the reviewer's feedback quote.
4. Author edits text and clicks **"Resubmit & Review"**, which transitions status back to `in_review` and re-runs the detection engine.

---

### View 3: `KnowledgeBaseView`
The single source of truth feeding the governance engine.

- **Governed Terminology**: Lists active avoid → approved term pairs with delete controls.
- **Live In-Memory Terminology Injection**:
  - Includes an "+ Add New Terminology Pair" form.
  - Submitting a new pair (e.g. `cheap` → `affordable`) appends to React state immediately.
  - **No reload required**: Because `reviewContent()` reads the reactive `glossary` state on every invocation, new rules become active the exact millisecond they are added.
- **Approved Metric Claims**: Repository of legal proof points with chapter/section citations.
- **Brand Voice Charter**: Core corporate voice principles with documented slang prohibitions.

---

### View 4: `InsightsView`
Dynamic session-wide analytics computed from `sessionIssues`.

#### Live Telemetry Aggregator
Extracts live metrics across all content items scanned during the browser session:
- **Total Violations Flagged** (and count of resolved issues).
- **Claims §4 Count & Percentage** (High severity).
- **Tone Mismatches Count & Percentage** (Medium severity).
- **Terminology Inconsistencies Count & Percentage** (Low severity).

#### Segmented Ratio Sparkline
A sleek Linear-style proportional bar:
- Visualizes ratio distribution across violation types using CSS flex widths:
  - Rose segment: `(claimsCount / total) * 100%`
  - Amber segment: `(toneCount / total) * 100%`
  - Sky segment: `(termCount / total) * 100%`

#### Interactive Audit Stream Table
A chronological record of every violation flagged:
- Displays Detection Time, Category Badge, Flagged Snippet, and Resolution Status.
- Filter Tabs: Filter between `all`, `claim`, `tone`, and `terminology`.

---

## Enterprise Design System & Styling

BrandSentry follows a human-crafted B2B SaaS aesthetic:

| Token | Implementation | Purpose |
|---|---|---|
| **Canvas** | `bg-slate-50/60` (`#f8fafc`) | Soft, low-glare professional backdrop |
| **Surfaces** | `bg-white border border-slate-200/80 shadow-xs` | Crisp 1px borders, zero heavy AI shadows |
| **Primary Text** | `#0f172a` (Slate 900) | High contrast, clear readability |
| **Secondary Text** | `#64748b` (Slate 500) | Calm, readable metadata and labels |
| **Primary Buttons** | `bg-slate-900 hover:bg-slate-800 text-white shadow-xs` | Solid, authoritative enterprise action buttons |
| **Code / Snippets** | `JetBrains Mono, Fira Code, monospace` | Precise character alignment for copy and regex |
| **Diff Add** | `bg-emerald-50 text-emerald-800 border-emerald-200/60` | Clear green contrast for compliant fixes |
| **Diff Del** | `bg-rose-50 text-rose-700 line-through` | Strike-through red indication for violations |
| **Micro Scrollbars** | 5px width, `thumb: #cbd5e1`, transparent track | Clean scroll experience without visual clutter |

---

## End-to-End User Journeys (Walkthroughs)

### Journey 1: Author Drafting & Quality Gate Clearance
1. Content Creator opens BrandSentry (lands directly on Review Workspace).
2. Clicks **"Load Sample Copy"** to load test draft.
3. Clicks **"Run Brand Review"**. The engine identifies 3 issues across 3 severities.
4. Creator toggles **"Live Inspection"** to view yellow, red, and blue inline highlights over `Yo!`, `10x`, and `Sign-Up Portal`.
5. Under Issue 1 (Terminology), Creator clicks **"Accept"**. Copy automatically changes to `"Onboarding Portal"`, and the issue resolves.
6. Under Issue 2 (Claim), Creator clicks **"Edit"**, adjusts the benchmark text, and clicks **"Save Edit"**.
7. Under Issue 3 (Tone), Creator clicks **"Dismiss"**, types `"Approved for casual audience"`, and submits justification.
8. With all 3 issues resolved, the Quality Gate banner turns green.
9. Creator clicks **"Send for Approval"**. Copy is promoted to `pending_approval`.

### Journey 2: Brand Reviewer Audit & Rejection
1. Reviewer navigates to **Approval Board**.
2. Uses top navigation toggle to switch persona to **"Reviewer"**.
3. Locates the pending submission and clicks **"Send Back"**.
4. Enters comment: *"Please replace the custom claim with official citation from section 4."*
5. Clicks **"Send Back with Comment"**. Card moves to **Sent Back** column.

### Journey 3: Creator Revision Loop
1. Creator clicks **"Reopen in Workspace ↩"** on the sent-back card.
2. Workspace opens with a top alert displaying the reviewer's revision request.
3. Creator adjusts the wording, clicks **"Resubmit & Review"**, resolving the remaining violation.
4. Creator re-submits the draft for approval.

### Journey 4: Adding New Governance Rules Live
1. Brand Lead opens **Knowledge Base**.
2. Enters Avoid: `"cheap"` and Approved: `"cost-effective"`.
3. Clicks **"+ Add to Active Engine"**. A confirmation banner appears.
4. Switches to **Review Workspace**, types `"Our product is cheap"`, and clicks **"Run Brand Review"**.
5. The term `"cheap"` is immediately flagged as a Low Severity violation with zero page refresh.

---

## Local Development & Zero-CORS Setup

BrandSentry has **zero build dependencies**. You do not need Node.js, Webpack, or Vite.

### Option 1: Direct File Launch (No Server Needed)
Double-click [`index.html`](file:///e:/Antigravity/BrandSantry/index.html) in your file explorer. It opens directly in any browser with full reactivity.

### Option 2: Local HTTP Server (Optional)
If you prefer running through a local development server:
```bash
# Using Node / npx
npx serve .

# Using Python 3
python -m http.server 3000

# Using PHP
php -S localhost:3000
```
Open `http://localhost:3000` in your browser.

---

## Team & Credits

- **Project**: BrandSentry — AI-Assisted Brand Governance Platform
- **Team**: DviCoders
- **Hackathon**: 2026 Enterprise Innovation Challenge
- **License**: MIT
