"use server";

import { createClient } from "@/lib/supabase/server";
import { requireActionRole } from "@/lib/auth/guards";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2 MB

export interface UploadImageResult {
  url?: string;
  error?: string;
}

export async function uploadShopImageAction(
  formData: FormData
): Promise<UploadImageResult> {
  try {
    await requireActionRole(["manager", "admin"]);

    const file = formData.get("file");
    const folder = (formData.get("folder")?.toString() || "general").replace(
      /[^a-z0-9-_]/gi,
      ""
    );

    if (!(file instanceof File) || file.size === 0) {
      return { error: "Please select an image file to upload." };
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return { error: "Only JPG, PNG, or WebP images are allowed." };
    }

    if (file.size > MAX_FILE_SIZE) {
      return { error: "Image must be 2 MB or smaller." };
    }

    const ext =
      file.type === "image/png"
        ? "png"
        : file.type === "image/webp"
          ? "webp"
          : "jpg";
    const filePath = `${folder}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;

    const supabase = await createClient();
    const { error: uploadError } = await supabase.storage
      .from("shop-media")
      .upload(filePath, file, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      return { error: uploadError.message };
    }

    const { data: publicUrlData } = supabase.storage
      .from("shop-media")
      .getPublicUrl(filePath);

    return { url: publicUrlData.publicUrl };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to upload image.",
    };
  }
}