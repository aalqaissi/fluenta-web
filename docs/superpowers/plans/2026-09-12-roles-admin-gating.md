# Roles / Admin Gating Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `role` (`student`|`admin`) and enforce it — backend gates the admin surface + authoring mutations (403), the web hides the admin nav and guards `/studio/*`, and the admin Users page can promote/demote (with a lockout guard).

**Architecture:** `AuthFilter` already resolves the bearer token to a userId; it now also stashes the user's `role` in `CurrentUser`, which gains `requireAdmin()` (401 unauth / 403 non-admin). Admin controllers + exam/certificate mutations call `requireAdmin()`. `UserDto`/`UserSummary`/`FluentaUser` expose `role`; the web filters admin nav + guards routes on it. Seed `u1` = admin; registrations = student.

**Tech Stack:** Spring Boot 3.3.5 (Java 21, MockMvc) · React 18 + TS + Vite (verify via tsc/build/browser) · Flutter (analyze/test).

## Global Constraints

- Role values: exactly `"student"` (default) or `"admin"`.
- Non-admin → admin endpoint/mutation: **HTTP 403** "Admin access required". Unauthenticated: **401**.
- Gated endpoints: `/api/admin/**` (feedback queue + users); `ExamController` mutations (`POST`/`PUT`/`DELETE /api/exams`, `/{id}/status`, `/{id}/duplicate`); `CertificateController` mutations (`POST`/`PUT`/`DELETE`). All `GET` endpoints stay open to any authed user.
- Role-management PATCH guards: demoting the **last admin** → 400; **self-demotion** → 400; invalid role value → 400.
- Seed `u1` → `"admin"` (idempotently, incl. the existing demo-password backfill); `AuthService.register` → `"student"`.
- Backend cannot bind a socket here → MockMvc: `mvn -q -DforkCount=0 test`.
- Branches: `feat/roles-admin-gating` (web) + `feat/roles-admin-gating` (mobile).

---

## File Structure

**Backend (`backend/`)**
- Modify `domain/UserEntity.java` — `role` field (default `"student"`).
- Modify `config/CurrentUser.java` — hold role; `requireAdmin()`.
- Modify `config/AuthFilter.java` — inject `UserRepository`; stash role.
- Modify `dto/UserDto.java` + `service/Mappers.java` — expose `role`.
- Modify `dto/UserSummary.java` + `web/AdminUserController.java` — `role` in summary; `requireAdmin()`; PATCH `role` + guards.
- Modify `web/AdminFeedbackController.java` — `requireAdmin()`.
- Modify `web/ExamController.java` — `requireAdmin()` on mutations.
- Modify `web/CertificateController.java` — `requireAdmin()` on mutations.
- Modify `service/AuthService.java` — `register` sets `"student"`.
- Modify `config/SeedLoader.java` — `u1` role `"admin"` (seed + backfill).
- Test: `src/test/java/com/fluenta/api/RolesContractTest.java`.

**Web (`src/`)**
- Modify `mock/types.ts` — `FluentaUser.role`; `lib/auth.ts` — `isAdmin`.
- Modify `components/layout/Sidebar.tsx` + `components/layout/MobileNav.tsx` — filter admin nav.
- Create `features/admin/AdminRoute.tsx`; modify `App.tsx` — guard `/studio/*`.
- Modify `lib/api.ts` — `AdminUserDto.role`, `api.adminUsers.setRole`.
- Modify `features/admin/UsersPage.tsx` — Role column + toggle.

**Mobile (`fluenta-mobile/`)**
- Modify `lib/models/models.dart` — `FluentaUser.role`.
- Test: `test/models/fluenta_user_test.dart` (extend).

---

## Task 1: Backend — role model + requireAdmin + gating

