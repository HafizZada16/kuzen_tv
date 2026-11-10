# KUZEN TV DEVELOPMENT RULES

Please refer to [AGENTS.md](./AGENTS.md) for the complete list of rules.

## Core Rules Summary
1. **MANUAL APK BUILD BY USER (STRICT)**:
   - The AI assistant MUST NEVER execute `./gradlew assembleRelease`, `./gradlew assembleDebug`, `gradlew build`, `eas build`, or any APK/AAB build commands.
   - Building the APK is strictly done by the user. The AI only verifies with `npx tsc --noEmit` and gives the command for the user to run.
2. **NO AI GIT COMMIT / PUSH**:
   - The AI assistant MUST NEVER execute git commit, git push, or git reset. User commits manually.
3. **MANDATORY NATIVE EDIT TOOLS**:
   - Always use `edit_file` / `write_file` directly.
4. **ANDROID TV FOCUS INTEGRITY**:
   - Keep drawer unmounted when closed (`{isDrawerOpen && <Drawer>}`).
   - Maintain crisp `#FFFFFF` TV outlines and 100% remote D-pad navigability.

