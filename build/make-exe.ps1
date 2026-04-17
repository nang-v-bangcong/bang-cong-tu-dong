# Build a single-file Windows exe with full VersionInfo metadata.
#
# Wails v2.12's built-in resource writer (tc-hib/winres) produces a version
# resource that Windows' VersionAPI cannot read, so we generate the .syso
# manually with josephspurrier/goversioninfo and then pass -nopackage to Wails
# so it doesn't overwrite our file.
#
# Usage (from repo root):
#     pwsh build/make-exe.ps1
# or in bash:
#     powershell -NoProfile -File build/make-exe.ps1

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

# 1. Ensure goversioninfo is on PATH.
$gvi = "$env:USERPROFILE\go\bin\goversioninfo.exe"
if (-not (Test-Path $gvi)) {
    Write-Host "Installing goversioninfo..."
    go install github.com/josephspurrier/goversioninfo/cmd/goversioninfo@latest
}

# 2. Generate bang-cong-res.syso at repo root (picked up by `go build`).
Write-Host "Generating resource .syso..."
& $gvi -platform-specific=$false -64 -o bang-cong-res.syso versioninfo.json

# 3. Build with Wails, skipping its packaging step (we already have .syso).
Write-Host "Building with wails..."
wails build -nopackage -clean -trimpath -ldflags="-s -w"

# 4. Report.
$exe = Join-Path $root 'build\bin\BangCong.exe'
if (Test-Path $exe) {
    $size = [Math]::Round((Get-Item $exe).Length / 1MB, 2)
    Write-Host "Built: $exe ($size MB)"
} else {
    Write-Error "Build output missing at $exe"
    exit 1
}
