CREATE TABLE `category` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`period_id` text NOT NULL,
	`name` text NOT NULL,
	`percentage` real NOT NULL,
	`is_savings` integer DEFAULT false NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`period_id`) REFERENCES `monthly_period`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `category_template` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`categories` text NOT NULL,
	`is_system` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `monthly_period` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`start_date` text NOT NULL,
	`end_date` text NOT NULL,
	`pay_day` integer NOT NULL,
	`total_income` integer NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`ai_summary` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `category_template` (`id`, `name`, `description`, `categories`, `is_system`, `created_at`, `updated_at`)
VALUES
('tpl_50_30_20', '50/30/20', 'Pembagian klasik: 50% Kebutuhan, 30% Keinginan, 20% Tabungan & Investasi.', '[{"name":"Kebutuhan","percentage":50,"isSavings":false},{"name":"Keinginan","percentage":30,"isSavings":false},{"name":"Tabungan & Investasi","percentage":20,"isSavings":true}]', 1, 1729468800000, 1729468800000),
('tpl_6_toples', '6 Toples', 'Metode T. Harv Eker: Kebutuhan (55%), Tabungan Jangka Panjang (10%), Investasi Finansial (10%), Edukasi (10%), Hiburan (10%), Donasi (5%).', '[{"name":"Kebutuhan Hidup","percentage":55,"isSavings":false},{"name":"Tabungan Jangka Panjang","percentage":10,"isSavings":true},{"name":"Investasi Finansial","percentage":10,"isSavings":true},{"name":"Pendidikan","percentage":10,"isSavings":false},{"name":"Hiburan","percentage":10,"isSavings":false},{"name":"Berbagi / Donasi","percentage":5,"isSavings":false}]', 1, 1729468800000, 1729468800000);
