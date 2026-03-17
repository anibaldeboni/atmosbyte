package web

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/anibaldeboni/zero-paper/atmosbyte/bme280"
	"github.com/anibaldeboni/zero-paper/atmosbyte/repository"
)

// Server encapsulates the HTTP server configuration and dependencies
type Server struct {
	config     *Config
	sensor     bme280.Reader
	server     *http.Server
	queue      QueueStatsProvider
	ctx        context.Context
	repository MeasurementRepository
}

type MeasurementRepository interface {
	GetMeasurementsByTimeRange(startTime, endTime time.Time) ([]repository.MeasurementRecord, error)
}

// NewServer creates a new HTTP server instance with the given sensor provider
// Optionally accepts a queue parameter for queue monitoring functionality
func NewServer(ctx context.Context, sensor bme280.Reader, config *Config, queue QueueStatsProvider, repo MeasurementRepository) *Server {
	if config == nil {
		panic("web.Config cannot be nil - use config.Load().WebConfig() instead")
	}

	s := &Server{
		config:     config,
		sensor:     sensor,
		queue:      queue,
		ctx:        ctx,
		repository: repo,
	}

	mux := http.NewServeMux()
	s.setupRoutes(mux)

	s.server = &http.Server{
		Addr:         fmt.Sprintf(":%d", config.Port),
		Handler:      s.loggingMiddleware(mux),
		ReadTimeout:  config.ReadTimeout,
		WriteTimeout: config.WriteTimeout,
		IdleTimeout:  config.IdleTimeout,
	}

	return s
}

// setupRoutes configures all HTTP routes
func (s *Server) setupRoutes(mux *http.ServeMux) {
	mux.Handle("/assets/", http.FileServer(http.FS(frontendAssetFS())))
	mux.HandleFunc("/measurements", s.handleMeasurements)
	mux.HandleFunc("/health", s.handleHealth)
	mux.HandleFunc("/queue", s.handleQueue)
	mux.HandleFunc("/data", s.handleHistoricalWeatherAPI)
	mux.HandleFunc("/data/export", s.handleHistoricalWeatherCSV)
	mux.HandleFunc("/", s.handleSPA)
}

// Start starts the HTTP server and handles graceful shutdown via context
func (s *Server) Start() error {
	log.Printf("Starting HTTP server on %s", s.server.Addr)

	// Canal para capturar erros do servidor
	serverErr := make(chan error, 1)

	go func() {
		if err := s.server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			serverErr <- fmt.Errorf("failed to start server: %w", err)
		} else {
			serverErr <- nil
		}
	}()

	select {
	case <-s.ctx.Done():
		shutdownCtx, cancel := context.WithTimeout(context.Background(), s.config.ShutdownTimeout)
		defer cancel()

		if err := s.server.Shutdown(shutdownCtx); err != nil {
			log.Printf("Error during server shutdown: %v", err)
			return fmt.Errorf("failed to shutdown server: %w", err)
		}

		log.Println("HTTP server stopped")
		return s.ctx.Err()

	case err := <-serverErr:
		return err
	}
}
