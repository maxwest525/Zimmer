ALTER TABLE "ideas" ADD COLUMN IF NOT EXISTS "enrichment_summary" text;
ALTER TABLE "ideas" ADD COLUMN IF NOT EXISTS "enrichment_urls" text;
ALTER TABLE "ideas" ADD COLUMN IF NOT EXISTS "enrichment_technologies" text;
ALTER TABLE "ideas" ADD COLUMN IF NOT EXISTS "enrichment_error" text;
