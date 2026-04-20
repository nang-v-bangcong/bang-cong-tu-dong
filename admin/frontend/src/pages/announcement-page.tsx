import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Save, RotateCcw } from 'lucide-react'
import { GetAnnouncement, SaveAnnouncement } from '../../wailsjs/go/main/App'
import { ColorRadioGroup, type AnnouncementColor } from '../components/color-radio-group'
import { AnnouncementPreview } from '../components/announcement-preview'
import { useAdminStore } from '../stores/admin-store'

const MAX = 100

type State = { enabled: boolean; text: string; color: AnnouncementColor }
const EMPTY: State = { enabled: false, text: '', color: 'black' }

export function AnnouncementPage() {
  const { setSetupOpen, setCredsLoaded } = useAdminStore()
  const [initial, setInitial] = useState<State>(EMPTY)
  const [form, setForm] = useState<State>(EMPTY)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const res = await GetAnnouncement()
      const s: State = {
        enabled: Boolean(res?.enabled),
        text: res?.text ?? '',
        color: (res?.color as AnnouncementColor) ?? 'black',
      }
      setInitial(s)
      setForm(s)
    } catch (e: any) {
      const msg = String(e?.message ?? e)
      if (msg.includes('unauthorized')) {
        setCredsLoaded(false)
        setSetupOpen(true)
        toast.error('Token hết hạn, nhập lại')
      } else {
        toast.error('Tải thông báo thất bại: ' + msg)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const dirty = JSON.stringify(initial) !== JSON.stringify(form)

  const submit = async () => {
    if (form.text.length > MAX) {
      toast.error(`Text vượt ${MAX} ký tự`)
      return
    }
    setBusy(true)
    try {
      await SaveAnnouncement(form)
      toast.success('Đã đăng thông báo')
      await load()
    } catch (e: any) {
      const msg = String(e?.message ?? e)
      if (msg.includes('unauthorized')) {
        setCredsLoaded(false)
        setSetupOpen(true)
        toast.error('Token hết hạn, nhập lại')
      } else if (msg.includes('conflict')) {
        toast.error('Xung đột SHA, thử lại')
      } else {
        toast.error('Đăng thất bại: ' + msg)
      }
    } finally {
      setBusy(false)
    }
  }

  const reset = () => setForm(initial)

  return (
    <div className="p-6 max-w-2xl">
      <h2 className="text-xl font-semibold mb-1">Thông báo</h2>
      <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
        Soạn nội dung hiển thị ở header app chính. Bật/tắt bất kỳ lúc nào.
      </p>

      {loading ? (
        <div className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Đang tải...
        </div>
      ) : (
        <div className="space-y-5">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.enabled}
              onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
            />
            Bật hiển thị
          </label>

          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium">Nội dung</span>
              <span
                className="text-xs"
                style={{
                  color:
                    form.text.length > MAX
                      ? 'var(--danger)'
                      : 'var(--text-muted)',
                }}
              >
                {form.text.length}/{MAX}
              </span>
            </div>
            <textarea
              value={form.text}
              onChange={(e) => setForm({ ...form, text: e.target.value })}
              rows={3}
              maxLength={MAX + 20}
              placeholder="Ví dụ: Cuối tuần nghỉ, hẹn thứ 2 tiếp tục"
              className="w-full px-3 py-2 rounded border text-sm"
              style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}
            />
          </div>

          <div>
            <div className="text-sm font-medium mb-2">Màu sắc</div>
            <ColorRadioGroup
              value={form.color}
              onChange={(color) => setForm({ ...form, color })}
            />
          </div>

          <AnnouncementPreview
            text={form.text}
            color={form.color}
            enabled={form.enabled}
          />

          <div className="flex gap-2 pt-2">
            <button
              onClick={submit}
              disabled={busy || !dirty || form.text.length > MAX}
              className="inline-flex items-center gap-2 px-4 py-2 rounded text-sm font-medium"
              style={{
                background:
                  busy || !dirty ? 'var(--bg-muted)' : 'var(--primary)',
                color: busy || !dirty ? 'var(--text-muted)' : '#fff',
              }}
            >
              <Save size={16} /> {busy ? 'Đang đăng...' : 'Đăng'}
            </button>
            <button
              onClick={reset}
              disabled={!dirty || busy}
              className="inline-flex items-center gap-2 px-4 py-2 rounded text-sm"
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                color: dirty ? 'var(--text)' : 'var(--text-muted)',
              }}
            >
              <RotateCcw size={16} /> Hoàn tác
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
