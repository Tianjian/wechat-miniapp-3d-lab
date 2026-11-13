# Security Policy

## Supported versions

The latest `main` branch is supported with security fixes.

## Reporting a vulnerability

Please **do not** open a public issue for security problems. Use GitHub's private
vulnerability reporting:

<https://github.com/Tianjian/wechat-miniapp-3d-lab/security/advisories/new>

Please include:

- affected page / file and version or commit;
- reproduction steps;
- expected vs actual behavior;
- impact assessment.

## Secrets

This repository intentionally contains **no** real WeChat AppID, upload key,
private key, GitHub token, or `.env` file:

- `project.config.json` uses `touristappid` as a placeholder;
- `project.private.config.json` and environment files are gitignored;
- LLM / CI / publishing tokens are never stored in the repository.

If you believe a secret has been committed, please report it privately and
rotate the credential immediately.

## Scope

In scope: source code, build/verification scripts, vendored libraries, and the
GLB asset packaging in this repository.

Out of scope: the WeChat client itself, WeChat DevTools, and upstream
three.js / threejs-miniprogram vulnerabilities that are not exploitable in this
project. Please report those upstream first.

## Third-party assets

- Three.js / threejs-miniprogram / GLTFLoader: MIT.
- RobotExpressive: CC0 1.0.

See [`lib/LICENSES.md`](lib/LICENSES.md) for details.
