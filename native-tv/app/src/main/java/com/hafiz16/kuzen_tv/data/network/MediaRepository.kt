package com.hafiz16.kuzen_tv.data.network

import com.hafiz16.kuzen_tv.data.models.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.delay
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.*
import okhttp3.OkHttpClient
import okhttp3.Request
import java.net.URLEncoder
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.TimeUnit

object MediaRepository {
    private const val BASE_API = "https://kuzen.web.id/api"
    private const val BASE_ORIGIN = "https://kuzen.web.id"

    private const val CATALOG_TTL_MS = 3 * 60 * 1000L
    private const val DETAIL_TTL_MS = 10 * 60 * 1000L
    private const val WATCH_TTL_MS = 5 * 60 * 1000L

    private data class CacheEntry<T>(val data: T, val timestamp: Long)

    private val catalogCache = ConcurrentHashMap<String, CacheEntry<List<MediaItem>>>()
    private val detailCache = ConcurrentHashMap<String, CacheEntry<AnimeDetail>>()
    private val watchCache = ConcurrentHashMap<String, CacheEntry<WatchResponse>>()

    val MOVIE_PROVIDERS = listOf(
        MovieProviderOption("executioner", "Executioner I", "FHD"),
        MovieProviderOption("bowler", "Bowler XVIII", "FHD"),
        MovieProviderOption("royal_champion", "Royal Champion I", "FHD"),
        MovieProviderOption("titan", "Titan VII", "Direct MP4"),
        MovieProviderOption("backup", "Backup Server", "Mirror")
    )

    private val json = Json {
        ignoreUnknownKeys = true
        isLenient = true
    }

    private val client = OkHttpClient.Builder()
        .connectTimeout(30, TimeUnit.SECONDS)
        .readTimeout(35, TimeUnit.SECONDS)
        .addInterceptor { chain ->
            val request = chain.request().newBuilder()
                .header(
                    "User-Agent",
                    "Mozilla/5.0 (Linux; Android 13; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36"
                )
                .header("Accept", "application/json, text/plain, */*")
                .build()
            chain.proceed(request)
        }
        .build()

    // --- URL & Label Helpers (mirrors mediaService.ts & DetailScreen.tsx) ---

    fun resolveMediaUrl(url: String?): String {
        if (url.isNullOrBlank()) return ""
        val trimmed = url.trim()
        return when {
            trimmed.startsWith("//") -> "https:$trimmed"
            trimmed.startsWith("/") -> "$BASE_ORIGIN$trimmed"
            else -> trimmed
        }
    }

    private fun cleanTitle(title: String): String {
        return title.replace(Regex("""\s*(Subtitle Indonesia|Sub Indo)\s*$""", RegexOption.IGNORE_CASE), "").trim()
    }

    fun extractEpisodeLabel(title: String, index: Int): String {
        if (title.isBlank()) return "Episode ${index + 1}"
        val cleaned = cleanTitle(title)
        val epMatch = Regex("""(?:episode|eps|ep)\.?\s*(\d+(?:\.\d+)?)""", RegexOption.IGNORE_CASE).find(cleaned)
        if (epMatch != null) {
            val rawNum = epMatch.groupValues[1]
            val num = if (rawNum.startsWith("0") && rawNum.length > 1 && !rawNum.contains(".")) {
                rawNum.toIntOrNull()?.toString() ?: rawNum
            } else {
                rawNum
            }
            return "Episode $num"
        }
        val numMatch = Regex("""\b(\d+)\b""").find(cleaned)
        if (numMatch != null) {
            val parsed = numMatch.groupValues[1].toIntOrNull()
            if (parsed != null) return "Episode $parsed"
        }
        if (cleaned.contains("batch", ignoreCase = true)) return "Batch"
        if (cleaned.contains("ova", ignoreCase = true)) return "OVA"
        if (cleaned.contains("movie", ignoreCase = true)) return "Movie"
        if (cleaned.contains("special", ignoreCase = true)) return "Special"
        return "Episode ${index + 1}"
    }

    private fun isShortlinkOrBlocked(label: String, url: String): Boolean {
        val l = label.lowercase()
        val u = url.lowercase()
        if (l.contains("filedon") || u.contains("filedon")) return true
        val isShortlink = listOf(
            "desudrive", "safelink", "shortlink", "shorturl",
            "linkpoi", "ouo.io", "ouo.press", "coeg", "hexafile"
        ).any { u.contains(it) }
        return l.contains("mega") && isShortlink
    }

    private fun wrapAnimeStreamUrl(rawUrl: String): String {
        if (rawUrl.isBlank()) return ""
        val u = resolveMediaUrl(rawUrl.replace("&amp;", "&"))
        val lower = u.lowercase()
        val alreadyProxied = lower.contains("kuzen.web.id/api/iframe-proxy") ||
            lower.contains("kuzen.web.id/api/pdrain-embed") ||
            lower.contains("kuzen.web.id/api/mega-embed") ||
            lower.contains("kuzen.web.id/api/acefile-embed") ||
            lower.contains("kuzen.web.id/api/sharer-embed") ||
            lower.contains("kuzen.web.id/api/kraken-embed") ||
            lower.contains("drive.google.com") ||
            lower.contains("acefile.co") ||
            lower.contains("krakenfiles.com") ||
            lower.contains("mega.nz")

        val needsProxy = !alreadyProxied && (
            lower.contains("desustream") ||
                lower.contains("/dstream/") ||
                lower.contains("odcdn") ||
                lower.contains("ondesu") ||
                lower.contains("moedesu") ||
                (lower.contains("pdrain") && !lower.contains("pdrain-embed")) ||
                lower.contains("pixeldrain") ||
                lower.contains("otaku") ||
                lower.contains("nunadrama") ||
                lower.contains("anichin") ||
                lower.contains("miraishare") ||
                lower.contains("animexin")
            )
        return if (needsProxy) {
            "$BASE_API/iframe-proxy?url=${URLEncoder.encode(u, "UTF-8")}"
        } else {
            u
        }
    }

