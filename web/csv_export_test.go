package web

import (
	"encoding/csv"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/anibaldeboni/zero-paper/atmosbyte/repository"
)

func TestHandleHistoricalExportCSV_Success(t *testing.T) {
	repo := &MockMeasurementRepository{
		data: []repository.MeasurementRecord{
			{Timestamp: time.Date(2026, 3, 15, 10, 0, 0, 0, time.UTC), Temperature: 24.1, Humidity: 62.0, Pressure: 100900},
			{Timestamp: time.Date(2026, 3, 15, 11, 0, 0, 0, time.UTC), Temperature: 26.8, Humidity: 65.0, Pressure: 101200},
		},
	}

	server := NewServer(t.Context(), &MockSensorProvider{}, testConfig(), queueProvider, repo)
	req := httptest.NewRequest(http.MethodGet, "/data/export?type=h&from=2026-03-15T00:00:00Z&to=2026-03-16T00:00:00Z", nil)
	w := httptest.NewRecorder()

	server.handleHistoricalWeatherCSV(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}

	if !strings.Contains(w.Header().Get("Content-Type"), "text/csv") {
		t.Fatalf("expected text/csv content type, got %s", w.Header().Get("Content-Type"))
	}

	if !strings.Contains(w.Header().Get("Content-Disposition"), "attachment; filename=") {
		t.Fatalf("expected content disposition attachment, got %s", w.Header().Get("Content-Disposition"))
	}

	rows, err := csv.NewReader(strings.NewReader(w.Body.String())).ReadAll()
	if err != nil {
		t.Fatalf("failed to parse CSV body: %v", err)
	}

	if len(rows) < 2 {
		t.Fatalf("expected header plus at least one row, got %d rows", len(rows))
	}

	if rows[0][0] != "timestamp" || rows[0][9] != "pressure_max_hpa" {
		t.Fatalf("unexpected CSV header: %+v", rows[0])
	}
}

func TestHandleHistoricalExportCSV_InvalidType(t *testing.T) {
	server := NewServer(t.Context(), &MockSensorProvider{}, testConfig(), queueProvider, &MockMeasurementRepository{})
	req := httptest.NewRequest(http.MethodGet, "/data/export?type=x&from=2026-03-15T00:00:00Z&to=2026-03-16T00:00:00Z", nil)
	w := httptest.NewRecorder()

	server.handleHistoricalWeatherCSV(w, req)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", w.Code)
	}
}

func TestHandleHistoricalExportCSV_EmptyDataReturnsHeaderOnly(t *testing.T) {
	repo := &MockMeasurementRepository{data: []repository.MeasurementRecord{}}
	server := NewServer(t.Context(), &MockSensorProvider{}, testConfig(), queueProvider, repo)
	req := httptest.NewRequest(http.MethodGet, "/data/export?type=h&from=2026-03-15T00:00:00Z&to=2026-03-16T00:00:00Z", nil)
	w := httptest.NewRecorder()

	server.handleHistoricalWeatherCSV(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}

	rows, err := csv.NewReader(strings.NewReader(w.Body.String())).ReadAll()
	if err != nil {
		t.Fatalf("failed to parse CSV body: %v", err)
	}

	if len(rows) != 1 {
		t.Fatalf("expected only CSV header row, got %d rows", len(rows))
	}
}

func TestHandleHistoricalExportCSV_NoRepository503(t *testing.T) {
	server := NewServer(t.Context(), &MockSensorProvider{}, testConfig(), queueProvider, nil)
	req := httptest.NewRequest(http.MethodGet, "/data/export?type=h&from=2026-03-15T00:00:00Z&to=2026-03-16T00:00:00Z", nil)
	w := httptest.NewRecorder()

	server.handleHistoricalWeatherCSV(w, req)

	if w.Code != http.StatusServiceUnavailable {
		t.Fatalf("expected 503, got %d", w.Code)
	}
}

func TestHandleHistoricalExportCSV_ProcessingError500(t *testing.T) {
	repo := &MockMeasurementRepository{err: errors.New("db unavailable")}
	server := NewServer(t.Context(), &MockSensorProvider{}, testConfig(), queueProvider, repo)
	req := httptest.NewRequest(http.MethodGet, "/data/export?type=h&from=2026-03-15T00:00:00Z&to=2026-03-16T00:00:00Z", nil)
	w := httptest.NewRecorder()

	server.handleHistoricalWeatherCSV(w, req)

	if w.Code != http.StatusInternalServerError {
		t.Fatalf("expected 500, got %d", w.Code)
	}
}

func TestHandleHistoricalExportCSV_InvalidFromFormat400(t *testing.T) {
	server := NewServer(t.Context(), &MockSensorProvider{}, testConfig(), queueProvider, &MockMeasurementRepository{})
	req := httptest.NewRequest(http.MethodGet, "/data/export?type=h&from=2026-03-15&to=2026-03-16T00:00:00Z", nil)
	w := httptest.NewRecorder()

	server.handleHistoricalWeatherCSV(w, req)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", w.Code)
	}
}

func TestHandleHistoricalExportCSV_InvalidToFormat400(t *testing.T) {
	server := NewServer(t.Context(), &MockSensorProvider{}, testConfig(), queueProvider, &MockMeasurementRepository{})
	req := httptest.NewRequest(http.MethodGet, "/data/export?type=h&from=2026-03-15T00:00:00Z&to=2026-03-16", nil)
	w := httptest.NewRecorder()

	server.handleHistoricalWeatherCSV(w, req)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", w.Code)
	}
}

func TestHandleHistoricalExportCSV_FromAfterTo400(t *testing.T) {
	server := NewServer(t.Context(), &MockSensorProvider{}, testConfig(), queueProvider, &MockMeasurementRepository{})
	req := httptest.NewRequest(http.MethodGet, "/data/export?type=h&from=2026-03-16T00:00:00Z&to=2026-03-15T00:00:00Z", nil)
	w := httptest.NewRecorder()

	server.handleHistoricalWeatherCSV(w, req)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", w.Code)
	}
}
