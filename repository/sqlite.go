package repository

import (
	"database/sql"
	"fmt"
	"os"
	"time"

	"github.com/anibaldeboni/zero-paper/atmosbyte/bme280"
	_ "modernc.org/sqlite"
)

// Compile-time check to ensure SQLiteRepository implements MeasurementRepository
var _ MeasurementRepository = (*SQLiteRepository)(nil)

// SQLiteRepository implementa um repositório para armazenamento local usando SQLite
type SQLiteRepository struct {
	db       *sql.DB
	filepath string
}

// NewSQLiteRepository cria um novo repositório SQLite
func NewSQLiteRepository(filepath string) (*SQLiteRepository, error) {
	if filepath == "" {
		filepath = "weather.db"
	}

	repo := &SQLiteRepository{
		filepath: filepath,
	}

	if err := repo.initialize(); err != nil {
		return nil, fmt.Errorf("failed to initialize repository: %w", err)
	}

	return repo, nil
}

// initialize verifica se o arquivo de banco existe, cria se necessário e inicializa as tabelas
func (r *SQLiteRepository) initialize() error {
	// Verifica se o arquivo existe
	fileExists := true
	if _, err := os.Stat(r.filepath); os.IsNotExist(err) {
		fileExists = false
	}

	// Abre conexão com o banco (cria o arquivo se não existir)
	db, err := sql.Open("sqlite", r.filepath)
	if err != nil {
		return fmt.Errorf("failed to open database: %w", err)
	}

	r.db = db

	// Se o arquivo não existia, cria as tabelas
	if !fileExists {
		if err := r.createTables(); err != nil {
			return fmt.Errorf("failed to create tables: %w", err)
		}
	}

	return nil
}

// createTables cria as tabelas necessárias no banco de dados
func (r *SQLiteRepository) createTables() error {
	query := `
	CREATE TABLE IF NOT EXISTS measurements (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		timestamp DATETIME NOT NULL,
		temperature REAL NOT NULL,
		humidity REAL NOT NULL,
		pressure INTEGER NOT NULL,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);

	CREATE INDEX IF NOT EXISTS idx_measurements_timestamp ON measurements(timestamp);
	`

	_, err := r.db.Exec(query)
	if err != nil {
		return fmt.Errorf("failed to create tables: %w", err)
	}

	return nil
}

// SaveMeasurement salva uma nova medição no banco de dados
func (r *SQLiteRepository) SaveMeasurement(measurement bme280.Measurement) error {
	query := `
	INSERT INTO measurements (timestamp, temperature, humidity, pressure)
	VALUES (?, ?, ?, ?)
	`

	_, err := r.db.Exec(query, measurement.Timestamp, measurement.Temperature, measurement.Humidity, measurement.Pressure)
	if err != nil {
		return fmt.Errorf("failed to save measurement: %w", err)
	}

	return nil
}

// GetMeasurementsByTimeRange recupera medições dentro de um intervalo de tempo
func (r *SQLiteRepository) GetMeasurementsByTimeRange(startTime, endTime time.Time) ([]MeasurementRecord, error) {
	query := `
	SELECT id, timestamp, temperature, humidity, pressure, created_at
	FROM measurements
	WHERE timestamp >= ? AND timestamp <= ?
	ORDER BY timestamp ASC
	`

	rows, err := r.db.Query(query, startTime, endTime)
	if err != nil {
		return nil, fmt.Errorf("failed to query measurements: %w", err)
	}
	defer rows.Close()

	var measurements []MeasurementRecord
	for rows.Next() {
		var record MeasurementRecord
		err := rows.Scan(
			&record.ID,
			&record.Timestamp,
			&record.Temperature,
			&record.Humidity,
			&record.Pressure,
			&record.CreatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan measurement: %w", err)
		}
		measurements = append(measurements, record)
	}

	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating rows: %w", err)
	}

	return measurements, nil
}

// GetLatestMeasurements recupera as N medições mais recentes
func (r *SQLiteRepository) GetLatestMeasurements(limit int) ([]MeasurementRecord, error) {
	query := `
	SELECT id, timestamp, temperature, humidity, pressure, created_at
	FROM measurements
	ORDER BY timestamp DESC
	LIMIT ?
	`

	rows, err := r.db.Query(query, limit)
	if err != nil {
		return nil, fmt.Errorf("failed to query latest measurements: %w", err)
	}
	defer rows.Close()

	var measurements []MeasurementRecord
	for rows.Next() {
		var record MeasurementRecord
		err := rows.Scan(
			&record.ID,
			&record.Timestamp,
			&record.Temperature,
			&record.Humidity,
			&record.Pressure,
			&record.CreatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan measurement: %w", err)
		}
		measurements = append(measurements, record)
	}

	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating rows: %w", err)
	}

	return measurements, nil
}

// GetMeasurementCount retorna o número total de medições no banco
func (r *SQLiteRepository) GetMeasurementCount() (int64, error) {
	var count int64
	query := "SELECT COUNT(*) FROM measurements"

	err := r.db.QueryRow(query).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("failed to get measurement count: %w", err)
	}

	return count, nil
}

// Close fecha a conexão com o banco de dados
func (r *SQLiteRepository) Close() error {
	if r.db != nil {
		return r.db.Close()
	}
	return nil
}

// MeasurementRecord representa um registro de medição com metadados do banco
type MeasurementRecord struct {
	ID          int64     `json:"id"`
	Timestamp   time.Time `json:"timestamp"`
	Temperature float64   `json:"temperature"`
	Humidity    float64   `json:"humidity"`
	Pressure    int64     `json:"pressure"`
	CreatedAt   time.Time `json:"created_at"`
}

// ToMeasurement converte um MeasurementRecord para bme280.Measurement
func (m MeasurementRecord) ToMeasurement() bme280.Measurement {
	return bme280.Measurement{
		Timestamp:   m.Timestamp,
		Temperature: m.Temperature,
		Humidity:    m.Humidity,
		Pressure:    m.Pressure,
	}
}
