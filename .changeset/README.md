# Changesets

Hello! This directory holds changesets that drive the release flow.

To add a new changeset, run:

```bash
pnpm changeset
```

Pick the packages you're updating, choose `patch | minor | major`, and write a short summary. Commit the generated `.md` file along with your code change.

On merge to `main`, the release workflow opens a "Version Packages" PR. Merging that PR publishes the updated packages to npm.

Full docs: https://github.com/changesets/changesets
