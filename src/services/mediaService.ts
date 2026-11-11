import api from './api';

const cleanAnimeTitle = (title: string): string => {
  if (!title) return '';
  return title.replace(/\s*(Subtitle Indonesia|Sub Indo)\s*$/i, '').trim();
};

export const resolveMediaUrl = (url?: string): string => {
  if (!url) return '';
  const trimmed = url.trim();
  if (trimmed.startsWith('//')) return 'https:' + trimmed;
  if (trimmed.startsWith('/')) return `https://kuzen.web.id${trimmed}`;
  return trimmed;
};

// --- TYPES DEFINITION ---

export interface MediaItem {
  title: string;
  slug: string;
  thumb: string;
  status?: string;
  rating?: string;
  type?: 'anime' | 'donghua' | 'comic' | 'movie';
  comicType?: string;
  country?: string;
  isColor?: boolean;
}

export interface BatchDownloadLink {
  label: string;
  url: string;
}

export interface BatchQualityItem {
  quality: string;
  links: BatchDownloadLink[];
}

export interface BatchItem {
  title?: string;
  downloads: BatchQualityItem[];
}

export interface BatchDetail {
  title: string;
  batch?: BatchItem[];
  episodes?: BatchItem[];
}

export interface AnimeDetail {
  title: string;
  thumb: string;
  synopsis: string;
  rating: string;
  status: string;
  genres: string[];
  info: Record<string, string>;
  episodes: {
    title: string;
    slug: string;
  }[];
  batch?: {
    title?: string;
    slug?: string;
    url?: string;
    id?: string;
    date?: string;
  } | null;
}

export interface ServerItem {
  label: string;
  url: string;
  quality?: string;
  type?: string;
  isHls?: boolean;
  badge?: string;
  rawUrl?: string;
  providerId?: string;
}

export interface SubtitleItem {
  id?: string;
  label?: string;
  lang?: string;
  url: string;
}

export interface WatchResponse {
  title: string;
  slug?: string;
  stream_url: string;
  anime_slug?: string;
  servers?: ServerItem[];
  subtitles?: SubtitleItem[];
  video_sources?: { label: string; file: string; type: string }[];
  episodes?: { title: string; slug: string }[];
  downloads?: { quality: string; links: { label: string; url: string }[] }[];
  referer?: string;
  thumb?: string;
  is_hybrid?: boolean;
  hybrid?: {
    eligible?: boolean;
    ready?: boolean;
    source?: string;
    lazy_endpoint?: string;
  };
}

export interface ComicDetail {
  title: string;
  thumb: string;
  synopsis: string;
  rating: string;
  status: string;
  author: string;
  genres: string[];
  comicType?: string;
  country?: string;
  isColor?: boolean;
  chapters: {
    title: string;
    slug: string;
    date: string;
  }[];
}

export interface ComicViewResponse {
  title: string;
  images: string[];
  chapters?: { title: string; slug: string }[];
  prevSlug?: string;
  nextSlug?: string;
}

// --- SERVICE IMPLEMENTATIONS ---

/**
 * 1. ANIME SERVICES (Otakudesu via Proxy)
 */
export async function fetchOngoingAnime(page: number = 1): Promise<MediaItem[]> {
  try {
    const response = await api.get(`/public/api/otakudesu/ongoing?page=${page}`);
    return (response.data.data || []).map((item: any) => ({
      title: cleanAnimeTitle(item.title),
      slug: item.slug,
      thumb: item.thumb,
      status: item.episode,
      type: 'anime',
    }));
  } catch (error) {
    console.error('Error ongoing anime:', error);
    return [];
  }
}

const animeDetailMemoryCache = new Map<string, { data: AnimeDetail; timestamp: number }>();
const DETAIL_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

export function getCachedAnimeDetail(slug: string): AnimeDetail | null {
  const item = animeDetailMemoryCache.get(slug);
  if (!item) return null;
  if (Date.now() - item.timestamp > DETAIL_CACHE_TTL) {
    animeDetailMemoryCache.delete(slug);
    return null;
  }
  return item.data;
}

export function setCachedAnimeDetail(slug: string, detail: AnimeDetail): void {
  animeDetailMemoryCache.set(slug, { data: detail, timestamp: Date.now() });
}

