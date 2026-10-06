-- Add rating and rated_at columns to tickets table
ALTER TABLE public.tickets
  ADD COLUMN IF NOT EXISTS rating SMALLINT CHECK (rating >= 1 AND rating <= 5),
  ADD COLUMN IF NOT EXISTS rated_at TIMESTAMPTZ;

COMMENT ON COLUMN public.tickets.rating IS '通報人確認修復時的選填 1-5 星評分';
COMMENT ON COLUMN public.tickets.rated_at IS '評分提交時間';

-- Seed ratings for a subset of existing closed tickets for reports and analytics demonstration
UPDATE public.tickets
SET 
  rating = (
    CASE (abs(hashtext(id::text)) % 10)
      WHEN 0 THEN 5
      WHEN 1 THEN 5
      WHEN 2 THEN 4
      WHEN 3 THEN 5
      WHEN 4 THEN 4
      WHEN 5 THEN 3
      WHEN 6 THEN 5
      WHEN 7 THEN 4
      WHEN 8 THEN 5
      ELSE 4
    END
  ),
  rated_at = updated_at
WHERE status = 'closed'
  AND rating IS NULL
  AND (abs(hashtext(id::text)) % 4) != 0;
