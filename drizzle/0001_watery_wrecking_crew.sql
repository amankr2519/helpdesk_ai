CREATE TABLE "auth_login_attempts" (
	"key_hash" varchar(64) PRIMARY KEY NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"window_started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"blocked_until" timestamp with time zone
);
--> statement-breakpoint
CREATE INDEX "auth_login_attempts_blocked_until_idx" ON "auth_login_attempts" USING btree ("blocked_until");