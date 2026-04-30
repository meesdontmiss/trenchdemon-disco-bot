export function shortList(values: string[], empty = "None", limit = 8): string {
  if (!values.length) {
    return empty;
  }
  return values.slice(0, limit).join(", ");
}

export function jsonStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

export function formatScore(value: number | null | undefined): string {
  return typeof value === "number" ? `${Math.round(value)}/100` : "Unknown";
}

export function formatPercent(value: number | null | undefined): string {
  return typeof value === "number" ? `${Math.round(value)}%` : "Unknown";
}

export function formatUsd(value: number | null | undefined): string {
  return typeof value === "number"
    ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value)
    : "Unknown";
}

export function truncate(value: string, max = 1024): string {
  if (value.length <= max) {
    return value;
  }
  return `${value.slice(0, max - 3)}...`;
}
