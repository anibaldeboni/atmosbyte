# Spec de Design: Retorno do Frontend (`web/templates`)

Data: 2026-03-16  
Status: Aprovado em brainstorming (pronto para planejamento)  
Escopo: Alto alinhamento visual e funcional ao mockup fornecido em `screen.png`

## 1) Contexto e objetivo

O frontend atual em `web/templates/index.html`, `web/templates/historical.html` e `web/templates/404.html` funciona, mas está com CSS/JS inline extensos, visual inconsistente entre páginas e baixa modularidade para evoluções.  
O objetivo deste retrabalho é restaurar e elevar o frontend com aderência alta ao mockup, mantendo idioma pt-BR, preservando as rotas existentes e adicionando recursos funcionais previstos na interface (incluindo exportação CSV).

## 2) Decisões já validadas

- Fidelidade: alta aderência ao mockup (não apenas inspiração).
- Escopo de telas: `historical.html`, `index.html` e `404.html`.
- Idioma padrão: pt-BR.
- Escopo funcional: visual + comportamento.
- Backend permitido: sim, quando necessário para suportar UX (ex.: exportação CSV).
- Abordagem escolhida: modularização com assets compartilhados (opção 2), evitando manter páginas monolíticas inline.

## 3) Não-objetivos (YAGNI)

- Não migrar para framework SPA (React/Vue/etc.) nesta fase.
- Não alterar domínio de negócio (sensor, fila, persistência) além do estritamente necessário para suportar frontend.
- Não redesenhar APIs além de ajustes pontuais para exportação/serviço de assets.
- Não introduzir sistema de autenticação/autorização novo.

## 4) Arquitetura proposta

### 4.1 Organização de arquivos

Manter templates HTML em `web/templates/`, mas mover apresentação e comportamento para assets estáticos reutilizáveis:

- `web/static/css/base.css`
  - reset, tokens visuais, tipografia, espaçamentos, utilitários, estados globais.
- `web/static/css/layout.css`
  - app shell (header, navegação, status bar, container e rodapé).
- `web/static/css/index.css`
  - estilos específicos da página inicial.
- `web/static/css/historical.css`
  - estilos específicos da página histórica e cards de gráfico.
- `web/static/css/notfound.css`
  - estilos específicos da 404.
- `web/static/js/common.js`
  - utilitários comuns (fetch seguro, formatação, mensagens, loading, atualização de status).
- `web/static/js/index.js`
  - lógica da home (medidas atuais, polling, atualização de status).
- `web/static/js/historical.js`
  - lógica de filtros, carga de séries, renderização de gráficos, exportação CSV.

### 4.2 Backend web

No pacote `web`:

- Servir assets estáticos em `/static/*` via `http.FileServer`.
- Preservar rotas existentes: `/`, `/historical`, `/404` (via catch-all), `/measurements`, `/health`, `/queue`, `/data`.
- Adicionar endpoint de exportação CSV (sugestão: `GET /data/export`) com os mesmos filtros de `/data`.

Precedencia de roteamento (obrigatoria):

1. registrar `/static/` antes de qualquer catch-all;
2. registrar rotas de API (`/measurements`, `/health`, `/queue`, `/data`, `/data/export`);
3. registrar rotas de pagina (`/`, `/historical`);
4. por ultimo, fallback de not found.

## 5) Design system e direção visual

### 5.1 Identidade

- Estética clara, limpa e orientada a monitoramento operacional.
- Estrutura de topo em duas faixas:
  - faixa principal: marca + navegação (`Início`, `Histórico`) com estado ativo;
  - faixa de status operacional: pílulas com sistema, sensor, última atualização, fila.
- Cards brancos sobre fundo claro com bordas suaves, sombras discretas e espaçamento generoso.

### 5.2 Tokens

Definir variáveis CSS no `base.css` para consistência:

- Cores: fundo, superfície, borda, texto primário/secundário, semânticas (sucesso, alerta, erro), séries de gráfico (max/avg/min).
- Tipografia: famílias e escalas de título/subtítulo/corpo/legenda.
- Espaçamento: escala única (`4, 8, 12, 16, 24, 32...`).
- Raios e sombras: níveis padronizados para cards/inputs/botões.

### 5.3 Componentes reutilizaveis

- `AppShell`: header, subheader de status, container e footer.
- `NavLink`: estado normal/hover/ativo/focus.
- `StatusPill`: ícone, texto e variação por estado.
- `FilterPanel`: label + input/select + ações primária/secundária.
- `PrimaryButton` e `SecondaryButton`.
- `ChartCard`: título, subtítulo, legenda fixa max/avg/min, área de gráfico.
- `InlineAlert`: sucesso/erro/aviso.
- `EmptyState`: mensagem de ausência de dados.

