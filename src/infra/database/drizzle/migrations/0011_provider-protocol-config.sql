ALTER TABLE `provider` RENAME COLUMN "provider_token" TO "token";--> statement-breakpoint
UPDATE `provider`
SET `protocols` = (
	SELECT coalesce(
		json_group_object(
			protocol.value,
			json_object(
				'endpoint', coalesce(
					json_extract(`provider`.`protocol_endpoints`, '$.' || protocol.value),
					''
				),
				'enabled', json('true')
			)
		),
		'{}'
	)
	FROM json_each(`provider`.`protocols`) AS protocol
)
WHERE json_type(`protocols`) = 'array';--> statement-breakpoint
ALTER TABLE `provider` DROP COLUMN `protocol_endpoints`;--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_request_record` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text,
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
	`start_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`time_to_first_byte_ms` integer,
	`end_at` integer
);
--> statement-breakpoint
INSERT INTO `__new_request_record`("id", "name", "model", "client", "protocol_type", "status", "is_stream", "error", "input_tokens", "output_tokens", "cache_creation_input_tokens", "cache_read_input_tokens", "start_at", "time_to_first_byte_ms", "end_at") SELECT "id", "name", "model", "client", "protocol_type", "status", "is_stream", "error", "input_tokens", "output_tokens", "cache_creation_input_tokens", "cache_read_input_tokens", "start_at", "time_to_first_byte_ms", "end_at" FROM `request_record`;--> statement-breakpoint
DROP TABLE `request_record`;--> statement-breakpoint
ALTER TABLE `__new_request_record` RENAME TO `request_record`;--> statement-breakpoint
PRAGMA foreign_keys=ON;
