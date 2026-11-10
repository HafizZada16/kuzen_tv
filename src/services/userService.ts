import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

export interface BookmarkItem {
  id: number;
  user_id: number;
  anime_slug: string;
  anime_title: string;
  anime_thumb: string;
  source: 'otakudesu' | 'anichin' | 'westmanga' | 'pafi';
  created_at?: string;
}

export interface HistoryItem {
  id: number;
  user_id: number;
  anime_slug: string;
  anime_title: string;
  anime_thumb: string;
  episode_slug: string;
  episode_title: string;
  source: 'otakudesu' | 'anichin' | 'westmanga' | 'pafi';
  current_time?: number;
  total_duration?: number;
  updated_at: string;
}

export interface ToggleBookmarkResponse {
  status: 'success';
  message: string;
  action: 'added' | 'removed';
}

/**
 * Normalisasi URL thumbnail untuk menghindari domain mati
 */
export function normalizeThumbUrl(url: string | undefined | null): string {
  if (!url) return '';
  let clean = url.trim();
  if (clean.includes('storage.bukukomik.net')) {
    clean = clean.replace('storage.bukukomik.net', 'storage.westmanga.blog');
  }
  return clean;
}

let cachedUserId: number | null = null;
let cachedBookmarkList: BookmarkItem[] | null = null;
let lastBookmarkFetchTime = 0;
const BOOKMARK_LIST_CACHE_TTL = 60 * 1000; // 60 seconds

export function getCachedBookmarkList(): BookmarkItem[] | null {
  return cachedBookmarkList;
}

export function setCachedBookmarkList(data: BookmarkItem[]): void {
  cachedBookmarkList = data;
  lastBookmarkFetchTime = Date.now();
}

export function clearUserCache(): void {
  cachedUserId = null;
  historyListCache.clear();
  cachedBookmarkList = null;
  historySlugCache.clear();
}

/**
 * Mendapatkan ID user dari penyimpanan lokal secara asinkron
 */
export async function getUserId(): Promise<number | null> {
  if (cachedUserId) return cachedUserId;
  try {
    const storedUser = await AsyncStorage.getItem('@kuzen_auth_user');
    if (storedUser) {
      const user = JSON.parse(storedUser);
      cachedUserId = user.id ? Number(user.id) : null;
      return cachedUserId;
    }
  } catch (e) {
    console.error('Error getting user ID from AsyncStorage:', e);
  }
  return null;
}

/**
 * Mengambil daftar seluruh bookmark pengguna terautentikasi langsung dari Supabase
 */
export async function fetchBookmarks(forceRefresh: boolean = false): Promise<BookmarkItem[]> {
  if (!forceRefresh && cachedBookmarkList && Date.now() - lastBookmarkFetchTime < BOOKMARK_LIST_CACHE_TTL) {
    return cachedBookmarkList;
  }
  try {
    const userId = await getUserId();
    if (!userId) return cachedBookmarkList || [];

    const { data, error } = await supabase
      .from('bookmarks')
      .select('id, user_id, anime_slug, anime_title, anime_thumb, source, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching bookmarks from Supabase:', error);
      return cachedBookmarkList || [];
    }

    const items = (data || []).map((b: any) => ({
      ...b,
      anime_thumb: normalizeThumbUrl(b.anime_thumb),
    })) as BookmarkItem[];
    setCachedBookmarkList(items);
    return items;
  } catch (error) {
    console.error('Error fetching bookmarks:', error);
    return cachedBookmarkList || [];
  }
}

/**
 * Menambahkan atau menghapus bookmark media tertentu secara dinamis di Supabase
 */
