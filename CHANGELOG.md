# Changelog

## [1.0.0] - 2026-11-13

Initial public release.

### Experiments

- CSS 3D rotating cube with drag inertia and face details
- Holographic tilt card with glare tracking and two-sided flip
- 3D coverflow carousel with circular selection
- Parallax starfield with pinch zoom and device-motion fallback
- Four-axis robotic arm with draggable joints, presets, gripper, and
  forward-kinematics telemetry
- WebGL humanoid robot with a CC0 GLB asset, 43 bones, 14 clips, walking
  animation, orbit camera, and 60 FPS rendering

### Engineering

- Native WeChat mini program, no build step and no npm install
- Vendored three.js r108 mini-program adapter and GLTFLoader
- GLB inlined as base64 to avoid network/domain configuration
- Static checks + mock smoke + GLB integrity checks (`verify`)
- GitHub Actions verification workflow
- Public documentation: architecture, assets, verification, security, and
  contribution guide

### Security

- No real WeChat AppID or publishing credentials are committed
- `project.config.json` uses `touristappid` placeholder
