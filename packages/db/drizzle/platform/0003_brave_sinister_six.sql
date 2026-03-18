CREATE TABLE `compose_templates` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`project_id` text,
	`name` text NOT NULL,
	`width` integer NOT NULL,
	`height` integer NOT NULL,
	`layers` text NOT NULL,
	`created_at` integer,
	`updated_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `platform_users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_compose_templates_user_id` ON `compose_templates` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_compose_templates_project_id` ON `compose_templates` (`project_id`);