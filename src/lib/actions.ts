"use server";

import { revalidatePath } from "next/cache";
import { getStore } from "./store";

export async function addWatchItem(formData: FormData): Promise<void> {
  const model = String(formData.get("title") ?? "").trim();
  if (!model) return;

  // Structured spec from the form. Empty select values ("any") drop out.
  const colorway = String(formData.get("colorway") ?? "").trim();
  const size = String(formData.get("size") ?? "").trim();
  const gender = String(formData.get("gender") ?? "").trim();

  const maxPriceRaw = String(formData.get("maxPrice") ?? "").trim();
  const maxPriceNum = maxPriceRaw ? Number(maxPriceRaw) : undefined;
  const maxPrice = typeof maxPriceNum === "number" && Number.isFinite(maxPriceNum) ? maxPriceNum : undefined;

  // Query drives strict matching: every descriptive word must appear, plus the
  // gender/size cues the matcher understands ("men"/"women", "size 10").
  const query = [model, colorway, gender, size ? `size ${size}` : ""].filter(Boolean).join(" ");

  const store = getStore();
  await store.addItem({
    title: model, // clean label for headlines + watch rows
    category: "sneakers",
    query,
    maxPrice,
    attributes: {
      colorway: colorway || undefined,
      size: size || undefined,
      gender: gender || undefined,
    },
  });
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

export async function setStrike(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const raw = String(formData.get("strike") ?? "").trim();
  const n = raw ? Number(raw) : NaN;
  await getStore().setMaxPrice(id, Number.isFinite(n) && n > 0 ? n : null);
  revalidatePath("/");
}
