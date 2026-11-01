CREATE INDEX `category_user_id_period_id_idx` ON `category` (`user_id`,`period_id`);--> statement-breakpoint
CREATE INDEX `expense_user_id_period_id_idx` ON `expense` (`user_id`,`period_id`);--> statement-breakpoint
CREATE INDEX `expense_category_id_idx` ON `expense` (`category_id`);--> statement-breakpoint
CREATE INDEX `expense_date_idx` ON `expense` (`date`);--> statement-breakpoint
CREATE INDEX `monthly_period_user_id_status_idx` ON `monthly_period` (`user_id`,`status`);