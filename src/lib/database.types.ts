export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type UserRole = 'admin' | 'scorer' | 'team_manager' | 'player' | 'viewer';
export type PlayerRole = 'BAT' | 'BOWL' | 'AR' | 'WK';
export type BattingStyle = 'right' | 'left';
export type MatchFormat = 'T20' | 'ODI' | 'CUSTOM';
export type MatchStatus =
  'upcoming' | 'live' | 'innings_break' | 'completed' | 'abandoned' | 'no_result';
export type TossDecision = 'bat' | 'bowl';
export type ResultType = 'win' | 'tie' | 'no_result' | 'abandoned';
export type MarginType = 'runs' | 'wickets';
export type ExtraType = 'WIDE' | 'NO_BALL' | 'BYE' | 'LEG_BYE';
export type WicketType =
  | 'BOWLED'
  | 'CAUGHT'
  | 'LBW'
  | 'RUN_OUT'
  | 'STUMPED'
  | 'HIT_WICKET'
  | 'OBSTRUCTING'
  | 'HIT_TWICE'
  | 'RETIRED_HURT'
  | 'RETIRED_OUT';
export type InningsStatus = 'in_progress' | 'completed';
export type InningsEndReason =
  'ALL_OUT' | 'OVERS_COMPLETE' | 'TARGET_REACHED' | 'DECLARED' | 'MANUAL';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string;
          avatar_url: string | null;
          phone: string | null;
          roles: UserRole[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string;
          avatar_url?: string | null;
          phone?: string | null;
          roles?: UserRole[];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string;
          avatar_url?: string | null;
          phone?: string | null;
          roles?: UserRole[];
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      teams: {
        Row: {
          id: string;
          name: string;
          short_name: string;
          logo_url: string | null;
          colour: string | null;
          location: string | null;
          description: string | null;
          created_by: string;
          archived_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          short_name: string;
          logo_url?: string | null;
          colour?: string | null;
          location?: string | null;
          description?: string | null;
          created_by: string;
          archived_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          short_name?: string;
          logo_url?: string | null;
          colour?: string | null;
          location?: string | null;
          description?: string | null;
          created_by?: string;
          archived_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'teams_created_by_fkey';
            columns: ['created_by'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      players: {
        Row: {
          id: string;
          name: string;
          photo_url: string | null;
          role: PlayerRole;
          batting_style: BattingStyle | null;
          bowling_style: string | null;
          date_of_birth: string | null;
          linked_profile_id: string | null;
          created_by: string;
          archived_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          photo_url?: string | null;
          role?: PlayerRole;
          batting_style?: BattingStyle | null;
          bowling_style?: string | null;
          date_of_birth?: string | null;
          linked_profile_id?: string | null;
          created_by: string;
          archived_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          photo_url?: string | null;
          role?: PlayerRole;
          batting_style?: BattingStyle | null;
          bowling_style?: string | null;
          date_of_birth?: string | null;
          linked_profile_id?: string | null;
          created_by?: string;
          archived_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'players_created_by_fkey';
            columns: ['created_by'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'players_linked_profile_id_fkey';
            columns: ['linked_profile_id'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      team_players: {
        Row: {
          team_id: string;
          player_id: string;
          jersey_no: number | null;
          is_captain: boolean;
          is_vice_captain: boolean;
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          team_id: string;
          player_id: string;
          jersey_no?: number | null;
          is_captain?: boolean;
          is_vice_captain?: boolean;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          team_id?: string;
          player_id?: string;
          jersey_no?: number | null;
          is_captain?: boolean;
          is_vice_captain?: boolean;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'team_players_team_id_fkey';
            columns: ['team_id'];
            referencedRelation: 'teams';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'team_players_player_id_fkey';
            columns: ['player_id'];
            referencedRelation: 'players';
            referencedColumns: ['id'];
          },
        ];
      };
      matches: {
        Row: {
          id: string;
          team_a_id: string;
          team_b_id: string;
          format: MatchFormat;
          overs_per_innings: number;
          balls_per_over: number;
          max_overs_per_bowler: number;
          free_hit_enabled: boolean;
          players_per_side: number;
          scheduled_at: string;
          venue: string | null;
          stage: string | null;
          tournament_name: string | null;
          toss_winner_id: string | null;
          toss_decision: TossDecision | null;
          status: MatchStatus;
          result_type: ResultType | null;
          winner_team_id: string | null;
          margin_type: MarginType | null;
          margin_value: number | null;
          result_summary: string | null;
          player_of_match_id: string | null;
          scorer_id: string | null;
          created_by: string;
          archived_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          team_a_id: string;
          team_b_id: string;
          format?: MatchFormat;
          overs_per_innings: number;
          balls_per_over?: number;
          max_overs_per_bowler?: number;
          free_hit_enabled?: boolean;
          players_per_side?: number;
          scheduled_at: string;
          venue?: string | null;
          stage?: string | null;
          tournament_name?: string | null;
          toss_winner_id?: string | null;
          toss_decision?: TossDecision | null;
          status?: MatchStatus;
          result_type?: ResultType | null;
          winner_team_id?: string | null;
          margin_type?: MarginType | null;
          margin_value?: number | null;
          result_summary?: string | null;
          player_of_match_id?: string | null;
          scorer_id?: string | null;
          created_by: string;
          archived_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          team_a_id?: string;
          team_b_id?: string;
          format?: MatchFormat;
          overs_per_innings?: number;
          balls_per_over?: number;
          max_overs_per_bowler?: number;
          free_hit_enabled?: boolean;
          players_per_side?: number;
          scheduled_at?: string;
          venue?: string | null;
          stage?: string | null;
          tournament_name?: string | null;
          toss_winner_id?: string | null;
          toss_decision?: TossDecision | null;
          status?: MatchStatus;
          result_type?: ResultType | null;
          winner_team_id?: string | null;
          margin_type?: MarginType | null;
          margin_value?: number | null;
          result_summary?: string | null;
          player_of_match_id?: string | null;
          scorer_id?: string | null;
          created_by?: string;
          archived_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      playing_xi: {
        Row: {
          match_id: string;
          player_id: string;
          team_id: string;
          batting_order: number;
          is_captain: boolean;
          is_keeper: boolean;
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          match_id: string;
          player_id: string;
          team_id: string;
          batting_order: number;
          is_captain?: boolean;
          is_keeper?: boolean;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          match_id?: string;
          player_id?: string;
          team_id?: string;
          batting_order?: number;
          is_captain?: boolean;
          is_keeper?: boolean;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      innings: {
        Row: {
          id: string;
          match_id: string;
          innings_no: number;
          batting_team_id: string;
          bowling_team_id: string;
          opening_striker_id: string;
          opening_non_striker_id: string;
          opening_bowler_id: string | null;
          target: number | null;
          status: InningsStatus;
          end_reason: InningsEndReason | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          match_id: string;
          innings_no: number;
          batting_team_id: string;
          bowling_team_id: string;
          opening_striker_id: string;
          opening_non_striker_id: string;
          opening_bowler_id?: string | null;
          target?: number | null;
          status?: InningsStatus;
          end_reason?: InningsEndReason | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          match_id?: string;
          innings_no?: number;
          batting_team_id?: string;
          bowling_team_id?: string;
          opening_striker_id?: string;
          opening_non_striker_id?: string;
          opening_bowler_id?: string | null;
          target?: number | null;
          status?: InningsStatus;
          end_reason?: InningsEndReason | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      deliveries: {
        Row: {
          id: string;
          innings_id: string;
          seq: number;
          kind: string;
          striker_id: string;
          non_striker_id: string;
          bowler_id: string;
          runs_off_bat: number;
          is_boundary: boolean;
          extra_type: ExtraType | null;
          extra_runs: number;
          extra_sub_type: string | null;
          wicket_type: WicketType | null;
          player_out_id: string | null;
          fielder_id: string | null;
          incoming_batter_id: string | null;
          incoming_at: string | null;
          voided: boolean;
          version: number;
          device_id: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          innings_id: string;
          seq: number;
          kind?: string;
          striker_id: string;
          non_striker_id: string;
          bowler_id: string;
          runs_off_bat?: number;
          is_boundary?: boolean;
          extra_type?: ExtraType | null;
          extra_runs?: number;
          extra_sub_type?: string | null;
          wicket_type?: WicketType | null;
          player_out_id?: string | null;
          fielder_id?: string | null;
          incoming_batter_id?: string | null;
          incoming_at?: string | null;
          voided?: boolean;
          version?: number;
          device_id?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          innings_id?: string;
          seq?: number;
          kind?: string;
          striker_id?: string;
          non_striker_id?: string;
          bowler_id?: string;
          runs_off_bat?: number;
          is_boundary?: boolean;
          extra_type?: ExtraType | null;
          extra_runs?: number;
          extra_sub_type?: string | null;
          wicket_type?: WicketType | null;
          player_out_id?: string | null;
          fielder_id?: string | null;
          incoming_batter_id?: string | null;
          incoming_at?: string | null;
          voided?: boolean;
          version?: number;
          device_id?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      score_corrections: {
        Row: {
          id: string;
          delivery_id: string;
          action: 'UNDO' | 'EDIT' | 'REINSTATE';
          old_json: Json | null;
          new_json: Json | null;
          reason: string | null;
          edited_by: string | null;
          edited_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          delivery_id: string;
          action: 'UNDO' | 'EDIT' | 'REINSTATE';
          old_json?: Json | null;
          new_json?: Json | null;
          reason?: string | null;
          edited_by?: string | null;
          edited_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          delivery_id?: string;
          action?: 'UNDO' | 'EDIT' | 'REINSTATE';
          old_json?: Json | null;
          new_json?: Json | null;
          reason?: string | null;
          edited_by?: string | null;
          edited_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      has_role: {
        Args: {
          r: UserRole;
        };
        Returns: boolean;
      };
      can_manage_match: {
        Args: {
          m: string;
        };
        Returns: boolean;
      };
      can_manage_innings: {
        Args: {
          i: string;
        };
        Returns: boolean;
      };
      can_manage_delivery: {
        Args: {
          d: string;
        };
        Returns: boolean;
      };
    };
    Enums: {
      user_role: UserRole;
      player_role: PlayerRole;
      batting_style: BattingStyle;
      match_format: MatchFormat;
      match_status: MatchStatus;
      toss_decision: TossDecision;
      result_type: ResultType;
      margin_type: MarginType;
      extra_type: ExtraType;
      wicket_type: WicketType;
      innings_status: InningsStatus;
      innings_end_reason: InningsEndReason;
    };
  };
}
