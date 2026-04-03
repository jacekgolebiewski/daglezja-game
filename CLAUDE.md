# Claude Instructions

## After finishing a task

1. Update the version and date in `js/shared.js`:
   - Bump `VERSION` following semver (patch for fixes, minor for features, major for reworks)
   - Set `VERSION_DATE` to today's date (`YYYY-MM-DD`)
2. Commit and push your changes to the current branch.
3. Deploy by merging to `gh-pages`:

```bash
git checkout gh-pages
git merge <your-branch>
git push origin gh-pages
git checkout <your-branch>
```
