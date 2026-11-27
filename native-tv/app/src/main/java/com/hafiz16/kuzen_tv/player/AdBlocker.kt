package com.hafiz16.kuzen_tv.player

import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import java.io.ByteArrayInputStream

object AdBlocker {
    private val BLOCKED_KEYWORDS = listOf(
        "google-analytics", "doubleclick", "adservice", "popads", "popcash",
        "adsterra", "exoclick", "histats", "onclickmega", "bet365", "1xbet",
        "slot", "gacor", "judionline", "banner", "adserver", "syndication",
        "juicyads", "trafficfactory", "propellerads", "admob"
    )

    fun shouldBlock(request: WebResourceRequest): Boolean {
        val url = request.url.toString().lowercase()
        return BLOCKED_KEYWORDS.any { url.contains(it) }
    }

    fun createEmptyResponse(): WebResourceResponse {
        return WebResourceResponse("text/plain", "UTF-8", ByteArrayInputStream("".toByteArray()))
    }
}