export async function toggleBookmark(
  slug: string,
  title: string,
  thumb: string,
  source: 'anime' | 'donghua' | 'comic' | 'movie' | 'otakudesu' | 'anichin' | 'westmanga' | 'pafi'
): Promise<ToggleBookmarkResponse | null> {
  try {
    const userId = await getUserId();
    if (!userId) return null;

    let normSource = 'otakudesu';
    if (source === 'donghua' || source === 'anichin') {
      normSource = 'anichin';
    } else if (source === 'comic' || source === 'westmanga') {
      normSource = 'westmanga';
    } else if (source === 'movie') {
      normSource = 'pafi';
    }

    const { data: existing, error: checkError } = await supabase
      .from('bookmarks')
      .select('id')
      .eq('user_id', userId)
      .eq('anime_slug', slug)
      .eq('source', normSource)
      .maybeSingle();

    if (checkError) {
      console.error('Error checking bookmark in Supabase:', checkError);
      return null;
    }

    if (existing) {
      const { error: deleteError } = await supabase
        .from('bookmarks')
        .delete()
        .eq('id', existing.id);

      if (deleteError) {
        console.error('Error deleting bookmark from Supabase:', deleteError);
        return null;
      }

      if (cachedBookmarkList) {
        cachedBookmarkList = cachedBookmarkList.filter(
          (b) => b.id !== existing.id && b.anime_slug !== slug
        );
      }

      return {
        status: 'success',
        message: 'Bookmark berhasil dihapus',
        action: 'removed',
      };
    } else {
      const { data: insertedData, error: insertError } = await supabase
        .from('bookmarks')
        .insert({
          user_id: userId,
          anime_slug: slug,
          anime_title: title,
          anime_thumb: thumb,
          source: normSource,
        })
        .select('id, user_id, anime_slug, anime_title, anime_thumb, source, created_at');

      if (insertError) {
        console.error('Error inserting bookmark into Supabase:', insertError);
        return null;
      }

      if (cachedBookmarkList) {
        const newItem: BookmarkItem = (insertedData && insertedData[0]) ? (insertedData[0] as BookmarkItem) : {
          id: Date.now(),
          user_id: userId,
          anime_slug: slug,
          anime_title: title,
          anime_thumb: thumb,
          source: normSource as any,
          created_at: new Date().toISOString(),
        };
        cachedBookmarkList = [newItem, ...cachedBookmarkList];
      }

      return {
        status: 'success',
        message: 'Bookmark berhasil ditambahkan',
        action: 'added',
      };
    }
  } catch (error) {
    console.error('Error toggling bookmark:', error);
    return null;
  }
}

const historyListCache = new Map<string, { data: HistoryItem[]; timestamp: number }>();
const HISTORY_LIST_CACHE_TTL = 60 * 1000; // 60 seconds

export function getCachedHistoryList(source: string = 'all'): HistoryItem[] | null {
  const cacheKey = source && source !== 'all' ? source : 'all';
  const entry = historyListCache.get(cacheKey);
  if (entry && Date.now() - entry.timestamp < HISTORY_LIST_CACHE_TTL) {
    return entry.data;
  }
  return null;
}

export function setCachedHistoryList(data: HistoryItem[], source: string = 'all'): void {
  const cacheKey = source && source !== 'all' ? source : 'all';
  historyListCache.set(cacheKey, { data, timestamp: Date.now() });
}

export const HISTORY_PAGE_SIZE = 50;

/**
 * Mengambil riwayat menonton pengguna langsung dari Supabase dengan paginasi
 */
export async function fetchHistory(
  offset: number = 0,
  limit: number = HISTORY_PAGE_SIZE,
  forceRefresh: boolean = false,
  source?: string
): Promise<HistoryItem[]> {
  const cacheKey = source && source !== 'all' ? source : 'all';
  const cached = getCachedHistoryList(cacheKey);

  if (offset === 0 && !forceRefresh && cached) {
    return cached;
  }
  try {
    const userId = await getUserId();
    if (!userId) return offset === 0 ? (cached || []) : [];

    const from = offset;
    const to = offset + limit - 1;

    let query = supabase
      .from('watch_history')
      .select('id, user_id, anime_slug, anime_title, anime_thumb, episode_slug, episode_title, source, current_time, total_duration, updated_at')
      .eq('user_id', userId);

    if (source && source !== 'all') {
      query = query.eq('source', source);
    } else {
      query = query.neq('source', 'pafi');
    }

    const { data, error } = await query
      .order('updated_at', { ascending: false })
      .range(from, to);

    if (error) {
      console.error('Error fetching history from Supabase:', error);
      return offset === 0 ? (cached || []) : [];
    }

    const items = (data || []).map((h: any) => ({
      ...h,
      anime_thumb: normalizeThumbUrl(h.anime_thumb),
    })) as HistoryItem[];

    if (offset === 0) {
      setCachedHistoryList(items, cacheKey);
    } else {
      const existing = getCachedHistoryList(cacheKey) || [];
      const existingIds = new Set(existing.map((i) => i.id));
      const newItems = items.filter((i) => !existingIds.has(i.id));
      setCachedHistoryList([...existing, ...newItems], cacheKey);
    }
    return items;
  } catch (error) {
    console.error('Error fetching history:', error);
    return offset === 0 ? (cached || []) : [];
  }
}

