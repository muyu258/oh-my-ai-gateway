ALTER TABLE `request_record` ADD `input_tokens` integer;--> statement-breakpoint
ALTER TABLE `request_record` ADD `output_tokens` integer;--> statement-breakpoint
ALTER TABLE `request_record` ADD `cache_creation_input_tokens` integer;--> statement-breakpoint
ALTER TABLE `request_record` ADD `cache_read_input_tokens` integer;--> statement-breakpoint
UPDATE `request_record`
SET
	`input_tokens` = CAST(json_extract(`usage`, '$.inputTokens') AS integer),
	`output_tokens` = CAST(json_extract(`usage`, '$.outputTokens') AS integer),
	`cache_creation_input_tokens` = CAST(json_extract(`usage`, '$.cacheCreationInputTokens') AS integer),
	`cache_read_input_tokens` = CAST(
		coalesce(
			json_extract(`usage`, '$.cacheReadInputTokens'),
			json_extract(`usage`, '$.cachedInputTokens')
		) AS integer
	)
WHERE `usage` IS NOT NULL AND json_valid(`usage`);--> statement-breakpoint
ALTER TABLE `request_record` DROP COLUMN `usage`;