    private fun wrapDonghuaStreamUrl(rawUrl: String, isHls: Boolean): String {
        if (rawUrl.isBlank()) return ""
        var u = resolveMediaUrl(rawUrl.replace("&amp;", "&"))
        val lower = u.lowercase()
        if (isHls || lower.contains("kurama") || lower.contains(".m3u8")) {
            if (u.startsWith("http") && !u.contains("/cors-proxy")) {
                u = "$BASE_API/cors-proxy?url=${URLEncoder.encode(u, "UTF-8")}"
            }
            return u
        }
        val needsIframeProxy = lower.contains("nunadrama") ||
            lower.contains("anichin") ||
            lower.contains("miraishare") ||
            lower.contains("desustream") ||
            lower.contains("/dstream/") ||
            lower.contains("animexin")
        return if (needsIframeProxy && !lower.contains("/iframe-proxy")) {
            "$BASE_API/iframe-proxy?url=${URLEncoder.encode(u, "UTF-8")}"
        } else {
            u
        }
    }

    fun getServerPriority(name: String, url: String): Int {
        val n = name.lowercase()
        val u = url.lowercase()
        return when {
            n.contains("kurama") || u.contains(".m3u8") -> -1
            n.contains("playdesu") || u.contains("playdesu") -> 0
            n.contains("odstream") || n.contains("odsstream") || u.contains("odstream") -> 1
            n.contains("odcdn") || u.contains("odcdn") -> 2
            n.contains("otaku") || u.contains("otaku") -> 3
            n.contains("moedesu") || u.contains("moedesu") -> 4
            n.contains("pdrain") || n.contains("pixeldrain") || u.contains("pdrain") || u.contains("pixeldrain") -> 5
            n.contains("ondesu") || u.contains("ondesu") || u.contains("desustream") -> 6
            n.contains("mega") || u.contains("mega.nz") -> 7
            n.contains("gdrive") || n.contains("drive") || n.contains("sharer") || u.contains("drive.google") || u.contains("sharer-embed") -> 8
            n.contains("acefile") || u.contains("acefile") -> 9
            n.contains("kraken") || u.contains("kraken") -> 10
            n.contains("blogs") || n.contains("blogger") -> 11
            n.contains("yourupload") -> 12
            n.contains("mp4load") -> 13
            n.contains("vidhide") || u.contains("vidhide") || u.contains("earnvids") -> 14
            n.contains("filedon") || u.contains("filedon") -> 99
            else -> 15
        }
    }

    // --- Shared HTTP GET with Retry (mirrors api.ts) ---

    private suspend fun getText(fullUrl: String): String? = withContext(Dispatchers.IO) {
        var attempt = 0
        while (attempt <= 2) {
            try {
                val req = Request.Builder().url(fullUrl).build()
                client.newCall(req).execute().use { res ->
                    if (res.isSuccessful) {
                        return@withContext res.body?.string()
                    }
                    if (res.code !in 500..504) {
                        return@withContext null
                    }
                }
            } catch (_: Exception) {
                // Retry on transient error
            }
            attempt++
            if (attempt <= 2) delay(attempt * 1200L) // Neon DB cold-start backoff
        }
        null
    }

    private suspend inline fun <T> cachedFetch(
        cache: ConcurrentHashMap<String, CacheEntry<T>>,
        key: String,
        ttlMs: Long,
        isValid: (T) -> Boolean = { true },
        crossinline loader: suspend () -> T?
    ): T? {
        val now = System.currentTimeMillis()
        cache[key]?.let { entry ->
            if (now - entry.timestamp <= ttlMs) return entry.data
            cache.remove(key)
        }
        val loaded = loader() ?: return null
        if (isValid(loaded)) {
            cache[key] = CacheEntry(loaded, System.currentTimeMillis())
        }
        return loaded
    }

    private suspend fun getJson(path: String): JsonElement? {
        val url = if (path.startsWith("http")) path else "$BASE_API$path"
        val body = getText(url) ?: return null
        return try {
            json.parseToJsonElement(body)
        } catch (_: Exception) {
            null
        }
    }

    private fun JsonObject.str(vararg keys: String): String? {
        for (k in keys) {
            val v = this[k]
            if (v is JsonPrimitive) {
                val c = v.contentOrNull
                if (!c.isNullOrBlank()) return c
            }
        }
        return null
    }

    private fun extractDataArray(root: JsonElement?): JsonArray {
        return when {
            root is JsonObject && root["data"] is JsonArray -> root["data"]!!.jsonArray
            root is JsonObject && root["data"] is JsonObject -> {
                val d = root["data"]!!.jsonObject
                d["results"] as? JsonArray ?: JsonArray(emptyList())
            }
            root is JsonArray -> root
            else -> JsonArray(emptyList())
        }
    }

