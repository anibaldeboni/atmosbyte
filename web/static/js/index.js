import {
  fetchJSON,
  formatLocalDateTime,
  setLoading,
  showInlineAlert,
  withOneRetry,
} from "/static/js/common.js"

let pollingTimer = null
let pollingDelay = 30000
let failedCycles = 0

function updateIndicator(dotId, textId, dotClass, text) {
  const dot = document.getElementById(dotId)
  dot.classList.remove("status-ok", "status-warn", "status-error")
  dot.classList.add(dotClass)
  document.getElementById(textId).textContent = text
}

function updateMeasurements(measurements) {
  document.getElementById("temp-value").textContent = measurements.temperature.toFixed(1)
  document.getElementById("humidity-value").textContent = measurements.humidity.toFixed(1)
  document.getElementById("pressure-value").textContent = Math.round(measurements.pressure / 100)
  document.getElementById("last-update").textContent = `Ultima atualizacao: ${formatLocalDateTime(new Date(measurements.timestamp))}`
}

function setDegradedMode(enabled) {
  if (enabled) {
    showInlineAlert("index-alert", "error", "Conexao instavel. Atualizacao em modo degradado (60s).")
    pollingDelay = 60000
    updateIndicator("system-dot", "system-status", "status-warn", "Sistema com degradacao")
    return
  }

  showInlineAlert("index-alert", "success", "Atualizacao restabelecida")
  pollingDelay = 30000
  updateIndicator("system-dot", "system-status", "status-ok", "Sistema operacional")
}

async function fetchCycle() {
  const [mRes, hRes, qRes] = await Promise.allSettled([
    withOneRetry(() => fetchJSON("/measurements")),
    withOneRetry(() => fetchJSON("/health")),
    withOneRetry(() => fetchJSON("/queue")),
  ])

  if (mRes.status === "fulfilled") {
    updateMeasurements(mRes.value)
  }

  if (hRes.status === "fulfilled") {
    const sensor = hRes.value.sensor
    if (sensor === "connected") {
      updateIndicator("sensor-dot", "sensor-status", "status-ok", "Sensor BME280 conectado")
    } else {
      updateIndicator("sensor-dot", "sensor-status", "status-error", "Sensor indisponivel")
    }
  }

  if (qRes.status === "fulfilled") {
    const stateNames = { 0: "Fechado", 1: "Aberto", 2: "Meio-aberto" }
    document.getElementById("queue-status").textContent = `Fila: ${qRes.value.queue_size} itens (${stateNames[qRes.value.circuit_breaker_state] || "Desconhecido"})`
    updateIndicator("queue-dot", "queue-status", "status-ok", document.getElementById("queue-status").textContent)
  }

  const hasFailure = [mRes, hRes, qRes].some((item) => item.status === "rejected")
  if (hasFailure) {
    failedCycles += 1
    if (failedCycles >= 3) {
      setDegradedMode(true)
    } else {
      showInlineAlert("index-alert", "error", "Falha ao atualizar dados")
    }
    return
  }

  if (failedCycles >= 3) {
    setDegradedMode(false)
  }

  failedCycles = 0
}

export async function refreshRealtimeData() {
  const grid = document.getElementById("metrics-grid")
  setLoading(grid, true)
  try {
    await fetchCycle()
  } finally {
    setLoading(grid, false)
  }
}

function schedulePolling() {
  stopRealtimePolling()

  const tick = async () => {
    await refreshRealtimeData()
    if (pollingTimer !== null) {
      pollingTimer = window.setTimeout(tick, pollingDelay)
    }
  }

  pollingTimer = window.setTimeout(tick, pollingDelay)
}

export function startRealtimePolling() {
  schedulePolling()
}

export function stopRealtimePolling() {
  if (pollingTimer !== null) {
    clearTimeout(pollingTimer)
    pollingTimer = null
  }
}

function setupTechDetailsToggle() {
  const button = document.getElementById("toggle-tech")
  const panel = document.getElementById("tech-panel")
  button.addEventListener("click", () => {
    const expanded = button.getAttribute("aria-expanded") === "true"
    button.setAttribute("aria-expanded", expanded ? "false" : "true")
    panel.hidden = expanded
  })
}

export function initIndexPage() {
  setupTechDetailsToggle()
  document.getElementById("refresh-btn").addEventListener("click", () => {
    refreshRealtimeData()
  })

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      stopRealtimePolling()
    } else {
      refreshRealtimeData()
      startRealtimePolling()
    }
  })

  refreshRealtimeData()
  startRealtimePolling()
}

document.addEventListener("DOMContentLoaded", initIndexPage)
