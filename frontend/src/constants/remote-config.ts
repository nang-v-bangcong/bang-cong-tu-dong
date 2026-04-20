const OWNER = 'nang-v-bangcong'
const REPO = 'bang-cong-tu-dong'

// GitHub Contents API: không CDN 5 phút như raw.githubusercontent.com, luôn trả bản mới nhất.
// Header `Accept: application/vnd.github.raw` → trả thẳng nội dung file, không base64.
const API_BASE = `https://api.github.com/repos/${OWNER}/${REPO}/contents`

export const ANNOUNCEMENT_URL = `${API_BASE}/announcement.json`
export const VERSION_URL = `${API_BASE}/version.json`
export const BUG_REPORT_URL = 'https://bang-cong-bug-report.nangv.workers.dev'
export const REPO_RELEASES_URL = `https://github.com/${OWNER}/${REPO}/releases/latest`