export async function fetchAnimeDetail(slug: string, forceRefresh: boolean = false): Promise<AnimeDetail> {
  if (!forceRefresh) {
    const cached = getCachedAnimeDetail(slug);
    if (cached) return cached;
  }

  const response = await api.get(`/detail/${slug}`);
  const raw = response.data.data || response.data;

  const genreStr = raw.info?.Genre || '';
  const parsedGenres = genreStr ? genreStr.split(',').map((g: string) => g.trim()) : [];

  const detail: AnimeDetail = {
    title: cleanAnimeTitle(raw.title || ''),
    thumb: raw.thumb || '',
    synopsis: raw.synopsis || 'Tidak ada sinopsis tersedia.',
    rating: raw.info?.Skor || raw.rating || '',
    status: raw.info?.Status || raw.status || 'Ongoing',
    genres: parsedGenres,
    info: raw.info || {},
    episodes: (raw.episodeList || raw.episodes || []).map((ep: any) => ({
      title: ep.title || '',
      slug: ep.slug || '',
    })),
    batch: raw.batch || null,
  };

  setCachedAnimeDetail(slug, detail);
  return detail;
}

export async function fetchAnimeBatch(slug: string): Promise<BatchDetail> {
  const response = await api.get(`/batch/${slug}`);
  const raw = response.data.data || response.data;

  const filterLinks = (links: BatchDownloadLink[]) => {
    if (!Array.isArray(links)) return [];
    return links.filter((l) => {
      const lName = (l.label || '').toLowerCase();
      const lUrl = (l.url || '').toLowerCase();
      return (
        !lName.includes('solidfiles') &&
        !lUrl.includes('solidfiles.com') &&
        !lName.includes('zippyshare') &&
        !lUrl.includes('zippyshare.com')
      );
    });
  };

  const sanitizeBatchItems = (items: any[] = []): BatchItem[] => {
    return items
      .map((item: any) => ({
        title: item.title,
        downloads: (item.downloads || [])
          .map((dl: any) => ({
            quality: dl.quality,
            links: filterLinks(dl.links || []),
          }))
          .filter((dl: BatchQualityItem) => dl.links.length > 0),
      }))
      .filter((item: BatchItem) => item.downloads.length > 0);
  };

  return {
    title: cleanAnimeTitle(raw.title || ''),
    batch: sanitizeBatchItems(raw.batch || []),
    episodes: sanitizeBatchItems(raw.episodes || []),
  };
}

const watchDataMemoryCache = new Map<string, { data: WatchResponse; timestamp: number }>();
const WATCH_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export function getCachedAnimeWatch(slug: string): WatchResponse | null {
  const item = watchDataMemoryCache.get(slug);
  if (!item) return null;
  if (Date.now() - item.timestamp > WATCH_CACHE_TTL) {
    watchDataMemoryCache.delete(slug);
    return null;
  }
  return item.data;
}

export function setCachedAnimeWatch(slug: string, data: WatchResponse): void {
  watchDataMemoryCache.set(slug, { data, timestamp: Date.now() });
}

