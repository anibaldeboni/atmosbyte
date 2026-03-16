import assert from "node:assert/strict"
import test from "node:test"

import { computeSystem, parseHealth, parseQueue } from "./status-strip-core.js"
import { createStatusStrip } from "./status-strip.js"

function createDomFixture() {
  const nodes = new Map()
  for (const id of [
    "system-dot",
    "system-status",
    "sensor-dot",
    "sensor-status",
    "queue-dot",
    "queue-status",
  ]) {
    nodes.set(id, {
      textContent: "",
      classList: {
        _set: new Set(["status-dot"]),
        add(name) {
          this._set.add(name)
        },
        remove(...names) {
          names.forEach((name) => this._set.delete(name))
        },
        contains(name) {
          return this._set.has(name)
        },
      },
    })
  }

  global.document = {
    getElementById(id) {
      return nodes.get(id) || null
    },
  }

  return { nodes }
}

test("parseHealth connected => ok", () => {
  const out = parseHealth({ sensor: "connected" })
  assert.equal(out.level, "ok")
  assert.equal(out.invalidPayload, false)
  assert.equal(out.text, "Sensor BME280 conectado")
  assert.equal(out.failed, false)
})

test("parseHealth valor diferente de connected => error sem invalidPayload", () => {
  const out = parseHealth({ sensor: "disconnected" })
  assert.equal(out.level, "error")
  assert.equal(out.invalidPayload, false)
  assert.equal(out.text, "Sensor indisponivel")
  assert.equal(out.failed, true)
})

test("parseHealth sensor ausente => invalidPayload", () => {
  const out = parseHealth({})
  assert.equal(out.level, "error")
  assert.equal(out.invalidPayload, true)
  assert.equal(out.failed, true)
})

test("parseQueue estado fechado", () => {
  const out = parseQueue({ queue_size: 3, circuit_breaker_state: 0 })
  assert.equal(out.level, "ok")
  assert.equal(out.label, "Fechado")
  assert.equal(out.text, "Fila: 3 itens (Fechado)")
  assert.equal(out.invalidPayload, false)
  assert.equal(out.failed, false)
})

test("parseQueue mapeia half-open string", () => {
  const out = parseQueue({ queue_size: 5, circuit_breaker_state: "half-open" })
  assert.equal(out.level, "ok")
  assert.equal(out.label, "Meio-aberto")
  assert.equal(out.invalidPayload, false)
})

test("parseQueue estado desconhecido e valido", () => {
  const out = parseQueue({ queue_size: 8, circuit_breaker_state: 99 })
  assert.equal(out.level, "ok")
  assert.equal(out.label, "Desconhecido")
  assert.equal(out.text, "Fila: 8 itens (Desconhecido)")
  assert.equal(out.invalidPayload, false)
  assert.equal(out.failed, false)
})

test("parseQueue circuit_breaker_state ausente => invalidPayload", () => {
  const out = parseQueue({ queue_size: 4 })
  assert.equal(out.level, "error")
  assert.equal(out.invalidPayload, true)
  assert.equal(out.failed, true)
})

test("parseQueue queue_size ausente => invalidPayload", () => {
  const out = parseQueue({ circuit_breaker_state: 0 })
  assert.equal(out.level, "error")
  assert.equal(out.invalidPayload, true)
  assert.equal(out.failed, true)
})

test("parseQueue queue_size negativo => invalidPayload", () => {
  const out = parseQueue({ queue_size: -1, circuit_breaker_state: 0 })
  assert.equal(out.level, "error")
  assert.equal(out.invalidPayload, true)
  assert.equal(out.failed, true)
})

test("parseQueue queue_size nao inteiro => invalidPayload", () => {
  const out = parseQueue({ queue_size: 1.5, circuit_breaker_state: 0 })
  assert.equal(out.level, "error")
  assert.equal(out.invalidPayload, true)
  assert.equal(out.failed, true)
})

test("computeSystem ok/warn/error", () => {
  assert.equal(computeSystem({ failed: false }, { failed: false }), "ok")
  assert.equal(computeSystem({ failed: true }, { failed: false }), "warn")
  assert.equal(computeSystem({ failed: false }, { failed: true }), "warn")
  assert.equal(computeSystem({ failed: true }, { failed: true }), "error")
})

