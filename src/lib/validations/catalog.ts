import { z } from "zod";

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const categorySchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Category name must be at least 2 characters.")
    .max(80, "Category name must be 80 characters or less."),
  slug: z
    .string()
    .trim()
    .min(2, "Slug must be at least 2 characters.")
    .max(100, "Slug must be 100 characters or less.")
    .regex(slugRegex, "Slug can only contain lowercase letters, numbers, and hyphens."),
  description: z
    .string()
    .trim()
    .max(500, "Description must be 500 characters or less."),
  image_url: z
    .string()
    .trim()
    .refine(
      (val) => val === "" || /^https?:\/\/.+/.test(val),
      "Image URL must start with http:// or https://"
    ),
  display_order: z
    .number({ message: "Display order must be a valid number." })
    .int("Display order must be a whole number.")
    .min(0, "Display order cannot be negative.")
    .max(9999, "Display order is too large."),
  is_active: z.boolean(),
});

export type CategoryFormValues = z.infer<typeof categorySchema>;

export const productSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Product name must be at least 2 characters.")
      .max(140, "Product name must be 140 characters or less."),
    slug: z
      .string()
      .trim()
      .min(2, "Slug must be at least 2 characters.")
      .max(160, "Slug must be 160 characters or less.")
      .regex(slugRegex, "Slug can only contain lowercase letters, numbers, and hyphens."),
    short_description: z
      .string()
      .trim()
      .min(5, "Short description must be at least 5 characters.")
      .max(260, "Short description must be 260 characters or less."),
    full_description: z
      .string()
      .trim()
      .max(5000, "Full description must be 5000 characters or less."),
    category_id: z.string().uuid("Please select a valid category."),
    brand: z
      .string()
      .trim()
      .min(1, "Brand is required.")
      .max(80, "Brand must be 80 characters or less."),
    country_of_origin: z
      .string()
      .trim()
      .min(2, "Country of origin is required.")
      .max(80, "Country of origin must be 80 characters or less."),
    price: z
      .number({ message: "Price must be a valid number." })
      .positive("Price must be greater than 0 BDT."),
    sale_price: z
      .number({ message: "Sale price must be a valid number." })
      .nonnegative("Sale price cannot be negative.")
      .nullable(),
    stock: z
      .number({ message: "Stock must be a valid number." })
      .int("Stock must be a whole number.")
      .min(0, "Stock cannot be negative."),
    image_url: z
      .string()
      .trim()
      .refine(
        (val) => val === "" || /^https?:\/\/.+/.test(val),
        "Image URL must start with http:// or https://"
      ),
    status: z.enum(["active", "draft", "archived"]),
    tags_input: z.string().trim().max(300, "Tags list is too long."),
  })
  .refine(
    (data) => data.sale_price === null || data.sale_price < data.price,
    {
      message: "Sale price must be lower than the regular price.",
      path: ["sale_price"],
    }
  );

export type ProductFormValues = z.infer<typeof productSchema>;

export function parseTagsInput(tagsInput: string): string[] {
  return Array.from(
    new Set(
      tagsInput
        .split(",")
        .map((tag) => tag.trim().toLowerCase())
        .filter(Boolean)
    )
  );
}