---
name: vercel-npm-lockfile
description: Enforces npm-only dependency management for Vercel deploys. Use when editing package.json, adding or removing dependencies, fixing CI/Vercel install errors (ERR_PNPM_OUTDATED_LOCKFILE, frozen-lockfile), or when creating alternate lockfiles.
---

# Vercel + npm lockfile

This repo deploys on **Vercel with npm only**. Mixed lockfiles break production builds.

## Rules

1. **Package manager:** `npm` only (`packageManager` in `package.json` is `npm@10.9.2`).
2. **Never commit** `pnpm-lock.yaml` or `yarn.lock`. They are gitignored; if one appears locally, delete it.
3. **Always commit together:** `package.json` + `package-lock.json` in the same commit when dependencies change.
4. **After any `package.json` change:** run `npm install` at the repo root, then verify with `npm ci` (simulates Vercel).
5. **Do not** run `pnpm install` or `yarn` in this project.

## Vercel behavior

- `vercel.json` sets `"installCommand": "npm ci"`.
- If `pnpm-lock.yaml` exists in the deployed commit, Vercel may still prefer pnpm and fail with `ERR_PNPM_OUTDATED_LOCKFILE` when it is out of sync with `package.json`.

## Checklist before pushing dependency changes

```
- [ ] Only package-lock.json exists (no pnpm/yarn lockfile)
- [ ] npm install was run after editing package.json
- [ ] npm ci succeeds locally
- [ ] package.json and package-lock.json are both staged
```

## Fix when Vercel shows pnpm errors

1. Confirm the deployed commit is not an old revision that still contains `pnpm-lock.yaml`.
2. Delete `pnpm-lock.yaml` if present locally.
3. Run `npm install` and commit `package-lock.json`.
4. Redeploy from the latest `main` commit.
