import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY, GALLERY_ENABLED } from '../config/env';
import type { Gallery, GalleryMedia, GalleryComment, GalleryLike } from '../types/gallery';
import { dropboxService } from './api';

let supabase: SupabaseClient | null = null;

// Initialize Supabase client only if gallery features are enabled and environment variables are set
const initializeSupabase = () => {
  if (!GALLERY_ENABLED) {
    console.log('📋 Gallery features are disabled via environment variable');
    return null;
  }

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.warn('⚠️ Supabase environment variables not configured:');
    console.warn(`   • SUPABASE_URL: ${SUPABASE_URL ? 'configured' : 'missing'}`);
    console.warn(`   • SUPABASE_ANON_KEY: ${SUPABASE_ANON_KEY ? 'configured' : 'missing'}`);
    console.warn('📋 Gallery features will be disabled');
    return null;
  }

  try {
    console.log('✅ Initializing Supabase client for gallery features');
    return createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  } catch (error) {
    console.error('❌ Failed to initialize Supabase client:', error);
    return null;
  }
};

// Initialize the client
supabase = initializeSupabase();

// Helper function to check if gallery features are available
export const isGalleryAvailable = (): boolean => {
  return GALLERY_ENABLED && supabase !== null;
};

// Helper function to get Supabase client with error handling
const getSupabaseClient = (): SupabaseClient => {
  if (!isGalleryAvailable() || !supabase) {
    throw new Error('Gallery features are not available. Please check your configuration.');
  }
  return supabase;
};

// Helper: resolve Dropbox paths to temporary URLs for a gallery object
async function resolveGalleryMediaLinks(gallery: Gallery): Promise<Gallery & { resolved_thumbnail_url: string; resolved_media_urls: string[] }> {
  if (gallery.thumbnail_path) {
    console.log('[Dropbox Debug] Resolving thumbnail_path:', gallery.thumbnail_path);
  }
  const resolved_thumbnail_url = gallery.thumbnail_path
    ? await dropboxService.getTemporaryLink(gallery.thumbnail_path).catch(err => {
        console.error('[Dropbox Debug] Failed to resolve thumbnail', gallery.thumbnail_path, err);
        return '';
      })
    : '';

  const resolved_media_urls = gallery.media_paths && gallery.media_paths.length > 0
    ? await Promise.all(gallery.media_paths.map(async (mediaPath: string) => {
        try {
          console.log('[Dropbox Debug] Resolving media path:', mediaPath);
          return await dropboxService.getTemporaryLink(mediaPath);
        } catch (err) {
          console.error('[Dropbox Debug] Failed to resolve Dropbox media', mediaPath, err);
          return '';
        }
      }))
    : [];
  return { ...gallery, resolved_thumbnail_url, resolved_media_urls };
}

/**
 * getGalleryWithResolvedImages: Fetches gallery and resolves Dropbox media paths to temporary URLs.
 */
export async function getGalleryWithResolvedImages(id: string) {
  const { data, error } = await getGallery(id);
  if (error || !data) return { data: null, error };
  const resolved = await resolveGalleryMediaLinks(data);
  return { data: resolved, error: null };
}

/**
 * listGalleriesWithResolvedImages: Fetches all galleries and resolves Dropbox media paths to temporary URLs.
 */
export async function listGalleriesWithResolvedImages() {
  const { data, error } = await listGalleries();
  if (error || !data) return { data: [], error };
  const resolved = await Promise.all(data.map(resolveGalleryMediaLinks));
  return { data: resolved, error: null };
}

// --- Gallery CRUD ---
export async function createGallery(gallery: Omit<Gallery, 'id' | 'created_at' | 'updated_at'>) {
  if (!isGalleryAvailable()) {
    throw new Error('Gallery features are not available. Please enable gallery features and configure Supabase.');
  }

  const client = getSupabaseClient();
  
  const { data, error } = await client
    .from('galleries')
    .insert([gallery])
    .select()
    .single();

  if (error) {
    console.error('Error creating gallery:', error);
    throw new Error(`Failed to create gallery: ${error.message}`);
  }

  return data;
}

