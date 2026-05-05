-- LaunchLens: Demographic Filtering & Evidence Hierarchy Enhancement
-- This migration adds demographic filtering capabilities and replaces the flat quotes
-- structure with a hierarchical evidence system that supports researcher validation.

-- ============================================================================
-- 1. Enhance research_sources with demographic data
-- ============================================================================

ALTER TABLE research_sources 
  ADD COLUMN IF NOT EXISTS author_profile JSONB,
  ADD COLUMN IF NOT EXISTS demographic_match_score REAL DEFAULT 0.0 CHECK (demographic_match_score >= 0.0 AND demographic_match_score <= 1.0),
  ADD COLUMN IF NOT EXISTS demographic_signals JSONB;

CREATE INDEX IF NOT EXISTS research_sources_demographic_score_idx 
  ON research_sources(demographic_match_score DESC);

COMMENT ON COLUMN research_sources.author_profile IS 
  'Extracted author profile data (username, age indicators, location, occupation, bio)';
COMMENT ON COLUMN research_sources.demographic_match_score IS 
  'AI-computed confidence (0.0-1.0) that this source matches target demographic';
COMMENT ON COLUMN research_sources.demographic_signals IS 
  'Array of specific demographic indicators found (e.g., ["born in 1965", "retired"])';

-- ============================================================================
-- 2. Create hierarchical evidence table
-- ============================================================================

CREATE TABLE IF NOT EXISTS evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  insight_id UUID NOT NULL REFERENCES insights(id) ON DELETE CASCADE,
  parent_evidence_id UUID REFERENCES evidence(id) ON DELETE CASCADE,
  
  -- Core content
  text TEXT NOT NULL,
  source_id UUID REFERENCES research_sources(id) ON DELETE SET NULL,
  source_url TEXT,
  evidence_type TEXT NOT NULL DEFAULT 'quote' 
    CHECK (evidence_type IN ('quote', 'statistic', 'observation', 'screenshot')),
  
  -- Researcher validation controls
  validation_status TEXT NOT NULL DEFAULT 'pending' 
    CHECK (validation_status IN ('pending', 'verified', 'disputed', 'excluded')),
  is_fact BOOLEAN,
  researcher_notes TEXT,
  
  -- Media attachments
  media_url TEXT,
  media_type TEXT,
  media_metadata JSONB,
  
  -- Demographic context
  demographic_match_score REAL DEFAULT 0.0 
    CHECK (demographic_match_score >= 0.0 AND demographic_match_score <= 1.0),
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS evidence_insight_idx ON evidence(insight_id);
CREATE INDEX IF NOT EXISTS evidence_parent_idx ON evidence(parent_evidence_id);
CREATE INDEX IF NOT EXISTS evidence_validation_idx ON evidence(validation_status);
CREATE INDEX IF NOT EXISTS evidence_source_idx ON evidence(source_id);
CREATE INDEX IF NOT EXISTS evidence_demographic_score_idx ON evidence(demographic_match_score DESC);

-- Prevent circular references in evidence hierarchy
CREATE OR REPLACE FUNCTION check_evidence_hierarchy_cycle()
RETURNS TRIGGER AS $$
DECLARE
  current_id UUID;
  depth INT := 0;
  max_depth INT := 10;
BEGIN
  IF NEW.parent_evidence_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  current_id := NEW.parent_evidence_id;
  
  WHILE current_id IS NOT NULL AND depth < max_depth LOOP
    IF current_id = NEW.id THEN
      RAISE EXCEPTION 'Circular reference detected in evidence hierarchy';
    END IF;
    
    SELECT parent_evidence_id INTO current_id
    FROM evidence
    WHERE id = current_id;
    
    depth := depth + 1;
  END LOOP;
  
  IF depth >= max_depth THEN
    RAISE EXCEPTION 'Evidence hierarchy too deep (max % levels)', max_depth;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS evidence_hierarchy_check ON evidence;
CREATE TRIGGER evidence_hierarchy_check
  BEFORE INSERT OR UPDATE ON evidence
  FOR EACH ROW
  EXECUTE FUNCTION check_evidence_hierarchy_cycle();

-- Updated_at trigger for evidence
DROP TRIGGER IF EXISTS evidence_updated_at ON evidence;
CREATE TRIGGER evidence_updated_at 
  BEFORE UPDATE ON evidence
  FOR EACH ROW 
  EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE evidence IS 
  'Hierarchical evidence supporting insights. Replaces flat quotes structure with researcher validation controls.';
