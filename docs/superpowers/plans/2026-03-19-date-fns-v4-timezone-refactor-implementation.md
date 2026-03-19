# Plano de Refatoracao - date-fns v4 com timezone

Data: 2026-03-19
Escopo: frontend historico (filtros + serializacao de consulta/exportacao)

## Objetivo
Migrar operacoes de data/timezone de implementacoes proprias para `date-fns@4` com suporte de timezone (`@date-fns/tz`), sem alterar comportamento funcional.

## Plano
1. Inventariar pontos de logica propria de datas
   - Localizados em `frontend/src/features/historical/dateTimeLocal.ts` e `frontend/src/pages/HistoricalPage.tsx`.
2. Adicionar dependencias oficiais
   - `date-fns@^4.1.0`
   - `@date-fns/tz@^1.4.1`
3. Substituir utilitarios proprios por chamadas diretas de lib
   - Inicializacao de range: `subHours` + `format`.
   - Parse/validacao estrita: `parse` + `isValid` + round-trip via `format`.
   - Formatacao para locale do browser: `intlFormat`.
4. Substituir serializacao local->UTC para queries/export
   - Parse com `date-fns` no padrao `yyyy-MM-dd'T'HH:mm`.
   - Aplicar timezone do browser com `TZDate.tz(...)`.
   - Serializar em UTC com sufixo `Z` via `new Date(tzDate.getTime()).toISOString()`.
5. Remover wrappers simples e codigo obsoleto
   - Removidos `fromDateToLocalDateTime`, `fromLocalDateTimeToDate`, `formatDateTimeForBrowserLocale` e seus testes dedicados.
6. Validar regressao
   - Rodar `npm test -- --runInBand` no frontend.

## Resultado esperado
- Menos codigo manual de data/timezone.
- Menor superficie de bugs de offset e parsing.
- Mesmo comportamento externo (incluindo ISO UTC com `Z` em filtros/exportacao).

## Status
Concluido.
