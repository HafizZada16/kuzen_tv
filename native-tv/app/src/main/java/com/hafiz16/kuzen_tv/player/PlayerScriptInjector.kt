package com.hafiz16.kuzen_tv.player

import android.content.Context
import org.json.JSONObject
import java.net.URLEncoder

object PlayerScriptInjector {

    private fun readAsset(context: Context, assetPath: String): String {
        return context.assets.open(assetPath).bufferedReader().use { it.readText() }
    }

    fun buildInjectedScript(
        context: Context,
        sourceType: String,
        startTime: Double = 0.0,
        totalDuration: Double = 0.0
    ): String {
        val assetFile = when (sourceType.lowercase()) {
            "movie" -> "player/movie_inject.js"
            "donghua", "anichin" -> "player/donghua_inject.js"
            else -> "player/anime_inject.js"
        }
        val body = readAsset(context, assetFile)
        return """
            window.__KUZEN_START_TIME__ = $startTime;
            window.__KUZEN_TOTAL_DURATION__ = $totalDuration;
            $body
        """.trimIndent()
    }

    fun buildHlsPlayerHtml(
        context: Context,
        streamUrl: String,
        initTime: Double = 0.0
    ): String {
        val actualUrl = if (streamUrl.contains("kurama", ignoreCase = true) && !streamUrl.contains("/cors-proxy")) {
            "https://kuzen.web.id/api/cors-proxy?url=${URLEncoder.encode(streamUrl, "UTF-8")}"
        } else {
            streamUrl
        }
        val template = readAsset(context, "player/hls_player.html")
        return template
            .replace("__STREAM_URL__", JSONObject.quote(actualUrl))
            .replace("__INIT_TIME__", initTime.coerceAtLeast(0.0).toString())
    }
}
