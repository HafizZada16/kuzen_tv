import api from './api';
import { MediaItem, AnimeDetail, WatchResponse, ServerItem, resolveMediaUrl } from './mediaService';

export interface MovieItem extends MediaItem {
  year?: string;
  backdrop?: string;
  overview?: string;
}

export const MOVIE_GENRES = [
  { label: 'Semua Genre', value: '' },
  { label: 'Action', value: '28' },
  { label: 'Adventure', value: '12' },
  { label: 'Animasi', value: '16' },
  { label: 'Komedi', value: '35' },
  { label: 'Crime', value: '80' },
  { label: 'Drama', value: '18' },
  { label: 'Fantasi', value: '14' },
  { label: 'Horor', value: '27' },
  { label: 'Misteri', value: '9648' },
  { label: 'Romantis', value: '10749' },
  { label: 'Sci-Fi', value: '878' },
  { label: 'Thriller', value: '53' },
];

export const MOVIE_PROVIDERS = [
  { id: 'executioner', name: 'Executioner I', badge: 'FHD', desc: 'Alternative HD' },
  { id: 'bowler', name: 'Bowler XVIII', badge: 'FHD', desc: 'Multi-Lang Stream' },
  { id: 'royal_champion', name: 'Royal Champion I', badge: 'FHD', desc: 'Multi-Mirror Stream' },
  { id: 'titan', name: 'Titan VII', badge: 'Direct MP4', desc: 'Direct High Speed' },
  { id: 'backup', name: 'Backup Server', badge: 'Mirror', desc: 'Failover Stream' },
];

/**
 * Filter out TV series or invalid items from FrameX TV results to guarantee movie-only content
 */
function filterMoviesOnly(items: any[]): any[] {
  if (!Array.isArray(items)) return [];
  return items.filter((m) => {
    const t = (m.type || '').toLowerCase();
    const id = String(m.id || m.slug || '').toLowerCase();
    return t !== 'tv' && t !== 'series' && !id.startsWith('series/') && !id.includes('/series/');
  });
}

function mapToMovieItem(raw: any): MediaItem {
  const yearStr = raw.year ? String(raw.year) : '';
  const ratingStr = raw.rating ? String(raw.rating) : undefined;
  const thumbUrl = resolveMediaUrl(raw.poster || raw.thumb || raw.image || raw.backdrop);

  return {
    title: raw.title || 'Untitled Movie',
    slug: String(raw.id || raw.slug || ''),
    thumb: thumbUrl,
    rating: ratingStr,
    status: yearStr ? `${yearStr} • Film` : 'Film Bioskop',
    type: 'movie',
  };
}

/**
 * Fetch movies from FrameX TV Discover endpoint with sorting and filtering
 */
export async function fetchDiscoverMovies(
  page: number = 1,
  genre: string = '',
  sort: string = 'popularity.desc',
  year: string = ''
): Promise<MediaItem[]> {
  try {
    const params: Record<string, any> = {
      type: 'movie',
      page,
      sort,
    };
    if (genre) params.genre = genre;
    if (year) params.year = year;

    const response = await api.get('/framextv/discover', { params });
    if (response.data?.status === 'success' && response.data?.data) {
      const rawResults = response.data.data.results || response.data.data || [];
      const filtered = filterMoviesOnly(rawResults);
      return filtered.map(mapToMovieItem);
    }
    return [];
  } catch (error) {
    console.error('Failed to fetch discover movies:', error);
    return [];
  }
}

/**
 * Search movies by keyword
 */
export async function searchMovies(query: string): Promise<MediaItem[]> {
  try {
    const response = await api.get(`/framextv/search?q=${encodeURIComponent(query.trim())}`);
    if (response.data?.status === 'success' && response.data?.data) {
      const rawResults = response.data.data.results || response.data.data || [];
      const filtered = filterMoviesOnly(rawResults);
      return filtered.map(mapToMovieItem);
    }
    return [];
  } catch (error) {
    console.error('Failed to search movies:', error);
    return [];
  }
}

/**
 * Fetch movie detail compatible with Kuzen TV AnimeDetail interface
 */
