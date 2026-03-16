package web

import (
	"encoding/csv"
	"fmt"
	"io"
	"strconv"
	"time"

	"github.com/anibaldeboni/zero-paper/atmosbyte/weather"
)

func writeHistoricalCSV(w io.Writer, rows []weather.AggregateMeasurement) error {
	csvWriter := csv.NewWriter(w)
	defer csvWriter.Flush()

	header := []string{
		"timestamp",
		"temp_min",
		"temp_avg",
		"temp_max",
		"humidity_min",
		"humidity_avg",
		"humidity_max",
		"pressure_min_hpa",
		"pressure_avg_hpa",
		"pressure_max_hpa",
	}

	if err := csvWriter.Write(header); err != nil {
		return fmt.Errorf("failed to write CSV header: %w", err)
	}

	for _, row := range rows {
		record := []string{
			time.Unix(row.Date, 0).UTC().Format(time.RFC3339),
			formatFloatPtr(row.Temp.Min, 2),
			formatFloatPtr(row.Temp.Average, 2),
			formatFloatPtr(row.Temp.Max, 2),
			formatFloatPtr(row.Humidity.Min, 2),
			formatFloatPtr(row.Humidity.Average, 2),
			formatFloatPtr(row.Humidity.Max, 2),
			formatInt64PtrAsHPA(row.Pressure.Min, 2),
			formatFloatPtrAsHPA(row.Pressure.Average, 2),
			formatInt64PtrAsHPA(row.Pressure.Max, 2),
		}

		if err := csvWriter.Write(record); err != nil {
			return fmt.Errorf("failed to write CSV record: %w", err)
		}
	}

	if err := csvWriter.Error(); err != nil {
		return fmt.Errorf("failed to flush CSV writer: %w", err)
	}

	return nil
}

func formatFloatPtr(value *float64, precision int) string {
	if value == nil {
		return ""
	}

	return strconv.FormatFloat(*value, 'f', precision, 64)
}

func formatInt64PtrAsHPA(value *int64, precision int) string {
	if value == nil {
		return ""
	}

	hpa := float64(*value) / 100.0
	return strconv.FormatFloat(hpa, 'f', precision, 64)
}

func formatFloatPtrAsHPA(value *float64, precision int) string {
	if value == nil {
		return ""
	}

	hpa := *value / 100.0
	return strconv.FormatFloat(hpa, 'f', precision, 64)
}
