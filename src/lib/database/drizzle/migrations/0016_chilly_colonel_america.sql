PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_provider` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`order` integer NOT NULL,
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
	`id`, `name`, `order`, `models`, `test_model`, `protocols`, `website_url`, `base_url`,
	`token`, `enabled`, `cost_multiplier`, `pricing_overrides`, `created_at`, `updated_at`
)
SELECT
	`id`, `name`, row_number() OVER (ORDER BY `name` ASC), `models`, `test_model`, `protocols`,
	`website_url`, `base_url`, `token`, `enabled`, `cost_multiplier`, `pricing_overrides`,
	`created_at`, `updated_at`
FROM `provider`;--> statement-breakpoint
DROP TABLE `provider`;--> statement-breakpoint
ALTER TABLE `__new_provider` RENAME TO `provider`;--> statement-breakpoint
CREATE UNIQUE INDEX `provider_name_unique` ON `provider` (`name`);--> statement-breakpoint
CREATE UNIQUE INDEX `provider_order_unique` ON `provider` (`order`);--> statement-breakpoint
PRAGMA foreign_keys=ON;
