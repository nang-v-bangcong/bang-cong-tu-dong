// Package progress wraps io.Reader with throttled progress callbacks.
package progress

import (
	"io"
	"time"
)

// Reader wraps an io.Reader and emits OnProgress roughly every 500ms
// plus once on EOF. Safe for streaming large files.
type Reader struct {
	R          io.Reader
	Total      int64
	read       int64
	lastEmit   time.Time
	OnProgress func(read, total int64)
	interval   time.Duration
}

// New builds a Reader with default 500ms throttle.
func New(r io.Reader, total int64, cb func(read, total int64)) *Reader {
	return &Reader{R: r, Total: total, OnProgress: cb, interval: 500 * time.Millisecond}
}

func (p *Reader) Read(b []byte) (int, error) {
	n, err := p.R.Read(b)
	if n > 0 {
		p.read += int64(n)
		if p.OnProgress != nil {
			now := time.Now()
			if p.lastEmit.IsZero() || now.Sub(p.lastEmit) >= p.interval {
				p.OnProgress(p.read, p.Total)
				p.lastEmit = now
			}
		}
	}
	if err == io.EOF && p.OnProgress != nil {
		p.OnProgress(p.read, p.Total)
	}
	return n, err
}
