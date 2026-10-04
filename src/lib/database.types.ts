export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type UserRole = 'admin' | 'scorer' | 'team_manager' | 'player' | 'viewer';
export type PlayerRole = 'BAT' | 'BOWL' | 'AR' | 'WK';
export type BattingStyle = 'right' | 'left';

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
    };
    Enums: {
      user_role: UserRole;
      player_role: PlayerRole;
      batting_style: BattingStyle;
    };
  };
}