**Files:**
- Modify: `backend/src/main/java/com/fluenta/api/domain/UserEntity.java`
- Modify: `backend/src/main/java/com/fluenta/api/config/CurrentUser.java`
- Modify: `backend/src/main/java/com/fluenta/api/config/AuthFilter.java`
- Modify: `backend/src/main/java/com/fluenta/api/dto/UserDto.java`
- Modify: `backend/src/main/java/com/fluenta/api/service/Mappers.java`
- Modify: `backend/src/main/java/com/fluenta/api/dto/UserSummary.java`
- Modify: `backend/src/main/java/com/fluenta/api/web/AdminUserController.java` (list gating + summary role only; PATCH role is Task 2)
- Modify: `backend/src/main/java/com/fluenta/api/web/AdminFeedbackController.java`
- Modify: `backend/src/main/java/com/fluenta/api/web/ExamController.java`
- Modify: `backend/src/main/java/com/fluenta/api/web/CertificateController.java`
- Modify: `backend/src/main/java/com/fluenta/api/service/AuthService.java`
- Modify: `backend/src/main/java/com/fluenta/api/config/SeedLoader.java`
- Test: `backend/src/test/java/com/fluenta/api/RolesContractTest.java`

**Interfaces:**
- Produces: `UserEntity.getRole()/setRole(String)`; `CurrentUser.setRole(String)`, `CurrentUser.role()`, `CurrentUser.requireAdmin()` (401/403, returns userId); `UserDto.role`; `UserSummary.role`; admin endpoints + exam/cert mutations gated; seed `u1` admin; register → student.

- [ ] **Step 1: Add `role` to UserEntity**

In `domain/UserEntity.java`, add the field (after `emailVerified`) with a default, and getter/setter:

```java
    private String role = "student"; // student | admin
```
```java
    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }
```

- [ ] **Step 2: Add role + requireAdmin to CurrentUser**

Replace `config/CurrentUser.java` with:

```java
package com.fluenta.api.config;

import com.fluenta.api.web.ApiException;
import org.springframework.http.HttpStatus;

/** Thread-local holder for the authenticated user id + role, set by {@link AuthFilter}. */
public final class CurrentUser {
    private static final ThreadLocal<String> USER_ID = new ThreadLocal<>();
    private static final ThreadLocal<String> ROLE = new ThreadLocal<>();

    private CurrentUser() {}

    public static void set(String userId) { USER_ID.set(userId); }
    public static void setRole(String role) { ROLE.set(role); }

    public static String get() { return USER_ID.get(); }
    public static String role() { return ROLE.get(); }

    /** The authenticated user id, or throw 401 if none. */
    public static String require() {
        String id = USER_ID.get();
        if (id == null) throw new ApiException(HttpStatus.UNAUTHORIZED, "Not authenticated");
        return id;
    }

    /** The authenticated user id if they are an admin; 401 if unauthenticated, 403 if not admin. */
    public static String requireAdmin() {
        String id = require();
        if (!"admin".equals(ROLE.get())) throw new ApiException(HttpStatus.FORBIDDEN, "Admin access required");
        return id;
    }

    public static void clear() { USER_ID.remove(); ROLE.remove(); }
}
```

- [ ] **Step 3: Stash the role in AuthFilter**

In `config/AuthFilter.java`, add a `UserRepository` dependency and set the role when resolving the session. Add the import + field + constructor param:

```java
import com.fluenta.api.repo.UserRepository;
```
Change the constructor to accept `UserRepository users` (store it), and change the token-resolution block to:

```java
            if (header != null && header.startsWith("Bearer ")) {
                String token = header.substring(7).trim();
                sessions.findById(token).ifPresent(s -> {
                    CurrentUser.set(s.getUserId());
                    users.findById(s.getUserId()).ifPresent(u -> CurrentUser.setRole(u.getRole()));
                });
            }
```

- [ ] **Step 4: Expose role in UserDto + Mappers**

In `dto/UserDto.java`, add a `String role` field to the record (after `onboarded`, before `streak` — keep `streak` last to match `Mappers`):

```java
        boolean onboarded,
        String role,
        JsonNode streak
```
In `service/Mappers.java`, update `toDto(UserEntity u)` to pass `u.getRole()` in the matching position:

```java
                u.getLevel(), u.isOnboarded(), u.getRole(), json.parse(u.getStreak()));
```

