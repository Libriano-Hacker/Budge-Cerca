/** Bounds apply to imported backups and local data, not just form controls. */
export const DATA_LIMITS = {
  backupBytes: 2_000_000,
  serializedChars: 2_000_000,
  favorites: 2000,
  businessId: 100,
  categoryName: 50,
  neighborhoodName: 60,
  businesses: 2000,
  neighborhoods: 200,
  categories: 200,
  schedules: 28,
  photoUrl: 2048,
} as const;

export function wellFormedUnicode(value: string) {
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = value.charCodeAt(++i);
      if (!(next >= 0xdc00 && next <= 0xdfff)) return false;
    } else if (code >= 0xdc00 && code <= 0xdfff) return false;
  }
  return true;
}

export function boundedText(
  value: unknown,
  min: number,
  max: number,
  multiline = false,
): value is string {
  return (
    typeof value === "string" &&
    value.length <= max &&
    value.trim().length >= min &&
    wellFormedUnicode(value) &&
    !(
      multiline
        ? /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/
        : /[\u0000-\u001f\u007f]/
    ).test(value)
  );
}

/** Reject extra keys, inherited fields and accessor properties before any values are read. */
export function recordWithKeys(
  value: unknown,
  required: readonly string[],
  optional: readonly string[] = [],
): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value))
    return false;
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) return false;
  const allowed = new Set([...required, ...optional]);
  const keys = Reflect.ownKeys(value);
  return (
    keys.length <= allowed.size &&
    keys.every(
      (key) =>
        typeof key === "string" &&
        allowed.has(key) &&
        "value" in Object.getOwnPropertyDescriptor(value, key)!,
    ) &&
    required.every((key) => Object.hasOwn(value, key))
  );
}

export function boundedArray(
  value: unknown,
  max: number,
  min = 0,
): value is unknown[] {
  return (
    Array.isArray(value) &&
    value.length >= min &&
    value.length <= max &&
    Object.getPrototypeOf(value) === Array.prototype &&
    Object.keys(value).length === value.length
  );
}

/** Photos load in the client: accept public DNS names, never local/IP targets or credentials. */
export function publicHttpsUrl(value: unknown): value is string {
  if (!boundedText(value, 1, DATA_LIMITS.photoUrl) || /\s/.test(value))
    return false;
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase().replace(/\.$/, "");
    const labels = host.split(".");
    return (
      url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      !url.port &&
      host.length <= 253 &&
      labels.length >= 2 &&
      labels.every((label) =>
        /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label),
      ) &&
      /[a-z]/.test(labels[labels.length - 1]) &&
      !/(?:^|\.)(?:localhost|local|localdomain|internal|intranet|lan|home|home\.arpa|test|invalid|onion)$/.test(
        host,
      )
    );
  } catch {
    return false;
  }
}
