# Status Strip Unification Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unificar a logica de status do topo entre `index` e `historical`, garantindo valores corretos e comportamento consistente sem regressao das regras especificas de cada tela.

**Architecture:** Extrair um modulo compartilhado (`status-strip.js`) para computar e renderizar estado de sistema/sensor/fila com contrato fechado. Isolar regras puras de parsing e matriz em `status-strip-core.js` para testes Node. `index.js` e `historical.js` passam a integrar o modulo por configuracao, mantendo apenas responsabilidades de pagina.

**Tech Stack:** JavaScript ES modules (browser), fetch API, `web/static/js/common.js` (`fetchJSON`, `withOneRetry`), Node built-in test runner (`node --test`) para testes unitarios de logica pura.

---

## File Structure

- Create: `web/static/js/status-strip-core.js`
  - Responsabilidade: logica pura (`parseHealth`, `parseQueue`, `computeSystem`) sem DOM/rede.
- Create: `web/static/js/status-strip.js`
  - Responsabilidade: orquestracao de refresh (`/health` e `/queue`), stale guard por `requestId`, aplicacao no DOM, API publica.
- Create: `web/static/js/status-strip.test.mjs`
  - Responsabilidade: testes unitarios de `status-strip-core.js` no Node.
- Modify: `web/static/js/index.js`
  - Responsabilidade: integrar modulo compartilhado mantendo `/measurements`, polling e modo degradado.
- Modify: `web/static/js/historical.js`
  - Responsabilidade: integrar modulo compartilhado mantendo filtros/graficos/export e regra de `last-update` dos graficos.
- Modify: `web/templates/historical.html`
  - Responsabilidade: garantir IDs dos dots de status necessarios para wiring.

## Chunk 1: Shared module contract and pure logic tests

### Task 1: Criar testes unitarios da logica pura em `status-strip-core.js`

**Files:**
- Create: `web/static/js/status-strip.test.mjs`
- Create: `web/static/js/status-strip-core.js`

- [ ] **Step 1: Escrever testes falhando para `parseHealth`**

```js
import test from "node:test"
import assert from "node:assert/strict"
import { parseHealth } from "./status-strip-core.js"

test("parseHealth connected => ok", () => {
  const out = parseHealth({ sensor: "connected" })
  assert.equal(out.level, "ok")
  assert.equal(out.invalidPayload, false)
  assert.equal(out.text, "Sensor BME280 conectado")
})

test("parseHealth valor diferente de connected => error sem invalidPayload", () => {
  const out = parseHealth({ sensor: "disconnected" })
  assert.equal(out.level, "error")
  assert.equal(out.invalidPayload, false)
  assert.equal(out.text, "Sensor indisponivel")
})

test("parseHealth sensor ausente => invalidPayload", () => {
  const out = parseHealth({})
  assert.equal(out.level, "error")
  assert.equal(out.invalidPayload, true)
})
```

- [ ] **Step 2: Escrever testes falhando para `parseQueue`**

```js
import { parseQueue } from "./status-strip-core.js"

test("parseQueue estado fechado", () => {
  const out = parseQueue({ queue_size: 3, circuit_breaker_state: 0 })
  assert.equal(out.level, "ok")
  assert.equal(out.label, "Fechado")
  assert.equal(out.text, "Fila: 3 itens (Fechado)")
  assert.equal(out.invalidPayload, false)
})

test("parseQueue estado desconhecido e valido", () => {
  const out = parseQueue({ queue_size: 8, circuit_breaker_state: 99 })
  assert.equal(out.level, "ok")
  assert.equal(out.label, "Desconhecido")
  assert.equal(out.invalidPayload, false)
})

test("parseQueue circuit_breaker_state ausente => invalidPayload", () => {
  const out = parseQueue({ queue_size: 4 })
  assert.equal(out.level, "error")
  assert.equal(out.invalidPayload, true)
})

test("parseQueue queue_size ausente => invalidPayload", () => {
  const out = parseQueue({ circuit_breaker_state: 0 })
  assert.equal(out.level, "error")
  assert.equal(out.invalidPayload, true)
})

test("parseQueue queue_size negativo => invalidPayload", () => {
  const out = parseQueue({ queue_size: -1, circuit_breaker_state: 0 })
  assert.equal(out.level, "error")
  assert.equal(out.invalidPayload, true)
})

test("parseQueue queue_size nao inteiro => invalidPayload", () => {
  const out = parseQueue({ queue_size: 1.5, circuit_breaker_state: 0 })
  assert.equal(out.level, "error")
  assert.equal(out.invalidPayload, true)
})
```