- [ ] **Step 5: Add role to UserSummary**

In `dto/UserSummary.java`, add `role`:

```java
public record UserSummary(
        String id,
        String name,
        String email,
        String plan,
        String planLabel,
        boolean emailVerified,
        boolean onboarded,
        String role
) {}
```

- [ ] **Step 6: Seed u1 as admin + register as student**

In `config/SeedLoader.java` `seedUser()`, before `users.save(e);`, add:
```java
        e.setRole("admin");
```
And in `ensureDemoPassword()` (the idempotent backfill), set the role too so a pre-existing `u1` becomes admin — change its body to also ensure the role:
```java
    void ensureDemoPassword() {
        users.findById("u1").ifPresent(u -> {
            boolean changed = false;
            if (u.getPasswordHash() == null || u.getPasswordHash().isBlank()) {
                u.setPasswordHash(encoder.encode(demoPassword));
                u.setEmailVerified(true);
                changed = true;
            }
            if (!"admin".equals(u.getRole())) { u.setRole("admin"); changed = true; }
            if (changed) users.save(u);
        });
    }
```
In `service/AuthService.java` `register(...)`, add after `u.setEmailVerified(false);`:
```java
        u.setRole("student");
```

- [ ] **Step 7: Gate the admin controllers + mutations**

`web/AdminFeedbackController.java`: replace both `CurrentUser.require()` calls with `CurrentUser.requireAdmin()`.

`web/AdminUserController.java`: in `list(...)` replace `CurrentUser.require()` with `CurrentUser.requireAdmin()`; in `patch(...)` replace `CurrentUser.require()` with `CurrentUser.requireAdmin()`; and update `toSummary` to include the role:
```java
    private UserSummary toSummary(UserEntity u) {
        return new UserSummary(u.getId(), u.getName(), u.getEmail(), u.getPlan(),
                u.getPlanLabel(), u.isEmailVerified(), u.isOnboarded(), u.getRole());
    }
```

`web/ExamController.java`: add `CurrentUser.requireAdmin();` as the first line of `create`, `update`, `delete`, `setStatus`, and `duplicate` (add the import `import com.fluenta.api.config.CurrentUser;`). Leave `list`/`get` unchanged.

`web/CertificateController.java`: change `create` and `update` to call `CurrentUser.requireAdmin()` instead of `CurrentUser.require()` (they pass the returned id to the service); add `CurrentUser.requireAdmin();` as the first line of `delete`. Leave `list`/`get` unchanged.

- [ ] **Step 8: Write the failing tests**

Create `RolesContractTest.java`:

```java
package com.fluenta.api;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
class RolesContractTest {

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper om;

    private String adminToken() throws Exception {
        MvcResult r = mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"sara.hamzeh@example.com\",\"password\":\"yalla-demo\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.user.role").value("admin"))
                .andReturn();
        return om.readTree(r.getResponse().getContentAsString()).get("token").asText();
    }

    private String studentToken() throws Exception {
        String email = "stud-" + UUID.randomUUID() + "@example.com";
        MvcResult r = mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + email + "\",\"password\":\"secret12\",\"name\":\"Stu\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.user.role").value("student"))
                .andReturn();
        return om.readTree(r.getResponse().getContentAsString()).get("token").asText();
    }

    @Test
    void studentForbiddenFromAdminEndpoints() throws Exception {
        String t = studentToken();
        mvc.perform(get("/api/admin/users").header("Authorization", "Bearer " + t)).andExpect(status().isForbidden());
        mvc.perform(get("/api/admin/feedback").header("Authorization", "Bearer " + t)).andExpect(status().isForbidden());
    }

    @Test
    void studentForbiddenFromExamMutation() throws Exception {
        String t = studentToken();
        mvc.perform(post("/api/exams").header("Authorization", "Bearer " + t)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"id\":null,\"skill\":\"reading\",\"title\":\"x\",\"module\":\"academic\",\"status\":\"draft\",\"scope\":\"user\",\"timeLimit\":30,\"updatedAt\":null,\"format\":\"studio\",\"content\":{}}"))
                .andExpect(status().isForbidden());
    }

    @Test
    void studentCanStillReadExams() throws Exception {
        String t = studentToken();
        mvc.perform(get("/api/exams?status=published").header("Authorization", "Bearer " + t)).andExpect(status().isOk());
    }

    @Test
    void adminAllowedOnAdminEndpoints() throws Exception {
        String t = adminToken();
        mvc.perform(get("/api/admin/users").header("Authorization", "Bearer " + t)).andExpect(status().isOk());
        mvc.perform(get("/api/admin/feedback").header("Authorization", "Bearer " + t)).andExpect(status().isOk());
    }

    @Test
    void usersListExposesRole() throws Exception {
        String t = adminToken();
        mvc.perform(get("/api/admin/users?query=sara").header("Authorization", "Bearer " + t))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[?(@.id=='u1')].role").value(org.hamcrest.Matchers.contains("admin")));
    }
}
```

