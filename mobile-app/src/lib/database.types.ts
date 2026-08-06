export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type MediaType = 'video' | 'image' | 'audio';

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          display_name: string;
          id: string;
          username: string;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          display_name: string;
          id: string;
          username: string;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          display_name?: string;
          id?: string;
          username?: string;
        };
        Relationships: [];
      };
      media_posts: {
        Row: {
          caption: string;
          created_at: string;
          file_url: string;
          id: string;
          media_type: MediaType;
          thumbnail_url: string | null;
          user_id: string;
        };
        Insert: {
          caption: string;
          created_at?: string;
          file_url: string;
          id?: string;
          media_type: MediaType;
          thumbnail_url?: string | null;
          user_id: string;
        };
        Update: {
          caption?: string;
          created_at?: string;
          file_url?: string;
          id?: string;
          media_type?: MediaType;
          thumbnail_url?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'media_posts_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      questions: {
        Row: {
          body: string;
          created_at: string;
          id: string;
          title: string;
          user_id: string;
        };
        Insert: {
          body: string;
          created_at?: string;
          id?: string;
          title: string;
          user_id: string;
        };
        Update: {
          body?: string;
          created_at?: string;
          id?: string;
          title?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'questions_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      question_replies: {
        Row: {
          body: string;
          created_at: string;
          id: string;
          question_id: string;
          user_id: string;
        };
        Insert: {
          body: string;
          created_at?: string;
          id?: string;
          question_id: string;
          user_id: string;
        };
        Update: {
          body?: string;
          created_at?: string;
          id?: string;
          question_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'question_replies_question_id_fkey';
            columns: ['question_id'];
            isOneToOne: false;
            referencedRelation: 'questions';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'question_replies_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      media_comments: {
        Row: {
          body: string;
          created_at: string;
          id: string;
          media_post_id: string;
          user_id: string;
        };
        Insert: {
          body: string;
          created_at?: string;
          id?: string;
          media_post_id: string;
          user_id: string;
        };
        Update: {
          body?: string;
          created_at?: string;
          id?: string;
          media_post_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'media_comments_media_post_id_fkey';
            columns: ['media_post_id'];
            isOneToOne: false;
            referencedRelation: 'media_posts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'media_comments_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export type Profile = Database['public']['Tables']['profiles']['Row'];
export type MediaPost = Database['public']['Tables']['media_posts']['Row'];
export type Question = Database['public']['Tables']['questions']['Row'];
export type QuestionReply =
  Database['public']['Tables']['question_replies']['Row'];
export type MediaComment =
  Database['public']['Tables']['media_comments']['Row'];
