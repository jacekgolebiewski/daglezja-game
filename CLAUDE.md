# Claude Instructions

## After finishing a task

1. Commit and push your changes to the current branch.
2. Deploy by merging to `gh-pages`:

```bash
git checkout gh-pages
git merge <your-branch>
git push origin gh-pages
git checkout <your-branch>
```
