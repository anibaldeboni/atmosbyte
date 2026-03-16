import {
  fetchJSON,
  formatLocalDateTime,
  setLoading,
  showInlineAlert,
  toRFC3339Local,
} from "/static/js/common.js"
import { createStatusStrip } from "/static/js/status-strip.js"

let temperatureChart = null
let humidityChart = null
let pressureChart = null
let exportInFlight = false
let statusStrip = null

function withDefaultFilters() {
  const now = new Date()
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)

  document.getElementById("from-date").value = toInputValue(yesterday)
  document.getElementById("to-date").value = toInputValue(now)
}

function toInputValue(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  const h = String(date.getHours()).padStart(2, "0")
  const mm = String(date.getMinutes()).padStart(2, "0")
  return `${y}-${m}-${d}T${h}:${mm}`
}

export function readHistoricalFilters() {
  return {
    type: document.getElementById("aggregation-type").value,
    from: toRFC3339Local(document.getElementById("from-date").value),
    to: toRFC3339Local(document.getElementById("to-date").value),
  }
}

function validateFilters(filters) {
  if (!filters.from || !filters.to) {
    throw new Error("Datas inicial e final sao obrigatorias")
  }
  if (new Date(filters.from).getTime() > new Date(filters.to).getTime()) {
    throw new Error("Data inicial deve ser anterior ou igual a data final")
  }
}

function setHistoricalLastUpdate(message) {
  const updatedEl = document.getElementById("status-updated")
  if (updatedEl) {
    updatedEl.textContent = message
  }
}

function destroyCharts() {
  if (temperatureChart) {
    temperatureChart.destroy()
  }
  if (humidityChart) {
    humidityChart.destroy()
  }
  if (pressureChart) {
    pressureChart.destroy()
  }
}

function mapDataRows(data) {
  return data.map((entry) => ({
    label: formatLocalDateTime(new Date(entry.date * 1000)),
    tempMin: entry.temp?.min ?? null,
    tempAvg: entry.temp?.average ?? null,
    tempMax: entry.temp?.max ?? null,
    humMin: entry.humidity?.min ?? null,
    humAvg: entry.humidity?.average ?? null,
    humMax: entry.humidity?.max ?? null,
    pressureMin: entry.pressure?.min != null ? entry.pressure.min / 100 : null,
    pressureAvg: entry.pressure?.average != null ? entry.pressure.average / 100 : null,
    pressureMax: entry.pressure?.max != null ? entry.pressure.max / 100 : null,
  }))
}

function chartOptions(yText) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index", intersect: false },
    plugins: {
      legend: { display: false },
      zoom: {
        pan: { enabled: true, mode: "x" },
        zoom: { wheel: { enabled: true }, pinch: { enabled: true }, mode: "x" },
      },
    },
    scales: {
      x: { ticks: { maxRotation: 0, autoSkip: true, autoSkipPadding: 16 } },
      y: { title: { display: true, text: yText } },
    },
  }
}

export function renderHistoricalCharts(data) {
  destroyCharts()

  const rows = mapDataRows(data)
  const labels = rows.map((r) => r.label)

  const line = (label, color, values) => ({
    label,
    data: values,
    borderColor: color,
    backgroundColor: "transparent",
    tension: 0.25,
    borderWidth: 2,
    pointRadius: 0,
  })

  temperatureChart = new Chart(document.getElementById("temperature-chart"), {
    type: "line",
    data: {
      labels,
      datasets: [
        line("MAX", "#ef4444", rows.map((r) => r.tempMax)),
        line("AVG", "#3b82f6", rows.map((r) => r.tempAvg)),
        line("MIN", "#22c55e", rows.map((r) => r.tempMin)),
      ],
    },
    options: chartOptions("Temperatura (°C)"),
  })

  humidityChart = new Chart(document.getElementById("humidity-chart"), {
    type: "line",
    data: {
      labels,
      datasets: [
        line("MAX", "#ef4444", rows.map((r) => r.humMax)),
        line("AVG", "#3b82f6", rows.map((r) => r.humAvg)),
        line("MIN", "#22c55e", rows.map((r) => r.humMin)),
      ],
    },
    options: chartOptions("Umidade (%)"),
  })

  pressureChart = new Chart(document.getElementById("pressure-chart"), {
    type: "line",
    data: {
      labels,
      datasets: [
        line("MAX", "#ef4444", rows.map((r) => r.pressureMax)),
        line("AVG", "#3b82f6", rows.map((r) => r.pressureAvg)),
        line("MIN", "#22c55e", rows.map((r) => r.pressureMin)),
      ],
    },
    options: chartOptions("Pressao (hPa)"),
  })
}

