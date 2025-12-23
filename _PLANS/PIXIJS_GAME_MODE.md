# Farmwork Tycoon (Tauri + React + PixiJS) — High-Level PRD & Build Plan

## Vision
A desktop “tycoon-style” farm that visualizes your Farmwork.dev workflow in real time.  
Agents become builders and tractors. Work happens in visible zones (Farmhouse, Audit buildings, Garden, Compost). Scores out of 10 and task progress drive the world’s look, motion, and rewards.

The app is **local-first** and **file-driven**:
- CLIs write `progress.json` (authoritative state)
- CLIs write `updates/*.md` (human-readable logs, plans, explanations)
- The Tauri backend watches for file changes and pushes events to the UI
- React holds state + renders markdown panels
- PixiJS renders the interactive farm world

---

## Goals

### MVP Goals (must ship)
- **Always accurate** visualization of tasks + agent status from `progress.json`
- **Beautiful top-down farm** with distinct zones:
  - Farmhouse (orchestration)
  - Audit district (quality domains)
  - Garden (new ideas)
  - Compost (rejected ideas)
- **Clear scoring system** (ratings out of 10) displayed in-world and in UI
- **Real-time movement and feedback**
  - tractors move to buildings while tasks run
  - completion triggers notifications + visual effects
- **Markdown-first transparency**
  - audit and update markdown is readable in-app with good formatting

### v1+ Goals (nice-to-have)
- XP, levels, badges for agents and/or the farm
- Minimap, camera pan/zoom, world upgrades tied to scores
- Timeline/replay of progress updates
- Better pathing (agents avoid obstacles and take roads)

---

## Non-Goals
- No cloud sync, no accounts, no collaboration (local-first only)
- No task editing or planning inside the app (CLIs remain the source of truth)
- No complex economy systems required (this is a visualization first)

---

## Core Concept: “Farmwork” as a Living Map

### Zones & Meaning
1. **Farmhouse (Center Hub)**
   - Represents orchestration and main agent coordination
   - Subagents return here when they deliver results

2. **Audit District (Quality Buildings)**
   Each audit domain has a themed building with a visible score out of 10:
   - Accessibility (e.g., barn with ramp icon)
   - Code Quality (workshop with tools)
   - Performance (windmill or turbine)
   - Security (silo with shield sign)
   - Tests (stable with checklist sign)

3. **Garden (Ideas)**
   - New ideas are flowers/plants
   - Healthy ideas bloom; weak ones remain seedlings
   - Optional: ideas can have “value” and “status” visuals

4. **Compost (Rejected / Retired Ideas)**
   - Compost pile grows based on rejected idea “weight”
   - Visual feedback (bigger pile, more steam/flies) as it grows

---

## Primary User Experience

### Default View
A calm top-down farm world with:
- buildings labeled by category
- small moving entities representing work
- subtle ambient motion (windmill, flags, birds)

### “At a glance” signals
- **Which tasks are running** (tractors moving, builder animations)
- **Which quality areas are weak** (building looks worn/broken when score is low)
- **Where ideas are going** (garden blooming vs compost growing)
- **What just happened** (toasts + in-world sparkle/particle bursts)

---

## Data Inputs & Rules

### 1) progress.json (Authoritative)
This is the single source of truth for:
- agent status (idle/working)
- tasks (queued/in progress/done)
- percent completion and timestamps
- links to related markdown
- audit scores (optional, but recommended for fast rendering)
- idea lists (garden + compost)

**Rule:** The world state updates only when this file changes.

### 2) updates/*.md (Human-readable narrative)
These are “story” files:
- what the agent did
- why decisions were made
- what’s next
- blockers or open questions

**Rule:** These appear in the UI panel and can be linked from tasks/events.

### 3) Audit & Plan markdown (Farmwork method)
- `_AUDIT/*.md` contains the score out of 10 and supporting text
- `_PLANS/*.md` contains planning notes, strategy, and system design
- `FARMHOUSE.md`, `GARDEN.md`, `COMPOST.md` define your method and can also be displayed

**Rule:** Scores should be consistently parseable (either frontmatter or a standard “Score: X/10” line).

---

## System Architecture (High Level)

### Backend (Tauri / Rust)
- Watches relevant files and folders:
  - `progress.json`
  - `updates/`
  - `_AUDIT/`
  - `_PLANS/`
- Debounces rapid change bursts
- Emits structured events to the frontend when changes occur

### Frontend (React)
- Receives events and updates a single state store
- Shows:
  - overview metrics
  - tasks/agents lists
  - markdown viewer
  - event feed / notifications
- Sends “selected entity” state to Pixi renderer for highlighting

