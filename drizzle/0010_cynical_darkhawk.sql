CREATE TABLE `app_feedback` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`type` text NOT NULL,
	`rating` integer,
	`category` text,
	`content` text NOT NULL,
	`current_route` text,
	`device_info` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`is_featured` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `app_feedback_user_id_idx` ON `app_feedback` (`user_id`);--> statement-breakpoint
CREATE INDEX `app_feedback_type_idx` ON `app_feedback` (`type`);--> statement-breakpoint
CREATE INDEX `app_feedback_status_idx` ON `app_feedback` (`status`);--> statement-breakpoint
CREATE INDEX `app_feedback_created_at_idx` ON `app_feedback` (`created_at`);