- [ ] **Step 9: Run to verify it fails**

Run: `cd backend && mvn -q -DforkCount=0 -Dtest=RolesContractTest test`
Expected: FAIL — role not exposed / endpoints not gated yet (compile + assertion failures).

- [ ] **Step 10: (implement Steps 1-7 if not already), then run to pass**

Run: `cd backend && mvn -q -DforkCount=0 -Dtest=RolesContractTest test` → PASS (5 tests).

- [ ] **Step 11: Full suite (no regressions)**

Run: `cd backend && mvn -q -DforkCount=0 test`
Expected: PASS. Note: the existing `HttpContractTest.studioCrudRoundTripsOverHttp` logs in as `u1` (now admin) and exercises exam CRUD — it stays green because `u1` is admin. If any pre-existing test that authors exams uses a non-admin login, update it to `u1`/admin.

- [ ] **Step 12: Commit**

```bash
git add backend/src/main/java/com/fluenta/api/domain/UserEntity.java \
  backend/src/main/java/com/fluenta/api/config/CurrentUser.java backend/src/main/java/com/fluenta/api/config/AuthFilter.java \
  backend/src/main/java/com/fluenta/api/dto/UserDto.java backend/src/main/java/com/fluenta/api/service/Mappers.java \
  backend/src/main/java/com/fluenta/api/dto/UserSummary.java backend/src/main/java/com/fluenta/api/web/AdminUserController.java \
  backend/src/main/java/com/fluenta/api/web/AdminFeedbackController.java backend/src/main/java/com/fluenta/api/web/ExamController.java \
  backend/src/main/java/com/fluenta/api/web/CertificateController.java backend/src/main/java/com/fluenta/api/service/AuthService.java \
  backend/src/main/java/com/fluenta/api/config/SeedLoader.java backend/src/test/java/com/fluenta/api/RolesContractTest.java
git commit -m "feat(backend): role field + requireAdmin gating for admin surface + authoring"
```

---

## Task 2: Backend — role-management PATCH + guards

**Files:**
- Modify: `backend/src/main/java/com/fluenta/api/web/AdminUserController.java`
- Test: `backend/src/test/java/com/fluenta/api/RoleManagementContractTest.java`

**Interfaces:**
- Consumes: `UserEntity.getRole()/setRole`, `UserRepository`, `CurrentUser.requireAdmin()`/`get()`, `ApiException`.
- Produces: `PATCH /api/admin/users/{id}` also accepts `{ "role": "student"|"admin" }`; guards: demoting the last admin → 400, self-demotion → 400, invalid role → 400.

- [ ] **Step 1: Write the failing tests**

Create `RoleManagementContractTest.java`:

