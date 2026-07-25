PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_provider` (
	`name` text PRIMARY KEY NOT NULL,
	`models` text NOT NULL,
	`protocols` text NOT NULL,
	`protocol_endpoints` text DEFAULT '{}' NOT NULL,
	`base_url` text,
	`provider_token` text NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_provider`("name", "models", "protocols", "protocol_endpoints", "base_url", "provider_token", "enabled", "created_at", "updated_at") SELECT "name", "models", "protocols", "protocol_endpoints", "base_url", "provider_token", "enabled", "created_at", "updated_at" FROM `provider`;--> statement-breakpoint
DROP TABLE `provider`;--> statement-breakpoint
ALTER TABLE `__new_provider` RENAME TO `provider`;--> statement-breakpoint
PRAGMA foreign_keys=ON;