export async function fetchAnimeWatch(slug: string, forceRefresh: boolean = false): Promise<WatchResponse> {
  if (!forceRefresh) {
    const cached = getCachedAnimeWatch(slug);
    if (cached) return cached;
  }

  const response = await api.get(`/watch/${slug}`);
  const raw = response.data.data || response.data;
  const servers = raw.serverList || raw.mirror_embed || [];
  const defaultUrl = raw.iframe || raw.sturl || raw.url || servers[0]?.url || servers[0]?.sturl || '';

  let episodes = raw.episodes || raw.episodeList;
  if (!episodes || episodes.length === 0) {
    try {
      const seriesSlug = slug.split('-episode-')[0];
      let cachedSeries = getCachedAnimeDetail(seriesSlug);
      if (!cachedSeries && !seriesSlug.endsWith('-sub-indo')) {
        cachedSeries = getCachedAnimeDetail(`${seriesSlug}-sub-indo`);
      }
      if (cachedSeries && cachedSeries.episodes && cachedSeries.episodes.length > 0) {
        episodes = cachedSeries.episodes;
      } else {
        const detailRes = await api.get(`/detail/${seriesSlug}`).catch(() => api.get(`/detail/${seriesSlug}-sub-indo`));
        const detailData = detailRes?.data?.data || detailRes?.data;
        if (detailData && (detailData.episodeList || detailData.episodes)) {
          episodes = detailData.episodeList || detailData.episodes;
        }
      }
    } catch (e) {
      console.warn('Failed to fetch fallback episodes list:', e);
    }
  }

  const mappedServers: any[] = [];

  const wrapStreamUrl = (rawUrl: string): string => {
    if (!rawUrl) return '';
    let u = rawUrl.replace(/&amp;/g, '&').trim();
    if (u.startsWith('//')) {
      u = 'https:' + u;
    } else if (u.startsWith('/')) {
      u = `https://kuzen.web.id${u}`;
    }

    const lower = u.toLowerCase();
    if (
      !lower.includes('kuzen.web.id/api/iframe-proxy') &&
      !lower.includes('kuzen.web.id/api/pdrain-embed') &&
      !lower.includes('kuzen.web.id/api/mega-embed') &&
      !lower.includes('kuzen.web.id/api/acefile-embed') &&
      !lower.includes('kuzen.web.id/api/sharer-embed') &&
      !lower.includes('kuzen.web.id/api/kraken-embed') &&
      !lower.includes('drive.google.com') &&
      !lower.includes('acefile.co') &&
      !lower.includes('krakenfiles.com') &&
      !lower.includes('mega.nz') &&
      (lower.includes('desustream') ||
        lower.includes('/dstream/') ||
        lower.includes('odcdn') ||
        lower.includes('ondesu') ||
        lower.includes('moedesu') ||
        (lower.includes('pdrain') && !lower.includes('pdrain-embed')) ||
        lower.includes('pixeldrain') ||
        lower.includes('otaku') ||
        lower.includes('nunadrama') ||
        lower.includes('anichin') ||
        lower.includes('miraishare') ||
        lower.includes('animexin'))
    ) {
      return `https://kuzen.web.id/api/iframe-proxy?url=${encodeURIComponent(u)}`;
    }
    return u;
  };

  servers.forEach((s: any) => {
    let u = wrapStreamUrl(s.url || s.sturl || '');
    if (u) {
      let label = s.serverName || s.title || s.name || 'Server';
      const labelLower = label.toLowerCase();
      const urlLower = u.toLowerCase();

      const isShortlink =
        urlLower.includes('desudrive') ||
        urlLower.includes('safelink') ||
        urlLower.includes('shortlink') ||
        urlLower.includes('shorturl') ||
        urlLower.includes('linkpoi') ||
        urlLower.includes('ouo.io') ||
        urlLower.includes('ouo.press') ||
        urlLower.includes('coeg') ||
        urlLower.includes('hexafile');

      if (
        labelLower.includes('filedon') ||
        urlLower.includes('filedon') ||
        (labelLower.includes('mega') && isShortlink)
      ) {
        return;
      }
      const q = s.quality || s.resolution || '';
      if (q && !label.toLowerCase().includes(q.toLowerCase())) {
        label = `${label} (${q})`;
      }
      mappedServers.push({
        label,
        url: u,
        type: 'iframe',
        quality: q || undefined,
      });
    }
  });

  const finalStreamUrl = wrapStreamUrl(defaultUrl);

  const result: WatchResponse = {
    title: cleanAnimeTitle(raw.title || ''),
    thumb: raw.thumb || '',
    stream_url:
      !finalStreamUrl.toLowerCase().includes('filedon') && finalStreamUrl
        ? finalStreamUrl
        : mappedServers[0]?.url || '',
    anime_slug: raw.slug || slug.split('-episode-')[0],
    servers: mappedServers.filter((s) => !!s.url),
    video_sources: mappedServers
      .filter((s) => !!s.url)
      .map((s: any) => ({
        label: s.label,
        file: s.url,
        type: s.type,
      })),
    episodes: (episodes || []).map((ep: any) => ({
      title: ep.title || '',
      slug: ep.slug || '',
    })),
    downloads: (raw.downloads || []).map((dl: any) => ({
      quality: dl.quality || '',
      links: (dl.links || []).map((l: any) => {
        let lUrl = (l.url || '').trim();
        if (lUrl.startsWith('//')) lUrl = 'https:' + lUrl;
        else if (lUrl.startsWith('/')) lUrl = 'https://kuzen.web.id' + lUrl;
        return {
          label: l.label || '',
          url: lUrl,
        };
      }),
    })),
  };

  setCachedAnimeWatch(slug, result);
  return result;
}

export async function searchAnime(query: string): Promise<MediaItem[]> {
  try {
    const response = await api.get(`/public/api/otakudesu/search?q=${encodeURIComponent(query)}`);
    return (response.data.data || []).map((item: any) => ({
      title: cleanAnimeTitle(item.title),
      slug: item.slug,
      thumb: item.thumb,
      rating: item.rating,
      type: 'anime',
    }));
  } catch {
    return [];
  }
}

/**
 * 2. DONGHUA SERVICES (Anichin Scraper)
 */
const cleanDonghuaCard = (item: any): { title: string; slug: string; status: string } => {
  const rawTitle = item.title || '';
  const rawSlug = item.slug || '';
  const cleanTitle = rawTitle
    .replace(/\s*(?:episode|eps|ep)\.?\s*\d+.*$/i, '')
    .replace(/\s*(Subtitle Indonesia|Sub Indo)\s*$/i, '')
    .trim();
  const seriesSlug = rawSlug.replace(/-episode-\d+.*$/i, '');
  const epMatch = (rawTitle || rawSlug).match(/(?:episode|eps|ep)\.?\s*(\d+(\.\d+)?)/i);
  const status = item.episode || (epMatch ? `Episode ${epMatch[1]}` : item.status || 'Ongoing');

  return {
    title: cleanTitle || rawTitle,
    slug: seriesSlug || rawSlug,
    status,
  };
};

