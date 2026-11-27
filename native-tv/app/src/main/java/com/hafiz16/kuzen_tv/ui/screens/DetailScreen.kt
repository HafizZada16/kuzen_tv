package com.hafiz16.kuzen_tv.ui.screens

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.tv.material3.*
import coil.compose.AsyncImage
import com.hafiz16.kuzen_tv.data.models.AnimeDetail
import com.hafiz16.kuzen_tv.data.models.EpisodeItem
import com.hafiz16.kuzen_tv.data.models.MediaItem
import com.hafiz16.kuzen_tv.data.network.MediaRepository
import com.hafiz16.kuzen_tv.ui.theme.*

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
fun DetailScreen(
    mediaItem: MediaItem,
    onBack: () -> Unit,
    onPlayEpisode: (EpisodeItem, List<EpisodeItem>) -> Unit
) {
    var detail by remember { mutableStateOf<AnimeDetail?>(null) }
    var isLoading by remember { mutableStateOf(true) }

    LaunchedEffect(mediaItem.slug, mediaItem.type) {
        isLoading = true
        detail = when (mediaItem.type) {
            "movie" -> MediaRepository.getMovieDetail(mediaItem.slug)
            "donghua" -> MediaRepository.getDonghuaDetail(mediaItem.slug)
            else -> MediaRepository.getAnimeDetail(mediaItem.slug)
        }
        isLoading = false
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(BackgroundDark)
    ) {
        if (isLoading) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Text(text = "Memuat detail...", color = TextSecondary, fontSize = 15.sp)
            }
        } else {
            val d = detail
            if (d == null) {
                Column(
                    modifier = Modifier.fillMaxSize(),
                    verticalArrangement = Arrangement.Center,
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Text(text = "Gagal memuat detail.", color = TextSecondary, fontSize = 15.sp)
                    Spacer(modifier = Modifier.height(14.dp))
                    Button(
                        onClick = onBack,
                        shape = ButtonDefaults.shape(RoundedCornerShape(8.dp)),
                        border = ButtonDefaults.border(
                            focusedBorder = Border(
                                border = BorderStroke(2.5.dp, FocusBorderColor),
                                shape = RoundedCornerShape(8.dp)
                            )
                        )
                    ) {
                        Text(text = "← Kembali")
                    }
                }
            } else {
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(horizontal = 36.dp, vertical = 24.dp)
                        .verticalScroll(rememberScrollState())
                ) {
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(12.dp),
                        modifier = Modifier.padding(bottom = 18.dp)
                    ) {
                        Button(
                            onClick = onBack,
                            shape = ButtonDefaults.shape(RoundedCornerShape(8.dp)),
                            colors = ButtonDefaults.colors(containerColor = SurfaceCard, focusedContainerColor = SurfaceCardFocused),
                            border = ButtonDefaults.border(
                                focusedBorder = Border(
                                    border = BorderStroke(2.5.dp, FocusBorderColor),
                                    shape = RoundedCornerShape(8.dp)
                                )
                            )
                        ) {
                            Text(text = "← Kembali", color = TextPrimary, fontSize = 13.sp)
                        }

                        if (d.episodes.isNotEmpty()) {
                            val firstEp = d.episodes.first()
                            Button(
                                onClick = { onPlayEpisode(firstEp, d.episodes) },
                                shape = ButtonDefaults.shape(RoundedCornerShape(8.dp)),
                                colors = ButtonDefaults.colors(containerColor = AccentPrimary, focusedContainerColor = AccentPrimary),
                                border = ButtonDefaults.border(
                                    focusedBorder = Border(
                                        border = BorderStroke(3.dp, FocusBorderColor),
                                        shape = RoundedCornerShape(8.dp)
                                    )
                                ),
                                scale = ButtonDefaults.scale(focusedScale = 1.06f)
                            ) {
                                Text(
                                    text = if (mediaItem.type == "movie") "▶ Tonton Film" else "▶ Mulai Menonton",
                                    color = Color.White,
                                    fontSize = 14.sp,
                                    fontWeight = FontWeight.Bold
                                )
                            }
                        }
                    }

                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(bottom = 24.dp)
                    ) {
                        AsyncImage(
                            model = d.thumb.ifBlank { mediaItem.thumb },
                            contentDescription = d.title,
                            contentScale = ContentScale.Crop,
                            modifier = Modifier
                                .width(175.dp)
                                .height(255.dp)
                                .clip(RoundedCornerShape(12.dp))
                                .background(SurfaceCard)
                        )

                        Spacer(modifier = Modifier.width(24.dp))

                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                text = d.title.ifBlank { mediaItem.title },
                                color = TextPrimary,
                                fontSize = 24.sp,
                                fontWeight = FontWeight.Bold,
                                modifier = Modifier.padding(bottom = 8.dp)
                            )

                            Row(
                                horizontalArrangement = Arrangement.spacedBy(12.dp),
                                modifier = Modifier.padding(bottom = 10.dp)
                            ) {
                                if (d.rating.isNotBlank() && d.rating != "N/A") {
                                    Text(
                                        text = "★ ${d.rating}",
                                        color = BadgeRating,
                                        fontSize = 14.sp,
                                        fontWeight = FontWeight.Bold
                                    )
                                }
                                Text(
                                    text = "Status: ${d.status}",
                                    color = TextSecondary,
                                    fontSize = 14.sp
                                )
                            }

                            if (d.genres.isNotEmpty()) {
                                Row(
                                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                                    modifier = Modifier.padding(bottom = 12.dp)
                                ) {
                                    d.genres.take(5).forEach { g ->
                                        Box(
                                            modifier = Modifier
                                                .clip(RoundedCornerShape(6.dp))
                                                .background(SurfaceCard)
                                                .padding(horizontal = 10.dp, vertical = 4.dp)
                                        ) {
                                            Text(text = g, color = TextSecondary, fontSize = 12.sp)
                                        }
                                    }
                                }
                            }

                            Text(
                                text = d.synopsis,
                                color = TextSecondary,
                                fontSize = 13.sp,
                                lineHeight = 19.sp,
                                maxLines = 6
                            )
                        }
                    }

                    Text(
                        text = if (mediaItem.type == "movie") "Stream Tersedia" else "Daftar Episode (${d.episodes.size})",
                        color = TextPrimary,
                        fontSize = 18.sp,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.padding(bottom = 12.dp)
                    )

                    LazyRow(
                        horizontalArrangement = Arrangement.spacedBy(12.dp),
                        contentPadding = PaddingValues(bottom = 16.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        itemsIndexed(d.episodes) { idx, ep ->
                            val epLabel = if (mediaItem.type == "movie") {
                                ep.title
                            } else {
                                MediaRepository.extractEpisodeLabel(ep.title, idx)
                            }
                            Button(
                                onClick = { onPlayEpisode(ep, d.episodes) },
                                shape = ButtonDefaults.shape(RoundedCornerShape(8.dp)),
                                border = ButtonDefaults.border(
                                    focusedBorder = Border(
                                        border = BorderStroke(2.5.dp, FocusBorderColor),
                                        shape = RoundedCornerShape(8.dp)
                                    )
                                ),
                                colors = ButtonDefaults.colors(
                                    containerColor = SurfaceCard,
                                    focusedContainerColor = AccentPrimary
                                ),
                                scale = ButtonDefaults.scale(focusedScale = 1.07f),
                                modifier = Modifier.height(46.dp)
                            ) {
                                Text(
                                    text = epLabel,
                                    color = TextPrimary,
                                    fontSize = 13.sp,
                                    fontWeight = FontWeight.SemiBold
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}
