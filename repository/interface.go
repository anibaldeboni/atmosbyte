package repository

import (
	"time"

	"github.com/anibaldeboni/zero-paper/atmosbyte/bme280"
)

// MeasurementRepository define a interface para repositórios de medições
type MeasurementRepository interface {
	SaveMeasurement(measurement bme280.Measurement) error

	GetMeasurementsByTimeRange(startTime, endTime time.Time) ([]MeasurementRecord, error)

	GetLatestMeasurements(limit int) ([]MeasurementRecord, error)

	GetMeasurementCount() (int64, error)

	Close() error
}