```java
package com.fluenta.api;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
class RoleManagementContractTest {

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper om;

    private String adminToken() throws Exception {
        MvcResult r = mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"sara.hamzeh@example.com\",\"password\":\"yalla-demo\"}"))
                .andExpect(status().isOk()).andReturn();
        return om.readTree(r.getResponse().getContentAsString()).get("token").asText();
    }

    private String registerUserId(String token) throws Exception {
        String email = "role-" + UUID.randomUUID() + "@example.com";
        MvcResult r = mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + email + "\",\"password\":\"secret12\",\"name\":\"R\"}"))
                .andExpect(status().isOk()).andReturn();
        return om.readTree(r.getResponse().getContentAsString()).get("user").get("id").asText();
    }

    @Test
    void adminCanPromoteAndDemoteAnotherUser() throws Exception {
        String t = adminToken();
        String id = registerUserId(t);
        mvc.perform(patch("/api/admin/users/" + id).header("Authorization", "Bearer " + t)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"role\":\"admin\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.role").value("admin"));
        mvc.perform(patch("/api/admin/users/" + id).header("Authorization", "Bearer " + t)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"role\":\"student\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.role").value("student"));
    }

    @Test
    void selfDemotionRejected() throws Exception {
        String t = adminToken();
        mvc.perform(patch("/api/admin/users/u1").header("Authorization", "Bearer " + t)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"role\":\"student\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void invalidRoleRejected() throws Exception {
        String t = adminToken();
        String id = registerUserId(t);
        mvc.perform(patch("/api/admin/users/" + id).header("Authorization", "Bearer " + t)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"role\":\"superuser\"}"))
                .andExpect(status().isBadRequest());
    }
}
```

(Note: the last-admin guard is covered logically by self-demotion here — `u1` is the only seeded admin, so demoting it is both self-demotion and last-admin; both paths return 400. The self-demotion test exercises it.)

- [ ] **Step 2: Run to verify it fails**

Run: `cd backend && mvn -q -DforkCount=0 -Dtest=RoleManagementContractTest test`
Expected: FAIL — PATCH ignores `role`.

- [ ] **Step 3: Implement the role change + guards**

In `web/AdminUserController.java`, add a `UserRepository`-backed admin count and update `patch`. It already loads the user `u`. Add role handling before `users.save(u)`:

```java
    @PatchMapping("/{id}")
    public UserSummary patch(@PathVariable String id, @RequestBody Map<String, Object> body) {
        String actingUserId = CurrentUser.requireAdmin();
        UserEntity u = users.findById(id).orElseThrow(() -> ApiException.notFound("User"));
        Object v = body.get("emailVerified");
        if (v instanceof Boolean b) u.setEmailVerified(b);
        Object r = body.get("role");
        if (r instanceof String role) {
            if (!role.equals("student") && !role.equals("admin"))
                throw ApiException.badRequest("Invalid role");
            boolean demoting = "admin".equals(u.getRole()) && "student".equals(role);
            if (demoting) {
                if (id.equals(actingUserId)) throw ApiException.badRequest("You can't remove your own admin role");
                long admins = users.findAll().stream().filter(x -> "admin".equals(x.getRole())).count();
                if (admins <= 1) throw ApiException.badRequest("Can't remove the last admin");
            }
            u.setRole(role);
        }
        return toSummary(users.save(u));
    }
```

(Add imports as needed: `com.fluenta.api.domain.UserEntity` is already used; ensure `ApiException` is imported.)

- [ ] **Step 4: Run to pass + full suite**

Run: `cd backend && mvn -q -DforkCount=0 -Dtest=RoleManagementContractTest test` → PASS (3 tests).
Then: `cd backend && mvn -q -DforkCount=0 test` → PASS (whole suite).

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/fluenta/api/web/AdminUserController.java backend/src/test/java/com/fluenta/api/RoleManagementContractTest.java
git commit -m "feat(backend): admin role promote/demote via PATCH with last-admin + self-demotion guards"
```

---

## Task 3: Web — role plumbing + nav filter + route guard

**Files:**
- Modify: `src/mock/types.ts` (`FluentaUser`)
- Modify: `src/lib/auth.ts` (add `isAdmin`)
- Modify: `src/components/layout/Sidebar.tsx`, `src/components/layout/MobileNav.tsx`
- Create: `src/features/admin/AdminRoute.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `useAuth()` (from `@/store/auth-context`) → `user`.
- Produces: `FluentaUser.role: "student" | "admin"`; `isAdmin(user)` in `@/lib/auth`; admin nav filtered; `/studio/*` guarded by `<AdminRoute>`.

