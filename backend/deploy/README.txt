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

Notes
-----
- A local database file is created next to the JAR at  data\fluenta.db  on first run.
- To reset all data: stop the app and delete the  data  folder, then start again.
- Health check:  http://localhost:8080/health
- If the app fails to start with "Unable to establish loopback connection", a local proxy
  (e.g. mscopilot_proxy.exe) is blocking Java's loopback. Quit that process (Task Manager
  -> End task) and run start.cmd again.
