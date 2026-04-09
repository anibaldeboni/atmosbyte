import { ApiError, client } from "@/shared/api/client"
import { useAppForegroundRefresh } from "@/shared/hooks/useAppForegroundRefresh"
import type { MeasurementDto } from "@/shared/types/api"
import { useCallback, useEffect, useRef, useState } from "react"


export interface CurrentMetricsState {
  data: MeasurementDto | null
  loading: boolean
  error: ApiError | null
  degraded: boolean
  intervalMs: number
  lastUpdatedAt: Date | null
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

export function useCurrentMetrics(policy: MetricsPolicy = DEFAULT_POLICY): CurrentMetricsState {
  const [data, setData] = useState<MeasurementDto | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<ApiError | null>(null)
  const [intervalMs, setIntervalMs] = useState<number>(policy.intervalMs)
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null)
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
          setLastUpdatedAt(new Date())
          setError(null)
          return
        } catch (unknownError: unknown) {
          if (attempt < policy.retryCount) {
            attempt += 1
            continue
          }

          failures.current += 1
          if (failures.current >= policy.degradedThreshold) {
            setIntervalMs(policy.degradedBackoffMs)
          }
          setError(unknownError instanceof ApiError ? unknownError : new ApiError("network", "Atualização dos dados falhou"))
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
    degraded: failures.current >= policy.degradedThreshold,
    intervalMs,
    lastUpdatedAt,
    refresh: runCycle,
  }
}
