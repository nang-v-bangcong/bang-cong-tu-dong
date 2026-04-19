# Research: Wails v2 Multi-Project Desktop App

## 1. Wails v2 Monorepo Setup (Root App + Admin)

### Recommended: Go Workspace (go.work)
- **Go 1.18+**: Native workspace support (`go.work` file at repo root)
- **Structure**: 
  ```
  repo/
  ├── go.work          # ties both modules locally
  ├── go.mod           # root module (optional)
  ├── cmd/app/         # main app, own go.mod
  ├── admin/           # admin app, own go.mod
  └── pkg/common/      # shared types, own go.mod
  ```
- **go.work file**:
  ```
  go 1.21
  use (
    ./cmd/app
    ./admin
    ./pkg/common
  )
  ```
- **Benefits**: Clean go.mod files, no replace directives, local dev convenience
- **Caveat**: go.work is personal per developer, add to .gitignore before push

### Import Paths Between Modules
- After go.work setup, import works naturally:
  ```go
  import "github.com/yourorg/btt/pkg/common"  // works in both app & admin
  ```
- Wails v2 auto-generates `wailsjs/go/` bindings per app frontend
- Frontend imports from auto-generated: `import { Greet } from "../wailsjs/go/main/App"`

### Build from Subfolder
- **Per-project**: `wails build -tags dev` works from `admin/` directory if admin/wails.json exists
- **Root directory**: Specify config: `wails build -c admin/wails.json`
- Each app needs own `wails.json` with:
  ```json
  {
    "outputfilename": "admin-app",
    "frontend": {
      "dir": "frontend",
      "build": "npm run build",
      "install": "npm ci"
    }
  }
  ```
- **Risk**: Node.js node_modules duplicate (frontend/ in each app). Mitigation: monorepo root `package.json` + workspaces, or accept duplication

## 2. Windows Credential Manager via wincred

### Library: github.com/danieljoos/wincred
- **Go Packages**: `pkg.go.dev/github.com/danieljoos/wincred`
- **GitHub**: danieljoos/wincred
- **Size Limit**: CRED_MAX_CREDENTIAL_BLOB_SIZE = 2560 bytes (5×512)
  - GitHub PAT tokens (~40-100 bytes) fit safely
  - Sufficient for: token + metadata

### Core API (Go)
```go
import "github.com/danieljoos/wincred"

// SaveToken saves GitHub PAT
func SaveToken(targetName, token string) error {
    cred := wincred.NewGenericCredential(targetName)
    cred.UserName = "github_pat"
    cred.CredentialBlob = []byte(token)
    return cred.Write()
}

// LoadToken retrieves stored PAT
func LoadToken(targetName string) (string, error) {
    cred, err := wincred.GetGenericCredential(targetName)
    if err != nil {
        return "", err
    }
    return string(cred.CredentialBlob), nil
}

// DeleteToken removes credential
func DeleteToken(targetName string) error {
    cred, err := wincred.GetGenericCredential(targetName)
    if err != nil {
        return err
    }
    return cred.Delete()
}
```

### Windows .exe Compatibility
- Works in packaged `.exe` without manifest modifications
- Wincred uses Win32 API directly (no external deps)
- Requires Windows only; won't error on Linux but returns "Operation not supported"
- No elevation needed if running as standard user (credentials stored per-user)

### Alternative: AES File Encryption
- `os/user.CurrentUser()` → get unique user ID
- Derive key from Windows DPAPI or machine key
- Less preferred: wincred is standard Windows approach

## 3. html2canvas in Wails v2 WebView2

### Compatibility
- **WebView2 Edge Chromium**: Supports modern JS APIs
- **html2canvas v1.x**: Fully compatible
- Limitation: **captures only DOM**, not browser UI chrome/title bar
- Don't treat as "true" screenshot; pixel-perfect rendering not guaranteed

### Size Optimization (TS)
```typescript
async function captureAndCompress(): Promise<string> {
    const canvas = await html2canvas(element, {
        scale: 1.5,
        useCORS: true,
        allowTaint: true
    });
    
    // Convert to JPEG at 0.7 quality
    const base64 = canvas.toDataURL('image/jpeg', 0.7);
    
    // Typically 1.5MB for 1920×1080 at Q0.7
    if (base64.length > 2097152) { // 2MB limit
        return canvas.toDataURL('image/jpeg', 0.5); // fallback Q0.5
    }
    return base64;
}
```
- Q=0.7: good balance quality/size
- Q=0.5: smaller but visibly worse