### 5.4 Interfaces internas dos modulos JS

Para reduzir acoplamento e facilitar testes, os modulos JS devem expor contratos explicitos:

- `common.js`
  - `fetchJSON(url, options)`
  - `setLoading(target, isLoading)`
  - `showInlineAlert(containerId, kind, message)`
  - `formatLocalDateTime(date)`
  - `toRFC3339Local(inputValue)`
- `historical.js`
  - `initHistoricalPage()`
  - `readHistoricalFilters()`
  - `loadHistoricalData(filters)`
  - `renderHistoricalCharts(data)`
  - `exportHistoricalCSV(filters)`
- `index.js`
  - `initIndexPage()`
  - `refreshRealtimeData()`
  - `startRealtimePolling()`
  - `stopRealtimePolling()`

Regra de fronteira:

- estado de pagina fica no modulo da pagina (`historical.js` ou `index.js`);
- `common.js` nao armazena estado de negocio, apenas utilitarios.

## 6) Design por página

### 6.1 `historical.html`

Objetivo: alta fidelidade ao mockup de histórico.

Estrutura:

1. AppShell com navegação ativa em `Histórico`.
2. Barra de status operacional no topo.
3. Painel de filtros:
   - agregação (hora/dia/minuto conforme backend suporta);
   - data inicial e final;
   - botão `Carregar Dados`;
   - botão `Exportar CSV`.
4. Três cards de série temporal:
   - Histórico da Temperatura do Ar (°C);
   - Histórico da Umidade Relativa (%);
   - Histórico da Pressão Atmosférica (hPa).
5. Rodapé institucional discreto.

### 6.2 `index.html`

Objetivo: manter dados em tempo real com a mesma linguagem visual do histórico.

Estrutura:

1. AppShell com navegação ativa em `Início`.
2. Barra de status operacional reaproveitada.
3. Bloco de métricas instantâneas (temperatura, umidade, pressão).
4. Ações de atualização e feedback de erros.
5. Area de links de rotas/diagnostico sera mantida, mas recolhida por padrao em bloco colapsavel "Detalhes tecnicos" para nao competir com as metricas principais.

### 6.3 `404.html`

Objetivo: manter identidade visual do sistema em página de erro.

Estrutura:

1. AppShell simplificado.
2. Mensagem clara de rota não encontrada.
3. CTA para retornar ao início (`/`).

## 7) Fluxo de dados e comportamento

### 7.1 Histórico

- Inicialização:
  - preencher filtros com janela padrão (últimas 24h);
  - agregação padrão por hora;
  - executar carga inicial automaticamente.
- Consulta:
  - consumir `GET /data?type=<kind>&from=<RFC3339>&to=<RFC3339>`.
  - enum fechado para `type`:
    - `m` = minuto
    - `h` = hora
    - `d` = dia
  - qualquer valor fora do enum retorna `400`.
- Renderização:
  - converter payload para datasets max/avg/min;
  - preservar escala e legenda consistente entre gráficos.
- Exportação:
  - `GET /data/export?type=<kind>&from=<RFC3339>&to=<RFC3339>`;
  - iniciar download de CSV com nome amigável e timestamp.

### 7.2 Home

- Polling periodico para `/measurements`, `/health` e `/queue`.
- Atualização de métricas e status sem recarregar página.
- Preservar último valor válido em caso de falha transitória.

Politica de polling (obrigatoria):

- intervalo: 30s;
- timeout por requisicao: 8s;
- retries por ciclo: 1 tentativa adicional imediata;
- apos 3 ciclos consecutivos com falha, reduzir frequencia para 60s e exibir alerta discreto de degradacao;
- ao primeiro ciclo de sucesso, voltar para 30s e remover alerta.

### 7.3 Estados de execução

- `loading`: botões desabilitados, texto de progresso, feedback visual.
- `success`: confirmação curta em operações de usuário.
- `error`: alerta contextual sem quebrar layout.
- `empty`: mensagem explícita quando não houver dados no período.

## 8) Contrato do endpoint CSV

### 8.1 Rota

- Método: `GET`
- Caminho: `/data/export`
- Query params:
  - `type` (enum: `m|h|d`)
  - `from` (RFC3339)
  - `to` (RFC3339)

### 8.2 Respostas

