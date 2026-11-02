export function shiftRange(date: Date, start: string, end: string) {
  const [sh, sm] = start.split(":").map(Number); const [eh, em] = end.split(":").map(Number);
  const from = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), sh, sm));
  const to = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), eh, em));
  if (to <= from) to.setUTCDate(to.getUTCDate() + 1);
  return { from, to };
}
export function shiftsOverlap(a: { date: Date; start: string; end: string }, b: { date: Date; start: string; end: string }) {
  const left = shiftRange(a.date, a.start, a.end); const right = shiftRange(b.date, b.start, b.end);
  return left.from < right.to && right.from < left.to;
}