    private fun parseEpisodes(raw: JsonObject): List<EpisodeItem> {
        val arr = (raw["episodeList"] as? JsonArray)
            ?: (raw["episodes"] as? JsonArray)
            ?: (raw["episode_list"] as? JsonArray)
            ?: return emptyList()
        return arr.mapNotNull { ep ->
            val obj = ep as? JsonObject ?: return@mapNotNull null
            val epTitle = obj.str("title")
                ?: obj.str("episode")?.let { "Episode $it" }
                ?: return@mapNotNull null
            val epSlug = obj.str("slug") ?: return@mapNotNull null
            EpisodeItem(title = epTitle, slug = epSlug)
        }
    }

    // --- 1. ANIME (Otakudesu) ---

    suspend fun getOngoingAnime(page: Int = 1): List<MediaItem> =
        cachedFetch(catalogCache, "anime:ongoing:$page", CATALOG_TTL_MS, { it.isNotEmpty() }) {
            val root = getJson("/public/api/otakudesu/ongoing?page=$page")
            extractDataArray(root).mapNotNull { el ->
                val obj = el as? JsonObject ?: return@mapNotNull null
                val title = obj.str("title") ?: return@mapNotNull null
                val slug = obj.str("slug") ?: return@mapNotNull null
                MediaItem(
                    title = cleanTitle(title),
                    slug = slug,
                    thumb = resolveMediaUrl(obj.str("thumb")),
                    status = obj.str("episode", "status"),
                    type = "anime"
                )
            }
        } ?: emptyList()

    suspend fun getCompletedAnime(page: Int = 1): List<MediaItem> =
        cachedFetch(catalogCache, "anime:complete:$page", CATALOG_TTL_MS, { it.isNotEmpty() }) {
            val root = getJson("/public/api/otakudesu/complete?page=$page")
            extractDataArray(root).mapNotNull { el ->
                val obj = el as? JsonObject ?: return@mapNotNull null
                val title = obj.str("title") ?: return@mapNotNull null
                val slug = obj.str("slug") ?: return@mapNotNull null
                MediaItem(
                    title = cleanTitle(title),
                    slug = slug,
                    thumb = resolveMediaUrl(obj.str("thumb")),
                    status = obj.str("episode", "status") ?: "Completed",
                    type = "anime"
                )
            }
        } ?: emptyList()

    suspend fun searchAnime(query: String): List<MediaItem> {
        if (query.isBlank()) return emptyList()
        val encoded = URLEncoder.encode(query.trim(), "UTF-8")
        val root = getJson("/public/api/otakudesu/search?q=$encoded")
        return extractDataArray(root).mapNotNull { el ->
            val obj = el as? JsonObject ?: return@mapNotNull null
            val title = obj.str("title") ?: return@mapNotNull null
            val slug = obj.str("slug") ?: return@mapNotNull null
            MediaItem(
                title = cleanTitle(title),
                slug = slug,
                thumb = resolveMediaUrl(obj.str("thumb")),
                rating = obj.str("rating"),
                type = "anime"
            )
        }
    }

    suspend fun getAnimeDetail(slug: String): AnimeDetail? =
        cachedFetch(detailCache, "anime:$slug", DETAIL_TTL_MS) {
            val root = (getJson("/detail/$slug") as? JsonObject) ?: return@cachedFetch null
            val raw = (root["data"] as? JsonObject) ?: root
            val infoObj = raw["info"] as? JsonObject
            val genreStr = infoObj?.str("Genre") ?: ""
            val genres = genreStr.split(",").map { it.trim() }.filter { it.isNotEmpty() }
            val infoMap = infoObj?.entries?.mapNotNull { (k, v) ->
                (v as? JsonPrimitive)?.contentOrNull?.let { k to it }
            }?.toMap() ?: emptyMap()

            AnimeDetail(
                title = cleanTitle(raw.str("title") ?: ""),
                thumb = resolveMediaUrl(raw.str("thumb")),
                synopsis = raw.str("synopsis") ?: "Tidak ada sinopsis tersedia.",
                rating = infoObj?.str("Skor") ?: raw.str("rating") ?: "",
                status = infoObj?.str("Status") ?: raw.str("status") ?: "Ongoing",
                genres = genres,
                info = infoMap,
                episodes = parseEpisodes(raw)
            )
        }

