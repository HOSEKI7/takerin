CREATE TABLE `health_check` (
	`id` text PRIMARY KEY NOT NULL,
	`service` text NOT NULL,
	`status` text NOT NULL,
	`created_at` integer NOT NULL
);