- [ ] **Step 3: Escrever testes falhando para `computeSystem`**

```js
import { computeSystem } from "./status-strip-core.js"

test("computeSystem ok/warn/error", () => {
  assert.equal(computeSystem({ failed: false }, { failed: false }), "ok")
  assert.equal(computeSystem({ failed: true }, { failed: false }), "warn")
  assert.equal(computeSystem({ failed: false }, { failed: true }), "warn")
  assert.equal(computeSystem({ failed: true }, { failed: true }), "error")
})
```

- [ ] **Step 4: Rodar testes e validar falha inicial**

Run: `node --test web/static/js/status-strip.test.mjs`
Expected: FAIL com imports ausentes/funcoes nao implementadas.

- [ ] **Step 5: Implementar `status-strip-core.js` minimo para passar**

```js
// web/static/js/status-strip-core.js
export function parseHealth(payload) {
  // valida sensor string
  // connected => ok
  // string diferente => error sem invalidPayload
  // ausente/tipo invalido => error com invalidPayload
}

export function parseQueue(payload) {
  // valida queue_size inteiro >= 0
  // valida existencia de circuit_breaker_state
  // mapeia 0/1/2 e closed/open/half-open/half_open
  // valor desconhecido => Desconhecido sem invalidPayload
}

export function computeSystem(healthOutcome, queueOutcome) {
  // matriz ok/warn/error
}
```

- [ ] **Step 6: Rodar testes e garantir PASS da logica pura**

Run: `node --test web/static/js/status-strip.test.mjs`
Expected: PASS.

- [ ] **Step 7: Commit da logica pura e testes**

```bash
git add web/static/js/status-strip-core.js web/static/js/status-strip.test.mjs
git commit -m "add status strip core parsing and system state tests"
```

### Task 2: Implementar `status-strip.js` com contrato da spec

**Files:**
- Create: `web/static/js/status-strip.js`
- Modify: `web/static/js/status-strip.test.mjs`

- [ ] **Step 1: Escrever teste falhando para contrato do `refresh()`**

```js
import { createStatusStrip } from "./status-strip.js"

function createDomFixture() {
  const nodes = new Map()
  for (const id of [
    "system-dot", "system-status",
    "sensor-dot", "sensor-status",
    "queue-dot", "queue-status",
  ]) {
    nodes.set(id, {
      textContent: "",
      classList: {
        _s: new Set(["status-dot"]),
        add(c) { this._s.add(c) },
        remove(...cs) { cs.forEach((c) => this._s.delete(c)) },
        contains(c) { return this._s.has(c) },
      },
    })
  }

  global.document = { getElementById: (id) => nodes.get(id) || null }
  return { nodes }
}

test("refresh retorna contrato completo e atualiza DOM", async () => {
  const { nodes } = createDomFixture()
  global.fetch = async (url) => {
    if (url === "/health") return { ok: true, json: async () => ({ sensor: "connected" }) }
    if (url === "/queue") return { ok: true, json: async () => ({ queue_size: 3, circuit_breaker_state: 0 }) }
    throw new Error("unexpected")
  }

  const strip = createStatusStrip({
    systemDotId: "system-dot", systemTextId: "system-status",
    sensorDotId: "sensor-dot", sensorTextId: "sensor-status",
    queueDotId: "queue-dot", queueTextId: "queue-status",
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
    if (url === "/health") return { ok: true, json: async () => ({ sensor: "connected" }) }
    if (url === "/queue") return { ok: true, json: async () => ({ queue_size: 2, circuit_breaker_state: 1 }) }
    throw new Error("unexpected")
  }

  const strip = createStatusStrip({
    systemDotId: "x1", systemTextId: "x2",
    sensorDotId: "x3", sensorTextId: "x4",
    queueDotId: "x5", queueTextId: "x6",
  })

  const out = await strip.refresh()
  assert.equal(out.failures.invalidDom, true)
})
```

