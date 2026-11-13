# Contributing

Thanks for improving 3D LAB.

## Development setup

1. Install WeChat DevTools 2.02+.
2. Clone the repository and import the root directory as a mini program.
3. Leave `project.config.json` on `touristappid` for commits. For local
   preview/upload, replace it with your own AppID but **do not commit it**.
4. Node.js 18+ is optional and only used by verification scripts.

## Before opening a pull request

```powershell
# Windows
.\tools\verify.cmd
.\tools\smoke.cmd

# Cross-platform
node scripts/verify.mjs
node scripts/smoke.mjs
```

Both must exit 0. If you change the WebGL page, also open it in DevTools and
confirm the canvas renders and the animation runs.

## Code style

- Native WXML / WXSS / JS, no build step and no npm runtime dependencies.
- Use `rpx` for layout; CSS variables live in `app.wxss`.
- Page event handlers must exist on the `Page` object.
- Pure 3D math belongs in `utils/3d.js`, `utils/robot.js`, or
  `utils/humanoid.js` so it can be tested in Node.
- Prefer small, focused commits.

## Adding an experiment

1. Create `pages/<name>/<name>.{js,json,wxml,wxss}`.
2. Register it in `app.json.pages`.
3. Add an entry to `utils/content.js` `DEMOS`.
4. Add a page-level smoke test in `scripts/lib/smoke.mjs` where possible.
5. Run verification and include a screenshot in `docs/screenshots/`.

## Assets and licenses

- New 3D assets must have a clear license compatible with MIT/CC0-style
  redistribution.
- Update `lib/LICENSES.md` and `docs/ASSETS.md` with source, author, license,
  and SHA-256.
- Do not add CDN URLs or runtime downloads.

## Security

Do not commit real AppIDs, tokens, upload keys, private keys, or `.env` files.
See [SECURITY.md](SECURITY.md).