    suspend fun getAnimeWatch(episodeSlug: String): WatchResponse? =
        cachedFetch(watchCache, "anime:$episodeSlug", WATCH_TTL_MS, { it.servers.isNotEmpty() || it.streamUrl.isNotBlank() }) {
            val root = (getJson("/watch/$episodeSlug") as? JsonObject) ?: return@cachedFetch null
            val raw = (root["data"] as? JsonObject) ?: root
            val rawServers = (raw["serverList"] as? JsonArray) ?: (raw["mirror_embed"] as? JsonArray) ?: JsonArray(emptyList())
            val firstServerUrl = (rawServers.firstOrNull() as? JsonObject)?.str("url", "sturl") ?: ""
            val defaultUrl = raw.str("iframe", "sturl", "url") ?: firstServerUrl

            var episodes = parseEpisodes(raw)
            val seriesSlug = raw.str("slug") ?: episodeSlug.split("-episode-").firstOrNull().orEmpty()
            if (episodes.isEmpty() && seriesSlug.isNotBlank()) {
                episodes = getAnimeDetail(seriesSlug)?.episodes
                    ?: getAnimeDetail("$seriesSlug-sub-indo")?.episodes
                    ?: emptyList()
            }

            val mappedServers = rawServers.mapNotNull { s ->
                val obj = s as? JsonObject ?: return@mapNotNull null
                val wrapped = wrapAnimeStreamUrl(obj.str("url", "sturl") ?: "")
                if (wrapped.isBlank()) return@mapNotNull null
                var label = obj.str("serverName", "title", "name") ?: "Server"
                if (isShortlinkOrBlocked(label, wrapped)) return@mapNotNull null
                val q = obj.str("quality", "resolution") ?: ""
                if (q.isNotBlank() && !label.contains(q, ignoreCase = true)) {
                    label = "$label ($q)"
                }
                ServerItem(
                    label = label,
                    url = wrapped,
                    quality = q.ifBlank { null },
                    isHls = wrapped.contains(".m3u8", ignoreCase = true)
                )
            }.sortedBy { getServerPriority(it.label, it.url) }

            val wrappedDefault = wrapAnimeStreamUrl(defaultUrl)
            val finalStreamUrl = if (wrappedDefault.isNotBlank() && !wrappedDefault.contains("filedon", ignoreCase = true)) {
                wrappedDefault
            } else {
                mappedServers.firstOrNull()?.url ?: ""
            }

            WatchResponse(
                title = cleanTitle(raw.str("title") ?: ""),
                streamUrl = finalStreamUrl,
                animeSlug = seriesSlug.ifBlank { null },
                servers = mappedServers,
                episodes = episodes
            )
        }

    // --- 2. DONGHUA (Anichin) ---

    private fun cleanDonghuaItem(obj: JsonObject, defaultStatus: String? = null): MediaItem? {
        val rawTitle = obj.str("title") ?: return null
        val rawSlug = obj.str("slug") ?: return null
        val cleanedTitle = rawTitle
            .replace(Regex("""\s*(?:episode|eps|ep)\.?\s*\d+.*$""", RegexOption.IGNORE_CASE), "")
            .replace(Regex("""\s*(Subtitle Indonesia|Sub Indo)\s*$""", RegexOption.IGNORE_CASE), "")
            .trim()
            .ifBlank { rawTitle }
        val seriesSlug = rawSlug.replace(Regex("""-episode-\d+.*$""", RegexOption.IGNORE_CASE), "").ifBlank { rawSlug }
        val epMatch = Regex("""(?:episode|eps|ep)\.?\s*(\d+(?:\.\d+)?)""", RegexOption.IGNORE_CASE).find(rawTitle.ifBlank { rawSlug })
        val status = obj.str("episode") ?: epMatch?.let { "Episode ${it.groupValues[1]}" } ?: obj.str("status") ?: defaultStatus
        return MediaItem(
            title = cleanedTitle,
            slug = seriesSlug,
            thumb = resolveMediaUrl(obj.str("thumb", "thumbnail")),
            rating = obj.str("rating", "score"),
            status = status,
            type = "donghua"
        )
    }

    suspend fun getPopularDonghua(page: Int = 1): List<MediaItem> =
        cachedFetch(catalogCache, "donghua:popular:$page", CATALOG_TTL_MS, { it.isNotEmpty() }) {
            val root = getJson("/anichin/popular?page=$page")
            extractDataArray(root).mapNotNull { (it as? JsonObject)?.let { o -> cleanDonghuaItem(o) } }
        } ?: emptyList()

    suspend fun getOngoingDonghua(page: Int = 1): List<MediaItem> =
        cachedFetch(catalogCache, "donghua:ongoing:$page", CATALOG_TTL_MS, { it.isNotEmpty() }) {
            val root = getJson("/anichin/ongoing?page=$page")
            extractDataArray(root).mapNotNull { (it as? JsonObject)?.let { o -> cleanDonghuaItem(o, "Ongoing") } }
        } ?: emptyList()

    suspend fun getCompletedDonghua(page: Int = 1): List<MediaItem> =
        cachedFetch(catalogCache, "donghua:completed:$page", CATALOG_TTL_MS, { it.isNotEmpty() }) {
            val root = getJson("/anichin/completed?page=$page")
            extractDataArray(root).mapNotNull { (it as? JsonObject)?.let { o -> cleanDonghuaItem(o, "Completed") } }
        } ?: emptyList()

    suspend fun searchDonghua(query: String): List<MediaItem> {
        if (query.isBlank()) return emptyList()
        val encoded = URLEncoder.encode(query.trim(), "UTF-8")
        val root = getJson("/anichin/search?q=$encoded")
        return extractDataArray(root).mapNotNull { (it as? JsonObject)?.let { o -> cleanDonghuaItem(o) } }
    }

