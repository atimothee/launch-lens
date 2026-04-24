"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function createProject(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/dashboard/new");

  const title = String(formData.get("title") ?? "").trim();
  const research_question = String(formData.get("research_question") ?? "").trim();
  const target_audience = String(formData.get("target_audience") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;

  if (!title || !research_question || !target_audience) {
    redirect("/dashboard/new?error=missing_fields");
  }

  const { data, error } = await supabase
    .from("projects")
    .insert({
      user_id: user.id,
      title,
      research_question,
      target_audience,
      description,
      status: "draft",
    })
    .select("id")
    .single();

  if (error || !data) {
    redirect(`/dashboard/new?error=${encodeURIComponent(error?.message ?? "failed")}`);
  }

  // Land on the project page in "start research" state — the page kicks off the run.
  redirect(`/projects/${data.id}?run=1`);
}
