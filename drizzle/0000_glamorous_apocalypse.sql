CREATE EXTENSION IF NOT EXISTS pgcrypto;
--> statement-breakpoint
CREATE SCHEMA IF NOT EXISTS "auth";
--> statement-breakpoint
CREATE SCHEMA IF NOT EXISTS "storage";
--> statement-breakpoint
CREATE TABLE "auth"."users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"encrypted_password" text NOT NULL,
	"raw_user_meta_data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "storage"."buckets" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"public" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "photo_submission_images" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"submission_id" bigint NOT NULL,
	"storage_path" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"size_bytes" bigint,
	"mime_type" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "photo_submissions" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"created_by" uuid NOT NULL,
	"name" text DEFAULT 'Product upload' NOT NULL,
	"manufacturer" text DEFAULT 'Unknown' NOT NULL,
	"status" text DEFAULT 'in_review' NOT NULL,
	"reviewed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "photo_submission_images" ADD CONSTRAINT "photo_submission_images_submission_id_photo_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."photo_submissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "photo_submissions" ADD CONSTRAINT "photo_submissions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
INSERT INTO "storage"."buckets" ("id", "name", "public")
VALUES ('mp-images', 'mp-images', true)
ON CONFLICT ("id") DO UPDATE SET "public" = true;