test("refresh retorna contrato completo e atualiza DOM", async () => {
  const { nodes } = createDomFixture()
  global.fetch = async (url) => {
    if (url === "/health") {
      return { ok: true, json: async () => ({ sensor: "connected" }) }
    }
    if (url === "/queue") {
      return { ok: true, json: async () => ({ queue_size: 3, circuit_breaker_state: 0 }) }
    }
    throw new Error("unexpected")
  }

  const strip = createStatusStrip({
    systemDotId: "system-dot",
    systemTextId: "system-status",
    sensorDotId: "sensor-dot",
    sensorTextId: "sensor-status",
    queueDotId: "queue-dot",
    queueTextId: "queue-status",
  })

  const out = await strip.refresh()
  assert.equal(out.system.level, "ok")
  assert.equal(out.sensor.level, "ok")
  assert.equal(out.queue.level, "ok")
  assert.equal(out.failures.health, false)
  assert.equal(out.failures.queue, false)
  assert.equal(out.failures.invalidPayloadHealth, false)
  assert.equal(out.failures.invalidPayloadQueue, false)
  assert.equal(out.failures.invalidDom, false)
  assert.equal(typeof out.timestamp, "number")
  assert.equal(nodes.get("queue-status").textContent, "Fila: 3 itens (Fechado)")
})

test("refresh marca invalidDom quando elementos nao existem", async () => {
  global.document = { getElementById: () => null }
  global.fetch = async (url) => {
    if (url === "/health") {
      return { ok: true, json: async () => ({ sensor: "connected" }) }
    }
    if (url === "/queue") {
      return { ok: true, json: async () => ({ queue_size: 2, circuit_breaker_state: 1 }) }
    }
    throw new Error("unexpected")
  }

  const strip = createStatusStrip({
    systemDotId: "x1",
    systemTextId: "x2",
    sensorDotId: "x3",
    sensorTextId: "x4",
    queueDotId: "x5",
    queueTextId: "x6",
  })

  const out = await strip.refresh()
  assert.equal(out.failures.invalidDom, true)
})

test("stale response nao sobrescreve o refresh mais novo", async () => {
  const { nodes } = createDomFixture()
  let queueCall = 0
  global.fetch = async (url) => {
    if (url === "/health") {
      return { ok: true, json: async () => ({ sensor: "connected" }) }
    }
    if (url === "/queue") {
      queueCall += 1
      if (queueCall === 1) {
        await new Promise((resolve) => setTimeout(resolve, 30))
        return { ok: true, json: async () => ({ queue_size: 1, circuit_breaker_state: 0 }) }
      }
      return { ok: true, json: async () => ({ queue_size: 9, circuit_breaker_state: 1 }) }
    }
    throw new Error("unexpected")
  }

  const strip = createStatusStrip({
    systemDotId: "system-dot",
    systemTextId: "system-status",
    sensorDotId: "sensor-dot",
    sensorTextId: "sensor-status",
    queueDotId: "queue-dot",
    queueTextId: "queue-status",
  })

  const pA = strip.refresh()
  const pB = strip.refresh()
  await Promise.all([pA, pB])

  assert.equal(nodes.get("queue-status").textContent, "Fila: 9 itens (Aberto)")
  assert.equal(strip.getLastResult().queue.level, "ok")
})

test("setSystemOverride aplica precedencia e restauracao", async () => {
  const { nodes } = createDomFixture()
  global.fetch = async (url) => {
    if (url === "/health") {
      return { ok: true, json: async () => ({ sensor: "connected" }) }
    }
    if (url === "/queue") {
      return { ok: true, json: async () => ({ queue_size: 5, circuit_breaker_state: 0 }) }
    }
    throw new Error("unexpected")
  }

  const strip = createStatusStrip({
    systemDotId: "system-dot",
    systemTextId: "system-status",
    sensorDotId: "sensor-dot",
    sensorTextId: "sensor-status",
    queueDotId: "queue-dot",
    queueTextId: "queue-status",
  })

  await strip.refresh()
  strip.setSystemOverride({ level: "warn", message: "Sistema com degradacao" })
  assert.equal(nodes.get("system-status").textContent, "Sistema com degradacao")
  assert.equal(nodes.get("system-dot").classList.contains("status-warn"), true)

  strip.setSystemOverride(null)
  assert.equal(nodes.get("system-dot").classList.contains("status-ok"), true)
})

test("onSystemComputed recebe estado base por refresh aplicado", async () => {
  createDomFixture()
  const seen = []
  global.fetch = async (url) => {
    if (url === "/health") {
      return { ok: true, json: async () => ({ sensor: "connected" }) }
    }
    if (url === "/queue") {
      return { ok: true, json: async () => ({ queue_size: 7, circuit_breaker_state: 2 }) }
    }
    throw new Error("unexpected")
  }

  const strip = createStatusStrip({
    systemDotId: "system-dot",
    systemTextId: "system-status",
    sensorDotId: "sensor-dot",
    sensorTextId: "sensor-status",
    queueDotId: "queue-dot",
    queueTextId: "queue-status",
    onSystemComputed: (state) => seen.push(state.level),
  })

  await strip.refresh()
  assert.deepEqual(seen, ["ok"])
})
