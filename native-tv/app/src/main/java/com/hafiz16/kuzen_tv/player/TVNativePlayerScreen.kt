package com.hafiz16.kuzen_tv.player

import android.annotation.SuppressLint
import android.os.Handler
import android.os.Looper
import android.view.KeyEvent
import android.view.ViewGroup
import android.webkit.*
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.tv.material3.*
import com.hafiz16.kuzen_tv.data.models.*
import com.hafiz16.kuzen_tv.data.network.MediaRepository
import com.hafiz16.kuzen_tv.ui.theme.*
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import org.json.JSONObject

private class KuzenWebBridge(private val onMessage: (String) -> Unit) {
    @JavascriptInterface
    fun postMessage(data: String) {
        onMessage(data)
    }
}

private data class HlsQualityLevel(val index: Int, val label: String)

private fun formatTime(secs: Double): String {
    val total = secs.toInt().coerceAtLeast(0)
    val h = total / 3600
    val m = (total % 3600) / 60
    val s = total % 60
    return if (h > 0) "%d:%02d:%02d".format(h, m, s) else "%02d:%02d".format(m, s)
}

@OptIn(ExperimentalTvMaterial3Api::class)
@SuppressLint("SetJavaScriptEnabled")
@Composable
fun TVNativePlayerScreen(
    mediaItem: MediaItem,
    initialEpisode: EpisodeItem,
    initialEpisodes: List<EpisodeItem>,
    onRegisterKeyHandler: (((Int) -> Boolean)?) -> Unit,
    onClose: () -> Unit
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val mainHandler = remember { Handler(Looper.getMainLooper()) }

    val normType = remember(mediaItem.type) {
        when (mediaItem.type.lowercase()) {
            "movie" -> "movie"
            "donghua", "anichin" -> "donghua"
            else -> "anime"
        }
    }

    var currentEpisode by remember { mutableStateOf(initialEpisode) }
    var watchData by remember { mutableStateOf<WatchResponse?>(null) }
    var currentServer by remember { mutableStateOf<ServerItem?>(null) }
    var isLoading by remember { mutableStateOf(true) }
    var isBuffering by remember { mutableStateOf(false) }
    var isPlaying by remember { mutableStateOf(true) }
    var currentTime by remember { mutableStateOf(0.0) }
    var duration by remember { mutableStateOf(1440.0) }
    var bufferedTime by remember { mutableStateOf(0.0) }
    var playbackSpeed by remember { mutableStateOf(1.0) }
    var hlsLevels by remember { mutableStateOf<List<HlsQualityLevel>>(emptyList()) }
    var currentLevelIndex by remember { mutableStateOf(-1) }

    var subtitleCues by remember { mutableStateOf<List<SubtitleCue>>(emptyList()) }
    var selectedSubtitle by remember { mutableStateOf<SubtitleItem?>(null) }
    var currentCueText by remember { mutableStateOf<String?>(null) }

    // 4-tier OSD & Drawer State
    var isOsdVisible by remember { mutableStateOf(false) }
    var activeTier by remember { mutableStateOf(1) } // 1=hidden, 2=seekbar, 3=quick actions, 4=drawer
    var tier3Selection by remember { mutableStateOf(if (normType == "movie") "servers" else "episodes") }
    var isDrawerOpen by remember { mutableStateOf(false) }
    var drawerTab by remember { mutableStateOf("episodes") } // episodes, servers, subtitles
    var drawerIndex by remember { mutableStateOf(0) }
    var scrubTime by remember { mutableStateOf(0.0) }
    var centerToast by remember { mutableStateOf<String?>(null) }

    var lastLoadedKey by remember { mutableStateOf("") }
    var webViewRef by remember { mutableStateOf<WebView?>(null) }

    var lastScrubMs by remember { mutableStateOf(0L) }
    var scrubStreak by remember { mutableStateOf(0) }
    var osdActivityTick by remember { mutableStateOf(0) }

    val drawerListState = rememberLazyListState()

    fun showToast(msg: String) {
        centerToast = msg
    }

    LaunchedEffect(centerToast) {
        if (centerToast != null) {
            delay(1400)
            centerToast = null
        }
    }

    LaunchedEffect(isOsdVisible, isDrawerOpen, osdActivityTick) {
        if (isOsdVisible && !isDrawerOpen) {
            delay(6500)
            isOsdVisible = false
            activeTier = 1
        }
    }

    LaunchedEffect(drawerIndex, isDrawerOpen) {
        if (isDrawerOpen && drawerIndex >= 0) {
            drawerListState.animateScrollToItem(drawerIndex)
        }
    }

    fun sendJsCommand(action: String, value: Any? = null) {
        val arg = when (value) {
            null -> "undefined"
            is String -> JSONObject.quote(value)
            else -> value.toString()
        }
        val js = "try{if(window.__QUETTA_EXEC__)window.__QUETTA_EXEC__(${JSONObject.quote(action)},$arg);}catch(e){}"
        webViewRef?.evaluateJavascript(js, null)
    }

    fun selectSubtitle(sub: SubtitleItem?) {
        selectedSubtitle = sub
        isDrawerOpen = false
        isOsdVisible = false
        activeTier = 1
        if (sub == null) {
            subtitleCues = emptyList()
            currentCueText = null
            showToast("Subtitle Dinonaktifkan")
            return
        }
        showToast("Memuat ${sub.label}...")
        scope.launch {
            val cues = MediaRepository.fetchSubtitleCues(sub.url)
            subtitleCues = cues
            showToast(if (cues.isNotEmpty()) "Subtitle: ${sub.label}" else "Subtitle gagal dimuat")
        }
    }

    fun selectServer(srv: ServerItem) {
        isDrawerOpen = false
        isOsdVisible = false
        activeTier = 1
        if (normType == "movie" && !srv.providerId.isNullOrBlank() && !srv.isHls) {
            showToast("Menghubungkan ${srv.label}...")
            scope.launch {
                val res = MediaRepository.getMovieWatch(currentEpisode.slug, srv.providerId)
                watchData = res
                val chosen = res.servers.firstOrNull() ?: srv
                currentServer = chosen
                lastLoadedKey = ""
                showToast("Server: ${chosen.label}")
            }
            return
        }
        currentServer = srv
        lastLoadedKey = ""
        showToast("Server: ${srv.label}")
    }

    // Load WatchResponse when episode changes
    LaunchedEffect(currentEpisode.slug, normType) {
        isLoading = true
        isBuffering = false
        hlsLevels = emptyList()
        currentLevelIndex = -1
        currentTime = 0.0
        bufferedTime = 0.0
        subtitleCues = emptyList()
        currentCueText = null
        lastLoadedKey = ""

        val res = when (normType) {
            "movie" -> MediaRepository.getMovieWatch(currentEpisode.slug)
            "donghua" -> MediaRepository.getDonghuaWatch(currentEpisode.slug)
            else -> MediaRepository.getAnimeWatch(currentEpisode.slug)
        }

        val populated = res?.let {
            if (it.episodes.isEmpty() && initialEpisodes.isNotEmpty()) it.copy(episodes = initialEpisodes) else it
        }
        watchData = populated

        val servers = populated?.servers.orEmpty()
        val hdMatch = servers.firstOrNull { s ->
            val l = s.label.lowercase()
            (l.contains("720p") || l.contains("1080p")) && MediaRepository.getServerPriority(s.label, s.url) <= 4
        }
        currentServer = hdMatch ?: servers.firstOrNull()

        if (normType == "movie" && !populated?.subtitles.isNullOrEmpty()) {
            val idSub = populated!!.subtitles.firstOrNull { sub ->
                val l = sub.lang.lowercase()
                val lbl = sub.label.lowercase()
                l == "id" || l.startsWith("id-") || l.contains("ind") || lbl.contains("indonesia")
            } ?: populated.subtitles.first()
            selectSubtitle(idSub)
        }

        if (normType == "donghua" && populated?.isHybrid == true && !populated.lazyEndpoint.isNullOrBlank()) {
            val lazyPath = populated.lazyEndpoint
            launch {
                val kurama = MediaRepository.fetchKuramanimeLazyStream(lazyPath)
                if (kurama != null) {
                    watchData = watchData?.let { prev ->
                        if (prev.servers.any { it.label.contains("kurama", ignoreCase = true) }) prev
                        else prev.copy(servers = listOf(kurama) + prev.servers)
                    }
                    currentServer = kurama
                    lastLoadedKey = ""
                }
            }
        }
        isLoading = false
    }

    fun handleTelemetry(rawJson: String) {
        try {
            val obj = JSONObject(rawJson)
            when (obj.optString("type")) {
                "video_ready" -> {
                    val dur = obj.optDouble("duration", 0.0)
                    if (dur > 0) duration = dur
                    if (obj.has("isPlaying")) isPlaying = obj.optBoolean("isPlaying", true)
                    isBuffering = false
                }
                "timeupdate" -> {
                    val ct = obj.optDouble("currentTime", -1.0)
                    if (ct >= 0) {
                        currentTime = ct
                        if (subtitleCues.isNotEmpty()) {
                            currentCueText = subtitleCues.firstOrNull { ct >= it.start && ct <= it.end }?.text
                        } else {
                            currentCueText = null
                        }
                    }
                    val dur = obj.optDouble("duration", 0.0)
                    if (dur > 0) duration = dur
                    val buf = obj.optDouble("buffered", -1.0)
                    if (buf >= 0) bufferedTime = buf
                }
                "progress" -> {
                    val buf = obj.optDouble("buffered", -1.0)
                    if (buf >= 0) bufferedTime = buf
                }
                "playstate" -> {
                    if (obj.has("isPlaying")) isPlaying = obj.optBoolean("isPlaying", isPlaying)
                }
                "buffering" -> {
                    isBuffering = obj.optBoolean("isBuffering", false)
                }
                "hls_levels" -> {
                    val arr = obj.optJSONArray("levels")
                    if (arr != null && arr.length() > 0) {
                        val list = mutableListOf<HlsQualityLevel>()
                        for (i in 0 until arr.length()) {
                            val item = arr.getJSONObject(i)
                            list.add(HlsQualityLevel(item.optInt("index", i), item.optString("label", "Auto")))
                        }
                        hlsLevels = list
                        currentLevelIndex = obj.optInt("currentLevel", -1)
                    }
                }
            }
        } catch (_: Exception) {}
    }

    fun getScrubStep(): Int {
        val now = System.currentTimeMillis()
        scrubStreak = if (now - lastScrubMs < 550) scrubStreak + 1 else 1
        lastScrubMs = now
        return when {
            scrubStreak >= 8 -> 60
            scrubStreak >= 4 -> 30
            else -> 10
        }
    }

    fun cycleSpeed() {
        val speeds = listOf(1.0, 1.25, 1.5, 2.0)
        val next = speeds[(speeds.indexOf(playbackSpeed) + 1) % speeds.size]
        playbackSpeed = next
        sendJsCommand("SPEED", next)
        showToast("Kecepatan: ${next}x")
    }

    fun cycleQuality() {
        if (hlsLevels.isEmpty()) {
            showToast("Kualitas: Otomatis")
            return
        }
        val options = listOf(-1) + hlsLevels.map { it.index }
        val nextIdx = options[(options.indexOf(currentLevelIndex) + 1) % options.size]
        currentLevelIndex = nextIdx
        sendJsCommand("QUALITY", nextIdx)
        val lbl = if (nextIdx == -1) "Otomatis" else hlsLevels.firstOrNull { it.index == nextIdx }?.label ?: "Auto"
        showToast("Kualitas: $lbl")
    }

    fun openDrawer(tab: String) {
        drawerTab = tab
        drawerIndex = when (tab) {
            "episodes" -> watchData?.episodes?.indexOfFirst { it.slug == currentEpisode.slug }?.coerceAtLeast(0) ?: 0
            "servers" -> watchData?.servers?.indexOfFirst { it.url == currentServer?.url }?.coerceAtLeast(0) ?: 0
            else -> {
                val found = watchData?.subtitles?.indexOfFirst { it.url == selectedSubtitle?.url } ?: -1
                if (found >= 0) found + 1 else 0
            }
        }
        isDrawerOpen = true
        activeTier = 4
    }

    fun getQuickButtons(): List<String> {
        val list = mutableListOf<String>()
        if (normType != "movie") list.add("episodes")
        list.add("servers")
        if (normType == "movie") list.add("subtitles")
        if (hlsLevels.isNotEmpty()) list.add("quality")
        list.add("speed")
        return list
    }

    // Register hardware remote D-Pad key handler while player is mounted
    DisposableEffect(Unit) {
        val handler: (Int) -> Boolean = { keyCode ->
            osdActivityTick++
            when {
                keyCode == KeyEvent.KEYCODE_BACK || keyCode == KeyEvent.KEYCODE_ESCAPE -> {
                    when {
                        isDrawerOpen -> {
                            isDrawerOpen = false
                            activeTier = 3
                            true
                        }
                        isOsdVisible -> {
                            isOsdVisible = false
                            activeTier = 1
                            true
                        }
                        else -> {
                            onClose()
                            true
                        }
                    }
                }
                isDrawerOpen -> {
                    val count = when (drawerTab) {
                        "episodes" -> watchData?.episodes?.size ?: 0
                        "servers" -> watchData?.servers?.size ?: 0
                        else -> (watchData?.subtitles?.size ?: 0) + 1
                    }
                    when (keyCode) {
                        KeyEvent.KEYCODE_DPAD_LEFT -> {
                            if (drawerIndex > 0) drawerIndex--
                            true
                        }
                        KeyEvent.KEYCODE_DPAD_RIGHT -> {
                            if (drawerIndex < count - 1) drawerIndex++
                            true
                        }
                        KeyEvent.KEYCODE_DPAD_UP -> {
                            isDrawerOpen = false
                            activeTier = 3
                            true
                        }
                        KeyEvent.KEYCODE_DPAD_CENTER, KeyEvent.KEYCODE_ENTER -> {
                            when (drawerTab) {
                                "episodes" -> watchData?.episodes?.getOrNull(drawerIndex)?.let { ep ->
                                    isDrawerOpen = false
                                    isOsdVisible = false
                                    activeTier = 1
                                    currentEpisode = ep
                                }
                                "servers" -> watchData?.servers?.getOrNull(drawerIndex)?.let { selectServer(it) }
                                "subtitles" -> {
                                    if (drawerIndex == 0) selectSubtitle(null)
                                    else watchData?.subtitles?.getOrNull(drawerIndex - 1)?.let { selectSubtitle(it) }
                                }
                            }
                            true
                        }
                        else -> true
                    }
                }
                !isOsdVisible -> {
                    when (keyCode) {
                        KeyEvent.KEYCODE_DPAD_CENTER, KeyEvent.KEYCODE_ENTER, KeyEvent.KEYCODE_MEDIA_PLAY_PAUSE -> {
                            sendJsCommand("TOGGLE")
                            isPlaying = !isPlaying
                            showToast(if (isPlaying) "▶ Putar" else "⏸ Jeda")
                            true
                        }
                        KeyEvent.KEYCODE_DPAD_LEFT, KeyEvent.KEYCODE_DPAD_RIGHT -> {
                            val step = getScrubStep()
                            val delta = if (keyCode == KeyEvent.KEYCODE_DPAD_RIGHT) step.toDouble() else -step.toDouble()
                            scrubTime = (currentTime + delta).coerceIn(0.0, duration)
                            isOsdVisible = true
                            activeTier = 2
                            true
                        }
                        KeyEvent.KEYCODE_DPAD_UP, KeyEvent.KEYCODE_DPAD_DOWN -> {
                            scrubTime = currentTime
                            isOsdVisible = true
                            activeTier = 3
                            val btns = getQuickButtons()
                            if (tier3Selection !in btns) tier3Selection = btns.first()
                            true
                        }
                        else -> false
                    }
                }
                activeTier == 2 -> {
                    when (keyCode) {
                        KeyEvent.KEYCODE_DPAD_LEFT, KeyEvent.KEYCODE_DPAD_RIGHT -> {
                            val step = getScrubStep()
                            val delta = if (keyCode == KeyEvent.KEYCODE_DPAD_RIGHT) step.toDouble() else -step.toDouble()
                            scrubTime = (scrubTime + delta).coerceIn(0.0, duration)
                            true
                        }
                        KeyEvent.KEYCODE_DPAD_CENTER, KeyEvent.KEYCODE_ENTER -> {
                            currentTime = scrubTime
                            sendJsCommand("SEEK", scrubTime)
                            showToast("Lompat ke ${formatTime(scrubTime)}")
                            isOsdVisible = false
                            activeTier = 1
                            true
                        }
                        KeyEvent.KEYCODE_DPAD_DOWN -> {
                            activeTier = 3
                            val btns = getQuickButtons()
                            if (tier3Selection !in btns) tier3Selection = btns.first()
                            true
                        }
                        KeyEvent.KEYCODE_DPAD_UP -> {
                            isOsdVisible = false
                            activeTier = 1
                            true
                        }
                        else -> true
                    }
                }
                activeTier == 3 -> {
                    val btns = getQuickButtons()
                    val idx = btns.indexOf(tier3Selection).coerceAtLeast(0)
                    when (keyCode) {
                        KeyEvent.KEYCODE_DPAD_LEFT -> {
                            if (idx > 0) tier3Selection = btns[idx - 1]
                            true
                        }
                        KeyEvent.KEYCODE_DPAD_RIGHT -> {
                            if (idx < btns.lastIndex) tier3Selection = btns[idx + 1]
                            true
                        }
                        KeyEvent.KEYCODE_DPAD_UP -> {
                            scrubTime = currentTime
                            activeTier = 2
                            true
                        }
                        KeyEvent.KEYCODE_DPAD_CENTER, KeyEvent.KEYCODE_ENTER -> {
                            when (tier3Selection) {
                                "episodes" -> openDrawer("episodes")
                                "servers" -> openDrawer("servers")
                                "subtitles" -> openDrawer("subtitles")
                                "quality" -> cycleQuality()
                                "speed" -> cycleSpeed()
                            }
                            true
                        }
                        KeyEvent.KEYCODE_MEDIA_PLAY_PAUSE -> {
                            sendJsCommand("TOGGLE")
                            isPlaying = !isPlaying
                            showToast(if (isPlaying) "▶ Putar" else "⏸ Jeda")
                            true
                        }
                        else -> true
                    }
                }
                else -> false
            }
        }
        onRegisterKeyHandler(handler)
        onDispose {
            onRegisterKeyHandler(null)
            try {
                webViewRef?.evaluateJavascript(
                    "try{var vs=document.querySelectorAll('video');for(var i=0;i<vs.length;i++){vs[i].pause();vs[i].src='';vs[i].load();}if(window.__HLS_INSTANCE__)window.__HLS_INSTANCE__.destroy();}catch(e){}",
                    null
                )
                webViewRef?.clearCache(true)
                webViewRef?.destroy()
            } catch (_: Exception) {}
        }
    }

    val streamUrl = currentServer?.url ?: watchData?.streamUrl ?: ""
    val isDirectHls = currentServer?.isHls == true ||
        streamUrl.contains(".m3u8", ignoreCase = true) ||
        streamUrl.contains("kurama", ignoreCase = true)

    fun buildHeaders(url: String): Map<String, String> {
        val l = url.lowercase()
        if (listOf("mega.nz", "mega-embed", "drive.google.com", "acefile", "kraken", "sharer").any { l.contains(it) }) {
            return emptyMap()
        }
        val referer = when {
            l.contains("animexin") -> "https://animexin.dev/"
            l.contains("anichin") || l.contains("nunadrama") || l.contains("miraishare") || normType == "donghua" -> "https://anichin.moe/"
            else -> "https://otakudesu.cloud/"
        }
        return mapOf("Referer" to referer)
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Black)
    ) {
        // 1. Isolated Non-Focusable WebView Surface
        if (!isLoading && streamUrl.isNotBlank()) {
            AndroidView(
                factory = { ctx ->
                    WebView(ctx).apply {
                        layoutParams = ViewGroup.LayoutParams(
                            ViewGroup.LayoutParams.MATCH_PARENT,
                            ViewGroup.LayoutParams.MATCH_PARENT
                        )
                        setBackgroundColor(android.graphics.Color.BLACK)
                        isFocusable = false
                        isFocusableInTouchMode = false
                        descendantFocusability = ViewGroup.FOCUS_BLOCK_DESCENDANTS

                        settings.javaScriptEnabled = true
                        settings.domStorageEnabled = true
                        settings.mediaPlaybackRequiresUserGesture = false
                        settings.mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
                        settings.useWideViewPort = true
                        settings.loadWithOverviewMode = true
                        settings.userAgentString =
                            "Mozilla/5.0 (Linux; Android 13; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36"

                        addJavascriptInterface(
                            KuzenWebBridge { msg -> mainHandler.post { handleTelemetry(msg) } },
                            "ReactNativeWebView"
                        )

                        webChromeClient = object : WebChromeClient() {
                            override fun onJsAlert(view: WebView?, url: String?, message: String?, result: JsResult?): Boolean {
                                result?.cancel()
                                return true
                            }
                            override fun onJsConfirm(view: WebView?, url: String?, message: String?, result: JsResult?): Boolean {
                                result?.cancel()
                                return true
                            }
                        }

                        webViewClient = object : WebViewClient() {
                            override fun shouldInterceptRequest(view: WebView?, request: WebResourceRequest?): WebResourceResponse? {
                                if (request != null && AdBlocker.shouldBlock(request)) {
                                    return AdBlocker.createEmptyResponse()
                                }
                                return super.shouldInterceptRequest(view, request)
                            }

                            override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean {
                                val reqUrl = request?.url?.toString().orEmpty()
                                if (isDirectHls || normType == "movie") return false
                                val l = reqUrl.lowercase()
                                if (l.startsWith("about:") || l.startsWith("blob:") || l.startsWith("data:")) return false
                                if (l.startsWith("intent:") || l.startsWith("market:") || l.startsWith("whatsapp:") || l.startsWith("tg:") || !l.startsWith("http")) {
                                    return true
                                }
                                if (reqUrl == streamUrl || l.contains("/cors-proxy?") || l.contains("/iframe-proxy?")) return false
                                val allowed = listOf(
                                    "playdesu", "odstream", "odsstream", "odcdn", "otakudesu", "moedesu",
                                    "desustream", "ondesu", "pdrain", "pixeldrain", "kuramadrive", "kuramanime",
                                    "anichin", "animexin", "mega.nz", "google.com", "googleapis.com", "blogger.com",
                                    "acefile", "kuzen.web.id", "framextv", "vidsrc", "embed", "stream"
                                )
                                return allowed.none { l.contains(it) }
                            }

                            override fun onPageFinished(view: WebView?, url: String?) {
                                super.onPageFinished(view, url)
                                if (!isDirectHls) {
                                    val script = PlayerScriptInjector.buildInjectedScript(
                                        context = ctx,
                                        sourceType = normType,
                                        startTime = 0.0,
                                        totalDuration = duration
                                    )
                                    view?.evaluateJavascript(script, null)
                                }
                            }
                        }
                        webViewRef = this
                    }
                },
                update = { webView ->
                    val targetKey = "$streamUrl|$isDirectHls"
                    if (lastLoadedKey != targetKey) {
                        lastLoadedKey = targetKey
                        if (isDirectHls) {
                            val html = PlayerScriptInjector.buildHlsPlayerHtml(context, streamUrl, 0.0)
                            webView.loadDataWithBaseURL("https://kuzen.web.id", html, "text/html", "UTF-8", null)
                        } else {
                            webView.loadUrl(streamUrl, buildHeaders(streamUrl))
                        }
                    }
                },
                modifier = Modifier.fillMaxSize()
            )
        }

        // Loading / Buffering status
        if (isLoading || isBuffering) {
            Box(
                modifier = Modifier
                    .align(Alignment.Center)
                    .clip(RoundedCornerShape(10.dp))
                    .background(Color.Black.copy(alpha = 0.75f))
                    .padding(horizontal = 20.dp, vertical = 10.dp)
            ) {
                Text(
                    text = if (isLoading) "Menghubungkan ke server video..." else "Buffering...",
                    color = TextPrimary,
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Medium
                )
            }
        }

        // Subtitle Overlay
        if (!currentCueText.isNullOrBlank()) {
            Box(
                modifier = Modifier
                    .align(Alignment.BottomCenter)
                    .padding(bottom = if (isOsdVisible) 145.dp else 44.dp, start = 48.dp, end = 48.dp)
                    .clip(RoundedCornerShape(6.dp))
                    .background(Color.Black.copy(alpha = 0.78f))
                    .padding(horizontal = 14.dp, vertical = 6.dp)
            ) {
                Text(
                    text = currentCueText!!,
                    color = Color.White,
                    fontSize = 18.sp,
                    fontWeight = FontWeight.SemiBold,
                    textAlign = TextAlign.Center
                )
            }
        }

        // Center Toast
        if (centerToast != null) {
            Box(
                modifier = Modifier
                    .align(Alignment.Center)
                    .clip(RoundedCornerShape(12.dp))
                    .background(Color.Black.copy(alpha = 0.85f))
                    .border(1.5.dp, BorderMuted, RoundedCornerShape(12.dp))
                    .padding(horizontal = 24.dp, vertical = 14.dp)
            ) {
                Text(
                    text = centerToast!!,
                    color = TextPrimary,
                    fontSize = 17.sp,
                    fontWeight = FontWeight.Bold
                )
            }
        }

        // 2. SmartTube-style 4-Tier OSD Overlay (Mounted ONLY when visible)
        if (isOsdVisible) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(Color.Black.copy(alpha = 0.48f))
                    .padding(horizontal = 36.dp, vertical = 24.dp)
            ) {
                // Top Info
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = mediaItem.title,
                            color = TextPrimary,
                            fontSize = 19.sp,
                            fontWeight = FontWeight.Bold,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                        Text(
                            text = "${currentEpisode.title} • ${currentServer?.label ?: "Server"}",
                            color = TextSecondary,
                            fontSize = 13.sp,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                    }
                    Text(
                        text = "BACK: Tutup OSD",
                        color = TextSecondary,
                        fontSize = 12.sp
                    )
                }

                // Bottom Controls (Tier 2 Seekbar + Tier 3 Quick Buttons)
                Column(
                    modifier = Modifier
                        .align(Alignment.BottomCenter)
                        .fillMaxWidth()
                ) {
                    val shownTime = if (activeTier == 2) scrubTime else currentTime
                    val progress = if (duration > 0) (shownTime / duration).toFloat().coerceIn(0f, 1f) else 0f
                    val bufProgress = if (duration > 0) (bufferedTime / duration).toFloat().coerceIn(0f, 1f) else 0f

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text(text = formatTime(shownTime), color = TextPrimary, fontSize = 13.sp, fontWeight = FontWeight.Bold)
                        Text(text = formatTime(duration), color = TextSecondary, fontSize = 13.sp)
                    }

                    Spacer(modifier = Modifier.height(6.dp))

                    // Seekbar
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(if (activeTier == 2) 12.dp else 7.dp)
                            .clip(RoundedCornerShape(6.dp))
                            .background(Color.White.copy(alpha = 0.22f))
                            .then(
                                if (activeTier == 2) Modifier.border(2.dp, FocusBorderColor, RoundedCornerShape(6.dp))
                                else Modifier
                            )
                    ) {
                        Box(
                            modifier = Modifier
                                .fillMaxWidth(bufProgress)
                                .fillMaxHeight()
                                .background(Color.White.copy(alpha = 0.35f))
                        )
                        Box(
                            modifier = Modifier
                                .fillMaxWidth(progress)
                                .fillMaxHeight()
                                .background(AccentPrimary)
                        )
                    }

                    Spacer(modifier = Modifier.height(14.dp))

                    // Tier 3 Quick Action Row
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(12.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        getQuickButtons().forEach { btn ->
                            val isFocused = activeTier == 3 && tier3Selection == btn
                            val label = when (btn) {
                                "episodes" -> "Episode (${watchData?.episodes?.size ?: 0})"
                                "servers" -> "Server"
                                "subtitles" -> "Subtitle"
                                "quality" -> if (currentLevelIndex == -1) "Kualitas: Auto" else "Kualitas"
                                else -> "Kecepatan: ${playbackSpeed}x"
                            }
                            Box(
                                modifier = Modifier
                                    .clip(RoundedCornerShape(8.dp))
                                    .background(if (isFocused) AccentPrimary else SurfaceCard)
                                    .border(
                                        BorderStroke(if (isFocused) 2.5.dp else 1.dp, if (isFocused) FocusBorderColor else BorderMuted),
                                        RoundedCornerShape(8.dp)
                                    )
                                    .padding(horizontal = 14.dp, vertical = 9.dp)
                            ) {
                                Text(
                                    text = label,
                                    color = Color.White,
                                    fontSize = 13.sp,
                                    fontWeight = if (isFocused) FontWeight.Bold else FontWeight.Medium
                                )
                            }
                        }
                    }
                }
            }
        }

        // 3. Tier 4 Bottom Drawer (ONLY mounted when isDrawerOpen == true)
        if (isDrawerOpen) {
            Column(
                modifier = Modifier
                    .align(Alignment.BottomCenter)
                    .fillMaxWidth()
                    .background(BackgroundElevated.copy(alpha = 0.96f))
                    .border(1.dp, BorderMuted)
                    .padding(horizontal = 32.dp, vertical = 18.dp)
            ) {
                val drawerTitle = when (drawerTab) {
                    "episodes" -> "Pilih Episode"
                    "servers" -> "Pilih Server Stream"
                    else -> "Pilih Subtitle"
                }
                Text(
                    text = "$drawerTitle  (◀ ▶ Navigasi • OK Pilih • BACK Tutup)",
                    color = TextPrimary,
                    fontSize = 15.sp,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.padding(bottom = 12.dp)
                )

                when (drawerTab) {
                    "episodes" -> {
                        val eps = watchData?.episodes.orEmpty()
                        LazyRow(
                            state = drawerListState,
                            horizontalArrangement = Arrangement.spacedBy(12.dp)
                        ) {
                            itemsIndexed(eps) { idx, ep ->
                                val selected = idx == drawerIndex
                                val active = ep.slug == currentEpisode.slug
                                DrawerCard(
                                    title = MediaRepository.extractEpisodeLabel(ep.title, idx),
                                    subtitle = if (active) "Sedang diputar" else null,
                                    isFocused = selected,
                                    isActive = active
                                )
                            }
                        }
                    }
                    "servers" -> {
                        val srvs = watchData?.servers.orEmpty()
                        LazyRow(
                            state = drawerListState,
                            horizontalArrangement = Arrangement.spacedBy(12.dp)
                        ) {
                            itemsIndexed(srvs) { idx, srv ->
                                val selected = idx == drawerIndex
                                val active = srv.url == currentServer?.url
                                DrawerCard(
                                    title = srv.label,
                                    subtitle = srv.badge ?: if (srv.isHls) "HLS" else "Embed",
                                    isFocused = selected,
                                    isActive = active
                                )
                            }
                        }
                    }
                    else -> {
                        val subs = watchData?.subtitles.orEmpty()
                        LazyRow(
                            state = drawerListState,
                            horizontalArrangement = Arrangement.spacedBy(12.dp)
                        ) {
                            item {
                                DrawerCard(
                                    title = "Nonaktif",
                                    subtitle = "Tanpa Subtitle",
                                    isFocused = drawerIndex == 0,
                                    isActive = selectedSubtitle == null
                                )
                            }
                            itemsIndexed(subs) { idx, sub ->
                                val cardIdx = idx + 1
                                DrawerCard(
                                    title = sub.label,
                                    subtitle = sub.lang.uppercase(),
                                    isFocused = drawerIndex == cardIdx,
                                    isActive = sub.url == selectedSubtitle?.url
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
private fun DrawerCard(
    title: String,
    subtitle: String?,
    isFocused: Boolean,
    isActive: Boolean
) {
    Column(
        modifier = Modifier
            .width(175.dp)
            .clip(RoundedCornerShape(8.dp))
            .background(if (isFocused) AccentPrimary else if (isActive) SurfaceCardFocused else SurfaceCard)
            .border(
                BorderStroke(if (isFocused) 3.dp else 1.dp, if (isFocused) FocusBorderColor else BorderMuted),
                RoundedCornerShape(8.dp)
            )
            .padding(horizontal = 12.dp, vertical = 10.dp)
    ) {
        Text(
            text = title,
            color = TextPrimary,
            fontSize = 13.sp,
            fontWeight = FontWeight.Bold,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis
        )
        if (!subtitle.isNullOrBlank()) {
            Spacer(modifier = Modifier.height(3.dp))
            Text(
                text = subtitle,
                color = if (isFocused) Color.White.copy(alpha = 0.9f) else TextSecondary,
                fontSize = 11.sp,
                maxLines = 1
            )
        }
    }
}
