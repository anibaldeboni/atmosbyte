import { ApiError, client } from "@/shared/api/client"
import { useAppForegroundRefresh } from "@/shared/hooks/useAppForegroundRefresh"
import type { MeasurementDto } from "@/shared/types/api"
import { useCallback, useEffect, useRef, useState } from "react"


export interface CurrentMetricsState {
  data: MeasurementDto | null
  loading: boolean
  error: MetricsError | null
  refresh: () => Promise<void>
}

interface MetricsPolicy {
  intervalMs: number
  degradedBackoffMs: number
  timeoutMs: number
  retryCount: number
  degradedThreshold: number
}

const DEFAULT_POLICY: MetricsPolicy = {
  intervalMs: 30000,
  degradedBackoffMs: 60000,
  timeoutMs: 8000,
  retryCount: 1,
  degradedThreshold: 3,
}

export class MetricsError extends Error {
  readonly isDegraded: boolean
  readonly sourceKind: ApiError["kind"]
  readonly status?: number
  readonly details?: string

  private constructor(
    message: string,
    options: {
      isDegraded: boolean
      sourceKind: ApiError["kind"]
      status?: number
      details?: string
    },
  ) {
    super(message)
    this.name = "MetricsError"
    this.isDegraded = options.isDegraded
    this.sourceKind = options.sourceKind
    this.status = options.status
    this.details = options.details
    Object.setPrototypeOf(this, MetricsError.prototype)
  }

  static fromUnknown(
    error: unknown,
    options: {
      isDegraded: boolean
      degradedBackoffMs: number
    },
  ): MetricsError {
    const apiError = error instanceof ApiError ? error : new ApiError("network", "Atualização dos dados falhou")

    if (options.isDegraded) {
      return new MetricsError(
        `Conexão degradada. Intervalo de polling alterado para ${Math.round(options.degradedBackoffMs / 1000)}s.`,
        {
          isDegraded: true,
          sourceKind: apiError.kind,
          status: apiError.status,
          details: apiError.details,
        },
      )
    }

    return new MetricsError(apiError.message, {
      isDegraded: false,
      sourceKind: apiError.kind,
      status: apiError.status,
      details: apiError.details,
    })
  }
}

export function useCurrentMetrics(policy: MetricsPolicy = DEFAULT_POLICY): CurrentMetricsState {
  const [data, setData] = useState<MeasurementDto | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<MetricsError | null>(null)
  const [intervalMs, setIntervalMs] = useState<number>(policy.intervalMs)
  const failures = useRef<number>(0)
  const inFlightRef = useRef<Promise<void> | null>(null)

  const runCycle = useCallback(async () => {
    if (inFlightRef.current) {
      return inFlightRef.current
    }

    setLoading(true)

    const cycle = (async () => {
      let attempt = 0
      for (; ;) {
        try {
          const next = await client.getMeasurements(policy.timeoutMs)
          failures.current = 0
          setIntervalMs(policy.intervalMs)
          setData(next)
          setError(null)
          return
        } catch (unknownError: unknown) {
          if (attempt < policy.retryCount) {
            attempt += 1
            continue
          }

          failures.current += 1
          const isDegraded = failures.current >= policy.degradedThreshold

          if (isDegraded) {
            setIntervalMs(policy.degradedBackoffMs)
          }

          setError(
            MetricsError.fromUnknown(unknownError, {
              isDegraded,
              degradedBackoffMs: policy.degradedBackoffMs,
            }),
          )
          return
        }
      }
    })()

    inFlightRef.current = cycle
    try {
      await cycle
    } finally {
      inFlightRef.current = null
      setLoading(false)
    }
  }, [policy.degradedBackoffMs, policy.degradedThreshold, policy.intervalMs, policy.retryCount, policy.timeoutMs])

  useAppForegroundRefresh(runCycle)

  useEffect(() => {
    let mounted = true

    const tick = async () => {
      if (!mounted) {
        return
      }
      await runCycle()
    }

    void tick()
    const id = window.setInterval(() => {
      void tick()
    }, intervalMs)

    return () => {
      mounted = false
      window.clearInterval(id)
    }
  }, [intervalMs, runCycle])

  return {
    data,
    loading,
    error,
    refresh: runCycle,
  }
}
