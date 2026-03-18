package web

import (
	"context"
	"encoding/json"
	"errors"
	"io/fs"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/anibaldeboni/zero-paper/atmosbyte/bme280"
	"github.com/anibaldeboni/zero-paper/atmosbyte/queue"
	"github.com/anibaldeboni/zero-paper/atmosbyte/repository"
)

func testConfig() *Config {
	return &Config{
		Port:            8080,
		ReadTimeout:     10 * time.Second,
		WriteTimeout:    10 * time.Second,
		IdleTimeout:     120 * time.Second,
		ShutdownTimeout: 30 * time.Second,
	}
}

type MockSensorProvider struct {
	measurement bme280.Measurement
	err         error
}

func (m *MockSensorProvider) Read() (bme280.Measurement, error) {
	return m.measurement, m.err
}

func (m *MockSensorProvider) Name() string {
	return "BME280"
}

type MockQueueStatsProvider struct {
	stats queue.QueueStats
}

func (m *MockQueueStatsProvider) Stats() queue.QueueStats {
	return m.stats
}

type MockMeasurementRepository struct {
	data []repository.MeasurementRecord
	err  error
}

func (m *MockMeasurementRepository) GetMeasurementsByTimeRange(startTime, endTime time.Time) ([]repository.MeasurementRecord, error) {
	if m.err != nil {
		return nil, m.err
	}

	if m.data != nil {
		return m.data, nil
	}

	measurement := []repository.MeasurementRecord{{
		ID:          1,
		Timestamp:   time.Now(),
		Temperature: 25.5,
		Humidity:    60,
		Pressure:    101325,
	}}

	return measurement, nil
}

var queueProvider = &MockQueueStatsProvider{
	stats: queue.QueueStats{
		QueueSize:      5,
		RetryQueueSize: 1,
		Workers:        2,
	},
}

func firstEmbeddedAssetPath(t *testing.T) string {
	t.Helper()

	assetsFS := frontendAssetFS()
	var firstAsset string
	err := fs.WalkDir(assetsFS, "assets", func(path string, d fs.DirEntry, walkErr error) error {
		if walkErr != nil {
			return walkErr
		}
		if d.IsDir() {
			return nil
		}
		if firstAsset == "" {
			firstAsset = path
		}
		return nil
	})
	if err != nil {
		t.Fatalf("failed to list embedded assets: %v", err)
	}
	if firstAsset == "" {
		t.Fatal("expected at least one embedded asset under /assets")
	}

	return "/" + firstAsset
}

func TestNewServer(t *testing.T) {
	sensor := &MockSensorProvider{}
	repo := &MockMeasurementRepository{}
	server := NewServer(t.Context(), sensor, testConfig(), queueProvider, repo)

	if server == nil {
		t.Fatal("expected server to be created")
	}

	if server.sensor != sensor {
		t.Error("expected sensor to be set")
	}
}

func TestHandleMeasurements_Success(t *testing.T) {
	measurement := bme280.Measurement{Temperature: 25.5, Humidity: 60, Pressure: 101325}
	sensor := &MockSensorProvider{measurement: measurement}
	server := NewServer(t.Context(), sensor, testConfig(), queueProvider, &MockMeasurementRepository{})

	req := httptest.NewRequest(http.MethodGet, "/measurements", nil)
	w := httptest.NewRecorder()
	server.handleMeasurements(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}

	var response MeasurementResponse
	if err := json.NewDecoder(w.Body).Decode(&response); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	if response.Source != "BME280" {
		t.Fatalf("expected source BME280, got %s", response.Source)
	}
}

func TestHandleMeasurements_SensorError(t *testing.T) {
	sensor := &MockSensorProvider{err: errors.New("sensor read error")}
	server := NewServer(t.Context(), sensor, testConfig(), queueProvider, &MockMeasurementRepository{})

	req := httptest.NewRequest(http.MethodGet, "/measurements", nil)
	w := httptest.NewRecorder()
	server.handleMeasurements(w, req)

	if w.Code != http.StatusInternalServerError {
		t.Fatalf("expected 500, got %d", w.Code)
	}
}

func TestServer_ServesEmbeddedAsset(t *testing.T) {
	server := NewServer(t.Context(), &MockSensorProvider{}, testConfig(), queueProvider, &MockMeasurementRepository{})
	req := httptest.NewRequest(http.MethodGet, firstEmbeddedAssetPath(t), nil)
	w := httptest.NewRecorder()

	server.server.Handler.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}
}

func TestServer_ServesManifest(t *testing.T) {
	server := NewServer(t.Context(), &MockSensorProvider{}, testConfig(), queueProvider, &MockMeasurementRepository{})
	req := httptest.NewRequest(http.MethodGet, "/manifest.json", nil)
	w := httptest.NewRecorder()

	server.server.Handler.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}

	if !strings.Contains(w.Header().Get("Content-Type"), "json") {
		t.Fatalf("expected json content type, got %q", w.Header().Get("Content-Type"))
	}
}

func TestServer_ServesServiceWorker(t *testing.T) {
	server := NewServer(t.Context(), &MockSensorProvider{}, testConfig(), queueProvider, &MockMeasurementRepository{})
	req := httptest.NewRequest(http.MethodGet, "/service-worker.js", nil)
	w := httptest.NewRecorder()

	server.server.Handler.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}

	if !strings.Contains(w.Header().Get("Content-Type"), "javascript") {
		t.Fatalf("expected javascript content type, got %q", w.Header().Get("Content-Type"))
	}
}

func TestServer_SPAFallbackForNavigationRoutes(t *testing.T) {
	server := NewServer(t.Context(), &MockSensorProvider{}, testConfig(), queueProvider, &MockMeasurementRepository{})
	req := httptest.NewRequest(http.MethodGet, "/historical", nil)
	w := httptest.NewRecorder()

	server.server.Handler.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}

	if !strings.Contains(w.Body.String(), "<div id=\"root\"></div>") {
		t.Fatalf("expected SPA index root element")
	}
}

func TestServer_APIBypassesSPAFallback(t *testing.T) {
	server := NewServer(t.Context(), &MockSensorProvider{}, testConfig(), queueProvider, &MockMeasurementRepository{})
	req := httptest.NewRequest(http.MethodGet, "/health", nil)
	w := httptest.NewRecorder()

	server.server.Handler.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}

	if !strings.Contains(w.Header().Get("Content-Type"), "application/json") {
		t.Fatalf("expected json content type")
	}
}

func TestServer_UnknownAssetAndExtensionReturn404(t *testing.T) {
	server := NewServer(context.Background(), &MockSensorProvider{}, testConfig(), queueProvider, &MockMeasurementRepository{})

	for _, p := range []string{"/assets/missing.js", "/missing.js"} {
		req := httptest.NewRequest(http.MethodGet, p, nil)
		w := httptest.NewRecorder()
		server.server.Handler.ServeHTTP(w, req)
		if w.Code != http.StatusNotFound {
			t.Fatalf("expected 404 for %s, got %d", p, w.Code)
		}
	}
}

func BenchmarkHandleMeasurements(b *testing.B) {
	measurement := bme280.Measurement{Temperature: 25.5, Humidity: 60, Pressure: 101325}
	sensor := &MockSensorProvider{measurement: measurement}
	server := NewServer(context.Background(), sensor, testConfig(), queueProvider, &MockMeasurementRepository{})

	req := httptest.NewRequest(http.MethodGet, "/measurements", nil)
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		w := httptest.NewRecorder()
		server.handleMeasurements(w, req)
	}
}
