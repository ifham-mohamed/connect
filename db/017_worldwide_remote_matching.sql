CREATE OR REPLACE FUNCTION jobradar_work_mode_match(
  is_remote BOOLEAN,
  haystack TEXT,
  accepted TEXT[]
) RETURNS BOOLEAN
LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE detected TEXT := 'onsite';
BEGIN
  IF is_remote
    OR jobradar_keyword_match(haystack,'remote')
    OR jobradar_keyword_match(haystack,'worldwide') THEN
    detected := 'remote';
  ELSIF jobradar_keyword_match(haystack,'hybrid') THEN
    detected := 'hybrid';
  END IF;
  RETURN detected=ANY(accepted);
END;
$$;