### Renderer (PixiJS)
- Renders the farm world and animates it
- Reads from the store each frame (for animation) or on store changes (for logic)
- Displays:
  - buildings + score badges
  - tractors/builders with routes
  - garden + compost visuals
  - completion FX and highlights

---

## Visual Language & Gameplay Feel

### Score-to-Visual Mapping
Each building has a “health state” driven by its score:
- **0–3:** broken/worn (cracks, dull, grime)
- **3–6:** unstable (patchy, flickering lights, dust)
- **6–8:** normal (clean, steady)
- **8–10:** excellent (sparkles, banners, bright windows)

### Task-to-Motion Mapping
- **Queued:** icon/marker appears near the destination building
- **In progress:** tractor travels from farmhouse → destination
- **Working:** builder appears and “works” at the building (animation loop)
- **Done:** confetti/sparkle burst + toast, tractor returns or moves to next job

### Ideas
- Garden:
  - seed → sprout → bloom based on idea status/priority/value
- Compost:
  - pile grows with rejected count/weight
  - optional: “compost heat” shows intensity of discarded effort

---

## Reward System (v1 optional, v1+ recommended)

### XP & Levels
- Agents gain XP on task completion
- Level-ups trigger a small ceremony:
  - sparkle burst
  - badge popover
  - subtle sound cue (optional)

### Badges
Badges provide long-term goals without turning it into a full game:
- “All audits ≥ 8”
- “10 tasks shipped”
- “Security score ≥ 9”
- “Tests increased by +2 points”
- “Zero critical issues week”

---

## UI: Panels & Navigation

### Right Panel Tabs (recommended)
1. **Overview**
   - audit scores
   - active tasks
   - agent roster
   - recent updates
2. **Agents**
   - each agent status, current task, XP/level/badges
3. **Tasks**
   - queue, in progress, done
   - click opens details + links to markdown
4. **Audits**
   - list of audit domains with scores + open markdown
5. **Updates**
   - chronological list of `updates/*.md`
6. **Plans**
   - list of `_PLANS/*.md` (searchable)

---

## World Interaction

### Click & Inspect
- Clicking a building opens:
  - score details
  - related audit markdown
  - related tasks in that category
- Clicking a tractor/builder opens:
  - agent details
  - what it’s working on
  - linked update markdown

### Highlighting & Guidance
- Low-score buildings can pulse subtly
- When a task finishes, the destination building glows briefly
- If an audit score improves, show a “repair” animation

---

## Notifications & Events

### What triggers notifications
- task started
- task finished (success/failure)
- audit score changed significantly
- agent leveled up
- new idea added / idea moved to compost

### How notifications appear
- Small toast in UI
- In-world: icon ping near the building + particle burst

---

## Milestones (Build Plan)

### Milestone 1 — Product Shell
- Tauri desktop shell running React layout
- Pixi canvas renders a placeholder farm scene
- Right panel exists with placeholder tabs

### Milestone 2 — File-Driven Updates
- CLI writes update the UI via file watcher events
- `progress.json` updates immediately reflected in the UI
- Basic markdown viewer reads `updates/*.md`

### Milestone 3 — Farmwork Zones & Scores
- Place buildings for each Farmwork domain
- Show score out of 10 for each audit building
- Map score → building visual state (broken→shiny)

### Milestone 4 — Tasks Become Motion
- Spawn tractors/builders based on task states
- Animate travel farmhouse → building
- Completion triggers effects + notifications

### Milestone 5 — Garden & Compost Visuals
- Garden renders ideas as flowers
- Compost pile grows based on rejected idea weight
- UI can list and open idea markdown entries (if used)

### Milestone 6 — Polish & Delight
- Camera pan/zoom, selection highlights
- Cleaner event feed, better notifications
- Optional: XP/levels/badges
- Optional: ambient sounds toggle

---

## Success Metrics
- You can tell “what is happening” within **5 seconds** of opening the app
- File changes propagate to visuals within **< 250ms** (debounced but fast)
- Audit weak points are obvious without reading text
- Markdown is easy to read and linked contextually from tasks and buildings

---

## Open Decisions (Lock These Early)
- Score extraction format in markdown (frontmatter vs “Score: X/10”)
- Tile size and visual scale (choose one and stick to it)
- Whether tractors represent tasks or agents (either works; pick one)
- The minimum set of entities for MVP (keep it small)

---

## Farmwork Method Map (Canonical)
- **Farmhouse**: orchestration, main agent, subagent coordination
- **Audit buildings**: quality categories with scores out of 10
- **Garden**: new ideas and experiments
- **Compost**: rejected/retired ideas (pile size = weight/count)
- **Plans board**: planning markdown surfaced in UI for quick reference