export async function updateGallery(id: string, data: Partial<Gallery>) {
  if (!isGalleryAvailable()) {
    throw new Error('Gallery features are not available');
  }

  const client = getSupabaseClient();
  
  const { data, error } = await client
    .from('galleries')
    .update(data)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating gallery:', error);
    throw new Error(`Failed to update gallery: ${error.message}`);
  }

  return data;
}

export async function deleteGallery(id: string) {
  if (!isGalleryAvailable()) {
    throw new Error('Gallery features are not available');
  }

  const client = getSupabaseClient();
  
  const { error } = await client
    .from('galleries')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting gallery:', error);
    throw new Error(`Failed to delete gallery: ${error.message}`);
  }

  return true;
}

/**
 * getGallery: Fetches gallery from Supabase. For UI image display, prefer getGalleryWithResolvedImages.
 */
export async function getGallery(id: string) {
  if (!isGalleryAvailable()) {
    return null;
  }

  const client = getSupabaseClient();
  
  const { data, error } = await client
    .from('galleries')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching gallery:', error);
    return null;
  }

  return data;
}

/**
 * listGalleries: Fetches all galleries from Supabase. For UI image display, prefer listGalleriesWithResolvedImages.
 */
export async function listGalleries() {
  if (!isGalleryAvailable()) {
    console.log('Gallery features not available, returning empty array');
    return [];
  }

  const client = getSupabaseClient();
  
  const { data, error } = await client
    .from('galleries')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching galleries:', error);
    return [];
  }

  return data || [];
}

// --- Likes ---
export async function likeGallery(gallery_id: string, user_id: string) {
  if (!isGalleryAvailable()) {
    throw new Error('Gallery features are not available');
  }

  const client = getSupabaseClient();
  
  const { data, error } = await client
    .from('likes')
    .insert([{ gallery_id, user_id }])
    .select()
    .single();

  if (error) {
    console.error('Error adding like:', error);
    throw new Error(`Failed to add like: ${error.message}`);
  }

  return data;
}

export async function unlikeGallery(gallery_id: string, user_id: string) {
  if (!isGalleryAvailable()) {
    throw new Error('Gallery features are not available');
  }

  const client = getSupabaseClient();
  
  const { error } = await client
    .from('likes')
    .delete()
    .eq('gallery_id', gallery_id)
    .eq('user_id', user_id);

  if (error) {
    console.error('Error removing like:', error);
    throw new Error(`Failed to remove like: ${error.message}`);
  }

  return true;
}

export async function getGalleryLikes(gallery_id: string) {
  if (!isGalleryAvailable()) {
    return [];
  }

  const client = getSupabaseClient();
  
  const { data, error } = await client
    .from('likes')
    .select('*')
    .eq('gallery_id', gallery_id);

  if (error) {
    console.error('Error fetching likes:', error);
    return [];
  }

  return data || [];
}

// --- Comments ---
export async function addComment(gallery_id: string, user_id: string, content: string) {
  if (!isGalleryAvailable()) {
    throw new Error('Gallery features are not available');
  }

  const client = getSupabaseClient();
  
  const { data, error } = await client
    .from('comments')
    .insert([{ gallery_id, user_id, content }])
    .select()
    .single();

  if (error) {
    console.error('Error adding comment:', error);
    throw new Error(`Failed to add comment: ${error.message}`);
  }

  return data;
}

export async function getGalleryComments(gallery_id: string) {
  if (!isGalleryAvailable()) {
    return [];
  }

  const client = getSupabaseClient();
  
  const { data, error } = await client
    .from('comments')
    .select('*')
    .eq('gallery_id', gallery_id)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching comments:', error);
    return [];
  }

  return data || [];
}

