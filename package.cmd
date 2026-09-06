@echo off
rem Package the whole app (React UI + Spring Boot API) into ONE runnable JAR, then assemble a
rem copy-and-run bundle in dist-app\. Requires Node + a JDK 21 on this (build) machine.
rem The destination laptop then needs only a Java 21 runtime + the dist-app\ folder — no source.
setlocal
cd /d "%~dp0"

echo [package] 1/4 Building the frontend (npm run build)...
call npm run build
if errorlevel 1 ( echo [package] Frontend build failed. & exit /b 1 )

echo [package] 2/4 Copying the built UI into the backend (src\main\resources\static)...
set "STATIC=backend\src\main\resources\static"
if exist "%STATIC%" rmdir /s /q "%STATIC%"
mkdir "%STATIC%"
xcopy /e /i /y "dist\*" "%STATIC%\" >nul
if errorlevel 1 ( echo [package] Copy failed. & exit /b 1 )

echo [package] 3/4 Detecting a JDK 21...
set "JDK="
for %%D in (
  "D:\java\jdk-21.0.2"
  "%ProgramFiles%\Eclipse Adoptium\jdk-21.0.4.7-hotspot"
  "%ProgramFiles%\Java\jdk-21"
) do (
  if not defined JDK if exist "%%~D\bin\java.exe" set "JDK=%%~D"
)
if not defined JDK if defined JAVA_HOME if exist "%JAVA_HOME%\bin\java.exe" set "JDK=%JAVA_HOME%"
if not defined JDK ( echo [package] No JDK 21 found. Install one or set JAVA_HOME. & exit /b 1 )
set "JAVA_HOME=%JDK%"
echo [package]      Using JAVA_HOME=%JAVA_HOME%

echo [package] 4/4 Packaging the runnable JAR (mvnw package)...
cd backend
call .\mvnw.cmd -q -DskipTests clean package
if errorlevel 1 ( echo [package] Maven package failed. & cd .. & exit /b 1 )
cd ..

rem Assemble a copy-and-run bundle.
set "OUT=dist-app"
if exist "%OUT%" rmdir /s /q "%OUT%"
mkdir "%OUT%"
for %%F in (backend\target\fluenta-api-*.jar) do copy /y "%%F" "%OUT%\yalla-english-hub.jar" >nul
copy /y "backend\deploy\start.cmd" "%OUT%\start.cmd" >nul
copy /y "backend\deploy\README.txt" "%OUT%\README.txt" >nul

echo.
echo [package] DONE.
echo [package]   Single JAR : backend\target\fluenta-api-*.jar
echo [package]   Bundle     : %OUT%\   (yalla-english-hub.jar + start.cmd + README.txt)
echo [package]   Deploy     : copy the %OUT%\ folder to the laptop, install Java 21, run start.cmd,
echo [package]                then open http://localhost:8080
