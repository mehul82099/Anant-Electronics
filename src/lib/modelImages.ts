"use client";

import { useState, useEffect } from "react";
import type { ProductRecord } from "./types";

export interface ModelImage {
  imageUrl: string;
  thumbnailUrl: string;
  title: string;
}

let cachedImagesMap: Record<string, ModelImage> | null = null;
let fetchPromise: Promise<Record<string, ModelImage>> | null = null;

export function getModelImage(
  product: ProductRecord | { brand: string; model: string; model_base?: string | null },
  imagesMap?: Record<string, ModelImage> | null
): ModelImage | null {
  const map = imagesMap || cachedImagesMap;
  if (!map) return null;

  const brand = (product.brand || "").toLowerCase().trim();
  const rawModelBase = (product.model_base || "").trim();
  const cleanedModelBase = rawModelBase
    .replace(/\s*\(\d+[\/\+]\d+\)/gi, "")
    .replace(/\s*\(\d+\)/gi, "")
    .replace(/\s*\b\d+GB\b/gi, "")
    .replace(/\s*\b\d+TB\b/gi, "")
    .trim()
    .toLowerCase();

  const k1 = `${product.brand}|||${(product.model_base || "").replace(/\s*\(\d+[\/\+]\d+\)/gi, "").replace(/\s*\(\d+\)/gi, "").replace(/\s*\b\d+GB\b/gi, "").replace(/\s*\b\d+TB\b/gi, "").trim()}`.toLowerCase();
  const k2 = `${product.brand}|||${product.model_base || ""}`.toLowerCase();
  const k3 = `${product.model || ""}`.toLowerCase();
  const k4 = `${product.model_base || ""}`.toLowerCase();

  return map[k1] || map[k2] || map[k3] || map[k4] || null;
}

export function useModelImages(): Record<string, ModelImage> {
  const [imagesMap, setImagesMap] = useState<Record<string, ModelImage>>(cachedImagesMap || {});

  useEffect(() => {
    if (cachedImagesMap) {
      setImagesMap(cachedImagesMap);
      return;
    }

    if (!fetchPromise) {
      fetchPromise = fetch("/data/model_images.json")
        .then((res) => res.json())
        .then((data: Record<string, ModelImage>) => {
          cachedImagesMap = data;
          return data;
        })
        .catch((err) => {
          console.error("Error loading model images:", err);
          return {};
        });
    }

    fetchPromise.then((data) => {
      setImagesMap(data);
    });
  }, []);

  return imagesMap;
}
