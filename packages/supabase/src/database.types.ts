npm warn Unknown project config "public-hoist-pattern". This will stop working in the next major version of npm.
npm warn Unknown project config "onlyBuiltDependencies". This will stop working in the next major version of npm.
npm warn Unknown project config "only-built-dependencies". This will stop working in the next major version of npm.
Connecting to db 5432
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      activity_feed: {
        Row: {
          created_at: string
          event_id: string
          id: string
          reference_id: string | null
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          reference_id?: string | null
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          reference_id?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_feed_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      announcement_reads: {
        Row: {
          announcement_id: string
          id: string
          read_at: string
          user_id: string
        }
        Insert: {
          announcement_id: string
          id?: string
          read_at?: string
          user_id: string
        }
        Update: {
          announcement_id?: string
          id?: string
          read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcement_reads_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "announcements"
            referencedColumns: ["id"]
          },
        ]
      }
      announcement_templates: {
        Row: {
          body: string
          created_at: string
          event_id: string | null
          id: string
          name: string
          organization_id: string
          subject: string
          type: string
        }
        Insert: {
          body?: string
          created_at?: string
          event_id?: string | null
          id?: string
          name: string
          organization_id: string
          subject?: string
          type?: string
        }
        Update: {
          body?: string
          created_at?: string
          event_id?: string | null
          id?: string
          name?: string
          organization_id?: string
          subject?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcement_templates_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcement_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          author_id: string
          body: string
          channels: string[]
          created_at: string
          event_id: string
          id: string
          read_count: number
          reply_to_email: string | null
          scheduled_for: string | null
          sender_name: string | null
          sent_at: string | null
          signature: string | null
          status: string
          subject: string
          target_audience: Json
          updated_at: string
        }
        Insert: {
          author_id: string
          body: string
          channels?: string[]
          created_at?: string
          event_id: string
          id?: string
          read_count?: number
          reply_to_email?: string | null
          scheduled_for?: string | null
          sender_name?: string | null
          sent_at?: string | null
          signature?: string | null
          status?: string
          subject: string
          target_audience?: Json
          updated_at?: string
        }
        Update: {
          author_id?: string
          body?: string
          channels?: string[]
          created_at?: string
          event_id?: string
          id?: string
          read_count?: number
          reply_to_email?: string | null
          scheduled_for?: string | null
          sender_name?: string | null
          sent_at?: string | null
          signature?: string | null
          status?: string
          subject?: string
          target_audience?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcements_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      attendee_bookmarks: {
        Row: {
          bookmarked_user_id: string
          created_at: string
          event_id: string
          user_id: string
        }
        Insert: {
          bookmarked_user_id: string
          created_at?: string
          event_id: string
          user_id: string
        }
        Update: {
          bookmarked_user_id?: string
          created_at?: string
          event_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendee_bookmarks_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      attendee_categories: {
        Row: {
          color: string
          created_at: string
          event_id: string
          id: string
          is_visible_in_directory: boolean
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          color?: string
          created_at?: string
          event_id: string
          id?: string
          is_visible_in_directory?: boolean
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          event_id?: string
          id?: string
          is_visible_in_directory?: boolean
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendee_categories_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      attendee_interests: {
        Row: {
          created_at: string
          event_id: string
          id: string
          interest_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          interest_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          interest_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendee_interests_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendee_interests_interest_id_fkey"
            columns: ["interest_id"]
            isOneToOne: false
            referencedRelation: "event_interests"
            referencedColumns: ["id"]
          },
        ]
      }
      attendee_profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          company: string | null
          created_at: string
          display_name: string
          event_id: string
          id: string
          is_visible_in_directory: boolean
          location: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          company?: string | null
          created_at?: string
          display_name: string
          event_id: string
          id: string
          is_visible_in_directory?: boolean
          location?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          company?: string | null
          created_at?: string
          display_name?: string
          event_id?: string
          id?: string
          is_visible_in_directory?: boolean
          location?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendee_profiles_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      badge_definitions: {
        Row: {
          created_at: string
          criteria_type: string
          criteria_value: Json
          description: string
          event_id: string | null
          icon: string
          id: string
          name: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          criteria_type: string
          criteria_value: Json
          description: string
          event_id?: string | null
          icon: string
          id?: string
          name: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          criteria_type?: string
          criteria_value?: Json
          description?: string
          event_id?: string | null
          icon?: string
          id?: string
          name?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "badge_definitions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      booth_messages: {
        Row: {
          created_at: string
          event_id: string
          id: string
          is_from_sponsor: boolean
          message: string
          sponsor_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          is_from_sponsor?: boolean
          message: string
          sponsor_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          is_from_sponsor?: boolean
          message?: string
          sponsor_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "booth_messages_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booth_messages_sponsor_id_fkey"
            columns: ["sponsor_id"]
            isOneToOne: false
            referencedRelation: "sponsors"
            referencedColumns: ["id"]
          },
        ]
      }
      booth_visits: {
        Row: {
          event_id: string
          id: string
          sponsor_id: string
          user_id: string
          visited_at: string
        }
        Insert: {
          event_id: string
          id?: string
          sponsor_id: string
          user_id: string
          visited_at?: string
        }
        Update: {
          event_id?: string
          id?: string
          sponsor_id?: string
          user_id?: string
          visited_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "booth_visits_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booth_visits_sponsor_id_fkey"
            columns: ["sponsor_id"]
            isOneToOne: false
            referencedRelation: "sponsors"
            referencedColumns: ["id"]
          },
        ]
      }
      breakout_room_participants: {
        Row: {
          id: string
          joined_at: string
          room_id: string
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          room_id: string
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          room_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "breakout_room_participants_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "breakout_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      breakout_rooms: {
        Row: {
          conversation_id: string | null
          created_at: string
          description: string | null
          ends_at: string
          event_id: string
          facilitator_name: string | null
          id: string
          location: string | null
          max_capacity: number | null
          session_id: string | null
          starts_at: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          conversation_id?: string | null
          created_at?: string
          description?: string | null
          ends_at: string
          event_id: string
          facilitator_name?: string | null
          id?: string
          location?: string | null
          max_capacity?: number | null
          session_id?: string | null
          starts_at: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          conversation_id?: string | null
          created_at?: string
          description?: string | null
          ends_at?: string
          event_id?: string
          facilitator_name?: string | null
          id?: string
          location?: string | null
          max_capacity?: number | null
          session_id?: string | null
          starts_at?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "breakout_rooms_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "breakout_rooms_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "breakout_rooms_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      category_visibility: {
        Row: {
          viewer_category_id: string
          visible_category_id: string
        }
        Insert: {
          viewer_category_id: string
          visible_category_id: string
        }
        Update: {
          viewer_category_id?: string
          visible_category_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "category_visibility_viewer_category_id_fkey"
            columns: ["viewer_category_id"]
            isOneToOne: false
            referencedRelation: "attendee_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "category_visibility_visible_category_id_fkey"
            columns: ["visible_category_id"]
            isOneToOne: false
            referencedRelation: "attendee_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      check_ins: {
        Row: {
          checked_in_at: string
          checked_in_by: string | null
          created_at: string
          event_id: string
          id: string
          registration_id: string
          session_id: string
        }
        Insert: {
          checked_in_at?: string
          checked_in_by?: string | null
          created_at?: string
          event_id: string
          id?: string
          registration_id: string
          session_id: string
        }
        Update: {
          checked_in_at?: string
          checked_in_by?: string | null
          created_at?: string
          event_id?: string
          id?: string
          registration_id?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "check_ins_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "check_ins_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "registrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "check_ins_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      comment_likes: {
        Row: {
          comment_id: string
          created_at: string
          user_id: string
        }
        Insert: {
          comment_id: string
          created_at?: string
          user_id: string
        }
        Update: {
          comment_id?: string
          created_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comment_likes_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          author_id: string
          content: string
          created_at: string
          id: string
          likes_count: number
          post_id: string
          updated_at: string
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          id?: string
          likes_count?: number
          post_id: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          id?: string
          likes_count?: number
          post_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      community_posts: {
        Row: {
          author_id: string
          content: string
          created_at: string
          id: string
          topic_id: string
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          id?: string
          topic_id: string
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          id?: string
          topic_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_posts_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "community_topics"
            referencedColumns: ["id"]
          },
        ]
      }
      community_topic_follows: {
        Row: {
          created_at: string
          topic_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          topic_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          topic_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_topic_follows_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "community_topics"
            referencedColumns: ["id"]
          },
        ]
      }
      community_topics: {
        Row: {
          author_id: string
          created_at: string
          description: string | null
          event_id: string
          id: string
          meetup_date: string | null
          meetup_location: string | null
          pinned: boolean
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          author_id: string
          created_at?: string
          description?: string | null
          event_id: string
          id?: string
          meetup_date?: string | null
          meetup_location?: string | null
          pinned?: boolean
          title: string
          type?: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          created_at?: string
          description?: string | null
          event_id?: string
          id?: string
          meetup_date?: string | null
          meetup_location?: string | null
          pinned?: boolean
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_topics_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      confirmation_email_templates: {
        Row: {
          body: string
          created_at: string
          enabled: boolean
          event_id: string
          id: string
          subject: string
          ticket_type_id: string | null
          updated_at: string
        }
        Insert: {
          body: string
          created_at?: string
          enabled?: boolean
          event_id: string
          id?: string
          subject: string
          ticket_type_id?: string | null
          updated_at?: string
        }
        Update: {
          body?: string
          created_at?: string
          enabled?: boolean
          event_id?: string
          id?: string
          subject?: string
          ticket_type_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "confirmation_email_templates_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "confirmation_email_templates_ticket_type_id_fkey"
            columns: ["ticket_type_id"]
            isOneToOne: false
            referencedRelation: "ticket_types"
            referencedColumns: ["id"]
          },
        ]
      }
      connections: {
        Row: {
          created_at: string
          event_id: string
          id: string
          receiver_id: string
          requester_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          receiver_id: string
          requester_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          receiver_id?: string
          requester_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "connections_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_members: {
        Row: {
          conversation_id: string
          created_at: string
          id: string
          is_muted: boolean
          last_read_at: string | null
          user_id: string
        }
        Insert: {
          conversation_id: string
          created_at?: string
          id?: string
          is_muted?: boolean
          last_read_at?: string | null
          user_id: string
        }
        Update: {
          conversation_id?: string
          created_at?: string
          id?: string
          is_muted?: boolean
          last_read_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_members_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string
          event_id: string
          id: string
          is_group: boolean
          name: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          is_group?: boolean
          name?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          is_group?: boolean
          name?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_registration_fields: {
        Row: {
          created_at: string
          event_id: string
          field_key: string
          id: string
          label: string
          options: Json | null
          placeholder: string | null
          required: boolean
          sort_order: number
          type: string
        }
        Insert: {
          created_at?: string
          event_id: string
          field_key: string
          id?: string
          label: string
          options?: Json | null
          placeholder?: string | null
          required?: boolean
          sort_order?: number
          type?: string
        }
        Update: {
          created_at?: string
          event_id?: string
          field_key?: string
          id?: string
          label?: string
          options?: Json | null
          placeholder?: string | null
          required?: boolean
          sort_order?: number
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_registration_fields_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      direct_messages: {
        Row: {
          content: string
          created_at: string
          event_id: string
          id: string
          read_at: string | null
          recipient_id: string
          sender_id: string
        }
        Insert: {
          content: string
          created_at?: string
          event_id: string
          id?: string
          read_at?: string | null
          recipient_id: string
          sender_id: string
        }
        Update: {
          content?: string
          created_at?: string
          event_id?: string
          id?: string
          read_at?: string | null
          recipient_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "direct_messages_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      discussion_topics: {
        Row: {
          built_in_key: string | null
          created_at: string
          created_by: string | null
          description: string | null
          event_id: string
          id: string
          is_built_in: boolean
          is_visible: boolean
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          built_in_key?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          event_id: string
          id?: string
          is_built_in?: boolean
          is_visible?: boolean
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          built_in_key?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          event_id?: string
          id?: string
          is_built_in?: boolean
          is_visible?: boolean
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "discussion_topics_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      document_downloads: {
        Row: {
          document_id: string
          downloaded_at: string
          id: string
          user_id: string
        }
        Insert: {
          document_id: string
          downloaded_at?: string
          id?: string
          user_id: string
        }
        Update: {
          document_id?: string
          downloaded_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_downloads_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "event_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      email_automations: {
        Row: {
          created_at: string
          enabled: boolean
          event_id: string
          id: string
          template_id: string
          trigger: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          event_id: string
          id?: string
          template_id: string
          trigger: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          event_id?: string
          id?: string
          template_id?: string
          trigger?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_automations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_automations_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "email_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      email_logs: {
        Row: {
          created_at: string
          error: string | null
          event_id: string
          id: string
          organization_id: string
          recipient_email: string
          recipient_name: string | null
          resend_id: string | null
          sent_at: string | null
          status: string
          subject: string
          template_id: string | null
        }
        Insert: {
          created_at?: string
          error?: string | null
          event_id: string
          id?: string
          organization_id: string
          recipient_email: string
          recipient_name?: string | null
          resend_id?: string | null
          sent_at?: string | null
          status?: string
          subject: string
          template_id?: string | null
        }
        Update: {
          created_at?: string
          error?: string | null
          event_id?: string
          id?: string
          organization_id?: string
          recipient_email?: string
          recipient_name?: string | null
          resend_id?: string | null
          sent_at?: string | null
          status?: string
          subject?: string
          template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_logs_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_logs_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "email_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      email_templates: {
        Row: {
          body_html: string
          created_at: string
          id: string
          name: string
          organization_id: string
          subject: string
          type: string
          updated_at: string
        }
        Insert: {
          body_html: string
          created_at?: string
          id?: string
          name: string
          organization_id: string
          subject: string
          type?: string
          updated_at?: string
        }
        Update: {
          body_html?: string
          created_at?: string
          id?: string
          name?: string
          organization_id?: string
          subject?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      event_documents: {
        Row: {
          created_at: string
          event_id: string
          external_url: string | null
          file_size: number | null
          file_type: string | null
          file_url: string | null
          id: string
          session_id: string | null
          sort_order: number
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          event_id: string
          external_url?: string | null
          file_size?: number | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          session_id?: string | null
          sort_order?: number
          title: string
          type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          event_id?: string
          external_url?: string | null
          file_size?: number | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          session_id?: string | null
          sort_order?: number
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_documents_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_documents_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      event_icebreakers: {
        Row: {
          created_at: string
          enabled: boolean
          event_id: string
          id: string
          options: Json | null
          question: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          event_id: string
          id?: string
          options?: Json | null
          question: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          event_id?: string
          id?: string
          options?: Json | null
          question?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_icebreakers_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: true
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_interests: {
        Row: {
          created_at: string
          event_id: string
          id: string
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_interests_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_photos: {
        Row: {
          caption: string | null
          created_at: string
          event_id: string
          id: string
          image_url: string
          likes_count: number
          media_type: string
          user_id: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          event_id: string
          id?: string
          image_url: string
          likes_count?: number
          media_type?: string
          user_id: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          event_id?: string
          id?: string
          image_url?: string
          likes_count?: number
          media_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_photos_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          abbreviation: string | null
          airport_ride_sharing: string
          attendee_origin: string | null
          cover_image: string | null
          created_at: string
          description: string | null
          end_date: string
          event_type: string | null
          event_type_other: string | null
          event_website_url: string | null
          generate_interests: boolean
          id: string
          is_virtual: boolean
          location_data: Json
          logistics: Json
          logo: string | null
          max_attendees: number | null
          organization_id: string
          organization_name: string | null
          organization_type: Json
          post_event_summary: boolean
          recovery_delay_hours: number
          recovery_email_count: number
          recovery_enabled: boolean
          registration_settings: Json
          require_approval: boolean
          settings: Json | null
          slug: string
          start_date: string
          status: string
          theme: Json | null
          timezone: string
          title: string
          topic_tags: Json
          twitter_hashtags: string | null
          updated_at: string
          venue_address: string | null
          venue_description: string | null
          venue_map_url: string | null
          venue_name: string | null
          virtual_url: string | null
          website_config: Json
          welcome_message: string | null
        }
        Insert: {
          abbreviation?: string | null
          airport_ride_sharing?: string
          attendee_origin?: string | null
          cover_image?: string | null
          created_at?: string
          description?: string | null
          end_date: string
          event_type?: string | null
          event_type_other?: string | null
          event_website_url?: string | null
          generate_interests?: boolean
          id?: string
          is_virtual?: boolean
          location_data?: Json
          logistics?: Json
          logo?: string | null
          max_attendees?: number | null
          organization_id: string
          organization_name?: string | null
          organization_type?: Json
          post_event_summary?: boolean
          recovery_delay_hours?: number
          recovery_email_count?: number
          recovery_enabled?: boolean
          registration_settings?: Json
          require_approval?: boolean
          settings?: Json | null
          slug: string
          start_date: string
          status?: string
          theme?: Json | null
          timezone?: string
          title: string
          topic_tags?: Json
          twitter_hashtags?: string | null
          updated_at?: string
          venue_address?: string | null
          venue_description?: string | null
          venue_map_url?: string | null
          venue_name?: string | null
          virtual_url?: string | null
          website_config?: Json
          welcome_message?: string | null
        }
        Update: {
          abbreviation?: string | null
          airport_ride_sharing?: string
          attendee_origin?: string | null
          cover_image?: string | null
          created_at?: string
          description?: string | null
          end_date?: string
          event_type?: string | null
          event_type_other?: string | null
          event_website_url?: string | null
          generate_interests?: boolean
          id?: string
          is_virtual?: boolean
          location_data?: Json
          logistics?: Json
          logo?: string | null
          max_attendees?: number | null
          organization_id?: string
          organization_name?: string | null
          organization_type?: Json
          post_event_summary?: boolean
          recovery_delay_hours?: number
          recovery_email_count?: number
          recovery_enabled?: boolean
          registration_settings?: Json
          require_approval?: boolean
          settings?: Json | null
          slug?: string
          start_date?: string
          status?: string
          theme?: Json | null
          timezone?: string
          title?: string
          topic_tags?: Json
          twitter_hashtags?: string | null
          updated_at?: string
          venue_address?: string | null
          venue_description?: string | null
          venue_map_url?: string | null
          venue_name?: string | null
          virtual_url?: string | null
          website_config?: Json
          welcome_message?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      floormap_markers: {
        Row: {
          created_at: string
          floormap_id: string
          id: string
          label: string
          x: number
          y: number
        }
        Insert: {
          created_at?: string
          floormap_id: string
          id?: string
          label: string
          x: number
          y: number
        }
        Update: {
          created_at?: string
          floormap_id?: string
          id?: string
          label?: string
          x?: number
          y?: number
        }
        Relationships: [
          {
            foreignKeyName: "floormap_markers_floormap_id_fkey"
            columns: ["floormap_id"]
            isOneToOne: false
            referencedRelation: "floormaps"
            referencedColumns: ["id"]
          },
        ]
      }
      floormaps: {
        Row: {
          created_at: string
          display_order: number
          event_id: string
          id: string
          image_url: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          event_id: string
          id?: string
          image_url: string
          name?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_order?: number
          event_id?: string
          id?: string
          image_url?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "floormaps_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      gamification_configs: {
        Row: {
          created_at: string
          enabled: boolean
          event_id: string
          hide_organizers: boolean
          id: string
          leaderboard_title: string
          prize_image_url: string | null
          prizes_description: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          event_id: string
          hide_organizers?: boolean
          id?: string
          leaderboard_title?: string
          prize_image_url?: string | null
          prizes_description?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          event_id?: string
          hide_organizers?: boolean
          id?: string
          leaderboard_title?: string
          prize_image_url?: string | null
          prizes_description?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gamification_configs_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: true
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      icebreaker_responses: {
        Row: {
          answer: string | null
          created_at: string
          event_id: string
          id: string
          introduction: string | null
          user_id: string
        }
        Insert: {
          answer?: string | null
          created_at?: string
          event_id: string
          id?: string
          introduction?: string | null
          user_id: string
        }
        Update: {
          answer?: string | null
          created_at?: string
          event_id?: string
          id?: string
          introduction?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "icebreaker_responses_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      leaderboard_scores: {
        Row: {
          challenges_completed: number
          event_id: string
          last_activity_at: string | null
          rank: number | null
          total_points: number
          user_id: string
        }
        Insert: {
          challenges_completed?: number
          event_id: string
          last_activity_at?: string | null
          rank?: number | null
          total_points?: number
          user_id: string
        }
        Update: {
          challenges_completed?: number
          event_id?: string
          last_activity_at?: string | null
          rank?: number | null
          total_points?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "leaderboard_scores_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      live_poll_votes: {
        Row: {
          created_at: string
          option_id: string
          poll_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          option_id: string
          poll_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          option_id?: string
          poll_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_poll_votes_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "live_polls"
            referencedColumns: ["id"]
          },
        ]
      }
      live_polls: {
        Row: {
          created_at: string
          created_by: string
          event_id: string
          id: string
          is_anonymous: boolean
          open_before_minutes: number
          open_time_mode: string
          options: Json
          prompt_attendee: boolean
          question: string
          result_visibility: string
          scheduled_open_at: string | null
          session_id: string | null
          show_results: boolean
          sort_order: number
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          event_id: string
          id?: string
          is_anonymous?: boolean
          open_before_minutes?: number
          open_time_mode?: string
          options?: Json
          prompt_attendee?: boolean
          question: string
          result_visibility?: string
          scheduled_open_at?: string | null
          session_id?: string | null
          show_results?: boolean
          sort_order?: number
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          event_id?: string
          id?: string
          is_anonymous?: boolean
          open_before_minutes?: number
          open_time_mode?: string
          options?: Json
          prompt_attendee?: boolean
          question?: string
          result_visibility?: string
          scheduled_open_at?: string | null
          session_id?: string | null
          show_results?: boolean
          sort_order?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_polls_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_polls_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      meetup_rsvps: {
        Row: {
          created_at: string
          meetup_id: string
          status: string
          user_id: string
          waitlist_position: number | null
        }
        Insert: {
          created_at?: string
          meetup_id: string
          status?: string
          user_id: string
          waitlist_position?: number | null
        }
        Update: {
          created_at?: string
          meetup_id?: string
          status?: string
          user_id?: string
          waitlist_position?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "meetup_rsvps_meetup_id_fkey"
            columns: ["meetup_id"]
            isOneToOne: false
            referencedRelation: "meetups"
            referencedColumns: ["id"]
          },
        ]
      }
      meetups: {
        Row: {
          capacity: number | null
          created_at: string
          created_by: string
          description: string | null
          ends_at: string | null
          event_id: string
          id: string
          location: string | null
          starts_at: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          capacity?: number | null
          created_at?: string
          created_by: string
          description?: string | null
          ends_at?: string | null
          event_id: string
          id?: string
          location?: string | null
          starts_at: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          capacity?: number | null
          created_at?: string
          created_by?: string
          description?: string | null
          ends_at?: string | null
          event_id?: string
          id?: string
          location?: string | null
          starts_at?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meetups_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          image_url: string | null
          sender_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          image_url?: string | null
          sender_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          image_url?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          role?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          id: string
          logo_url: string | null
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      photo_likes: {
        Row: {
          created_at: string
          photo_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          photo_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          photo_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "photo_likes_photo_id_fkey"
            columns: ["photo_id"]
            isOneToOne: false
            referencedRelation: "event_photos"
            referencedColumns: ["id"]
          },
        ]
      }
      point_rules: {
        Row: {
          activity_type: string
          enabled: boolean
          event_id: string
          id: string
          max_per_event: number | null
          points: number
        }
        Insert: {
          activity_type: string
          enabled?: boolean
          event_id: string
          id?: string
          max_per_event?: number | null
          points?: number
        }
        Update: {
          activity_type?: string
          enabled?: boolean
          event_id?: string
          id?: string
          max_per_event?: number | null
          points?: number
        }
        Relationships: [
          {
            foreignKeyName: "point_rules_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      point_transactions: {
        Row: {
          activity_type: string
          created_at: string
          event_id: string
          id: string
          points: number
          reference_id: string | null
          reference_type: string | null
          user_id: string
        }
        Insert: {
          activity_type: string
          created_at?: string
          event_id: string
          id?: string
          points: number
          reference_id?: string | null
          reference_type?: string | null
          user_id: string
        }
        Update: {
          activity_type?: string
          created_at?: string
          event_id?: string
          id?: string
          points?: number
          reference_id?: string | null
          reference_type?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "point_transactions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      poll_votes: {
        Row: {
          created_at: string
          id: string
          option_index: number
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          option_index: number
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          option_index?: number
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "poll_votes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_likes: {
        Row: {
          created_at: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          author_id: string
          comments_count: number
          content: string
          created_at: string
          event_id: string
          id: string
          image_url: string | null
          likes_count: number
          poll_options: Json | null
          type: string
          updated_at: string
        }
        Insert: {
          author_id: string
          comments_count?: number
          content: string
          created_at?: string
          event_id: string
          id?: string
          image_url?: string | null
          likes_count?: number
          poll_options?: Json | null
          type?: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          comments_count?: number
          content?: string
          created_at?: string
          event_id?: string
          id?: string
          image_url?: string | null
          likes_count?: number
          poll_options?: Json | null
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "posts_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          company: string | null
          created_at: string
          full_name: string
          id: string
          interests: string[] | null
          job_title: string | null
          linkedin_url: string | null
          looking_for: string[] | null
          twitter_handle: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          company?: string | null
          created_at?: string
          full_name?: string
          id: string
          interests?: string[] | null
          job_title?: string | null
          linkedin_url?: string | null
          looking_for?: string[] | null
          twitter_handle?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          company?: string | null
          created_at?: string
          full_name?: string
          id?: string
          interests?: string[] | null
          job_title?: string | null
          linkedin_url?: string | null
          looking_for?: string[] | null
          twitter_handle?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      promo_codes: {
        Row: {
          active: boolean
          applies_to: string[] | null
          code: string
          created_at: string
          current_uses: number
          discount_type: string
          discount_value: number
          event_id: string
          expires_at: string | null
          id: string
          max_uses: number | null
          starts_at: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          applies_to?: string[] | null
          code: string
          created_at?: string
          current_uses?: number
          discount_type: string
          discount_value: number
          event_id: string
          expires_at?: string | null
          id?: string
          max_uses?: number | null
          starts_at?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          applies_to?: string[] | null
          code?: string
          created_at?: string
          current_uses?: number
          discount_type?: string
          discount_value?: number
          event_id?: string
          expires_at?: string | null
          id?: string
          max_uses?: number | null
          starts_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "promo_codes_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      push_tokens: {
        Row: {
          created_at: string
          expo_push_token: string
          id: string
          platform: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expo_push_token: string
          id?: string
          platform: string
          user_id: string
        }
        Update: {
          created_at?: string
          expo_push_token?: string
          id?: string
          platform?: string
          user_id?: string
        }
        Relationships: []
      }
      question_upvotes: {
        Row: {
          created_at: string
          id: string
          question_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          question_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          question_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "question_upvotes_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "session_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      registration_addons: {
        Row: {
          addon_id: string
          quantity: number
          registration_id: string
        }
        Insert: {
          addon_id: string
          quantity?: number
          registration_id: string
        }
        Update: {
          addon_id?: string
          quantity?: number
          registration_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "registration_addons_addon_id_fkey"
            columns: ["addon_id"]
            isOneToOne: false
            referencedRelation: "ticket_addons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registration_addons_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "registrations"
            referencedColumns: ["id"]
          },
        ]
      }
      registration_intents: {
        Row: {
          converted_registration_id: string | null
          created_at: string
          custom_fields: Json | null
          email: string
          event_id: string
          id: string
          last_recovery_email_at: string | null
          name: string | null
          promo_code_id: string | null
          recovery_emails_sent: number
          status: string
          ticket_type_id: string
          updated_at: string
        }
        Insert: {
          converted_registration_id?: string | null
          created_at?: string
          custom_fields?: Json | null
          email: string
          event_id: string
          id?: string
          last_recovery_email_at?: string | null
          name?: string | null
          promo_code_id?: string | null
          recovery_emails_sent?: number
          status?: string
          ticket_type_id: string
          updated_at?: string
        }
        Update: {
          converted_registration_id?: string | null
          created_at?: string
          custom_fields?: Json | null
          email?: string
          event_id?: string
          id?: string
          last_recovery_email_at?: string | null
          name?: string | null
          promo_code_id?: string | null
          recovery_emails_sent?: number
          status?: string
          ticket_type_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "registration_intents_converted_registration_id_fkey"
            columns: ["converted_registration_id"]
            isOneToOne: false
            referencedRelation: "registrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registration_intents_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registration_intents_promo_code_id_fkey"
            columns: ["promo_code_id"]
            isOneToOne: false
            referencedRelation: "promo_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registration_intents_ticket_type_id_fkey"
            columns: ["ticket_type_id"]
            isOneToOne: false
            referencedRelation: "ticket_types"
            referencedColumns: ["id"]
          },
        ]
      }
      registration_pages: {
        Row: {
          created_at: string
          event_id: string
          id: string
          is_default: boolean
          name: string
          slug: string
          ticket_type_ids: string[]
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          is_default?: boolean
          name: string
          slug: string
          ticket_type_ids?: string[]
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          is_default?: boolean
          name?: string
          slug?: string
          ticket_type_ids?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "registration_pages_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      registrations: {
        Row: {
          category: string | null
          category_id: string | null
          checked_in_at: string | null
          company: string | null
          created_at: string
          custom_fields: Json | null
          discount_amount: number | null
          email: string
          event_id: string
          id: string
          is_group_child: boolean | null
          name: string
          parent_registration_id: string | null
          promo_code_id: string | null
          qr_code: string
          status: string
          ticket_type_id: string
          title: string | null
          unsubscribed: boolean
          updated_at: string
          user_id: string | null
        }
        Insert: {
          category?: string | null
          category_id?: string | null
          checked_in_at?: string | null
          company?: string | null
          created_at?: string
          custom_fields?: Json | null
          discount_amount?: number | null
          email: string
          event_id: string
          id?: string
          is_group_child?: boolean | null
          name: string
          parent_registration_id?: string | null
          promo_code_id?: string | null
          qr_code: string
          status?: string
          ticket_type_id: string
          title?: string | null
          unsubscribed?: boolean
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          category?: string | null
          category_id?: string | null
          checked_in_at?: string | null
          company?: string | null
          created_at?: string
          custom_fields?: Json | null
          discount_amount?: number | null
          email?: string
          event_id?: string
          id?: string
          is_group_child?: boolean | null
          name?: string
          parent_registration_id?: string | null
          promo_code_id?: string | null
          qr_code?: string
          status?: string
          ticket_type_id?: string
          title?: string | null
          unsubscribed?: boolean
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "registrations_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "attendee_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registrations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registrations_parent_registration_id_fkey"
            columns: ["parent_registration_id"]
            isOneToOne: false
            referencedRelation: "registrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registrations_promo_code_id_fkey"
            columns: ["promo_code_id"]
            isOneToOne: false
            referencedRelation: "promo_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registrations_ticket_type_id_fkey"
            columns: ["ticket_type_id"]
            isOneToOne: false
            referencedRelation: "ticket_types"
            referencedColumns: ["id"]
          },
        ]
      }
      session_bookmarks: {
        Row: {
          created_at: string
          session_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          session_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_bookmarks_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      session_chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          session_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          session_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_chat_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      session_likes: {
        Row: {
          created_at: string
          id: string
          session_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          session_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_likes_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      session_notes: {
        Row: {
          content: string
          created_at: string
          id: string
          session_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content?: string
          created_at?: string
          id?: string
          session_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          session_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_notes_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      session_questions: {
        Row: {
          answer_text: string | null
          answered_at: string | null
          answered_by: string | null
          created_at: string
          event_id: string
          id: string
          is_anonymous: boolean
          is_pinned: boolean
          question_text: string
          session_id: string
          status: string
          updated_at: string
          upvote_count: number
          user_id: string | null
        }
        Insert: {
          answer_text?: string | null
          answered_at?: string | null
          answered_by?: string | null
          created_at?: string
          event_id: string
          id?: string
          is_anonymous?: boolean
          is_pinned?: boolean
          question_text: string
          session_id: string
          status?: string
          updated_at?: string
          upvote_count?: number
          user_id?: string | null
        }
        Update: {
          answer_text?: string | null
          answered_at?: string | null
          answered_by?: string | null
          created_at?: string
          event_id?: string
          id?: string
          is_anonymous?: boolean
          is_pinned?: boolean
          question_text?: string
          session_id?: string
          status?: string
          updated_at?: string
          upvote_count?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "session_questions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_questions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      session_rsvps: {
        Row: {
          created_at: string
          id: string
          session_id: string
          status: string
          updated_at: string
          user_id: string
          waitlist_position: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          session_id: string
          status?: string
          updated_at?: string
          user_id: string
          waitlist_position?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          session_id?: string
          status?: string
          updated_at?: string
          user_id?: string
          waitlist_position?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "session_rsvps_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      session_speakers: {
        Row: {
          session_id: string
          speaker_id: string
        }
        Insert: {
          session_id: string
          speaker_id: string
        }
        Update: {
          session_id?: string
          speaker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_speakers_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_speakers_speaker_id_fkey"
            columns: ["speaker_id"]
            isOneToOne: false
            referencedRelation: "speakers"
            referencedColumns: ["id"]
          },
        ]
      }
      session_tracks: {
        Row: {
          session_id: string
          track_id: string
        }
        Insert: {
          session_id: string
          track_id: string
        }
        Update: {
          session_id?: string
          track_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_tracks_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_tracks_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          capacity: number | null
          created_at: string
          description: string | null
          enable_check_in: boolean
          end_time: string
          event_id: string
          id: string
          location: string | null
          qa_anonymous_enabled: boolean
          qa_enabled: boolean
          qa_moderation_enabled: boolean
          rsvp_enabled: boolean
          start_time: string
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          capacity?: number | null
          created_at?: string
          description?: string | null
          enable_check_in?: boolean
          end_time: string
          event_id: string
          id?: string
          location?: string | null
          qa_anonymous_enabled?: boolean
          qa_enabled?: boolean
          qa_moderation_enabled?: boolean
          rsvp_enabled?: boolean
          start_time: string
          title: string
          type?: string
          updated_at?: string
        }
        Update: {
          capacity?: number | null
          created_at?: string
          description?: string | null
          enable_check_in?: boolean
          end_time?: string
          event_id?: string
          id?: string
          location?: string | null
          qa_anonymous_enabled?: boolean
          qa_enabled?: boolean
          qa_moderation_enabled?: boolean
          rsvp_enabled?: boolean
          start_time?: string
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sessions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      social_group_members: {
        Row: {
          group_id: string
          id: string
          joined_at: string
          user_id: string
        }
        Insert: {
          group_id: string
          id?: string
          joined_at?: string
          user_id: string
        }
        Update: {
          group_id?: string
          id?: string
          joined_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "social_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      social_group_post_comments: {
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
            foreignKeyName: "social_group_post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "social_group_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      social_group_posts: {
        Row: {
          content: string
          created_at: string
          group_id: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          group_id: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          group_id?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_group_posts_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "social_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      social_groups: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          event_id: string
          id: string
          is_visible: boolean
          prompt: string | null
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          event_id: string
          id?: string
          is_visible?: boolean
          prompt?: string | null
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          event_id?: string
          id?: string
          is_visible?: boolean
          prompt?: string | null
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_groups_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      speaker_form_fields: {
        Row: {
          event_id: string
          field_key: string
          field_type: string
          id: string
          included: boolean
          is_custom: boolean
          label: string
          organizer_only: boolean
          required: boolean
          sort_order: number
        }
        Insert: {
          event_id: string
          field_key: string
          field_type?: string
          id?: string
          included?: boolean
          is_custom?: boolean
          label: string
          organizer_only?: boolean
          required?: boolean
          sort_order?: number
        }
        Update: {
          event_id?: string
          field_key?: string
          field_type?: string
          id?: string
          included?: boolean
          is_custom?: boolean
          label?: string
          organizer_only?: boolean
          required?: boolean
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "speaker_form_fields_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      speaker_form_settings: {
        Row: {
          created_at: string
          email_body: string
          email_subject: string
          event_id: string
          id: string
          notification_preference: string
          send_reminder_email: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          email_body?: string
          email_subject?: string
          event_id: string
          id?: string
          notification_preference?: string
          send_reminder_email?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          email_body?: string
          email_subject?: string
          event_id?: string
          id?: string
          notification_preference?: string
          send_reminder_email?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "speaker_form_settings_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: true
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      speaker_form_tokens: {
        Row: {
          created_at: string
          event_id: string
          expires_at: string
          id: string
          speaker_id: string
          token: string
        }
        Insert: {
          created_at?: string
          event_id: string
          expires_at: string
          id?: string
          speaker_id: string
          token: string
        }
        Update: {
          created_at?: string
          event_id?: string
          expires_at?: string
          id?: string
          speaker_id?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "speaker_form_tokens_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "speaker_form_tokens_speaker_id_fkey"
            columns: ["speaker_id"]
            isOneToOne: false
            referencedRelation: "speakers"
            referencedColumns: ["id"]
          },
        ]
      }
      speakers: {
        Row: {
          bio: string | null
          company: string | null
          created_at: string
          email: string | null
          event_id: string
          id: string
          is_featured: boolean
          linkedin_url: string | null
          name: string
          photo: string | null
          sort_order: number
          title: string | null
          twitter_handle: string | null
          updated_at: string
          website_url: string | null
        }
        Insert: {
          bio?: string | null
          company?: string | null
          created_at?: string
          email?: string | null
          event_id: string
          id?: string
          is_featured?: boolean
          linkedin_url?: string | null
          name: string
          photo?: string | null
          sort_order?: number
          title?: string | null
          twitter_handle?: string | null
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          bio?: string | null
          company?: string | null
          created_at?: string
          email?: string | null
          event_id?: string
          id?: string
          is_featured?: boolean
          linkedin_url?: string | null
          name?: string
          photo?: string | null
          sort_order?: number
          title?: string | null
          twitter_handle?: string | null
          updated_at?: string
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "speakers_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      sponsor_coupons: {
        Row: {
          code: string
          created_at: string
          current_uses: number
          description: string | null
          discount_type: string
          discount_value: number
          id: string
          max_uses: number | null
          sponsor_id: string
          valid_until: string | null
        }
        Insert: {
          code: string
          created_at?: string
          current_uses?: number
          description?: string | null
          discount_type?: string
          discount_value: number
          id?: string
          max_uses?: number | null
          sponsor_id: string
          valid_until?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          current_uses?: number
          description?: string | null
          discount_type?: string
          discount_value?: number
          id?: string
          max_uses?: number | null
          sponsor_id?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sponsor_coupons_sponsor_id_fkey"
            columns: ["sponsor_id"]
            isOneToOne: false
            referencedRelation: "sponsors"
            referencedColumns: ["id"]
          },
        ]
      }
      sponsor_documents: {
        Row: {
          created_at: string
          file_type: string | null
          file_url: string
          id: string
          sort_order: number
          sponsor_id: string
          title: string
        }
        Insert: {
          created_at?: string
          file_type?: string | null
          file_url: string
          id?: string
          sort_order?: number
          sponsor_id: string
          title: string
        }
        Update: {
          created_at?: string
          file_type?: string | null
          file_url?: string
          id?: string
          sort_order?: number
          sponsor_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "sponsor_documents_sponsor_id_fkey"
            columns: ["sponsor_id"]
            isOneToOne: false
            referencedRelation: "sponsors"
            referencedColumns: ["id"]
          },
        ]
      }
      sponsor_leads: {
        Row: {
          company: string | null
          created_at: string
          email: string
          event_id: string
          id: string
          job_title: string | null
          name: string
          notes: string | null
          sponsor_id: string
          user_id: string
        }
        Insert: {
          company?: string | null
          created_at?: string
          email: string
          event_id: string
          id?: string
          job_title?: string | null
          name: string
          notes?: string | null
          sponsor_id: string
          user_id: string
        }
        Update: {
          company?: string | null
          created_at?: string
          email?: string
          event_id?: string
          id?: string
          job_title?: string | null
          name?: string
          notes?: string | null
          sponsor_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sponsor_leads_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sponsor_leads_sponsor_id_fkey"
            columns: ["sponsor_id"]
            isOneToOne: false
            referencedRelation: "sponsors"
            referencedColumns: ["id"]
          },
        ]
      }
      sponsor_tiers: {
        Row: {
          benefits: Json
          created_at: string
          event_id: string
          id: string
          logo_size: string
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          benefits?: Json
          created_at?: string
          event_id: string
          id?: string
          logo_size?: string
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          benefits?: Json
          created_at?: string
          event_id?: string
          id?: string
          logo_size?: string
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sponsor_tiers_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      sponsors: {
        Row: {
          booth_enabled: boolean
          contact_email: string | null
          created_at: string
          description: string | null
          event_id: string
          id: string
          logo: string | null
          name: string
          promo_video_url: string | null
          sort_order: number
          tier_id: string | null
          updated_at: string
          website_url: string | null
        }
        Insert: {
          booth_enabled?: boolean
          contact_email?: string | null
          created_at?: string
          description?: string | null
          event_id: string
          id?: string
          logo?: string | null
          name: string
          promo_video_url?: string | null
          sort_order?: number
          tier_id?: string | null
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          booth_enabled?: boolean
          contact_email?: string | null
          created_at?: string
          description?: string | null
          event_id?: string
          id?: string
          logo?: string | null
          name?: string
          promo_video_url?: string | null
          sort_order?: number
          tier_id?: string | null
          updated_at?: string
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sponsors_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sponsors_tier_id_fkey"
            columns: ["tier_id"]
            isOneToOne: false
            referencedRelation: "sponsor_tiers"
            referencedColumns: ["id"]
          },
        ]
      }
      survey_responses: {
        Row: {
          answers: Json
          created_at: string
          id: string
          registration_id: string | null
          respondent_email: string
          survey_id: string
        }
        Insert: {
          answers?: Json
          created_at?: string
          id?: string
          registration_id?: string | null
          respondent_email: string
          survey_id: string
        }
        Update: {
          answers?: Json
          created_at?: string
          id?: string
          registration_id?: string | null
          respondent_email?: string
          survey_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "survey_responses_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "registrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_responses_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "surveys"
            referencedColumns: ["id"]
          },
        ]
      }
      surveys: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          event_id: string
          id: string
          questions: Json
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          event_id: string
          id?: string
          questions?: Json
          status?: string
          title?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          event_id?: string
          id?: string
          questions?: Json
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "surveys_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_addons: {
        Row: {
          applies_to_tickets: string[] | null
          created_at: string
          description: string | null
          event_id: string
          id: string
          name: string
          price: number
          quantity: number | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          applies_to_tickets?: string[] | null
          created_at?: string
          description?: string | null
          event_id: string
          id?: string
          name: string
          price?: number
          quantity?: number | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          applies_to_tickets?: string[] | null
          created_at?: string
          description?: string | null
          event_id?: string
          id?: string
          name?: string
          price?: number
          quantity?: number | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_addons_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_type_categories: {
        Row: {
          category_id: string
          ticket_type_id: string
        }
        Insert: {
          category_id: string
          ticket_type_id: string
        }
        Update: {
          category_id?: string
          ticket_type_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_type_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "attendee_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_type_categories_ticket_type_id_fkey"
            columns: ["ticket_type_id"]
            isOneToOne: false
            referencedRelation: "ticket_types"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_types: {
        Row: {
          access_code: string | null
          created_at: string
          description: string | null
          event_id: string
          group_size: number | null
          id: string
          name: string
          price: number
          quantity: number | null
          sales_end: string | null
          sales_start: string | null
          sort_order: number
          type: string
          updated_at: string
        }
        Insert: {
          access_code?: string | null
          created_at?: string
          description?: string | null
          event_id: string
          group_size?: number | null
          id?: string
          name: string
          price?: number
          quantity?: number | null
          sales_end?: string | null
          sales_start?: string | null
          sort_order?: number
          type?: string
          updated_at?: string
        }
        Update: {
          access_code?: string | null
          created_at?: string
          description?: string | null
          event_id?: string
          group_size?: number | null
          id?: string
          name?: string
          price?: number
          quantity?: number | null
          sales_end?: string | null
          sales_start?: string | null
          sort_order?: number
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_types_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      tracks: {
        Row: {
          color: string | null
          created_at: string
          event_id: string
          id: string
          name: string
          sort_order: number
        }
        Insert: {
          color?: string | null
          created_at?: string
          event_id: string
          id?: string
          name: string
          sort_order?: number
        }
        Update: {
          color?: string | null
          created_at?: string
          event_id?: string
          id?: string
          name?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "tracks_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      user_badges: {
        Row: {
          badge_id: string
          earned_at: string
          event_id: string
          id: string
          user_id: string
        }
        Insert: {
          badge_id: string
          earned_at?: string
          event_id: string
          id?: string
          user_id: string
        }
        Update: {
          badge_id?: string
          earned_at?: string
          event_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badge_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_badges_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      waitlist_entries: {
        Row: {
          created_at: string
          email: string
          event_id: string
          id: string
          name: string
          ticket_type_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          event_id: string
          id?: string
          name: string
          ticket_type_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          event_id?: string
          id?: string
          name?: string
          ticket_type_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "waitlist_entries_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waitlist_entries_ticket_type_id_fkey"
            columns: ["ticket_type_id"]
            isOneToOne: false
            referencedRelation: "ticket_types"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      award_points: {
        Args: {
          _activity_type: string
          _event_id: string
          _reference_id?: string
          _reference_type?: string
          _user_id: string
        }
        Returns: number
      }
      cancel_meetup_rsvp: { Args: { _meetup_id: string }; Returns: undefined }
      cancel_session_rsvp: { Args: { _session_id: string }; Returns: undefined }
      create_dm_conversation: {
        Args: { p_event_id: string; p_other_user_id: string }
        Returns: string
      }
      create_organization_with_owner: {
        Args: { _name: string; _slug: string }
        Returns: string
      }
      is_conversation_member: {
        Args: { p_conversation_id: string }
        Returns: boolean
      }
      is_event_attendee: { Args: { _event_id: string }; Returns: boolean }
      is_org_member: {
        Args: { _min_role?: string; _org_id: string }
        Returns: boolean
      }
      lookup_user_by_email: {
        Args: { _email: string }
        Returns: {
          id: string
        }[]
      }
      recalculate_leaderboard: {
        Args: { _event_id: string }
        Returns: undefined
      }
      rsvp_to_meetup: { Args: { _meetup_id: string }; Returns: string }
      rsvp_to_session: { Args: { _session_id: string }; Returns: string }
      seed_demo_event_for_org: { Args: { _org_id: string }; Returns: undefined }
      user_event_ids: { Args: { uid: string }; Returns: string[] }
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
    Enums: {},
  },
} as const

