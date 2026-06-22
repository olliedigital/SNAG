"use server";

import { revalidatePath } from "next/cache";
import { getStore } from "./store";
import type { Category } from "./types";

export async function addWatchItem(formData: FormData): Promise<void> {
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return;

  const categoryRaw = String(formData.get("category") ?? "games");
  const category: Category = categoryRaw === "sneakers" ? "sneakers" : "games";

  const maxPriceRaw = String(formData.get("maxPrice") ?? "").trim();
  const maxPriceNum = maxPriceRaw ? Number(maxPriceRaw) : undefined;
  const maxPrice = typeof maxPriceNum === "number" && Number.isFinite(maxPriceNum) ? maxPriceNum : undefined;

  const store = getStore();
  await store.addItem({ title, category, query: title, maxPrice });
  await store.runCheck(); // surface any deals for the new item immediately
  revalidatePath("/");
}

export async function checkNow(): Promise<void> {
  await getStore().runCheck();
  revalidatePath("/");
}

export async function removeItem(formData: FormData): Promise<void> {
  await getStore().removeItem(String(formData.get("id") ?? ""));
  revalidatePath("/");
}