### Known Issues
- Author marks html2canvas as "experimental" (GitHub niklasvh/html2canvas)
- May fail on complex CSS/SVG rendering
- No video support (renders blank)
- Cross-origin images require CORS headers

## 4. Wails v2 Runtime Methods

### No WindowScreenshot Method
- Wails v2 runtime lacks native screenshot function
- **Alternative**: html2canvas (JS-based) or GDI+ screen capture (external crate)
- `Environment()` returns build type, platform, architecture
  ```go
  env := runtime.Environment(ctx)
  // env.Platform, env.Arch, env.BuildType
  ```

### BrowserOpenURL
- Opens link in default system browser
  ```go
  runtime.BrowserOpenURL(ctx, "https://download.example.com/app.exe")
  ```

### Sonner Toast with Action Button (TS)
```typescript
import { toast } from 'sonner';

toast.info('Update available', {
    description: 'New version ready to install',
    action: {
        label: 'Download',
        onClick: () => {
            window.runtime.BrowserOpenURL('https://...');
        }
    },
    duration: 5000
});
```

### Available Runtime Methods (Partial)
- Window: `WindowSetTitle()`, `WindowSetSize()`, `WindowMaximise()`, etc.
- Dialog: `OpenFileDialog()`, `SaveFileDialog()`, `MessageDialog()`
- Clipboard: `ClipboardGetText()`, `ClipboardSetText()`
- Events: `EventsOn()`, `EventsEmit()`, `EventsOff()`
- Notifications (v2.12.0+): `SendNotificationWithActions()` + icon/actions

## 5. File System & Upload from Admin App

### Scan for Latest .exe
```go
import "os"

func GetLatestExe(buildDir string) (string, error) {
    files, err := os.ReadDir(buildDir)
    if err != nil {
        return "", err
    }
    
    var latest string
    var latestTime time.Time
    
    for _, f := range files {
        if !f.IsDir() && strings.HasSuffix(f.Name(), ".exe") {
            info, _ := f.Info()
            if info.ModTime().After(latestTime) {
                latestTime = info.ModTime()
                latest = filepath.Join(buildDir, f.Name())
            }
        }
    }
    return latest, nil
}
```

### Stream Upload with Progress (Go)
```go
file, err := os.Open(exePath)
defer file.Close()

stat, _ := file.Stat()
body := &progressReader{
    reader: file,
    size:   stat.Size(),
    onProgress: func(n int64) {
        // emit Wails event
        runtime.EventsEmit(ctx, "uploadProgress", float64(n)/float64(stat.Size()))
    },
}

resp, err := http.Post("https://server/upload", 
    "application/octet-stream", body)
```

### Filesystem Restrictions
- Wails v2 runtime methods don't restrict file access
- ACL depends on Windows user permissions (admin app runs as current user)
- No sandboxing unless explicitly configured

## Risks & Unknowns

1. **go.sum conflicts**: if both apps pull different versions of same dep, resolution needed via workspace
2. **Frontend build duplication**: two `node_modules/` folders if separate frontend/ dirs (vs monorepo root)
3. **wincred thread safety**: undocumented; ensure synchronous access or add mutex
4. **html2canvas SVG filters**: complex CSS filters may render incorrectly
5. **Long-term wincred support**: lib last release 2022; consider fork if maintenance needed
6. **Admin app security**: runs as current user; if main app elevated, admin may lack permissions
7. **WebView2 version**: Wails bundles, but outdated versions may have compat issues with edge-case JS features

## Sources

- [Wails v2 Documentation - Runtime Browser](https://wails.io/docs/reference/runtime/browser/)
- [Wails v2 Documentation - Runtime Window](https://wails.io/docs/reference/runtime/window/)
- [wincred GitHub Repository](https://github.com/danieljoos/wincred)
- [wincred Go Package Documentation](https://pkg.go.dev/github.com/danieljoos/wincred)
- [Go Workspaces Tutorial](https://go.dev/doc/tutorial/workspaces)
- [Go Workspaces - Earthly Blog](https://earthly.dev/blog/go-workspaces/)
- [html2canvas GitHub](https://github.com/niklasvh/html2canvas)
- [html2canvas Official Docs](https://html2canvas.hertzen.com/)
- [Windows Credential Manager CREDENTIALA API](https://learn.microsoft.com/en-us/windows/win32/api/wincred/ns-wincred-credentiala)
- [Git Credential Manager - Credential Stores](https://github.com/git-ecosystem/git-credential-manager/blob/main/docs/credstores.md)
- [wailsjs/go Runtime Package](https://pkg.go.dev/github.com/wailsapp/wails/v2/pkg/runtime)
