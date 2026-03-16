# Design: Unificacao da logica de status entre index e historical

## Contexto

Atualmente, `index.html` e `historical.html` exibem a barra de status do sistema com logicas diferentes em `web/static/js/index.js` e `web/static/js/historical.js`. Essa divergencia gera inconsistencias de mensagem, estado visual e valores apresentados (principalmente status de fila/sensor/sistema).

Objetivo: unificar a logica de atualizacao do status do topo entre as duas telas, mantendo as particularidades de cada pagina onde necessario e eliminando divergencia de regras.

## Escopo

Incluido neste design:

- Unificacao da logica de status de topo (sistema, sensor, fila) para `index` e `historical`.
- Reuso do mesmo fluxo para leitura de `/health` e `/queue`.
- Padronizacao dos estados visuais (`status-ok`, `status-warn`, `status-error`) e textos.
- Garantia de que ambas as telas exibam valores corretos da fila com estado do circuit breaker.

Fora de escopo:

- Alterar comportamento funcional de filtros/graficos/exportacao de CSV da tela historica.
- Refatoracoes amplas fora da barra de status.
- Mudancas de contrato de API backend.

## Decisoes validadas

- Abordagem escolhida: extrair modulo compartilhado de status (recomendada).
- Em `historical`, "Ultima atualizacao" deve continuar refletindo o ultimo carregamento dos graficos.
- Em `historical`, falhas em `/health` ou `/queue` devem aparecer no topo mesmo se os graficos carregarem corretamente.

## Abordagens consideradas

### 1) Modulo compartilhado de status (escolhida)

- Criar `web/static/js/status-strip.js` para concentrar a logica comum.
- `index.js` e `historical.js` delegam ao modulo para status de topo.

Trade-offs:

- Pro: remove duplicacao e evita divergencia futura.
- Pro: facilita manutencao e testes.
- Contra: exige pequeno refactor inicial de integracao por pagina.

### 2) Copiar logica da index para historical

Trade-offs:

- Pro: implementacao imediata.
- Contra: mantem duplicacao e risco de nova divergencia.

### 3) Padronizar apenas dados backend

Trade-offs:

- Pro: baixo impacto no frontend.
- Contra: nao resolve inconsistencias visuais e de comportamento entre telas.

## Arquitetura proposta

### Unidade A: `status-strip.js` (novo)

Responsabilidade unica: calcular e aplicar status do topo para qualquer pagina que tenha a barra de status.

Interface proposta (concreta):

- `createStatusStrip(config)` retorna um controlador isolado por pagina.
- `config` contem os IDs dos elementos de topo:
  - `systemDotId`, `systemTextId`, `sensorDotId`, `sensorTextId`, `queueDotId`, `queueTextId`.
- `config` contem callbacks opcionais:
  - `onSystemComputed(state)` para pagina aplicar override visual (ex.: degradacao da `index`).
- Controlador exposto:
  - `refresh()` => executa um ciclo de `/health` + `/queue` com `withOneRetry`.
  - `setSystemOverride({ level, message } | null)` => aplica/limpa override local de pagina sem perder estado base computado.
  - `getLastResult()` => retorna snapshot `{ system, sensor, queue, failures }` para debug/logica de pagina.

Contrato de retorno de `refresh()`:

- `system.level`: `ok | warn | error`.
- `sensor.level`: `ok | error`.
- `queue.level`: `ok | error`.
- `failures` (tipo unico e fechado):
  - `health`: boolean.
  - `queue`: boolean.
  - `invalidPayloadHealth`: boolean.
  - `invalidPayloadQueue`: boolean.
  - `invalidDom`: boolean.
- `timestamp`: instante do ciclo para observabilidade.

Comportamento com DOM ausente:

- Se algum elemento configurado nao existir no DOM, o modulo nao deve lançar excecao.
- O modulo aplica atualizacao somente nos elementos presentes e marca `failures.invalidDom = true` no resultado.
- A falta de elemento nao bloqueia calculo de estado logico (`system/sensor/queue`).

Dependencias:

- `fetchJSON` e `withOneRetry` de `web/static/js/common.js`.

Regra de scheduling e ownership:

- `status-strip.js` nao cria `setInterval` interno.
- Cada pagina e dona do agendamento (`index` e `historical`) e chama `refresh()` no proprio ciclo.
- Isso evita timers duplicados e reduz condicao de corrida entre ciclos diferentes.

### Unidade B: `index.js` (existente, simplificado)

Responsabilidade:

- Continuar dono de `/measurements`, polling e modo degradado.
- Delegar ao `status-strip.js` atualizacao de sensor/fila/sistema.

Observacao de fronteira:

