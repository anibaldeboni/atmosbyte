# Design: Unificacao da logica de status entre index e historical

## Contexto

Atualmente, `index.html` e `historical.html` exibem a barra de status do sistema com logicas diferentes em `web/static/js/index.js` e `web/static/js/historical.js`. Essa divergencia gera inconsistencias de mensagem, estado visual e valores apresentados (principalmente status de fila/sensor/sistema).

Objetivo: unificar a logica de atualizacao do status do topo entre as duas telas, mantendo as particularidades de cada pagina onde necessario.

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

Interface proposta:

- Recebe configuracao de elementos do DOM (IDs dos dots/textos).
- Executa refresh de status com chamadas a `/health` e `/queue`.
- Retorna resumo do ciclo para consumidor (ex.: `ok`, `warn`, erros parciais).

Dependencias:

- `fetchJSON` e `withOneRetry` de `web/static/js/common.js`.

### Unidade B: `index.js` (existente, simplificado)

Responsabilidade:

- Continuar dono de `/measurements`, polling e modo degradado.
- Delegar ao `status-strip.js` atualizacao de sensor/fila/sistema.

Observacao de fronteira:

- Modo degradado permanece regra da pagina index e pode sobrescrever o estado de sistema vindo do modulo comum quando aplicavel.

### Unidade C: `historical.js` (existente, simplificado)

Responsabilidade:

- Continuar dono de filtros, carga de dados historicos, graficos e exportacao.
- Delegar status de topo (sensor/fila/sistema) ao `status-strip.js`.
- Manter "Ultima atualizacao" ligada ao carregamento de graficos.

## Fluxo de dados e regras

### Regras unificadas de status (topo)

- Sensor:
  - `connected` => dot `status-ok`, texto "Sensor BME280 conectado".
  - Demais casos/erro => dot `status-error`, texto "Sensor indisponivel".

- Fila:
  - Sucesso em `/queue` => texto `Fila: N itens (<estado circuit breaker>)`.
  - Falha => texto de indisponibilidade e dot `status-error`.

- Sistema:
  - `status-ok` quando `/health` e `/queue` retornam com sucesso.
  - `status-warn` quando existe falha parcial em um deles.

### Particularidades por tela

- `index`:
  - Continua atualizando "Ultima atualizacao" com timestamp de `/measurements`.
  - Mantem retry existente e modo degradado apos falhas consecutivas de ciclo.

- `historical`:
  - Continua atualizando "Ultima atualizacao" no ciclo de carregamento de graficos.
  - Exibe alertas de topo para falhas de `/health` e `/queue` mesmo com graficos carregados.

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
  - Alinhar IDs da barra de status para reutilizacao direta do mesmo codigo, ou usar mapeamento explicito por pagina.

## Tratamento de erros

- Falhas de `/health` e `/queue` nao interrompem a renderizacao da pagina.
- Erro de um endpoint nao mascara sucesso do outro; sistema sobe para `warn`.
- Em `historical`, falha de status nao invalida renderizacao de graficos ja disponiveis.

## Estrategia de testes

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

## Criterios de sucesso

- Mesmas regras de estado para topo em `index` e `historical`.
- Valores corretos de fila e estado do circuit breaker em ambas.
- Sem regressao no comportamento especifico de cada pagina.
