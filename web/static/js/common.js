const TIMEOUT_MS = 8000

export async function fetchJSON(url, options = {}) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        ...(options.headers || {}),
      },
    })

    if (!response.ok) {
      const text = await response.text()
      throw new Error(`HTTP ${response.status}: ${text || response.statusText}`)
    }

    return await response.json()
  } finally {
    clearTimeout(timeout)
  }
}

export function setLoading(element, isLoading) {
  if (!element) {
    return
  }

  element.classList.toggle("is-loading", isLoading)
}

export function showInlineAlert(containerId, kind, message) {
  const container = document.getElementById(containerId)
  if (!container) {
    return
  }

  if (!message) {
    container.innerHTML = ""
    return
  }

  const safeKind = kind === "success" ? "alert-success" : "alert-error"
  container.innerHTML = `<div class="alert ${safeKind}" role="status">${escapeHTML(message)}</div>`
}

export function formatLocalDateTime(date) {
  return date.toLocaleString("pt-BR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
}

export function toRFC3339Local(inputValue) {
  if (!inputValue) {
    return ""
  }

  const dt = new Date(inputValue)
  if (Number.isNaN(dt.getTime())) {
    return ""
  }

  return dt.toISOString()
}

export function escapeHTML(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;")
}

export function withOneRetry(fn) {
  return fn().catch(() => fn())
}
