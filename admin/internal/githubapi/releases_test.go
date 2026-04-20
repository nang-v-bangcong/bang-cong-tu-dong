package githubapi

import "testing"

func TestBuildAssetUploadURL_StripsTemplate(t *testing.T) {
	const template = "https://uploads.github.com/repos/o/r/releases/123/assets{?name,label}"
	got := buildAssetUploadURL(template, "BangCong.exe")
	want := "https://uploads.github.com/repos/o/r/releases/123/assets?name=BangCong.exe"
	if got != want {
		t.Fatalf("got %q want %q", got, want)
	}
}

func TestBuildAssetUploadURL_NoTemplate(t *testing.T) {
	got := buildAssetUploadURL("https://uploads.example/x", "a.exe")
	if got != "https://uploads.example/x?name=a.exe" {
		t.Fatalf("unexpected: %s", got)
	}
}

func TestBuildAssetUploadURL_EscapesSpaces(t *testing.T) {
	got := buildAssetUploadURL("https://uploads/x{?a,b}", "file name.exe")
	// url.QueryEscape turns space into "+" and keeps dot.
	const want = "https://uploads/x?name=file+name.exe"
	if got != want {
		t.Fatalf("got %q want %q", got, want)
	}
}
