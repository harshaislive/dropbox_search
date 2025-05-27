export interface Gallery {
  id: string;
  user_id?: string;
  user_email?: string;
  title: string;
  summary?: string;
  thumbnail_path: string;
  media_paths: string[];
  media_types: ('image' | 'video')[];
  created_at: string;
  updated_at?: string;
  // UI-resolved fields
  resolved_thumbnail_url?: string;
  resolved_media_urls?: string[];
}

export interface Like {
  id: string;
  gallery_id: string;
  user_id: string;
  created_at: string;
}

export interface Comment {
  id: string;
  gallery_id: string;
  user_id: string;
  content: string;
  created_at: string;
}
