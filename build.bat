@echo off
echo === Bang Cong - Production Build ===
echo.

:: Clean
echo [1/3] Cleaning old build...
if exist build\bin rmdir /s /q build\bin

:: Build
echo [2/3] Building Windows exe...
wails build -clean -ldflags "-s -w" -trimpath
if errorlevel 1 (
    echo BUILD FAILED!
    exit /b 1
)

:: Optional: UPX compress
where upx >nul 2>&1
if %errorlevel%==0 (
    echo [3/3] Compressing with UPX...
    upx --best build\bin\BangCong.exe
) else (
    echo [3/3] UPX not found, skipping compression
)

echo.
echo === Build complete! ===
echo Output: build\bin\BangCong.exe
if exist build\bin\BangCong-amd64-installer.exe (
    echo Installer: build\bin\BangCong-amd64-installer.exe
)
