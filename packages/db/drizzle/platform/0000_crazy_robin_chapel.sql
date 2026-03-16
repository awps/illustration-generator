CREATE TABLE `domains` (
	`id` text PRIMARY KEY NOT NULL,
	`domain` text NOT NULL,
	`site_id` text NOT NULL,
	`is_primary` integer DEFAULT true,
	`created_at` integer,
	FOREIGN KEY (`site_id`) REFERENCES `sites`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `domains_domain_unique` ON `domains` (`domain`);--> statement-breakpoint
CREATE INDEX `idx_domains_site_id` ON `domains` (`site_id`);--> statement-breakpoint
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
CREATE TABLE `sites` (
	`id` text PRIMARY KEY NOT NULL,
	`active` integer DEFAULT true,
	`turso_url` text NOT NULL,
	`turso_auth_token` text NOT NULL,
	`created_at` integer,
	`updated_at` integer
);
