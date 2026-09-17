import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export async function listPublicTccIds(): Promise<string[]> {
  const supabase = createClient<Database>(
    process.env["SUPABASE_URL"]!,
    process.env["SUPABASE_PUBLISHABLE_KEY"]!,
    { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
  );
  const { data } = await supabase.from("tccs").select("id").eq("status", "approved");
  return (data ?? []).map((r) => r.id);
}

export const getPublicTcc = createServerFn({ method: "GET" })
  .inputValidator((data: { id: string }) => {
    if (!data || typeof data.id !== "string") throw new Error("invalid id");
    return { id: data.id };
  })
  .handler(async ({ data }) => {
    const supabase = createClient<Database>(
      process.env["SUPABASE_URL"]!,
      process.env["SUPABASE_PUBLISHABLE_KEY"]!,
      { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
    );
    const { data: row, error } = await supabase
      .from("tccs")
      .select("id,title,abstract,authors,advisor,year,area,keywords,recommended,pdf_path,created_at,user_id,status")
      .eq("id", data.id)
      .eq("status", "approved")
      .maybeSingle();
    if (error) return null;
    return row;
  });
