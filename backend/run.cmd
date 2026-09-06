@echo off
rem Run the Yalla English Hub backend on a JDK 21 without having to set JAVA_HOME yourself.
rem Auto-detects a JDK 21 (your PATH `java` may be a different version) and starts the API on :8080.
setlocal
cd /d "%~dp0"

set "JDK="
for %%D in (
  "D:\java\jdk-21.0.2"
  "%ProgramFiles%\Eclipse Adoptium\jdk-21.0.4.7-hotspot"
  "%ProgramFiles%\Java\jdk-21"
) do (
  if not defined JDK if exist "%%~D\bin\java.exe" set "JDK=%%~D"
)
rem Fall back to an already-set JAVA_HOME if it looks like a JDK.
if not defined JDK if defined JAVA_HOME if exist "%JAVA_HOME%\bin\java.exe" set "JDK=%JAVA_HOME%"

if not defined JDK (
  echo [run.cmd] Could not find a JDK 21. Install one or set JAVA_HOME to a JDK 21, then retry.
  exit /b 1
)

set "JAVA_HOME=%JDK%"
echo [run.cmd] Using JAVA_HOME=%JAVA_HOME%
echo [run.cmd] Starting the API on http://localhost:8080 ...
call .\mvnw.cmd spring-boot:run %*
