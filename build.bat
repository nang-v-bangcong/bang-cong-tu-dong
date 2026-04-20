@echo off
chcp 65001 >nul
echo === Bang Cong - Production Build ===
echo.

:: Bump version (skip if BUMP_SKIP=1)
if "%BUMP_SKIP%"=="" (
    echo [1/4] Bumping patch version...
    node scripts/bump-version.js --patch
    if errorlevel 1 (
        echo BUMP FAILED!
        exit /b 1
    )
) else (
    echo [1/4] BUMP_SKIP set, keeping current version
)

:: Clean
echo [2/4] Cleaning old build...
if exist build\bin rmdir /s /q build\bin

:: Build
echo [3/4] Building Windows exe...
wails build -clean -ldflags "-s -w" -trimpath
if errorlevel 1 (
    echo BUILD FAILED!
    exit /b 1
)

:: Optional: UPX compress
where upx >nul 2>&1
if %errorlevel%==0 (
    echo [4/4] Compressing with UPX...
    upx --best build\bin\BangCong.exe
) else (
    echo [4/4] UPX not found, skipping compression
)

echo.
echo === Build complete! ===
echo Output: build\bin\BangCong.exe
if exist build\bin\BangCong-amd64-installer.exe (
    echo Installer: build\bin\BangCong-amd64-installer.exe
)
