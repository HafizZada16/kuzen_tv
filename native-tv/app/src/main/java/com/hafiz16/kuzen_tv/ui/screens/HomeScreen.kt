package com.hafiz16.kuzen_tv.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.tv.material3.ExperimentalTvMaterial3Api
import androidx.tv.material3.Text
import com.hafiz16.kuzen_tv.data.models.MediaItem
import com.hafiz16.kuzen_tv.data.network.MediaRepository
import com.hafiz16.kuzen_tv.ui.components.TVMediaCard
import com.hafiz16.kuzen_tv.ui.theme.*
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope

private data class MediaSection(
    val title: String,
    val items: List<MediaItem>
)

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
fun HomeScreen(
    onItemSelected: (MediaItem) -> Unit
) {
    var sections by remember { mutableStateOf<List<MediaSection>>(emptyList()) }
    var isLoading by remember { mutableStateOf(true) }

    LaunchedEffect(Unit) {
        isLoading = true
        coroutineScope {
            val popMoviesDef = async { MediaRepository.getDiscoverMovies(1, "", "popularity.desc") }
            val animeDef = async { MediaRepository.getOngoingAnime(1) }
            val actionMoviesDef = async { MediaRepository.getDiscoverMovies(1, "28", "popularity.desc") }
            val popDonghuaDef = async { MediaRepository.getPopularDonghua(1) }
            val onDonghuaDef = async { MediaRepository.getOngoingDonghua(1) }

            val built = listOf(
                MediaSection("Film Bioskop Populer", popMoviesDef.await()),
                MediaSection("Anime Terbaru", animeDef.await()),
                MediaSection("Film Aksi Pilihan", actionMoviesDef.await()),
                MediaSection("Donghua Populer", popDonghuaDef.await()),
                MediaSection("Donghua Terbaru", onDonghuaDef.await())
            ).filter { it.items.isNotEmpty() }

            sections = built
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
                Text(
                    text = "Memuat Katalog Rekomendasi...",
                    color = TextSecondary,
                    fontSize = 15.sp
                )
            }
        } else if (sections.isEmpty()) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Text(
                    text = "Tidak ada konten yang berhasil dimuat.",
                    color = TextSecondary,
                    fontSize = 15.sp
                )
            }
        } else {
            LazyColumn(
                contentPadding = PaddingValues(top = 20.dp, bottom = 36.dp),
                verticalArrangement = Arrangement.spacedBy(22.dp),
                modifier = Modifier.fillMaxSize()
            ) {
                items(sections, key = { it.title }) { section ->
                    Column(modifier = Modifier.fillMaxWidth()) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier.padding(horizontal = 28.dp, vertical = 8.dp)
                        ) {
                            Box(
                                modifier = Modifier
                                    .width(4.dp)
                                    .height(18.dp)
                                    .clip(RoundedCornerShape(2.dp))
                                    .background(AccentPrimary)
                            )
                            Spacer(modifier = Modifier.width(10.dp))
                            Text(
                                text = section.title,
                                color = TextPrimary,
                                fontSize = 18.sp,
                                fontWeight = FontWeight.Bold
                            )
                        }

                        LazyRow(
                            contentPadding = PaddingValues(horizontal = 28.dp, vertical = 6.dp),
                            horizontalArrangement = Arrangement.spacedBy(14.dp),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            items(section.items, key = { "${section.title}-${it.type}-${it.slug}" }) { item ->
                                TVMediaCard(
                                    item = item,
                                    onClick = { onItemSelected(item) }
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}
