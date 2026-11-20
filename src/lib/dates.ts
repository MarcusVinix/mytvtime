export function formatEpisodeCode(season: number, episode: number): string {
  const s = String(season).padStart(2, "0");
  const e = String(episode).padStart(2, "0");
  return `T${s}E${e}`;
}

export function formatDateBR(dateStr: string | null | undefined): string {
  if (!dateStr) return "Data indefinida";
  const [year, month, day] = dateStr.split("-").map(Number);
  if (!year || !month || !day) return dateStr;
  const date = new Date(year, month - 1, day);
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function getDaysUntil(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  const [year, month, day] = dateStr.split("-").map(Number);
  if (!year || !month || !day) return null;
  const target = new Date(year, month - 1, day);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffMs = target.getTime() - today.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

export function formatCountdownLabel(dateStr: string | null | undefined): string {
  const days = getDaysUntil(dateStr);
  if (days === null) return "Sem data";
  if (days < 0) return `Lançado há ${Math.abs(days)}d`;
  if (days === 0) return "Hoje";
  if (days === 1) return "Amanhã";
  if (days <= 7) return `Em ${days} dias`;
  return formatDateBR(dateStr);
}

export function isReleased(dateStr: string | null | undefined): boolean {
  const days = getDaysUntil(dateStr);
  if (days === null) return false;
  return days <= 0;
}

export function formatWatchTime(totalMinutes: number): {
  months: number;
  days: number;
  hours: number;
  label: string;
} {
  const safeMinutes = Math.max(0, Math.round(totalMinutes));
  const totalHours = Math.floor(safeMinutes / 60);
  const months = Math.floor(totalHours / (24 * 30));
  const remainingAfterMonths = totalHours % (24 * 30);
  const days = Math.floor(remainingAfterMonths / 24);
  const hours = remainingAfterMonths % 24;

  const parts: string[] = [];
  if (months > 0) parts.push(`${months} ${months === 1 ? "mês" : "meses"}`);
  if (days > 0) parts.push(`${days} ${days === 1 ? "dia" : "dias"}`);
  parts.push(`${hours}h`);

  return { months, days, hours, label: parts.join(" · ") };
}