function setEmptyState(visible) {
  document.getElementById("empty-state").hidden = !visible
  document.getElementById("charts-container").hidden = visible
}

export async function loadHistoricalData(filters) {
  validateFilters(filters)

  const params = new URLSearchParams(filters)
  return fetchJSON(`/data?${params.toString()}`)
}

export async function exportHistoricalCSV(filters) {
  if (exportInFlight) {
    return
  }

  validateFilters(filters)
  exportInFlight = true
  const button = document.getElementById("export-csv")
  const original = button.textContent
  button.disabled = true
  button.textContent = "Exportando..."

  try {
    const params = new URLSearchParams(filters)
    const response = await fetch(`/data/export?${params.toString()}`)
    if (!response.ok) {
      const err = await response.text()
      throw new Error(err || `HTTP ${response.status}`)
    }
    const blob = await response.blob()
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = `atmosbyte-historico-${Date.now()}.csv`
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(url)
    showInlineAlert("historical-alert", "success", "CSV exportado com sucesso")
  } finally {
    button.disabled = false
    button.textContent = original
    exportInFlight = false
  }
}

async function runLoadCycle() {
  const filters = readHistoricalFilters()
  const main = document.getElementById("charts-container")
  const loadButton = document.getElementById("load-data")
  loadButton.disabled = true
  loadButton.textContent = "Carregando..."
  setLoading(main, true)

  try {
    const data = await loadHistoricalData(filters)
    if (!Array.isArray(data) || data.length === 0) {
      setEmptyState(true)
      showInlineAlert("historical-alert", "error", "Nenhum dado encontrado no periodo selecionado")
      return
    }

    setEmptyState(false)
    renderHistoricalCharts(data)
    showInlineAlert("historical-alert", "success", "Dados carregados com sucesso")
    setHistoricalLastUpdate(`Ultima atualizacao: ${formatLocalDateTime(new Date())}`)
  } catch (error) {
    showInlineAlert("historical-alert", "error", `Falha ao carregar dados: ${error.message}`)
    setHistoricalLastUpdate("Ultima atualizacao: falha")
  } finally {
    loadButton.disabled = false
    loadButton.textContent = "Carregar Dados"
    setLoading(main, false)
  }
}

export function initHistoricalPage() {
  statusStrip = createStatusStrip({
    systemDotId: "status-system-dot",
    systemTextId: "status-system",
    sensorDotId: "status-sensor-dot",
    sensorTextId: "status-sensor",
    queueDotId: "status-queue-dot",
    queueTextId: "status-queue",
  })

  withDefaultFilters()
  document.getElementById("filters-form").addEventListener("submit", (event) => {
    event.preventDefault()
    runLoadCycle()
  })

  document.getElementById("export-csv").addEventListener("click", async () => {
    try {
      await exportHistoricalCSV(readHistoricalFilters())
    } catch (error) {
      showInlineAlert("historical-alert", "error", `Falha na exportacao: ${error.message}`)
    }
  })

  runLoadCycle()
  statusStrip.refresh()
  setInterval(() => {
    statusStrip.refresh()
  }, 30000)
}

document.addEventListener("DOMContentLoaded", initHistoricalPage)
