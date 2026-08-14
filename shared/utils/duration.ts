export function timeSince(date: string): string {
  const now = Date.now();
  const then = new Date(date).getTime();
  const diff = now - then;
  if (diff < 0) return "";
  const days = Math.floor(diff / 86400000);
  if (days < 30) return `${days}d`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo`;
  const years = Math.floor(months / 12);
  const rem = months % 12;
  return rem ? `${years}y ${rem}mo` : `${years}y`;
}
