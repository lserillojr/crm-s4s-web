# Agenda: forms como modal central + datepicker estilo Google

Data: 2026-06-11 · Repo: crm-s4s-web · Itens #1 e #6 do feedback de revisão da agenda.

## Problema

Na `/agenda`, as três superfícies de ação — criar agendamento (`AppointmentForm`),
bloquear horário (`BlockForm`) e detalhe/reagendar (`AppointmentPanel`) — são
renderizadas **inline**, empilhadas acima da grade. Isso empurra a grade para
baixo e não tem o foco de um popup. O reagendar e os campos de data usam
`<input type="datetime-local">` nativo, que tem UX ruim e inconsistente entre
navegadores (#6).

Meta: popup central estilo "agenda do Google" (#1) + seletor de data/hora com
data + dropdown de horários (#6).

## Decisões (do dono)

- Dropdown de horários: **00:00–23:30, de 30 em 30min** (48 opções, dia inteiro).
- Bloqueio: **2 pickers data+hora completos** (início e fim independentes →
  permite bloqueio multi-dia, ex.: férias).
- Duração do agendamento: **dropdown de presets (30/45/60/90) + "Outro"**
  que revela o campo numérico.

## Componentes

### A. `src/components/ui/modal.tsx` (shell reutilizável)
Extrai o overlay já existente no `ContactPopover`:
- `fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4`
- fecha no **Escape**, no **clique fora** e no **✕**
- interno com `role="dialog" aria-modal="true"`, `aria-label`, largura via prop.

Props: `{ onClose: () => void; ariaLabel: string; widthClass?: string; children }`.
`ContactPopover` passa a consumir o `Modal` (conteúdo idêntico).

### B. `src/components/agenda/datetime-picker.tsx`
Substitui cada `<Input type="datetime-local">`. Controlado, **mesmo contrato de
string** `"YYYY-MM-DDTHH:mm"` na entrada e saída → `localInputToIso` /
`toLocalInput` (lib/agenda/datetime.ts) e o backend ficam **intactos**.

- Internamente: `<input type="date">` (YYYY-MM-DD) + `<select>` de horários
  (`HH:mm`, 00:00…23:30 a cada 30min).
- Se o valor pré-preenchido cair **fora** da grade de 30min (ex.: reagendar um
  agendamento da IA às 09:15), a hora atual é inserida como opção extra no topo
  para não se perder.
- Emite `onChange(value)` combinando date + time; se uma das partes estiver
  vazia, emite string vazia (mantém validação a montante).

Props: `{ id?: string; value: string; onChange: (v: string) => void; disabled?: boolean }`.

### C. Duração (dentro do `AppointmentForm`)
`<select>` com 30/45/60/90 + "Outro". "Outro" revela o `<Input type="number">`
atual. Estado segue `durationMin: number`; `CreateAppointmentInput` inalterado.

## Wiring (`AgendaClient`)
As três superfícies já são renderizadas condicionalmente (`draftStart`,
`showBlockForm`, `selected`). Cada componente passa a ter `<Modal>` como raiz no
lugar do `<form>`/`<aside>` com borda inline. O `onClose` do modal mapeia para o
`onCancel`/`onClose` que o `AgendaClient` já fornece. O empilhamento inline some;
vira popup central. `AgendaClient` muda quase nada (já passa os callbacks).

## Erros / estados
- Mensagens de validação/erro/conflito atuais permanecem **dentro** do modal.
- Pending desabilita campos e botões como hoje.
- Click-fora / Escape = cancelar (mesma semântica do botão Cancelar).

## Testes (TDD)
Novos:
- `Modal`: fecha no Escape, no clique no overlay, no ✕; não fecha em clique
  interno; tem `role="dialog"`.
- `DateTimePicker`: combina date+time no formato esperado; preserva valor
  off-grid; lista granularidade de 30min; emite vazio quando incompleto.
- Duração: alterna preset ↔ "Outro" e envia `durationMin` correto.

Mantidos verdes (ajustes pontuais de query se necessário):
- `appointment-form.test.tsx`, `appointment-panel.test.tsx`,
  `agenda-client.test.tsx`, `block` (via form), `contact-popover`.

## Fora de escopo (YAGNI)
Biblioteca de calendário externa, time-zone picker, recorrência. **Zero deps novas.**
Não mexer no backend/contrato nem nos helpers de fuso.
