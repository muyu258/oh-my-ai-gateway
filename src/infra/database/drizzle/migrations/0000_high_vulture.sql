CREATE TABLE `request_record` (
	`id` text PRIMARY KEY NOT NULL,
	`channel_id` text,
	`source` text,
	`status` text,
	`is_stream` integer DEFAULT false NOT NULL,
	`input_tokens` integer,
	`output_tokens` integer,
	`cached_input_tokens` integer,
	`cost` text,
	`cost_details` text,
	`start_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`time_to_first_byte_ms` integer,
	`end_at` integer
);