export async function fetchPopularDonghua(page: number = 1): Promise<MediaItem[]> {
  try {
    const response = await api.get(`/anichin/popular?page=${page}`);
    const items = response.data.data || (Array.isArray(response.data) ? response.data : []);
    return items.map((item: any) => {
      const card = cleanDonghuaCard(item);
      return {
        title: card.title,
        slug: card.slug,
        thumb: resolveMediaUrl(item.thumb || item.thumbnail),
        rating: item.rating || item.score,
        status: card.status,
        type: 'donghua',
      };
    });
  } catch {
    return [];
  }
}

export async function fetchOngoingDonghua(page: number = 1): Promise<MediaItem[]> {
  try {
    const response = await api.get(`/anichin/ongoing?page=${page}`);
    const items = response.data.data || (Array.isArray(response.data) ? response.data : []);
    return items.map((item: any) => {
      const card = cleanDonghuaCard(item);
      return {
        title: card.title,
        slug: card.slug,
        thumb: resolveMediaUrl(item.thumb || item.thumbnail),
        status: card.status,
        type: 'donghua',
      };
    });
  } catch {
    return [];
  }
}

export async function fetchCompletedDonghua(page: number = 1): Promise<MediaItem[]> {
  try {
    const response = await api.get(`/anichin/completed?page=${page}`);
    const items = response.data.data || (Array.isArray(response.data) ? response.data : []);
    return items.map((item: any) => {
      const card = cleanDonghuaCard(item);
      return {
        title: card.title,
        slug: card.slug,
        thumb: resolveMediaUrl(item.thumb || item.thumbnail),
        status: card.status || 'Completed',
        type: 'donghua',
      };
    });
  } catch {
    return [];
  }
}

export async function fetchDonghuaByGenre(genreSlug: string, page: number = 1): Promise<MediaItem[]> {
  try {
    const response = await api.get(`/anichin/genre/${genreSlug}?page=${page}`);
    const items = response.data.data || (Array.isArray(response.data) ? response.data : []);
    return items.map((item: any) => {
      const card = cleanDonghuaCard(item);
      return {
        title: card.title,
        slug: card.slug,
        thumb: resolveMediaUrl(item.thumb || item.thumbnail),
        status: card.status,
        type: 'donghua',
      };
    });
  } catch {
    return [];
  }
}

export async function fetchDonghuaDetail(slug: string): Promise<AnimeDetail> {
  const cleanSeriesSlug = slug.replace(/-episode-\d+.*$/i, '');
  let raw: any = null;
  let rawEpisodes: any[] = [];

  try {
    const res = await api.get(`/anichin/detail/${cleanSeriesSlug}`);
    raw = res.data?.data || res.data || {};
    rawEpisodes = raw.episodes || raw.episodeList || raw.episode_list || [];
  } catch (_) {}

  if ((!raw || !rawEpisodes || rawEpisodes.length === 0) && slug.includes('-episode-')) {
    try {
      const watchRes = await api.get(`/anichin/watch/${slug}`);
      const watchRaw = watchRes.data?.data || watchRes.data || {};

      const resolvedSeriesSlug =
        watchRaw.anime_slug ||
        watchRaw.series_slug ||
        (watchRaw.slug && !watchRaw.slug.includes('-episode-') ? watchRaw.slug : null);

      if (resolvedSeriesSlug && resolvedSeriesSlug !== cleanSeriesSlug) {
        try {
          const detailRes = await api.get(`/anichin/detail/${resolvedSeriesSlug}`);
          const detailRaw = detailRes.data?.data || detailRes.data || {};
          const detailEps = detailRaw.episodes || detailRaw.episodeList || detailRaw.episode_list || [];
          if (detailEps && detailEps.length > 0) {
            raw = detailRaw;
            rawEpisodes = detailEps;
          }
        } catch (_) {}
      }

      if ((!rawEpisodes || rawEpisodes.length === 0) && (watchRaw.episodes || watchRaw.episodeList)) {
        const watchEps = watchRaw.episodes || watchRaw.episodeList || [];
        if (watchEps.length > 0) {
          if (!raw) raw = watchRaw;
          rawEpisodes = watchEps;
        }
      }
    } catch (_) {}
  }

  if (!raw) {
    try {
      const fallbackRes = await api.get(`/anichin/detail/${slug}`);
      raw = fallbackRes.data?.data || fallbackRes.data || {};
      rawEpisodes = raw.episodes || raw.episodeList || raw.episode_list || [];
    } catch (err) {
      if (cleanSeriesSlug !== slug) {
        throw err;
      }
    }
  }

  if (!raw) {
    throw new Error('Gagal memuat detail donghua');
  }

  let title = raw.title || '';
  if (/(?:episode|eps|ep)\.?\s*\d+/i.test(title)) {
    title =
      title
        .replace(/\s*(?:episode|eps|ep)\.?\s*\d+.*$/i, '')
        .replace(/\s*(Subtitle Indonesia|Sub Indo)\s*$/i, '')
        .trim() || raw.title;
  }

  const genreStr = raw.info?.Genre || raw.info?.Genres || '';
  const parsedGenres = genreStr ? genreStr.split(',').map((g: string) => g.trim()).filter(Boolean) : [];

  return {
    title: title || raw.title || '',
    thumb: resolveMediaUrl(raw.thumb || raw.thumbnail),
    synopsis: raw.synopsis || raw.sinopsis || 'Tidak ada sinopsis tersedia.',
    rating: raw.info?.Skor || raw.info?.Score || raw.rating || '',
    status: raw.info?.Status || raw.status || 'Ongoing',
    genres:
      raw.genres && Array.isArray(raw.genres) && raw.genres.length > 0
        ? raw.genres
        : parsedGenres.length > 0
        ? parsedGenres
        : [],
    info: raw.info || {},
    episodes: rawEpisodes.map((ep: any) => ({
      title: ep.title || (ep.episode ? `Episode ${ep.episode}` : ''),
      slug: ep.slug || '',
    })),
  };
}

