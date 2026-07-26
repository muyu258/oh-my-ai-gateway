PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_provider` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`order` integer NOT NULL,
	`models` text NOT NULL,
	`test_model` text,
	`test_protocol` text,
	`protocols` text NOT NULL,
	`website_url` text,
	`base_url` text,
	`token` text NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`cost_multiplier` text DEFAULT '1' NOT NULL,
	`pricing_overrides` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_provider`(
	"id", "name", "order", "models", "test_model", "test_protocol", "protocols", "website_url",
	"base_url", "token", "enabled", "cost_multiplier", "pricing_overrides", "created_at", "updated_at"
)
SELECT
	"id",
	"name",
	"order",
	(
		SELECT coalesce(json_group_object(model.value, json_object('aliases', json('[]'))), '{}')
		FROM json_each(`provider`.`models`) AS model
	),
	"test_model",
	CASE
		WHEN json_extract("protocols", '$.openaiCompatible.enabled') = 1 THEN 'openaiCompatible'
		WHEN json_extract("protocols", '$.openaiResponse.enabled') = 1 THEN 'openaiResponse'
		WHEN json_extract("protocols", '$.anthropic.enabled') = 1 THEN 'anthropic'
		ELSE NULL
	END,
	"protocols",
	"website_url",
	"base_url",
	"token",
	"enabled",
	"cost_multiplier",
	CASE WHEN json("pricing_overrides") = json('{}') THEN NULL ELSE "pricing_overrides" END,
	"created_at",
	"updated_at"
FROM `provider`;--> statement-breakpoint
DROP TABLE `provider`;--> statement-breakpoint
ALTER TABLE `__new_provider` RENAME TO `provider`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `provider_name_unique` ON `provider` (`name`);--> statement-breakpoint
CREATE UNIQUE INDEX `provider_order_unique` ON `provider` (`order`);--> statement-breakpoint
ALTER TABLE `usage` ADD `upstream_model` text;--> statement-breakpoint
ALTER TABLE `usage` ADD `pricing_source` text;--> statement-breakpoint
UPDATE `usage` SET `upstream_model` = `model`;
