# Phase 01 — Header Announcement Bar

## Context links

- [plan.md](./plan.md)
- [reports/00-codebase-verification.md](./reports/00-codebase-verification.md)
- [scout/scout-01-codebase-context.md](./scout/scout-01-codebase-context.md) (header §1)

## Overview

- **Date:** 2026-04-19
- **Description:** Thêm `AnnouncementBar` component vào header, fetch `announcement.json` từ GitHub raw URL (repo public, không auth), hiển thị text 1 dòng với 3 màu (đỏ/xanh lá/đen), ẩn im lặng nếu fail. Mở rộng chiều cao header 4-8px nếu cần.
- **Priority:** Cao (validate GitHub fetch path trước phase khác).
- **Implementation status:** Pending
- **Review status:** Pending

## Key Insights

- Header hiện tại padding `py-1.5`, height dynamic → thêm row announcement tự nới 20-28px (verification §1).
- Insert position: giữa MonthPicker (header.tsx:70) và icon group (L73) — 1 dòng ngang, truncate nếu dài.
- Fetch `raw.githubusercontent.com` không cần auth cho repo public, CORS OK với WebView2 (verification).
- Cache 5 phút tránh spam fetch khi user chuyển tab nhiều.
- Fail silent: try/catch → component return null (không toast error, không log console noisy).
- Dùng CSS var cho 3 màu: `--danger` (đỏ), `--success` (xanh lá), `--text` (đen). Dark mode tự handle qua var.

## Requirements

**Functional:**
- Fetch `https://raw.githubusercontent.com/{owner}/bang-cong-tu-dong/main/announcement.json` khi app mount.
- Parse `{enabled: boolean, text: string, color: "red"|"green"|"black"}`.
- Nếu `enabled=false` hoặc text rỗng → không render.
- Nếu `enabled=true` và text có nội dung → render row background nhạt + text màu tương ứng.
- Truncate text quá dài (CSS `truncate` / `line-clamp-1`) — max 100 ký tự theo decision phase 06.
- Fetch fail → return null (không error UI).

**Non-functional:**
- Component ≤ 100 dòng.
- Service ≤ 80 dòng (fetch + cache + types).
- Không thêm dependency.
- Cache in-memory 5 phút, không dùng localStorage (YAGNI).

## Architecture

```
frontend/src/
├─ constants/
│   └─ remote-config.ts         (mới, ~15 dòng — URL const)
├─ services/
│   └─ announcement-service.ts  (mới, ~60 dòng — fetch + cache + types)
└─ components/
    ├─ announcement-bar.tsx     (mới, ~80 dòng)
    └─ header.tsx               (edit: insert <AnnouncementBar/> sau <MonthPicker/>)
```

Data flow:
```
App mount → header.tsx render
           → AnnouncementBar useEffect mount
             → announcement-service.getAnnouncement()
               → cache hit (< 5 min)? return cached
               → fetch raw.githubusercontent.com
               → parse JSON → cache → return
             → setState announcement
           → render row (hoặc null)
```

## Related code files

- Tạo mới:
  - `d:/Dự án gốc/Bảng công tự động/frontend/src/constants/remote-config.ts`
  - `d:/Dự án gốc/Bảng công tự động/frontend/src/services/announcement-service.ts`
  - `d:/Dự án gốc/Bảng công tự động/frontend/src/components/announcement-bar.tsx`
- Sửa:
  - `d:/Dự án gốc/Bảng công tự động/frontend/src/components/header.tsx` (thêm import + 1 JSX insert giữa L70-73)

## Implementation Steps

