# EinsteinAI — Feature Inventory

> Extracted from the 16.7-min screen recording (`Screen Recording 2026-09-02 000558.mp4`, 29 scene-change frames) and 4 screenshots.
> **Product:** EinsteinAI — an AI-powered IELTS preparation platform (web app, `einsteinai.io`).
> This is a reference for building a **frontend-only prototype** (no backend) for validation.

---

## 1. App Shell / Global

| Element | Details |
|---|---|
| **Brand** | "EinsteinAI" logo (top-left of sidebar) + notification bell |
| **Left sidebar nav** | Overview · Simulation (expandable → Reading, Writing, Listening, Speaking, Full Exam) · Mock Exam & Self Improvement · Lessons & Library · Progress · Achievements · Certificates · Einstein Coach (AI badge) |
| **Sidebar footer** | Help & Support · User profile card (avatar, name, plan badge, e.g. "Pro Trial") |
| **Collapsible sidebar** | Chevron toggle collapses/expands the rail |
| **Premium locks** | Listening, Speaking, Full Exam show a lock icon + "Upgrade to unlock" for non-Pro users |
| **Plan badges** | "Pro Trial", "Pro Monthly" |

## 2. Dashboard (Overview)

- **Welcome banner** — "Welcome to Einstein AI!" + *Start Reading Practice* CTA + *Got it* (dismissible).
- **"Your IELTS Journey"** hero banner + *Give Feedback* button. Upsell variant: **"Unlock Your Full Potential"** with *Upgrade to Pro* / *Try for Free*.
- **Quick Start Practice** cards: Reading, Writing, Listening (locked), Speaking (locked).
- **Start Full IELTS Exam** CTA (2.5–3 hrs) — locked variant "Unlock Full IELTS Exam · PRO".
- **Chat with Einstein Coach** CTA.
- **Progress Report** — "Progress to Target" bar (e.g. 3/7 = 43%; 3.3/7 = 47%), tab row: Overall · Listening · Reading · Writing · Speaking.
- **Your Current Plan** — Pro Monthly · Unlimited Access · "Renews in 7 days" · *Manage Plan*.
- **Exam Countdown** — empty state "Set Exam Date"; filled state: Days / Hours / Minutes countdown + Target Band Score, with refresh + edit icons.
- **Study Streak** — Current Streak · Best Streak · "Last 30 Days" heatmap.
- **My Feedback** — track feedback & responses.

## 3. Set Exam Date (modal)

- Preset chips: 1 Month · 2 Months · 3 Months · 6 Months.
- Select Exam Date (date field, e.g. "Tuesday, December 1st, 2026").
- Target Band Score dropdown ("7 · Recommended").
- Hint card: "You have 90 days to prepare — stay consistent…".
- Actions: Clear Date · Cancel · **Save & Start Countdown**.

## 4. Reading Practice / Mock Reading

- Header: passage title + "Reading | Academic | Passage 1 of 3".
- **Highlight toolbar**: 5 color swatches (yellow/green/blue/red/purple) · Legend · Clear all → "Clear all annotations?" confirm modal.
- **Two-pane layout**: passage (left, with "Find text…" search box) | questions (right).
- Progress counter (e.g. 0/13) + countdown timer (e.g. 19:34).
- "EinsteinAI Reading" card wrapper.
- **Question types (full IELTS set):** True/False/Not Given · Yes/No/Not Given · Multiple Choice · Matching Information · Matching Headings · Matching Features · Matching Sentence Endings · Sentence Completion · Summary Completion · Diagram Label Completion · Short Answer.
- On finish: toast "All Passages Complete! You answered 40 questions across 3 passages. Submitting for AI grading…".
- **AI grading modal** — "AI is Grading Your Work", progress %, step list: Analyzing response → Evaluating grammar & vocabulary → Calculating band score → Preparing detailed feedback → Grading complete. "Usually takes 15–30 seconds."

## 5. Writing Practice + Results

- Essay prompt display + word count (e.g. "64 words").
- **Your Answer** panel with **Original / Feedback** toggle.
- Scored criteria tabs: Task Achievement · Coherence · Vocabulary · Grammar (band scores + colored bar, e.g. "Grammatical Range & Accuracy 4.0").
- Inline error annotations with category tags (`task_achievement`, etc.) + "see more".
- **Get Personalized Writing Guidance** → *Start Conversation with Einstein Coach*.

## 6. My Mock Exams (Mock Exam & Self Improvement)

- Tabs: Mock Test · Part 1 · Part 2 · Part 3.
- **Filter by question type** dropdown (All types + 11 IELTS types).
- **Exam cards**: title (e.g. "The Origins of Coffee Culture"), "Global" tag, question type, attempts count, *Take Exam*.
- **Upload Reading Mock** card — "Create a new exam".
- "X of Y exams ready to take".
- **Delete Exam** confirmation modal.

## 7. Progress

- **Strongest Section** / **Needs Improvement** summary cards.
- Per-section band tiles: Listening · Reading · Writing · Speaking (band + test count, "0 tests" empty state).
- **Recent Exams** list: type, In Progress / Completed badge, "Mock Exam" tag, date, sections progress (e.g. 0/1), *Continue* / delete.

## 8. Subscription / Checkout

- "Complete Your Subscription — Join thousands of students achieving their IELTS goals".
- **Plan list**: Starter (Free) · 7-Day Trial ($4.99 today then $19.99/mo · NEW USERS) · Monthly ($19.99 · STANDARD) · 6-Month ($49.99 · BEST VALUE) · Yearly ($54.99/yr · SAVE 77%).
- Right summary: Pay Today amount, renewal terms, **promo code** (Enter code / Apply), **Start Trial – Pay $4.99 Today**.
- **Support Team** card → *Chat on WhatsApp* (all payment issues via WhatsApp).
- **What You'll Get** checklist (New users only, Pay $4.99 today, Auto-renews…, Full access, All 4 IELTS sections).
- *Change Plan*.

## 9. Account / Settings

- Email (read-only — "contact support to change").
- **Login Method** — Google.
- **Privacy** — "Save history" toggle (exam history & progress).
- **Danger Zone** — *Delete Account* → "Are you absolutely sure?" confirm.

## 10. Feedback (modal)

- "Share Your Feedback" — Feedback Type (Suggestion / …) · Overall Rating (5 stars) · Subject · Message (0/5000 chars) · Cancel / **Submit Feedback**.

## 11. Auth

- Google sign-in (sole login method observed). Implies a login / landing screen.

## 12. Nav destinations seen but not fully shown (need design decisions)

- **Lessons & Library** · **Achievements** · **Certificates** · **Einstein Coach** (AI chat interface).

---

### Cross-cutting patterns
- **Free vs Pro gating** everywhere (locks, upsell banners, "Upgrade to Pro").
- **AI feedback loop**: practice → AI grading modal → banded results with inline annotations → coach chat.
- **Motivation loop**: exam countdown, study streak, target band, progress-to-target.
- **Question-type engine**: 11 IELTS question types drive both practice and mock exams.
- **WhatsApp** is the support/payments channel.
