package web

import (
	"errors"
	"fmt"
	"io/fs"
	"log"
	"net/http"
	"path"
	"sort"
	"strings"
	"time"

	"github.com/anibaldeboni/zero-paper/atmosbyte/weather"
)

// handleMeasurements handles GET /measurements - returns current sensor reading
func (s *Server) handleMeasurements(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		s.sendErrorResponse(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	measurement, err := s.sensor.Read()
	if err != nil {
		log.Printf("Failed to read sensor: %v", err)
		s.sendErrorResponse(w, "Failed to read sensor data", http.StatusInternalServerError)
		return
	}

	response := MeasurementResponse{
		Timestamp:   time.Now(),
		Temperature: measurement.Temperature,
		Humidity:    measurement.Humidity,
		Pressure:    float64(measurement.Pressure),
		Source:      s.sensor.Name(),
	}

	s.sendJSONResponse(w, response, http.StatusOK)
}

// handleHealth handles GET /health - returns server health status
func (s *Server) handleHealth(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		s.sendErrorResponse(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	health := map[string]any{
		"status":    "healthy",
		"timestamp": time.Now(),
		"sensor":    s.getSensorStatus(),
	}

	s.sendJSONResponse(w, health, http.StatusOK)
}

// handleQueue handles GET /queue - returns queue status
func (s *Server) handleQueue(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		s.sendErrorResponse(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	if s.queue == nil {
		s.sendErrorResponse(w, "Queue not available", http.StatusServiceUnavailable)
		return
	}

	stats := s.queue.Stats()
	response := map[string]any{
		"queue_size":            stats.QueueSize,
		"retry_queue_size":      stats.RetryQueueSize,
		"circuit_breaker_state": int(stats.CircuitBreakerState),
		"workers":               stats.Workers,
		"timestamp":             time.Now(),
	}

	s.sendJSONResponse(w, response, http.StatusOK)
}

// handleHistoricalWeatherAPI handles GET /data - returns historical weather data as JSON
func (s *Server) handleHistoricalWeatherAPI(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		s.sendErrorResponse(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	fromTime, toTime, aggregationKind, err := parseHistoricalQuery(r)
	if err != nil {
		s.sendErrorResponse(w, err.Error(), http.StatusBadRequest)
		return
	}

	if s.repository == nil {
		s.sendErrorResponse(w, "Repository not configured", http.StatusServiceUnavailable)
		return
	}

	// Call repository to get historical weather data
	records, err := s.repository.GetMeasurementsByTimeRange(fromTime, toTime)
	if err != nil {
		log.Printf("Failed to get historical weather data: %v", err)
		s.sendErrorResponse(w, "Failed to fetch historical weather data", http.StatusInternalServerError)
		return
	}

	// Return the response as JSON
	s.sendJSONResponse(w, weather.AggregateMeasurements(records, aggregationKind), http.StatusOK)
}

func (s *Server) handleHistoricalWeatherCSV(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		s.sendErrorResponse(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	fromTime, toTime, aggregationKind, err := parseHistoricalQuery(r)
	if err != nil {
		s.sendErrorResponse(w, err.Error(), http.StatusBadRequest)
		return
	}

	if s.repository == nil {
		s.sendErrorResponse(w, "Repository not configured", http.StatusServiceUnavailable)
		return
	}

	records, err := s.repository.GetMeasurementsByTimeRange(fromTime, toTime)
	if err != nil {
		log.Printf("Failed to get historical weather data for CSV: %v", err)
		s.sendErrorResponse(w, "Failed to fetch historical weather data", http.StatusInternalServerError)
		return
	}

	aggregated := weather.AggregateMeasurements(records, aggregationKind)
	sortAggregatesByDateAsc(aggregated)

	w.Header().Set("Content-Type", "text/csv; charset=utf-8")
	w.Header().Set("X-Content-Type-Options", "nosniff")
	w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=\"atmosbyte-historico-%s.csv\"", time.Now().UTC().Format("20060102-150405")))
	w.WriteHeader(http.StatusOK)

	if err := writeHistoricalCSV(w, aggregated); err != nil {
		log.Printf("Failed to write historical CSV: %v", err)
	}
}

func parseHistoricalQuery(r *http.Request) (time.Time, time.Time, weather.AggregationKind, error) {
	query := r.URL.Query()
	aggregationType := query.Get("type")
	fromStr := query.Get("from")
	toStr := query.Get("to")

	var (
		fromTime, toTime time.Time
		aggregationKind  weather.AggregationKind
		err              error
	)

	if aggregationType != "" {
		aggregationKind, err = weather.ConvertKind(aggregationType)
		if err != nil {
			return time.Time{}, time.Time{}, weather.Hour, err
		}
	} else {
		aggregationKind = weather.Hour
	}

	if fromStr != "" {
		fromTime, err = time.Parse(time.RFC3339, fromStr)
		if err != nil {
			return time.Time{}, time.Time{}, weather.Hour, errors.New("invalid from time format, use RFC3339")
		}
	} else {
		fromTime = time.Now().Add(-24 * time.Hour)
	}

	if toStr != "" {
		toTime, err = time.Parse(time.RFC3339, toStr)
		if err != nil {
			return time.Time{}, time.Time{}, weather.Hour, errors.New("invalid to time format, use RFC3339")
		}
	} else {
		toTime = time.Now()
	}

	if fromTime.After(toTime) {
		return time.Time{}, time.Time{}, weather.Hour, errors.New("from must be before or equal to to")
	}

	if fromTime.Location() != time.UTC {
		fromTime = fromTime.UTC()
	}

	if toTime.Location() != time.UTC {
		toTime = toTime.UTC()
	}

	return fromTime, toTime, aggregationKind, nil
}

func sortAggregatesByDateAsc(data []weather.AggregateMeasurement) {
	sort.Slice(data, func(i, j int) bool {
		return data[i].Date < data[j].Date
	})
}

func hasFileExtension(pathName string) bool {
	base := path.Base(pathName)
	if base == "." || base == ".." {
		return false
	}
	return path.Ext(base) != ""
}

func serveEmbeddedIndex(w http.ResponseWriter) {
	indexBytes, err := fs.ReadFile(frontendAssetFS(), "index.html")
	if err != nil {
		http.Error(w, "Frontend index unavailable", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write(indexBytes)
}

func (s *Server) handleSPA(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		s.sendErrorResponse(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	cleanedPath := cleanAssetPath(r.URL.Path)

	if strings.HasPrefix(cleanedPath, "assets/") {
		if _, err := fs.Stat(frontendAssetFS(), cleanedPath); err != nil {
			http.NotFound(w, r)
			return
		}
		http.FileServer(http.FS(frontendAssetFS())).ServeHTTP(w, r)
		return
	}

	if hasFileExtension(cleanedPath) {
		if _, err := fs.Stat(frontendAssetFS(), cleanedPath); err != nil {
			http.NotFound(w, r)
			return
		}
		http.FileServer(http.FS(frontendAssetFS())).ServeHTTP(w, r)
		return
	}

	serveEmbeddedIndex(w)
}
