import { ApiError, client } from "@/shared/api/client"
import type { PollingPolicy, StatusLevel, StatusSummary } from "@/shared/types/status"
import { useCallback, useEffect, useRef, useState } from "react"


const DEFAULT_POLICY: PollingPolicy = {
  intervalMs: 30000,
  timeoutMs: 8000,
  retryCount: 1,
  degradedBackoffMs: 60000,
  degradedThreshold: 3,
}

const INITIAL_STATUS: StatusSummary = {
  level: "ok",
  sensorLevel: "ok",
  queueLevel: "ok",
  health: "unknown",
  sensor: "unknown",
  queueSize: 0,
  retryQueueSize: 0,
  workers: 0,
  message: "Loading status...",
  isDegraded: false,
  updatedAt: Date.now(),
}

async function fetchCycle(timeoutMs: number): Promise<StatusSummary> {
  const [healthResult, queueResult] = await Promise.allSettled([client.getHealth(timeoutMs), client.getQueue(timeoutMs)])

  if (healthResult.status === "rejected" && queueResult.status === "rejected") {
    return {
      level: "error",
      sensorLevel: "error",
      queueLevel: "error",
      health: "unknown",
      sensor: "unavailable",
      queueSize: 0,
      retryQueueSize: 0,
      workers: 0,
      message: "Não foi possível conectar a estação",
      isDegraded: false,
      updatedAt: Date.now(),
    }
  }

  const health = healthResult.status === "fulfilled" ? healthResult.value : null
  const queue = queueResult.status === "fulfilled" ? queueResult.value : null

  const sensorLevel: "ok" | "error" = !health || health.sensor !== "connected" ? "error" : "ok"
  const queueLevel: "ok" | "warn" | "error" = !queue
    ? "error"
    : queue.queue_size > 0 || queue.retry_queue_size > 0
      ? "warn"
      : "ok"

  const statuses = [sensorLevel, queueLevel]
  const level: StatusLevel = statuses.includes("error") ? "error"
    : statuses.includes("warn") ? "warn"
      : "ok"


  const message =
    sensorLevel === "error" && queueLevel === "error"
      ? "Status degradado: sensores e fila indisponíveis"
      : sensorLevel === "error"
        ? "Não foi possível ler os sensores"
        : queueLevel === "error"
          ? "Fila indisponível"
          : queueLevel === "warn"
            ? "Fila com itens pendentes"
            : "Sistema operacional"

  return {
    level,
    sensorLevel,
    queueLevel,
    health: health?.status ?? "unknown",
    sensor: health?.sensor ?? "unavailable",
    queueSize: queue?.queue_size ?? 0,
    retryQueueSize: queue?.retry_queue_size ?? 0,
    workers: queue?.workers ?? 0,
    message,
    isDegraded: false,
    updatedAt: Date.now(),
  }
}

export interface StatusPollingState {
  status: StatusSummary
  loading: boolean
  intervalMs: number
}

export function useStatusPolling(policy: PollingPolicy = DEFAULT_POLICY): StatusPollingState {
  const [status, setStatus] = useState<StatusSummary>(INITIAL_STATUS)
  const [loading, setLoading] = useState<boolean>(true)
  const [intervalMs, setIntervalMs] = useState<number>(policy.intervalMs)
  const consecutiveFailuresRef = useRef<number>(0)

  const runCycle = useCallback(async () => {
    let attempt = 0
    for (; ;) {
      try {
        const next = await fetchCycle(policy.timeoutMs)
        consecutiveFailuresRef.current = 0
        setIntervalMs(policy.intervalMs)
        setStatus({ ...next, isDegraded: false })
        setLoading(false)
        return
      } catch (unknownError: unknown) {
        if (attempt < policy.retryCount) {
          attempt += 1
          continue
        }

        consecutiveFailuresRef.current += 1
        const degraded = consecutiveFailuresRef.current >= policy.degradedThreshold

        if (degraded) {
          setIntervalMs(policy.degradedBackoffMs)
        }

        const communicationLevel: "warn" | "error" = degraded ? "error" : "warn"
        setStatus((previous) => ({
          ...previous,
          level: communicationLevel,
          sensorLevel: communicationLevel,
          message: degraded ? "Status degradado devido a falhas repetidas" : previous.message,
          isDegraded: degraded,
          updatedAt: Date.now(),
        }))
        setLoading(false)
        return
      }
    }
  }, [policy.degradedBackoffMs, policy.degradedThreshold, policy.intervalMs, policy.retryCount, policy.timeoutMs])

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

  return { status, loading, intervalMs }
}
