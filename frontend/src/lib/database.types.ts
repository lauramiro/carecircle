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
      appointments: {
        Row: {
          appointment_type: string | null
          attendees: string[] | null
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          end_time: string
          id: string
          is_virtual: boolean | null
          location: string | null
          notes: string | null
          patient_id: string
          post_appointment_notes: string | null
          provider_id: string | null
          provider_name: string | null
          reminder_offsets: number[] | null
          reminder_sent: boolean | null
          reminder_sent_at: string | null
          start_time: string
          status: string | null
          timezone: string | null
          title: string
          updated_at: string | null
          virtual_meeting_link: string | null
        }
        Insert: {
          appointment_type?: string | null
          attendees?: string[] | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_time: string
          id?: string
          is_virtual?: boolean | null
          location?: string | null
          notes?: string | null
          patient_id: string
          post_appointment_notes?: string | null
          provider_id?: string | null
          provider_name?: string | null
          reminder_offsets?: number[] | null
          reminder_sent?: boolean | null
          reminder_sent_at?: string | null
          start_time: string
          status?: string | null
          timezone?: string | null
          title: string
          updated_at?: string | null
          virtual_meeting_link?: string | null
        }
        Update: {
          appointment_type?: string | null
          attendees?: string[] | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_time?: string
          id?: string
          is_virtual?: boolean | null
          location?: string | null
          notes?: string | null
          patient_id?: string
          post_appointment_notes?: string | null
          provider_id?: string | null
          provider_name?: string | null
          reminder_offsets?: number[] | null
          reminder_sent?: boolean | null
          reminder_sent_at?: string | null
          start_time?: string
          status?: string | null
          timezone?: string | null
          title?: string
          updated_at?: string | null
          virtual_meeting_link?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointments_cancelled_by_fkey"
            columns: ["cancelled_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          changes: Json | null
          created_at: string | null
          entity_id: string | null
          entity_type: string
          id: string
          metadata: Json | null
          user_id: string | null
        }
        Insert: {
          action: string
          changes?: Json | null
          created_at?: string | null
          entity_id?: string | null
          entity_type: string
          id?: string
          metadata?: Json | null
          user_id?: string | null
        }
        Update: {
          action?: string
          changes?: Json | null
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          metadata?: Json | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      care_givers: {
        Row: {
          can_communicate: boolean | null
          can_schedule: boolean | null
          can_view_medical: boolean | null
          caregiver_id: string
          group_id: string
          id: string
          joined_at: string
          patient_id: string
          relationship: string | null
          role_in_care: Database["public"]["Enums"]["member_role"] | null
          status: string
          updated_at: string
        }
        Insert: {
          can_communicate?: boolean | null
          can_schedule?: boolean | null
          can_view_medical?: boolean | null
          caregiver_id: string
          group_id: string
          id?: string
          joined_at?: string
          patient_id: string
          relationship?: string | null
          role_in_care?: Database["public"]["Enums"]["member_role"] | null
          status: string
          updated_at?: string
        }
        Update: {
          can_communicate?: boolean | null
          can_schedule?: boolean | null
          can_view_medical?: boolean | null
          caregiver_id?: string
          group_id?: string
          id?: string
          joined_at?: string
          patient_id?: string
          relationship?: string | null
          role_in_care?: Database["public"]["Enums"]["member_role"] | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "care_givers_caregiver_id_fkey"
            columns: ["caregiver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "care_givers_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "care_group"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "care_givers_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      care_group: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string | null
          patient_id: string
          preferred_timezone: string | null
          primary_caregiver_id: string
          role: Database["public"]["Enums"]["group_member_role"]
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string | null
          patient_id: string
          preferred_timezone?: string | null
          primary_caregiver_id: string
          role?: Database["public"]["Enums"]["group_member_role"]
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string | null
          patient_id?: string
          preferred_timezone?: string | null
          primary_caregiver_id?: string
          role?: Database["public"]["Enums"]["group_member_role"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "care_circle_members_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "care_group_primary_caregiver_id_fkey"
            columns: ["primary_caregiver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      care_plans: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          end_date: string | null
          goals: string[] | null
          id: string
          patient_id: string
          review_date: string | null
          start_date: string
          status: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          goals?: string[] | null
          id?: string
          patient_id: string
          review_date?: string | null
          start_date: string
          status?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          goals?: string[] | null
          id?: string
          patient_id?: string
          review_date?: string | null
          start_date?: string
          status?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "care_plans_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "care_plans_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      care_recipients: {
        Row: {
          allergies: Json
          avatar_url: string | null
          conditions: Json
          created_at: string
          date_of_birth: string
          full_name: string
          group_id: string | null
          id: string
          updated_at: string
        }
        Insert: {
          allergies?: Json
          avatar_url?: string | null
          conditions?: Json
          created_at?: string
          date_of_birth: string
          full_name: string
          group_id?: string | null
          id?: string
          updated_at?: string
        }
        Update: {
          allergies?: Json
          avatar_url?: string | null
          conditions?: Json
          created_at?: string
          date_of_birth?: string
          full_name?: string
          group_id?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "care_recipients_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "care_group"
            referencedColumns: ["id"]
          },
        ]
      }
      checklist_items: {
        Row: {
          checklist_id: string
          created_at: string | null
          dosage_unit: string | null
          dose: number | null
          given_at: string | null
          given_by_carer_id: string | null
          given_by_user_id: string | null
          given_notes: string | null
          id: string
          medication_id: string
          medication_name: string | null
          overdue_hours: number | null
          overdue_minutes: number | null
          scheduled_time: string | null
          skip_notes: string | null
          skip_reason: string | null
          status: string
          time_of_day: string
          updated_at: string | null
          window_end: string
          window_start: string
        }
        Insert: {
          checklist_id: string
          created_at?: string | null
          dosage_unit?: string | null
          dose?: number | null
          given_at?: string | null
          given_by_carer_id?: string | null
          given_by_user_id?: string | null
          given_notes?: string | null
          id?: string
          medication_id: string
          medication_name?: string | null
          overdue_hours?: number | null
          overdue_minutes?: number | null
          scheduled_time?: string | null
          skip_notes?: string | null
          skip_reason?: string | null
          status?: string
          time_of_day: string
          updated_at?: string | null
          window_end: string
          window_start: string
        }
        Update: {
          checklist_id?: string
          created_at?: string | null
          dosage_unit?: string | null
          dose?: number | null
          given_at?: string | null
          given_by_carer_id?: string | null
          given_by_user_id?: string | null
          given_notes?: string | null
          id?: string
          medication_id?: string
          medication_name?: string | null
          overdue_hours?: number | null
          overdue_minutes?: number | null
          scheduled_time?: string | null
          skip_notes?: string | null
          skip_reason?: string | null
          status?: string
          time_of_day?: string
          updated_at?: string | null
          window_end?: string
          window_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "checklist_items_checklist_id_fkey"
            columns: ["checklist_id"]
            isOneToOne: false
            referencedRelation: "daily_medication_checklists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklist_items_given_by_carer_id_fkey"
            columns: ["given_by_carer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklist_items_given_by_user_id_fkey"
            columns: ["given_by_user_id"]
            isOneToOne: false
            referencedRelation: "care_givers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklist_items_medication_id_fkey"
            columns: ["medication_id"]
            isOneToOne: false
            referencedRelation: "medications"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_medication_checklists: {
        Row: {
          checklist_date: string
          created_at: string | null
          give_at: string | null
          group_id: string
          id: string
          patient_id: string
          skip_reason: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          checklist_date: string
          created_at?: string | null
          give_at?: string | null
          group_id: string
          id?: string
          patient_id: string
          skip_reason?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          checklist_date?: string
          created_at?: string | null
          give_at?: string | null
          group_id?: string
          id?: string
          patient_id?: string
          skip_reason?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_medication_checklists_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "care_group"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_medication_checklists_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          created_at: string | null
          description: string | null
          document_type: string | null
          file_name: string
          file_size: number | null
          file_type: string
          file_url: string
          id: string
          is_sensitive: boolean | null
          patient_id: string | null
          storage_path: string
          tags: string[] | null
          title: string | null
          updated_at: string | null
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          document_type?: string | null
          file_name: string
          file_size?: number | null
          file_type: string
          file_url: string
          id?: string
          is_sensitive?: boolean | null
          patient_id?: string | null
          storage_path: string
          tags?: string[] | null
          title?: string | null
          updated_at?: string | null
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          document_type?: string | null
          file_name?: string
          file_size?: number | null
          file_type?: string
          file_url?: string
          id?: string
          is_sensitive?: boolean | null
          patient_id?: string | null
          storage_path?: string
          tags?: string[] | null
          title?: string | null
          updated_at?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      families: {
        Row: {
          created_at: string | null
          group_id: string
          id: string
          preferred_timezone: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          group_id: string
          id?: string
          preferred_timezone?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          group_id?: string
          id?: string
          preferred_timezone?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "families_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: true
            referencedRelation: "care_group"
            referencedColumns: ["id"]
          },
        ]
      }
      handover_journal_entries: {
        Row: {
          author_id: string
          content: string
          created_at: string
          group_id: string
          id: string
          updated_at: string
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          group_id: string
          id?: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          group_id?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "handover_journal_entries_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "handover_journal_entries_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "care_group"
            referencedColumns: ["id"]
          },
        ]
      }
      invites: {
        Row: {
          created_at: string
          email: string
          expires_at: string
          group_id: string
          id: string
          invite_type: string
          status: Database["public"]["Enums"]["invite_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          expires_at?: string
          group_id: string
          id?: string
          invite_type: string
          status?: Database["public"]["Enums"]["invite_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          expires_at?: string
          group_id?: string
          id?: string
          invite_type?: string
          status?: Database["public"]["Enums"]["invite_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invites_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "care_group"
            referencedColumns: ["id"]
          },
        ]
      }
      medical_records: {
        Row: {
          attachments: string[] | null
          created_at: string | null
          created_by: string | null
          data: Json | null
          description: string | null
          diagnosis_code: string | null
          facility: string | null
          id: string
          is_sensitive: boolean | null
          patient_id: string
          procedure_code: string | null
          provider_id: string | null
          record_date: string
          record_type: string
          tags: string[] | null
          title: string
          updated_at: string | null
        }
        Insert: {
          attachments?: string[] | null
          created_at?: string | null
          created_by?: string | null
          data?: Json | null
          description?: string | null
          diagnosis_code?: string | null
          facility?: string | null
          id?: string
          is_sensitive?: boolean | null
          patient_id: string
          procedure_code?: string | null
          provider_id?: string | null
          record_date: string
          record_type: string
          tags?: string[] | null
          title: string
          updated_at?: string | null
        }
        Update: {
          attachments?: string[] | null
          created_at?: string | null
          created_by?: string | null
          data?: Json | null
          description?: string | null
          diagnosis_code?: string | null
          facility?: string | null
          id?: string
          is_sensitive?: boolean | null
          patient_id?: string
          procedure_code?: string | null
          provider_id?: string | null
          record_date?: string
          record_type?: string
          tags?: string[] | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "medical_records_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medical_records_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medical_records_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      medication_confirmations: {
        Row: {
          caregiver_id: string
          checklist_item_id: string
          confirmed_at_utc: string
          created_at: string
          id: string
          local_timezone: string
          photo_url: string
        }
        Insert: {
          caregiver_id: string
          checklist_item_id: string
          confirmed_at_utc?: string
          created_at?: string
          id?: string
          local_timezone: string
          photo_url: string
        }
        Update: {
          caregiver_id?: string
          checklist_item_id?: string
          confirmed_at_utc?: string
          created_at?: string
          id?: string
          local_timezone?: string
          photo_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "medication_confirmations_caregiver_id_fkey"
            columns: ["caregiver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medication_confirmations_checklist_item_id_fkey"
            columns: ["checklist_item_id"]
            isOneToOne: false
            referencedRelation: "checklist_items"
            referencedColumns: ["id"]
          },
        ]
      }
      medication_logs: {
        Row: {
          actual_time: string | null
          created_at: string | null
          dosage_taken: string | null
          id: string
          logged_by: string | null
          medication_id: string
          notes: string | null
          patient_id: string
          scheduled_time: string
          status: string
        }
        Insert: {
          actual_time?: string | null
          created_at?: string | null
          dosage_taken?: string | null
          id?: string
          logged_by?: string | null
          medication_id: string
          notes?: string | null
          patient_id: string
          scheduled_time: string
          status: string
        }
        Update: {
          actual_time?: string | null
          created_at?: string | null
          dosage_taken?: string | null
          id?: string
          logged_by?: string | null
          medication_id?: string
          notes?: string | null
          patient_id?: string
          scheduled_time?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "medication_logs_logged_by_fkey"
            columns: ["logged_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medication_logs_medication_id_fkey"
            columns: ["medication_id"]
            isOneToOne: false
            referencedRelation: "medications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medication_logs_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      medications: {
        Row: {
          created_at: string | null
          created_by: string | null
          day_of_month: number | null
          days_of_week: number[] | null
          discontinued_date: string | null
          discontinued_reason: string | null
          dosage_unit: string | null
          dose: number
          end_date: string | null
          form: string | null
          id: string
          instructions: string | null
          interval_hours: number | null
          last_refill_date: string | null
          medication_name: string
          name: string | null
          notes: string | null
          patient_id: string
          pharmacy: string | null
          pharmacy_phone: string | null
          prescribed_by: string | null
          prescribed_date: string | null
          prescription_number: string | null
          refills_remaining: number | null
          route: string | null
          schedule_type: string | null
          side_effects: string[] | null
          specific_times: string[] | null
          start_date: string
          status: string | null
          take_with_food: boolean | null
          time_windows: Json | null
          unit: Database["public"]["Enums"]["medication_unit"]
          updated_at: string | null
          version: number | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          day_of_month?: number | null
          days_of_week?: number[] | null
          discontinued_date?: string | null
          discontinued_reason?: string | null
          dosage_unit?: string | null
          dose: number
          end_date?: string | null
          form?: string | null
          id?: string
          instructions?: string | null
          interval_hours?: number | null
          last_refill_date?: string | null
          medication_name: string
          name?: string | null
          notes?: string | null
          patient_id: string
          pharmacy?: string | null
          pharmacy_phone?: string | null
          prescribed_by?: string | null
          prescribed_date?: string | null
          prescription_number?: string | null
          refills_remaining?: number | null
          route?: string | null
          schedule_type?: string | null
          side_effects?: string[] | null
          specific_times?: string[] | null
          start_date: string
          status?: string | null
          take_with_food?: boolean | null
          time_windows?: Json | null
          unit: Database["public"]["Enums"]["medication_unit"]
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          day_of_month?: number | null
          days_of_week?: number[] | null
          discontinued_date?: string | null
          discontinued_reason?: string | null
          dosage_unit?: string | null
          dose?: number
          end_date?: string | null
          form?: string | null
          id?: string
          instructions?: string | null
          interval_hours?: number | null
          last_refill_date?: string | null
          medication_name?: string
          name?: string | null
          notes?: string | null
          patient_id?: string
          pharmacy?: string | null
          pharmacy_phone?: string | null
          prescribed_by?: string | null
          prescribed_date?: string | null
          prescription_number?: string | null
          refills_remaining?: number | null
          route?: string | null
          schedule_type?: string | null
          side_effects?: string[] | null
          specific_times?: string[] | null
          start_date?: string
          status?: string | null
          take_with_food?: boolean | null
          time_windows?: Json | null
          unit?: Database["public"]["Enums"]["medication_unit"]
          updated_at?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "medications_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medications_prescribed_by_fkey"
            columns: ["prescribed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          attachments: string[] | null
          body: string
          created_at: string | null
          id: string
          is_read: boolean | null
          is_urgent: boolean | null
          message_type: string | null
          parent_message_id: string | null
          patient_id: string | null
          read_at: string | null
          recipient_id: string | null
          sender_id: string
          subject: string | null
          thread_id: string | null
          updated_at: string | null
        }
        Insert: {
          attachments?: string[] | null
          body: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          is_urgent?: boolean | null
          message_type?: string | null
          parent_message_id?: string | null
          patient_id?: string | null
          read_at?: string | null
          recipient_id?: string | null
          sender_id: string
          subject?: string | null
          thread_id?: string | null
          updated_at?: string | null
        }
        Update: {
          attachments?: string[] | null
          body?: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          is_urgent?: boolean | null
          message_type?: string | null
          parent_message_id?: string | null
          patient_id?: string | null
          read_at?: string | null
          recipient_id?: string | null
          sender_id?: string
          subject?: string | null
          thread_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_parent_message_id_fkey"
            columns: ["parent_message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          action_url: string | null
          body: string | null
          created_at: string | null
          id: string
          is_read: boolean | null
          read_at: string | null
          related_entity_id: string | null
          related_entity_type: string | null
          sent_via: string[] | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          action_url?: string | null
          body?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          read_at?: string | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          sent_via?: string[] | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          action_url?: string | null
          body?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          read_at?: string | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          sent_via?: string[] | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      patients: {
        Row: {
          address: Json | null
          allergies: string[] | null
          avatar_url: string | null
          blood_type: string | null
          care_level: string | null
          chronic_conditions: string[] | null
          created_at: string | null
          current_medications: string[] | null
          date_of_birth: string
          email: string | null
          emergency_contact: Json | null
          full_name: string
          gender: string | null
          group_id: string | null
          id: string
          insurance_info: Json | null
          is_active: boolean | null
          medical_record_number: string | null
          notes: string | null
          phone: string | null
          primary_caregiver_id: string | null
          primary_physician_id: string | null
          updated_at: string | null
        }
        Insert: {
          address?: Json | null
          allergies?: string[] | null
          avatar_url?: string | null
          blood_type?: string | null
          care_level?: string | null
          chronic_conditions?: string[] | null
          created_at?: string | null
          current_medications?: string[] | null
          date_of_birth: string
          email?: string | null
          emergency_contact?: Json | null
          full_name: string
          gender?: string | null
          group_id?: string | null
          id?: string
          insurance_info?: Json | null
          is_active?: boolean | null
          medical_record_number?: string | null
          notes?: string | null
          phone?: string | null
          primary_caregiver_id?: string | null
          primary_physician_id?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: Json | null
          allergies?: string[] | null
          avatar_url?: string | null
          blood_type?: string | null
          care_level?: string | null
          chronic_conditions?: string[] | null
          created_at?: string | null
          current_medications?: string[] | null
          date_of_birth?: string
          email?: string | null
          emergency_contact?: Json | null
          full_name?: string
          gender?: string | null
          group_id?: string | null
          id?: string
          insurance_info?: Json | null
          is_active?: boolean | null
          medical_record_number?: string | null
          notes?: string | null
          phone?: string | null
          primary_caregiver_id?: string | null
          primary_physician_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patients_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: true
            referencedRelation: "care_group"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patients_primary_caregiver_id_fkey"
            columns: ["primary_caregiver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patients_primary_physician_id_fkey"
            columns: ["primary_physician_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          address: Json | null
          avatar_url: string | null
          created_at: string | null
          date_of_birth: string | null
          email: string
          email_verified: boolean | null
          full_name: string
          id: string
          is_active: boolean | null
          last_seen_at: string | null
          license_number: string | null
          organization: string | null
          phone: string | null
          preferences: Json | null
          role: string
          specialization: string | null
          updated_at: string | null
        }
        Insert: {
          address?: Json | null
          avatar_url?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          email: string
          email_verified?: boolean | null
          full_name: string
          id: string
          is_active?: boolean | null
          last_seen_at?: string | null
          license_number?: string | null
          organization?: string | null
          phone?: string | null
          preferences?: Json | null
          role: string
          specialization?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: Json | null
          avatar_url?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          email?: string
          email_verified?: boolean | null
          full_name?: string
          id?: string
          is_active?: boolean | null
          last_seen_at?: string | null
          license_number?: string | null
          organization?: string | null
          phone?: string | null
          preferences?: Json | null
          role?: string
          specialization?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      tasks: {
        Row: {
          assigned_to: string | null
          care_plan_id: string | null
          completed_at: string | null
          completed_by: string | null
          completion_notes: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          due_date: string | null
          due_time: string | null
          id: string
          patient_id: string
          priority: string | null
          recurrence: string | null
          status: string | null
          task_type: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          care_plan_id?: string | null
          completed_at?: string | null
          completed_by?: string | null
          completion_notes?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          due_time?: string | null
          id?: string
          patient_id: string
          priority?: string | null
          recurrence?: string | null
          status?: string | null
          task_type?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          care_plan_id?: string | null
          completed_at?: string | null
          completed_by?: string | null
          completion_notes?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          due_time?: string | null
          id?: string
          patient_id?: string
          priority?: string | null
          recurrence?: string | null
          status?: string | null
          task_type?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_care_plan_id_fkey"
            columns: ["care_plan_id"]
            isOneToOne: false
            referencedRelation: "care_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      vital_signs: {
        Row: {
          blood_glucose: number | null
          blood_pressure_diastolic: number | null
          blood_pressure_systolic: number | null
          created_at: string | null
          heart_rate: number | null
          height: number | null
          id: string
          measured_at: string
          measured_by: string | null
          notes: string | null
          oxygen_saturation: number | null
          patient_id: string
          respiratory_rate: number | null
          temperature: number | null
          weight: number | null
        }
        Insert: {
          blood_glucose?: number | null
          blood_pressure_diastolic?: number | null
          blood_pressure_systolic?: number | null
          created_at?: string | null
          heart_rate?: number | null
          height?: number | null
          id?: string
          measured_at: string
          measured_by?: string | null
          notes?: string | null
          oxygen_saturation?: number | null
          patient_id: string
          respiratory_rate?: number | null
          temperature?: number | null
          weight?: number | null
        }
        Update: {
          blood_glucose?: number | null
          blood_pressure_diastolic?: number | null
          blood_pressure_systolic?: number | null
          created_at?: string | null
          heart_rate?: number | null
          height?: number | null
          id?: string
          measured_at?: string
          measured_by?: string | null
          notes?: string | null
          oxygen_saturation?: number | null
          patient_id?: string
          respiratory_rate?: number | null
          temperature?: number | null
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vital_signs_measured_by_fkey"
            columns: ["measured_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vital_signs_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_shift_assignment_history: {
        Row: {
          assigned_caregiver_id: string | null
          assignment_id: string | null
          changed_at: string
          changed_by: string
          group_id: string
          id: string
          previous_caregiver_id: string | null
          shift_date: string
          shift_slot: string
        }
        Insert: {
          assigned_caregiver_id?: string | null
          assignment_id?: string | null
          changed_at?: string
          changed_by: string
          group_id: string
          id?: string
          previous_caregiver_id?: string | null
          shift_date: string
          shift_slot: string
        }
        Update: {
          assigned_caregiver_id?: string | null
          assignment_id?: string | null
          changed_at?: string
          changed_by?: string
          group_id?: string
          id?: string
          previous_caregiver_id?: string | null
          shift_date?: string
          shift_slot?: string
        }
        Relationships: [
          {
            foreignKeyName: "weekly_shift_assignment_history_assigned_caregiver_id_fkey"
            columns: ["assigned_caregiver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weekly_shift_assignment_history_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "weekly_shift_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weekly_shift_assignment_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weekly_shift_assignment_history_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "care_group"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weekly_shift_assignment_history_previous_caregiver_id_fkey"
            columns: ["previous_caregiver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_shift_assignments: {
        Row: {
          assigned_caregiver_id: string | null
          created_at: string
          group_id: string
          id: string
          shift_date: string
          shift_slot: string
          updated_at: string
        }
        Insert: {
          assigned_caregiver_id?: string | null
          created_at?: string
          group_id: string
          id?: string
          shift_date: string
          shift_slot: string
          updated_at?: string
        }
        Update: {
          assigned_caregiver_id?: string | null
          created_at?: string
          group_id?: string
          id?: string
          shift_date?: string
          shift_slot?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "weekly_shift_assignments_assigned_caregiver_id_fkey"
            columns: ["assigned_caregiver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weekly_shift_assignments_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "care_group"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      upcoming_appointments: {
        Row: {
          id: string | null
          location: string | null
          patient_name: string | null
          provider_name: string | null
          start_time: string | null
          status: string | null
          title: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      create_group_invite: {
        Args: { p_email: string; p_group_id: string; p_invite_type: string }
        Returns: {
          created_at: string
          email: string
          expires_at: string
          group_id: string
          id: string
          invite_type: string
          status: Database["public"]["Enums"]["invite_status"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "invites"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      edit_medication: {
        Args: { p_changes: Json; p_id: string }
        Returns: {
          created_at: string | null
          created_by: string | null
          day_of_month: number | null
          days_of_week: number[] | null
          discontinued_date: string | null
          discontinued_reason: string | null
          dosage_unit: string | null
          dose: number
          end_date: string | null
          form: string | null
          id: string
          instructions: string | null
          interval_hours: number | null
          last_refill_date: string | null
          medication_name: string
          name: string | null
          notes: string | null
          patient_id: string
          pharmacy: string | null
          pharmacy_phone: string | null
          prescribed_by: string | null
          prescribed_date: string | null
          prescription_number: string | null
          refills_remaining: number | null
          route: string | null
          schedule_type: string | null
          side_effects: string[] | null
          specific_times: string[] | null
          start_date: string
          status: string | null
          take_with_food: boolean | null
          time_windows: Json | null
          unit: Database["public"]["Enums"]["medication_unit"]
          updated_at: string | null
          version: number | null
        }
        SetofOptions: {
          from: "*"
          to: "medications"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_patient_checklist_today: {
        Args: { p_include_past?: boolean; p_patient_id: string }
        Returns: {
          checklist_date: string
          checklist_id: string
          dosage: number
          dosage_unit: string
          given_at: string
          item_id: string
          medication_name: string
          skip_reason: string
          status: string
          time_of_day: string
          window_end: string
          window_start: string
        }[]
      }
      is_caregiver_for: { Args: { p_patient_id: string }; Returns: boolean }
      is_email_registered: { Args: { p_email: string }; Returns: boolean }
      is_group_member: { Args: { check_group_id: string }; Returns: boolean }
      verify_profile_trigger: {
        Args: never
        Returns: {
          sync_percentage: number
          total_users: number
          users_with_profiles: number
          users_without_profiles: number
        }[]
      }
    }
    Enums: {
      group_member_role: "primary_carer" | "secondary_carer" | "observer"
      invite_status: "pending" | "accepted" | "rejected" | "expired"
      medication_unit: "mg" | "ml" | "mcg" | "units"
      member_role: "primary_carer" | "secondary_carer" | "observer"
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
      group_member_role: ["primary_carer", "secondary_carer", "observer"],
      invite_status: ["pending", "accepted", "rejected", "expired"],
      medication_unit: ["mg", "ml", "mcg", "units"],
      member_role: ["primary_carer", "secondary_carer", "observer"],
    },
  },
} as const