- Modo degradado permanece regra da pagina index e pode sobrescrever o estado de sistema vindo do modulo comum quando aplicavel.
- `index` continua controlando frequencia dinamica (30s/60s), e chama `refresh()` do modulo de status dentro do mesmo ciclo principal para manter consistencia temporal.

### Unidade C: `historical.js` (existente, simplificado)

Responsabilidade:

- Continuar dono de filtros, carga de dados historicos, graficos e exportacao.
- Delegar status de topo (sensor/fila/sistema) ao `status-strip.js`.
- Manter "Ultima atualizacao" ligada ao carregamento de graficos.
- Controlar polling de topo em cadence fixa (30s), independente da carga de graficos.

## Fluxo de dados e regras

### Regras unificadas de status (topo)

- Sensor:
  - `connected` => dot `status-ok`, texto "Sensor BME280 conectado".
  - Demais casos/erro => dot `status-error`, texto "Sensor indisponivel".

- Fila:
  - Sucesso em `/queue` com payload valido => texto `Fila: N itens (<estado circuit breaker>)`.
  - Falha => texto de indisponibilidade e dot `status-error`.

Mapeamento fechado de circuit breaker para exibicao:

- `0` ou `"closed"` => `Fechado`.
- `1` ou `"open"` => `Aberto`.
- `2` ou `"half-open"` ou `"half_open"` => `Meio-aberto`.
- Qualquer outro valor => `Desconhecido`.

Regra fechada para valor desconhecido de circuit breaker:

- Valor desconhecido de `circuit_breaker_state` NAO e erro de payload.
- Nessa situacao, endpoint `/queue` continua valido, exibe `Desconhecido` e mantem `queue.level = ok`.
- `invalidPayloadQueue` so e `true` quando faltar o campo ou o tipo for invalido para leitura.

- Sistema:
  - `status-ok` quando `/health` e `/queue` retornam com sucesso e payload valido.
  - `status-warn` quando existe falha parcial (somente um endpoint falha ou payload parcial invalido).
  - `status-error` quando ambos falham no mesmo ciclo, ou quando payload critico invalido impede determinar simultaneamente sensor e fila.

Matriz de estado minima:

- `health=ok`, `queue=ok` => sistema `ok`.
- `health=erro`, `queue=ok` => sistema `warn`.
- `health=ok`, `queue=erro` => sistema `warn`.
- `health=erro`, `queue=erro` => sistema `error`.
- `health/queue` com JSON invalido/campos obrigatorios ausentes => tratar como erro do endpoint correspondente.

Definicao de payload critico:

- Critico de `health`: ausencia de campo `sensor` ou tipo nao-texto.
- Critico de `queue`: ausencia de `queue_size` numerico e de `circuit_breaker_state` simultaneamente.
- Elevacao para `status-error` por payload critico ocorre apenas quando ambos endpoints estao em estado critico no mesmo ciclo.

Contrato minimo de payload esperado:

- `/health`:
  - Obrigatorio: `sensor` (string).
  - Aceitos para conectado: `"connected"`.
  - Outros valores: tratado como sensor indisponivel.
- `/queue`:
  - Obrigatorio: `queue_size` (number inteiro >= 0).
  - Obrigatorio: `circuit_breaker_state` (number ou string).
  - Valores conhecidos: number `0/1/2` ou string `closed/open/half-open/half_open`.
  - Valor desconhecido: permitido, exibido como `Desconhecido`.
  - Campo ausente ou tipo nao suportado: tratar como erro de payload do endpoint.

Fallback de payload:

- Sensor sem campo `sensor` ou valor desconhecido => "Sensor indisponivel" + `status-error`.
- Fila sem `queue_size` numerico => "Fila: indisponivel" + `status-error`.
- Circuit breaker sem estado mapeavel => exibir "Desconhecido" sem quebrar renderizacao.

### Particularidades por tela

- `index`:
  - Continua atualizando "Ultima atualizacao" com timestamp de `/measurements`.
  - Mantem retry existente e modo degradado apos falhas consecutivas de ciclo.
  - Prioridade de estado visual de sistema: `degradado(index)` > `error` > `warn` > `ok`.

- `historical`:
  - Continua atualizando "Ultima atualizacao" no ciclo de carregamento de graficos.
  - Exibe alertas de topo para falhas de `/health` e `/queue` mesmo com graficos carregados.
  - Polling de topo nao sobrescreve "Ultima atualizacao" dos graficos.

## Mudancas por arquivo

- `web/static/js/status-strip.js`:
  - Novo modulo com funcoes de refresh e aplicacao de estado visual/textual do topo.

- `web/static/js/index.js`:
  - Remover duplicacao de atualizacao de sensor/fila/sistema.
  - Integrar chamadas ao modulo compartilhado sem remover regras proprias de modo degradado.

