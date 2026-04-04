@echo off
echo === Bang Cong - Installer Build ===
echo.

:: Check NSIS
where makensis >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: NSIS not installed!
    echo Install: scoop install nsis  or  choco install nsis
    exit /b 1
)

:: Build with NSIS
echo Building Windows exe + installer...
wails build -clean -ldflags "-s -w" -trimpath -nsis
if errorlevel 1 (
    echo BUILD FAILED!
    exit /b 1
)

echo.
echo === Build complete! ===
echo Exe: build\bin\BangCong.exe
echo Installer: build\bin\BangCong-amd64-installer.exe
