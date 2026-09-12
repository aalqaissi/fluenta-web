# Roles / Admin Gating — Design

_Date: 2026-09-12 · Status: approved (brainstorming) → ready for implementation plan_

## Problem

Real auth added login/registration but **no roles**: every authenticated user is treated as admin
(the `AdminFeedbackController`/`AdminUserController` comment says as much), so any logged-in user can
open the Content Studio, the Feedback Review queue, and the new Users page (which lists every
account's name/email), and can author/delete exams via the API. The web renders the admin nav
(`adminBadge` items) unconditionally and leaves `/studio/*` unguarded.

## Goal

Introduce a `role` (`"student"` | `"admin"`) and enforce it: the backend restricts the admin surface
and authoring mutations to admins (403 otherwise); the web hides the admin nav and guards `/studio/*`
for non-admins; the admin Users page gains a Role column + promote/demote (with a lockout guard).
Seed demo `u1` as **admin**; new registrations are **students**. Mobile gains the field (unused).

## Decisions (from brainstorming)

| # | Decision |
|---|---|
| Role model | A single `role` string, `"student"` (default) or `"admin"`. No multi-role RBAC. |
| Gating scope | `/api/admin/**` (feedback queue + users) AND the Content Studio **authoring mutations**: `POST`/`PUT`/`DELETE /api/exams`, `/{id}/status`, `/{id}/duplicate`, and the certificate authoring mutations (`POST`/`PUT`/`DELETE /api/certificates`). `GET` endpoints stay open to any authed user (students take exams, view their certificates). |
| Role management | The admin Users page gets a **Make admin / Remove admin** toggle, extending `PATCH /api/admin/users/{id}` to accept `role`. **Guards:** refuse demoting the last remaining admin, and refuse self-demotion. |
| Assignment | Seed `u1` → admin; `AuthService.register` → student. |
| Mobile | `FluentaUser` gains `role` (unused — no admin UI); mirrors the backend. |

## Architecture

### Backend
- **`UserEntity`** gains `role` (String, default `"student"`). **`UserDto`** and **`UserSummary`** expose
  `role` (update `Mappers.toDto` and the admin controller's summary mapping). **`SeedLoader`** sets
  `u1.role = "admin"` (idempotently, alongside the demo-password backfill); **`AuthService.register`**
  sets `role = "student"`.
- **`CurrentUser`** holds the role in addition to the userId. **`AuthFilter`** already resolves the
  bearer token → session → userId; it additionally looks up the user (inject `UserRepository`) and
  stashes `role`. Add:
  - `CurrentUser.requireAdmin()` → throws `ApiException(401)` if unauthenticated, `ApiException(403,
    "Admin access required")` if authenticated but `role != "admin"`. Returns the userId.
  - Clear the role in the existing `CurrentUser.clear()` (the filter's `finally`).
- **Gating** — replace `require()` with `requireAdmin()` (or add the call) on:
  - `AdminFeedbackController` (`queue`, `update`), `AdminUserController` (`list`, `patch`).
  - `ExamController` mutations: `create` (POST), `update` (PUT), `delete` (DELETE), `setStatus`
    (`/{id}/status`), `duplicate` (`/{id}/duplicate`). `list`/`get` (GET) unchanged.
  - `CertificateController` mutations (`POST`/`PUT`/`DELETE`); `GET` unchanged.
- **Role management:** extend `AdminUserController.patch` (`PATCH /api/admin/users/{id}`) to also read
  an optional `role` from the body and apply it. **Guards** (before saving a demotion — target is
  currently admin and the new role is not):
  - Self-demotion: if `id == CurrentUser.get()` → `ApiException(400, "You can't remove your own admin
    role")`.
  - Last admin: if the count of admins is 1 (this user) → `ApiException(400, "Can't remove the last
    admin")`.
  Only `"student"`/`"admin"` are accepted for `role` (else 400).

### Web
- **`FluentaUser`** (`src/mock/types.ts`) gains `role: "student" | "admin"`. Add a tiny helper, e.g.
  `export const isAdmin = (u?: FluentaUser | null) => u?.role === "admin";` (in `src/lib/auth.ts` or
  alongside the type).
- **Nav:** `Sidebar` and `MobileNav` filter out `adminBadge` items unless the current user is admin
  (read the user via `useAuth()`; the nav already imports what it needs — pass `isAdmin` into the
  filter). Non-admins simply don't see Content Studio / Feedback Review / Users.
- **Route guard:** an `<AdminRoute>` wrapper component (`src/features/admin/AdminRoute.tsx`) that reads
  `useAuth()` and, when the user is not admin, `<Navigate to="/" replace />`; otherwise renders
  `<Outlet />` (or its children). Wrap the `/studio/*` route entries in `App.tsx` (`/studio`,
  `/studio/feedback`, `/studio/users`, `/studio/certificate/:id`, `/studio/:skill/:id`) — e.g. group
  them under a parent route whose `element` is `<AdminRoute />`.
- **Users page** (`src/features/admin/UsersPage.tsx`): add a **Role** column and a per-row action —
  "Make admin" when the row is a student, "Remove admin" when it's an admin (hidden on the current
  user's own row). It calls the extended PATCH (`api.adminUsers.setRole(id, role)`); guard errors
  (last-admin / self) surface as toasts. `AdminUserDto` gains `role`; `api.adminUsers` gains
  `setRole(id, role)` (PATCH `{ role }`).

### Mobile
- **`FluentaUser`** (`lib/models/models.dart`) gains `role` (String, parsed in `fromJson`, default
  `"student"`). No other change — mobile has no admin UI; the field just mirrors the backend so the
  model stays in sync and future admin features have it.

## Error handling
- Non-admin → admin endpoint or authoring mutation: **403** "Admin access required". Unauthenticated:
  **401** (unchanged).
- Web: non-admins never see the admin nav and are redirected off `/studio/*`; a direct API 403 (e.g.
  a stale session) surfaces as the app's normal error toast.
- Role-change guards: demoting the last admin or yourself → **400** with a clear message shown as a
  toast on the Users page. Invalid `role` value → 400.

## Testing
Backend cannot bind a socket here → MockMvc in-process (`mvn -q -DforkCount=0 test`).
- **Backend (MockMvc):** register creates a `"student"`; `/me` and the users list expose `role`; a
  **student** token → **403** on `GET /api/admin/users`, `GET /api/admin/feedback`, and `POST
  /api/exams`; the seeded **admin** (`u1`) → **200** on those; `GET /api/exams` still **200** for a
  student; `PATCH /api/admin/users/{id}` with `{role:"admin"}` promotes and `{role:"student"}`
  demotes; demoting the last admin → **400**; self-demotion → **400**. (To get a student token, the
  test registers a fresh unique-email user — the established pattern; `u1` remains the admin login
  helper.)
- **Web:** `npm run lint` + `npm run build`; browser check that a student sees no admin nav and is
  redirected from `/studio`, an admin sees the nav and the Users role toggle works.
- **Mobile:** `flutter analyze` + `flutter test`; a `FluentaUser.fromJson` test that `role` defaults
  to `"student"` when absent and reads `"admin"` when present.

## Out of scope → roadmap
Fine-grained permissions / multi-role RBAC beyond student/admin; per-resource ownership; audit
logging of role changes.

## Follow-ups (post-implementation)
- Update the "Roles / admin gating" roadmap item (web + mobile) to done.
- Refresh graphify graphs (web + mobile) per the standing rule.
