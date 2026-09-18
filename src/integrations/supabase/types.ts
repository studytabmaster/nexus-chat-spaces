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
      achievement_defs: {
        Row: {
          description: string
          icon: string
          key: string
          kind: string
          name: string
          points: number
          threshold: number
        }
        Insert: {
          description?: string
          icon?: string
          key: string
          kind?: string
          name: string
          points?: number
          threshold?: number
        }
        Update: {
          description?: string
          icon?: string
          key?: string
          kind?: string
          name?: string
          points?: number
          threshold?: number
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          community_id: string
          created_at: string
          detail: string
          id: string
          target: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          community_id: string
          created_at?: string
          detail?: string
          id?: string
          target?: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          community_id?: string
          created_at?: string
          detail?: string
          id?: string
          target?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
        ]
      }
      badges: {
        Row: {
          color: string
          created_at: string
          description: string
          icon: string
          id: string
          key: string
          name: string
        }
        Insert: {
          color?: string
          created_at?: string
          description?: string
          icon?: string
          id?: string
          key: string
          name: string
        }
        Update: {
          color?: string
          created_at?: string
          description?: string
          icon?: string
          id?: string
          key?: string
          name?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          community_id: string
          id: string
          name: string
          position: number
        }
        Insert: {
          community_id: string
          id?: string
          name: string
          position?: number
        }
        Update: {
          community_id?: string
          id?: string
          name?: string
          position?: number
        }
        Relationships: [
          {
            foreignKeyName: "categories_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
        ]
      }
      channel_prefs: {
        Row: {
          channel_id: string
          created_at: string
          favorite: boolean
          id: string
          last_read_at: string
          muted: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          channel_id: string
          created_at?: string
          favorite?: boolean
          id?: string
          last_read_at?: string
          muted?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          channel_id?: string
          created_at?: string
          favorite?: boolean
          id?: string
          last_read_at?: string
          muted?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "channel_prefs_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "channel_prefs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      channels: {
        Row: {
          archived: boolean
          category_id: string | null
          community_id: string
          created_at: string
          id: string
          locked: boolean
          name: string
          position: number
          topic: string
          type: string
        }
        Insert: {
          archived?: boolean
          category_id?: string | null
          community_id: string
          created_at?: string
          id?: string
          locked?: boolean
          name: string
          position?: number
          topic?: string
          type?: string
        }
        Update: {
          archived?: boolean
          category_id?: string | null
          community_id?: string
          created_at?: string
          id?: string
          locked?: boolean
          name?: string
          position?: number
          topic?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "channels_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "channels_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
        ]
      }
      communities: {
        Row: {
          banner_url: string | null
          category: string
          created_at: string
          created_by: string | null
          description: string
          icon_url: string | null
          id: string
          is_verified: boolean
          join_policy: Database["public"]["Enums"]["join_policy"]
          name: string
          visibility: Database["public"]["Enums"]["community_visibility"]
        }
        Insert: {
          banner_url?: string | null
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string
          icon_url?: string | null
          id?: string
          is_verified?: boolean
          join_policy?: Database["public"]["Enums"]["join_policy"]
          name: string
          visibility?: Database["public"]["Enums"]["community_visibility"]
        }
        Update: {
          banner_url?: string | null
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string
          icon_url?: string | null
          id?: string
          is_verified?: boolean
          join_policy?: Database["public"]["Enums"]["join_policy"]
          name?: string
          visibility?: Database["public"]["Enums"]["community_visibility"]
        }
        Relationships: []
      }
      community_bans: {
        Row: {
          community_id: string
          created_at: string
          created_by: string | null
          id: string
          reason: string
          user_id: string
        }
        Insert: {
          community_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          reason?: string
          user_id: string
        }
        Update: {
          community_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          reason?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_bans_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_bans_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_bans_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      community_member_roles: {
        Row: {
          community_id: string
          created_at: string
          id: string
          role_id: string
          user_id: string
        }
        Insert: {
          community_id: string
          created_at?: string
          id?: string
          role_id: string
          user_id: string
        }
        Update: {
          community_id?: string
          created_at?: string
          id?: string
          role_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_member_roles_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_member_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "community_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_member_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      community_members: {
        Row: {
          community_id: string
          id: string
          joined_at: string
          muted_until: string | null
          role: Database["public"]["Enums"]["community_role"]
          user_id: string
        }
        Insert: {
          community_id: string
          id?: string
          joined_at?: string
          muted_until?: string | null
          role?: Database["public"]["Enums"]["community_role"]
          user_id: string
        }
        Update: {
          community_id?: string
          id?: string
          joined_at?: string
          muted_until?: string | null
          role?: Database["public"]["Enums"]["community_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_members_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      community_roles: {
        Row: {
          color: string
          community_id: string
          created_at: string
          icon: string
          id: string
          name: string
          permissions: string[]
          position: number
          updated_at: string
        }
        Insert: {
          color?: string
          community_id: string
          created_at?: string
          icon?: string
          id?: string
          name: string
          permissions?: string[]
          position?: number
          updated_at?: string
        }
        Update: {
          color?: string
          community_id?: string
          created_at?: string
          icon?: string
          id?: string
          name?: string
          permissions?: string[]
          position?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_roles_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
        ]
      }
      community_tags: {
        Row: {
          community_id: string
          id: string
          tag: string
        }
        Insert: {
          community_id: string
          id?: string
          tag: string
        }
        Update: {
          community_id?: string
          id?: string
          tag?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_tags_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
        ]
      }
      community_welcome: {
        Row: {
          body: string
          community_id: string
          created_at: string
          enabled: boolean
          rules: string[]
          title: string
          updated_at: string
        }
        Insert: {
          body?: string
          community_id: string
          created_at?: string
          enabled?: boolean
          rules?: string[]
          title?: string
          updated_at?: string
        }
        Update: {
          body?: string
          community_id?: string
          created_at?: string
          enabled?: boolean
          rules?: string[]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_welcome_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: true
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_emojis: {
        Row: {
          community_id: string
          created_at: string
          created_by: string | null
          id: string
          image_url: string
          name: string
        }
        Insert: {
          community_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          image_url: string
          name: string
        }
        Update: {
          community_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          image_url?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_emojis_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custom_emojis_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      dm_members: {
        Row: {
          dm_id: string
          id: string
          last_read_at: string
          user_id: string
        }
        Insert: {
          dm_id: string
          id?: string
          last_read_at?: string
          user_id: string
        }
        Update: {
          dm_id?: string
          id?: string
          last_read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dm_members_dm_id_fkey"
            columns: ["dm_id"]
            isOneToOne: false
            referencedRelation: "dms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dm_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      dm_messages: {
        Row: {
          attachment_type: string | null
          attachment_url: string | null
          content: string
          created_at: string
          dm_id: string
          edited_at: string | null
          id: string
          reply_to: string | null
          user_id: string
        }
        Insert: {
          attachment_type?: string | null
          attachment_url?: string | null
          content?: string
          created_at?: string
          dm_id: string
          edited_at?: string | null
          id?: string
          reply_to?: string | null
          user_id: string
        }
        Update: {
          attachment_type?: string | null
          attachment_url?: string | null
          content?: string
          created_at?: string
          dm_id?: string
          edited_at?: string | null
          id?: string
          reply_to?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dm_messages_dm_id_fkey"
            columns: ["dm_id"]
            isOneToOne: false
            referencedRelation: "dms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dm_messages_reply_to_fkey"
            columns: ["reply_to"]
            isOneToOne: false
            referencedRelation: "dm_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dm_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      dms: {
        Row: {
          created_at: string
          id: string
        }
        Insert: {
          created_at?: string
          id?: string
        }
        Update: {
          created_at?: string
          id?: string
        }
        Relationships: []
      }
      event_rsvps: {
        Row: {
          created_at: string
          event_id: string
          id: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          status: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_rsvps_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_rsvps_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          capacity: number | null
          community_id: string
          created_at: string
          created_by: string | null
          description: string
          ends_at: string | null
          id: string
          image_url: string | null
          location: string | null
          starts_at: string
          title: string
          updated_at: string
          url: string | null
        }
        Insert: {
          capacity?: number | null
          community_id: string
          created_at?: string
          created_by?: string | null
          description?: string
          ends_at?: string | null
          id?: string
          image_url?: string | null
          location?: string | null
          starts_at: string
          title: string
          updated_at?: string
          url?: string | null
        }
        Update: {
          capacity?: number | null
          community_id?: string
          created_at?: string
          created_by?: string | null
          description?: string
          ends_at?: string | null
          id?: string
          image_url?: string | null
          location?: string | null
          starts_at?: string
          title?: string
          updated_at?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      fraud_flags: {
        Row: {
          created_at: string
          detail: string
          id: string
          kind: string
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          detail?: string
          id?: string
          kind: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          detail?: string
          id?: string
          kind?: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fraud_flags_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      friendships: {
        Row: {
          addressee_id: string
          created_at: string
          id: string
          requester_id: string
          status: string
          updated_at: string
        }
        Insert: {
          addressee_id: string
          created_at?: string
          id?: string
          requester_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          addressee_id?: string
          created_at?: string
          id?: string
          requester_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "friendships_addressee_id_fkey"
            columns: ["addressee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "friendships_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      invite_referrals: {
        Row: {
          community_id: string | null
          confirmed_at: string | null
          created_at: string
          id: string
          invite_code: string
          invitee_id: string
          inviter_id: string
          note: string
          status: string
        }
        Insert: {
          community_id?: string | null
          confirmed_at?: string | null
          created_at?: string
          id?: string
          invite_code?: string
          invitee_id: string
          inviter_id: string
          note?: string
          status?: string
        }
        Update: {
          community_id?: string | null
          confirmed_at?: string | null
          created_at?: string
          id?: string
          invite_code?: string
          invitee_id?: string
          inviter_id?: string
          note?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "invite_referrals_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invite_referrals_invitee_id_fkey"
            columns: ["invitee_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invite_referrals_inviter_id_fkey"
            columns: ["inviter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      invites: {
        Row: {
          code: string
          community_id: string
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          max_uses: number | null
          revoked: boolean
          uses: number
        }
        Insert: {
          code: string
          community_id: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          max_uses?: number | null
          revoked?: boolean
          uses?: number
        }
        Update: {
          code?: string
          community_id?: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          max_uses?: number | null
          revoked?: boolean
          uses?: number
        }
        Relationships: [
          {
            foreignKeyName: "invites_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invites_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      join_requests: {
        Row: {
          community_id: string
          created_at: string
          id: string
          message: string
          status: Database["public"]["Enums"]["request_status"]
          user_id: string
        }
        Insert: {
          community_id: string
          created_at?: string
          id?: string
          message?: string
          status?: Database["public"]["Enums"]["request_status"]
          user_id: string
        }
        Update: {
          community_id?: string
          created_at?: string
          id?: string
          message?: string
          status?: Database["public"]["Enums"]["request_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "join_requests_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "join_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      message_reactions: {
        Row: {
          emoji: string
          id: string
          message_id: string
          user_id: string
        }
        Insert: {
          emoji: string
          id?: string
          message_id: string
          user_id: string
        }
        Update: {
          emoji?: string
          id?: string
          message_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          attachment_type: string | null
          attachment_url: string | null
          channel_id: string
          community_id: string
          content: string
          created_at: string
          edited_at: string | null
          id: string
          is_pinned: boolean
          reply_to: string | null
          thread_root_id: string | null
          user_id: string
        }
        Insert: {
          attachment_type?: string | null
          attachment_url?: string | null
          channel_id: string
          community_id: string
          content?: string
          created_at?: string
          edited_at?: string | null
          id?: string
          is_pinned?: boolean
          reply_to?: string | null
          thread_root_id?: string | null
          user_id: string
        }
        Update: {
          attachment_type?: string | null
          attachment_url?: string | null
          channel_id?: string
          community_id?: string
          content?: string
          created_at?: string
          edited_at?: string | null
          id?: string
          is_pinned?: boolean
          reply_to?: string | null
          thread_root_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_reply_to_fkey"
            columns: ["reply_to"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_thread_root_id_fkey"
            columns: ["thread_root_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      mission_defs: {
        Row: {
          active: boolean
          description: string
          key: string
          name: string
          points: number
          position: number
          rule_key: string
          target: number
        }
        Insert: {
          active?: boolean
          description?: string
          key: string
          name: string
          points?: number
          position?: number
          rule_key: string
          target?: number
        }
        Update: {
          active?: boolean
          description?: string
          key?: string
          name?: string
          points?: number
          position?: number
          rule_key?: string
          target?: number
        }
        Relationships: []
      }
      mission_progress: {
        Row: {
          claimed: boolean
          created_at: string
          day: string
          id: string
          mission_key: string
          progress: number
          user_id: string
        }
        Insert: {
          claimed?: boolean
          created_at?: string
          day?: string
          id?: string
          mission_key: string
          progress?: number
          user_id: string
        }
        Update: {
          claimed?: boolean
          created_at?: string
          day?: string
          id?: string
          mission_key?: string
          progress?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mission_progress_mission_key_fkey"
            columns: ["mission_key"]
            isOneToOne: false
            referencedRelation: "mission_defs"
            referencedColumns: ["key"]
          },
          {
            foreignKeyName: "mission_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      moderation_actions: {
        Row: {
          action: string
          actor_id: string | null
          community_id: string
          created_at: string
          expires_at: string | null
          id: string
          reason: string
          user_id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          community_id: string
          created_at?: string
          expires_at?: string | null
          id?: string
          reason?: string
          user_id: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          community_id?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          reason?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "moderation_actions_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "moderation_actions_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "moderation_actions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          actor_id: string | null
          content: string
          created_at: string
          id: string
          link: string | null
          read: boolean
          type: string
          user_id: string
        }
        Insert: {
          actor_id?: string | null
          content: string
          created_at?: string
          id?: string
          link?: string | null
          read?: boolean
          type: string
          user_id: string
        }
        Update: {
          actor_id?: string | null
          content?: string
          created_at?: string
          id?: string
          link?: string | null
          read?: boolean
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      point_events: {
        Row: {
          created_at: string
          dedupe_key: string | null
          delta: number
          id: string
          label: string
          reason: string
          source_id: string | null
          source_type: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          dedupe_key?: string | null
          delta: number
          id?: string
          label?: string
          reason: string
          source_id?: string | null
          source_type?: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          dedupe_key?: string | null
          delta?: number
          id?: string
          label?: string
          reason?: string
          source_id?: string | null
          source_type?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "point_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      point_rules: {
        Row: {
          created_at: string
          daily_cap: number | null
          key: string
          label: string
          points: number
        }
        Insert: {
          created_at?: string
          daily_cap?: number | null
          key: string
          label: string
          points: number
        }
        Update: {
          created_at?: string
          daily_cap?: number | null
          key?: string
          label?: string
          points?: number
        }
        Relationships: []
      }
      point_wallets: {
        Row: {
          balance: number
          created_at: string
          lifetime: number
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          created_at?: string
          lifetime?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string
          lifetime?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "point_wallets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      poll_options: {
        Row: {
          id: string
          label: string
          poll_id: string
          position: number
        }
        Insert: {
          id?: string
          label: string
          poll_id: string
          position?: number
        }
        Update: {
          id?: string
          label?: string
          poll_id?: string
          position?: number
        }
        Relationships: [
          {
            foreignKeyName: "poll_options_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "polls"
            referencedColumns: ["id"]
          },
        ]
      }
      poll_votes: {
        Row: {
          created_at: string
          id: string
          option_id: string
          poll_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          option_id: string
          poll_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          option_id?: string
          poll_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "poll_votes_option_id_fkey"
            columns: ["option_id"]
            isOneToOne: false
            referencedRelation: "poll_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "poll_votes_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "polls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "poll_votes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      polls: {
        Row: {
          channel_id: string | null
          closed: boolean
          closes_at: string | null
          community_id: string
          created_at: string
          created_by: string | null
          id: string
          message_id: string | null
          multiple: boolean
          post_id: string | null
          question: string
        }
        Insert: {
          channel_id?: string | null
          closed?: boolean
          closes_at?: string | null
          community_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          message_id?: string | null
          multiple?: boolean
          post_id?: string | null
          question: string
        }
        Update: {
          channel_id?: string | null
          closed?: boolean
          closes_at?: string | null
          community_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          message_id?: string | null
          multiple?: boolean
          post_id?: string | null
          question?: string
        }
        Relationships: [
          {
            foreignKeyName: "polls_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "polls_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "polls_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "polls_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "polls_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          channel_id: string | null
          community_id: string
          content: string
          created_at: string
          id: string
          image_url: string | null
          link_url: string | null
          title: string
          user_id: string
        }
        Insert: {
          channel_id?: string | null
          community_id: string
          content?: string
          created_at?: string
          id?: string
          image_url?: string | null
          link_url?: string | null
          title: string
          user_id: string
        }
        Update: {
          channel_id?: string | null
          community_id?: string
          content?: string
          created_at?: string
          id?: string
          image_url?: string | null
          link_url?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "posts_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          allow_dms: boolean
          avatar_url: string | null
          bio: string | null
          created_at: string
          custom_status: string | null
          display_name: string
          id: string
          show_online: boolean
          status: string
          username: string
        }
        Insert: {
          allow_dms?: boolean
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          custom_status?: string | null
          display_name: string
          id: string
          show_online?: boolean
          status?: string
          username: string
        }
        Update: {
          allow_dms?: boolean
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          custom_status?: string | null
          display_name?: string
          id?: string
          show_online?: boolean
          status?: string
          username?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          community_id: string | null
          created_at: string
          detail: string
          id: string
          link: string | null
          preview: string
          reason: string
          reporter_id: string
          status: string
          target_id: string
          target_type: string
          updated_at: string
        }
        Insert: {
          community_id?: string | null
          created_at?: string
          detail?: string
          id?: string
          link?: string | null
          preview?: string
          reason: string
          reporter_id: string
          status?: string
          target_id: string
          target_type: string
          updated_at?: string
        }
        Update: {
          community_id?: string | null
          created_at?: string
          detail?: string
          id?: string
          link?: string | null
          preview?: string
          reason?: string
          reporter_id?: string
          status?: string
          target_id?: string
          target_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_items: {
        Row: {
          created_at: string
          id: string
          kind: string
          link: string
          preview: string
          ref_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind: string
          link: string
          preview?: string
          ref_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          link?: string
          preview?: string
          ref_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_items_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      service_audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          detail: string
          id: string
          target: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          detail?: string
          id?: string
          target?: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          detail?: string
          id?: string
          target?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_audit_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_items: {
        Row: {
          ai_generated: boolean
          created_at: string
          created_by: string | null
          description: string
          ends_at: string | null
          id: string
          image_url: string | null
          kind: string
          name: string
          payload: string
          price: number
          published: boolean
          restock_count: number
          review_status: string
          season: string
          sold: number
          starts_at: string | null
          stock: number | null
          updated_at: string
        }
        Insert: {
          ai_generated?: boolean
          created_at?: string
          created_by?: string | null
          description?: string
          ends_at?: string | null
          id?: string
          image_url?: string | null
          kind: string
          name: string
          payload?: string
          price: number
          published?: boolean
          restock_count?: number
          review_status?: string
          season?: string
          sold?: number
          starts_at?: string | null
          stock?: number | null
          updated_at?: string
        }
        Update: {
          ai_generated?: boolean
          created_at?: string
          created_by?: string | null
          description?: string
          ends_at?: string | null
          id?: string
          image_url?: string | null
          kind?: string
          name?: string
          payload?: string
          price?: number
          published?: boolean
          restock_count?: number
          review_status?: string
          season?: string
          sold?: number
          starts_at?: string | null
          stock?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shop_items_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_purchases: {
        Row: {
          created_at: string
          equipped: boolean
          id: string
          item_id: string
          price_paid: number
          user_id: string
        }
        Insert: {
          created_at?: string
          equipped?: boolean
          id?: string
          item_id: string
          price_paid: number
          user_id: string
        }
        Update: {
          created_at?: string
          equipped?: boolean
          id?: string
          item_id?: string
          price_paid?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shop_purchases_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "shop_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_purchases_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assigned_to: string | null
          community_id: string
          created_at: string
          created_by: string | null
          description: string
          due_date: string | null
          id: string
          priority: Database["public"]["Enums"]["task_priority"]
          status: Database["public"]["Enums"]["task_status"]
          title: string
        }
        Insert: {
          assigned_to?: string | null
          community_id: string
          created_at?: string
          created_by?: string | null
          description?: string
          due_date?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["task_priority"]
          status?: Database["public"]["Enums"]["task_status"]
          title: string
        }
        Update: {
          assigned_to?: string | null
          community_id?: string
          created_at?: string
          created_by?: string | null
          description?: string
          due_date?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["task_priority"]
          status?: Database["public"]["Enums"]["task_status"]
          title?: string
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
            foreignKeyName: "tasks_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_achievements: {
        Row: {
          achievement_key: string
          id: string
          unlocked_at: string
          user_id: string
        }
        Insert: {
          achievement_key: string
          id?: string
          unlocked_at?: string
          user_id: string
        }
        Update: {
          achievement_key?: string
          id?: string
          unlocked_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_achievements_achievement_key_fkey"
            columns: ["achievement_key"]
            isOneToOne: false
            referencedRelation: "achievement_defs"
            referencedColumns: ["key"]
          },
          {
            foreignKeyName: "user_achievements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_badges: {
        Row: {
          badge_id: string
          granted_at: string
          id: string
          user_id: string
        }
        Insert: {
          badge_id: string
          granted_at?: string
          id?: string
          user_id: string
        }
        Update: {
          badge_id?: string
          granted_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_badges_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      award_points: {
        Args: {
          _dedupe_key?: string
          _label: string
          _points: number
          _rule_key: string
          _source_id?: string
          _source_type?: string
          _user_id: string
        }
        Returns: number
      }
      can_manage: {
        Args: { _community_id: string; _user_id: string }
        Returns: boolean
      }
      can_moderate: {
        Args: { _community_id: string; _user_id: string }
        Returns: boolean
      }
      can_view_community: {
        Args: { _community_id: string; _user_id: string }
        Returns: boolean
      }
      can_view_profile: { Args: { _id: string }; Returns: boolean }
      claim_mission: { Args: { _key: string }; Returns: number }
      community_role_of: {
        Args: { _community_id: string; _user_id: string }
        Returns: Database["public"]["Enums"]["community_role"]
      }
      confirm_referral: { Args: { _invitee: string }; Returns: undefined }
      ensure_profile: {
        Args: never
        Returns: {
          allow_dms: boolean
          avatar_url: string | null
          bio: string | null
          created_at: string
          custom_status: string | null
          display_name: string
          id: string
          show_online: boolean
          status: string
          username: string
        }
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      equip_shop_item: {
        Args: { _equip: boolean; _item_id: string }
        Returns: undefined
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      invite_preview: {
        Args: { _code: string }
        Returns: {
          community_id: string
          description: string
          icon_url: string
          name: string
          valid: boolean
        }[]
      }
      is_dm_member: {
        Args: { _dm_id: string; _user_id: string }
        Returns: boolean
      }
      is_member: {
        Args: { _community_id: string; _user_id: string }
        Returns: boolean
      }
      moderate_member: {
        Args: {
          _action: string
          _community_id: string
          _minutes?: number
          _reason?: string
          _user_id: string
        }
        Returns: undefined
      }
      point_level: { Args: { _lifetime: number }; Returns: number }
      points_leaderboard: {
        Args: { _limit?: number }
        Returns: {
          avatar_url: string
          display_name: string
          level: number
          lifetime: number
          user_id: string
          username: string
        }[]
      }
      profile_card: {
        Args: { _id: string }
        Returns: {
          allow_dms: boolean
          avatar_url: string
          bio: string
          created_at: string
          custom_status: string
          display_name: string
          id: string
          show_online: boolean
          status: string
          username: string
        }[]
      }
      purchase_shop_item: { Args: { _item_id: string }; Returns: string }
      record_activity: {
        Args: { _kind: string; _ref_id?: string }
        Returns: number
      }
      redeem_invite: { Args: { _code: string }; Returns: string }
      review_join_request: {
        Args: { _approve: boolean; _request_id: string }
        Returns: undefined
      }
      revoke_points: {
        Args: { _points: number; _reason: string; _user_id: string }
        Returns: undefined
      }
      search_profiles: {
        Args: { _limit?: number; _q: string }
        Returns: {
          avatar_url: string
          bio: string
          custom_status: string
          display_name: string
          id: string
          status: string
          username: string
        }[]
      }
      start_dm: { Args: { _other: string }; Returns: string }
      sync_achievements: { Args: { _user_id: string }; Returns: undefined }
      transfer_ownership: {
        Args: { _community_id: string; _new_owner: string }
        Returns: undefined
      }
      user_cosmetics: {
        Args: { _user_ids: string[] }
        Returns: {
          background: string
          frame: string
          frame_image: string
          title: string
          user_id: string
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      community_role: "owner" | "admin" | "moderator" | "member"
      community_visibility: "PUBLIC" | "UNLISTED" | "PRIVATE"
      join_policy: "open" | "request"
      request_status: "PENDING" | "APPROVED" | "REJECTED"
      task_priority: "low" | "medium" | "high"
      task_status: "TODO" | "IN_PROGRESS" | "DONE"
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
    Enums: {
      app_role: ["admin", "moderator", "user"],
      community_role: ["owner", "admin", "moderator", "member"],
      community_visibility: ["PUBLIC", "UNLISTED", "PRIVATE"],
      join_policy: ["open", "request"],
      request_status: ["PENDING", "APPROVED", "REJECTED"],
      task_priority: ["low", "medium", "high"],
      task_status: ["TODO", "IN_PROGRESS", "DONE"],
    },
  },
} as const
