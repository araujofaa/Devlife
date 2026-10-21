/**
 * Timezone fixo do app: BRT (UTC-3).
 * NÃO depende do timezone do navegador — usa apenas aritmética UTC.
 */

/** Offset de BRT em horas em relação a UTC. */
const BRT_OFFSET_HOURS = -3;

/**
 * Parseia uma data vinda da API.
 * Se a string não tem timezone explícito, assume UTC.
 */
export function parseApiDate(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null;
  if (/[Zz]$/.test(dateStr) || /[+-]\d{2}:?\d{2}$/.test(dateStr)) {
    return new Date(dateStr);
  }
  return new Date(dateStr + 'Z');
}

/**
 * 🆕 Extrai componentes (ano, mês, dia, hora, minuto) em BRT
 * por aritmética direta — funciona em QUALQUER timezone de navegador.
 */
export function getBrtComponents(dateStr: string | null | undefined): {
  year: number;
  month: number; // 0-based
  day: number;
  hour: number;
  minute: number;
} {
  const d = parseApiDate(dateStr);
  if (!d) return { year: 1970, month: 0, day: 1, hour: 0, minute: 0 };

  // Valores em UTC
  const utcYear = d.getUTCFullYear();
  const utcMonth = d.getUTCMonth();
  const utcDay = d.getUTCDate();
  const utcHour = d.getUTCHours();
  const minute = d.getUTCMinutes();

  // Aplica BRT (UTC-3)
  let hour = utcHour + BRT_OFFSET_HOURS;
  let day = utcDay;
  let month = utcMonth;
  let year = utcYear;

  if (hour < 0) {
    hour += 24;
    // Recua um dia
    const prev = new Date(Date.UTC(year, month, day));
    prev.setUTCDate(prev.getUTCDate() - 1);
    day = prev.getUTCDate();
    month = prev.getUTCMonth();
    year = prev.getUTCFullYear();
  }

  return { year, month, day, hour, minute };
}

/**
 * Retorna hora e minuto em BRT — para posicionar blocos no calendário.
 */
export function getApiHourMinute(dateStr: string | null | undefined): {
  hour: number;
  minute: number;
} {
  const c = getBrtComponents(dateStr);
  return { hour: c.hour, minute: c.minute };
}

/**
 * Retorna o dia no formato YYYY-MM-DD em BRT.
 */
export function getApiDayKey(dateStr: string | null | undefined): string {
  const c = getBrtComponents(dateStr);
  const y = c.year;
  const m = String(c.month + 1).padStart(2, '0');
  const d = String(c.day).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Formata DD/MM/AAAA HH:MM em BRT.
 */
export function formatApiDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '-';
  const c = getBrtComponents(dateStr);
  const dd = String(c.day).padStart(2, '0');
  const mm = String(c.month + 1).padStart(2, '0');
  const hh = String(c.hour).padStart(2, '0');
  const mi = String(c.minute).padStart(2, '0');
  return `${dd}/${mm}/${c.year} ${hh}:${mi}`;
}

/**
 * Formata apenas HH:MM em BRT.
 */
export function formatApiTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '-';
  const c = getBrtComponents(dateStr);
  const hh = String(c.hour).padStart(2, '0');
  const mi = String(c.minute).padStart(2, '0');
  return `${hh}:${mi}`;
}

/**
 * Formata apenas DD/MM/AAAA em BRT.
 */
export function formatApiDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '-';
  const c = getBrtComponents(dateStr);
  const dd = String(c.day).padStart(2, '0');
  const mm = String(c.month + 1).padStart(2, '0');
  return `${dd}/${mm}/${c.year}`;
}

/**
 * Converte uma data da API para o formato aceito por `datetime-local`,
 * já em BRT.
 */
export function apiDateToLocalInput(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  const c = getBrtComponents(dateStr);
  const y = c.year;
  const m = String(c.month + 1).padStart(2, '0');
  const d = String(c.day).padStart(2, '0');
  const hh = String(c.hour).padStart(2, '0');
  const mi = String(c.minute).padStart(2, '0');
  return `${y}-${m}-${d}T${hh}:${mi}`;
}

/**
 * Converte um valor do input `datetime-local` (interpretado como BRT)
 * para uma string ISO (UTC) pronta para o backend.
 */
export function localInputToApiDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const [datePart, timePart] = value.split('T');
  if (!datePart || !timePart) return null;
  const [y, m, d] = datePart.split('-').map(Number);
  const [hh, mi] = timePart.split(':').map(Number);

  // Data como UTC, aplica +3h (BRT → UTC)
  const utc = new Date(Date.UTC(y, m - 1, d, hh, mi, 0, 0));
  const finalUtc = new Date(utc.getTime() - BRT_OFFSET_HOURS * 60 * 60 * 1000);
  return finalUtc.toISOString();
}