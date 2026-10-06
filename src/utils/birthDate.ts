/** Birth dates are calendar dates, not instants: never shift them to local time. */
export function normalizeBirthDate(value: unknown): string {
  const text = value instanceof Date
    ? (Number.isNaN(value.getTime()) ? '' : value.toISOString())
    : typeof value === 'string' ? value.trim() : '';
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:$|T|\s)/.exec(text);
  if (!match) return '';
  const [, year, month, day] = match;
  const date = new Date(`${year}-${month}-${day}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === `${year}-${month}-${day}`
    ? `${year}-${month}-${day}` : '';
}
