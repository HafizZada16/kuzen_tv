# R8 / ProGuard Optimization Rules for Kuzen TV (< 4MB)

# Keep Compose TV components, data models, and WebView JS bridge
-keepattributes *Annotation*,JavascriptInterface
-keep class com.hafiz16.kuzen_tv.** { *; }
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Jsoup
-keep public class org.jsoup.** { public *; }

# OkHttp
-dontwarn okhttp3.**
-dontwarn okio.**
-dontwarn javax.annotation.**
-dontwarn org.conscrypt.**

# Strip debug and line numbers in release
-repackageclasses
-allowaccessmodification
