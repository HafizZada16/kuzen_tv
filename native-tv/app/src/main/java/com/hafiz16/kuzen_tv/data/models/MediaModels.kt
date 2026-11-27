package com.hafiz16.kuzen_tv.data.models

import kotlinx.serialization.Serializable

@Serializable
data class MediaItem(
    val title: String,
    val slug: String,
    val thumb: String,
    val status: String? = null,
    val rating: String? = null,
    val type: String = "anime" // "anime", "donghua", "movie"
)

@Serializable
data class AnimeDetail(
    val title: String,
    val thumb: String,
    val synopsis: String,
    val rating: String = "",
    val status: String = "Ongoing",
    val genres: List<String> = emptyList(),
    val info: Map<String, String> = emptyMap(),
    val episodes: List<EpisodeItem> = emptyList()
)

@Serializable
data class EpisodeItem(
    val title: String,
    val slug: String
)

@Serializable
data class ServerItem(
    val label: String,
    val url: String,
    val quality: String? = null,
    val isHls: Boolean = false,
    val badge: String? = null,
    val providerId: String? = null
)

@Serializable
data class SubtitleItem(
    val id: String = "",
    val label: String = "",
    val lang: String = "id",
    val url: String
)

data class SubtitleCue(
    val start: Double,
    val end: Double,
    val text: String
)

@Serializable
data class WatchResponse(
    val title: String,
    val streamUrl: String,
    val animeSlug: String? = null,
    val servers: List<ServerItem> = emptyList(),
    val subtitles: List<SubtitleItem> = emptyList(),
    val episodes: List<EpisodeItem> = emptyList(),
    val isHybrid: Boolean = false,
    val lazyEndpoint: String? = null
)

data class MovieProviderOption(
    val id: String,
    val name: String,
    val badge: String
)
