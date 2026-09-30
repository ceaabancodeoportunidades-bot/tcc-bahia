import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// Returns a short-lived signed URL for the PDF of an APPROVED TCC only.
export const getApprovedTccPdfUrl = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("tccs")
      .select("pdf_path,status")
      .eq("id", data.id)
      .eq("status", "approved")
      .maybeSingle();
    if (!row?.pdf_path) return { url: null as string | null };
    const { data: signed } = await supabaseAdmin.storage
      .from("tcc-pdfs")
      .createSignedUrl(row.pdf_path, 3600);
    return { url: signed?.signedUrl ?? null };
  });
