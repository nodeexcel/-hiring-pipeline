
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "aptitude_questions": {
                  Row: {
                    "active": boolean,"answer_index": number,"body": string,"created_at": string,"difficulty": Database["public"]['Enums']["difficulty"],"external_id": string | null,"id": string,"license": string | null,"options": NonNullable<Json>,"section": string | null,"served_count": number,"source": string | null,"source_url": string | null,"topic": string
                  }
                  Insert: {
                    "active"?: boolean,"answer_index": number,"body": string,"created_at"?: string,"difficulty"?: Database["public"]['Enums']["difficulty"],"external_id"?: string | null,"id"?: string,"license"?: string | null,"options": NonNullable<Json>,"section"?: string | null,"served_count"?: number,"source"?: string | null,"source_url"?: string | null,"topic": string
                  }
                  Update: {
                    "active"?: boolean,"answer_index"?: number,"body"?: string,"created_at"?: string,"difficulty"?: Database["public"]['Enums']["difficulty"],"external_id"?: string | null,"id"?: string,"license"?: string | null,"options"?: NonNullable<Json>,"section"?: string | null,"served_count"?: number,"source"?: string | null,"source_url"?: string | null,"topic"?: string
                  }
                  Relationships: [
                    
                  ]
                },"audit_log": {
                  Row: {
                    "action": string,"actor": string | null,"at": string,"id": number,"new_data": Json | null,"old_data": Json | null,"row_id": string | null,"table_name": string
                  }
                  Insert: {
                    "action": string,"actor"?: string | null,"at"?: string,"id"?: never,"new_data"?: Json | null,"old_data"?: Json | null,"row_id"?: string | null,"table_name": string
                  }
                  Update: {
                    "action"?: string,"actor"?: string | null,"at"?: string,"id"?: never,"new_data"?: Json | null,"old_data"?: Json | null,"row_id"?: string | null,"table_name"?: string
                  }
                  Relationships: [
                    
                  ]
                },"candidates": {
                  Row: {
                    "awaiting_approval": number | null,"created_at": string,"created_by": string | null,"email": string,"final_score": number | null,"id": string,"invite_code": string,"name": string,"status": Database["public"]['Enums']["candidate_status"]
                  }
                  Insert: {
                    "awaiting_approval"?: number | null,"created_at"?: string,"created_by"?: string | null,"email": string,"final_score"?: number | null,"id"?: string,"invite_code"?: string,"name": string,"status"?: Database["public"]['Enums']["candidate_status"]
                  }
                  Update: {
                    "awaiting_approval"?: number | null,"created_at"?: string,"created_by"?: string | null,"email"?: string,"final_score"?: number | null,"id"?: string,"invite_code"?: string,"name"?: string,"status"?: Database["public"]['Enums']["candidate_status"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "candidates_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"coding_problems": {
                  Row: {
                    "active": boolean,"created_at": string,"difficulty": string | null,"external_id": string | null,"id": string,"license": string | null,"memory_limit_mb": number,"served_count": number,"source": string | null,"source_url": string | null,"starter_code": NonNullable<Json>,"statement": string,"time_limit_s": number,"title": string,"topics": (string)[]
                  }
                  Insert: {
                    "active"?: boolean,"created_at"?: string,"difficulty"?: string | null,"external_id"?: string | null,"id"?: string,"license"?: string | null,"memory_limit_mb"?: number,"served_count"?: number,"source"?: string | null,"source_url"?: string | null,"starter_code"?: NonNullable<Json>,"statement": string,"time_limit_s"?: number,"title": string,"topics"?: (string)[]
                  }
                  Update: {
                    "active"?: boolean,"created_at"?: string,"difficulty"?: string | null,"external_id"?: string | null,"id"?: string,"license"?: string | null,"memory_limit_mb"?: number,"served_count"?: number,"source"?: string | null,"source_url"?: string | null,"starter_code"?: NonNullable<Json>,"statement"?: string,"time_limit_s"?: number,"title"?: string,"topics"?: (string)[]
                  }
                  Relationships: [
                    
                  ]
                },"coding_testcases": {
                  Row: {
                    "expected_output": string,"hidden": boolean,"id": string,"input": string,"problem_id": string
                  }
                  Insert: {
                    "expected_output": string,"hidden"?: boolean,"id"?: string,"input": string,"problem_id": string
                  }
                  Update: {
                    "expected_output"?: string,"hidden"?: boolean,"id"?: string,"input"?: string,"problem_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "coding_testcases_problem_id_fkey"
      columns: ["problem_id"]
isOneToOne: false
      referencedRelation: "coding_problems"
      referencedColumns: ["id"]
    }
                  ]
                },"email_log": {
                  Row: {
                    "candidate_id": string | null,"click_token": string | null,"clicks": number,"created_at": string,"error": string | null,"id": string,"provider_id": string | null,"status": string,"subject": string,"target_url": string | null,"template": string,"to_email": string
                  }
                  Insert: {
                    "candidate_id"?: string | null,"click_token"?: string | null,"clicks"?: number,"created_at"?: string,"error"?: string | null,"id"?: string,"provider_id"?: string | null,"status"?: string,"subject": string,"target_url"?: string | null,"template": string,"to_email": string
                  }
                  Update: {
                    "candidate_id"?: string | null,"click_token"?: string | null,"clicks"?: number,"created_at"?: string,"error"?: string | null,"id"?: string,"provider_id"?: string | null,"status"?: string,"subject"?: string,"target_url"?: string | null,"template"?: string,"to_email"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "email_log_candidate_id_fkey"
      columns: ["candidate_id"]
isOneToOne: false
      referencedRelation: "candidates"
      referencedColumns: ["id"]
    }
                  ]
                },"machine_tasks": {
                  Row: {
                    "active": boolean,"brief": string,"id": string,"rubric": NonNullable<Json>,"title": string
                  }
                  Insert: {
                    "active"?: boolean,"brief": string,"id"?: string,"rubric"?: NonNullable<Json>,"title": string
                  }
                  Update: {
                    "active"?: boolean,"brief"?: string,"id"?: string,"rubric"?: NonNullable<Json>,"title"?: string
                  }
                  Relationships: [
                    
                  ]
                },"proctoring_events": {
                  Row: {
                    "at": string,"candidate_id": string,"detail": Json | null,"id": number,"round": number,"type": string
                  }
                  Insert: {
                    "at"?: string,"candidate_id": string,"detail"?: Json | null,"id"?: never,"round": number,"type": string
                  }
                  Update: {
                    "at"?: string,"candidate_id"?: string,"detail"?: Json | null,"id"?: never,"round"?: number,"type"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "proctoring_events_candidate_id_fkey"
      columns: ["candidate_id"]
isOneToOne: false
      referencedRelation: "candidates"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "active": boolean,"created_at": string,"email": string,"id": string,"role": Database["public"]['Enums']["app_role"]
                  }
                  Insert: {
                    "active"?: boolean,"created_at"?: string,"email": string,"id": string,"role"?: Database["public"]['Enums']["app_role"]
                  }
                  Update: {
                    "active"?: boolean,"created_at"?: string,"email"?: string,"id"?: string,"role"?: Database["public"]['Enums']["app_role"]
                  }
                  Relationships: [
                    
                  ]
                },"r1_attempts": {
                  Row: {
                    "answers": Json | null,"candidate_id": string,"elapsed_ms": number | null,"id": string,"issued_at": string,"question_ids": (string)[],"score": number | null,"secret": string,"seed": number,"submitted_at": string | null
                  }
                  Insert: {
                    "answers"?: Json | null,"candidate_id": string,"elapsed_ms"?: number | null,"id"?: string,"issued_at"?: string,"question_ids": (string)[],"score"?: number | null,"secret"?: string,"seed": number,"submitted_at"?: string | null
                  }
                  Update: {
                    "answers"?: Json | null,"candidate_id"?: string,"elapsed_ms"?: number | null,"id"?: string,"issued_at"?: string,"question_ids"?: (string)[],"score"?: number | null,"secret"?: string,"seed"?: number,"submitted_at"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "r1_attempts_candidate_id_fkey"
      columns: ["candidate_id"]
isOneToOne: true
      referencedRelation: "candidates"
      referencedColumns: ["id"]
    }
                  ]
                },"r2_attempt_problems": {
                  Row: {
                    "attempt_id": string,"auto_score": number | null,"code": string | null,"id": string,"language": string | null,"position": number,"problem_id": string,"submitted_at": string | null,"tests_passed": number | null,"tests_total": number | null
                  }
                  Insert: {
                    "attempt_id": string,"auto_score"?: number | null,"code"?: string | null,"id"?: string,"language"?: string | null,"position": number,"problem_id": string,"submitted_at"?: string | null,"tests_passed"?: number | null,"tests_total"?: number | null
                  }
                  Update: {
                    "attempt_id"?: string,"auto_score"?: number | null,"code"?: string | null,"id"?: string,"language"?: string | null,"position"?: number,"problem_id"?: string,"submitted_at"?: string | null,"tests_passed"?: number | null,"tests_total"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "r2_attempt_problems_attempt_id_fkey"
      columns: ["attempt_id"]
isOneToOne: false
      referencedRelation: "r2_attempts"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "r2_attempt_problems_problem_id_fkey"
      columns: ["problem_id"]
isOneToOne: false
      referencedRelation: "coding_problems"
      referencedColumns: ["id"]
    }
                  ]
                },"r2_attempts": {
                  Row: {
                    "auto_score": number | null,"candidate_id": string,"code": string | null,"id": string,"language": string | null,"problem_id": string | null,"reviewer_score": number | null,"score": number | null,"started_at": string,"submitted_at": string | null,"tests_passed": number | null,"tests_total": number | null
                  }
                  Insert: {
                    "auto_score"?: number | null,"candidate_id": string,"code"?: string | null,"id"?: string,"language"?: string | null,"problem_id"?: string | null,"reviewer_score"?: number | null,"score"?: number | null,"started_at"?: string,"submitted_at"?: string | null,"tests_passed"?: number | null,"tests_total"?: number | null
                  }
                  Update: {
                    "auto_score"?: number | null,"candidate_id"?: string,"code"?: string | null,"id"?: string,"language"?: string | null,"problem_id"?: string | null,"reviewer_score"?: number | null,"score"?: number | null,"started_at"?: string,"submitted_at"?: string | null,"tests_passed"?: number | null,"tests_total"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "r2_attempts_candidate_id_fkey"
      columns: ["candidate_id"]
isOneToOne: true
      referencedRelation: "candidates"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "r2_attempts_problem_id_fkey"
      columns: ["problem_id"]
isOneToOne: false
      referencedRelation: "coding_problems"
      referencedColumns: ["id"]
    }
                  ]
                },"r2_problem_similarity": {
                  Row: {
                    "attempt_problem_id": string,"other_attempt_problem_id": string,"score": number
                  }
                  Insert: {
                    "attempt_problem_id": string,"other_attempt_problem_id": string,"score": number
                  }
                  Update: {
                    "attempt_problem_id"?: string,"other_attempt_problem_id"?: string,"score"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "r2_problem_similarity_attempt_problem_id_fkey"
      columns: ["attempt_problem_id"]
isOneToOne: false
      referencedRelation: "r2_attempt_problems"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "r2_problem_similarity_other_attempt_problem_id_fkey"
      columns: ["other_attempt_problem_id"]
isOneToOne: false
      referencedRelation: "r2_attempt_problems"
      referencedColumns: ["id"]
    }
                  ]
                },"r2_similarity": {
                  Row: {
                    "attempt_id": string,"other_attempt_id": string,"score": number
                  }
                  Insert: {
                    "attempt_id": string,"other_attempt_id": string,"score": number
                  }
                  Update: {
                    "attempt_id"?: string,"other_attempt_id"?: string,"score"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "r2_similarity_attempt_id_fkey"
      columns: ["attempt_id"]
isOneToOne: false
      referencedRelation: "r2_attempts"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "r2_similarity_other_attempt_id_fkey"
      columns: ["other_attempt_id"]
isOneToOne: false
      referencedRelation: "r2_attempts"
      referencedColumns: ["id"]
    }
                  ]
                },"r2_snapshots": {
                  Row: {
                    "at": string,"attempt_id": string,"attempt_problem_id": string | null,"code": string,"id": number,"language": string | null
                  }
                  Insert: {
                    "at"?: string,"attempt_id": string,"attempt_problem_id"?: string | null,"code": string,"id"?: never,"language"?: string | null
                  }
                  Update: {
                    "at"?: string,"attempt_id"?: string,"attempt_problem_id"?: string | null,"code"?: string,"id"?: never,"language"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "r2_snapshots_attempt_id_fkey"
      columns: ["attempt_id"]
isOneToOne: false
      referencedRelation: "r2_attempts"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "r2_snapshots_attempt_problem_id_fkey"
      columns: ["attempt_problem_id"]
isOneToOne: false
      referencedRelation: "r2_attempt_problems"
      referencedColumns: ["id"]
    }
                  ]
                },"r3_assignments": {
                  Row: {
                    "candidate_id": string,"deadline": string,"file_path": string | null,"github_url": string | null,"id": string,"is_late": boolean | null,"score": number | null,"sent_at": string,"submitted_at": string | null,"task_id": string,"token": string,"walkthrough_at": string | null,"walkthrough_notes": string | null
                  }
                  Insert: {
                    "candidate_id": string,"deadline": string,"file_path"?: string | null,"github_url"?: string | null,"id"?: string,"is_late"?: boolean | null,"score"?: number | null,"sent_at"?: string,"submitted_at"?: string | null,"task_id": string,"token"?: string,"walkthrough_at"?: string | null,"walkthrough_notes"?: string | null
                  }
                  Update: {
                    "candidate_id"?: string,"deadline"?: string,"file_path"?: string | null,"github_url"?: string | null,"id"?: string,"is_late"?: boolean | null,"score"?: number | null,"sent_at"?: string,"submitted_at"?: string | null,"task_id"?: string,"token"?: string,"walkthrough_at"?: string | null,"walkthrough_notes"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "r3_assignments_candidate_id_fkey"
      columns: ["candidate_id"]
isOneToOne: true
      referencedRelation: "candidates"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "r3_assignments_task_id_fkey"
      columns: ["task_id"]
isOneToOne: false
      referencedRelation: "machine_tasks"
      referencedColumns: ["id"]
    }
                  ]
                },"reviews": {
                  Row: {
                    "candidate_id": string,"comment": string | null,"created_at": string,"id": string,"reviewer_id": string,"round": number,"rubric_scores": NonNullable<Json>,"score": number
                  }
                  Insert: {
                    "candidate_id": string,"comment"?: string | null,"created_at"?: string,"id"?: string,"reviewer_id": string,"round": number,"rubric_scores"?: NonNullable<Json>,"score": number
                  }
                  Update: {
                    "candidate_id"?: string,"comment"?: string | null,"created_at"?: string,"id"?: string,"reviewer_id"?: string,"round"?: number,"rubric_scores"?: NonNullable<Json>,"score"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "reviews_candidate_id_fkey"
      columns: ["candidate_id"]
isOneToOne: false
      referencedRelation: "candidates"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reviews_reviewer_id_fkey"
      columns: ["reviewer_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"round_config": {
                  Row: {
                    "auto_advance": boolean,"cutoff": number,"round": number,"settings": NonNullable<Json>,"weight": number
                  }
                  Insert: {
                    "auto_advance"?: boolean,"cutoff"?: number,"round": number,"settings"?: NonNullable<Json>,"weight": number
                  }
                  Update: {
                    "auto_advance"?: boolean,"cutoff"?: number,"round"?: number,"settings"?: NonNullable<Json>,"weight"?: number
                  }
                  Relationships: [
                    
                  ]
                }
          }
          Views: {
            "aptitude_topic_counts": {
                  Row: {
                    "drafts": number | null,"live": number | null,"section": string | null,"topic": string | null
                  }
                  Relationships: [
                    
                  ]
                },"dsa_topic_counts": {
                  Row: {
                    "drafts": number | null,"live": number | null,"topic": string | null
                  }
                  Relationships: [
                    
                  ]
                }
          }
          Functions: {
            "bump_problem_served":
{ Args: { "p_ids": (string)[] }; Returns: undefined
                           },
"bump_question_served":
{ Args: { "p_ids": (string)[] }; Returns: undefined
                           },
"is_admin":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"is_staff":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           }
          }
          Enums: {
            "app_role": "admin"|"reviewer","candidate_status": "Invited"|"R1 done"|"R2 done"|"R3 sent"|"R3 submitted"|"Selected"|"Rejected","difficulty": "easy"|"medium"|"hard"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            "app_role": ["admin", "reviewer"],"candidate_status": ["Invited", "R1 done", "R2 done", "R3 sent", "R3 submitted", "Selected", "Rejected"],"difficulty": ["easy", "medium", "hard"]
          }
        }
} as const

