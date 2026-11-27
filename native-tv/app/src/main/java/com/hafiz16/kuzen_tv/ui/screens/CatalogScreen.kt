package com.hafiz16.kuzen_tv.ui.screens

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.tv.material3.*
import com.hafiz16.kuzen_tv.data.models.MediaItem
import com.hafiz16.kuzen_tv.data.network.MediaRepository
import com.hafiz16.kuzen_tv.ui.components.TVMediaCard
import com.hafiz16.kuzen_tv.ui.theme.*
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.launch

private data class FilterChip(val label: String, val key: String)

private val ANIME_FILTERS = listOf(
    FilterChip("Ongoing", "ongoing"),
    FilterChip("Completed", "complete")
)

private val DONGHUA_FILTERS = listOf(
    FilterChip("Populer", "popular"),
    FilterChip("Ongoing", "ongoing"),
    FilterChip("Completed", "completed")
)

private val MOVIE_FILTERS = listOf(
    FilterChip("Populer", ""),
    FilterChip("Action", "28"),
    FilterChip("Adventure", "12"),
    FilterChip("Animasi", "16"),
    FilterChip("Komedi", "35"),
    FilterChip("Horor", "27"),
    FilterChip("Sci-Fi", "878"),
    FilterChip("Thriller", "53")
)

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
fun CatalogScreen(
    category: String, // "Anime", "Donghua", "Movie", "Search"
    onItemSelected: (MediaItem) -> Unit
) {
    var items by remember(category) { mutableStateOf<List<MediaItem>>(emptyList()) }
    var isLoading by remember(category) { mutableStateOf(category != "Search") }
    var searchQuery by remember { mutableStateOf("") }
    var activeFilter by remember(category) {
        mutableStateOf(
            when (category) {
                "Donghua" -> "popular"
                "Movie" -> ""
                else -> "ongoing"
            }
        )
    }
    val scope = rememberCoroutineScope()

    suspend fun loadCatalog() {
        isLoading = true
        items = when (category) {
            "Donghua" -> when (activeFilter) {
                "ongoing" -> MediaRepository.getOngoingDonghua()
                "completed" -> MediaRepository.getCompletedDonghua()
                else -> MediaRepository.getPopularDonghua()
            }
            "Movie" -> MediaRepository.getDiscoverMovies(page = 1, genre = activeFilter)
            "Search" -> {
                if (searchQuery.isBlank()) emptyList()
                else coroutineScope {
                    val m = async { MediaRepository.searchMovies(searchQuery) }
                    val a = async { MediaRepository.searchAnime(searchQuery) }
                    val d = async { MediaRepository.searchDonghua(searchQuery) }
                    m.await() + a.await() + d.await()
                }
            }
            else -> when (activeFilter) {
                "complete" -> MediaRepository.getCompletedAnime()
                else -> MediaRepository.getOngoingAnime()
            }
        }
        isLoading = false
    }

    LaunchedEffect(category, activeFilter) {
        if (category != "Search") {
            loadCatalog()
        } else {
            isLoading = false
        }
    }

    val headerTitle = when (category) {
        "Donghua" -> "Katalog Donghua"
        "Movie" -> "Film Bioskop"
        "Search" -> "Pencarian Global"
        else -> "Katalog Anime"
    }

    val filters = when (category) {
        "Donghua" -> DONGHUA_FILTERS
        "Movie" -> MOVIE_FILTERS
        "Anime" -> ANIME_FILTERS
        else -> emptyList()
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(BackgroundDark)
            .padding(horizontal = 28.dp, vertical = 20.dp)
    ) {
        Text(
            text = headerTitle,
            color = TextPrimary,
            fontSize = 22.sp,
            fontWeight = FontWeight.Bold,
            modifier = Modifier.padding(bottom = 12.dp)
        )

        if (category == "Search") {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(bottom = 16.dp)
            ) {
                Box(
                    contentAlignment = Alignment.CenterStart,
                    modifier = Modifier
                        .weight(1f)
                        .height(46.dp)
                        .background(SurfaceCard, RoundedCornerShape(8.dp))
                        .border(1.5.dp, BorderMuted, RoundedCornerShape(8.dp))
                        .padding(horizontal = 14.dp)
                ) {
                    if (searchQuery.isEmpty()) {
                        Text(
                            text = "Cari judul film, anime, atau donghua...",
                            color = TextSecondary,
                            fontSize = 14.sp
                        )
                    }
                    BasicTextField(
                        value = searchQuery,
                        onValueChange = { searchQuery = it },
                        singleLine = true,
                        textStyle = TextStyle(color = TextPrimary, fontSize = 14.sp),
                        cursorBrush = SolidColor(AccentPrimary),
                        keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search),
                        keyboardActions = KeyboardActions(onSearch = { scope.launch { loadCatalog() } }),
                        modifier = Modifier.fillMaxWidth()
                    )
                }

                Button(
                    onClick = { scope.launch { loadCatalog() } },
                    shape = ButtonDefaults.shape(RoundedCornerShape(8.dp)),
                    colors = ButtonDefaults.colors(
                        containerColor = AccentPrimary,
                        focusedContainerColor = AccentPrimary
                    ),
                    border = ButtonDefaults.border(
                        focusedBorder = Border(
                            border = BorderStroke(2.5.dp, FocusBorderColor),
                            shape = RoundedCornerShape(8.dp)
                        )
                    ),
                    modifier = Modifier.height(46.dp)
                ) {
                    Text(text = "Cari", color = Color.White, fontWeight = FontWeight.Bold)
                }
            }
        } else if (filters.isNotEmpty()) {
            LazyRow(
                horizontalArrangement = Arrangement.spacedBy(10.dp),
                modifier = Modifier.padding(bottom = 16.dp)
            ) {
                items(filters) { f ->
                    val isSelected = activeFilter == f.key
                    Button(
                        onClick = { activeFilter = f.key },
                        shape = ButtonDefaults.shape(RoundedCornerShape(8.dp)),
                        colors = ButtonDefaults.colors(
                            containerColor = if (isSelected) AccentPrimary else SurfaceCard,
                            focusedContainerColor = AccentPrimary
                        ),
                        border = ButtonDefaults.border(
                            focusedBorder = Border(
                                border = BorderStroke(2.5.dp, FocusBorderColor),
                                shape = RoundedCornerShape(8.dp)
                            )
                        ),
                        modifier = Modifier.height(38.dp)
                    ) {
                        Text(
                            text = f.label,
                            color = TextPrimary,
                            fontSize = 13.sp,
                            fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium
                        )
                    }
                }
            }
        }

        if (isLoading) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Text(text = "Memuat katalog...", color = TextSecondary, fontSize = 15.sp)
            }
        } else if (items.isEmpty()) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Text(
                    text = if (category == "Search") "Masukkan kata kunci untuk mencari." else "Data tidak ditemukan.",
                    color = TextSecondary,
                    fontSize = 15.sp
                )
            }
        } else {
            LazyVerticalGrid(
                columns = GridCells.Adaptive(minSize = 150.dp),
                contentPadding = PaddingValues(bottom = 32.dp),
                horizontalArrangement = Arrangement.spacedBy(14.dp),
                verticalArrangement = Arrangement.spacedBy(14.dp),
                modifier = Modifier.fillMaxSize()
            ) {
                items(items, key = { "${it.type}-${it.slug}-${it.title}" }) { item ->
                    TVMediaCard(
                        item = item,
                        onClick = { onItemSelected(item) }
                    )
                }
            }
        }
    }
}
