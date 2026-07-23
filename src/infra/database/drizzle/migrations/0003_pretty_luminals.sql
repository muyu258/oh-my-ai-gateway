ALTER TABLE `request_record` ADD `usage` text;--> statement-breakpoint
UPDATE `request_record`
SET `usage` = CASE
	WHEN `input_tokens` IS NOT NULL
		OR `output_tokens` IS NOT NULL
		OR `cached_input_tokens` IS NOT NULL
		OR `cost` IS NOT NULL
		OR `cost_details` IS NOT NULL
	THEN json_patch(
		json_patch(
			json_patch(
				json_patch(
					CASE
						WHEN `input_tokens` IS NOT NULL
						THEN json_object('inputTokens', `input_tokens`)
						ELSE '{}'
					END,
					CASE
						WHEN `output_tokens` IS NOT NULL
						THEN json_object('outputTokens', `output_tokens`)
						ELSE '{}'
					END
				),
				CASE
					WHEN `cached_input_tokens` IS NOT NULL
					THEN json_object('cachedInputTokens', `cached_input_tokens`)
					ELSE '{}'
				END
			),
			CASE
				WHEN `cost` IS NOT NULL
				THEN json_object('cost', `cost`)
				ELSE '{}'
			END
		),
		CASE
			WHEN `cost_details` IS NOT NULL AND json_valid(`cost_details`)
			THEN json_object('costDetails', json(`cost_details`))
			WHEN `cost_details` IS NOT NULL
			THEN json_object('costDetails', `cost_details`)
			ELSE '{}'
		END
	)
	ELSE NULL
END;--> statement-breakpoint
ALTER TABLE `request_record` DROP COLUMN `source`;--> statement-breakpoint
ALTER TABLE `request_record` DROP COLUMN `input_tokens`;--> statement-breakpoint
ALTER TABLE `request_record` DROP COLUMN `output_tokens`;--> statement-breakpoint
ALTER TABLE `request_record` DROP COLUMN `cached_input_tokens`;--> statement-breakpoint
ALTER TABLE `request_record` DROP COLUMN `cost`;--> statement-breakpoint
ALTER TABLE `request_record` DROP COLUMN `cost_details`;
