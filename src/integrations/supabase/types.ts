export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type JobType = "full-time" | "part-time" | "contract" | "internship"

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
          employer_id: string
          experience: string | null
          id: string
          is_featured: boolean
          job_type: JobType
          latitude: number
          longitude: number
          salary: string | null
          title: string
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
        }
        Update: {
          apply_url?: string
          area?: string | null
          company_name?: string
          created_at?: string
          description?: string
          employer_id?: string
          experience?: string | null
          id?: string
          is_featured?: boolean
          job_type?: JobType
          latitude?: number
          longitude?: number
          salary?: string | null
          title?: string
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
      job_type: JobType
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
