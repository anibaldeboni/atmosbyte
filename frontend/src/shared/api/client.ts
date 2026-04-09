import type {
  AggregateMeasurementDto,
  ErrorResponseDto,
  HealthDto,
  HistoricalQuery,
  MeasurementDto,
  QueueStatsDto,
} from "@/shared/types/api"

export type ApiErrorKind = "timeout" | "http" | "parse" | "network"

export class ApiError extends Error {
  readonly kind: ApiErrorKind
  readonly status?: number
  readonly details?: string

  constructor(kind: ApiErrorKind, message: string, status?: number, details?: string) {
    super(message)
    this.kind = kind
    this.status = status
    this.details = details
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function readString(obj: Record<string, unknown>, key: string): string | null {
  const value = obj[key]
  return typeof value === "string" ? value : null
}

function readNumber(obj: Record<string, unknown>, key: string): number | null {
  const value = obj[key]
  return typeof value === "number" && Number.isFinite(value) ? value : null
}

function parseMeasurement(payload: unknown): MeasurementDto {
  if (!isRecord(payload)) {
    throw new ApiError("parse", "A resposta do endpoint /measurements tem um formato inesperado")
  }

  const timestamp = readString(payload, "timestamp")
  const temperature = readNumber(payload, "temperature")
  const humidity = readNumber(payload, "humidity")
  const pressure = readNumber(payload, "pressure")
  const source = readString(payload, "source")

  if (!timestamp || temperature === null || humidity === null || pressure === null || !source) {
    throw new ApiError("parse", "A resposta do endpoint /measurements tem um formato inesperado")
  }

  return { timestamp, temperature, humidity, pressure, source }
}

function parseHealth(payload: unknown): HealthDto {
  if (!isRecord(payload)) {
    throw new ApiError("parse", "A resposta do endpoint /health tem um formato inesperado")
  }

  const status = readString(payload, "status")
  const timestamp = readString(payload, "timestamp")
  const sensor = readString(payload, "sensor")

  if (!status || !timestamp || !sensor) {
    throw new ApiError("parse", "A resposta do endpoint /health tem um formato inesperado")
  }

  return { status, timestamp, sensor }
}

function parseQueue(payload: unknown): QueueStatsDto {
  if (!isRecord(payload)) {
    throw new ApiError("parse", "A resposta do endpoint /queue tem um formato inesperado")
  }

  const queue_size = readNumber(payload, "queue_size")
  const retry_queue_size = readNumber(payload, "retry_queue_size")
  const circuit_breaker_state = readNumber(payload, "circuit_breaker_state")
  const workers = readNumber(payload, "workers")
  const timestamp = readString(payload, "timestamp")

  if (queue_size === null || retry_queue_size === null || circuit_breaker_state === null || workers === null || !timestamp) {
    throw new ApiError("parse", "A resposta do endpoint /queue tem um formato inesperado")
  }

  return { queue_size, retry_queue_size, circuit_breaker_state, workers, timestamp }
}

function parseAggregateValue(payload: unknown): { min?: number; max?: number; average?: number } {
  if (!isRecord(payload)) {
    throw new ApiError("parse", "A resposta do endpoint /historical tem um formato inesperado")
  }

  const min = readNumber(payload, "min")
  const max = readNumber(payload, "max")
  const average = readNumber(payload, "average")

  const result: { min?: number; max?: number; average?: number } = {}
  if (min !== null) {
    result.min = min
  }
  if (max !== null) {
    result.max = max
  }
  if (average !== null) {
    result.average = average
  }
  return result
}

function parseHistorical(payload: unknown): AggregateMeasurementDto[] {
  if (!Array.isArray(payload)) {
    throw new ApiError("parse", "A resposta do endpoint /historical deve ser um array")
  }

  return payload.map((item) => {
    if (!isRecord(item)) {
      throw new ApiError("parse", "A resposta do endpoint /historical contém um item inválido")
    }

    const type = readString(item, "type")
    const date = readNumber(item, "date")
    const tempRaw = item.temp
    const humidityRaw = item.humidity
    const pressureRaw = item.pressure

    if ((type !== "minute" && type !== "hour" && type !== "day") || date === null) {
      throw new ApiError("parse", "A resposta do endpoint /historical contém metadados inválidos")
    }

    return {
      type,
      date,
      temp: parseAggregateValue(tempRaw),
      humidity: parseAggregateValue(humidityRaw),
      pressure: parseAggregateValue(pressureRaw),
    }
  })
}

async function safeParseError(res: Response): Promise<ErrorResponseDto | null> {
  try {
    const payload = (await res.json()) as unknown
    if (!isRecord(payload)) {
      return null
    }

    const error = readString(payload, "error")
    const code = readNumber(payload, "code")
    const timestamp = readString(payload, "timestamp")

    if (!error || code === null || !timestamp) {
      return null
    }

    return { error, code, timestamp }
  } catch {
    return null
  }
}

async function request<T>(path: string, timeoutMs: number): Promise<T> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(path, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    })

    if (!response.ok) {
      const parsedError = await safeParseError(response)
      const details = parsedError ? parsedError.error : response.statusText
      switch (response.status) {
        case 400:
          throw new ApiError("http", `Requisição inválida: ${details}`, response.status, details)
        case 404:
          throw new ApiError("http", `Recurso não encontrado: ${path}`, response.status, details)
        case 500:
          throw new ApiError("http", `Erro interno do servidor: ${details}`, response.status, details)
        default:
          throw new ApiError("http", `HTTP ${response.status}: ${details}`, response.status, details)
      }
    }

    try {
      return (await response.json()) as T
    } catch {
      throw new ApiError("parse", "A resposta não é um JSON válido")
    }
  } catch (error: unknown) {
    if (error instanceof ApiError) {
      throw error
    }
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new ApiError("timeout", "A requisição excedeu o tempo limite")
    }
    throw new ApiError("network", "Falha na requisição de rede")
  } finally {
    clearTimeout(timeout)
  }
}

export const client = {
  async getMeasurements(timeoutMs = 8000): Promise<MeasurementDto> {
    const payload = await request<MeasurementDto>("/measurements", timeoutMs)
    return parseMeasurement(payload)
  },

  async getHealth(timeoutMs = 8000): Promise<HealthDto> {
    const payload = await request<HealthDto>("/health", timeoutMs)
    return parseHealth(payload)
  },

  async getQueue(timeoutMs = 8000): Promise<QueueStatsDto> {
    const payload = await request<QueueStatsDto>("/queue", timeoutMs)
    return parseQueue(payload)
  },

  async getHistorical(query: HistoricalQuery, timeoutMs = 8000): Promise<AggregateMeasurementDto[]> {
    const params = new URLSearchParams({
      from: query.from,
      to: query.to,
      type: query.type,
    })
    const payload = await request(`/data?${params.toString()}`, timeoutMs)
    return parseHistorical(payload)
  },
}