> Web has no unit-test runner; verify with `npm run lint && npm run build` + browser.

- [ ] **Step 1: Add `role` to FluentaUser + an isAdmin helper**

In `src/mock/types.ts`, add to `interface FluentaUser` (after `onboarded` or near the identity fields):

```typescript
  role: "student" | "admin";
```

In `src/lib/auth.ts`, add (import the type if needed):

```typescript
import type { FluentaUser } from "@/mock/types";
export const isAdmin = (u?: FluentaUser | null): boolean => u?.role === "admin";
```

- [ ] **Step 2: Filter the admin nav**

In `src/components/layout/Sidebar.tsx`, import auth + helper and filter `secondaryNav`:

```typescript
import { useAuth } from "@/store/auth-context";
import { isAdmin } from "@/lib/auth";
```
Inside the component, compute `const admin = isAdmin(useAuth().user);` and change the secondary-nav render (line ~140) to skip admin items for non-admins:

```tsx
          {secondaryNav.filter((item) => !item.adminBadge || admin).map((item) => (
            <NavRow key={item.to} item={item} collapsed={sidebarCollapsed} />
          ))}
```

In `src/components/layout/MobileNav.tsx`, similarly compute `const admin = isAdmin(useAuth().user);` and filter the combined list so `adminBadge` items only appear for admins (the file builds `const all = [...primaryNav, ...simulationChildren, ...secondaryNav];` — change the `secondaryNav` part to `...secondaryNav.filter((i) => !i.adminBadge || admin)`).

- [ ] **Step 3: Create AdminRoute**

Create `src/features/admin/AdminRoute.tsx`:

```tsx
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/store/auth-context";
import { isAdmin } from "@/lib/auth";

/** Route guard: renders admin child routes only for admins; others go to the dashboard. */
export function AdminRoute() {
  const { user } = useAuth();
  if (!isAdmin(user)) return <Navigate to="/" replace />;
  return <Outlet />;
}
```

- [ ] **Step 4: Guard the /studio routes**

In `src/App.tsx`, import `AdminRoute` and group the admin routes under it. Replace the five `/studio*` route entries (and `/studio/certificate/:id`) inside the `AppShell` `children` array with a single nested route:

```tsx
      {
        element: <AdminRoute />,
        children: [
          { path: "/studio", element: <StudioHome /> },
          { path: "/studio/feedback", element: <FeedbackReviewPage /> },
          { path: "/studio/users", element: <UsersPage /> },
          { path: "/studio/certificate/:id", element: <CertificateEditor /> },
          { path: "/studio/:skill/:id", element: <StudioEditorPage /> },
        ],
      },
```
(Add `import { AdminRoute } from "./features/admin/AdminRoute";`. Keep every other route as-is.)

- [ ] **Step 5: Type-check + build**

Run: `npm run lint && npm run build`
Expected: PASS. (Note: this may reveal other places that construct a `FluentaUser` literal without `role` — e.g. mock/demo data. Add `role: "student"` (or `"admin"` for a demo admin) to any such literal so `tsc` passes. If `mockApi.ts` or a seed literal builds a user, update it.)

- [ ] **Step 6: Browser verification**

In the preview: signed in as the demo admin (`u1`), the sidebar shows Content Studio / Feedback Review / Users and `/studio` loads. Simulate a student (e.g. temporarily point the app at a student session, or set `user.role` to `student` via devtools) — the admin nav disappears and visiting `/studio` redirects to `/`. Screenshot both.

- [ ] **Step 7: Commit**

```bash
git add src/mock/types.ts src/lib/auth.ts src/components/layout/Sidebar.tsx src/components/layout/MobileNav.tsx src/features/admin/AdminRoute.tsx src/App.tsx
git commit -m "feat(web): gate admin nav + /studio routes behind the admin role"
```

---

## Task 4: Web — Users page role column + toggle

