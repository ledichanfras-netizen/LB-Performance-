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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      athletes: {
        Row: {
          competitive_level: string | null
          created_at: string
          dob: string
          gender: string | null
          goal: string | null
          id: string
          injuries: Json | null
          injury_history: string | null
          is_tournament_mode: boolean
          modality: string | null
          name: string
          periodization_end: string | null
          periodization_start: string | null
          photo_url: string | null
          position: string | null
          training_days: Json | null
          updated_at: string
          weekly_frequency: number | null
        }
        Insert: {
          competitive_level?: string | null
          created_at?: string
          dob: string
          gender?: string | null
          goal?: string | null
          id: string
          injuries?: Json | null
          injury_history?: string | null
          is_tournament_mode?: boolean
          modality?: string | null
          name: string
          periodization_end?: string | null
          periodization_start?: string | null
          photo_url?: string | null
          position?: string | null
          training_days?: Json | null
          updated_at?: string
          weekly_frequency?: number | null
        }
        Update: {
          competitive_level?: string | null
          created_at?: string
          dob?: string
          gender?: string | null
          goal?: string | null
          id?: string
          injuries?: Json | null
          injury_history?: string | null
          is_tournament_mode?: boolean
          modality?: string | null
          name?: string
          periodization_end?: string | null
          periodization_start?: string | null
          photo_url?: string | null
          position?: string | null
          training_days?: Json | null
          updated_at?: string
          weekly_frequency?: number | null
        }
        Relationships: []
      }
      bioimpedance: {
        Row: {
          athlete_id: string | null
          basal_metabolism: number | null
          bone_mass: number | null
          created_at: string
          date: string
          fat_arm_l: number | null
          fat_arm_r: number | null
          fat_leg_l: number | null
          fat_leg_r: number | null
          fat_percentage: number | null
          fat_trunk: number | null
          hydration: number | null
          id: string
          metabolic_age: number | null
          muscle_arm_l: number | null
          muscle_arm_r: number | null
          muscle_leg_l: number | null
          muscle_leg_r: number | null
          muscle_mass: number | null
          muscle_trunk: number | null
          observations: string | null
          physique_rating: number | null
          visceral_fat: number | null
          weight: number | null
        }
        Insert: {
          athlete_id?: string | null
          basal_metabolism?: number | null
          bone_mass?: number | null
          created_at?: string
          date: string
          fat_arm_l?: number | null
          fat_arm_r?: number | null
          fat_leg_l?: number | null
          fat_leg_r?: number | null
          fat_percentage?: number | null
          fat_trunk?: number | null
          hydration?: number | null
          id: string
          metabolic_age?: number | null
          muscle_arm_l?: number | null
          muscle_arm_r?: number | null
          muscle_leg_l?: number | null
          muscle_leg_r?: number | null
          muscle_mass?: number | null
          muscle_trunk?: number | null
          observations?: string | null
          physique_rating?: number | null
          visceral_fat?: number | null
          weight?: number | null
        }
        Update: {
          athlete_id?: string | null
          basal_metabolism?: number | null
          bone_mass?: number | null
          created_at?: string
          date?: string
          fat_arm_l?: number | null
          fat_arm_r?: number | null
          fat_leg_l?: number | null
          fat_leg_r?: number | null
          fat_percentage?: number | null
          fat_trunk?: number | null
          hydration?: number | null
          id?: string
          metabolic_age?: number | null
          muscle_arm_l?: number | null
          muscle_arm_r?: number | null
          muscle_leg_l?: number | null
          muscle_leg_r?: number | null
          muscle_mass?: number | null
          muscle_trunk?: number | null
          observations?: string | null
          physique_rating?: number | null
          visceral_fat?: number | null
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "bioimpedance_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
        ]
      }
      cmj: {
        Row: {
          athlete_id: string | null
          average_force: number | null
          created_at: string
          date: string
          depth: number | null
          flight_time: number | null
          height: number | null
          id: string
          observations: string | null
          power: number | null
          rsi: number | null
          weight: number | null
        }
        Insert: {
          athlete_id?: string | null
          average_force?: number | null
          created_at?: string
          date: string
          depth?: number | null
          flight_time?: number | null
          height?: number | null
          id: string
          observations?: string | null
          power?: number | null
          rsi?: number | null
          weight?: number | null
        }
        Update: {
          athlete_id?: string | null
          average_force?: number | null
          created_at?: string
          date?: string
          depth?: number | null
          flight_time?: number | null
          height?: number | null
          id?: string
          observations?: string | null
          power?: number | null
          rsi?: number | null
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "cmj_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
        ]
      }
      drop_jump: {
        Row: {
          athlete_id: string | null
          contact_time: number | null
          created_at: string
          date: string
          drop_height: number | null
          flight_time: number | null
          id: string
          jump_height: number | null
          mean_force: number | null
          mean_power: number | null
          observations: string | null
          rsi: number | null
          stiffness: number | null
          weight: number | null
        }
        Insert: {
          athlete_id?: string | null
          contact_time?: number | null
          created_at?: string
          date: string
          drop_height?: number | null
          flight_time?: number | null
          id: string
          jump_height?: number | null
          mean_force?: number | null
          mean_power?: number | null
          observations?: string | null
          rsi?: number | null
          stiffness?: number | null
          weight?: number | null
        }
        Update: {
          athlete_id?: string | null
          contact_time?: number | null
          created_at?: string
          date?: string
          drop_height?: number | null
          flight_time?: number | null
          id?: string
          jump_height?: number | null
          mean_force?: number | null
          mean_power?: number | null
          observations?: string | null
          rsi?: number | null
          stiffness?: number | null
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "drop_jump_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
        ]
      }
      external_sessions: {
        Row: {
          athlete_id: string | null
          created_at: string
          date: string
          duration_minutes: number | null
          id: string
          load: number | null
          notes: string | null
          rpe: number | null
          type: string | null
        }
        Insert: {
          athlete_id?: string | null
          created_at?: string
          date: string
          duration_minutes?: number | null
          id: string
          load?: number | null
          notes?: string | null
          rpe?: number | null
          type?: string | null
        }
        Update: {
          athlete_id?: string | null
          created_at?: string
          date?: string
          duration_minutes?: number | null
          id?: string
          load?: number | null
          notes?: string | null
          rpe?: number | null
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "external_sessions_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
        ]
      }
      general_strength: {
        Row: {
          athlete_id: string | null
          created_at: string
          date: string
          exercise: string | null
          id: string
          load: number | null
          observations: string | null
        }
        Insert: {
          athlete_id?: string | null
          created_at?: string
          date: string
          exercise?: string | null
          id: string
          load?: number | null
          observations?: string | null
        }
        Update: {
          athlete_id?: string | null
          created_at?: string
          date?: string
          exercise?: string | null
          id?: string
          load?: number | null
          observations?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "general_strength_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
        ]
      }
      imtp: {
        Row: {
          ai_details: Json | null
          athlete_id: string | null
          created_at: string
          date: string
          id: string
          impulse_100: number | null
          impulse_200: number | null
          impulse_300: number | null
          impulse_peak: number | null
          mean_force: number | null
          observations: string | null
          peak_force: number | null
          relative_peak_force: number | null
          rfd_100: number | null
          rfd_200: number | null
          rfd_300: number | null
          rfd_peak: number | null
          time_to_peak_force: number | null
          weight: number | null
        }
        Insert: {
          ai_details?: Json | null
          athlete_id?: string | null
          created_at?: string
          date: string
          id: string
          impulse_100?: number | null
          impulse_200?: number | null
          impulse_300?: number | null
          impulse_peak?: number | null
          mean_force?: number | null
          observations?: string | null
          peak_force?: number | null
          relative_peak_force?: number | null
          rfd_100?: number | null
          rfd_200?: number | null
          rfd_300?: number | null
          rfd_peak?: number | null
          time_to_peak_force?: number | null
          weight?: number | null
        }
        Update: {
          ai_details?: Json | null
          athlete_id?: string | null
          created_at?: string
          date?: string
          id?: string
          impulse_100?: number | null
          impulse_200?: number | null
          impulse_300?: number | null
          impulse_peak?: number | null
          mean_force?: number | null
          observations?: string | null
          peak_force?: number | null
          relative_peak_force?: number | null
          rfd_100?: number | null
          rfd_200?: number | null
          rfd_300?: number | null
          rfd_peak?: number | null
          time_to_peak_force?: number | null
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "imtp_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
        ]
      }
      isometric_strength: {
        Row: {
          athlete_id: string | null
          created_at: string
          date: string
          half_squat_kgf: number | null
          hamstrings_l: number | null
          hamstrings_r: number | null
          id: string
          iq_ratio_l: number | null
          iq_ratio_r: number | null
          observations: string | null
          quadriceps_l: number | null
          quadriceps_r: number | null
        }
        Insert: {
          athlete_id?: string | null
          created_at?: string
          date: string
          half_squat_kgf?: number | null
          hamstrings_l?: number | null
          hamstrings_r?: number | null
          id: string
          iq_ratio_l?: number | null
          iq_ratio_r?: number | null
          observations?: string | null
          quadriceps_l?: number | null
          quadriceps_r?: number | null
        }
        Update: {
          athlete_id?: string | null
          created_at?: string
          date?: string
          half_squat_kgf?: number | null
          hamstrings_l?: number | null
          hamstrings_r?: number | null
          id?: string
          iq_ratio_l?: number | null
          iq_ratio_r?: number | null
          observations?: string | null
          quadriceps_l?: number | null
          quadriceps_r?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "isometric_strength_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
        ]
      }
      performed_sets: {
        Row: {
          created_at: string
          exercise_id: string | null
          id: string
          is_completed: boolean
          reps: number | null
          rpe: number | null
          weight: number | null
        }
        Insert: {
          created_at?: string
          exercise_id?: string | null
          id: string
          is_completed?: boolean
          reps?: number | null
          rpe?: number | null
          weight?: number | null
        }
        Update: {
          created_at?: string
          exercise_id?: string | null
          id?: string
          is_completed?: boolean
          reps?: number | null
          rpe?: number | null
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "performed_sets_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "prescribed_exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      prescribed_exercises: {
        Row: {
          created_at: string
          id: string
          image_url: string | null
          muscle_group: string | null
          name: string | null
          notes: string | null
          order_index: number
          pain_level: number | null
          reps: string | null
          reps_type: string | null
          rest: string | null
          sets: number | null
          video_url: string | null
          weight: string | null
          workout_id: string | null
        }
        Insert: {
          created_at?: string
          id: string
          image_url?: string | null
          muscle_group?: string | null
          name?: string | null
          notes?: string | null
          order_index?: number
          pain_level?: number | null
          reps?: string | null
          reps_type?: string | null
          rest?: string | null
          sets?: number | null
          video_url?: string | null
          weight?: string | null
          workout_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string | null
          muscle_group?: string | null
          name?: string | null
          notes?: string | null
          order_index?: number
          pain_level?: number | null
          reps?: string | null
          reps_type?: string | null
          rest?: string | null
          sets?: number | null
          video_url?: string | null
          weight?: string | null
          workout_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prescribed_exercises_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "workouts"
            referencedColumns: ["id"]
          },
        ]
      }
      speed: {
        Row: {
          athlete_id: string | null
          created_at: string
          date: string
          id: string
          observations: string | null
          speed_10m: number | null
          speed_20m: number | null
          speed_30m: number | null
          speed_5m: number | null
          time_10m: number | null
          time_20m: number | null
          time_30m: number | null
          time_5m: number | null
        }
        Insert: {
          athlete_id?: string | null
          created_at?: string
          date: string
          id: string
          observations?: string | null
          speed_10m?: number | null
          speed_20m?: number | null
          speed_30m?: number | null
          speed_5m?: number | null
          time_10m?: number | null
          time_20m?: number | null
          time_30m?: number | null
          time_5m?: number | null
        }
        Update: {
          athlete_id?: string | null
          created_at?: string
          date?: string
          id?: string
          observations?: string | null
          speed_10m?: number | null
          speed_20m?: number | null
          speed_30m?: number | null
          speed_5m?: number | null
          time_10m?: number | null
          time_20m?: number | null
          time_30m?: number | null
          time_5m?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "speed_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          athlete_id: string | null
          auth_user_id: string | null
          created_at: string
          id: string
          password: string
          plan: string
          role: string
          username: string
        }
        Insert: {
          athlete_id?: string | null
          auth_user_id?: string | null
          created_at?: string
          id: string
          password: string
          plan?: string
          role: string
          username: string
        }
        Update: {
          athlete_id?: string | null
          auth_user_id?: string | null
          created_at?: string
          id?: string
          password?: string
          plan?: string
          role?: string
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "users_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
        ]
      }
      vo2max: {
        Row: {
          athlete_id: string | null
          created_at: string
          date: string
          id: string
          max_heart_rate: number | null
          max_speed: number | null
          max_ventilation: number | null
          observations: string | null
          rec_10s: number | null
          rec_30s: number | null
          rec_60s: number | null
          score: number | null
          threshold_heart_rate: number | null
          threshold_speed: number | null
          vam: number | null
          vo2max: number | null
        }
        Insert: {
          athlete_id?: string | null
          created_at?: string
          date: string
          id: string
          max_heart_rate?: number | null
          max_speed?: number | null
          max_ventilation?: number | null
          observations?: string | null
          rec_10s?: number | null
          rec_30s?: number | null
          rec_60s?: number | null
          score?: number | null
          threshold_heart_rate?: number | null
          threshold_speed?: number | null
          vam?: number | null
          vo2max?: number | null
        }
        Update: {
          athlete_id?: string | null
          created_at?: string
          date?: string
          id?: string
          max_heart_rate?: number | null
          max_speed?: number | null
          max_ventilation?: number | null
          observations?: string | null
          rec_10s?: number | null
          rec_30s?: number | null
          rec_60s?: number | null
          score?: number | null
          threshold_heart_rate?: number | null
          threshold_speed?: number | null
          vam?: number | null
          vo2max?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vo2max_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
        ]
      }
      wellness: {
        Row: {
          athlete_id: string | null
          calculated_sleep_hours: number | null
          cognitive_load: number | null
          created_at: string
          date: string
          emotional_readiness: number | null
          fatigue: number | null
          hrv: number | null
          id: string
          is_match_day: boolean | null
          menstrual_phase: string | null
          menstrual_symptoms: Json | null
          mood: number | null
          psychological_readiness: number | null
          psychology_notes: string | null
          readiness_score: number | null
          sleep: number | null
          sleep_hours_formatted: string | null
          sleep_quality: number | null
          sleep_start_time: string | null
          soreness: number | null
          stress: number | null
          travel_fatigue: number | null
          wake_up_time: string | null
        }
        Insert: {
          athlete_id?: string | null
          calculated_sleep_hours?: number | null
          cognitive_load?: number | null
          created_at?: string
          date: string
          emotional_readiness?: number | null
          fatigue?: number | null
          hrv?: number | null
          id: string
          is_match_day?: boolean | null
          menstrual_phase?: string | null
          menstrual_symptoms?: Json | null
          mood?: number | null
          psychological_readiness?: number | null
          psychology_notes?: string | null
          readiness_score?: number | null
          sleep?: number | null
          sleep_hours_formatted?: string | null
          sleep_quality?: number | null
          sleep_start_time?: string | null
          soreness?: number | null
          stress?: number | null
          travel_fatigue?: number | null
          wake_up_time?: string | null
        }
        Update: {
          athlete_id?: string | null
          calculated_sleep_hours?: number | null
          cognitive_load?: number | null
          created_at?: string
          date?: string
          emotional_readiness?: number | null
          fatigue?: number | null
          hrv?: number | null
          id?: string
          is_match_day?: boolean | null
          menstrual_phase?: string | null
          menstrual_symptoms?: Json | null
          mood?: number | null
          psychological_readiness?: number | null
          psychology_notes?: string | null
          readiness_score?: number | null
          sleep?: number | null
          sleep_hours_formatted?: string | null
          sleep_quality?: number | null
          sleep_start_time?: string | null
          soreness?: number | null
          stress?: number | null
          travel_fatigue?: number | null
          wake_up_time?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wellness_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
        ]
      }
      workouts: {
        Row: {
          athlete_id: string | null
          created_at: string
          date: string
          duration_minutes: number | null
          feedback: string | null
          id: string
          monotony: number | null
          name: string | null
          phase: string | null
          rpe: number | null
          status: string | null
          strain: number | null
          total_load: number | null
          trainer_notes: string | null
          updated_at: string
        }
        Insert: {
          athlete_id?: string | null
          created_at?: string
          date: string
          duration_minutes?: number | null
          feedback?: string | null
          id: string
          monotony?: number | null
          name?: string | null
          phase?: string | null
          rpe?: number | null
          status?: string | null
          strain?: number | null
          total_load?: number | null
          trainer_notes?: string | null
          updated_at?: string
        }
        Update: {
          athlete_id?: string | null
          created_at?: string
          date?: string
          duration_minutes?: number | null
          feedback?: string | null
          id?: string
          monotony?: number | null
          name?: string | null
          phase?: string | null
          rpe?: number | null
          status?: string | null
          strain?: number | null
          total_load?: number | null
          trainer_notes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workouts_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
