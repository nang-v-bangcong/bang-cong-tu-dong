package services

import "time"

// kst is a fixed UTC+9 zone. South Korea has no DST, so a FixedZone is both
// correct and independent of the OS tzdata (Windows may not ship it).
var kst = time.FixedZone("KST", 9*3600)

// TodayKST returns today's date in Asia/Seoul as "YYYY-MM-DD".
func TodayKST() string {
	return time.Now().In(kst).Format("2006-01-02")
}
