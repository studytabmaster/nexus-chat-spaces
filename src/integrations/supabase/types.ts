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
      channels: {
        Row: {
          category_id: string | null
          community_id: string
          created_at: string
          id: string
          name: string
          position: number
          type: string
        }
        Insert: {
          category_id?: string | null
          community_id: string
          created_at?: string
          id?: string
          name: string
          position?: number
          type?: string
        }
        Update: {
          category_id?: string | null
          community_id?: string
          created_at?: string
          id?: string
          name?: string
          position?: number
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
      community_members: {
        Row: {
          community_id: string
          id: string
          joined_at: string
          role: Database["public"]["Enums"]["community_role"]
          user_id: string
        }
        Insert: {
          community_id: string
          id?: string
          joined_at?: string
          role?: Database["public"]["Enums"]["community_role"]
          user_id: string
        }
        Update: {
          community_id?: string
          id?: string
          joined_at?: string
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
      community_role_of: {
        Args: { _community_id: string; _user_id: string }
        Returns: Database["public"]["Enums"]["community_role"]
      }
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
      redeem_invite: { Args: { _code: string }; Returns: string }
      review_join_request: {
        Args: { _approve: boolean; _request_id: string }
        Returns: undefined
      }
      start_dm: { Args: { _other: string }; Returns: string }
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
