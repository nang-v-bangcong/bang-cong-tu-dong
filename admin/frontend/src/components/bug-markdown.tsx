import ReactMarkdown from 'react-markdown'
import { BrowserOpenURL } from '../../wailsjs/runtime/runtime'

type Props = { body: string }

export function BugMarkdown({ body }: Props) {
  return (
    <div
      style={{
        fontSize: 13,
        lineHeight: 1.55,
        color: 'var(--text)',
        wordBreak: 'break-word',
      }}
    >
      <ReactMarkdown
        components={{
          img: (p) => (
            <img
              {...p}
              style={{ maxWidth: '100%', borderRadius: 6, margin: '8px 0' }}
            />
          ),
          a: (p) => (
            <a
              {...p}
              onClick={(e) => {
                e.preventDefault()
                if (p.href) BrowserOpenURL(p.href)
              }}
              style={{ color: 'var(--primary)' }}
            />
          ),
          code: (p) => (
            <code
              {...p}
              style={{
                background: 'var(--bg-muted)',
                padding: '1px 4px',
                borderRadius: 3,
                fontFamily: 'monospace',
                fontSize: 12,
              }}
            />
          ),
        }}
      >
        {body || '*(không có nội dung)*'}
      </ReactMarkdown>
    </div>
  )
}
