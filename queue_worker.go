package main

import (
	"context"

	"github.com/anibaldeboni/zero-paper/atmosbyte/bme280"
	"github.com/anibaldeboni/zero-paper/atmosbyte/queue"
	"github.com/anibaldeboni/zero-paper/atmosbyte/repository"
)

// RepositoryWorker implementa um worker para processar mensagens e salvar no banco
type RepositoryWorker struct {
	repository SaveMeasurementRepository
}

type SaveMeasurementRepository interface {
	// SaveMeasurement salva uma nova medição
	SaveMeasurement(measurement bme280.Measurement) error
}

// NewRepositoryWorker cria um novo worker para persistir medições
func NewRepositoryWorker(repo SaveMeasurementRepository) *RepositoryWorker {
	return &RepositoryWorker{
		repository: repo,
	}
}

// Process implementa a interface queue.Worker[bme280.Measurement]
func (w *RepositoryWorker) Process(ctx context.Context, msg queue.Message[bme280.Measurement]) error {
	_ = ctx
	err := w.repository.SaveMeasurement(msg.Data)
	if err != nil {
		return repository.NewRepositoryErr(err)
	}

	return nil
}
