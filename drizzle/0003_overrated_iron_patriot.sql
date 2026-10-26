CREATE TABLE "public_request_rate_limits" (
	"key_hash" varchar(64) PRIMARY KEY NOT NULL,
	"request_count" integer DEFAULT 0 NOT NULL,
	"window_started_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "public_request_rate_limits_window_started_at_idx" ON "public_request_rate_limits" USING btree ("window_started_at");