1. **`remote-config.ts`** (~15 dòng):
   ```ts
   const OWNER = "{owner}" // fill sau phase 00
   const REPO = "bang-cong-tu-dong"
   export const ANNOUNCEMENT_URL = `https://raw.githubusercontent.com/${OWNER}/${REPO}/main/announcement.json`
   export const VERSION_URL = `https://raw.githubusercontent.com/${OWNER}/${REPO}/main/version.json`
   export const BUG_REPORT_URL = "https://bang-cong-bug-report.{user}.workers.dev" // phase 03 dùng
   export const REPO_RELEASES_URL = `https://github.com/${OWNER}/${REPO}/releases/latest`
   ```
2. **`announcement-service.ts`** (~60 dòng):
   ```ts
   export type AnnouncementColor = "red" | "green" | "black"
   export interface Announcement { enabled: boolean; text: string; color: AnnouncementColor }

   let cache: { data: Announcement | null; ts: number } | null = null
   const TTL_MS = 5 * 60 * 1000

   export async function getAnnouncement(): Promise<Announcement | null> {
     if (cache && Date.now() - cache.ts < TTL_MS) return cache.data
     try {
       const ctrl = new AbortController()
       const t = setTimeout(() => ctrl.abort(), 5000)
       const res = await fetch(ANNOUNCEMENT_URL, { signal: ctrl.signal, cache: "no-store" })
       clearTimeout(t)
       if (!res.ok) throw new Error("fetch fail")
       const data = await res.json() as Announcement
       cache = { data, ts: Date.now() }
       return data
     } catch {
       cache = { data: null, ts: Date.now() }
       return null
     }
   }
   ```
3. **`announcement-bar.tsx`** (~80 dòng):
   - `useState<Announcement|null>(null)`.
   - `useEffect(() => { getAnnouncement().then(setData) }, [])`.
   - Nếu `!data || !data.enabled || !data.text.trim()` → return null.
   - Color map:
     ```ts
     const colorMap = {
       red: { bg: "bg-[color:var(--danger-soft)]", text: "text-[color:var(--danger)]" },
       green: { bg: "bg-[color:var(--success-soft)]", text: "text-[color:var(--success)]" },
       black: { bg: "bg-[color:var(--bg-muted)]", text: "text-[color:var(--text)]" },
     }
     ```
   - Render: `<div className={`${bg} px-3 py-1 text-sm ${text} truncate`} title={data.text}>{data.text}</div>`.
4. **`header.tsx`** edit:
   - Import `AnnouncementBar`.
   - Cấu trúc cũ: header có 1 row flex. Đổi thành column flex: row 1 = announcement bar (nếu render), row 2 = toolbar hiện có.
   - Hoặc giữ flat layout: insert `<AnnouncementBar />` giữa MonthPicker và icon group với `flex-1` để chiếm chỗ trống. **Recommend**: flex-1 + truncate, đẹp hơn vì không thay đổi height.
   - Test cả 2 approach xem nào hợp hơn (nếu text dài → break row; nếu ngắn → inline).
5. **Test thủ công:**
   - Sửa local `announcement.json` trên repo set `enabled:true, text:"Test", color:"red"` → commit → mở app → thấy banner đỏ.
   - Đổi `color:"green"` → xanh lá.
   - Đổi `enabled:false` → ẩn.
   - Tắt mạng → mở app → không hiện banner, không toast lỗi.
   - Mở app 2 lần trong 5 phút → chỉ fetch 1 lần (DevTools Network check).

## Todo list

- [ ] Tạo `remote-config.ts` với 4 const URL.
- [ ] Tạo `announcement-service.ts` với cache 5 phút.
- [ ] Tạo `announcement-bar.tsx` với 3 màu + truncate + title tooltip.
- [ ] Edit `header.tsx` insert `<AnnouncementBar/>`.
- [ ] Test với 3 màu + enabled false + offline.
- [ ] `wails build` không warning mới.

## Success Criteria

- [ ] Banner hiển thị đúng màu theo JSON remote.
- [ ] `enabled:false` → không render.
- [ ] Offline → không crash, không toast.
- [ ] Fetch lần 2 trong 5 phút dùng cache (không network request).
- [ ] Dark mode render đúng màu (CSS var auto adapt).
- [ ] Không file nào vượt 200 dòng.

## Risk Assessment

- **Low**: Pure fetch JSON, không state phức tạp.
- **Low (mitigated)**: CORS WebView2 → raw.githubusercontent.com trả CORS `*` mặc định, đã verify trong research.
- **Low**: Text quá dài → truncate + `title` tooltip để hover xem đầy đủ.

## Security Considerations

- URL hardcode const → không input user injection.
- Fetch `cache: "no-store"` nhưng dùng in-memory cache tránh stale.
- Không eval/innerHTML → XSS-free (render text qua JSX).

## Next steps

Phase 02 (version check) reuse pattern: `version-service.ts` giống `announcement-service.ts`. Pattern có thể extract chung nếu thấy lặp nhiều ở phase sau (không phải bây giờ — YAGNI).
