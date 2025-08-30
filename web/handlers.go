package web

import (
	"log"
	"net/http"
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

// handleHistoricalWeather handles GET /historical - returns historical weather page
func (s *Server) handleHistoricalWeather(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		s.sendErrorResponse(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	w.Header().Set("Content-Type", "text/html; charset=utf-8")

	if err := s.historicalTemplate.Execute(w, nil); err != nil {
		log.Printf("Failed to execute historical template: %v", err)
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
	}
}

// handleHistoricalWeatherAPI handles GET /data - returns historical weather data as JSON
func (s *Server) handleHistoricalWeatherAPI(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		s.sendErrorResponse(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Parse query parameters
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
			s.sendErrorResponse(w, err.Error(), http.StatusBadRequest)
			return
		}
	} else {
		aggregationKind = weather.Hour
	}
	if fromStr != "" {
		fromTime, err = time.Parse(time.RFC3339, fromStr)
		if err != nil {
			s.sendErrorResponse(w, "invalid from time format, use RFC3339", http.StatusBadRequest)
			return
		}
	} else {
		fromTime = time.Now().Add(-24 * time.Hour) // default to last 24 hours
	}

	if toStr != "" {
		toTime, err = time.Parse(time.RFC3339, toStr)
		if err != nil {
			s.sendErrorResponse(w, "invalid to time format, use RFC3339", http.StatusBadRequest)
			return
		}
	} else {
		toTime = time.Now()
	}

	// Check if repository is available
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

// handleRoot handles GET / - returns HTML page with weather information
func (s *Server) handleRoot(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		s.sendErrorResponse(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Serve HTML page
	data := TemplateData{
		Title:           "Atmosbyte - Monitoramento Meteorológico",
		SystemStartTime: s.systemStartTime.Format("02/01/2006 15:04:05"),
		Routes:          s.GetRoutes(),
		QueueAvailable:  s.queue != nil,
	}

	w.Header().Set("Content-Type", "text/html; charset=utf-8")

	if err := s.template.Execute(w, data); err != nil {
		log.Printf("Failed to execute template: %v", err)
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
	}
}
