import html2canvas from 'html2canvas'
import { BUG_REPORT_URL } from '../constants/remote-config'

export interface BugPayload {
  description: string
  userContact?: string
  screenshot?: string
  version: string
  os: string
  timestamp: string
}

export interface BugResponse {
  success: boolean
  issue_url: string
}

// 1 MB decoded ≈ 1.37M base64 chars. Vượt → retry Q=0.5.
const MAX_B64_CHARS = 1_400_000

export async function captureScreenshot(): Promise<string> {
  const canvas = await html2canvas(document.body, {
    scale: 1,
    useCORS: true,
    logging: false,
    backgroundColor: null,
  })
  let dataUrl = canvas.toDataURL('image/jpeg', 0.7)
  if (dataUrl.length > MAX_B64_CHARS) {
    dataUrl = canvas.toDataURL('image/jpeg', 0.5)
  }
  return dataUrl
}

export async function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error ?? new Error('read fail'))
    reader.readAsDataURL(file)
  })
}

export async function submitBugReport(payload: BugPayload): Promise<BugResponse> {
  const res = await fetch(BUG_REPORT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    let msg = `HTTP ${res.status}`
    try {
      const err = (await res.json()) as { error?: string }
      if (err?.error) msg = err.error
    } catch {
      // ignore parse fail
    }
    throw new Error(msg)
  }
  return (await res.json()) as BugResponse
}