const historySlugCache = new Map<string, { data: HistoryItem | null; timestamp: number }>();
const HISTORY_CACHE_TTL = 60 * 1000; // 60 seconds

export function getCachedHistoryBySlug(episodeSlug: string): HistoryItem | null | undefined {
  const item = historySlugCache.get(episodeSlug);
  if (!item) return undefined;
  if (Date.now() - item.timestamp > HISTORY_CACHE_TTL) {
    historySlugCache.delete(episodeSlug);
    return undefined;
  }
  return item.data;
}

export function setCachedHistoryBySlug(episodeSlug: string, data: HistoryItem | null): void {
  historySlugCache.set(episodeSlug, { data, timestamp: Date.now() });
}

export function invalidateHistoryCache(episodeSlug?: string): void {
  if (episodeSlug) {
    historySlugCache.delete(episodeSlug);
  } else {
    historySlugCache.clear();
    historyListCache.clear();
  }
}

/**
 * Mengambil riwayat menonton tertentu berdasarkan episodeSlug
 */
export async function fetchHistoryBySlug(episodeSlug: string, forceRefresh: boolean = false): Promise<HistoryItem | null> {
  if (!forceRefresh) {
    const cached = getCachedHistoryBySlug(episodeSlug);
    if (cached !== undefined) return cached;
  }

  try {
    const userId = await getUserId();
    if (!userId) return null;

    const { data, error } = await supabase
      .from('watch_history')
      .select('*')
      .eq('user_id', userId)
      .eq('episode_slug', episodeSlug)
      .order('updated_at', { ascending: false })
      .limit(1);

    if (error) {
      console.error('Error fetching history item from Supabase:', error);
      return null;
    }

    let result = data && data.length > 0 ? (data[0] as HistoryItem) : null;
    if (result) {
      result = { ...result, anime_thumb: normalizeThumbUrl(result.anime_thumb) };
    }
    setCachedHistoryBySlug(episodeSlug, result);
    return result;
  } catch (error) {
    console.error('Error fetching history item:', error);
    return null;
  }
}

/**
 * Mengambil semua riwayat menonton dari satu seri anime
 */
export async function fetchSeriesHistory(animeSlug: string): Promise<HistoryItem[]> {
  try {
    const userId = await getUserId();
    if (!userId) return [];

    const { data, error } = await supabase
      .from('watch_history')
      .select('*')
      .eq('user_id', userId)
      .eq('anime_slug', animeSlug);

    if (error) {
      console.error('Error fetching series history from Supabase:', error);
      return [];
    }

    return (data || []).map((h: any) => ({
      ...h,
      anime_thumb: normalizeThumbUrl(h.anime_thumb),
    })) as HistoryItem[];
  } catch (error) {
    console.error('Error fetching series history:', error);
    return [];
  }
}

/**
 * Mencatat riwayat baru atau memperbarui waktu tontonan terakhir di Supabase.
 * Menjaga current_time dan total_duration agar tidak di-overwrite 0 jika tidak dipass.
 */