export async function fetchDonghuaWatch(slug: string): Promise<WatchResponse> {
  let response = await api.get(`/anichin/watch/${slug}`);
  let raw = response.data?.data || response.data || {};

  const initialServers = raw.players || raw.serverList || raw.mirror_embed || [];
  const initialStream =
    raw.stream_url || raw.embed_url || raw.iframe || raw.url || raw.kurama_stream || response.data?.kurama_stream;

  if ((!initialServers || initialServers.length === 0) && !initialStream) {
    if (!slug.includes('force=')) {
      try {
        const forceRes = await api.get(`/anichin/watch/${slug}?force=1`);
        if (
          forceRes.data &&
          (forceRes.data.data || forceRes.data.status === 'success' || forceRes.data.kurama_stream)
        ) {
          response = forceRes;
          raw = forceRes.data.data || forceRes.data || {};
        }
      } catch (_) {}
    }

    const checkServers = raw.players || raw.serverList || raw.mirror_embed || [];
    const checkStream =
      raw.stream_url || raw.embed_url || raw.iframe || raw.url || raw.kurama_stream || response.data?.kurama_stream;

    if ((!checkServers || checkServers.length === 0) && !checkStream) {
      const seriesSlug = slug.replace(/-episode-\d+.*$/i, '');
      const epMatch = slug.match(/-episode-0*(\d+)/i);
      if (epMatch) {
        const epNum = parseInt(epMatch[1], 10);
        try {
          const detailRes = await api.get(`/anichin/detail/${seriesSlug}`);
          const detailData = detailRes.data?.data || detailRes.data;
          const eps = detailData?.episodes || detailData?.episode_list || detailData?.episodeList || [];
          for (const epItem of eps) {
            const epTitle = epItem.title || '';
            const candSlug = epItem.slug || '';
            const titleMatches = new RegExp(`(?:episode|eps|ep)\\s*0*${epNum}\\b`, 'i').test(epTitle);
            const slugMatches = new RegExp(`-episode-0*${epNum}(?:-|$)`, 'i').test(candSlug);
            if (titleMatches || slugMatches) {
              const candRes = await api.get(`/anichin/watch/${candSlug}`);
              const candRaw = candRes.data?.data || candRes.data;
              if (candRaw && (candRaw.players?.length || candRaw.stream_url || candRaw.title)) {
                response = candRes;
                raw = candRaw;
                raw.slug = candSlug;
                break;
              }
            }
          }
        } catch (_) {}
      }
    }
  }

  let episodes = raw.episodes || raw.episodeList || raw.episode_list;
  if (!episodes || episodes.length === 0) {
    try {
      const seriesSlug = slug.split('-episode-')[0];
      const detailRes = await api.get(`/anichin/detail/${seriesSlug}`);
      const detailData = detailRes.data.data || detailRes.data;
      if (detailData && (detailData.episodes || detailData.episodeList || detailData.episode_list)) {
        episodes = detailData.episodes || detailData.episodeList || detailData.episode_list;
      }
    } catch (e) {
      console.warn('Failed to fetch fallback donghua episodes list:', e);
    }
  }

  const kuramaStreamData = raw.kurama_stream || response.data?.kurama_stream;
  const rawServers: any[] = [];
  if (kuramaStreamData && (kuramaStreamData.url || kuramaStreamData.sturl)) {
    rawServers.push(kuramaStreamData);
  }

  const additional = raw.players || raw.serverList || raw.mirror_embed || raw.streams || [];
  if (Array.isArray(additional)) {
    additional.forEach((server: any) => {
      const sUrl = (server.url || server.sturl || '').replace(/&amp;/g, '&').trim();
      if (!sUrl) return;
      if (!rawServers.some((s) => (s.url || s.sturl || '').trim() === sUrl)) {
        rawServers.push(server);
      }
    });
  }

  const allServers: ServerItem[] = [];

  rawServers.forEach((server: any) => {
    const name = server.provider || server.title || server.serverName || server.name || '';
    let sUrl = (server.url || server.sturl || '').replace(/&amp;/g, '&').trim();
    if (!sUrl) return;

    const sUrlLower = sUrl.toLowerCase();

    if (name.toLowerCase().includes('solidfiles') || sUrl.toLowerCase().includes('solidfiles.com')) return;
    if (name.toLowerCase().includes('zippyshare') || sUrl.toLowerCase().includes('zippyshare.com')) return;
    if (name.toLowerCase().includes('acefile') || sUrl.toLowerCase().includes('acefile')) return;
    if (name.toLowerCase().includes('all sub') || name.toLowerCase().includes('hardsub') || sUrl.toLowerCase().includes('animexin')) return;

    let displayName = name;
    if (displayName.toLowerCase() === 'default') {
      if (sUrlLower.includes('ok.ru') || sUrlLower.includes('odnoklassniki')) {
        displayName = 'OK.ru';
      } else if (sUrlLower.includes('dailymotion') || sUrlLower.includes('geo.dailymotion')) {
        displayName = 'Dailymotion';
      } else {
        displayName = 'Server Utama';
      }
    } else if (displayName.toLowerCase().includes('all sub player old')) {
      displayName = 'Dailymotion';
    } else if (sUrlLower.includes('ok.ru') || sUrlLower.includes('odnoklassniki')) {
      displayName = 'OK.ru';
    } else if (sUrlLower.includes('dailymotion') || sUrlLower.includes('geo.dailymotion')) {
      displayName = 'Dailymotion';
    } else if (sUrlLower.includes('1024terabox.com') || sUrlLower.includes('terabox')) {
      displayName = 'Terabox';
    } else if (sUrlLower.includes('linkbox')) {
      displayName = 'Linkbox';
    } else if (sUrlLower.includes('drive.google') || sUrlLower.includes('racaty')) {
      displayName = 'Google Drive';
    }

    displayName = displayName.replace(/\s*\[(?:ads|setting dns)\]/gi, '').trim();

    if (sUrl.includes('dailymotion.com/embed/video/')) {
      const dmMatch = sUrl.match(/video\/([a-zA-Z0-9]+)/);
      if (dmMatch) {
        sUrl = `https://geo.dailymotion.com/player/xhojl.html?video=${dmMatch[1]}`;
      }
    }

    const checkLower = sUrl.toLowerCase();
    const isShortlink =
      checkLower.includes('desudrive') ||
      checkLower.includes('safelink') ||
      checkLower.includes('shortlink') ||
      checkLower.includes('shorturl') ||
      checkLower.includes('linkpoi') ||
      checkLower.includes('ouo.io') ||
      checkLower.includes('ouo.press') ||
      checkLower.includes('coeg') ||
      checkLower.includes('hexafile');

    if (
      displayName.toLowerCase().includes('filedon') ||
      checkLower.includes('filedon') ||
      (displayName.toLowerCase().includes('mega') && isShortlink)
    ) {
      return;
    }

    const q = server.quality || server.resolution || '';
    if (q && !displayName.toLowerCase().includes(q.toLowerCase())) {
      displayName = `${displayName} (${q})`;
    }

    const sNameLower = displayName.toLowerCase();
    const isKurama = sNameLower.includes('kurama') || sUrlLower.includes('kurama');
    const isHls = !!(server.isHls || server.type === 'hls' || sUrlLower.includes('.m3u8') || isKurama);

    if (isHls || isKurama) {
      if (sUrl.startsWith('http') && !sUrl.includes('/cors-proxy')) {
        sUrl = `https://kuzen.web.id/api/cors-proxy?url=${encodeURIComponent(sUrl)}`;
      }
    } else if (
      sUrlLower.includes('nunadrama') ||
      sUrlLower.includes('anichin') ||
      sUrlLower.includes('miraishare') ||
      sUrlLower.includes('desustream') ||
      sUrlLower.includes('/dstream/') ||
      sUrlLower.includes('animexin')
    ) {
      sUrl = `https://kuzen.web.id/api/iframe-proxy?url=${encodeURIComponent(sUrl)}`;
    } else if (sUrl.startsWith('/')) {
      sUrl = `https://kuzen.web.id${sUrl}`;
    } else if (sUrl.startsWith('//')) {
      sUrl = 'https:' + sUrl;
    }

    allServers.push({
      label: displayName || 'Server',
      url: sUrl,
      rawUrl: server.url || server.sturl || sUrl,
      type: isHls ? 'hls' : server.type || 'iframe',
      isHls: isHls,
      badge: server.badge || (isHls ? 'HLS Cepat' : undefined),
    });
  });

  const getPriority = (name: string, url?: string) => {
    const n = (name || '').toLowerCase();
    const u = (url || '').toLowerCase();
    if (n.includes('kurama') || n.includes('kuramadrive') || n.includes('hls') || u.includes('.m3u8')) return 0;
    if (n.includes('ok.ru') || n.includes('odnoklassniki') || u.includes('ok.ru')) return 1;
    if (n.includes('dailymotion') || n.includes('default') || u.includes('dailymotion')) return 2;
    if (n.includes('terabox') || u.includes('terabox')) return 3;
    if (n.includes('new player') || n.includes('streamhide')) return 4;
    if (n.includes('linkbox') || u.includes('linkbox')) return 5;
    if (n.includes('google drive') || n.includes('gdrive') || u.includes('drive.google') || u.includes('racaty')) return 6;
    if (n.includes('doodstream') || u.includes('dood')) return 7;
    if (n.includes('desustream') || u.includes('desustream') || u.includes('ondesu')) return 8;
    if (n.includes('mega') || u.includes('mega.nz')) return 9;
    if (n.includes('vidhide') || u.includes('vidhide')) return 10;
    if (n.includes('filedon') || u.includes('filedon')) return 99;
    return 20;
  };

  allServers.sort((a, b) => getPriority(a.label, a.url) - getPriority(b.label, b.url));

  let streamUrl = raw.stream_url || raw.embed_url || raw.iframe || raw.url || allServers[0]?.url || '';
  if (streamUrl) {
    const lowerUrl = streamUrl.toLowerCase();
    const isKurama = lowerUrl.includes('kurama');
    const isHls = isKurama || lowerUrl.includes('.m3u8');
    if (isHls) {
      if (streamUrl.startsWith('http') && !streamUrl.includes('/cors-proxy')) {
        streamUrl = `https://kuzen.web.id/api/cors-proxy?url=${encodeURIComponent(streamUrl)}`;
      }
    } else if (
      lowerUrl.includes('nunadrama') ||
      lowerUrl.includes('anichin') ||
      lowerUrl.includes('miraishare') ||
      lowerUrl.includes('desustream') ||
      lowerUrl.includes('/dstream/') ||
      lowerUrl.includes('animexin')
    ) {
      streamUrl = `https://kuzen.web.id/api/iframe-proxy?url=${encodeURIComponent(streamUrl)}`;
    } else if (streamUrl.startsWith('/')) {
      streamUrl = `https://kuzen.web.id${streamUrl}`;
    } else if (streamUrl.startsWith('//')) {
      streamUrl = 'https:' + streamUrl;
    }

    const exists = allServers.some((s) => s.url === streamUrl);
    if (!exists) {
      allServers.unshift({
        label: isKurama ? 'Kuramadrive (HLS)' : 'Server Utama',
        url: streamUrl,
        rawUrl: raw.stream_url || raw.embed_url || raw.iframe || raw.url || streamUrl,
        type: isHls ? 'hls' : 'iframe',
        isHls: isHls,
        badge: isHls ? 'HLS Cepat' : undefined,
      });
      allServers.sort((a, b) => getPriority(a.label, a.url) - getPriority(b.label, b.url));
    }
  }

  if (!streamUrl && allServers.length > 0) {
    streamUrl = allServers[0].url;
  }

  const rawDlData =
    raw.downloads ||
    raw.download ||
    raw.downloadList ||
    raw.download_links ||
    raw.download_url ||
    raw.downloads_list ||
    [];
  let parsedDownloads: { quality: string; links: { label: string; url: string }[] }[] = [];

  if (Array.isArray(rawDlData)) {
    parsedDownloads = rawDlData
      .map((dl: any) => {
        const q = (dl.quality || dl.title || dl.resolution || dl.name || dl.format || 'HD').toString().trim();
        const rawLinks = dl.links || dl.urls || dl.servers || dl.download_links || [];
        const links = (Array.isArray(rawLinks) ? rawLinks : [])
          .map((l: any) => {
            let lUrl = (typeof l === 'string' ? l : l.url || l.link || l.href || '')
              .toString()
              .trim()
              .replace(/&amp;/g, '&');
            if (lUrl.startsWith('//')) lUrl = 'https:' + lUrl;
            else if (lUrl.startsWith('/')) lUrl = 'https://kuzen.web.id' + lUrl;
            const lLabel = (
              typeof l === 'string'
                ? 'Download'
                : l.label || l.host || l.server || l.title || l.name || 'Download'
            )
              .toString()
              .trim();
            return {
              label: lLabel || 'Download',
              url: lUrl,
            };
          })
          .filter(
            (l: any) =>
              l.url &&
              (l.url.startsWith('http://') || l.url.startsWith('https://')) &&
              !l.url.includes('javascript:')
          );
        return { quality: q, links };
      })
      .filter((dl: any) => dl.links.length > 0);
  }

  return {
    title: raw.title || '',
    slug: raw.slug && /(?:episode|eps|ep)[-_]?\d+/i.test(raw.slug) ? raw.slug : slug,
    thumb: resolveMediaUrl(raw.thumb || raw.thumbnail),
    stream_url: streamUrl || allServers[0]?.url || '',
    anime_slug:
      raw.anime_slug ||
      raw.series_slug ||
      (raw.slug && !/(?:episode|eps|ep)[-_]?\d+/i.test(raw.slug)
        ? raw.slug
        : slug.replace(/-episode-\d+.*$/i, '')),
    servers: allServers,
    video_sources: allServers.map((s) => ({
      label: s.label,
      file: s.url,
      type: 'iframe',
    })),
    episodes: (episodes || []).map((ep: any) => ({
      title: ep.title || (ep.episode ? `Episode ${ep.episode}` : ''),
      slug: ep.slug || '',
    })),
    downloads: parsedDownloads,
    is_hybrid: raw.is_hybrid,
    hybrid: raw.hybrid,
  };
}

