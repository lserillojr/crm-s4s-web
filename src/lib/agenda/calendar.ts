/**
 * Lógica pura do calendário da /agenda. Funções recebem `Date` (já parseadas) e
 * fazem só aritmética de tempo local — sem fuso implícito de string e sem React.
 * É o núcleo testável e portável (o app da fase 2 reusa estas funções).
 */

const MIN_CARD_PX = 18;

/** Segunda-feira 00:00 da semana que contém `d` (semana começa na segunda). */
export function startOfWeek(d: Date): Date {
  const r = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dow = r.getDay(); // 0=domingo … 6=sábado
  const diff = dow === 0 ? -6 : 1 - dow; // domingo recua 6; senão recua até segunda
  r.setDate(r.getDate() + diff);
  r.setHours(0, 0, 0, 0);
  return r;
}

/** Nova data = `d` + `n` dias (preserva hora/min). */
export function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

/** `count` dias consecutivos a partir de `weekStart` (default 6 = seg–sáb). */
export function weekDays(weekStart: Date, count = 6): Date[] {
  return Array.from({ length: count }, (_, i) => addDays(weekStart, i));
}

/** Índice (0-based) da coluna cujo dia local == `d`; -1 se fora. */
export function dayIndexOf(d: Date, days: Date[]): number {
  return days.findIndex(
    (col) =>
      col.getFullYear() === d.getFullYear() &&
      col.getMonth() === d.getMonth() &&
      col.getDate() === d.getDate(),
  );
}

/** Posição vertical de um card na coluna do dia (top/height em px). */
export function cardGeometry(
  start: Date,
  end: Date,
  gridStartHour: number,
  pxPerHour: number,
): { topPx: number; heightPx: number } {
  const minutesFromGridStart = (start.getHours() - gridStartHour) * 60 + start.getMinutes();
  const durationMin = Math.max(5, (end.getTime() - start.getTime()) / 60000);
  const topPx = (minutesFromGridStart / 60) * pxPerHour;
  const heightPx = Math.max(MIN_CARD_PX, (durationMin / 60) * pxPerHour);
  return { topPx, heightPx };
}
