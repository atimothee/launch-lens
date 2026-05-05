import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * PATCH /api/projects/:id/evidence/:evidenceId
 * Update evidence (validation status, notes, fact/opinion classification)
 */
export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string; evidenceId: string }> }
) {
    const { id: projectId, evidenceId } = await params;
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
        return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    // Verify project ownership via evidence -> insight -> project chain
    const { data: evidence } = await supabase
        .from("evidence")
        .select("insight_id, insights!inner(project_id)")
        .eq("id", evidenceId)
        .maybeSingle();

    if (!evidence || (evidence.insights as any)?.project_id !== projectId) {
        return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    // Verify user owns the project
    const { data: project } = await supabase
        .from("projects")
        .select("id")
        .eq("id", projectId)
        .eq("user_id", user.id)
        .maybeSingle();

    if (!project) {
        return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const body = await req.json();

    // Build update object with only allowed fields
    const updates: Record<string, any> = {};

    if (body.validation_status !== undefined) {
        updates.validation_status = body.validation_status;
    }
    if (body.is_fact !== undefined) {
        updates.is_fact = body.is_fact;
    }
    if (body.researcher_notes !== undefined) {
        updates.researcher_notes = body.researcher_notes;
    }
    if (body.text !== undefined) {
        updates.text = body.text;
    }
    if (body.evidence_type !== undefined) {
        updates.evidence_type = body.evidence_type;
    }
    if (body.media_url !== undefined) {
        updates.media_url = body.media_url;
    }
    if (body.media_type !== undefined) {
        updates.media_type = body.media_type;
    }

    if (Object.keys(updates).length === 0) {
        return NextResponse.json(
            { error: "no valid fields to update" },
            { status: 400 }
        );
    }

    // Update evidence
    const { data: updated, error } = await supabase
        .from("evidence")
        .update(updates)
        .eq("id", evidenceId)
        .select()
        .single();

    if (error) {
        console.error("Failed to update evidence:", error);
        return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(updated);
}

/**
 * DELETE /api/projects/:id/evidence/:evidenceId
 * Delete evidence (and all child evidence via CASCADE)
 */
export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string; evidenceId: string }> }
) {
    const { id: projectId, evidenceId } = await params;
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
        return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    // Verify project ownership
    const { data: evidence } = await supabase
        .from("evidence")
        .select("insight_id, insights!inner(project_id)")
        .eq("id", evidenceId)
        .maybeSingle();

    if (!evidence || (evidence.insights as any)?.project_id !== projectId) {
        return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const { data: project } = await supabase
        .from("projects")
        .select("id")
        .eq("id", projectId)
        .eq("user_id", user.id)
        .maybeSingle();

    if (!project) {
        return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    // Delete evidence (CASCADE will delete children)
    const { error } = await supabase
        .from("evidence")
        .delete()
        .eq("id", evidenceId);

    if (error) {
        console.error("Failed to delete evidence:", error);
        return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
}

// Made with Bob
