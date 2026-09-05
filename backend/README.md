# Fluenta API — Spring Boot backend

Java 21 · Spring Boot 3.3 · SQLite (single embedded file, no DB engine to install).
Serves the React/Vite frontend: auth, Content Studio authoring, exam listing, **server-side
scoring** of reading/listening attempts, results, progress, certificates and seeded reference
content. **AI features are held this stage** — `/api/ai/*` returns `501 Not Implemented`.

## Prerequisites

- JDK 21 (this repo was built with `D:\java\jdk-21.0.2`; any JDK 21 works).
- Maven (a wrapper `./mvnw` is included; a system `mvn` also works).

Point Maven at JDK 21 if it isn't already:

```bash
set JAVA_HOME=D:\java\jdk-21.0.2
```

## Run

```bash
cd backend
mvnw spring-boot:run
```

The API starts on **http://localhost:8080** and, on first run, seeds the database from
`src/main/resources/seed/*.json` (1 user, 7 exams, 2 certificates). The SQLite file is created at
`backend/data/fluenta.db` (gitignored). Delete that file to re-seed from scratch.

Then start the frontend (repo root) in another terminal:

```bash
npm install
npm run dev            # http://localhost:5173
```

The frontend reads the API base URL from `VITE_API_URL` (default `http://localhost:8080/api`, see
`.env.example`). CORS allows the Vite dev origin out of the box.

## Verify without starting the web server

The full logic + HTTP layer is covered by tests that run **in-process** (no socket needed):

```bash
mvnw -DforkCount=0 test          # MockMvc HTTP-contract tests (routing, auth, scoring, CRUD, 501s)
```

Headless logic check against real SQLite (seeding, scoring, CRUD), no web server:

```bash
mvnw -DskipTests -Dspring-boot.run.arguments="--spring.main.web-application-type=none --spring.profiles.active=verify" spring-boot:run
```

## ⚠️ Known environment issue on this machine — Java NIO loopback

On the machine this was built on, the embedded web server (Tomcat) **fails to start** with:

```
java.io.IOException: Unable to establish loopback connection
    at sun.nio.ch.PipeImpl$Initializer ...
```

This is **not** a bug in this project. Java's NIO `Selector` (used by every Java HTTP server —
Tomcat, Jetty, Netty, even the JDK's own) opens an internal loopback "self-pipe" with a secret
handshake. On this machine that handshake is disrupted by local software intercepting loopback
traffic (a local proxy process — `mscopilot_proxy.exe` — and/or endpoint protection was running).
Plain sockets and NIO channels work; only the selector self-pipe fails, and no JVM flag
(`-Djava.net.preferIPv4Stack`, etc.) works around it.

**How to run the server anyway** (any one of these):

1. **Allow `java.exe` loopback** — add a firewall/AV exclusion for the JDK's `java.exe`, or
   temporarily disable the local loopback-intercepting proxy, then `mvnw spring-boot:run`.
2. **Run it in Docker / WSL** (a Linux container/VM doesn't use the Windows self-pipe):
   e.g. install a WSL distro with JDK 21 and run `./mvnw spring-boot:run` there — WSL2 forwards
   `localhost:8080` to Windows, so the frontend reaches it unchanged.
3. **Run on any other host / CI** — the code is standard Spring Boot and starts normally where the
   selector isn't blocked.

Until the server can bind, the frontend shows a clear "Can't reach the Fluenta API" screen with a
Retry button (it is not broken — it just needs the backend up).

## Layout

```
src/main/java/com/fluenta/api/
  config/    CORS, bearer AuthFilter, SeedLoader, VerifyRunner
  domain/    JPA entities (User, Exam, Attempt, Certificate, Session) — JSON content columns
  dto/       records mirroring the FE TS types
  repo/      Spring Data JPA repositories
  service/   Scoring (ported from the FE), Auth, Exam, Attempt, Certificate, Content, mappers
  web/       REST controllers + global error handling
src/main/resources/
  application.yml
  seed/*.json          # generated from the FE mock modules via `npm run seed:export`
```

## Notes / follow-ups (not done this stage)

- Auth is a **prototype**: login resolves to the seeded user (any email → demo user); passwords are
  not stored or verified. Replace with real auth before any real use.
- AI endpoints are stubs (`501`). Writing/speaking feedback, coach chat and live interview land in a
  later stage.
- SQLite is fine for local single-user use. To move to Postgres, swap the datasource in
  `application.yml` and add the Postgres driver — the JPA layer is unchanged.
