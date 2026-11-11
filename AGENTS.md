# KUZEN TV DEVELOPMENT RULES

## 1. MANUAL APK BUILD BY USER (STRICT)
- **The AI assistant MUST NEVER execute `./gradlew assembleRelease`, `./gradlew assembleDebug`, `gradlew build`, `eas build`, or any commands that compile/assemble the APK/AAB.**
- Building and packaging the APK is **STRICTLY RESERVED FOR THE USER** to run manually.
- When code modifications or fixes are completed, the AI should only verify compilation integrity using `npx tsc --noEmit`.
- After verification, the AI must inform the user and provide the exact command for the user to run if they wish to build the APK (e.g., `cd android && ./gradlew assembleRelease`).

## 2. NO AI GIT COMMIT / PUSH (STRICT)
- The AI assistant MUST NEVER execute `git commit`, `git push`, `git reset`, or any commands that commit changes to version control.
- The user will always review and commit code changes manually.
- The AI is only permitted to suggest concise commit messages and run read-only inspection commands (e.g. `git status`, `git diff`).

## 3. MANDATORY NATIVE EDIT TOOLS FOR USER REVIEW
- The AI assistant MUST ALWAYS use the native `edit_file` or `write_file` tools directly when modifying codebase files.
- The AI MUST NEVER use scripts (Node.js `fs`, PowerShell, bash commands, etc.) to apply changes to project files behind the scenes. This ensures that the Antigravity IDE will always render interactive diff cards in the chat, allowing the user to review side-by-side changes and accept or reject them manually.

## 4. ANDROID TV REMOTE D-PAD & UI RULES (1080p ANTISLOP)
- **100% Remote D-Pad Navigability**: Every interactive element MUST be focusable via TV remote arrow keys (`Pressable focusable={true}`).
- **Crisp High-Contrast Outline**: Focused elements must display a distinct white border (`borderColor: '#FFFFFF'`, `borderWidth: 2.5` - `3.5`) and scale effect (e.g., `scale: 1.05` - `1.1`) so the cursor position on the TV is immediately obvious.
- **Hardware Remote Key Interception**: All TV remote hardware keys (`DPAD_UP`, `DPAD_DOWN`, `DPAD_LEFT`, `DPAD_RIGHT`, `DPAD_CENTER`, `ENTER`, `MEDIA_PLAY_PAUSE`, etc.) are intercepted at the root Activity in `MainActivity.kt` and dispatched via `DeviceEventEmitter` to ensure zero dropped keys.
- **No Off-Screen Focus Trapping**: Modals, drawers, and overlay panels (such as episode & server drawers) MUST ONLY BE MOUNTED when open (`{isOpen && <Component />}`). They must NEVER remain mounted off-screen with `focusable={true}` children, as this traps Android TV's native focus engine and causes ghost clicks.
- **WebView Isolation**: Streaming `<WebView>` elements must always be rendered with `focusable={false}` and wrapped in a container with `pointerEvents="none"` so that the web page never steals remote key events from the native Android TV OSD.
- **Clean Label Formatting**: Episode buttons and badges must strictly follow concise antislop labels (e.g., `"Episode 5"` via `extractEpisodeNumber`), never raw redundant titles like `"Episode 05 Subtitle Indonesia"`.

## 5. STRICT SCOPE INTEGRITY (ONLY MODIFY REQUESTED FILES)
- **Strictly Confine File Modifications**: The AI assistant MUST ONLY modify the specific file(s), component(s), or feature(s) explicitly requested by the user.
- **No Unsolicited / Proactive Edits**: The AI MUST NEVER proactively edit, refactor, or "fix" other sister files, unmentioned modules, or unrelated scripts (e.g., modifying Donghua/Movie scripts when only Anime was requested) without explicit user instructions.
- **Propose First for External Files**: If the AI discovers bugs, inconsistencies, or potential improvements in files outside the requested scope, it MUST explain the finding in chat and ask for the user's consent before touching those files.

