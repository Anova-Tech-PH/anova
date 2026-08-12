export type EmbedParams = {
  accent: string;
  theme: "light" | "dark" | "auto";
  [key: string]: string;
};

export function parseEmbedParams(
  searchParams: Record<string, string | string[] | undefined>
): EmbedParams {
  const accent = (typeof searchParams.accent === "string" ? searchParams.accent : "3b82f6")
    .replace(/[^a-fA-F0-9]/g, "")
    .slice(0, 6);
  const rawTheme = typeof searchParams.theme === "string" ? searchParams.theme : "light";
  const theme = (["light", "dark", "auto"].includes(rawTheme) ? rawTheme : "light") as EmbedParams["theme"];

  const result: EmbedParams = { accent, theme };
  for (const [key, value] of Object.entries(searchParams)) {
    if (key !== "accent" && key !== "theme" && typeof value === "string") {
      result[key] = value;
    }
  }
  return result;
}

export function isToggleOn(params: EmbedParams, key: string, defaultOn = true): boolean {
  if (!(key in params)) return defaultOn;
  return params[key] === "1" || params[key] === "true";
}