COMMENT ON COLUMN evidence.parent_evidence_id IS 
  'Parent evidence ID for hierarchical sub-evidence (NULL for top-level)';
COMMENT ON COLUMN evidence.validation_status IS 
  'Researcher validation: pending (default), verified (confirmed), disputed (questionable), excluded (removed from analysis)';
COMMENT ON COLUMN evidence.is_fact IS 
  'Researcher classification: true (factual claim), false (opinion/belief), NULL (not yet classified)';

-- ============================================================================
-- 3. Enhance insights with demographic relevance
-- ============================================================================

ALTER TABLE insights 
  ADD COLUMN IF NOT EXISTS demographic_relevance_score REAL DEFAULT 0.0 
    CHECK (demographic_relevance_score >= 0.0 AND demographic_relevance_score <= 1.0),
  ADD COLUMN IF NOT EXISTS primary_demographic TEXT;

CREATE INDEX IF NOT EXISTS insights_demographic_relevance_idx 
  ON insights(demographic_relevance_score DESC);

COMMENT ON COLUMN insights.demographic_relevance_score IS 
  'Aggregate score (0.0-1.0) indicating how strongly this insight represents the target demographic';
COMMENT ON COLUMN insights.primary_demographic IS 
  'Primary demographic segment this insight represents (e.g., "Baby Boomers", "Urban Millennials")';

-- ============================================================================
-- 4. Migrate existing quotes to evidence table
-- ============================================================================

-- Only migrate if quotes table exists and has data
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'quotes') THEN
    INSERT INTO evidence (
      insight_id,
      text,
      source_url,
      evidence_type,
      validation_status,
      source_id,
      created_at
    )
    SELECT 
      q.insight_id,
      q.text,
      q.source_url,
      'quote'::TEXT,
      'verified'::TEXT,  -- Assume existing quotes are verified
      rs.id,  -- Link to research_sources if URL matches
      q.created_at
    FROM quotes q
    LEFT JOIN research_sources rs ON rs.url = q.source_url
    WHERE NOT EXISTS (
      -- Avoid duplicates if migration runs multiple times
      SELECT 1 FROM evidence e 
      WHERE e.insight_id = q.insight_id 
        AND e.text = q.text
    );
    
    RAISE NOTICE 'Migrated % quotes to evidence table', 
      (SELECT COUNT(*) FROM quotes);
  END IF;
END $$;

-- ============================================================================
-- 5. Row Level Security for evidence
-- ============================================================================

ALTER TABLE evidence ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "evidence via insight project" ON evidence;
CREATE POLICY "evidence via insight project" ON evidence
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM insights i
      JOIN projects p ON p.id = i.project_id
      WHERE i.id = evidence.insight_id AND p.user_id = auth.uid()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM insights i
      JOIN projects p ON p.id = i.project_id
      WHERE i.id = evidence.insight_id AND p.user_id = auth.uid()
    )
  );

-- ============================================================================
-- 6. Helper views for researcher workflow
-- ============================================================================

-- View: Evidence with demographic context
CREATE OR REPLACE VIEW evidence_with_context AS
SELECT 
  e.*,
  i.project_id,
  i.type as insight_type,
  i.title as insight_title,
  rs.kind as source_kind,
  rs.author_profile,
  rs.demographic_signals,
  CASE 
    WHEN e.parent_evidence_id IS NULL THEN 0
    ELSE (
      WITH RECURSIVE evidence_depth AS (
        SELECT id, parent_evidence_id, 1 as depth
        FROM evidence
        WHERE id = e.id
        UNION ALL
        SELECT e2.id, e2.parent_evidence_id, ed.depth + 1
        FROM evidence e2
        JOIN evidence_depth ed ON e2.id = ed.parent_evidence_id
      )
      SELECT MAX(depth) FROM evidence_depth
    )
  END as hierarchy_depth
FROM evidence e
JOIN insights i ON i.id = e.insight_id
LEFT JOIN research_sources rs ON rs.id = e.source_id;

COMMENT ON VIEW evidence_with_context IS 
  'Evidence enriched with insight and source context for researcher UI';

