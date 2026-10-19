import { supabase, UPLOADS_BUCKET } from '@/lib/supabase';
import type { Announcement, Comment, FeedPost, PostType, Squad } from '@/lib/types';

export type SquadFilter = Squad | 'all';

export async function fetchPosts(options: {
  types?: PostType[];
  squad?: SquadFilter;
  search?: string;
  bookmarkedOnly?: boolean;
  authorId?: string;
}) {
  let query = supabase
    .from('post_feed')
    .select('*')
    .order('pinned', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(100);

  if (options.types?.length) {
    query = query.in('type', options.types);
  }
  if (options.squad && options.squad !== 'all') {
    // A squad's view shows its own posts plus posts shared with all squads.
    query = query.or(`squad.eq.${options.squad},squad.is.null`);
  }
  if (options.search?.trim()) {
    const term = options.search.trim().replace(/[%,()]/g, ' ');
    query = query.or(`title.ilike.%${term}%,body.ilike.%${term}%,subject.ilike.%${term}%`);
  }
  if (options.bookmarkedOnly) {
    query = query.eq('bookmarked', true);
  }
  if (options.authorId) {
    query = query.eq('author_id', options.authorId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data as FeedPost[];
}

export async function fetchPost(id: string) {
  const { data, error } = await supabase.from('post_feed').select('*').eq('id', id).single();
  if (error) throw error;
  return data as FeedPost;
}

export async function setVote(postId: string, voted: boolean) {
  const { error } = voted
    ? await supabase.from('votes').insert({ post_id: postId })
    : await supabase.from('votes').delete().eq('post_id', postId);
  if (error) throw error;
}

export async function setBookmark(postId: string, bookmarked: boolean) {
  const { error } = bookmarked
    ? await supabase.from('bookmarks').insert({ post_id: postId })
    : await supabase.from('bookmarks').delete().eq('post_id', postId);
  if (error) throw error;
}

export async function setPinned(postId: string, pinned: boolean) {
  const { error } = await supabase.rpc('set_pinned', { post: postId, value: pinned });
  if (error) throw error;
}

export async function deletePost(post: FeedPost) {
  const { error } = await supabase.from('posts').delete().eq('id', post.id);
  if (error) throw error;
  if (post.file_path) {
    await supabase.storage.from(UPLOADS_BUCKET).remove([post.file_path]);
  }
}

export async function reportContent(target: { postId?: string; commentId?: string }, reason: string) {
  const { error } = await supabase
    .from('reports')
    .insert({ post_id: target.postId ?? null, comment_id: target.commentId ?? null, reason });
  if (error) throw error;
}

export async function fetchComments(postId: string) {
  const { data, error } = await supabase
    .from('comments')
    .select('*, author:profiles(full_name, squad)')
    .eq('post_id', postId)
    .order('created_at');
  if (error) throw error;
  return data as Comment[];
}

export async function addComment(postId: string, body: string) {
  const { error } = await supabase.from('comments').insert({ post_id: postId, body });
  if (error) throw error;
}

export async function deleteComment(id: string) {
  const { error } = await supabase.from('comments').delete().eq('id', id);
  if (error) throw error;
}

export async function fetchAnnouncements(limit = 3) {
  const { data, error } = await supabase
    .from('announcements')
    .select('id, title, body, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data as Announcement[];
}

/** Uploads a picked file to `<user id>/<timestamp>-<name>` and returns its storage path. */
export async function uploadFile(userId: string, file: { uri: string; name: string; mimeType?: string }) {
  const safeName = file.name.replace(/[^\w.-]+/g, '_');
  const path = `${userId}/${Date.now()}-${safeName}`;
  const body = await (await fetch(file.uri)).arrayBuffer();
  const { error } = await supabase.storage
    .from(UPLOADS_BUCKET)
    .upload(path, body, { contentType: file.mimeType ?? 'application/octet-stream' });
  if (error) throw error;
  return path;
}

/** Files are private; members get a link that works for one hour. */
export async function getFileUrl(path: string) {
  const { data, error } = await supabase.storage.from(UPLOADS_BUCKET).createSignedUrl(path, 60 * 60);
  if (error) throw error;
  return data.signedUrl;
}

export function timeAgo(iso: string) {
  const seconds = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 86400 * 7) return `${Math.floor(seconds / 86400)}d ago`;
  return new Date(iso).toLocaleDateString();
}
