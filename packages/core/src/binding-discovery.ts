export type BindingKind = "bind" | "bindAsset" | "bindColor";

export interface BindingField {
  kind: BindingKind;
  bindingPath: string;
  locationPath: string;
}

const isBindingObject = (value: unknown): value is Record<string, string> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const keys = Object.keys(value);
  if (keys.length !== 1) {
    return false;
  }

  const key = keys[0];
  if (!key) {
    return false;
  }

  return ["$bind", "$bindAsset", "$bindColor"].includes(key);
};

export const discoverBindingFields = (template: unknown): BindingField[] => {
  const seen = new Set<string>();
  const out: BindingField[] = [];

  const walk = (value: unknown, locationPath: string): void => {
    if (Array.isArray(value)) {
      value.forEach((entry, index) => walk(entry, `${locationPath}[${index}]`));
      return;
    }

    if (!value || typeof value !== "object") {
      return;
    }

    if (isBindingObject(value)) {
      const [key] = Object.keys(value);
      if (!key) {
        return;
      }
      const bindingPath = value[key];
      if (typeof bindingPath !== "string") {
        return;
      }

      const kind =
        key === "$bind"
          ? "bind"
          : key === "$bindAsset"
            ? "bindAsset"
            : "bindColor";

      const id = `${kind}:${bindingPath}`;
      if (!seen.has(id)) {
        seen.add(id);
        out.push({
          kind,
          bindingPath,
          locationPath
        });
      }
      return;
    }

    for (const [key, nested] of Object.entries(value)) {
      const childPath = locationPath === "root" ? key : `${locationPath}.${key}`;
      walk(nested, childPath);
    }
  };

  walk(template, "root");
  return out;
};
