package timezone

import (
	"os"
	"testing"
	"time"
)

func TestGetMachineLocation_WithValidTZEnv(t *testing.T) {
	originalTZ := os.Getenv("TZ")
	defer func() {
		if originalTZ == "" {
			os.Unsetenv("TZ")
		} else {
			os.Setenv("TZ", originalTZ)
		}
	}()

	os.Setenv("TZ", "America/New_York")
	loc := GetMachineLocation()

	if loc == nil {
		t.Fatal("Expected non-nil location")
	}

	if loc.String() != "America/New_York" {
		t.Errorf("Expected location 'America/New_York', got '%s'", loc.String())
	}
}

func TestGetMachineLocation_DefaultToSaoPaulo(t *testing.T) {
	originalTZ := os.Getenv("TZ")
	defer func() {
		if originalTZ == "" {
			os.Unsetenv("TZ")
		} else {
			os.Setenv("TZ", originalTZ)
		}
	}()

	os.Unsetenv("TZ")
	loc := GetMachineLocation()

	if loc == nil {
		t.Fatal("Expected non-nil location")
	}

	if loc.String() != "America/Sao_Paulo" {
		t.Errorf("Expected 'America/Sao_Paulo', got '%s'", loc.String())
	}
}

func TestGetMachineLocation_CanConvertTimes(t *testing.T) {
	loc := GetMachineLocation()
	if loc == nil {
		t.Fatal("Expected non-nil location")
	}

	testTime := time.Date(2026, 3, 15, 14, 30, 0, 0, loc)

	if testTime.Year() != 2026 || testTime.Month() != 3 || testTime.Day() != 15 {
		t.Errorf("Date mismatch: expected 2026-03-15, got %d-%02d-%02d", testTime.Year(), testTime.Month(), testTime.Day())
	}
}
