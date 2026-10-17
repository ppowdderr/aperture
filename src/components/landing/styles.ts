const prefix = "lp-";

/**
 * The repo routes every CSS file through Tailwind's Turbopack loader, which removes
 * CSS-module name mapping. The landing stylesheet therefore uses explicit lp- classes.
 */
export const styles = new Proxy({} as Record<string, string>, {
  get(_target, key) {
    return typeof key === "string" ? `${prefix}${key}` : "";
  },
});
