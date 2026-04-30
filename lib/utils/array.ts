export function asArray<T>(value: T[] | null | undefined) {
  return Array.isArray(value) ? value : [];
}
