import { useCallback, useEffect, useRef, useState } from "react"

import { ApiError, client } from "../../shared/api/client"
import type { MeasurementDto } from "../../shared/types/api"

export interface CurrentMetricsState {
  data: MeasurementDto | null
  loading: boolean
  error: string | null
  degraded: boolean
  intervalMs: number
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
  const [error, setError] = useState<string | null>(null)
	const [intervalMs, setIntervalMs] = useState<number>(policy.intervalMs)
  const failures = useRef<number>(0)

  const runCycle = useCallback(async () => {
    let attempt = 0
    for (;;) {
      try {
			const next = await client.getMeasurements(policy.timeoutMs)
			failures.current = 0
			setIntervalMs(policy.intervalMs)
        setData(next)
        setError(null)
        setLoading(false)
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
        setError(unknownError instanceof ApiError ? unknownError.message : "Measurement request failed")
        setLoading(false)
        return
      }
    }
  }, [])

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
	}
}
