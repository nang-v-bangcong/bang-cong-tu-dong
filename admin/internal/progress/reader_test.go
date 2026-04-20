package progress

import (
	"bytes"
	"io"
	"testing"
	"time"
)

func TestReader_EmitsFinalOnEOF(t *testing.T) {
	src := bytes.NewReader([]byte("hello world")) // 11 bytes
	fires := []int64{}
	pr := New(src, 11, func(read, total int64) {
		fires = append(fires, read)
	})
	// Set interval very large so only EOF emit triggers.
	pr.interval = 10 * time.Second

	buf := make([]byte, 4)
	for {
		_, err := pr.Read(buf)
		if err == io.EOF {
			break
		}
		if err != nil {
			t.Fatalf("read: %v", err)
		}
	}
	if len(fires) == 0 {
		t.Fatal("expected at least one callback fire (EOF final)")
	}
	if got := fires[len(fires)-1]; got != 11 {
		t.Fatalf("final fire should equal total; got %d want 11", got)
	}
}

func TestReader_ThrottlesMidStreamFires(t *testing.T) {
	// 40 bytes stream, tiny reads, very small interval → expect multiple fires but < reads count.
	payload := bytes.Repeat([]byte("x"), 40)
	src := bytes.NewReader(payload)
	fires := 0
	pr := New(src, int64(len(payload)), func(read, total int64) { fires++ })
	pr.interval = 1 * time.Millisecond

	buf := make([]byte, 2) // 20 Read calls before EOF
	for {
		_, err := pr.Read(buf)
		if err == io.EOF {
			break
		}
		if err != nil {
			t.Fatalf("read: %v", err)
		}
		time.Sleep(2 * time.Millisecond) // force each read past the 1ms threshold
	}
	if fires < 2 {
		t.Fatalf("expected >=2 fires after throttle gap; got %d", fires)
	}
}

func TestReader_NoCallbackOK(t *testing.T) {
	// Nil callback must not panic.
	src := bytes.NewReader([]byte("abc"))
	pr := New(src, 3, nil)
	out, err := io.ReadAll(pr)
	if err != nil {
		t.Fatalf("read: %v", err)
	}
	if string(out) != "abc" {
		t.Fatalf("got %q want abc", string(out))
	}
}
