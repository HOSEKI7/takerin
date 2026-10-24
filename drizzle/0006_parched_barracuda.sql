CREATE TABLE `admin_invitations` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`token` text NOT NULL,
	`invited_by` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`expires_at` integer NOT NULL,
	`accepted_at` integer,
	`revoked_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`invited_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `admin_invitations_token_unique` ON `admin_invitations` (`token`);