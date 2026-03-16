function isObject(value) {
  return value !== null && typeof value === "object"
}

function normalizeCircuitBreakerState(value) {
  const key = typeof value === "string" ? value.toLowerCase() : value
  const mapping = {
    0: "Fechado",
    1: "Aberto",
    2: "Meio-aberto",
    closed: "Fechado",
    open: "Aberto",
    "half-open": "Meio-aberto",
    half_open: "Meio-aberto",
  }

  if (Object.prototype.hasOwnProperty.call(mapping, key)) {
    return mapping[key]
  }

  return "Desconhecido"
}

export function parseHealth(payload) {
  if (!isObject(payload) || typeof payload.sensor !== "string") {
    return {
      level: "error",
      text: "Sensor indisponivel",
      invalidPayload: true,
      failed: true,
    }
  }

  if (payload.sensor === "connected") {
    return {
      level: "ok",
      text: "Sensor BME280 conectado",
      invalidPayload: false,
      failed: false,
    }
  }

  return {
    level: "error",
    text: "Sensor indisponivel",
    invalidPayload: false,
    failed: true,
  }
}

export function parseQueue(payload) {
  if (!isObject(payload)) {
    return {
      level: "error",
      text: "Fila: indisponivel",
      label: "Desconhecido",
      invalidPayload: true,
      failed: true,
    }
  }

  const queueSizeValid = Number.isInteger(payload.queue_size) && payload.queue_size >= 0
  const hasCircuitState =
    typeof payload.circuit_breaker_state === "number" ||
    typeof payload.circuit_breaker_state === "string"

  if (!queueSizeValid || !hasCircuitState) {
    return {
      level: "error",
      text: "Fila: indisponivel",
      label: "Desconhecido",
      invalidPayload: true,
      failed: true,
    }
  }

  const label = normalizeCircuitBreakerState(payload.circuit_breaker_state)

  return {
    level: "ok",
    text: `Fila: ${payload.queue_size} itens (${label})`,
    label,
    invalidPayload: false,
    failed: false,
  }
}

export function computeSystem(healthOutcome, queueOutcome) {
  if (healthOutcome.failed && queueOutcome.failed) {
    return "error"
  }

  if (healthOutcome.failed || queueOutcome.failed) {
    return "warn"
  }

  return "ok"
}
