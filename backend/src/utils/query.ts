export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function ciRegex(value: string): RegExp {
  return new RegExp(escapeRegExp(value), 'i');
}