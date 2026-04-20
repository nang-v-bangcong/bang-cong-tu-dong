package githubapi

import (
	"encoding/base64"
	"strings"
	"testing"
)

// GitHub returns base64 with \n every 60 chars; our decoder must tolerate it.
func TestDecodeBase64_StripsNewlines(t *testing.T) {
	src := []byte(`{"enabled":true,"text":"Xin chào","color":"green"}`)
	enc := base64.StdEncoding.EncodeToString(src)
	// Sprinkle newlines every 10 chars to mimic GitHub response.
	var b strings.Builder
	for i, c := range enc {
		if i > 0 && i%10 == 0 {
			b.WriteByte('\n')
		}
		b.WriteRune(c)
	}
	noisy := b.String()

	got, err := decodeBase64(noisy)
	if err != nil {
		t.Fatalf("decode: %v", err)
	}
	if string(got) != string(src) {
		t.Fatalf("got %q want %q", string(got), string(src))
	}
}

func TestDecodeBase64_HandlesCRLF(t *testing.T) {
	src := []byte("hello world")
	enc := base64.StdEncoding.EncodeToString(src)
	noisy := enc[:4] + "\r\n" + enc[4:]
	got, err := decodeBase64(noisy)
	if err != nil {
		t.Fatalf("decode: %v", err)
	}
	if string(got) != string(src) {
		t.Fatalf("got %q want %q", string(got), string(src))
	}
}
