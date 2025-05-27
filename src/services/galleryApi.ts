import { createClient } from '@supabase/supabase-js';
import { Gallery, Like, Comment } from '../types/gallery';
import { dropboxService } from './api';

const supabaseUrl = process.env.SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

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
  return supabase.from('galleries').insert([gallery]).select().single();
}

export async function updateGallery(id: string, data: Partial<Gallery>) {
  return supabase.from('galleries').update(data).eq('id', id).select().single();
}

export async function deleteGallery(id: string) {
  return supabase.from('galleries').delete().eq('id', id);
}

/**
 * getGallery: Fetches gallery from Supabase. For UI image display, prefer getGalleryWithResolvedImages.
 */
export async function getGallery(id: string) {
  return supabase.from('galleries').select('*').eq('id', id).single();
}




/**
 * listGalleries: Fetches all galleries from Supabase. For UI image display, prefer listGalleriesWithResolvedImages.
 */
export async function listGalleries() {
  return supabase.from('galleries').select('*').order('created_at', { ascending: false });
}




// --- Likes ---
export async function likeGallery(gallery_id: string, user_id: string) {
  return supabase.from('likes').insert([{ gallery_id, user_id }]);
}

export async function unlikeGallery(gallery_id: string, user_id: string) {
  return supabase.from('likes').delete().eq('gallery_id', gallery_id).eq('user_id', user_id);
}

export async function getGalleryLikes(gallery_id: string) {
  return supabase.from('likes').select('*').eq('gallery_id', gallery_id);
}

// --- Comments ---
export async function addComment(gallery_id: string, user_id: string, content: string) {
  return supabase.from('comments').insert([{ gallery_id, user_id, content }]);
}

export async function getGalleryComments(gallery_id: string) {
  return supabase.from('comments').select('*').eq('gallery_id', gallery_id).order('created_at');
}
