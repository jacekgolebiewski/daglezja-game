# daglezja-game (Block Runner)

A browser-based endless runner with NPC dialogue encounters.
Playable at: https://jacekgolebiewski.github.io/daglezja-game/

## Version

Current version: **v0.1.1**

The version is defined at the top of `index.html`:

```js
const VERSION = 'v0.1.1';
```

**Update `VERSION` with every change before committing.**
Use [semver](https://semver.org/) loosely:
- patch (`v0.0.x`) — tweaks, balance, bug fixes
- minor (`v0.x.0`) — new mechanics or features
- major (`vx.0.0`) — full reworks

## Deployment

The game is a single `index.html` file served via GitHub Pages from the `gh-pages` branch.

After merging changes, update `gh-pages`:

```bash
git checkout gh-pages
git merge <your-branch>
git push origin gh-pages
git checkout <your-branch>
```

## Game mechanics

| Thing | Detail |
|---|---|
| Jump | Tap / Space / W / ↑ |
| Float | Hold while ascending |
| NPC encounter | Every ~450 blocks; two coloured platform paths appear — run one to answer |
| Speed ramp | +30 px/s every 5 s, capped at 850 px/s |
| Safe start | 1 screen of flat ground |
