# Fluenta Mobile — Flutter Prototype Design Spec

**Date:** 2026-09-03
**Status:** Built — all areas implemented; runs on Flutter web (preview) and any mobile emulator. Verified Dashboard, Reading runner, and Coach render correctly.
**Goal:** A native **Flutter** mobile app that mirrors the validated Fluenta web prototype — same brand, warm design, and mock content — as a **frontend-only** (no backend) interface for stakeholder validation. Adapts the desktop layouts to a phone.

Source of truth for features/content: [`docs/01-feature-inventory.md`](../../01-feature-inventory.md) and the web build in `src/`.

---

## 1. Tech & architecture

- **Flutter + Material 3** (Dart 3.12). Project in a new `mobile/` folder (`flutter create`, platforms: android, ios, web — web lets us preview at phone size in Chrome without an emulator).
- **Navigation:** `go_router` with a `StatefulShellRoute` for the bottom-nav scaffold; full-screen routes (exam runner, writing editor, login) sit outside the shell.
- **State:** `provider` — an `AppState` (current user, plan tier, free-tier preview toggle) mirroring the web `AppProvider`; exam-attempt state passed via a lightweight store.
- **Fonts:** `google_fonts` → Plus Jakarta Sans (graceful system fallback offline).
- **Icons:** built-in Material Icons (no extra dependency).
- **No backend:** Dart fixtures under `lib/mock/`; a `mock_api` with `Future.delayed` simulates AI grading.

### Folder layout
```
mobile/lib/
  config/brand.dart
  theme/app_theme.dart          # warm Material 3 ColorScheme + shapes + text theme
  models/                       # Dart data classes (user, question, passage, exam, plan, lesson, …)
  mock/                         # fixtures + reading passages/questions
  services/mock_api.dart        # simulated grading + scoring
  state/app_state.dart          # ChangeNotifier
  router.dart                   # go_router config
  widgets/                      # shared: plan badge, lock chip, stat tile, progress ring, empty state, section icon
  features/<area>/…             # one folder per screen area
  main.dart
```

## 2. Design system (mobile)

Same warm palette as web, as a Material 3 `ColorScheme`:
- primary `#EF6C57` (coral) · secondary `#F5A524` (amber) · tertiary `#0EA5A4` (teal) · success green `#16A34A` · surface `#FFFFFF` · background `#FDF8F3` (cream) · onSurface `#292524` · error `#DC2626`.
- Rounded shapes (cards 20–24, buttons 16), soft elevation, generous padding, encouraging copy, `prefers-reduced-motion`-friendly (short animations).
- Warm gradient (coral→amber) for hero/CTAs; band-score color scale for progress.

## 3. Navigation

**Bottom nav (5):** Home · Practice · Progress · Coach · More.
- **Home** — Dashboard: journey hero, quick-start, exam countdown, streak, plan, progress-to-target.
- **Practice** — hub of cards: Reading, Writing, Listening, Speaking, Full Exam, Mock Exams.
- **Progress** — strongest/weakest, per-skill bands, recent exams.
- **Coach** — Fluenta Coach chat.
- **More** — bottom-sheet/page: Lessons & Library, Achievements, Certificates, Plan/Upgrade, Account & privacy, Help, Give feedback, the **Preview free tier** demo toggle, Sign out.

Full-screen (no bottom bar): **Reading runner**, **Writing editor**, **AI grading**, **Login**.

## 4. Key mobile adaptations

- **Reading runner** (was 2-pane): a segmented **Passage | Questions** view (TabBar). App bar shows timer + answered count; find-text field + highlight colors on the Passage tab (tap a sentence with an active color to highlight it — a mobile-friendly stand-in for drag-select); bottom bar for Previous / Next / Submit. All 11 question types render as mobile inputs (choice chips, radio lists, dropdowns, text fields).
- **AI grading** → full-screen overlay with progress + step checklist (same as web).
- **Writing feedback** → stacked: score + criteria chips, then answer with inline highlighted spans (RichText), then per-criterion notes.
- **Modals** → Material dialogs / bottom sheets (Set exam date, Feedback, confirm delete, Upload mock).
- **Listening** (mock audio player), **Speaking** (mock mic recorder + AI feedback), **Full Exam** (section stepper) — same as web, phone layout.

## 5. Screen inventory (full — all areas)
Dashboard · Practice hub · Reading runner + grading + results · Writing hub + editor + feedback · Listening · Speaking · Full Exam · Mock Exams (filter + upload + delete) · Progress · Coach · Lessons & Library · Achievements · Certificates · Checkout/Plan · Account & settings · Login · shared modals.

## 6. Build phasing
- **P0** — `flutter create`, theme, brand, models, mock data, app_state, router + bottom-nav shell. → runnable skeleton.
- **P1** — Dashboard + Practice hub + shared widgets + modals (set-exam-date, feedback).
- **P2** — Reading runner (11 question types) + grading + results.
- **P3** — Writing (editor + feedback), Listening, Speaking, Full Exam.
- **P4** — Progress, Mock Exams.
- **P5** — Coach, Lessons, Achievements, Certificates, Checkout, Settings, Login.
- **P6** — polish pass (spacing, motion, empty states) + run in Chrome (mobile size) to verify.

## 7. Out of scope (this round)
No backend, real auth/payments/audio/AI. Native drag-to-select passage highlighting is simplified to tap-to-highlight. Passages/lessons are placeholders. Android/iOS store packaging not included.
