ALTER TABLE `request_record` RENAME TO `usage`;--> statement-breakpoint
CREATE TABLE `usage_content` (
	`usage_id` text PRIMARY KEY NOT NULL,
	`request_body` text NOT NULL,
	`response_body` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`usage_id`) REFERENCES `usage`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `usage_content_created_at_idx` ON `usage_content` (`created_at`);