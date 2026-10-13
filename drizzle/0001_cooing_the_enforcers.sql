CREATE TABLE `deliveries` (
	`id` text PRIMARY KEY NOT NULL,
	`innings_id` text NOT NULL,
	`seq` integer NOT NULL,
	`kind` text DEFAULT 'BALL' NOT NULL,
	`striker_id` text NOT NULL,
	`non_striker_id` text NOT NULL,
	`bowler_id` text NOT NULL,
	`runs_off_bat` integer DEFAULT 0 NOT NULL,
	`is_boundary` integer DEFAULT false NOT NULL,
	`extra_type` text,
	`extra_runs` integer DEFAULT 0 NOT NULL,
	`extra_sub_type` text,
	`wicket_type` text,
	`player_out_id` text,
	`fielder_id` text,
	`incoming_batter_id` text,
	`incoming_at` text,
	`voided` integer DEFAULT false NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`device_id` text,
	`created_by` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `deliveries_innings_seq_uq` ON `deliveries` (`innings_id`,`seq`);--> statement-breakpoint
CREATE INDEX `deliveries_innings_idx` ON `deliveries` (`innings_id`);--> statement-breakpoint
CREATE TABLE `innings` (
	`id` text PRIMARY KEY NOT NULL,
	`match_id` text NOT NULL,
	`innings_no` integer NOT NULL,
	`batting_team_id` text NOT NULL,
	`bowling_team_id` text NOT NULL,
	`opening_striker_id` text NOT NULL,
	`opening_non_striker_id` text NOT NULL,
	`opening_bowler_id` text,
	`target` integer,
	`status` text DEFAULT 'in_progress' NOT NULL,
	`end_reason` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `matches` (
	`id` text PRIMARY KEY NOT NULL,
	`team_a_id` text NOT NULL,
	`team_b_id` text NOT NULL,
	`format` text DEFAULT 'T20' NOT NULL,
	`overs_per_innings` integer NOT NULL,
	`balls_per_over` integer DEFAULT 6 NOT NULL,
	`max_overs_per_bowler` integer DEFAULT 0 NOT NULL,
	`free_hit_enabled` integer DEFAULT true NOT NULL,
	`players_per_side` integer DEFAULT 11 NOT NULL,
	`scheduled_at` text NOT NULL,
	`venue` text,
	`stage` text,
	`tournament_name` text,
	`toss_winner_id` text,
	`toss_decision` text,
	`status` text DEFAULT 'upcoming' NOT NULL,
	`result_type` text,
	`winner_team_id` text,
	`margin_type` text,
	`margin_value` integer,
	`result_summary` text,
	`player_of_match_id` text,
	`scorer_id` text,
	`created_by` text NOT NULL,
	`archived_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `playing_xi` (
	`match_id` text NOT NULL,
	`player_id` text NOT NULL,
	`team_id` text NOT NULL,
	`batting_order` integer NOT NULL,
	`is_captain` integer DEFAULT false NOT NULL,
	`is_keeper` integer DEFAULT false NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	PRIMARY KEY(`match_id`, `player_id`)
);
--> statement-breakpoint
CREATE TABLE `score_corrections` (
	`id` text PRIMARY KEY NOT NULL,
	`delivery_id` text NOT NULL,
	`action` text NOT NULL,
	`old_json` text,
	`new_json` text,
	`reason` text,
	`edited_by` text,
	`edited_at` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
