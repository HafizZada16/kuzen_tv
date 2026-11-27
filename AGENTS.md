# KUZEN TV DEVELOPMENT RULES

## 1. MANUAL APK BUILD BY USER (STRICT)
- **The AI assistant MUST NEVER execute `./gradlew assembleRelease`, `./gradlew assembleDebug`, `gradlew build`, `eas build`, or any commands that compile/assemble the APK/AAB.**
- Building and packaging the APK is **STRICTLY RESERVED FOR THE USER** to run manually.
- When code modifications or fixes are completed, the AI should only verify compilation integrity using `npx tsc --noEmit` (for React Native) and never assemble an APK.
- After verification, the AI must inform the user and provide the exact command for the user to run if they wish to build the APK (e.g., `cd native-tv && .\gradlew.bat assembleRelease` for Native Kotlin, or `cd android && ./gradlew assembleRelease` for React Native).

## 2. NO AI GIT COMMIT / PUSH (STRICT)
- The AI assistant MUST NEVER execute `git commit`, `git push`, `git reset`, or any commands that commit changes to version control.
- The user will always review and commit code changes manually.
- The AI is only permitted to suggest concise commit messages and run read-only inspection commands (e.g. `git status`, `git diff`).

## 3. MANDATORY NATIVE EDIT TOOLS FOR USER REVIEW
- The AI assistant MUST ALWAYS use the native `edit_file` or `write_file` tools directly when modifying codebase files.
- The AI MUST NEVER use scripts (Node.js `fs`, PowerShell, bash commands, etc.) to apply changes to project files behind the scenes. This ensures that the Antigravity IDE will always render interactive diff cards in the chat, allowing the user to review side-by-side changes and accept or reject them manually.

## 4. ANDROID TV REMOTE D-PAD & UI RULES (1080p ANTISLOP)
- **100% Remote D-Pad Navigability**: Every interactive element MUST be focusable via TV remote arrow keys (`androidx.tv.material3` focusable components in `native-tv/`, `Pressable focusable={true}` in RN).
- **Crisp High-Contrast Outline**: Focused elements must display a distinct white border (`#FFFFFF`, `2.0` - `3.5dp`) and subtle scale effect (`1.05` - `1.08`) so the cursor position on the TV is immediately obvious.
- **Hardware Remote Key Interception**: All TV remote hardware keys (`DPAD_UP`, `DPAD_DOWN`, `DPAD_LEFT`, `DPAD_RIGHT`, `DPAD_CENTER`, `ENTER`, `MEDIA_PLAY_PAUSE`, `BACK`) are intercepted at the root Activity in `MainActivity.kt` (`dispatchKeyEvent` in `native-tv/`, `DeviceEventEmitter` in RN) to ensure zero dropped keys.
- **No Off-Screen Focus Trapping**: Modals, drawers, and right-side overlay panels MUST ONLY BE MOUNTED when open (`if (isDrawerOpen)` / `{isOpen && <Component />}`). They must NEVER remain mounted off-screen with focusable children, as this traps Android TV's native focus engine and causes ghost clicks.
- **WebView Isolation & Server Switch Safety**: Streaming `<WebView>` elements must always be non-focusable (`isFocusable = false` + `FOCUS_BLOCK_DESCENDANTS` in `native-tv/`, `focusable={false}` + `pointerEvents="none"` in RN) so the web page never steals remote keys. In Compose (`native-tv/`), key the `AndroidView` by `(streamUrl, isDirectHls)` and use `onRelease` (never `DisposableEffect` referencing a shared `webViewRef`) to destroy the exact old `WebView` without killing the new one.
- **Clean Label Formatting**: Episode buttons and badges must strictly follow concise antislop labels (e.g., `"Episode 5"` via `MediaRepository.extractEpisodeLabel` in `native-tv/` or `extractEpisodeNumber` in RN), never raw redundant titles like `"Episode 05 Subtitle Indonesia"`.
- **Focus Scale Safe Padding (No Viewport Clipping)**:
  - Any `LazyRow`, `LazyColumn`, `LazyVerticalGrid`, or `ScrollView` holding focusable cards or buttons with `focusedScale > 1.0` MUST reserve at least `12.dp` horizontal and vertical `contentPadding` inside the scrollable viewport (never `0.dp`).
  - In Jetpack Compose, `Modifier.verticalScroll(...)` / `Modifier.horizontalScroll(...)` MUST ALWAYS be placed **BEFORE** `.padding(...)` (never `.padding(...).verticalScroll(...)`), so padding sits inside the scroll clip and top/edge focused buttons are never clipped.

## 5. STRICT SCOPE INTEGRITY (ONLY MODIFY REQUESTED FILES)
- **Strictly Confine File Modifications**: The AI assistant MUST ONLY modify the specific file(s), component(s), or feature(s) explicitly requested by the user. Keep `native-tv/` (Native Kotlin) and `src/`/`android/` (React Native) strictly isolated unless the user asks to modify both.
- **No Unsolicited / Proactive Edits**: The AI MUST NEVER proactively edit, refactor, or "fix" other sister files, unmentioned modules, or unrelated scripts (e.g., modifying Donghua/Movie scripts when only Anime was requested) without explicit user instructions.
- **Propose First for External Files**: If the AI discovers bugs, inconsistencies, or potential improvements in files outside the requested scope, it MUST explain the finding in chat and ask for the user's consent before touching those files.