export async function addHistory(
  animeSlug: string,
  animeTitle: string,
  animeThumb: string,
  episodeSlug: string,
  episodeTitle: string,
  source: 'anime' | 'donghua' | 'comic' | 'movie' | 'otakudesu' | 'anichin' | 'westmanga' | 'pafi',
  currentTime?: number,
  totalDuration?: number
): Promise<boolean> {
  try {
    const userId = await getUserId();
    if (!userId) return false;

    let normSource = 'otakudesu';
    if (source === 'donghua' || source === 'anichin') {
      normSource = 'anichin';
    } else if (source === 'comic' || source === 'westmanga') {
      normSource = 'westmanga';
    } else if (source === 'movie') {
      normSource = 'pafi';
    }

    // Ambil data lama dulu untuk mempertahankan current_time dan total_duration jika tidak di-pass
    const { data: existingData } = await supabase
      .from('watch_history')
      .select('id, current_time, total_duration, anime_thumb, anime_title')
      .eq('user_id', userId)
      .eq('episode_slug', episodeSlug)
      .order('updated_at', { ascending: false })
      .limit(1);

    const existing = existingData && existingData.length > 0 ? existingData[0] : null;

    const finalCurrentTime = currentTime !== undefined ? currentTime : (existing?.current_time || 0);
    const finalTotalDuration = (totalDuration && totalDuration > 0) ? totalDuration : (existing?.total_duration || 0);
    const finalThumb = normalizeThumbUrl((animeThumb && animeThumb !== '') ? animeThumb : (existing?.anime_thumb || ''));
    const finalTitle = (animeTitle && animeTitle !== '' && !animeTitle.toLowerCase().includes('episode') && !animeTitle.toLowerCase().includes('ep ')) ? animeTitle : (existing?.anime_title || animeTitle);

    if (existing && existing.id) {
      const { error: updateError } = await supabase
        .from('watch_history')
        .update({
          anime_title: finalTitle,
          anime_thumb: finalThumb,
          current_time: finalCurrentTime,
          total_duration: finalTotalDuration,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);

      if (updateError) {
        console.error('Error updating watch history in Supabase:', updateError);
        return false;
      }
    } else {
      const { error: insertError } = await supabase
        .from('watch_history')
        .insert({
          user_id: userId,
          anime_slug: animeSlug,
          anime_title: finalTitle,
          anime_thumb: finalThumb,
          episode_slug: episodeSlug,
          episode_title: episodeTitle,
          source: normSource,
          current_time: finalCurrentTime,
          total_duration: finalTotalDuration,
          updated_at: new Date().toISOString(),
        });

      if (insertError) {
        console.error('Error inserting watch history into Supabase:', insertError);
        return false;
      }
    }

    const nowIso = new Date().toISOString();
    const updatedItem: HistoryItem = {
      id: existing?.id || Date.now(),
      user_id: userId,
      anime_slug: animeSlug,
      anime_title: finalTitle,
      anime_thumb: finalThumb,
      episode_slug: episodeSlug,
      episode_title: episodeTitle,
      source: normSource as any,
      current_time: finalCurrentTime,
      total_duration: finalTotalDuration,
      updated_at: nowIso,
    };

    ['all', normSource].forEach((k) => {
      const entry = historyListCache.get(k);
      if (entry) {
        const filtered = entry.data.filter((h) => h.episode_slug !== episodeSlug);
        historyListCache.set(k, { data: [updatedItem, ...filtered], timestamp: Date.now() });
      }
    });

    invalidateHistoryCache(episodeSlug);
    return true;
  } catch (error) {
    console.error('Error adding history:', error);
    return false;
  }
}

/**
 * Menghapus entri riwayat tertentu berdasarkan ID
 */
export async function deleteHistory(id: number): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('watch_history')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting watch history from Supabase:', error);
      return false;
    }

    historyListCache.forEach((entry, key) => {
      historyListCache.set(key, {
        data: entry.data.filter((item) => item.id !== id),
        timestamp: entry.timestamp,
      });
    });
    return true;
  } catch (error) {
    console.error(`Error deleting history ID ${id}:`, error);
    return false;
  }
}

/**
 * Menghapus seluruh riwayat satu seri
 */
export async function deleteSeriesHistory(animeSlug: string): Promise<boolean> {
  try {
    const userId = await getUserId();
    if (!userId) return false;

    const { error } = await supabase
      .from('watch_history')
      .delete()
      .eq('user_id', userId)
      .eq('anime_slug', animeSlug);

    if (error) {
      console.error('Error deleting series history from Supabase:', error);
      return false;
    }

    historyListCache.forEach((entry, key) => {
      historyListCache.set(key, {
        data: entry.data.filter((item) => item.anime_slug !== animeSlug),
        timestamp: entry.timestamp,
      });
    });
    invalidateHistoryCache();
    return true;
  } catch (error) {
    console.error(`Error deleting series history ${animeSlug}:`, error);
    return false;
  }
}