- [ ] **Step 2: Escrever teste falhando para stale response por `requestId`**

```js
test("stale response nao sobrescreve o refresh mais novo", async () => {
  const { nodes } = createDomFixture()
  let queueCall = 0

  global.fetch = async (url) => {
    if (url === "/health") return { ok: true, json: async () => ({ sensor: "connected" }) }
    if (url === "/queue") {
      queueCall += 1
      if (queueCall === 1) {
        await new Promise((r) => setTimeout(r, 30))
        return { ok: true, json: async () => ({ queue_size: 1, circuit_breaker_state: 0 }) }
      }
      return { ok: true, json: async () => ({ queue_size: 9, circuit_breaker_state: 1 }) }
    }
    throw new Error("unexpected")
  }

  const strip = createStatusStrip({
    systemDotId: "system-dot", systemTextId: "system-status",
    sensorDotId: "sensor-dot", sensorTextId: "sensor-status",
    queueDotId: "queue-dot", queueTextId: "queue-status",
  })

  const pA = strip.refresh() // lento
  const pB = strip.refresh() // rapido
  await Promise.all([pA, pB])

  assert.equal(nodes.get("queue-status").textContent, "Fila: 9 itens (Aberto)")
  assert.equal(strip.getLastResult().queue.level, "ok")
})
```

- [ ] **Step 3: Escrever teste falhando para `setSystemOverride` e `onSystemComputed`**

```js
test("setSystemOverride aplica precedencia e restauracao", async () => {
  const { nodes } = createDomFixture()
  global.fetch = async (url) => {
    if (url === "/health") return { ok: true, json: async () => ({ sensor: "connected" }) }
    if (url === "/queue") return { ok: true, json: async () => ({ queue_size: 5, circuit_breaker_state: 0 }) }
    throw new Error("unexpected")
  }

  const strip = createStatusStrip({
    systemDotId: "system-dot", systemTextId: "system-status",
    sensorDotId: "sensor-dot", sensorTextId: "sensor-status",
    queueDotId: "queue-dot", queueTextId: "queue-status",
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
    if (url === "/health") return { ok: true, json: async () => ({ sensor: "connected" }) }
    if (url === "/queue") return { ok: true, json: async () => ({ queue_size: 7, circuit_breaker_state: 2 }) }
    throw new Error("unexpected")
  }

  const strip = createStatusStrip({
    systemDotId: "system-dot", systemTextId: "system-status",
    sensorDotId: "sensor-dot", sensorTextId: "sensor-status",
    queueDotId: "queue-dot", queueTextId: "queue-status",
    onSystemComputed: (state) => seen.push(state.level),
  })

  await strip.refresh()
  assert.deepEqual(seen, ["ok"])
})
```

- [ ] **Step 4: Rodar testes para confirmar falha antes da implementacao**

Run: `node --test web/static/js/status-strip.test.mjs`
Expected: FAIL nos novos cenarios.

- [ ] **Step 5: Implementar `status-strip.js` com dependencias da spec**

```js
import { fetchJSON, withOneRetry } from "/static/js/common.js"
import { parseHealth, parseQueue, computeSystem } from "/static/js/status-strip-core.js"

export function createStatusStrip(config) {
  // resolve elementos por id
  // refresh com Promise.allSettled([
  //   withOneRetry(() => fetchJSON("/health")),
  //   withOneRetry(() => fetchJSON("/queue")),
  // ])
  // stale guard por requestId monotonic
  // aplica classes/textos no DOM, tolera elementos ausentes => failures.invalidDom
  // callback onSystemComputed opcional
  // API: refresh, setSystemOverride, getLastResult
}
```

- [ ] **Step 6: Rodar testes e garantir PASS completo do contrato**

Run: `node --test web/static/js/status-strip.test.mjs`
Expected: PASS em logica pura + contrato do modulo.

- [ ] **Step 7: Commit do modulo compartilhado completo**

```bash
git add web/static/js/status-strip.js web/static/js/status-strip-core.js web/static/js/status-strip.test.mjs
git commit -m "add shared status strip module with contract coverage"
```

