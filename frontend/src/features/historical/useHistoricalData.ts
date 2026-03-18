import { useCallback, useState } from "react"

import { ApiError, client } from "../../shared/api/client"
import type { AggregateMeasurementDto, HistoricalQuery } from "../../shared/types/api"

export interface HistoricalDataState {
  data: AggregateMeasurementDto[]
  loading: boolean
  error: ApiError | null
  load: (query: HistoricalQuery) => Promise<void>
}

export function useHistoricalData(initialData: AggregateMeasurementDto[] = []): HistoricalDataState {
  const [data, setData] = useState<AggregateMeasurementDto[]>(initialData)
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<ApiError | null>(null)

  const load = useCallback(async (query: HistoricalQuery) => {
    setLoading(true)
    try {
      const next = await client.getHistorical(query)
      setData(next)
      setError(null)
    } catch (unknownError: unknown) {
      setError(unknownError instanceof ApiError ? unknownError : new ApiError("network", "Não foi possível carregar os dados históricos"))
    } finally {
      setLoading(false)
    }
  }, [])

  return { data, loading, error, load }
}
