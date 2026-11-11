/**
 * Quetta Media Hijacking Injected Script Generator (Legacy Wrapper)
 * Re-exports buildAnimeInjectedScript for backwards compatibility.
 */
import { buildAnimeInjectedScript, AnimeScriptOptions } from './animeInjectedScript';

export type QuettaScriptOptions = AnimeScriptOptions;
export const buildQuettaInjectedScript = buildAnimeInjectedScript;
