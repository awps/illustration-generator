CREATE TABLE `user_project_preferences` (
	`user_id` text NOT NULL,
	`project_id` text NOT NULL,
	`key` text NOT NULL,
	`value` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `platform_users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_upp_user_project` ON `user_project_preferences` (`user_id`,`project_id`);--> statement-breakpoint
CREATE INDEX `idx_upp_user_project_key` ON `user_project_preferences` (`user_id`,`project_id`,`key`);