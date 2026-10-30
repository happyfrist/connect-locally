const dayFormatter = new Intl.DateTimeFormat("en-IN", {
  weekday: "short",
  day: "numeric",
  month: "short",
});

const timeFormatter = new Intl.DateTimeFormat("en-IN", {
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

const longDayFormatter = new Intl.DateTimeFormat("en-IN", {
  weekday: "long",
  day: "numeric",
  month: "long",
});

export function formatDay(timestamp: number) {
  return dayFormatter.format(new Date(timestamp));
}

export function formatTime(timestamp: number) {
  return timeFormatter.format(new Date(timestamp)).toLowerCase();
}

export function formatLongDay(timestamp: number) {
  return longDayFormatter.format(new Date(timestamp));
}

export function formatWhen(timestamp: number) {
  return `${formatDay(timestamp)} · ${formatTime(timestamp)}`;
}

export function formatEnd(start: number, durationMins: number) {
  return formatTime(start + durationMins * 60_000);
}

export function formatDuration(mins: number) {
  if (mins < 60) return `${mins} min`;
  const hours = Math.floor(mins / 60);
  const rest = mins % 60;
  return rest === 0 ? `${hours} hr` : `${hours} hr ${rest} min`;
}

export function formatMoney(amount: number) {
  if (amount === 0) return "Free";
  return `₹${amount.toLocaleString("en-IN")}`;
}

export function formatCountdown(timestamp: number) {
  const diff = timestamp - Date.now();
  if (diff < 0) return "Already happened";
  const hours = diff / 3_600_000;
  if (hours < 1) return `In ${Math.max(5, Math.round(diff / 60_000 / 5) * 5)} min`;
  if (hours < 24) return `In ${Math.round(hours)} hr`;
  const days = Math.round(hours / 24);
  return days === 1 ? "Tomorrow" : `In ${days} days`;
}

export function initials(name: string) {
  const parts = name
    .replace(/\(demo\)/gi, "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function shortName(name: string) {
  return name.replace(/\s*\(demo\)\s*/gi, "").trim();
}

export function toDateTimeLocal(timestamp: number) {
  const d = new Date(timestamp);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function fromDateTimeLocal(value: string) {
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}

export function timeAgo(timestamp: number) {
  const diff = Date.now() - timestamp;
  const mins = Math.round(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
  return formatDay(timestamp);
}
