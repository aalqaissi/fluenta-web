@echo off
rem Launch the Yalla English Hub standalone app (single JAR). Needs a Java 21 runtime (JRE or JDK).
setlocal
cd /d "%~dp0"

set "JAVACMD="
for %%D in (
  "%ProgramFiles%\Eclipse Adoptium\jdk-21.0.4.7-hotspot"
  "%ProgramFiles%\Eclipse Adoptium\jre-21"
  "D:\java\jdk-21.0.2"
  "%ProgramFiles%\Java\jdk-21"
) do (
  if not defined JAVACMD if exist "%%~D\bin\java.exe" set "JAVACMD=%%~D\bin\java.exe"
)
if not defined JAVACMD if defined JAVA_HOME if exist "%JAVA_HOME%\bin\java.exe" set "JAVACMD=%JAVA_HOME%\bin\java.exe"
if not defined JAVACMD for %%J in (java.exe) do if not defined JAVACMD set "JAVACMD=%%~$PATH:J"

if not defined JAVACMD (
  echo Java 21 was not found. Install Temurin JRE/JDK 21 from https://adoptium.net and try again.
  pause
  exit /b 1
)

echo Starting Yalla English Hub ...  open  http://localhost:8080  in your browser.
echo (Press Ctrl+C in this window to stop.)
"%JAVACMD%" -jar "%~dp0yalla-english-hub.jar"
pause