- `200 OK` com `Content-Type: text/csv; charset=utf-8`
- `Content-Disposition: attachment; filename="atmosbyte-historico-<timestamp>.csv"`
- `200 OK` em cenario sem dados, contendo apenas header CSV (sem linhas de dados).
- `400 Bad Request` para parâmetros inválidos.
- `503 Service Unavailable` sem repositório configurado.
- `500 Internal Server Error` para falha de processamento.

### 8.3 Formato CSV (mínimo)

Colunas previstas:

- `timestamp`
- `temp_min`
- `temp_avg`
- `temp_max`
- `humidity_min`
- `humidity_avg`
- `humidity_max`
- `pressure_min_hpa`
- `pressure_avg_hpa`
- `pressure_max_hpa`

Observação: a transformação para hPa deve ser consistente com a visualização dos gráficos.

Regras de formato e ordenacao (obrigatorias):

- delimitador: virgula (`,`);
- timezone: UTC no campo `timestamp` em RFC3339;
- ordenacao: crescente por `timestamp`;
- precisao decimal:
  - temperatura e umidade: 2 casas;
  - pressao em hPa: 2 casas.

## 9) Tratamento de erro e resiliência

- Validação no cliente antes de chamar API:
  - campos obrigatórios;
  - `from <= to`;
  - formato de data válido.
- Validação no servidor para os mesmos critérios.
- Mensagens de erro em pt-BR, curtas e acionáveis.
- Falha em uma API não deve inutilizar tela inteira.
- Evitar perda de contexto visual (não limpar gráficos válidos por falha momentânea).

## 10) Responsividade e acessibilidade

- Breakpoints para desktop/tablet/mobile com prioridade para leitura de dados.
- Filtros e botões empilham em telas pequenas, mantendo toque confortável.
- Legendas e títulos não podem sobrepor no mobile.
- Contraste mínimo AA em textos e controles.
- Estados de foco visíveis e navegação por teclado funcional.
- Inputs com `label` associada e textos de feedback acessíveis.

## 11) Plano de execução (macro)

1. Estruturar assets estáticos e serviço `/static` no backend.
2. Extrair base visual compartilhada (tokens + shell + componentes CSS).
3. Migrar `historical` para nova estrutura visual e JS modular.
4. Implementar endpoint CSV e integração no botão `Exportar CSV`.
5. Migrar `index` para a mesma linguagem visual e JS modular.
6. Atualizar `404` para consistência final.
7. Validar regressão funcional e responsividade.

## 12) Estratégia de testes

### 12.1 Frontend (manual guiado)

- Carregamento inicial de histórico com dados.
- Troca de agregação e intervalo.
- Cenário sem dados.
- Cenário de erro de API.
- Download CSV com filtros diferentes.
- Home com polling e atualização de status.
- Navegação entre páginas e estados ativos.
- Responsividade em mobile/tablet/desktop.

### 12.2 Backend (Go)

- Testes para parsing/validação de query params no CSV.
- Teste de sucesso do CSV com conteúdo esperado.
- Testes de erros (`400`, `503`, `500`).
- Garantia de não regressão em `/data`.

### 12.3 Comandos de validação

- `go test ./...`
- `make test`
- `make fmt`
- `golangci-lint run` (quando disponível)

## 13) Riscos e mitigação

- Risco: regressão por extração de JS inline.
  - Mitigação: migrar por página, com checkpoints funcionais.
- Risco: inconsistência entre série gráfica e CSV.
  - Mitigação: compartilhar transformação de dados e validar por testes.
- Risco: divergência visual no mobile.
  - Mitigação: checklist responsivo obrigatório antes de concluir.

## 14) Critérios de pronto

- As tres paginas (`index`, `historical`, `404`) seguem mesma identidade visual e alta aderencia ao mockup.
- Histórico possui filtros funcionais, gráficos estáveis e exportação CSV funcionando.
- Status operacional e atualização de dados continuam corretos.
- Não há regressão nas rotas existentes.
- Código de template fica modularizado e significativamente mais simples de manter.

Checklist objetivo de aderencia ao mockup:

- header em duas faixas presente nas telas principais;
- painel de filtros no historico com 2 botoes (`Carregar Dados` e `Exportar CSV`);
- tres cards de grafico com legenda `MAX/AVG/MIN`;
- cards com raio, borda e sombra no mesmo padrao visual;
- comportamento responsivo validado em larguras de 1280px, 768px e 390px;
- estados visuais de loading, erro e vazio implementados e testados.
