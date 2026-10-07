import { supabase } from "@/integrations/supabase/client";

export const MAX_PDF_BYTES = 25 * 1024 * 1024; // 25 MB

export async function isValidPdf(file: File): Promise<boolean> {
  if (file.type && file.type !== "application/pdf") return false;
  if (!/\.pdf$/i.test(file.name)) return false;
  const head = new Uint8Array(await file.slice(0, 5).arrayBuffer());
  return head[0] === 0x25 && head[1] === 0x50 && head[2] === 0x44 && head[3] === 0x46 && head[4] === 0x2d;
}

/**
 * Uploads a validated PDF to the tcc-pdfs bucket under the owner's folder.
 * Returns the storage path, or null when validation fails (caller shows the toast).
 */
export async function uploadTccPdf(file: File, ownerId: string): Promise<string | null> {
  if (file.size > MAX_PDF_BYTES) return null;
  if (!(await isValidPdf(file))) return null;
  const path = `${ownerId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  const { error } = await supabase.storage
    .from("tcc-pdfs")
    .upload(path, file, { contentType: "application/pdf", upsert: false });
  if (error) throw error;
  return path;
}
