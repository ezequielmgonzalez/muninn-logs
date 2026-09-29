
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "public": {
          Tables: {
            "friendships": {
                  Row: {
                    "accepted_at": string | null,"addressee_id": string,"created_at": string,"requester_id": string,"status": Database["public"]['Enums']["friendship_status"]
                  }
                  Insert: {
                    "accepted_at"?: string | null,"addressee_id": string,"created_at"?: string,"requester_id": string,"status"?: Database["public"]['Enums']["friendship_status"]
                  }
                  Update: {
                    "accepted_at"?: string | null,"addressee_id"?: string,"created_at"?: string,"requester_id"?: string,"status"?: Database["public"]['Enums']["friendship_status"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "friendships_addressee_id_fkey"
      columns: ["addressee_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "friendships_requester_id_fkey"
      columns: ["requester_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"game_characters": {
                  Row: {
                    "game_id": string,"id": string,"slug": string
                  }
                  Insert: {
                    "game_id": string,"id"?: string,"slug": string
                  }
                  Update: {
                    "game_id"?: string,"id"?: string,"slug"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "game_characters_game_id_fkey"
      columns: ["game_id"]
isOneToOne: false
      referencedRelation: "games"
      referencedColumns: ["id"]
    }
                  ]
                },"games": {
                  Row: {
                    "id": string,"max_players": number,"min_players": number,"slug": string
                  }
                  Insert: {
                    "id"?: string,"max_players": number,"min_players": number,"slug": string
                  }
                  Update: {
                    "id"?: string,"max_players"?: number,"min_players"?: number,"slug"?: string
                  }
                  Relationships: [
                    
                  ]
                },"guest_claims": {
                  Row: {
                    "created_at": string,"guest_id": string,"id": string,"requested_by": string,"user_id": string
                  }
                  Insert: {
                    "created_at"?: string,"guest_id": string,"id"?: string,"requested_by"?: string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"guest_id"?: string,"id"?: string,"requested_by"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "guest_claims_guest_id_fkey"
      columns: ["guest_id"]
isOneToOne: true
      referencedRelation: "players"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "guest_claims_requested_by_fkey"
      columns: ["requested_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "guest_claims_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"match_player_scores": {
                  Row: {
                    "category_id": string,"match_id": string,"player_id": string,"points": number
                  }
                  Insert: {
                    "category_id": string,"match_id": string,"player_id": string,"points": number
                  }
                  Update: {
                    "category_id"?: string,"match_id"?: string,"player_id"?: string,"points"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "match_player_scores_category_id_fkey"
      columns: ["category_id"]
isOneToOne: false
      referencedRelation: "score_categories"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "match_player_scores_match_id_player_id_fkey"
      columns: ["match_id","player_id"]
isOneToOne: false
      referencedRelation: "match_players"
      referencedColumns: ["match_id","player_id"]
    },{
      foreignKeyName: "match_player_scores_match_id_player_id_fkey"
      columns: ["match_id","player_id"]
isOneToOne: false
      referencedRelation: "match_results"
      referencedColumns: ["match_id","player_id"]
    }
                  ]
                },"match_players": {
                  Row: {
                    "character_id": string | null,"match_id": string,"player_id": string,"turn_order": number,"won_tiebreak": boolean
                  }
                  Insert: {
                    "character_id"?: string | null,"match_id": string,"player_id": string,"turn_order": number,"won_tiebreak"?: boolean
                  }
                  Update: {
                    "character_id"?: string | null,"match_id"?: string,"player_id"?: string,"turn_order"?: number,"won_tiebreak"?: boolean
                  }
                  Relationships: [
                    {
      foreignKeyName: "match_players_character_id_fkey"
      columns: ["character_id"]
isOneToOne: false
      referencedRelation: "game_characters"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "match_players_match_id_fkey"
      columns: ["match_id"]
isOneToOne: false
      referencedRelation: "matches"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "match_players_player_id_fkey"
      columns: ["player_id"]
isOneToOne: false
      referencedRelation: "players"
      referencedColumns: ["id"]
    }
                  ]
                },"matches": {
                  Row: {
                    "created_at": string,"created_by": string,"duration_minutes": number | null,"game_id": string,"id": string,"played_on": string,"setup": NonNullable<Json>,"updated_at": string
                  }
                  Insert: {
                    "created_at"?: string,"created_by"?: string,"duration_minutes"?: number | null,"game_id": string,"id"?: string,"played_on": string,"setup"?: NonNullable<Json>,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string,"duration_minutes"?: number | null,"game_id"?: string,"id"?: string,"played_on"?: string,"setup"?: NonNullable<Json>,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "matches_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "matches_game_id_fkey"
      columns: ["game_id"]
isOneToOne: false
      referencedRelation: "games"
      referencedColumns: ["id"]
    }
                  ]
                },"players": {
                  Row: {
                    "created_at": string,"id": string,"name": string | null,"owner_id": string | null,"user_id": string | null
                  }
                  Insert: {
                    "created_at"?: string,"id"?: string,"name"?: string | null,"owner_id"?: string | null,"user_id"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"name"?: string | null,"owner_id"?: string | null,"user_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "players_owner_id_fkey"
      columns: ["owner_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "players_user_id_fkey"
      columns: ["user_id"]
isOneToOne: true
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "created_at": string,"display_name": string,"id": string,"username": string | null
                  }
                  Insert: {
                    "created_at"?: string,"display_name": string,"id": string,"username"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"display_name"?: string,"id"?: string,"username"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"score_categories": {
                  Row: {
                    "game_id": string,"id": string,"slug": string,"sort_order": number
                  }
                  Insert: {
                    "game_id": string,"id"?: string,"slug": string,"sort_order": number
                  }
                  Update: {
                    "game_id"?: string,"id"?: string,"slug"?: string,"sort_order"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "score_categories_game_id_fkey"
      columns: ["game_id"]
isOneToOne: false
      referencedRelation: "games"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            "match_results": {
                  Row: {
                    "is_winner": boolean | null,"match_id": string | null,"player_id": string | null,"rank": number | null,"total": number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "match_players_match_id_fkey"
      columns: ["match_id"]
isOneToOne: false
      referencedRelation: "matches"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "match_players_player_id_fkey"
      columns: ["player_id"]
isOneToOne: false
      referencedRelation: "players"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Functions: {
            "accept_guest_claim":
{ Args: { "claim_id": string }; Returns: number
                           },
"admin_link_guest":
{ Args: { "guest_id": string,"user_id": string }; Returns: number
                           },
"admin_list_guests":
{ Args: Record<PropertyKey, never>; Returns: {
              "id": string,"matches": number,"name": string,"owner_name": string
            }[]
                           },
"find_profile_by_username":
{ Args: { "search_username": string }; Returns: {
              "display_name": string,"id": string,"username": string
            }[]
                           },
"get_player_stats":
{ Args: { "game_slug"?: string,"target_user_id": string }; Returns: Json
                           },
"list_addable_players":
{ Args: Record<PropertyKey, never>; Returns: {
              "id": string,"is_guest": boolean,"is_me": boolean,"name": string,"owner_name": string
            }[]
                           },
"list_received_guest_claims":
{ Args: Record<PropertyKey, never>; Returns: {
              "guest_name": string,"id": string,"matches": number,"requested_by_name": string
            }[]
                           },
"log_match":
{ Args: { "duration_minutes"?: number,"game_slug": string,"played_on": string,"players": Json,"setup"?: Json }; Returns: string
                           },
"update_match":
{ Args: { "duration_minutes"?: number,"match_id": string,"played_on": string,"players": Json,"setup"?: Json }; Returns: string
                           }
          }
          Enums: {
            "friendship_status": "pending"|"accepted"
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
  "public": {
          Enums: {
            "friendship_status": ["pending", "accepted"]
          }
        }
} as const

