import { useCallback, useState } from "react"

import { ApiError, client } from "../../shared/api/client"
import type { AggregateMeasurementDto, HistoricalQuery } from "../../shared/types/api"

export interface HistoricalDataState {
  data: AggregateMeasurementDto[]
  loading: boolean
  error: string | null
  load: (query: HistoricalQuery) => Promise<void>
}

export function useHistoricalData(initialData: AggregateMeasurementDto[] = []): HistoricalDataState {
  const [data, setData] = useState<AggregateMeasurementDto[]>(initialData)
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (query: HistoricalQuery) => {
    setLoading(true)
    try {
      const next = await client.getHistorical(query)
      if (!Array.isArray(next)) {
        throw new Error("Invalid historical payload")
      }
      setData(next)
      setError(null)
    } catch (unknownError: unknown) {
      setError(unknownError instanceof ApiError ? unknownError.message : "Failed to load historical data")
    } finally {
      setLoading(false)
    }
  }, [])

  return { data, loading, error, load }
}