export async function fetchKuramanimeLazyStream(lazyEndpoint: string): Promise<ServerItem | null> {
  try {
    const cleanUrl = lazyEndpoint.startsWith('/') ? lazyEndpoint : `/${lazyEndpoint}`;
    const res = await api.get(cleanUrl);
    const kuramaServer = res.data?.data;
    if (kuramaServer && kuramaServer.url) {
      let sUrl = kuramaServer.url;
      if (sUrl.startsWith('http') && !sUrl.includes('/cors-proxy')) {
        sUrl = `https://kuzen.web.id/api/cors-proxy?url=${encodeURIComponent(sUrl)}`;
      }
      return {
        label: kuramaServer.serverName || kuramaServer.provider || 'Kuramadrive (HLS)',
        url: sUrl,
        rawUrl: kuramaServer.url,
        type: 'hls',
        isHls: true,
        badge: 'HLS Cepat',
      };
    }
  } catch (e) {}
  return null;
}

export async function fetchDonghuaSchedule(): Promise<any> {
  const response = await api.get('/anichin/schedule');
  return response.data;
}

export async function fetchAnimeSchedule(): Promise<any> {
  const response = await api.get('/schedules');
  return response.data;
}

export async function searchDonghua(query: string): Promise<MediaItem[]> {
  try {
    const response = await api.get(`/anichin/search?q=${encodeURIComponent(query)}`);
    const items = response.data.data || (Array.isArray(response.data) ? response.data : []);
    return items.map((item: any) => {
      const card = cleanDonghuaCard(item);
      return {
        title: card.title,
        slug: card.slug,
        thumb: resolveMediaUrl(item.thumb || item.thumbnail),
        status: card.status,
        type: 'donghua',
      };
    });
  } catch {
    return [];
  }
}

export async function fetchCompletedAnime(page: number = 1): Promise<MediaItem[]> {
  try {
    const response = await api.get(`/public/api/otakudesu/complete?page=${page}`);
    return (response.data.data || []).map((item: any) => ({
      title: item.title,
      slug: item.slug,
      thumb: item.thumb,
      status: item.episode || item.status,
      type: 'anime',
    }));
  } catch (error) {
    console.error('Error completed anime:', error);
    return [];
  }
}

export async function fetchAnimeByGenre(genreSlug: string, page: number = 1): Promise<MediaItem[]> {
  try {
    const response = await api.get(`/genre/${genreSlug}?page=${page}`);
    return (response.data.data || []).map((item: any) => ({
      title: item.title,
      slug: item.id || item.slug,
      thumb: item.thumb,
      status: item.episode || item.status,
      type: 'anime',
    }));
  } catch (error) {
    console.error('Error anime by genre:', error);
    return [];
  }
}

