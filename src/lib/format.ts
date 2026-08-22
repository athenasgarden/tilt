export function formatMoney(n: number): string {
  return `$${n.toLocaleString("en-US")}`;
}

export function formatCount(n: number): string {
  return n.toLocaleString("en-US");
}

export function formatRank(n: number): string {
  return `#${String(n).padStart(2, "0")}`;
}

export function formatTimeAgo(iso: string, now = Date.now()): string {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "just now";
  const seconds = Math.max(0, Math.round((now - then) / 1000));
  if (seconds < 45) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 14) return `${days}d ago`;
  return `${Math.round(days / 7)}w ago`;
}

export function clicksPerHour(clicks: number, createdAt: string, now = Date.now()): number {
  const hours = Math.max((now - new Date(createdAt).getTime()) / 3_600_000, 0.15);
  return clicks / hours;
}
