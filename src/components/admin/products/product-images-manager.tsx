"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  ImagePlus,
  Loader2,
  Star,
  Trash2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { uploadShopImageAction } from "@/actions/media";
import {
  addProductImageAction,
  deleteProductImageAction,
  reorderProductImageAction,
  setPrimaryProductImageAction,
} from "@/actions/product-images";
import type { ProductImage } from "@/types/database";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ProductImagesManagerProps {
  productId: string;
  productName: string;
  images: ProductImage[];
}

export function ProductImagesManager({
  productId,
  productName,
  images,
}: ProductImagesManagerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isUploading, setIsUploading] = useState(false);
  const [imageUrlInput, setImageUrlInput] = useState("");
  const [altTextInput, setAltTextInput] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    try {
      for (const file of Array.from(files)) {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("folder", "products");

        const uploadRes = await uploadShopImageAction(fd);
        if (uploadRes.error || !uploadRes.url) {
          toast.error(uploadRes.error ?? `Failed to upload ${file.name}`);
          continue;
        }

        const addRes = await addProductImageAction(productId, {
          image_url: uploadRes.url,
          alt_text: altTextInput.trim() || productName,
          is_primary: images.length === 0,
        });

        if (addRes.error) {
          toast.error(addRes.error);
        }
      }

      toast.success("Gallery updated.");
      setAltTextInput("");
      router.refresh();
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  function handleAddByUrl(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!imageUrlInput.trim()) return;

    startTransition(async () => {
      const result = await addProductImageAction(productId, {
        image_url: imageUrlInput.trim(),
        alt_text: altTextInput.trim() || productName,
        is_primary: images.length === 0,
      });

      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success("Image added to gallery.");
      setImageUrlInput("");
      setAltTextInput("");
      router.refresh();
    });
  }

  function handleSetPrimary(imageId: string) {
    startTransition(async () => {
      const result = await setPrimaryProductImageAction(imageId, productId);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Primary cover image updated.");
      router.refresh();
    });
  }

  function handleReorder(imageId: string, direction: "up" | "down") {
    startTransition(async () => {
      const result = await reorderProductImageAction(
        imageId,
        productId,
        direction
      );
      if (result.error) {
        toast.error(result.error);
        return;
      }
      router.refresh();
    });
  }

  function handleDelete(imageId: string) {
    startTransition(async () => {
      const result = await deleteProductImageAction(imageId, productId);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Image removed from gallery.");
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ImagePlus className="h-5 w-5 text-emerald-600" />
          Product Image Gallery ({images.length})
        </CardTitle>
        <CardDescription>
          Upload multiple JPG, PNG, or WebP photos (max 2 MB each), choose the primary
          cover image, and arrange display order.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Upload or Add by URL Controls */}
        <div className="grid gap-4 rounded-lg border bg-muted/30 p-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Upload Multiple Images from Device</Label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="hidden"
              onChange={handleFileSelect}
            />
            <Button
              type="button"
              variant="outline"
              className="w-full"
              disabled={isUploading || isPending}
              onClick={() => fileInputRef.current?.click()}
            >
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading Images...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Select Image Files (JPG, PNG, WebP)
                </>
              )}
            </Button>
          </div>

          <form onSubmit={handleAddByUrl} className="space-y-2">
            <Label htmlFor="gallery-url">Or Add Image by URL</Label>
            <div className="flex gap-2">
              <Input
                id="gallery-url"
                placeholder="https://..."
                value={imageUrlInput}
                onChange={(e) => setImageUrlInput(e.target.value)}
              />
              <Button
                type="submit"
                disabled={isPending || isUploading || !imageUrlInput.trim()}
                className="bg-emerald-600 text-white hover:bg-emerald-700"
              >
                Add
              </Button>
            </div>
          </form>
        </div>

        {/* Gallery Grid */}
        {images.length === 0 ? (
          <div className="rounded-lg border border-dashed py-8 text-center">
            <ImagePlus className="mx-auto h-7 w-7 text-muted-foreground" />
            <p className="mt-2 text-sm font-medium text-foreground">
              No gallery images uploaded yet
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              The first image you upload will automatically become the primary product
              cover photo.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {images.map((image, index) => (
              <div
                key={image.id}
                className="flex flex-col overflow-hidden rounded-lg border bg-card"
              >
                <div className="relative">
                  <img
                    src={image.image_url}
                    alt={image.alt_text || productName}
                    className="h-40 w-full object-cover"
                  />
                  {image.is_primary && (
                    <Badge className="absolute left-2 top-2 bg-emerald-600 text-white hover:bg-emerald-600">
                      <Star className="mr-1 h-3 w-3 fill-current" />
                      Primary
                    </Badge>
                  )}
                  <span className="absolute bottom-2 right-2 rounded bg-black/70 px-1.5 py-0.5 font-mono text-[10px] text-white">
                    #{index + 1}
                  </span>
                </div>

                <div className="mt-auto flex items-center justify-between gap-1 border-t p-2">
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={isPending || index === 0}
                      onClick={() => handleReorder(image.id, "up")}
                      aria-label="Move image earlier"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={isPending || index === images.length - 1}
                      onClick={() => handleReorder(image.id, "down")}
                      aria-label="Move image later"
                    >
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  <div className="flex items-center gap-1">
                    {!image.is_primary && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={isPending}
                        onClick={() => handleSetPrimary(image.id)}
                        title="Set as primary cover image"
                      >
                        <Star className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      disabled={isPending}
                      onClick={() => handleDelete(image.id)}
                      aria-label="Delete image"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}