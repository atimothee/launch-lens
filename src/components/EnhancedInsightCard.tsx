"use client";

import { useState } from "react";
import { INSIGHT_META, type Insight, type Evidence, type EvidenceWithChildren } from "@/lib/types";

interface EnhancedInsightCardProps {
    insight: Insight;
    evidence: Evidence[];
    onUpdateEvidence: (id: string, updates: Partial<Evidence>) => Promise<void>;
    onAddEvidence: (data: Partial<Evidence>) => Promise<void>;
}

export function EnhancedInsightCard({
    insight,
    evidence,
    onUpdateEvidence,
    onAddEvidence,
}: EnhancedInsightCardProps) {
    const meta = INSIGHT_META[insight.type];
    const confidencePct = Math.round(insight.confidence * 100);
    const demographicPct = Math.round(insight.demographic_relevance_score * 100);

    // Build evidence tree
    const evidenceTree = buildEvidenceTree(evidence);

    // Count evidence by validation status
    const stats = {
        total: evidence.length,
        verified: evidence.filter(e => e.validation_status === "verified").length,
        pending: evidence.filter(e => e.validation_status === "pending").length,
        disputed: evidence.filter(e => e.validation_status === "disputed").length,
        excluded: evidence.filter(e => e.validation_status === "excluded").length,
    };

    return (
        <article className="panel p-5 fade-up">
            {/* Header */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                    <span className="dot" style={{ background: meta.color }} />
                    <span className="text-[11px] uppercase tracking-wider text-[color:var(--color-fg-muted)]">
                        {insight.type}
                    </span>

                    {/* Demographic relevance badge */}
                    {demographicPct >= 70 && (
                        <span
                            className="chip text-[10px] px-2 py-0.5"
                            style={{
                                background: "var(--color-success-bg)",
                                color: "var(--color-success)"
                            }}
                        >
                            Core customer: {demographicPct}%
                        </span>
                    )}

                    {insight.primary_demographic && (
                        <span className="text-[10px] text-[color:var(--color-fg-dim)]">
                            {insight.primary_demographic}
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-3 text-[11px] text-[color:var(--color-fg-dim)]">
                    <span title="Confidence">Confidence: {confidencePct}%</span>
                    <div className="h-1 w-14 rounded-full bg-[color:var(--color-border)] overflow-hidden">
                        <div
                            className="h-full"
                            style={{ width: `${confidencePct}%`, background: meta.color }}
                        />
                    </div>
                </div>
            </div>

            {/* Core belief */}
            <h3 className="mt-3 text-base font-medium tracking-tight">{insight.title}</h3>
            <p className="mt-2 text-sm text-[color:var(--color-fg-muted)] leading-relaxed">
                {insight.content}
            </p>

            {/* Tension */}
            {insight.tension && (
                <div className="mt-3 text-xs text-[color:var(--color-fg-dim)]">
                    <span className="uppercase tracking-wider mr-1.5">tension</span>
                    {insight.tension}
                </div>
            )}

            {/* Evidence section */}
            <div className="mt-5 space-y-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <h4 className="text-xs uppercase tracking-wide text-[color:var(--color-fg-muted)]">
                            Supporting Evidence
                        </h4>
                        <div className="flex items-center gap-2 text-[10px] text-[color:var(--color-fg-dim)]">
                            <span className="text-[color:var(--color-success)]">✓ {stats.verified}</span>
                            <span>⏳ {stats.pending}</span>
                            {stats.disputed > 0 && <span className="text-[color:var(--color-warning)]">⚠ {stats.disputed}</span>}
                            {stats.excluded > 0 && <span className="text-[color:var(--color-fg-dim)]">✕ {stats.excluded}</span>}
                        </div>
                    </div>
                    <button
                        className="btn-sm text-xs"
                        onClick={() => onAddEvidence({
                            insight_id: insight.id,
                            text: "",
                            evidence_type: "quote",
                            validation_status: "pending",
                        })}
                    >
                        + Add Evidence
                    </button>
                </div>

                {/* Evidence tree */}
                {evidenceTree.length > 0 ? (
                    <div className="space-y-2">
                        {evidenceTree.map((ev) => (
                            <EvidenceNode
                                key={ev.id}
                                evidence={ev}
                                insightColor={meta.color}
                                onUpdate={(updates) => onUpdateEvidence(ev.id, updates)}
                                onAddChild={(data) => onAddEvidence({ ...data, parent_evidence_id: ev.id })}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="text-sm text-[color:var(--color-fg-dim)] text-center py-4">
                        No evidence yet. Add supporting quotes, statistics, or observations.
                    </div>
                )}
            </div>
        </article>
    );
}

/**
 * Build hierarchical evidence tree from flat list
 */
function buildEvidenceTree(evidence: Evidence[]): EvidenceWithChildren[] {
    const map = new Map<string, EvidenceWithChildren>();
    const roots: EvidenceWithChildren[] = [];

    // First pass: create map
    for (const ev of evidence) {
        map.set(ev.id, { ...ev, children: [] });
    }

    // Second pass: build tree
    for (const ev of evidence) {
        const node = map.get(ev.id)!;
        if (ev.parent_evidence_id) {
            const parent = map.get(ev.parent_evidence_id);
            if (parent) {
                parent.children = parent.children || [];
                parent.children.push(node);
            } else {
                roots.push(node); // Orphaned node
            }
        } else {
            roots.push(node);
        }
    }

    return roots;
}

/**
 * Individual evidence node with researcher controls
 */
interface EvidenceNodeProps {
    evidence: EvidenceWithChildren;
    insightColor: string;
    onUpdate: (updates: Partial<Evidence>) => void;
    onAddChild: (data: Partial<Evidence>) => void;
    depth?: number;
}

function EvidenceNode({
    evidence,
    insightColor,
    onUpdate,
    onAddChild,
    depth = 0,
}: EvidenceNodeProps) {
    const [expanded, setExpanded] = useState(true);
    const [showNotes, setShowNotes] = useState(false);
    const [notes, setNotes] = useState(evidence.researcher_notes || "");

    const isExcluded = evidence.validation_status === "excluded";
    const isVerified = evidence.validation_status === "verified";
    const isDisputed = evidence.validation_status === "disputed";

    const demographicPct = Math.round(evidence.demographic_match_score * 100);

    // Border color based on validation status
    const borderColor = isVerified
        ? "var(--color-success)"
        : isDisputed
            ? "var(--color-warning)"
            : isExcluded
                ? "var(--color-fg-dim)"
                : insightColor;

    const handleSaveNotes = () => {
        onUpdate({ researcher_notes: notes });
        setShowNotes(false);
    };

    return (
        <div
            className="border-l-2 pl-3 transition-opacity"
            style={{
                marginLeft: `${depth * 1.5}rem`,
                borderColor,
                opacity: isExcluded ? 0.5 : 1,
            }}
        >
            <div className="flex items-start gap-2">
                {/* Include/exclude checkbox */}
                <input
                    type="checkbox"
                    checked={!isExcluded}
                    onChange={(e) =>
                        onUpdate({
                            validation_status: e.target.checked ? "pending" : "excluded",
                        })
                    }
                    className="mt-1 cursor-pointer"
                    title={isExcluded ? "Include in analysis" : "Exclude from analysis"}
                />

                <div className="flex-1 min-w-0">
                    {/* Evidence metadata */}
                    <div className="flex items-center gap-2 text-xs text-[color:var(--color-fg-muted)] mb-1 flex-wrap">
                        <span className="chip chip-sm">{evidence.evidence_type}</span>

                        {demographicPct > 0 && (
                            <span
                                className="chip chip-sm"
                                style={{
                                    background: demographicPct >= 70 ? "var(--color-success-bg)" : "var(--color-bg-soft)",
                                    color: demographicPct >= 70 ? "var(--color-success)" : "var(--color-fg-muted)",
                                }}
                            >
                                Match: {demographicPct}%
                            </span>
                        )}

                        {evidence.source_url && (
                            <a
                                href={evidence.source_url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[color:var(--color-accent)] hover:underline"
                            >
                                Source ↗
                            </a>
                        )}
                    </div>

                    {/* Evidence text */}
                    <blockquote className="text-sm italic text-[color:var(--color-fg)] leading-relaxed">
                        "{evidence.text}"
                    </blockquote>

                    {/* Media attachment */}
                    {evidence.media_url && (
                        <img
                            src={evidence.media_url}
                            alt="Evidence screenshot"
                            className="mt-2 max-w-xs rounded border border-[color:var(--color-border)]"
                        />
                    )}

                    {/* Researcher notes */}
                    {evidence.researcher_notes && !showNotes && (
                        <div className="mt-2 text-xs bg-[color:var(--color-bg-soft)] p-2 rounded border border-[color:var(--color-border)]">
                            <span className="font-medium">Note:</span> {evidence.researcher_notes}
                        </div>
                    )}

                    {showNotes && (
                        <div className="mt-2 space-y-2">
                            <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="Add researcher notes..."
                                className="w-full text-xs p-2 rounded border border-[color:var(--color-border)] bg-[color:var(--color-bg)] resize-none"
                                rows={2}
                            />
                            <div className="flex gap-2">
                                <button onClick={handleSaveNotes} className="btn-xs">
                                    Save
                                </button>
                                <button onClick={() => setShowNotes(false)} className="btn-xs">
                                    Cancel
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Researcher controls */}
                    <div className="mt-2 flex items-center gap-2 flex-wrap">
                        <button
                            className={`btn-xs ${evidence.is_fact === true ? "btn-primary" : ""}`}
                            onClick={() => onUpdate({ is_fact: true })}
                            title="Mark as factual claim"
                        >
                            Fact
                        </button>
                        <button
                            className={`btn-xs ${evidence.is_fact === false ? "btn-primary" : ""}`}
                            onClick={() => onUpdate({ is_fact: false })}
                            title="Mark as opinion/belief"
                        >
                            Opinion
                        </button>
                        <button
                            className={`btn-xs ${isVerified ? "btn-primary" : ""}`}
                            onClick={() =>
                                onUpdate({
                                    validation_status: isVerified ? "pending" : "verified",
                                })
                            }
                            title={isVerified ? "Unverify" : "Mark as verified"}
                        >
                            {isVerified ? "✓ Verified" : "Verify"}
                        </button>
                        <button
                            className={`btn-xs ${isDisputed ? "btn-primary" : ""}`}
                            onClick={() =>
                                onUpdate({
                                    validation_status: isDisputed ? "pending" : "disputed",
                                })
                            }
                            title="Mark as disputed/questionable"
                        >
                            {isDisputed ? "⚠ Disputed" : "Dispute"}
                        </button>
                        <button
                            className="btn-xs"
                            onClick={() => setShowNotes(!showNotes)}
                            title="Add researcher notes"
                        >
                            {evidence.researcher_notes ? "Edit Note" : "Add Note"}
                        </button>
                        <button
                            className="btn-xs"
                            onClick={() =>
                                onAddChild({
                                    insight_id: evidence.insight_id,
                                    text: "",
                                    evidence_type: "observation",
                                    validation_status: "pending",
                                })
                            }
                            title="Add supporting sub-evidence"
                        >
                            + Sub-evidence
                        </button>
                    </div>

                    {/* Child evidence (recursive) */}
                    {evidence.children && evidence.children.length > 0 && (
                        <div className="mt-3 space-y-2">
                            <button
                                onClick={() => setExpanded(!expanded)}
                                className="text-xs text-[color:var(--color-fg-dim)] hover:text-[color:var(--color-fg)]"
                            >
                                {expanded ? "▼" : "▶"} {evidence.children.length} sub-evidence
                            </button>
                            {expanded &&
                                evidence.children.map((child) => (
                                    <EvidenceNode
                                        key={child.id}
                                        evidence={child}
                                        insightColor={insightColor}
                                        onUpdate={onUpdate}
                                        onAddChild={onAddChild}
                                        depth={depth + 1}
                                    />
                                ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// Made with Bob