    suspend fun getDonghuaDetail(slug: String): AnimeDetail? =
        cachedFetch(detailCache, "donghua:$slug", DETAIL_TTL_MS) {
            val cleanSeriesSlug = slug.replace(Regex("""-episode-\d+.*$""", RegexOption.IGNORE_CASE), "")
            var root = getJson("/anichin/detail/$cleanSeriesSlug") as? JsonObject
            var raw = (root?.get("data") as? JsonObject) ?: root
            var episodes = raw?.let { parseEpisodes(it) } ?: emptyList()

            if ((raw == null || episodes.isEmpty()) && slug.contains("-episode-")) {
                val watchRoot = getJson("/anichin/watch/$slug") as? JsonObject
                val watchRaw = (watchRoot?.get("data") as? JsonObject) ?: watchRoot
                val resolvedSlug = watchRaw?.str("anime_slug", "series_slug")
                    ?: watchRaw?.str("slug")?.takeIf { !it.contains("-episode-") }
                if (!resolvedSlug.isNullOrBlank() && resolvedSlug != cleanSeriesSlug) {
                    val res2 = getJson("/anichin/detail/$resolvedSlug") as? JsonObject
                    val raw2 = (res2?.get("data") as? JsonObject) ?: res2
                    val eps2 = raw2?.let { parseEpisodes(it) } ?: emptyList()
                    if (eps2.isNotEmpty()) {
                        raw = raw2
                        episodes = eps2
                    }
                }
                if (episodes.isEmpty() && watchRaw != null) {
                    val watchEps = parseEpisodes(watchRaw)
                    if (watchEps.isNotEmpty()) {
                        if (raw == null) raw = watchRaw
                        episodes = watchEps
                    }
                }
            }

            if (raw == null && cleanSeriesSlug != slug) {
                root = getJson("/anichin/detail/$slug") as? JsonObject
                raw = (root?.get("data") as? JsonObject) ?: root
                episodes = raw?.let { parseEpisodes(it) } ?: emptyList()
            }

            val finalRaw = raw ?: return@cachedFetch null
            val infoObj = finalRaw["info"] as? JsonObject
            val genreArr = (finalRaw["genres"] as? JsonArray)?.mapNotNull { (it as? JsonPrimitive)?.contentOrNull } ?: emptyList()
            val genreStr = infoObj?.str("Genre", "Genres") ?: ""
            val genres = if (genreArr.isNotEmpty()) genreArr else genreStr.split(",").map { it.trim() }.filter { it.isNotEmpty() }
            val infoMap = infoObj?.entries?.mapNotNull { (k, v) ->
                (v as? JsonPrimitive)?.contentOrNull?.let { k to it }
            }?.toMap() ?: emptyMap()

            var title = finalRaw.str("title") ?: ""
            if (Regex("""(?:episode|eps|ep)\.?\s*\d+""", RegexOption.IGNORE_CASE).containsMatchIn(title)) {
                title = cleanTitle(title.replace(Regex("""\s*(?:episode|eps|ep)\.?\s*\d+.*$""", RegexOption.IGNORE_CASE), ""))
                    .ifBlank { title }
            }

            AnimeDetail(
                title = title,
                thumb = resolveMediaUrl(finalRaw.str("thumb", "thumbnail")),
                synopsis = finalRaw.str("synopsis", "sinopsis") ?: "Tidak ada sinopsis tersedia.",
                rating = infoObj?.str("Skor", "Score") ?: finalRaw.str("rating") ?: "",
                status = infoObj?.str("Status") ?: finalRaw.str("status") ?: "Ongoing",
                genres = genres,
                info = infoMap,
                episodes = episodes
            )
        }

