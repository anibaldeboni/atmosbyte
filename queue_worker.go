package main

import (
	"context"

	"github.com/anibaldeboni/zero-paper/atmosbyte/bme280"
	"github.com/anibaldeboni/zero-paper/atmosbyte/openweather"
	"github.com/anibaldeboni/zero-paper/atmosbyte/queue"
	"github.com/anibaldeboni/zero-paper/atmosbyte/repository"
)

// OpenWeatherWorker implementa um worker para processar mensagens usando OpenWeather API
type OpenWeatherWorker struct {
	client     *openweather.OpenWeatherClient
	repository SaveMeasurementRepository
	stationID  string
}

type SaveMeasurementRepository interface {
	// SaveMeasurement salva uma nova medição
	SaveMeasurement(measurement bme280.Measurement) error
}

// NewOpenWeatherWorker cria um novo worker para OpenWeather
func NewOpenWeatherWorker(client *openweather.OpenWeatherClient, repo SaveMeasurementRepository, stationID string) *OpenWeatherWorker {
	return &OpenWeatherWorker{
		client:     client,
		stationID:  stationID,
		repository: repo,
	}
}

// Process implementa a interface queue.Worker[bme280.Measurement]
func (w *OpenWeatherWorker) Process(ctx context.Context, msg queue.Message[bme280.Measurement]) error {
	measurement := openweather.Measurement{
		StationID:   w.stationID,
		Dt:          msg.Data.Timestamp.Unix(),
		Temperature: msg.Data.Temperature,
		Pressure:    msg.Data.Pressure,
		Humidity:    msg.Data.Humidity,
		WindSpeed:   0,
		WindGust:    0,
		Rain1h:      0,
		Clouds:      []openweather.Clouds{},
	}

	err := w.repository.SaveMeasurement(msg.Data)
	if err != nil {
		return repository.NewRepositoryErr(err)
	}

	// Envia a medição para a API
	err = w.client.SendMeasurement(ctx, measurement)
	if err != nil {
		// Se for um erro HTTP, retorna um HTTPError para o sistema de retry
		if httpErr, ok := err.(*openweather.HTTPError); ok {
			return httpErr
		}
		// Para outros tipos de erro, ainda retorna HTTPError se conseguir extrair o código
		return openweather.NewHTTPError(500, err.Error())
	}

	return nil
}
