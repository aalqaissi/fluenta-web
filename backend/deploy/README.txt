Yalla English Hub - standalone app
==================================

This folder is the whole application (web UI + API) in a single JAR. No source code,
Node.js, or Maven needed on this machine.

Requirements
------------
- Java 21 runtime (JRE or JDK). Get "Temurin 21" from https://adoptium.net (Windows x64).

Run
---
- Double-click  start.cmd
  (or, in this folder, run:  java -jar yalla-english-hub.jar )
- Then open  http://localhost:8080  in your browser.
- Sign in with "Continue with Google" (demo user) or a new email (starts onboarding).

AI providers
------------
- Without any keys set, the app runs with offline stub AI (Coach/Writing/Speaking/Studio/
  Live-Interview all work, never error) -- nothing to configure to try it out.
- To enable real AI, put your keys in a local file  keys.local.cmd  next to start.cmd: copy
  keys.local.cmd.example  to  keys.local.cmd  and fill in ONE pair below. start.cmd loads it
  automatically; it is git-ignored and is preserved across package.cmd rebuilds, so your keys
  are never committed or baked into the shared jar. (Alternatively set the same names as Windows
  environment variables via  setx .)
    Pair A: Claude + OpenAI Whisper (default providers)
      FLUENTA_AI_API_KEY=sk-ant-...
      FLUENTA_TRANSCRIBE_API_KEY=sk-...
    Pair B: Gemini + Groq (free)
      FLUENTA_AI_PROVIDER=gemini
      FLUENTA_AI_API_KEY=...gemini-key...
      FLUENTA_TRANSCRIBE_PROVIDER=groq
      FLUENTA_TRANSCRIBE_API_KEY=...groq-key...
- Models are overridable via  FLUENTA_AI_MODEL  and  FLUENTA_TRANSCRIBE_MODEL  if you want a
  different model than the provider's default.

Notes
-----
- A local database file is created next to the JAR at  data\fluenta.db  on first run.
- To reset all data: stop the app and delete the  data  folder, then start again.
- Health check:  http://localhost:8080/health
- If the app fails to start with "Unable to establish loopback connection", a local proxy
  (e.g. mscopilot_proxy.exe) is blocking Java's loopback. Quit that process (Task Manager
  -> End task) and run start.cmd again.