    suspend fun getDonghuaWatch(slug: String): WatchResponse? =
        cachedFetch(watchCache, "donghua:$slug", WATCH_TTL_MS, { it.servers.isNotEmpty() || it.streamUrl.isNotBlank() }) {
            var root = getJson("/anichin/watch/$slug") as? JsonObject ?: return@cachedFetch null
            var raw = (root["data"] as? JsonObject) ?: root

            val hasInitServers = ((raw["players"] as? JsonArray) ?: (raw["serverList"] as? JsonArray) ?: (raw["mirror_embed"] as? JsonArray))?.isNotEmpty() == true
            val hasInitStream = raw.str("stream_url", "embed_url", "iframe", "url", "kurama_stream") != null || root["kurama_stream"] != null
            if (!hasInitServers && !hasInitStream && !slug.contains("force=")) {
                val forced = getJson("/anichin/watch/$slug?force=1") as? JsonObject
                if (forced != null) {
                    root = forced
                    raw = (forced["data"] as? JsonObject) ?: forced
                }
            }

            var episodes = parseEpisodes(raw)
            val seriesSlug = raw.str("anime_slug", "series_slug")
                ?: slug.replace(Regex("""-episode-\d+.*$""", RegexOption.IGNORE_CASE), "")
            if (episodes.isEmpty() && seriesSlug.isNotBlank()) {
                episodes = getDonghuaDetail(seriesSlug)?.episodes ?: emptyList()
            }

            val rawServerObjects = mutableListOf<JsonObject>()
            ((raw["kurama_stream"] as? JsonObject) ?: (root["kurama_stream"] as? JsonObject))?.let { ks ->
                if (ks.str("url", "sturl") != null) rawServerObjects.add(ks)
            }
            listOf("players", "serverList", "mirror_embed", "streams").forEach { key ->
                (raw[key] as? JsonArray)?.forEach { el ->
                    val obj = el as? JsonObject ?: return@forEach
                    val u = obj.str("url", "sturl")?.trim() ?: return@forEach
                    if (rawServerObjects.none { it.str("url", "sturl")?.trim() == u }) {
                        rawServerObjects.add(obj)
                    }
                }
            }

            val allServers = mutableListOf<ServerItem>()
            rawServerObjects.forEach { server ->
                val name = server.str("provider", "title", "serverName", "name") ?: ""
                var sUrl = (server.str("url", "sturl") ?: "").replace("&amp;", "&").trim()
                if (sUrl.isBlank()) return@forEach

                val nameLower = name.lowercase()
                val urlLower = sUrl.lowercase()
                if (nameLower.contains("solidfiles") || urlLower.contains("solidfiles.com")) return@forEach
                if (nameLower.contains("zippyshare") || urlLower.contains("zippyshare.com")) return@forEach
                if (nameLower.contains("acefile") || urlLower.contains("acefile")) return@forEach
                if (nameLower.contains("all sub") || nameLower.contains("hardsub") || urlLower.contains("animexin")) return@forEach

                var displayName = when {
                    nameLower == "default" -> when {
                        urlLower.contains("ok.ru") || urlLower.contains("odnoklassniki") -> "OK.ru"
                        urlLower.contains("dailymotion") || urlLower.contains("geo.dailymotion") -> "Dailymotion"
                        else -> "Server Utama"
                    }
                    nameLower.contains("all sub player old") -> "Dailymotion"
                    urlLower.contains("ok.ru") || urlLower.contains("odnoklassniki") -> "OK.ru"
                    urlLower.contains("dailymotion") || urlLower.contains("geo.dailymotion") -> "Dailymotion"
                    urlLower.contains("1024terabox.com") || urlLower.contains("terabox") -> "Terabox"
                    urlLower.contains("linkbox") -> "Linkbox"
                    urlLower.contains("drive.google") || urlLower.contains("racaty") -> "Google Drive"
                    else -> name
                }.replace(Regex("""\s*\[(?:ads|setting dns)\]""", RegexOption.IGNORE_CASE), "").trim()

                if (sUrl.contains("dailymotion.com/embed/video/")) {
                    Regex("""video/([a-zA-Z0-9]+)""").find(sUrl)?.let { m ->
                        sUrl = "https://geo.dailymotion.com/player/xhojl.html?video=${m.groupValues[1]}"
                    }
                }

                if (isShortlinkOrBlocked(displayName, sUrl)) return@forEach

                val q = server.str("quality", "resolution") ?: ""
                if (q.isNotBlank() && !displayName.contains(q, ignoreCase = true)) {
                    displayName = "$displayName ($q)"
                }

                val isKurama = displayName.contains("kurama", ignoreCase = true) || sUrl.contains("kurama", ignoreCase = true)
                val isHls = (server["isHls"] as? JsonPrimitive)?.booleanOrNull == true ||
                    server.str("type") == "hls" ||
                    sUrl.contains(".m3u8", ignoreCase = true) ||
                    isKurama

                val wrappedUrl = wrapDonghuaStreamUrl(sUrl, isHls)
                allServers.add(
                    ServerItem(
                        label = displayName.ifBlank { "Server" },
                        url = wrappedUrl,
                        quality = q.ifBlank { null },
                        isHls = isHls,
                        badge = server.str("badge") ?: if (isHls) "HLS Cepat" else null
                    )
                )
            }

            val rawStreamUrl = raw.str("stream_url", "embed_url", "iframe", "url")
            if (!rawStreamUrl.isNullOrBlank()) {
                val isKurama = rawStreamUrl.contains("kurama", ignoreCase = true)
                val isHls = isKurama || rawStreamUrl.contains(".m3u8", ignoreCase = true)
                val wrapped = wrapDonghuaStreamUrl(rawStreamUrl, isHls)
                if (allServers.none { it.url == wrapped }) {
                    allServers.add(
                        ServerItem(
                            label = if (isKurama) "Kuramadrive (HLS)" else "Server Utama",
                            url = wrapped,
                            isHls = isHls,
                            badge = if (isHls) "HLS Cepat" else null
                        )
                    )
                }
            }

            val sortedServers = allServers.sortedBy { getServerPriority(it.label, it.url) }
            val hybridObj = raw["hybrid"] as? JsonObject
            val isHybridEligible = (hybridObj?.get("eligible") as? JsonPrimitive)?.booleanOrNull == true
            val lazyEndpoint = hybridObj?.str("lazy_endpoint")

            WatchResponse(
                title = cleanTitle(raw.str("title") ?: ""),
                streamUrl = sortedServers.firstOrNull()?.url ?: "",
                animeSlug = seriesSlug.ifBlank { null },
                servers = sortedServers,
                episodes = episodes,
                isHybrid = isHybridEligible,
                lazyEndpoint = lazyEndpoint
            )
        }

    suspend fun fetchKuramanimeLazyStream(lazyEndpoint: String): ServerItem? {
        val cleanPath = if (lazyEndpoint.startsWith("/")) lazyEndpoint else "/$lazyEndpoint"
        val root = getJson(cleanPath) as? JsonObject ?: return null
        val ks = root["data"] as? JsonObject ?: return null
        val rawUrl = ks.str("url") ?: return null
        val wrapped = wrapDonghuaStreamUrl(rawUrl, isHls = true)
        return ServerItem(
            label = ks.str("serverName", "provider") ?: "Kuramadrive (HLS)",
            url = wrapped,
            isHls = true,
            badge = "HLS Cepat"
        )
    }

