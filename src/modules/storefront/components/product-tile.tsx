"use client";

import { useState } from "react";
import Image from "next/image";

import { cn } from "@/lib/utils";

import { tileGradient } from "../constants";

type ProductTileProps = {
  name: string;
  imageUrl: string | null;
  className?: string;
  /** Valor de `sizes` de next/image; obligatorio al usar `fill`. */
  sizes: string;
  fallbackClassName?: string;
  priority?: boolean;
};

/**
 * Imagen del producto con degradado + inicial como respaldo. El respaldo cubre
 * dos casos: `image_url` nulo y URL que existe pero no carga (host caído, 404),
 * que solo se detecta en el cliente vía `onError`.
 */
export function ProductTile({
  name,
  imageUrl,
  className,
  sizes,
  fallbackClassName,
  priority = false,
}: ProductTileProps) {
  const [failed, setFailed] = useState(false);

  const showImage = imageUrl !== null && !failed;

  return (
    <div
      className={cn(
        "relative overflow-hidden",
        showImage ? "bg-muted" : tileGradient(name),
        className,
      )}
    >
      {showImage ? (
        <Image
          src={imageUrl}
          alt={name}
          fill
          sizes={sizes}
          priority={priority}
          className="object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <span
          aria-hidden
          className={cn(
            "font-display absolute inset-0 flex items-center justify-center font-bold text-white/90",
            fallbackClassName,
          )}
        >
          {name.trim().charAt(0).toUpperCase()}
        </span>
      )}
    </div>
  );
}
