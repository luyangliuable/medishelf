CREATE SCHEMA IF NOT EXISTS "auth";
--> statement-breakpoint
CREATE OR REPLACE FUNCTION "auth"."uid"() RETURNS uuid
LANGUAGE sql STABLE AS $$
  SELECT nullif(current_setting('app.current_user_id', true), '')::uuid
$$;
--> statement-breakpoint
GRANT USAGE ON SCHEMA "auth" TO PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION "auth"."uid"() TO PUBLIC;
--> statement-breakpoint
ALTER TABLE "photo_submissions" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "photo_submission_images" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "notifications" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "submissions insert own" ON "photo_submissions"
  FOR INSERT TO PUBLIC WITH CHECK ("created_by" = "auth"."uid"());
--> statement-breakpoint
CREATE POLICY "submissions select own" ON "photo_submissions"
  FOR SELECT TO PUBLIC USING ("created_by" = "auth"."uid"());
--> statement-breakpoint
CREATE POLICY "submissions update own" ON "photo_submissions"
  FOR UPDATE TO PUBLIC USING ("created_by" = "auth"."uid"()) WITH CHECK ("created_by" = "auth"."uid"());
--> statement-breakpoint
CREATE POLICY "submissions delete own" ON "photo_submissions"
  FOR DELETE TO PUBLIC USING ("created_by" = "auth"."uid"());
--> statement-breakpoint
CREATE POLICY "images insert for own submission" ON "photo_submission_images"
  FOR INSERT TO PUBLIC WITH CHECK (
    EXISTS (
      SELECT 1 FROM "photo_submissions" submissions
      WHERE submissions.id = submission_id
        AND submissions.created_by = "auth"."uid"()
    )
  );
--> statement-breakpoint
CREATE POLICY "images select for own submission" ON "photo_submission_images"
  FOR SELECT TO PUBLIC USING (
    EXISTS (
      SELECT 1 FROM "photo_submissions" submissions
      WHERE submissions.id = submission_id
        AND submissions.created_by = "auth"."uid"()
    )
  );
--> statement-breakpoint
CREATE POLICY "images delete for own submission" ON "photo_submission_images"
  FOR DELETE TO PUBLIC USING (
    EXISTS (
      SELECT 1 FROM "photo_submissions" submissions
      WHERE submissions.id = submission_id
        AND submissions.created_by = "auth"."uid"()
    )
  );
--> statement-breakpoint
CREATE POLICY "notifications insert own" ON "notifications"
  FOR INSERT TO PUBLIC WITH CHECK ("created_by" = "auth"."uid"());
--> statement-breakpoint
CREATE POLICY "notifications select own" ON "notifications"
  FOR SELECT TO PUBLIC USING ("created_by" = "auth"."uid"());
--> statement-breakpoint
INSERT INTO "storage"."buckets" ("id", "name", "public")
VALUES ('mp-images', 'mp-images', true)
ON CONFLICT ("id") DO UPDATE SET "public" = true;