- `web/static/js/historical.js`:
  - Substituir `refreshTopStatus`/`setPageStatus` pelo modulo compartilhado para status de sistema/sensor/fila.
  - Preservar atualizacao de "Ultima atualizacao" vinculada ao carregamento dos graficos.

- `web/templates/historical.html` (e eventualmente `web/templates/index.html`):
  - Decisao fechada: manter IDs atuais e usar mapeamento explicito por pagina via `config` do `createStatusStrip`.
  - Isso evita churn desnecessario em markup e minimiza risco de regressao visual.

## Tratamento de erros

- Falhas de `/health` e `/queue` nao interrompem a renderizacao da pagina.
- Erro de um endpoint nao mascara sucesso do outro; sistema sobe para `warn`.
- Em `historical`, falha de status nao invalida renderizacao de graficos ja disponiveis.
- Timeout, HTTP nao-2xx e erro de parse JSON seguem o mesmo caminho de falha por endpoint.
- Payload sem campos obrigatorios e tratado como erro de dados (equivalente a falha do endpoint para fins de status).

## Integracao e concorrencia

- `index` executa um ciclo unico que inclui medidas e status, reduzindo snapshots desencontrados.
- `historical` separa dois fluxos por design:
  - Fluxo A: carga de graficos por acao do usuario.
  - Fluxo B: refresh de topo por timer.
- Para evitar sobrescrita indevida:
  - Somente Fluxo A altera `last-update` da `historical`.
  - Fluxo B altera apenas sistema/sensor/fila.
  - `refresh()` ignora resultado atrasado quando existir ciclo mais recente concluido usando `requestId` monotonico local por instancia.

Semantica de retry e `requestId` (deterministica):

- Retry e por endpoint (nao por ciclo inteiro):
  - `/health`: `withOneRetry(() => fetchJSON("/health"))`.
  - `/queue`: `withOneRetry(() => fetchJSON("/queue"))`.
- `refresh()` inicia com `requestIdAtual = ++lastIssuedRequestId`.
- Ao concluir, o resultado so e aplicado no DOM se `requestIdAtual === lastIssuedRequestId`.
- Se nao for o ultimo, o resultado e descartado silenciosamente (stale response).

Exemplo de corrida:

- `refresh#10` inicia, depois `refresh#11` inicia e termina primeiro.
- Resultado de `#11` aplica no DOM.
- Resultado tardio de `#10` e descartado por `requestId`, evitando flicker/rollback visual.

## Estrategia de testes

### Testes automatizados (minimos)

Observacao de viabilidade:

- O repositiorio hoje nao declara harness de teste JS em `package.json`.
- Portanto, esta mudanca adota duas camadas:
  - Camada 1 (obrigatoria): cobertura manual de integracao detalhada abaixo.
  - Camada 2 (recomendada, se harness JS existir no ambiente local): unitarios do modulo `status-strip.js`.

- Testes unitarios do modulo `status-strip.js` com `fetch` mockado para validar:
  - Matriz `ok/warn/error` de sistema.
  - Fallback para payload invalido/campos ausentes.
  - Mapeamento de texto da fila e estado do circuit breaker.
  - Precedencia de `setSystemOverride` da `index`.
  - Comportamento resiliente quando IDs configurados nao existem no DOM.
  - Ignorar respostas obsoletas por `requestId` monotonicamente crescente.

- Testes de wiring (unitarios leves por pagina):
  - `index.js`: override degradado tem precedencia visual sobre estado base do modulo.
  - `historical.js`: refresh de topo nao altera `last-update` de carga de graficos.

### Testes manuais de integracao

Teste manual em ambas as telas com 4 cenarios:

1. `/health` e `/queue` OK.
2. Falha apenas em `/health`.
3. Falha apenas em `/queue`.
4. Falha em ambos.

Validacoes:

- Consistencia de texto e dot para sistema/sensor/fila entre `index` e `historical`.
- Exibicao correta de `Fila: N itens (estado)` nas duas telas.
- `index` preserva polling e degradacao apos falhas consecutivas.
- `historical` preserva filtros/graficos/exportacao e atualiza "Ultima atualizacao" pelo carregamento de graficos.
- Confirmar ausencia de flicker de estado ao alternar falha/recuperacao rapida de endpoints.

Caso sem harness JS disponivel:

- Registrar evidencias manuais dos cenarios (capturas/log de console) como criterio de aceite operacional.

## Criterios de sucesso

- Mesmas regras de estado para topo em `index` e `historical`.
- Valores corretos de fila e estado do circuit breaker em ambas.
- Sem regressao no comportamento especifico de cada pagina.
- Mapeamento de circuit breaker identico entre paginas (`Fechado/Aberto/Meio-aberto/Desconhecido`).
