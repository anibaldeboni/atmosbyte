import { fetchJSON, withOneRetry } from "./common.js"
import { computeSystem, parseHealth, parseQueue } from "./status-strip-core.js"

function setElementStatus(dotEl, textEl, level, text) {
  if (dotEl) {
    dotEl.classList.remove("status-ok", "status-warn", "status-error")
    dotEl.classList.add(`status-${level}`)
  }

  if (textEl && typeof text === "string") {
    textEl.textContent = text
  }
}

function resolveElements(config) {
  const elements = {
    systemDot: document.getElementById(config.systemDotId),
    systemText: document.getElementById(config.systemTextId),
    sensorDot: document.getElementById(config.sensorDotId),
    sensorText: document.getElementById(config.sensorTextId),
    queueDot: document.getElementById(config.queueDotId),
    queueText: document.getElementById(config.queueTextId),
  }

  const invalidDom = Object.values(elements).some((element) => !element)
  return { elements, invalidDom }
}

function createFailureFlags() {
  return {
    health: false,
    queue: false,
    invalidPayloadHealth: false,
    invalidPayloadQueue: false,
    invalidDom: false,
  }
}

export function createStatusStrip(config) {
  let lastIssuedRequestID = 0
  let systemOverride = null
  let lastBaseState = { level: "ok", text: "Sistema operacional" }
  let lastResult = {
    system: { level: "ok", text: "Sistema operacional" },
    sensor: { level: "ok", text: "Sensor BME280 conectado" },
    queue: { level: "ok", text: "Fila: --" },
    failures: createFailureFlags(),
    timestamp: Date.now(),
  }

  const applySnapshot = (snapshot) => {
    const { elements, invalidDom } = resolveElements(config)
    snapshot.failures.invalidDom = invalidDom

    const systemState = systemOverride ?? snapshot.system

    setElementStatus(elements.systemDot, elements.systemText, systemState.level, systemState.text)
    setElementStatus(elements.sensorDot, elements.sensorText, snapshot.sensor.level, snapshot.sensor.text)
    setElementStatus(elements.queueDot, elements.queueText, snapshot.queue.level, snapshot.queue.text)

    lastResult = {
      ...snapshot,
      system: systemState,
      failures: { ...snapshot.failures },
    }

    return lastResult
  }

  const refresh = async () => {
    const requestID = ++lastIssuedRequestID
    const failures = createFailureFlags()

    const [healthResult, queueResult] = await Promise.allSettled([
      withOneRetry(() => fetchJSON("/health")),
      withOneRetry(() => fetchJSON("/queue")),
    ])

    let healthState
    if (healthResult.status === "fulfilled") {
      healthState = parseHealth(healthResult.value)
      failures.invalidPayloadHealth = healthState.invalidPayload
    } else {
      failures.health = true
      healthState = {
        level: "error",
        text: "Sensor indisponivel",
        invalidPayload: false,
        failed: true,
      }
    }

    let queueState
    if (queueResult.status === "fulfilled") {
      queueState = parseQueue(queueResult.value)
      failures.invalidPayloadQueue = queueState.invalidPayload
    } else {
      failures.queue = true
      queueState = {
        level: "error",
        text: "Fila: indisponivel",
        label: "Desconhecido",
        invalidPayload: false,
        failed: true,
      }
    }

    const baseSystemLevel = computeSystem(healthState, queueState)
    const baseSystemTextByLevel = {
      ok: "Sistema operacional",
      warn: "Sistema com degradacao",
      error: "Sistema indisponivel",
    }

    const baseSystem = {
      level: baseSystemLevel,
      text: baseSystemTextByLevel[baseSystemLevel] || "Sistema indisponivel",
    }

    if (typeof config.onSystemComputed === "function") {
      config.onSystemComputed(baseSystem)
    }

    lastBaseState = baseSystem
    const snapshot = {
      system: baseSystem,
      sensor: { level: healthState.level, text: healthState.text },
      queue: { level: queueState.level, text: queueState.text },
      failures,
      timestamp: Date.now(),
    }

    if (requestID !== lastIssuedRequestID) {
      return lastResult
    }

    return applySnapshot(snapshot)
  }

  const setSystemOverride = (override) => {
    if (override === null) {
      systemOverride = null
    } else {
      systemOverride = {
        level: override.level,
        text: override.message,
      }
    }

    applySnapshot({
      ...lastResult,
      system: lastBaseState,
      failures: { ...lastResult.failures },
    })
  }

  const getLastResult = () => ({
    ...lastResult,
    failures: { ...lastResult.failures },
  })

  return {
    refresh,
    setSystemOverride,
    getLastResult,
  }
}
