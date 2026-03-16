CREATE TABLE `generations` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`user_id` text NOT NULL,
	`prompt` text NOT NULL,
	`palette_id` text,
	`renderings` text,
	`elements` text,
	`compositions` text,
	`placements` text,
	`moods` text,
	`complexities` text,
	`layouts` text,
	`subjects` text,
	`icon_styles` text,
	`storage_path` text NOT NULL,
	`created_at` integer,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `platform_users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_generations_project_id` ON `generations` (`project_id`);--> statement-breakpoint
CREATE INDEX `idx_generations_user_id` ON `generations` (`user_id`);--> statement-breakpoint
CREATE TABLE `palettes` (
	`id` text PRIMARY KEY NOT NULL,
	`colors` text NOT NULL,
	`total_colors` integer NOT NULL,
	`predominant_color` text NOT NULL,
	`style` text NOT NULL,
	`topic` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `platform_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`token` text NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`expires_at` integer NOT NULL,
	`created_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `platform_users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `platform_sessions_token_unique` ON `platform_sessions` (`token`);--> statement-breakpoint
CREATE INDEX `idx_platform_sessions_token` ON `platform_sessions` (`token`);--> statement-breakpoint
CREATE INDEX `idx_platform_sessions_user` ON `platform_sessions` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_platform_sessions_expires` ON `platform_sessions` (`expires_at`);--> statement-breakpoint
CREATE TABLE `platform_users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`name` text NOT NULL,
	`role` text DEFAULT 'admin' NOT NULL,
	`created_at` integer,
	`updated_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `platform_users_email_unique` ON `platform_users` (`email`);--> statement-breakpoint
CREATE TABLE `projects` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`url` text,
	`created_at` integer,
	`updated_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `platform_users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_projects_user_id` ON `projects` (`user_id`);