export const galleryApi = {
  // Create a new gallery
  async createGallery(gallery: Omit<Gallery, 'id' | 'created_at' | 'updated_at'>): Promise<Gallery> {
    if (!isGalleryAvailable()) {
      throw new Error('Gallery features are not available. Please enable gallery features and configure Supabase.');
    }

    const client = getSupabaseClient();
    
    const { data, error } = await client
      .from('galleries')
      .insert([gallery])
      .select()
      .single();

    if (error) {
      console.error('Error creating gallery:', error);
      throw new Error(`Failed to create gallery: ${error.message}`);
    }

    return data;
  },

  // Get all galleries
  async getGalleries(): Promise<Gallery[]> {
    if (!isGalleryAvailable()) {
      console.log('Gallery features not available, returning empty array');
      return [];
    }

    const client = getSupabaseClient();
    
    const { data, error } = await client
      .from('galleries')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching galleries:', error);
      return [];
    }

    return data || [];
  },

  // Get a specific gallery by ID
  async getGallery(id: string): Promise<Gallery | null> {
    if (!isGalleryAvailable()) {
      return null;
    }

    const client = getSupabaseClient();
    
    const { data, error } = await client
      .from('galleries')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching gallery:', error);
      return null;
    }

    return data;
  },

  // Update a gallery
  async updateGallery(id: string, updates: Partial<Gallery>): Promise<Gallery | null> {
    if (!isGalleryAvailable()) {
      throw new Error('Gallery features are not available');
    }

    const client = getSupabaseClient();
    
    const { data, error } = await client
      .from('galleries')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating gallery:', error);
      throw new Error(`Failed to update gallery: ${error.message}`);
    }

    return data;
  },

  // Delete a gallery
  async deleteGallery(id: string): Promise<boolean> {
    if (!isGalleryAvailable()) {
      throw new Error('Gallery features are not available');
    }

    const client = getSupabaseClient();
    
    const { error } = await client
      .from('galleries')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting gallery:', error);
      throw new Error(`Failed to delete gallery: ${error.message}`);
    }

    return true;
  },

  // Add a like to a gallery
  async addLike(galleryId: string, userEmail: string): Promise<GalleryLike> {
    if (!isGalleryAvailable()) {
      throw new Error('Gallery features are not available');
    }

    const client = getSupabaseClient();
    
    const { data, error } = await client
      .from('likes')
      .insert([{ gallery_id: galleryId, user_email: userEmail }])
      .select()
      .single();

    if (error) {
      console.error('Error adding like:', error);
      throw new Error(`Failed to add like: ${error.message}`);
    }

    return data;
  },

  // Remove a like from a gallery
  async removeLike(galleryId: string, userEmail: string): Promise<boolean> {
    if (!isGalleryAvailable()) {
      throw new Error('Gallery features are not available');
    }

    const client = getSupabaseClient();
    
    const { error } = await client
      .from('likes')
      .delete()
      .eq('gallery_id', galleryId)
      .eq('user_email', userEmail);

    if (error) {
      console.error('Error removing like:', error);
      throw new Error(`Failed to remove like: ${error.message}`);
    }

    return true;
  },

  // Get likes for a gallery
  async getLikes(galleryId: string): Promise<GalleryLike[]> {
    if (!isGalleryAvailable()) {
      return [];
    }

    const client = getSupabaseClient();
    
    const { data, error } = await client
      .from('likes')
      .select('*')
      .eq('gallery_id', galleryId);

    if (error) {
      console.error('Error fetching likes:', error);
      return [];
    }

    return data || [];
  },

  // Add a comment to a gallery
  async addComment(comment: Omit<GalleryComment, 'id' | 'created_at'>): Promise<GalleryComment> {
    if (!isGalleryAvailable()) {
      throw new Error('Gallery features are not available');
    }

    const client = getSupabaseClient();
    
    const { data, error } = await client
      .from('comments')
      .insert([comment])
      .select()
      .single();

    if (error) {
      console.error('Error adding comment:', error);
      throw new Error(`Failed to add comment: ${error.message}`);
    }

    return data;
  },

  // Get comments for a gallery
  async getComments(galleryId: string): Promise<GalleryComment[]> {
    if (!isGalleryAvailable()) {
      return [];
    }

    const client = getSupabaseClient();
    
    const { data, error } = await client
      .from('comments')
      .select('*')
      .eq('gallery_id', galleryId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching comments:', error);
      return [];
    }

    return data || [];
  },

  // Search galleries by title or description
  async searchGalleries(query: string): Promise<Gallery[]> {
    if (!isGalleryAvailable()) {
      return [];
    }

    const client = getSupabaseClient();
    
    const { data, error } = await client
      .from('galleries')
      .select('*')
      .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error searching galleries:', error);
      return [];
    }

    return data || [];
  }
};