    // --- 3. MOVIES (FrameX TV) ---

    private fun filterAndMapMovies(root: JsonElement?): List<MediaItem> {
        return extractDataArray(root).mapNotNull { el ->
            val obj = el as? JsonObject ?: return@mapNotNull null
            val t = (obj.str("type") ?: "").lowercase()
            val id = obj.str("id", "slug") ?: return@mapNotNull null
            if (t == "tv" || t == "series" || id.lowercase().startsWith("series/") || id.lowercase().contains("/series/")) {
                return@mapNotNull null
            }
            val year = obj.str("year") ?: ""
            MediaItem(
                title = obj.str("title") ?: "Untitled Movie",
                slug = id,
                thumb = resolveMediaUrl(obj.str("poster", "thumb", "image", "backdrop")),
                rating = obj.str("rating"),
                status = if (year.isNotBlank()) "$year • Film" else "Film Bioskop",
                type = "movie"
            )
        }
    }

    suspend fun getDiscoverMovies(
        page: Int = 1,
        genre: String = "",
        sort: String = "popularity.desc"
    ): List<MediaItem> =
        cachedFetch(catalogCache, "movie:discover:$page:$genre:$sort", CATALOG_TTL_MS, { it.isNotEmpty() }) {
            val params = buildString {
                append("/framextv/discover?type=movie&page=$page&sort=${URLEncoder.encode(sort, "UTF-8")}")
                if (genre.isNotBlank()) append("&genre=${URLEncoder.encode(genre, "UTF-8")}")
            }
            filterAndMapMovies(getJson(params))
        } ?: emptyList()

    suspend fun searchMovies(query: String): List<MediaItem> {
        if (query.isBlank()) return emptyList()
        val encoded = URLEncoder.encode(query.trim(), "UTF-8")
        return filterAndMapMovies(getJson("/framextv/search?q=$encoded"))
    }

    suspend fun getMovieDetail(movieId: String): AnimeDetail =
        cachedFetch(detailCache, "movie:$movieId", DETAIL_TTL_MS) {
            coroutineScope {
                val watchDef = async { getJson("/framextv/watch/$movieId") as? JsonObject }
                val searchDef = async { getJson("/framextv/search?q=${URLEncoder.encode(movieId, "UTF-8")}") }

                val watchData = watchDef.await()?.get("data") as? JsonObject
                val searchMatch = extractDataArray(searchDef.await()).firstOrNull() as? JsonObject

                val title = watchData?.str("title") ?: searchMatch?.str("title") ?: "Film Bioskop"
                val year = watchData?.str("year") ?: searchMatch?.str("year") ?: ""
                val rating = watchData?.str("rating") ?: searchMatch?.str("rating") ?: "N/A"
                val overview = watchData?.str("overview") ?: searchMatch?.str("overview") ?: "Sinopsis film tidak tersedia."
                val thumb = resolveMediaUrl(
                    watchData?.str("poster") ?: searchMatch?.str("poster") ?: watchData?.str("backdrop") ?: searchMatch?.str("backdrop")
                )
                val rawGenres = (watchData?.get("genres") as? JsonArray) ?: (searchMatch?.get("genres") as? JsonArray)
                val genres = rawGenres?.mapNotNull { g ->
                    when (g) {
                        is JsonPrimitive -> g.contentOrNull
                        is JsonObject -> g.str("name")
                        else -> null
                    }
                } ?: emptyList()

                AnimeDetail(
                    title = title,
                    thumb = thumb,
                    synopsis = overview,
                    rating = rating,
                    status = if (year.isNotBlank()) "$year • Film Bioskop" else "Film Bioskop",
                    genres = genres,
                    info = mapOf(
                        "Tipe" to "Film Bioskop (Movie)",
                        "Tahun" to year.ifBlank { "-" },
                        "Status" to "Full Movie"
                    ),
                    episodes = listOf(EpisodeItem(title = "Tonton Film Lengkap", slug = movieId))
                )
            }
        }!!

