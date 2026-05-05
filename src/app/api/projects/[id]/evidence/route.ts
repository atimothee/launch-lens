import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * POST /api/projects/:id/evidence
 * Create new evidence for an insight
 */
export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: projectId } = await params;
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
        return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    // Verify project ownership
    const { data: project } = await supabase
        .from("projects")
        .select("id")
        .eq("id", projectId)
        .eq("user_id", user.id)
        .maybeSingle();

    if (!project) {
        return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const body = await req.json();

    // Validate required fields
    if (!body.insight_id || !body.text) {
        return NextResponse.json(
            { error: "insight_id and text are required" },
            { status: 400 }
        );
    }

    // Verify insight belongs to this project
    const { data: insight } = await supabase
        .from("insights")
        .select("id")
        .eq("id", body.insight_id)
        .eq("project_id", projectId)
        .maybeSingle();

    if (!insight) {
        return NextResponse.json(
            { error: "insight not found in this project" },
            { status: 404 }
        );
    }

    // Create evidence
    const { data: evidence, error } = await supabase
        .from("evidence")
        .insert({
            insight_id: body.insight_id,
            parent_evidence_id: body.parent_evidence_id || null,
            text: body.text,
            source_id: body.source_id || null,
            source_url: body.source_url || null,
            evidence_type: body.evidence_type || "quote",
            validation_status: body.validation_status || "pending",
            is_fact: body.is_fact ?? null,
            researcher_notes: body.researcher_notes || null,
            media_url: body.media_url || null,
            media_type: body.media_type || null,
            demographic_match_score: body.demographic_match_score || 0,
        })
        .select()
        .single();

    if (error) {
        console.error("Failed to create evidence:", error);
        return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(evidence);
}

/**
 * GET /api/projects/:id/evidence?insight_id=xxx
 * Get all evidence for an insight (with hierarchy)
 */
export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: projectId } = await params;
    const { searchParams } = new URL(req.url);
    const insightId = searchParams.get("insight_id");

    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
        return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    // Verify project ownership
    const { data: project } = await supabase
        .from("projects")
        .select("id")
        .eq("id", projectId)
        .eq("user_id", user.id)
        .maybeSingle();

    if (!project) {
        return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    if (!insightId) {
        return NextResponse.json(
            { error: "insight_id query parameter required" },
            { status: 400 }
        );
    }

    // Get all evidence for the insight
    const { data: evidence, error } = await supabase
        .from("evidence")
        .select("*")
        .eq("insight_id", insightId)
        .order("created_at", { ascending: true });

    if (error) {
        console.error("Failed to fetch evidence:", error);
        return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(evidence || []);
}

// Made with Bob
