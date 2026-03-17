export type StatusLevel = "ok" | "warn" | "error"

export type AggregationKind = "m" | "h" | "d"

export interface PollingPolicy {
  intervalMs: number
  timeoutMs: number
  retryCount: number
  degradedBackoffMs: number
  degradedThreshold: number
}

export interface StatusSummary {
  level: StatusLevel
  sensorLevel: StatusLevel
  queueLevel: StatusLevel
  health: string
  sensor: string
  queueSize: number
  retryQueueSize: number
  workers: number
  message: string
  isDegraded: boolean
  updatedAt: number
}