    suspend fun getMovieWatch(movieId: String, preferredProvider: String = "executioner"): WatchResponse =
        cachedFetch(watchCache, "movie:$movieId:$preferredProvider", WATCH_TTL_MS, { it.servers.isNotEmpty() || it.streamUrl.isNotBlank() }) {
            coroutineScope {
                val watchDef = async { getJson("/framextv/watch/$movieId?provider=$preferredProvider") as? JsonObject }
                val embedDef = async { getJson("/framextv/embed/$movieId?provider=$preferredProvider") as? JsonObject }

                val watchData = watchDef.await()?.get("data") as? JsonObject
                val embedData = embedDef.await()?.get("data") as? JsonObject

                val servers = mutableListOf<ServerItem>()
                (watchData?.get("sources") as? JsonArray)?.forEachIndexed { idx, el ->
                    val s = el as? JsonObject ?: return@forEachIndexed
                    val sUrl = s.str("url", "file") ?: return@forEachIndexed
                    val isHls = s.str("type") == "hls" || sUrl.contains(".m3u8", ignoreCase = true)
                    servers.add(
                        ServerItem(
                            label = s.str("server") ?: "${preferredProvider.uppercase()} Stream ${idx + 1} (${if (isHls) "HLS" else "Direct"})",
                            url = sUrl,
                            isHls = true,
                            badge = if (isHls) "HLS" else "MP4",
                            providerId = preferredProvider
                        )
                    )
                }

                MOVIE_PROVIDERS.forEach { prov ->
                    val embedUrl = "https://framextv.cc/embed/$movieId?autoplay=0&muted=0&controls=1&provider=${prov.id}"
                    servers.add(
                        ServerItem(
                            label = "${prov.name} (${prov.badge})",
                            url = embedUrl,
                            isHls = false,
                            badge = prov.badge,
                            providerId = prov.id
                        )
                    )
                }

                val subtitles = (watchData?.get("subtitles") as? JsonArray)?.mapIndexedNotNull { idx, el ->
                    val sub = el as? JsonObject ?: return@mapIndexedNotNull null
                    val subUrl = sub.str("url") ?: return@mapIndexedNotNull null
                    val lang = sub.str("lang") ?: "id"
                    SubtitleItem(
                        id = sub.str("id") ?: "sub-$idx",
                        label = sub.str("label") ?: "Sub ${lang.uppercase()}",
                        lang = lang,
                        url = subUrl
                    )
                } ?: emptyList()

                val defaultStreamUrl = servers.firstOrNull()?.url
                    ?: embedData?.str("embedUrl")
                    ?: "https://framextv.cc/embed/$movieId?autoplay=0&muted=0&controls=1&provider=$preferredProvider"

                WatchResponse(
                    title = watchData?.str("title") ?: "Film Bioskop",
                    streamUrl = defaultStreamUrl,
                    animeSlug = movieId,
                    servers = servers,
                    subtitles = subtitles,
                    episodes = listOf(EpisodeItem(title = "Tonton Film Lengkap", slug = movieId))
                )
            }
        }!!

    suspend fun prefetchNextEpisode(type: String, episodes: List<EpisodeItem>, currentSlug: String) {
        if (type == "movie" || episodes.size < 2) return
        val currentIdx = episodes.indexOfFirst { it.slug == currentSlug }
        if (currentIdx < 0) return

        fun epNum(ep: EpisodeItem): Double {
            val m = Regex("""(\d+(?:\.\d+)?)""").find(ep.title.ifBlank { ep.slug })
            return m?.groupValues?.get(1)?.toDoubleOrNull() ?: 0.0
        }
        val newestFirst = epNum(episodes.first()) > epNum(episodes.last())
        val nextEp = if (newestFirst) episodes.getOrNull(currentIdx - 1) else episodes.getOrNull(currentIdx + 1)
        if (nextEp != null) {
            try {
                if (type == "donghua") getDonghuaWatch(nextEp.slug) else getAnimeWatch(nextEp.slug)
            } catch (_: Exception) {}
        }
    }

    // --- 4. SUBTITLES (SRT & WebVTT Parser, mirrors subtitleParser.ts) ---

    suspend fun fetchSubtitleCues(url: String): List<SubtitleCue> {
        if (url.isBlank()) return emptyList()
        var text = getText(url)
        if (text.isNullOrBlank() || text.length <= 5) {
            val proxyUrl = "$BASE_API/framextv/subproxy?url=${URLEncoder.encode(url, "UTF-8")}"
            text = getText(proxyUrl)
        }
        return if (!text.isNullOrBlank()) parseSubtitles(text) else emptyList()
    }

    private fun parseSubtitles(text: String): List<SubtitleCue> {
        val clean = text.removePrefix("\uFEFF").replace("\r\n", "\n").replace("\r", "\n")
        val timeRegex = Regex("""(?:(\d{2}):)?(\d{2}):(\d{2})[,.](\d{3})\s*-->\s*(?:(\d{2}):)?(\d{2}):(\d{2})[,.](\d{3})""")
        val cues = mutableListOf<SubtitleCue>()

        for (block in clean.split(Regex("""\n\n+"""))) {
            val lines = block.trim().split("\n")
            var match: MatchResult? = null
            val textLines = mutableListOf<String>()

            for (line in lines) {
                val trimmed = line.trim()
                if (trimmed.isEmpty()) continue
                val m = timeRegex.find(trimmed)
                if (m != null) {
                    match = m
                } else if (match != null) {
                    val stripped = trimmed.replace(Regex("""<[^>]*>"""), "")
                    if (stripped.isNotEmpty()) textLines.add(stripped)
                }
            }

            if (match != null && textLines.isNotEmpty()) {
                val g = match.groupValues
                cues.add(
                    SubtitleCue(
                        start = toSeconds(g[1], g[2], g[3], g[4]),
                        end = toSeconds(g[5], g[6], g[7], g[8]),
                        text = textLines.joinToString("\n")
                    )
                )
            }
        }
        return cues
    }

    private fun toSeconds(h: String, m: String, s: String, ms: String): Double {
        val hours = h.toIntOrNull() ?: 0
        val mins = m.toIntOrNull() ?: 0
        val secs = s.toIntOrNull() ?: 0
        val millis = ms.toIntOrNull() ?: 0
        return hours * 3600.0 + mins * 60.0 + secs + millis / 1000.0
    }
}
