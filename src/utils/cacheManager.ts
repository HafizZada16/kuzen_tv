import { Image } from 'expo-image';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { clearMediaMemoryCache } from '../services/mediaService';
import { invalidateHistoryCache } from '../services/userService';

export interface CacheCleanupResult {
  imageDiskCacheCleared: boolean;
  imageMemoryCacheCleared: boolean;
  memoryCacheCleared: boolean;
  success: boolean;
  timestamp: number;
}

const LAST_CACHE_CLEAN_KEY = '@kuzen_last_cache_clean';

/**
 * Get timestamp of the last cache cleanup from AsyncStorage
 */
export async function getLastCacheCleanTimestamp(): Promise<number | null> {
  try {
    const val = await AsyncStorage.getItem(LAST_CACHE_CLEAN_KEY);
    return val ? parseInt(val, 10) : null;
  } catch {
    return null;
  }
}

/**
 * Clear application image and media caches safely:
 * - Flushes Glide disk & memory cache (expo-image)
 * - Resets scrape & watch detail in-memory caches
 * - Safely removes stale non-essential AsyncStorage keys while PRESERVING user auth and bookmarks
 */
export async function clearAllAppCache(): Promise<CacheCleanupResult> {
  const result: CacheCleanupResult = {
    imageDiskCacheCleared: false,
    imageMemoryCacheCleared: false,
    memoryCacheCleared: false,
    success: false,
    timestamp: Date.now(),
  };

  try {
    // 1. Clear expo-image Glide cache (disk & memory)
    const [diskOk, memOk] = await Promise.all([
      Image.clearDiskCache().catch(() => false),
      Image.clearMemoryCache().catch(() => false),
    ]);
    result.imageDiskCacheCleared = diskOk;
    result.imageMemoryCacheCleared = memOk;

    // 2. Clear in-memory service caches (media scraping & history query caches)
    clearMediaMemoryCache();
    invalidateHistoryCache();
    result.memoryCacheCleared = true;

    // 3. Clear any transient temporary AsyncStorage keys without touching auth
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const tempKeys = allKeys.filter(
        (key) =>
          !key.startsWith('@kuzen_auth_') &&
          !key.startsWith('@supabase') &&
          (key.includes('temp') || key.includes('cached_stream'))
      );
      if (tempKeys.length > 0) {
        await AsyncStorage.multiRemove(tempKeys);
      }
      await AsyncStorage.setItem(LAST_CACHE_CLEAN_KEY, result.timestamp.toString());
    } catch (storageErr) {
      console.warn('Temporary storage cache clean warning:', storageErr);
    }

    result.success = true;
  } catch (err) {
    console.error('Failed to clear app cache:', err);
    result.success = false;
  }

  return result;
}

