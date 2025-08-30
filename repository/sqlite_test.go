package repository

import (
	"os"
	"testing"
	"time"

	"github.com/anibaldeboni/zero-paper/atmosbyte/bme280"
)

func TestSQLiteRepository(t *testing.T) {
	// Arquivo de teste temporário
	testDB := "test_weather.db"

	// Limpa o arquivo de teste no final
	defer func() {
		os.Remove(testDB)
	}()

	// Testa criação do repositório
	repo, err := NewSQLiteRepository(testDB)
	if err != nil {
		t.Fatalf("Failed to create repository: %v", err)
	}
	defer repo.Close()

	// Verifica se o arquivo foi criado
	if _, err := os.Stat(testDB); os.IsNotExist(err) {
		t.Fatal("Database file was not created")
	}

	// Testa salvamento de medição
	measurement := bme280.Measurement{
		Timestamp:   time.Now().Truncate(time.Second), // Remove microsegundos para comparação
		Temperature: 25.5,
		Humidity:    60.0,
		Pressure:    101325,
	}

	err = repo.SaveMeasurement(measurement)
	if err != nil {
		t.Fatalf("Failed to save measurement: %v", err)
	}

	// Testa recuperação por intervalo de tempo
	startTime := measurement.Timestamp.Add(-1 * time.Hour)
	endTime := measurement.Timestamp.Add(1 * time.Hour)

	records, err := repo.GetMeasurementsByTimeRange(startTime, endTime)
	if err != nil {
		t.Fatalf("Failed to get measurements by time range: %v", err)
	}

	if len(records) != 1 {
		t.Fatalf("Expected 1 measurement, got %d", len(records))
	}

	record := records[0]
	if record.Temperature != measurement.Temperature {
		t.Errorf("Expected temperature %f, got %f", measurement.Temperature, record.Temperature)
	}
	if record.Humidity != measurement.Humidity {
		t.Errorf("Expected humidity %f, got %f", measurement.Humidity, record.Humidity)
	}
	if record.Pressure != measurement.Pressure {
		t.Errorf("Expected pressure %d, got %d", measurement.Pressure, record.Pressure)
	}

	// Testa contagem de medições
	count, err := repo.GetMeasurementCount()
	if err != nil {
		t.Fatalf("Failed to get measurement count: %v", err)
	}
	if count != 1 {
		t.Errorf("Expected count 1, got %d", count)
	}

	// Adiciona mais algumas medições para testar GetLatestMeasurements
	for i := 1; i <= 5; i++ {
		measurement := bme280.Measurement{
			Timestamp:   time.Now().Add(time.Duration(i) * time.Minute),
			Temperature: 20.0 + float64(i),
			Humidity:    50.0 + float64(i),
			Pressure:    101300 + int64(i)*10,
		}
		err = repo.SaveMeasurement(measurement)
		if err != nil {
			t.Fatalf("Failed to save measurement %d: %v", i, err)
		}
	}

	// Testa GetLatestMeasurements
	latest, err := repo.GetLatestMeasurements(3)
	if err != nil {
		t.Fatalf("Failed to get latest measurements: %v", err)
	}
	if len(latest) != 3 {
		t.Errorf("Expected 3 latest measurements, got %d", len(latest))
	}

	// Verifica se estão ordenados por timestamp descendente (mais recente primeiro)
	for i := 1; i < len(latest); i++ {
		if latest[i-1].Timestamp.Before(latest[i].Timestamp) {
			t.Error("Latest measurements are not ordered by timestamp descending")
		}
	}

	// Testa conversão para bme280.Measurement
	convertedMeasurement := latest[0].ToMeasurement()
	if convertedMeasurement.Temperature != latest[0].Temperature {
		t.Error("Conversion to bme280.Measurement failed")
	}
}

func TestRepositoryWithDefaultPath(t *testing.T) {
	// Testa criação com caminho padrão
	repo, err := NewSQLiteRepository("")
	if err != nil {
		t.Fatalf("Failed to create repository with default path: %v", err)
	}
	defer repo.Close()
	defer os.Remove("weather.db") // Limpa arquivo padrão

	// Verifica se o arquivo foi criado com nome padrão
	if _, err := os.Stat("weather.db"); os.IsNotExist(err) {
		t.Fatal("Default database file was not created")
	}
}

func TestRepositoryInitializationWithExistingFile(t *testing.T) {
	testDB := "test_existing_weather.db"
	defer os.Remove(testDB)

	// Primeira criação
	repo1, err := NewSQLiteRepository(testDB)
	if err != nil {
		t.Fatalf("Failed to create repository: %v", err)
	}

	// Adiciona uma medição
	measurement := bme280.Measurement{
		Temperature: 22.0,
		Humidity:    55.0,
		Pressure:    101320,
	}
	err = repo1.SaveMeasurement(measurement)
	if err != nil {
		t.Fatalf("Failed to save measurement: %v", err)
	}
	repo1.Close()

	// Segunda criação usando arquivo existente
	repo2, err := NewSQLiteRepository(testDB)
	if err != nil {
		t.Fatalf("Failed to create repository with existing file: %v", err)
	}
	defer repo2.Close()

	// Verifica se a medição ainda existe
	count, err := repo2.GetMeasurementCount()
	if err != nil {
		t.Fatalf("Failed to get measurement count: %v", err)
	}
	if count != 1 {
		t.Errorf("Expected count 1 from existing file, got %d", count)
	}
}
