CREATE INDEX `idx_generations_created_at` ON `generations` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_generations_palette_id` ON `generations` (`palette_id`);--> statement-breakpoint
CREATE INDEX `idx_palettes_predominant_color` ON `palettes` (`predominant_color`);--> statement-breakpoint
CREATE INDEX `idx_palettes_style` ON `palettes` (`style`);--> statement-breakpoint
CREATE INDEX `idx_palettes_topic` ON `palettes` (`topic`);--> statement-breakpoint
CREATE INDEX `idx_palettes_total_colors` ON `palettes` (`total_colors`);