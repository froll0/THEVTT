/** When the next session is, in words and in full. */
export function relativeDay(iso: string): string {
  const d = new Date(iso);
  const diff = d.getTime() - Date.now();
  if (diff < 0) return 'passata';
  const hours = Math.round(diff / 3600_000);
  if (hours < 1) return 'tra poco';
  if (hours < 24 && d.getDate() === new Date().getDate()) return `oggi, tra ${hours} ${hours === 1 ? 'ora' : 'ore'}`;
  const days = Math.round((new Date(d.toDateString()).getTime() - new Date(new Date().toDateString()).getTime()) / 86400_000);
  return days === 1 ? 'domani' : `tra ${days} giorni`;
}

export const formatSession = (iso: string) =>
  new Date(iso).toLocaleString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
