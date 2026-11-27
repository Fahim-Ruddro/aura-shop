export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function formatBDT(amount: number | string | null | undefined): string {
  const numeric = typeof amount === "string" ? Number(amount) : (amount ?? 0);
  if (Number.isNaN(numeric)) return "৳0";
  return `৳${numeric.toLocaleString("en-BD", {
    minimumFractionDigits: numeric % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}