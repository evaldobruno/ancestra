"use client";

// Photo uploads → Supabase Storage (public bucket "ancestra-media").
// Returns a public URL to store in the DB (avatar_url, memory media, …).

import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/queries";

const BUCKET = "ancestra-media";

export type UploadResult = { ok: boolean; url?: string; error?: string };

function safeName(name: string) {
  const dot = name.lastIndexOf(".");
  const ext = dot >= 0 ? name.slice(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, "") : "jpg";
  const rand =
    (globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)) +
    Date.now().toString(36);
  return `${rand}.${ext || "jpg"}`;
}

// Upload one image file. `folder` groups files (e.g. "avatars", "memories").
export async function uploadImage(file: File, folder = "uploads"): Promise<UploadResult> {
  if (!isSupabaseConfigured()) return { ok: false, error: "Supabase não configurado." };
  if (!file) return { ok: false, error: "Sem ficheiro." };
  if (!file.type.startsWith("image/"))
    return { ok: false, error: "Escolhe uma imagem (jpg, png, …)." };
  // 8 MB guard.
  if (file.size > 8 * 1024 * 1024)
    return { ok: false, error: "Imagem demasiado grande (máx. 8 MB)." };

  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return { ok: false, error: "Precisa de iniciar sessão." };

  const path = `${folder}/${auth.user.id}/${safeName(file.name)}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type,
  });
  if (error) return { ok: false, error: error.message };

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return { ok: true, url: data.publicUrl };
}

// Upload any document file (PDF, image, doc…). Returns URL + size.
export async function uploadDocument(file: File, folder = "documents"): Promise<UploadResult & { size?: number }> {
  if (!isSupabaseConfigured()) return { ok: false, error: "Supabase não configurado." };
  if (!file) return { ok: false, error: "Sem ficheiro." };
  if (file.size > 25 * 1024 * 1024) return { ok: false, error: "Ficheiro demasiado grande (máx. 25 MB)." };
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return { ok: false, error: "Precisa de iniciar sessão." };
  const path = `${folder}/${auth.user.id}/${safeName(file.name)}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type || "application/octet-stream",
  });
  if (error) return { ok: false, error: error.message };
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return { ok: true, url: data.publicUrl, size: file.size };
}

// Upload an image OR a video (for the memorial). Larger size allowed.
export async function uploadMedia(file: File, folder = "memorial"): Promise<UploadResult & { kind?: "image" | "video" }> {
  if (!isSupabaseConfigured()) return { ok: false, error: "Supabase não configurado." };
  if (!file) return { ok: false, error: "Sem ficheiro." };
  const isImage = file.type.startsWith("image/");
  const isVideo = file.type.startsWith("video/");
  if (!isImage && !isVideo) return { ok: false, error: "Escolhe uma imagem ou um vídeo." };
  if (file.size > 50 * 1024 * 1024) return { ok: false, error: "Ficheiro demasiado grande (máx. 50 MB)." };

  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return { ok: false, error: "Precisa de iniciar sessão." };

  const path = `${folder}/${auth.user.id}/${safeName(file.name)}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type,
  });
  if (error) return { ok: false, error: error.message };
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return { ok: true, url: data.publicUrl, kind: isVideo ? "video" : "image" };
}
