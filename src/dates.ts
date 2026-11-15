export function toIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");

  return `${y}-${m}-${d}`;
}

// Foydalanuvchi matnini "YYYY-MM-DD" ga o'giradi. Noto'g'ri bo'lsa: undefined.
export function parseDue(input: string): string | undefined {
  const text = input.trim().toLowerCase();

  if (text === "bugun" || text === "ertaga") {
    const date = new Date();

    if (text === "ertaga") date.setDate(date.getDate() + 1);

    return toIsoDate(date);
  }

  const match = text.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (!match) return undefined;

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);

  const date = new Date(year, month - 1, day);
  const isReal =
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day;

  return isReal ? toIsoDate(date) : undefined;
}

export function formatDue(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}`;
}

export function isOverdue(iso: string): boolean {
  return iso < toIsoDate(new Date());
}
