const canonicalize = (value: unknown): string => {
  if (value === null) {
    return "null";
  }

  if (typeof value === "string" || typeof value === "boolean") {
    return JSON.stringify(value);
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new Error("Cannot canonicalize non-finite numbers");
    }
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    const serialized = value.map((entry) => canonicalize(entry ?? null)).join(",");
    return `[${serialized}]`;
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    const keys = Object.keys(record)
      .filter((key) => record[key] !== undefined)
      .sort();

    const serialized = keys
      .map((key) => `${JSON.stringify(key)}:${canonicalize(record[key])}`)
      .join(",");

    return `{${serialized}}`;
  }

  throw new Error(`Unsupported value in canonical JSON: ${typeof value}`);
};

export const canonicalJsonStringify = (value: unknown): string => canonicalize(value);