## Chunk 2: Integracao nas paginas e regressao

### Task 3: Integrar `index.js` sem regressao de degradacao

**Files:**
- Modify: `web/static/js/index.js`

- [ ] **Step 1: Refatorar wiring de status para `createStatusStrip`**

```js
// index.js
// - remover updateIndicator para sensor/fila/sistema duplicados
// - instanciar statusStrip no init
// - no fetchCycle manter /measurements
// - chamar statusStrip.refresh() para health/queue
// - manter `last-update` do index somente por timestamp de /measurements
```

- [ ] **Step 2: Preservar modo degradado com override explicito**

```js
// quando degradado ativo:
// statusStrip.setSystemOverride({ level: "warn", message: "Sistema com degradacao" })
// quando recuperado:
// statusStrip.setSystemOverride(null)
// validar precedencia visual: degradado > error > warn > ok
```

- [ ] **Step 3: Rodar verificacao automatizada**

Run: `node --test web/static/js/status-strip.test.mjs && go test ./...`
Expected: PASS.

- [ ] **Step 4: Commit da integracao do index**

```bash
git add web/static/js/index.js web/static/js/status-strip.js
git commit -m "integrate index status bar with shared status strip"
```

### Task 4: Integrar `historical.js` e manter `last-update` dos graficos

**Files:**
- Modify: `web/static/js/historical.js`
- Modify: `web/templates/historical.html`

- [ ] **Step 1: Ajustar template para IDs dos dots do topo**

```html
<!-- Decisao da spec: manter IDs atuais em historical.html -->
<!-- IDs existentes permanecem: status-system, status-sensor, status-queue, status-updated -->
<!-- Alterar markup apenas se faltar id indispensavel para dot/texto; evitar renomeacao global -->
```

- [ ] **Step 2: Refatorar `historical.js` para usar `createStatusStrip`**

```js
// remover refreshTopStatus / setPageStatus de sistema/sensor/fila
// usar mapeamento explicito por pagina no createStatusStrip(config):
// - systemTextId: "status-system"
// - sensorTextId: "status-sensor"
// - queueTextId: "status-queue"
// - dots: mapear para os spans existentes no topo
// polling de topo a cada 30s chama statusStrip.refresh()
// runLoadCycle continua dono do last-update de graficos
```

- [ ] **Step 3: Verificar que polling de topo nao mexe no `last-update` dos graficos**

Run: validacao manual no navegador
Expected: `last-update` muda apenas em sucesso/falha de carregamento de graficos.

- [ ] **Step 3.1: Verificar requisito de falha parcial com graficos OK**

Run: validacao manual no navegador, simulando falha em `/health` ou `/queue` com `/data` OK
Expected: topo mostra alerta correto (sensor/fila/sistema em falha parcial), enquanto graficos continuam carregando normalmente.

- [ ] **Step 4: Rodar verificacao automatizada**

Run: `node --test web/static/js/status-strip.test.mjs && go test ./...`
Expected: PASS.

- [ ] **Step 5: Commit da integracao do historical**

```bash
git add web/static/js/historical.js web/templates/historical.html web/static/js/status-strip.js
git commit -m "unify historical status bar with shared status strip"
```

### Task 5: Regressao final e aceite

**Files:**
- Modify: `docs/superpowers/specs/2026-03-16-unificacao-status-index-historical-design.md` (somente se ajuste factual de implementacao for necessario)

- [ ] **Step 1: Rodar suite final**

Run: `node --test web/static/js/status-strip.test.mjs && go test ./...`
Expected: PASS total.

- [ ] **Step 2: Executar checklist manual de aceite**

- `/` e `/historical` exibem regras iguais de sistema/sensor/fila.
- `Fila: N itens (Fechado/Aberto/Meio-aberto/Desconhecido)` coerente nas duas telas.
- `index` preserva degradacao e polling.
- `historical` preserva filtros/graficos/export e `last-update` vinculado aos graficos.
- refreshs sobrepostos nao causam flicker/rollback (stale guard efetivo).

- [ ] **Step 3: Commit final de ajustes residuais (se houver)**

```bash
git add -A
git commit -m "finalize status strip unification and acceptance checks"
```
