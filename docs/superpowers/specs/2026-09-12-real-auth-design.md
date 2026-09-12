# Real Password Authentication — Design

_Date: 2026-09-12 · Status: approved (brainstorming) → ready for implementation plan_

## Problem

Auth is a prototype: login takes an email only (no password), and any email either resolves to
an existing account or silently creates a new one; an email-less login returns the seeded demo user
`u1`. There is no registration, no password, no account model beyond profile fields. This blocks
treating any per-user data (attempts, plan, certificates) as genuinely owned, and it's a prerequisite
for real payments.

## Goal

Replace the passwordless prototype with **email + password registration, login, and logout** across
backend + web + mobile, and add an **admin Users page** (list + search + filter + pagination + a
"mark verified" action). Preserve a fast demo path for the WiFi/mobile demo.

## Decisions (from brainstorming)

| # | Decision |
|---|---|
| Scope | **In:** email+password registration, login with real verification, logout, BCrypt hashing, admin Users page. **Out (→ roadmap):** password reset, email-verification *flow* (sending/confirming), Google/OAuth, roles/admin gating. |
| Hashing | **BCrypt** via the standalone `spring-security-crypto` module — NOT the full Spring Security filter chain (it would collide with the existing custom `AuthFilter`). |
| Tokens | Keep the existing **opaque server-side session tokens** (already revocable); no JWT, no expiry change (YAGNI). |
| Demo path | Seed `u1` with a **documented demo password** (`fluenta.demo.password`, default `yalla-demo`, in `application.yml`); login screens get a one-tap **"Fill demo credentials"** helper that fills the form and runs the *real* login. No credential-less backdoor. Documented in both READMEs. |
| Registration | Fields: email + password + **display name** (web also has confirm-password). Password **min 8 chars**, no composition rules. Duplicate email → `409`. New account → `onboarded=false` → onboarding wizard; auto-login (returns a token). |
| Login failure | Wrong password **or** unknown email → a single generic **`401` "Incorrect email or password"** (never reveal which). |
| Status flag | Add **`emailVerified`** (new registrations = `false`, seed `u1` = `true`). Displayed + admin-toggleable via a "Mark verified" action. **Does NOT gate login yet** — enforcement ships with real email verification (roadmap). |
| Admin Users | Web admin surface only (`/studio/users`); ungated like Feedback Review (`CurrentUser.require()`), harden with roles later. Mobile is the student client — no admin page there. |

## Architecture

### Backend — user model & hashing
- **`UserEntity`** gains two columns (SQLite `ddl-auto: update` adds them automatically; old rows get
  defaults): `passwordHash` (String, nullable — a null hash can never authenticate) and
  `emailVerified` (boolean, default `false`).
- **Hashing**: add dependency `org.springframework.security:spring-security-crypto`. Provide a single
  `@Bean BCryptPasswordEncoder` (a config class); inject it into `AuthService`. No `spring-boot-starter-security`.

### Backend — auth service & endpoints
- **`AuthDtos`**: keep `LoginRequest(email, password)`; add `RegisterRequest(email, password, name)`.
- **`AuthService`**:
  - `login(email, password)`: find by email (case-insensitive); if not found, or `passwordHash` is
    null, or `encoder.matches(password, hash)` is false → throw `ApiException(401, "Incorrect email or
    password")`. Else mint a session token (`yalla_<uuid>`, as today), return `LoginResponse`.
  - `register(email, password, name)`: validate email is non-blank and looks like an email; password
    length ≥ 8; if `findFirstByEmailIgnoreCase` present → `ApiException(409, "That email is already
    registered.")`. Else build a `UserEntity` with `encoder.encode(password)`, `emailVerified=false`,
    `onboarded=false`, and the same profile defaults as the current `createUser` (free plan, target
    6.5, ielts track, empty streak). Save, mint a session, return `LoginResponse` (auto-login).
  - **Remove** the email-less→`u1` fallback and the find-or-create-on-login behavior.
- **`AuthController`**: add `POST /api/auth/register` (public — `AuthFilter` already treats
  `/api/auth/*` as public). `login`/`logout` unchanged in shape.

### Backend — seed
- **`SeedLoader`**: when seeding/ensuring `u1`, set `passwordHash = encoder.encode(demoPassword)` and
  `emailVerified = true`. `demoPassword` from `fluenta.demo.password` (`application.yml`, default
  `yalla-demo`, env-overridable). Only set the hash if `u1` currently lacks one (idempotent on restart).

