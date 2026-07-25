ALTER TABLE `provider` ADD `cost_multiplier` text DEFAULT '1' NOT NULL;--> statement-breakpoint
ALTER TABLE `provider` ADD `pricing_overrides` text DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE `usage` ADD `cost_micros` integer;--> statement-breakpoint
ALTER TABLE `usage` ADD `cost_status` text;--> statement-breakpoint
ALTER TABLE `usage` ADD `cost_snapshot` text;