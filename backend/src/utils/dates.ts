export function startOfDay(d: Date | string): Date {
  const date = new Date(d);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function endOfDay(d: Date | string): Date {
  const date = new Date(d);
  date.setHours(23, 59, 59, 999);
  return date;
}

export function addDays(d: Date | string, days: number): Date {
  const date = new Date(d);
  date.setDate(date.getDate() + days);
  return date;
}

export function startOfMonth(d: Date | string): Date {
  const date = new Date(d);
  date.setDate(1);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function endOfMonth(d: Date | string): Date {
  const date = new Date(d);
  date.setDate(1);
  date.setMonth(date.getMonth() + 1);
  date.setDate(0);
  date.setHours(23, 59, 59, 999);
  return date;
}

export function toDateOnly(d: Date | string): string {
  const date = new Date(d);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function toTimeOnly(d: Date | string | null): string | null {
  if (!d) return null;
  const date = new Date(d);
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
}

export function formatDateTime(d: Date | string | null): string | null {
  if (!d) return null;
  return new Date(d).toISOString();
}

export function countDaysInclusive(start: Date | string, end: Date | string): number {
  const startDate = startOfDay(start);
  const endDate = startOfDay(end);
  const diffMs = endDate.getTime() - startDate.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;
}

export function isSameDay(a: Date | string | null, b: Date | string | null): boolean {
  if (!a || !b) return false;
  return toDateOnly(a) === toDateOnly(b);
}

export function monthName(year: number, monthIndex: number): string {
  return new Date(year, monthIndex - 1, 1).toLocaleString('en-US', { month: 'short' });
}

export function workingHoursBetween(checkIn: Date, checkOut: Date): number {
  const ms = checkOut.getTime() - checkIn.getTime();
  const hours = ms / (1000 * 60 * 60);
  return Math.round(hours * 100) / 100;
}

export function isWeekend(d: Date | string): boolean {
  const day = new Date(d).getDay();
  return day === 0 || day === 6;
}

export function currentYear(): number {
  return new Date().getFullYear();
}

export function currentMonth(): number {
  return new Date().getMonth() + 1;
}
