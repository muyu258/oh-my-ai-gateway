PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_provider` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`models` text NOT NULL,
	`test_model` text,
	`protocols` text NOT NULL,
	`website_url` text,
	`base_url` text,
	`token` text NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`cost_multiplier` text DEFAULT '1' NOT NULL,
	`pricing_overrides` text DEFAULT '{}' NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);--> statement-breakpoint
INSERT INTO `__new_provider` (
	`id`, `name`, `models`, `test_model`, `protocols`, `website_url`, `base_url`, `token`,
	`enabled`, `cost_multiplier`, `pricing_overrides`, `created_at`, `updated_at`
)
SELECT
	lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)), 2) || '-8' || substr(hex(randomblob(2)), 2) || '-' || hex(randomblob(6))),
	`name`, `models`, `test_model`, `protocols`, `website_url`, `base_url`, `token`,
	`enabled`, `cost_multiplier`, `pricing_overrides`, `created_at`, `updated_at`
FROM `provider`;--> statement-breakpoint
DROP TABLE `provider`;--> statement-breakpoint
ALTER TABLE `__new_provider` RENAME TO `provider`;--> statement-breakpoint
CREATE UNIQUE INDEX `provider_name_unique` ON `provider` (`name`);--> statement-breakpoint
CREATE TABLE `__new_usage` (
	`id` text PRIMARY KEY NOT NULL,
	`provider_id` text,
	`model` text,
	`client` text,
	`protocol_type` text,
	`status` integer,
	`is_stream` integer DEFAULT false NOT NULL,
	`error` text,
	`input_tokens` integer,
	`output_tokens` integer,
	`cache_creation_input_tokens` integer,
	`cache_read_input_tokens` integer,
	`cost_micros` integer,
	`cost_status` text,
	`cost_snapshot` text,
	`start_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`time_to_first_byte_ms` integer,
	`end_at` integer,
	FOREIGN KEY (`provider_id`) REFERENCES `provider` (`id`) ON UPDATE no action ON DELETE set null
);--> statement-breakpoint
INSERT INTO `__new_usage` (
	`id`, `provider_id`, `model`, `client`, `protocol_type`, `status`, `is_stream`, `error`,
	`input_tokens`, `output_tokens`, `cache_creation_input_tokens`, `cache_read_input_tokens`,
	`cost_micros`, `cost_status`, `cost_snapshot`, `start_at`, `time_to_first_byte_ms`, `end_at`
)
SELECT
	u.`id`, p.`id`, u.`model`, u.`client`, u.`protocol_type`, u.`status`, u.`is_stream`, u.`error`,
	u.`input_tokens`, u.`output_tokens`, u.`cache_creation_input_tokens`, u.`cache_read_input_tokens`,
	u.`cost_micros`, u.`cost_status`, u.`cost_snapshot`, u.`start_at`, u.`time_to_first_byte_ms`, u.`end_at`
FROM `usage` u
LEFT JOIN `provider` p ON p.`name` = u.`name`;--> statement-breakpoint
DROP TABLE `usage`;--> statement-breakpoint
ALTER TABLE `__new_usage` RENAME TO `usage`;--> statement-breakpoint
PRAGMA foreign_keys=ON;
