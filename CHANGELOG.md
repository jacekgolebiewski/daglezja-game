# Changelog

All notable changes to Daglezja are documented here.

## [v0.4.1] - 2026-04-05
- Fix NPC encounter bridging platform always rendering as grass regardless of current biome

## [v0.4.0] - 2026-04-05
- Introduce changelog file and version history panel in Settings
- Add script to generate changelog data from markdown source

## [v0.3.1] - 2026-04-05
- Redesign platforms with 5 seamless kinds and per-kind decorations
- Platform kinds now vary between 6–11 per biome run
- Explicit Save button at bottom of character editor
- Fix Firebase init crash on settings load

## [v0.3.0] - 2026-04-05
- YouTube music playback during gameplay
- Redesign settings page with modern iOS-style UX

## [v0.2.0] - 2026-04-05
- Jump immediately on landing if jump is still held
- Pause button, home button and back navigation in-game
- Better settings icon
- Show version date alongside version on game cover
- NPC only triggers when it has configured interactions
- NPC follows player's exact path instead of mirroring Y instantly
- Redesign NPC as shadow-player that approaches, follows, then leaves

## [v0.1.0] - 2026-03-30
- Per-character interaction CRUD in settings, used in-game
- Balance difficulty: NPC-driven speed, easier split paths
- Rebrand cover screen to Daglezja garden centre identity
- Increase NPC encounter frequency
- Character management: custom images per mood, Firebase sync
- Settings page as full-screen HTML overlay with light theme
- Add jump buffer — tap just before landing queues the jump
- Gameplay sliders and modular file split

## [v0.0.x] - 2026-03-29
- Initial prototype: runner game with NPC dialogue and choice paths
- NPC question spawns two coloured paths; player answers by running one
- Pause menu and settings screen with version display
- Character select with mood images and colour themes
- Firebase Storage integration for cloud character sync
