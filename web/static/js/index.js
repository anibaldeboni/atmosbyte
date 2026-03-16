import {
  fetchJSON,
  formatLocalDateTime,
  setLoading,
  showInlineAlert,
  withOneRetry,
} from "/static/js/common.js"
import { createStatusStrip } from "/static/js/status-strip.js"

let pollingTimer = null
let pollingDelay = 30000
let failedCycles = 0
let statusStrip = null

function updateMeasurements(measurements) {
  document.getElementById("temp-value").textContent = measurements.temperature.toFixed(1)
  document.getElementById("humidity-value").textContent = measurements.humidity.toFixed(1)
  document.getElementById("pressure-value").textContent = Math.round(measurements.pressure / 100)
  document.getElementById("last-update").textContent = `Ultima atualizacao: ${formatLocalDateTime(new Date(measurements.timestamp))}`
}

function setDegradedMode(enabled) {
  if (!statusStrip) {
    return
  }

  if (enabled) {
    showInlineAlert("index-alert", "error", "Conexao instavel. Atualizacao em modo degradado (60s).")
    pollingDelay = 60000
    statusStrip.setSystemOverride({ level: "warn", message: "Sistema com degradacao" })
    return
  }

  showInlineAlert("index-alert", "success", "Atualizacao restabelecida")
  pollingDelay = 30000
  statusStrip.setSystemOverride(null)
}

async function fetchCycle() {
  const [mRes, sRes] = await Promise.allSettled([
    withOneRetry(() => fetchJSON("/measurements")),
    statusStrip.refresh(),
  ])

  if (mRes.status === "fulfilled") {
    updateMeasurements(mRes.value)
  }

  let statusFailed = sRes.status === "rejected"
  if (sRes.status === "fulfilled") {
    const failures = sRes.value.failures
    statusFailed =
      failures.health ||
      failures.queue ||
      failures.invalidPayloadHealth ||
      failures.invalidPayloadQueue
  }

  const hasFailure = mRes.status === "rejected" || statusFailed
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
  statusStrip = createStatusStrip({
    systemDotId: "system-dot",
    systemTextId: "system-status",
    sensorDotId: "sensor-dot",
    sensorTextId: "sensor-status",
    queueDotId: "queue-dot",
    queueTextId: "queue-status",
  })

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