### Backend — admin Users
- **`UserRepository`**: add a paginated search query:
  ```java
  @Query("SELECT u FROM UserEntity u WHERE " +
         "(:q IS NULL OR lower(u.name) LIKE :q OR lower(u.email) LIKE :q) AND " +
         "(:plan IS NULL OR u.plan = :plan) AND " +
         "(:verified IS NULL OR u.emailVerified = :verified)")
  Page<UserEntity> search(@Param("q") String q, @Param("plan") String plan,
                          @Param("verified") Boolean verified, Pageable pageable);
  ```
  (`q` is the lowercased term wrapped in `%…%`, or null; `plan`/`verified` null = no filter.)
- **`AdminUserController`** (`/api/admin/users`):
  - `GET` with params `query`, `plan` (`free|pro`), `verified` (`true|false`), `page` (default 0),
    `size` (default 20, capped e.g. 100). `CurrentUser.require()`. Builds a `PageRequest`
    (sorted by name), calls `search`, maps to `UserSummary`, returns
    `{ items, total, page, size }`.
  - `PATCH /{id}` `{ emailVerified: boolean }` → `CurrentUser.require()`; load user (404 if missing),
    set the flag, save, return the updated `UserSummary`.
- **`UserSummary`** DTO: `id, name, email, plan, planLabel, emailVerified, onboarded`.

### Web
- **`LoginPage`**: add a password field to the email form; a **Login ⇄ Register** mode toggle
  (Register adds *display name* + *confirm password*, validated client-side: passwords match, ≥ 8).
  Replace "Continue with Google" with a **"Fill demo credentials"** button (fills
  `sara.hamzeh@example.com` + the demo password constant, then submits the normal login). Update the
  footer (remove "no password needed"). Navigation after login/register stays
  `onboarded ? "/" : "/onboarding"`.
- **`api.ts` / `auth-context`**: `auth.login(email, password)`, `auth.register({email, password,
  name})`; a `adminUsers` API group: `list({query, plan, verified, page, size})` and
  `setVerified(id, verified)`. A `DEMO_EMAIL`/`DEMO_PASSWORD` constant for the helper.
- **Users admin page** (`src/features/admin/UsersPage.tsx`) at route `/studio/users`; add a
  **"Users"** `NavItem` (`adminBadge`) to `secondaryNav`. Table columns: Full name, Email, Bundle
  (planLabel), Status (Verified/Unverified badge), Onboarded. Debounced search input; filter chips
  (Bundle: All/Free/Pro · Status: All/Verified/Unverified); pagination (Prev/Next + "X–Y of N");
  per-row "Mark verified" button (hidden when already verified). Reuses `useAsync`, `PageHeader`,
  `Card`, `Badge`, `Input`, `Button`.

### Mobile
- **Login screen**: email + password fields, a Login/Register toggle (Register adds display name), and
  a "Fill demo credentials" button. Client-side: password ≥ 8, passwords not required to confirm
  (single field on mobile; keep it lean).
- **`api_client` / `auth_state`**: `login(email, password)` and `register(email, password, name)`;
  bootstrap/token handling unchanged. No admin page (student client).

## Error handling & migration
- `401` generic (login), `409` (duplicate register), `400` (validation: short password / malformed
  email / blank name) — clients surface the message inline.
- Old prototype accounts with null `passwordHash` can't log in (generic `401`) → they re-register.
  Acceptable for prototype data; `u1` keeps working via its seeded demo password.
- `emailVerified` for pre-existing rows defaults to `false`; the seed sets `u1` to `true`.

## Testing
Backend cannot bind a socket here (Java NIO loopback blocked) → MockMvc in-process
(`mvn -q -DforkCount=0 test`).
- **Backend (MockMvc)**: register happy-path (token + `onboarded=false` + `emailVerified=false`);
  duplicate email → `409`; short password → `400`; login with correct password → `200`; login wrong
  password → `401`; login unknown email → `401`; `u1` logs in with the seeded demo password → `200`.
  Admin: users list paginates; search matches name/email; filter by plan and by verified; `PATCH`
  flips `emailVerified`. **Update `HttpContractTest.login()`** to POST the demo password (every
  existing test depends on the login helper).
- **Web**: `npm run lint` (`tsc`) + `npm run build`; browser preview for the login/register flow and
  the Users page (against a mocked API where the backend can't bind).
- **Mobile**: `flutter analyze` + `flutter test`; update any auth test that assumed passwordless login.

## Out of scope → roadmap (add entries to both `docs/ROADMAP.md`)
- Password reset / "forgot password" (needs email delivery)
- Email verification **flow** (sending + confirming; enforcement then gates login)
- Google / OAuth sign-in
- Roles / admin gating (lock down the admin surface incl. the Users page)

## Follow-ups (post-implementation)
- Document the demo credentials in both READMEs (web + mobile).
- Update both roadmaps (mark real auth done; add the out-of-scope items above).
- Refresh graphify graphs for web + mobile (standing rule).
