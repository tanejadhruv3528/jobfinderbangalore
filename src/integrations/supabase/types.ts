export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type JobType = "full-time" | "part-time" | "contract" | "internship"
export type JobStatus = "active" | "expired"
export type JobSource = "employer" | "google_jobs"
export type LocationPrecision = "exact" | "area" | "company"

export type Database = {
  public: {
    Tables: {
      jobs: {
        Row: {
          apply_url: string
          area: string | null
          company_name: string
          created_at: string
          description: string
          employer_id: string | null
          experience: string | null
          id: string
          is_featured: boolean
          job_type: JobType
          latitude: number
          longitude: number
          salary: string | null
          title: string
          expired_reason: string | null
          external_id: string | null
          last_checked_at: string | null
          last_seen_at: string | null
          location_precision: LocationPrecision
          source: JobSource
          source_via: string | null
          status: JobStatus
        }
        Insert: {
          apply_url: string
          area?: string | null
          company_name: string
          created_at?: string
          description: string
          employer_id: string
          experience?: string | null
          id?: string
          is_featured?: boolean
          job_type?: JobType
          latitude: number
          longitude: number
          salary?: string | null
          title: string
          expired_reason?: string | null
          external_id?: string | null
          last_checked_at?: string | null
          last_seen_at?: string | null
          location_precision?: LocationPrecision
          source?: JobSource
          source_via?: string | null
          status?: JobStatus
        }
        Update: {
          apply_url?: string
          area?: string | null
          company_name?: string
          created_at?: string
          description?: string
          employer_id?: string | null
          experience?: string | null
          id?: string
          is_featured?: boolean
          job_type?: JobType
          latitude?: number
          longitude?: number
          salary?: string | null
          title?: string
          expired_reason?: string | null
          external_id?: string | null
          last_checked_at?: string | null
          last_seen_at?: string | null
          location_precision?: LocationPrecision
          source?: JobSource
          source_via?: string | null
          status?: JobStatus
        }
        Relationships: []
      }
      profiles: {
        Row: {
          company_name: string
          created_at: string
          id: string
        }
        Insert: {
          company_name: string
          created_at?: string
          id: string
        }
        Update: {
          company_name?: string
          created_at?: string
          id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      job_status: JobStatus
      job_type: JobType
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