-- View: Insights with evidence summary
CREATE OR REPLACE VIEW insights_with_evidence_summary AS
SELECT 
  i.*,
  COUNT(DISTINCT e.id) FILTER (WHERE e.validation_status != 'excluded') as evidence_count,
  COUNT(DISTINCT e.id) FILTER (WHERE e.validation_status = 'verified') as verified_count,
  COUNT(DISTINCT e.id) FILTER (WHERE e.validation_status = 'pending') as pending_count,
  COUNT(DISTINCT e.id) FILTER (WHERE e.validation_status = 'disputed') as disputed_count,
  AVG(e.demographic_match_score) FILTER (WHERE e.validation_status != 'excluded') as avg_evidence_demographic_score,
  COUNT(DISTINCT e.id) FILTER (WHERE e.is_fact = true) as fact_count,
  COUNT(DISTINCT e.id) FILTER (WHERE e.is_fact = false) as opinion_count
FROM insights i
LEFT JOIN evidence e ON e.insight_id = i.id
GROUP BY i.id;

COMMENT ON VIEW insights_with_evidence_summary IS 
  'Insights with aggregated evidence statistics for dashboard display';

-- ============================================================================
-- 7. Utility functions
-- ============================================================================

-- Function: Get evidence tree for an insight
CREATE OR REPLACE FUNCTION get_evidence_tree(p_insight_id UUID)
RETURNS TABLE (
  id UUID,
  parent_evidence_id UUID,
  text TEXT,
  evidence_type TEXT,
  validation_status TEXT,
  is_fact BOOLEAN,
  demographic_match_score REAL,
  depth INT,
  path UUID[]
) AS $$
  WITH RECURSIVE evidence_tree AS (
    -- Root level evidence
    SELECT 
      e.id,
      e.parent_evidence_id,
      e.text,
      e.evidence_type,
      e.validation_status,
      e.is_fact,
      e.demographic_match_score,
      0 as depth,
      ARRAY[e.id] as path
    FROM evidence e
    WHERE e.insight_id = p_insight_id
      AND e.parent_evidence_id IS NULL
    
    UNION ALL
    
    -- Child evidence
    SELECT 
      e.id,
      e.parent_evidence_id,
      e.text,
      e.evidence_type,
      e.validation_status,
      e.is_fact,
      e.demographic_match_score,
      et.depth + 1,
      et.path || e.id
    FROM evidence e
    JOIN evidence_tree et ON e.parent_evidence_id = et.id
    WHERE e.insight_id = p_insight_id
  )
  SELECT * FROM evidence_tree
  ORDER BY path;
$$ LANGUAGE sql STABLE;

COMMENT ON FUNCTION get_evidence_tree IS 
  'Returns hierarchical evidence tree for an insight, ordered by path';

-- Function: Calculate insight demographic relevance from evidence
CREATE OR REPLACE FUNCTION update_insight_demographic_relevance()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE insights
  SET demographic_relevance_score = (
    SELECT COALESCE(AVG(e.demographic_match_score), 0.0)
    FROM evidence e
    WHERE e.insight_id = NEW.insight_id
      AND e.validation_status != 'excluded'
  )
  WHERE id = NEW.insight_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS evidence_update_insight_demographic ON evidence;
CREATE TRIGGER evidence_update_insight_demographic
  AFTER INSERT OR UPDATE OR DELETE ON evidence
  FOR EACH ROW
  EXECUTE FUNCTION update_insight_demographic_relevance();

COMMENT ON FUNCTION update_insight_demographic_relevance IS 
  'Auto-updates insight demographic_relevance_score when evidence changes';

-- ============================================================================
-- 8. Sample data for testing (optional, comment out for production)
-- ============================================================================

-- Uncomment to add sample evidence for testing:
/*
DO $$
DECLARE
  sample_project_id UUID;
  sample_insight_id UUID;
  sample_evidence_id UUID;
BEGIN
  -- Find first project
  SELECT id INTO sample_project_id FROM projects LIMIT 1;
  
  IF sample_project_id IS NOT NULL THEN
    -- Find first insight
    SELECT id INTO sample_insight_id FROM insights WHERE project_id = sample_project_id LIMIT 1;
    
    IF sample_insight_id IS NOT NULL THEN
      -- Add sample evidence with hierarchy
      INSERT INTO evidence (insight_id, text, evidence_type, demographic_match_score, validation_status)
      VALUES (sample_insight_id, 'Sample top-level evidence', 'quote', 0.85, 'verified')
      RETURNING id INTO sample_evidence_id;
      
      INSERT INTO evidence (insight_id, parent_evidence_id, text, evidence_type, demographic_match_score)
      VALUES (sample_insight_id, sample_evidence_id, 'Sample sub-evidence supporting the claim', 'observation', 0.75);
      
      RAISE NOTICE 'Added sample evidence to insight %', sample_insight_id;
    END IF;
  END IF;
END $$;
*/

-- Made with Bob
