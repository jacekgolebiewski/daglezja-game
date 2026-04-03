# daglezja-game

A browser-based endless runner with NPC dialogue encounters.
Playable at: https://jacekgolebiewski.github.io/daglezja-game/

## Release

**Merging to `gh-pages` branch triggers a release** — the game is served directly from that branch via GitHub Pages.

```bash
git checkout gh-pages
git merge <your-branch>
git push origin gh-pages
```

Bump the version in `js/shared.js` before releasing. Use [semver](https://semver.org/) loosely:
- patch (`v0.0.x`) — tweaks, fixes
- minor (`v0.x.0`) — new mechanics
- major (`vx.0.0`) — full reworks

## Controls

| Action | Input |
|---|---|
| Jump | Tap / Space / W / ↑ |
| Float | Hold while ascending |

## Mechanics

- NPC encounter every ~450 blocks — two coloured paths, run one to answer
- Speed ramps +30 px/s every 5 s, capped at 850 px/s
- Safe flat start (1 screen)
