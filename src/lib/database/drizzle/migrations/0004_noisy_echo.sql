CREATE TABLE `provider` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`models` text NOT NULL,
	`protocols` text NOT NULL,
	`base_url` text,
	`provider_token` text NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
