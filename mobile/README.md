# Fluenta Mobile (Flutter)

Native **Flutter** (Material 3) mobile version of the Fluenta IELTS prep prototype — same warm brand and mock content as the web app, adapted to a phone. **Frontend-only**: all data is mocked and AI grading is simulated. No backend.

- **Nav:** bottom bar — Home · Practice · Progress · Coach · More. Exam runner, writing editor, grading, and login are full-screen.
- **State:** `provider` (`AppState`). **Routing:** `go_router`. **Fonts:** Plus Jakarta Sans via `google_fonts`.

## Run

```bash
cd mobile
flutter pub get
```

**On a mobile emulator / device** (best experience):
```bash
flutter emulators --launch <id>   # or start one from Android Studio / Xcode
flutter run
```

**In a browser at phone size** (no emulator needed):
```bash
flutter run -d chrome
```
Then use the browser devtools device toolbar to emulate a phone. (Or `flutter run -d web-server --web-port 8090` and open http://localhost:8090.)

## Screens (all areas)

Dashboard · Practice hub · Reading runner (all 11 IELTS question types, tap-to-highlight passage, find-text, timer) · AI grading · Reading results + review · Writing editor + AI feedback (criteria + inline annotations) · Listening (mock player) · Speaking (mock recorder + feedback) · Full Exam · Mock Exams (filter/upload/delete) · Progress · Fluenta Coach (interactive chat) · Lessons · Achievements · Certificates · Checkout · Account & privacy · Login.

**Demo control:** More → **Preview free tier** flips to the free/locked experience (Pro locks + upsell banners) while keeping every feature usable.

## Layout

```
lib/
  config/brand.dart          # brand name + copy
  theme/                     # warm Material 3 ColorScheme + tokens
  models/models.dart         # data classes
  mock/                      # fixtures + reading passages/questions
  services/mock_api.dart     # simulated grading + scoring
  state/app_state.dart       # ChangeNotifier
  router.dart                # go_router (bottom-nav shell + routes)
  widgets/                   # shared UI + modals + grading overlay
  features/<area>/           # one folder per screen area
  main.dart
```

> Prototype: no real backend, auth, payments, audio capture, or AI. Passage highlighting is tap-to-highlight (mobile stand-in for drag-select).
