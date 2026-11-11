/**
 * Robust SRT / WebVTT Parser for Kuzen TV
 * Parses subtitle files into structured cues: [{ start, end, text }]
 */

export interface SubtitleCue {
  start: number;
  end: number;
  text: string;
}

const parseSeconds = (h?: string, m?: string, s?: string, ms?: string): number => {
  const hours = h ? parseInt(h, 10) : 0;
  const minutes = m ? parseInt(m, 10) : 0;
  const seconds = s ? parseInt(s, 10) : 0;
  const milliseconds = ms ? parseInt(ms, 10) : 0;
  return hours * 3600 + minutes * 60 + seconds + milliseconds / 1000;
};

export const parseSubtitles = (text: string): SubtitleCue[] => {
  if (!text || typeof text !== 'string') return [];
  const clean = text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const cues: SubtitleCue[] = [];
  const timeRegex = /(?:(\d{2}):)?(\d{2}):(\d{2})[,.](\d{3})\s*-->\s*(?:(\d{2}):)?(\d{2}):(\d{2})[,.](\d{3})/;

  const blocks = clean.split(/\n\n+/);
  for (const block of blocks) {
    const lines = block.trim().split('\n');
    let timeMatch: RegExpMatchArray | null = null;
    const textLines: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const match = trimmed.match(timeRegex);
      if (match) {
        timeMatch = match;
      } else if (timeMatch) {
        // Strip HTML formatting tags (<b>, <i>, <font>, etc.)
        const stripped = trimmed.replace(/<[^>]*>/g, '');
        if (stripped) textLines.push(stripped);
      }
    }

    if (timeMatch && textLines.length > 0) {
      cues.push({
        start: parseSeconds(timeMatch[1], timeMatch[2], timeMatch[3], timeMatch[4]),
        end: parseSeconds(timeMatch[5], timeMatch[6], timeMatch[7], timeMatch[8]),
        text: textLines.join('\n'),
      });
    }
  }
  return cues;
};

/**
 * Fetch subtitle file text directly or fallback through Kuzen subtitle proxy
 */
export const fetchSubtitleText = async (url: string): Promise<string> => {
  if (!url) return '';
  try {
    const res = await fetch(url);
    if (res.ok) {
      const txt = await res.text();
      if (txt && txt.length > 5) return txt;
    }
  } catch (err) {
    // Direct fetch failed, fallback to proxy
  }

  try {
    const proxyUrl = `https://kuzen.web.id/api/framextv/subproxy?url=${encodeURIComponent(url)}`;
    const proxyRes = await fetch(proxyUrl);
    if (proxyRes.ok) {
      return await proxyRes.text();
    }
  } catch (proxyErr) {
    console.warn('Subtitle proxy fetch failed:', proxyErr);
  }
  return '';
};

