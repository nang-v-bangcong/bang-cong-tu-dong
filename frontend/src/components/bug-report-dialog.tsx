import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { X, Camera, Image as ImageIcon, Loader2, AlertTriangle } from 'lucide-react'
import { CURRENT_VERSION } from '../constants/version'
import { captureScreenshot, readFileAsDataUrl, submitBugReport } from '../services/bug-report-service'
import { GetOSInfo, OpenURL } from '../../wailsjs/go/main/App'

interface Props { onClose: () => void }

const MAX_DESC = 5000
const inputStyle = { background: 'var(--bg-muted)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }
const pillStyle = { border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }

export function BugReportDialog({ onClose }: Props) {
  const [description, setDescription] = useState('')
  const [userContact, setUserContact] = useState('')
  const [screenshot, setScreenshot] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [capturing, setCapturing] = useState(false)
  const dialogRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape' && !loading) onClose() }
    window.addEventListener('keydown', onEsc)
    return () => window.removeEventListener('keydown', onEsc)
  }, [onClose, loading])

  const handleCapture = async () => {
    if (!dialogRef.current) return
    setCapturing(true)
    dialogRef.current.style.visibility = 'hidden'
    await new Promise((r) => setTimeout(r, 250))
    try {
      setScreenshot(await captureScreenshot())
    } catch (e) {
      console.error('[bug-report] capture fail', e)
      toast.error('Chụp màn hình thất bại, thử chọn ảnh từ máy')
    } finally {
      if (dialogRef.current) dialogRef.current.style.visibility = 'visible'
      setCapturing(false)
    }
  }

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try { setScreenshot(await readFileAsDataUrl(file)) }
    catch { toast.error('Không đọc được ảnh') }
    finally { e.target.value = '' }
  }

  const handleSubmit = async () => {
    if (!description.trim() || loading) return
    setLoading(true)
    try {
      const os = await GetOSInfo()
      const res = await submitBugReport({
        description: description.trim(),
        userContact: userContact.trim() || undefined,
        screenshot: screenshot ?? undefined,
        version: CURRENT_VERSION,
        os,
        timestamp: new Date().toISOString(),
      })
      toast.success('Đã gửi báo lỗi, cảm ơn bạn!', {
        action: res.issue_url ? { label: 'Xem issue', onClick: () => OpenURL(res.issue_url) } : undefined,
      })
      onClose()
    } catch (e) {
      toast.error(`Gửi thất bại: ${e instanceof Error ? e.message : 'lỗi không xác định'}`)
    } finally {
      setLoading(false)
    }
  }

  const disabled = !description.trim() || loading

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={() => !loading && onClose()}>
      <div ref={dialogRef} onClick={(e) => e.stopPropagation()} className="max-w-lg w-full max-h-[90vh] overflow-auto"
        style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)' }}>
        <header className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <h2 className="font-semibold text-base">Báo lỗi</h2>
          <button onClick={onClose} disabled={loading} className="p-1.5 hover:bg-[var(--bg-hover)] disabled:opacity-50" style={{ borderRadius: 'var(--radius-sm)' }}>
            <X size={16} />
          </button>
        </header>

        <div className="p-4 space-y-3">
          <label className="block">
            <span className="text-sm font-medium">Mô tả vấn đề *</span>
            <textarea value={description} onChange={(e) => setDescription(e.target.value.slice(0, MAX_DESC))} rows={5}
              placeholder="Bấm nút X thì không chạy, ..." className="mt-1 w-full p-2 text-sm resize-none" style={inputStyle} />
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{description.length}/{MAX_DESC}</span>
          </label>

          <div>
            <span className="text-sm font-medium">Ảnh chụp màn hình (không bắt buộc)</span>
            <div className="mt-1 flex items-center gap-2">
              <button onClick={handleCapture} disabled={capturing || loading} style={pillStyle}
                className="flex items-center gap-1 px-2 py-1 text-xs hover:bg-[var(--bg-hover)] disabled:opacity-50">
                <Camera size={14} /> {capturing ? 'Đang chụp…' : 'Chụp màn hình'}
              </button>
              <button onClick={() => fileRef.current?.click()} disabled={loading} style={pillStyle}
                className="flex items-center gap-1 px-2 py-1 text-xs hover:bg-[var(--bg-hover)] disabled:opacity-50">
                <ImageIcon size={14} /> Chọn ảnh
              </button>
              <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
              {screenshot && (
                <div className="relative">
                  <img src={screenshot} alt="preview" className="w-[150px] h-[100px] object-cover"
                    style={{ borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }} />
                  <button onClick={() => setScreenshot(null)} disabled={loading} title="Xóa ảnh"
                    className="absolute -top-2 -right-2 p-0.5 bg-[var(--danger)] text-white disabled:opacity-50"
                    style={{ borderRadius: '9999px' }}>
                    <X size={12} />
                  </button>
                </div>
              )}
            </div>
          </div>

          <label className="block">
            <span className="text-sm font-medium">Tên / SĐT (không bắt buộc)</span>
            <input value={userContact} onChange={(e) => setUserContact(e.target.value)} placeholder="Để admin liên hệ lại nếu cần"
              className="mt-1 w-full p-2 text-sm" style={inputStyle} />
          </label>

          <div className="flex items-start gap-2 p-2 text-xs"
            style={{ background: 'var(--warning-soft, rgba(234,179,8,0.12))', color: 'var(--warning, #b45309)', borderRadius: 'var(--radius-sm)' }}>
            <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
            <span>Ảnh sẽ lưu công khai trên GitHub. Vui lòng không chụp thông tin nhạy cảm (số tiền, mật khẩu, danh bạ…).</span>
          </div>
        </div>

        <footer className="flex justify-end gap-2 p-4 border-t" style={{ borderColor: 'var(--border)' }}>
          <button onClick={onClose} disabled={loading} className="px-3 py-1.5 text-sm hover:bg-[var(--bg-hover)] disabled:opacity-50" style={{ borderRadius: 'var(--radius-sm)' }}>Hủy</button>
          <button onClick={handleSubmit} disabled={disabled} className="flex items-center gap-1 px-3 py-1.5 text-sm text-white disabled:opacity-50"
            style={{ background: 'var(--primary)', borderRadius: 'var(--radius-sm)' }}>
            {loading && <Loader2 size={14} className="animate-spin" />}
            {loading ? 'Đang gửi…' : 'Gửi'}
          </button>
        </footer>
      </div>
    </div>
  )
}
