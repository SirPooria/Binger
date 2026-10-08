export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string | null;
          bio: string | null;
          created_at: string;
          updated_at: string | null;
          email: string | null;
          avatar_url: string | null;
          phone: string | null;
          role: string | null;
          is_vip: boolean | null;
        };
        Insert: {
          id: string;
          username?: string | null;
          bio?: string | null;
          created_at?: string;
          updated_at?: string | null;
          email?: string | null;
          avatar_url?: string | null;
          phone?: string | null;
          role?: string | null;
          is_vip?: boolean | null;
        };
        Update: {
          id?: string;
          username?: string | null;
          bio?: string | null;
          created_at?: string;
          updated_at?: string | null;
          email?: string | null;
          avatar_url?: string | null;
          phone?: string | null;
          role?: string | null;
          is_vip?: boolean | null;
        };
        Relationships: [];
      };
      comments: {
        Row: {
          id: number;
          user_id: string;
          show_id: number | null;
          episode_id: number | null;
          content: string | null;
          created_at: string;
          parent_id: number | null;
        };
        Insert: {
          id?: number;
          user_id: string;
          show_id?: number | null;
          episode_id?: number | null;
          content?: string | null;
          created_at?: string;
          parent_id?: number | null;
        };
        Update: {
          id?: number;
          user_id?: string;
          show_id?: number | null;
          episode_id?: number | null;
          content?: string | null;
          created_at?: string;
          parent_id?: number | null;
        };
        Relationships: [];
      };
      watched: {
        Row: {
          id: number;
          user_id: string;
          show_id: number;
          episode_id: number | null;
          created_at: string;
        };
        Insert: {
          id?: number;
          user_id: string;
          show_id: number;
          episode_id?: number | null;
          created_at?: string;
        };
        Update: {
          id?: number;
          user_id?: string;
          show_id?: number;
          episode_id?: number | null;
          created_at?: string;
        };
        Relationships: [];
      };
      favorites: {
        Row: {
          id: number;
          user_id: string;
          show_id: number;
          created_at: string;
        };
        Insert: {
          id?: number;
          user_id: string;
          show_id: number;
          created_at?: string;
        };
        Update: {
          id?: number;
          user_id?: string;
          show_id?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      follows: {
        Row: {
          id: number;
          follower_id: string;
          following_id: string;
          follower_email: string | null;
          following_email: string | null;
          created_at: string;
        };
        Insert: {
          id?: number;
          follower_id: string;
          following_id: string;
          follower_email?: string | null;
          following_email?: string | null;
          created_at?: string;
        };
        Update: {
          id?: number;
          follower_id?: string;
          following_id?: string;
          follower_email?: string | null;
          following_email?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      user_lists: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          description: string | null;
          is_public: boolean;
          order_index: number;
          is_pinned: boolean | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          description?: string | null;
          is_public?: boolean;
          order_index?: number;
          is_pinned?: boolean | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          description?: string | null;
          is_public?: boolean;
          order_index?: number;
          is_pinned?: boolean | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      list_items: {
        Row: {
          id: number;
          list_id: string;
          show_id: number;
          show_name: string | null;
          poster_path: string | null;
          created_at: string;
        };
        Insert: {
          id?: number;
          list_id: string;
          show_id: number;
          show_name?: string | null;
          poster_path?: string | null;
          created_at?: string;
        };
        Update: {
          id?: number;
          list_id?: string;
          show_id?: number;
          show_name?: string | null;
          poster_path?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "list_items_list_id_fkey";
            columns: ["list_id"];
            isOneToOne: false;
            referencedRelation: "user_lists";
            referencedColumns: ["id"];
          }
        ];
      };
      list_saves: {
        Row: {
          id: number;
          list_id: string;
          user_id: string;
          created_at: string;
        };
        Insert: {
          id?: number;
          list_id: string;
          user_id: string;
          created_at?: string;
        };
        Update: {
          id?: number;
          list_id?: string;
          user_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      episode_ratings: {
        Row: {
          id: number;
          user_id: string;
          show_id: number;
          episode_id: number;
          rating: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: number;
          user_id: string;
          show_id: number;
          episode_id: number;
          rating: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: number;
          user_id?: string;
          show_id?: number;
          episode_id?: number;
          rating?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      comment_likes: {
        Row: {
          id: number;
          comment_id: number;
          user_id: string;
          created_at: string;
        };
        Insert: {
          id?: number;
          comment_id: number;
          user_id: string;
          created_at?: string;
        };
        Update: {
          id?: number;
          comment_id?: number;
          user_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      achievement_events: {
        Row: {
          id: number;
          user_id: string;
          event_type: string;
          show_id: number | null;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: number;
          user_id: string;
          event_type: string;
          show_id?: number | null;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: number;
          user_id?: string;
          event_type?: string;
          show_id?: number | null;
          metadata?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
      mood_ai_usage: {
        Row: {
          user_id: string;
          usage_date: string;
          request_count: number;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          usage_date?: string;
          request_count?: number;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          usage_date?: string;
          request_count?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      waitlist: {
        Row: {
          id: number;
          phone: string;
          created_at: string;
        };
        Insert: {
          id?: number;
          phone: string;
          created_at?: string;
        };
        Update: {
          id?: number;
          phone?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      sms_logs: {
        Row: {
          id: number;
          phone: string;
          code: string | null;
          status: string;
          provider: string;
          rec_id: string | null;
          error_message: string | null;
          ip_address: string | null;
          created_at: string;
        };
        Insert: {
          id?: number;
          phone: string;
          code?: string | null;
          status?: string;
          provider?: string;
          rec_id?: string | null;
          error_message?: string | null;
          ip_address?: string | null;
          created_at?: string;
        };
        Update: {
          id?: number;
          phone?: string;
          code?: string | null;
          status?: string;
          provider?: string;
          rec_id?: string | null;
          error_message?: string | null;
          ip_address?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      cached_shows: {
        Row: {
          id: number;
          data: Json;
          updated_at: string;
        };
        Insert: {
          id: number;
          data: Json;
          updated_at?: string;
        };
        Update: {
          id?: number;
          data?: Json;
          updated_at?: string;
        };
        Relationships: [];
      };
      posts: {
        Row: {
          id: number;
          title: string;
          slug: string;
          content: string;
          cover_image: string | null;
          author_id: string | null;
          published: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: number;
          title: string;
          slug: string;
          content?: string;
          cover_image?: string | null;
          author_id?: string | null;
          published?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: number;
          title?: string;
          slug?: string;
          content?: string;
          cover_image?: string | null;
          author_id?: string | null;
          published?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "posts_author_id_fkey";
            columns: ["author_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      watched_movies: {
        Row: {
          id: number;
          user_id: string;
          movie_id: number;
          movie_title: string | null;
          poster_path: string | null;
          runtime_minutes: number | null;
          created_at: string;
        };
        Insert: {
          id?: number;
          user_id: string;
          movie_id: number;
          movie_title?: string | null;
          poster_path?: string | null;
          runtime_minutes?: number | null;
          created_at?: string;
        };
        Update: {
          id?: number;
          user_id?: string;
          movie_id?: number;
          movie_title?: string | null;
          poster_path?: string | null;
          runtime_minutes?: number | null;
          created_at?: string;
        };
        Relationships: [];
      };
      watchlist_movies: {
        Row: {
          id: number;
          user_id: string;
          movie_id: number;
          movie_title: string | null;
          poster_path: string | null;
          created_at: string;
        };
        Insert: {
          id?: number;
          user_id: string;
          movie_id: number;
          movie_title?: string | null;
          poster_path?: string | null;
          created_at?: string;
        };
        Update: {
          id?: number;
          user_id?: string;
          movie_id?: number;
          movie_title?: string | null;
          poster_path?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      favorite_movies: {
        Row: {
          id: number;
          user_id: string;
          movie_id: number;
          movie_title: string | null;
          poster_path: string | null;
          created_at: string;
        };
        Insert: {
          id?: number;
          user_id: string;
          movie_id: number;
          movie_title?: string | null;
          poster_path?: string | null;
          created_at?: string;
        };
        Update: {
          id?: number;
          user_id?: string;
          movie_id?: number;
          movie_title?: string | null;
          poster_path?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      cached_movies: {
        Row: {
          id: number;
          data: Json;
          updated_at: string;
        };
        Insert: {
          id: number;
          data: Json;
          updated_at?: string;
        };
        Update: {
          id?: number;
          data?: Json;
          updated_at?: string;
        };
        Relationships: [];
      };
      movie_comments: {
        Row: {
          id: number;
          user_id: string;
          movie_id: number;
          content: string;
          created_at: string;
          parent_id: number | null;
        };
        Insert: {
          id?: number;
          user_id: string;
          movie_id: number;
          content: string;
          created_at?: string;
          parent_id?: number | null;
        };
        Update: {
          id?: number;
          user_id?: string;
          movie_id?: number;
          content?: string;
          created_at?: string;
          parent_id?: number | null;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      get_mood_ai_status: {
        Args: Record<PropertyKey, never>;
        Returns: { is_vip: boolean; remaining: number | null };
      };
      consume_mood_ai_credit: {
        Args: Record<PropertyKey, never>;
        Returns: { allowed: boolean; is_vip: boolean; remaining: number | null };
      };
      restore_mood_ai_credit: {
        Args: Record<PropertyKey, never>;
        Returns: { success: boolean; restored: boolean; remaining: number };
      };
      record_achievement_event: {
        Args: {
          p_event_type: string;
          p_show_id?: number | null;
          p_metadata?: Json;
        };
        Returns: { success: boolean; recorded: boolean; reason?: string };
      };
      get_global_leaderboard: {
        Args: {
          p_limit?: number;
          p_offset?: number;
        };
        Returns: {
          user_id: string;
          username: string;
          avatar_url: string;
          is_vip: boolean;
          score: number;
          rank: number;
          episodes_count: number;
          comments_count: number;
          followers_count: number;
        }[];
      };
      create_custom_list: {
        Args: {
          p_title: string;
          p_description?: string;
          p_is_public?: boolean;
        };
        Returns: {
          allowed: boolean;
          list_id?: string;
          is_vip?: boolean;
          reason?: string;
          limit?: number;
        };
      };
      pin_custom_list: {
        Args: {
          p_list_id: string;
        };
        Returns: {
          allowed: boolean;
          list_id?: string;
          reason?: string;
        };
      };
      is_admin: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      get_top_watched_shows: {
        Args: {
          p_limit?: number;
        };
        Returns: {
          show_id: number;
          view_count: number;
        }[];
      };
      get_power_users: {
        Args: {
          p_limit?: number;
        };
        Returns: {
          user_id: string;
          username: string | null;
          avatar_url: string | null;
          phone: string | null;
          watched_count: number;
        }[];
      };
      get_most_discussed_shows: {
        Args: {
          p_limit?: number;
        };
        Returns: {
          show_id: number;
          comment_count: number;
        }[];
      };
      get_30_day_growth: {
        Args: Record<PropertyKey, never>;
        Returns: {
          date: string;
          new_users: number;
          episodes_watched: number;
        }[];
      };
      get_churning_users: {
        Args: {
          p_limit?: number;
        };
        Returns: {
          user_id: string;
          username: string | null;
          phone: string | null;
          last_active: string;
        }[];
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];
export type Enums<T extends keyof Database['public']['Enums']> =
  Database['public']['Enums'][T];