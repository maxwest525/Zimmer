CREATE TABLE "mcp_servers" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"endpoint" text NOT NULL,
	"status" text DEFAULT 'disconnected' NOT NULL,
	"tool_count" integer DEFAULT 0 NOT NULL,
	"tools" jsonb,
	"last_error" text,
	"last_connected_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