**Files:**
- Modify: `src/lib/api.ts` (`AdminUserDto.role`, `api.adminUsers.setRole`)
- Modify: `src/features/admin/UsersPage.tsx`

**Interfaces:**
- Consumes: backend `PATCH /api/admin/users/{id}` `{role}` (Task 2); `useAuth()` for the current user id.
- Produces: `AdminUserDto.role`; `api.adminUsers.setRole(id, role)`; a Role column + Make/Remove admin action.

- [ ] **Step 1: Add role to the admin API client**

In `src/lib/api.ts`, add `role` to `AdminUserDto`:

```typescript
  role: "student" | "admin";
```
Add to the `adminUsers` group:

```typescript
    setRole: (id: string, role: "student" | "admin") =>
      request<AdminUserDto>("PATCH", `/admin/users/${id}`, { role }),
```

- [ ] **Step 2: Add the Role column + toggle to UsersPage**

In `src/features/admin/UsersPage.tsx`:
- Import `useAuth` (`@/store/auth-context`) and get the current user id: `const meId = useAuth().user?.id;`.
- Add a header cell `<th …>Role</th>` between "Bundle" and "Status".
- Add a body cell rendering the role as a `Badge` (e.g. `u.role === "admin" ? <Badge variant="secondary">Admin</Badge> : <span className="text-muted-foreground">Student</span>`).
- In the Actions cell, add a role toggle button (in addition to the existing "Mark verified"), hidden on your own row:

```tsx
{u.id !== meId && (
  u.role === "admin" ? (
    <Button size="sm" variant="ghost" onClick={() => setRole(u, "student")}>Remove admin</Button>
  ) : (
    <Button size="sm" variant="outline" onClick={() => setRole(u, "admin")}>Make admin</Button>
  )
)}
```
- Add the handler:

