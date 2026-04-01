export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      drive_participants: {
        Row: {
          drive_id: string
          id: string
          joined_at: string
          user_id: string
        }
        Insert: {
          drive_id: string
          id?: string
          joined_at?: string
          user_id: string
        }
        Update: {
          drive_id?: string
          id?: string
          joined_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "drive_participants_drive_id_fkey"
            columns: ["drive_id"]
            isOneToOne: false
            referencedRelation: "plantation_drives"
            referencedColumns: ["id"]
          },
        ]
      }
      growth_updates: {
        Row: {
          ai_health_status: string | null
          created_at: string
          id: string
          notes: string | null
          photo_url: string | null
          points_awarded: number | null
          tree_id: string
          update_day: number
          user_id: string
        }
        Insert: {
          ai_health_status?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          photo_url?: string | null
          points_awarded?: number | null
          tree_id: string
          update_day: number
          user_id: string
        }
        Update: {
          ai_health_status?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          photo_url?: string | null
          points_awarded?: number | null
          tree_id?: string
          update_day?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "growth_updates_tree_id_fkey"
            columns: ["tree_id"]
            isOneToOne: false
            referencedRelation: "trees"
            referencedColumns: ["id"]
          },
        ]
      }
      plantation_drives: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          event_date: string
          event_name: string
          id: string
          latitude: number | null
          location: string
          longitude: number | null
          organizer_name: string
          target_trees: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          event_date: string
          event_name: string
          id?: string
          latitude?: number | null
          location: string
          longitude?: number | null
          organizer_name: string
          target_trees?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          event_date?: string
          event_name?: string
          id?: string
          latitude?: number | null
          location?: string
          longitude?: number | null
          organizer_name?: string
          target_trees?: number
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          green_points: number
          id: string
          team_id: string | null
          trees_planted: number
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          green_points?: number
          id: string
          team_id?: string | null
          trees_planted?: number
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          green_points?: number
          id?: string
          team_id?: string | null
          trees_planted?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          id: string
          joined_at: string
          team_id: string
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          team_id: string
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          name: string
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          type?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      tree_health_updates: {
        Row: {
          created_at: string
          health_status: string
          id: string
          notes: string | null
          photo_url: string | null
          tree_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          health_status?: string
          id?: string
          notes?: string | null
          photo_url?: string | null
          tree_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          health_status?: string
          id?: string
          notes?: string | null
          photo_url?: string | null
          tree_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tree_health_updates_tree_id_fkey"
            columns: ["tree_id"]
            isOneToOne: false
            referencedRelation: "trees"
            referencedColumns: ["id"]
          },
        ]
      }
      trees: {
        Row: {
          admin_status: string
          ai_analysis: string | null
          ai_confidence: number | null
          ai_detected_species: string | null
          ai_scientific_name: string | null
          ai_species_confidence: number | null
          before_photo_url: string | null
          created_at: string
          description: string | null
          device_fingerprint: string | null
          drive_id: string | null
          exif_timestamp: string | null
          height_cm: number
          id: string
          latitude: number | null
          location: string
          longitude: number | null
          photo_hash: string | null
          photo_url: string | null
          plantation_date: string
          points_awarded: number
          selfie_photo_url: string | null
          species: string
          tree_name: string
          updated_at: string
          user_id: string | null
          verification_status: string
        }
        Insert: {
          admin_status?: string
          ai_analysis?: string | null
          ai_confidence?: number | null
          ai_detected_species?: string | null
          ai_scientific_name?: string | null
          ai_species_confidence?: number | null
          before_photo_url?: string | null
          created_at?: string
          description?: string | null
          device_fingerprint?: string | null
          drive_id?: string | null
          exif_timestamp?: string | null
          height_cm: number
          id?: string
          latitude?: number | null
          location: string
          longitude?: number | null
          photo_hash?: string | null
          photo_url?: string | null
          plantation_date: string
          points_awarded?: number
          selfie_photo_url?: string | null
          species: string
          tree_name: string
          updated_at?: string
          user_id?: string | null
          verification_status?: string
        }
        Update: {
          admin_status?: string
          ai_analysis?: string | null
          ai_confidence?: number | null
          ai_detected_species?: string | null
          ai_scientific_name?: string | null
          ai_species_confidence?: number | null
          before_photo_url?: string | null
          created_at?: string
          description?: string | null
          device_fingerprint?: string | null
          drive_id?: string | null
          exif_timestamp?: string | null
          height_cm?: number
          id?: string
          latitude?: number | null
          location?: string
          longitude?: number | null
          photo_hash?: string | null
          photo_url?: string | null
          plantation_date?: string
          points_awarded?: number
          selfie_photo_url?: string | null
          species?: string
          tree_name?: string
          updated_at?: string
          user_id?: string | null
          verification_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "trees_drive_id_fkey"
            columns: ["drive_id"]
            isOneToOne: false
            referencedRelation: "plantation_drives"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user" | "government"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user", "government"],
    },
  },
} as const
