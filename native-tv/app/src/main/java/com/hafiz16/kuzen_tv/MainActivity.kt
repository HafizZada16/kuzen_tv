package com.hafiz16.kuzen_tv

import android.os.Bundle
import android.view.KeyEvent
import androidx.activity.ComponentActivity
import androidx.activity.compose.BackHandler
import androidx.activity.compose.setContent
import androidx.compose.animation.Crossfade
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.tv.material3.*
import com.hafiz16.kuzen_tv.data.models.EpisodeItem
import com.hafiz16.kuzen_tv.data.models.MediaItem
import com.hafiz16.kuzen_tv.player.TVNativePlayerScreen
import com.hafiz16.kuzen_tv.ui.screens.CatalogScreen
import com.hafiz16.kuzen_tv.ui.screens.DetailScreen
import com.hafiz16.kuzen_tv.ui.screens.HomeScreen
import com.hafiz16.kuzen_tv.ui.theme.*

sealed class AppDestination {
    object Home : AppDestination()
    data class Detail(val item: MediaItem) : AppDestination()
    data class Player(
        val mediaItem: MediaItem,
        val episode: EpisodeItem,
        val episodes: List<EpisodeItem>
    ) : AppDestination()
}

private data class NavTab(val id: String, val label: String)

private val SIDEBAR_TABS = listOf(
    NavTab("Home", "Beranda"),
    NavTab("Movie", "Film Bioskop"),
    NavTab("Anime", "Anime"),
    NavTab("Donghua", "Donghua"),
    NavTab("Search", "Pencarian")
)

class MainActivity : ComponentActivity() {
    var activePlayerKeyHandler: ((Int) -> Boolean)? = null

    @OptIn(ExperimentalTvMaterial3Api::class)
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            MaterialTheme {
                KuzenTvNavigationApp(
                    onRegisterPlayerKeyHandler = { handler ->
                        activePlayerKeyHandler = handler
                    }
                )
            }
        }
    }

    override fun dispatchKeyEvent(event: KeyEvent): Boolean {
        if (event.action == KeyEvent.ACTION_DOWN) {
            val handler = activePlayerKeyHandler
            if (handler != null && handler(event.keyCode)) {
                return true
            }
        }
        return super.dispatchKeyEvent(event)
    }
}

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
fun KuzenTvNavigationApp(
    onRegisterPlayerKeyHandler: (((Int) -> Boolean)?) -> Unit
) {
    var destination by remember { mutableStateOf<AppDestination>(AppDestination.Home) }
    var selectedTab by remember { mutableStateOf("Home") }

    Crossfade(targetState = destination, label = "ScreenTransition") { target ->
        when (target) {
            is AppDestination.Home -> {
                Row(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(BackgroundDark)
                ) {
                    // Kuzen TV Sidebar
                    Column(
                        modifier = Modifier
                            .width(176.dp)
                            .fillMaxHeight()
                            .background(SurfaceDark)
                            .padding(horizontal = 14.dp, vertical = 20.dp),
                        verticalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        Text(
                            text = "KUZEN TV",
                            color = AccentPrimary,
                            fontSize = 18.sp,
                            fontWeight = FontWeight.ExtraBold,
                            modifier = Modifier.padding(start = 6.dp, bottom = 14.dp)
                        )

                        SIDEBAR_TABS.forEach { tab ->
                            val isActive = selectedTab == tab.id
                            Button(
                                onClick = { selectedTab = tab.id },
                                shape = ButtonDefaults.shape(RoundedCornerShape(8.dp)),
                                border = ButtonDefaults.border(
                                    focusedBorder = Border(
                                        border = BorderStroke(2.5.dp, FocusBorderColor),
                                        shape = RoundedCornerShape(8.dp)
                                    )
                                ),
                                colors = ButtonDefaults.colors(
                                    containerColor = if (isActive) AccentPrimary else Color.Transparent,
                                    focusedContainerColor = AccentPrimary
                                ),
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(44.dp)
                            ) {
                                Text(
                                    text = tab.label,
                                    color = if (isActive) Color.White else TextSecondary,
                                    fontSize = 14.sp,
                                    fontWeight = if (isActive) FontWeight.Bold else FontWeight.Medium
                                )
                            }
                        }
                    }

                    // Main Content Area
                    Box(modifier = Modifier.weight(1f)) {
                        if (selectedTab == "Home") {
                            HomeScreen(
                                onItemSelected = { item ->
                                    destination = AppDestination.Detail(item)
                                }
                            )
                        } else {
                            CatalogScreen(
                                category = selectedTab,
                                onItemSelected = { item ->
                                    destination = AppDestination.Detail(item)
                                }
                            )
                        }
                    }
                }
            }

            is AppDestination.Detail -> {
                BackHandler {
                    destination = AppDestination.Home
                }
                DetailScreen(
                    mediaItem = target.item,
                    onBack = { destination = AppDestination.Home },
                    onPlayEpisode = { ep, eps ->
                        destination = AppDestination.Player(target.item, ep, eps)
                    }
                )
            }

            is AppDestination.Player -> {
                TVNativePlayerScreen(
                    mediaItem = target.mediaItem,
                    initialEpisode = target.episode,
                    initialEpisodes = target.episodes,
                    onRegisterKeyHandler = onRegisterPlayerKeyHandler,
                    onClose = {
                        destination = AppDestination.Detail(target.mediaItem)
                    }
                )
            }
        }
    }
}