```tsx
  async function setRole(u: AdminUserDto, role: "student" | "admin") {
    try {
      await api.adminUsers.setRole(u.id, role);
      toast.success(role === "admin" ? `${u.name} is now an admin` : `${u.name} is now a student`);
      load();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Update failed");
    }
  }
```
(`load` is the existing reload function in the page; if the page uses `useAsync`'s `reload`, call that instead.)

- [ ] **Step 3: Type-check + build**

Run: `npm run lint && npm run build`
Expected: PASS.

- [ ] **Step 4: Browser verification**

As the admin, open `/studio/users`: the Role column shows, "Make admin"/"Remove admin" toggles a row (verify via `read_network_requests` if the backend can't bind), your own row has no toggle, and a last-admin/self attempt surfaces the 400 message as a toast. Screenshot.

- [ ] **Step 5: Commit**

```bash
git add src/lib/api.ts src/features/admin/UsersPage.tsx
git commit -m "feat(web): Users page role column + make/remove admin toggle"
```

---

## Task 5: Mobile — FluentaUser.role

**Files:**
- Modify: `fluenta-mobile/lib/models/models.dart` (`FluentaUser`)
- Test: `fluenta-mobile/test/models/fluenta_user_test.dart`

**Interfaces:**
- Produces: `FluentaUser.role` (String, default `"student"`), parsed in `fromJson`, carried through `copyWith`.

- [ ] **Step 1: Write the failing test**

Append to `test/models/fluenta_user_test.dart` (match its existing style; if it builds a JSON map, reuse that):

```dart
  test('role defaults to student when absent and reads admin when present', () {
    final base = <String, dynamic>{
      'id': 'u9', 'name': 'X', 'email': 'x@e.com', 'initials': 'X',
      'plan': 'free', 'planLabel': 'Free', 'renewsInDays': 0, 'targetBand': 6.5,
      'saveHistory': true, 'onboarded': true, 'streak': {'current': 0, 'best': 0, 'last30': []},
    };
    expect(FluentaUser.fromJson(base).role, 'student');
    expect(FluentaUser.fromJson({...base, 'role': 'admin'}).role, 'admin');
  });
```
(If the existing test file already defines a base user map/helper, reuse it instead of redefining.)

- [ ] **Step 2: Run to verify it fails**

Run: `cd /d/personal/fluenta-mobile && flutter test test/models/fluenta_user_test.dart`
Expected: FAIL — `role` is not a member of `FluentaUser`.

- [ ] **Step 3: Add the field**

In `fluenta-mobile/lib/models/models.dart`, `FluentaUser`:
- Add the field: `final String role;`
- Add to the constructor: `this.role = 'student',`
- In `fromJson`, add: `role: (json['role'] as String?) ?? 'student',`
- In `copyWith`, add a `String? role` param and `role: role ?? this.role,`.

- [ ] **Step 4: Run to pass + analyze + full suite**

Run: `cd /d/personal/fluenta-mobile && flutter test test/models/fluenta_user_test.dart` → PASS.
Then: `cd /d/personal/fluenta-mobile && flutter analyze && flutter test` → analyze clean, all pass.

- [ ] **Step 5: Commit (mobile repo)**

```bash
cd D:/personal/fluenta-mobile
git add lib/models/models.dart test/models/fluenta_user_test.dart
git commit -m "feat(mobile): FluentaUser.role (mirrors backend; default student)"
```

---

## Task 6: Docs — roadmaps

**Files:**
- Modify: `docs/ROADMAP.md` (web) + `fluenta-mobile/docs/ROADMAP.md`
- (graphify refresh for web + mobile is handled by the coordinator after the final review.)

- [ ] **Step 1: Update both roadmaps**

Web `docs/ROADMAP.md`: move "Roles / admin gating" to Done (recent), noting the role field, 403 gating of `/api/admin/**` + authoring mutations, hidden admin nav + guarded `/studio/*`, and the Users page role toggle with last-admin/self-demotion guards. Mobile `fluenta-mobile/docs/ROADMAP.md`: mark "Roles / admin gating" done (note mobile only carries the `role` field; enforcement is web/backend).

- [ ] **Step 2: Commit both repos**

```bash
git -C D:/personal/fluenta-web add docs/ROADMAP.md
git -C D:/personal/fluenta-web commit -m "docs: mark roles/admin gating done"
git -C D:/personal/fluenta-mobile add docs/ROADMAP.md
git -C D:/personal/fluenta-mobile commit -m "docs: mark roles/admin gating done (mobile carries the role field)"
```

---

## Self-Review

**Spec coverage:**
- `role` on UserEntity/UserDto/UserSummary/FluentaUser → Tasks 1 (backend), 3 (web), 5 (mobile). ✓
- `CurrentUser.requireAdmin()` (401/403) + AuthFilter role stash → Task 1 Steps 2-3. ✓
- Gating `/api/admin/**` + exam + certificate mutations → Task 1 Step 7. ✓
- Seed u1 admin (incl. backfill) + register student → Task 1 Step 6. ✓
- Role-management PATCH + last-admin + self-demotion + invalid-role guards → Task 2. ✓
- Web nav filter + AdminRoute guard on `/studio/*` → Task 3. ✓
- Web Users role column + toggle (hidden on own row) + guard-error toasts → Task 4. ✓
- Mobile role field → Task 5. ✓
- 403 error behavior + guard 400s → Tasks 1/2 + tests. ✓
- Roadmap + graphify → Task 6 + coordinator. ✓

**Placeholder scan:** No TBD/TODO; every code step carries concrete code. Task 3 Step 5 flags the known follow-on (FluentaUser literals needing `role`) with the concrete fix.

**Type consistency:** `role` is `"student"|"admin"` everywhere (backend String, TS union, Dart String). `CurrentUser.requireAdmin()` (Task 1) consumed by controllers (Task 1/2). `UserSummary`/`AdminUserDto` gain `role` (Tasks 1/4) — consumed by the Users page (Task 4). `isAdmin(user)` (Task 3) consumed by Sidebar/MobileNav/AdminRoute (Task 3). `api.adminUsers.setRole(id, role)` (Task 4) matches the backend PATCH body `{role}` (Task 2). `FluentaUser.role` default `"student"` consistent between web (Task 3) and mobile (Task 5).