export async function fetchMovieDetail(movieId: string): Promise<AnimeDetail> {
  try {
    const [watchRes, searchRes] = await Promise.allSettled([
      api.get(`/framextv/watch/${movieId}`),
      api.get(`/framextv/search?q=${encodeURIComponent(movieId)}`),
    ]);

    const watchData = watchRes.status === 'fulfilled' ? watchRes.value?.data?.data : null;
    const searchResults = searchRes.status === 'fulfilled' ? searchRes.value?.data?.data?.results : null;
    const searchMatch = Array.isArray(searchResults) ? searchResults[0] : null;

    const title = watchData?.title || searchMatch?.title || 'Film Bioskop';
    const year = watchData?.year || searchMatch?.year || '';
    const rating = watchData?.rating || searchMatch?.rating || 'N/A';
    const overview = watchData?.overview || searchMatch?.overview || 'Sinopsis film tidak tersedia.';
    const thumb = resolveMediaUrl(watchData?.poster || searchMatch?.poster || watchData?.backdrop || searchMatch?.backdrop);

    const rawGenres = watchData?.genres || searchMatch?.genres || [];
    const genres = Array.isArray(rawGenres)
      ? rawGenres.map((g: any) => (typeof g === 'string' ? g : g.name || ''))
      : [];

    return {
      title,
      thumb,
      synopsis: overview,
      rating: String(rating),
      status: year ? `${year} • Film Bioskop` : 'Film Bioskop',
      genres: genres.filter(Boolean),
      info: {
        Tipe: 'Film Bioskop (Movie)',
        Tahun: String(year || '-'),
        Status: 'Full Movie',
        Kategori: 'FrameX TV',
      },
      episodes: [
        {
          title: 'Tonton Film Lengkap',
          slug: movieId,
        },
      ],
      batch: null,
    };
  } catch (error) {
    console.error('Failed to fetch movie detail:', error);
    return {
      title: 'Film Bioskop',
      thumb: '',
      synopsis: 'Gagal memuat informasi film.',
      rating: 'N/A',
      status: 'Film Bioskop',
      genres: ['Film'],
      info: { Tipe: 'Film Bioskop' },
      episodes: [{ title: 'Tonton Film Lengkap', slug: movieId }],
      batch: null,
    };
  }
}

/**
 * Fetch movie streaming sources & multi-provider fallback compatible with Kuzen TV WatchResponse
 */
export async function fetchMovieWatch(
  movieId: string,
  preferredProvider: string = 'executioner'
): Promise<WatchResponse> {
  try {
    const [watchRes, embedRes] = await Promise.allSettled([
      api.get(`/framextv/watch/${movieId}?provider=${preferredProvider}`),
      api.get(`/framextv/embed/${movieId}?provider=${preferredProvider}`),
    ]);

    const watchData = watchRes.status === 'fulfilled' ? watchRes.value?.data?.data : null;
    const embedData = embedRes.status === 'fulfilled' ? embedRes.value?.data?.data : null;

    const servers: ServerItem[] = [];

    // 1. Direct native HLS/MP4 sources if available from provider
    if (Array.isArray(watchData?.sources) && watchData.sources.length > 0) {
      watchData.sources.forEach((s: any, idx: number) => {
        if (s.file) {
          const isHls = s.type === 'hls' || s.file.includes('.m3u8');
          servers.push({
            label: s.server || `Mirror ${idx + 1} (${isHls ? 'HLS' : 'Direct'})`,
            url: s.file,
            isHls,
            badge: isHls ? 'HLS' : 'MP4',
          });
        }
      });
    }

    // 2. Add all FrameX TV Providers as selectable server nodes in TV player drawer
    MOVIE_PROVIDERS.forEach((prov) => {
      const embedUrl = `https://framextv.cc/embed/${movieId}?autoplay=0&muted=0&controls=1&provider=${prov.id}`;
      servers.push({
        label: `${prov.name} (${prov.badge})`,
        url: embedUrl,
        isHls: false,
        badge: prov.badge,
      });
    });

    const defaultStreamUrl =
      servers[0]?.url ||
      embedData?.embedUrl ||
      `https://framextv.cc/embed/${movieId}?autoplay=0&muted=0&controls=1&provider=${preferredProvider}`;

    const title = watchData?.title || 'Film Bioskop';
    const thumb = resolveMediaUrl(watchData?.backdrop || watchData?.poster);

    return {
      title,
      slug: movieId,
      stream_url: defaultStreamUrl,
      servers,
      episodes: [
        {
          title: 'Tonton Film Lengkap',
          slug: movieId,
        },
      ],
      thumb,
    };
  } catch (error) {
    console.error('Failed to fetch movie watch:', error);
    // Absolute fallback server
    const fallbackEmbed = `https://framextv.cc/embed/${movieId}?autoplay=0&muted=0&controls=1&provider=${preferredProvider}`;
    return {
      title: 'Film Bioskop',
      slug: movieId,
      stream_url: fallbackEmbed,
      servers: [
        {
          label: 'FrameX TV Stream (FHD)',
          url: fallbackEmbed,
          isHls: false,
          badge: 'FHD',
        },
      ],
      episodes: [{ title: 'Tonton Film Lengkap', slug: movieId }],
    };
  }
}

