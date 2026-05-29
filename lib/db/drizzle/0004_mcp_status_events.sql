CREATE TABLE "mcp_status_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"server_id" integer NOT NULL,
	"status" text NOT NULL,
	"error" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "mcp_status_events" ADD CONSTRAINT "mcp_status_events_server_id_mcp_servers_id_fk" FOREIGN KEY ("server_id") REFERENCES "public"."mcp_servers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "mcp_status_events_server_created_idx" ON "mcp_status_events" USING btree ("server_id","created_at" DESC NULLS LAST);