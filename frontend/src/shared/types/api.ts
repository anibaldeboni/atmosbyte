import type { AggregationKind } from "./status"

export interface MeasurementDto {
  timestamp: string
  temperature: number
  humidity: number
  pressure: number
  source: string
}

export interface ErrorResponseDto {
  error: string
  code: number
  timestamp: string
}

export interface QueueStatsDto {
  queue_size: number
  retry_queue_size: number
  circuit_breaker_state: number
  workers: number
  timestamp: string
}

export interface HealthDto {
  status: string
  timestamp: string
  sensor: string
}

export interface AggregateValueDto {
  min?: number
  max?: number
  average?: number
}

export interface AggregateMeasurementDto {
  type: "minute" | "hour" | "day"
  date: number
  temp: AggregateValueDto
  humidity: AggregateValueDto
  pressure: AggregateValueDto
}

export interface HistoricalQuery {
  from: string
  to: string
  type: AggregationKind
}
