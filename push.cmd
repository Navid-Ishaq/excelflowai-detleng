@echo off
setlocal DisableDelayedExpansion
cd /d "%~dp0" || exit /b 1
git rev-parse --is-inside-work-tree >nul 2>&1 || goto :failed
set "BRANCH="
for /f "delims=" %%B in ('git branch --show-current') do set "BRANCH=%%B"
if not "%BRANCH%"=="main" (
 echo This script only pushes the main branch. Current branch: %BRANCH%
 exit /b 1
)
git remote get-url origin || goto :failed
echo.
git status --short || goto :failed
echo Review the files above. Do not stage secrets, private workbooks or unwanted changes.
choice /C YN /M "Stage all tracked and non-ignored changes"
if errorlevel 2 goto :cancel
if not errorlevel 1 goto :failed
git add -A || goto :failed
git diff --cached --stat || goto :failed
git diff --cached --name-status || goto :failed
git diff --cached --check || goto :failed
git diff --cached --quiet
if errorlevel 2 goto :failed
if not errorlevel 1 goto :push
set "MESSAGE="
set /p "MESSAGE=Commit message: "
if not defined MESSAGE (
 echo Empty message. No commit or push performed. Changes remain staged.
 exit /b 1
)
rem Keep the message out of command parsing: pass it through a temporary file.
rem PowerShell reads the environment variable directly (no interpolation in the command).
set "MESSAGE_FILE=%TEMP%\excelflow-commit-%RANDOM%-%RANDOM%.txt"
powershell -NoProfile -Command "[IO.File]::WriteAllText($env:MESSAGE_FILE,$env:MESSAGE,(New-Object System.Text.UTF8Encoding($false)))" || goto :failed
git commit -F "%MESSAGE_FILE%"
if errorlevel 1 (
 del /q "%MESSAGE_FILE%" >nul 2>&1
 goto :failed
)
del /q "%MESSAGE_FILE%" >nul 2>&1
:push
echo.
git status -sb || goto :failed
choice /C YN /M "Push local main commits to origin/main now"
if errorlevel 2 goto :cancel
if not errorlevel 1 goto :failed
git push origin main || goto :failed
echo Push completed. Check GitHub Actions for deployment status.
exit /b 0
:cancel
echo Cancelled. Any staged changes or local commits remain available.
exit /b 0
:failed
echo Command failed. Review the error above. No force push or automatic merge is performed.
exit /b 1
