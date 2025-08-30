package weather

import (
	"fmt"
	"math"
	"slices"
	"time"

	"github.com/anibaldeboni/zero-paper/atmosbyte/repository"
)

type AggregationKind int

func (a AggregationKind) String() string {
	switch a {
	case Minute:
		return "minute"
	case Hour:
		return "hour"
	case Day:
		return "day"
	default:
		return "unknown"
	}
}

const (
	Minute AggregationKind = iota
	Hour
	Day
)

type AggregateMeasurement struct {
	Type     string      `json:"type"`
	Date     int64       `json:"date"`
	Temp     Temperature `json:"temp"`
	Humidity Humidity    `json:"humidity"`
	Pressure Pressure    `json:"pressure"`
}

type Temperature struct {
	Max     *float64 `json:"max,omitempty"`
	Min     *float64 `json:"min,omitempty"`
	Average *float64 `json:"average,omitempty"`
}

type Humidity struct {
	Average *float64 `json:"average,omitempty"`
}

type Pressure struct {
	Min     *int64   `json:"min,omitempty"`
	Max     *int64   `json:"max,omitempty"`
	Average *float64 `json:"average,omitempty"`
}

func ConvertKind(kind string) (AggregationKind, error) {
	switch kind {
	case "m":
		return Minute, nil
	case "h":
		return Hour, nil
	case "d":
		return Day, nil
	default:
		return -1, fmt.Errorf("unknown aggregation kind: %s", kind)
	}
}

func AggregateMeasurements(measurements []repository.MeasurementRecord, kind AggregationKind) []AggregateMeasurement {
	if len(measurements) == 0 {
		return []AggregateMeasurement{}
	}

	grouped := make(map[int64][]repository.MeasurementRecord)

	for _, measurement := range measurements {
		t := time.Unix(measurement.Timestamp.Unix(), 0)

		var key int64
		switch kind {
		case Minute:
			key = time.Date(t.Year(), t.Month(), t.Day(), t.Hour(), t.Minute(), 0, 0, t.Location()).Unix()
		case Hour:
			key = time.Date(t.Year(), t.Month(), t.Day(), t.Hour(), 0, 0, 0, t.Location()).Unix()
		case Day:
			key = time.Date(t.Year(), t.Month(), t.Day(), 0, 0, 0, 0, t.Location()).Unix()
		}

		grouped[key] = append(grouped[key], measurement)
	}

	results := make([]AggregateMeasurement, 0, len(grouped))
	for date, group := range grouped {
		results = append(results, calculateAggregates(group, date, kind))
	}

	return sortAggregateMeasurementByDateAsc(results)
}

func sortAggregateMeasurementByDateAsc(measurements []AggregateMeasurement) []AggregateMeasurement {
	slices.SortFunc(measurements, func(a, b AggregateMeasurement) int {
		if a.Date < b.Date {
			return -1
		}
		if a.Date > b.Date {
			return 1
		}
		return 0
	})
	return measurements
}

func roundToDecimal(value float64, places int) float64 {
	if value == 0 {
		return 0
	}
	multiplier := math.Pow(10, float64(places))
	return math.Round(value*multiplier) / multiplier
}

func calculateAggregates(measurements []repository.MeasurementRecord, date int64, kind AggregationKind) AggregateMeasurement {
	var (
		tempSum, tempMin, tempMax float64
		humSum                    float64
		pressSum                  float64
		pressMin, pressMax        int64
		count                     int64
	)

	tempMin = measurements[0].Temperature
	tempMax = measurements[0].Temperature
	pressMin = measurements[0].Pressure
	pressMax = measurements[0].Pressure

	for _, m := range measurements {
		tempSum += m.Temperature
		humSum += m.Humidity
		pressSum += float64(m.Pressure)

		if m.Temperature < tempMin {
			tempMin = m.Temperature
		}
		if m.Temperature > tempMax {
			tempMax = m.Temperature
		}

		if m.Pressure < pressMin {
			pressMin = m.Pressure
		}
		if m.Pressure > pressMax {
			pressMax = m.Pressure
		}

		count++
	}

	tempMax = roundToDecimal(tempMax, 1)
	tempMin = roundToDecimal(tempMin, 1)
	tempAvg := roundToDecimal(tempSum/float64(count), 1)
	humAvg := roundToDecimal(humSum/float64(count), 1)
	pressAvg := roundToDecimal(pressSum/float64(count), 1)

	return AggregateMeasurement{
		Type: kind.String(),
		Date: date,
		Temp: Temperature{
			Max:     &tempMax,
			Min:     &tempMin,
			Average: &tempAvg,
		},
		Humidity: Humidity{
			Average: &humAvg,
		},
		Pressure: Pressure{
			Min:     &pressMin,
			Max:     &pressMax,
			Average: &pressAvg,
		},
	}
}
