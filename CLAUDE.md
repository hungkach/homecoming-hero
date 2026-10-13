# Homecoming Hero: working notes for Claude

First-person running back fitness game played with your body in front of a phone or tablet camera. Mark (the owner) prototypes from his phone and plays at https://hungkach.github.io/homecoming-hero/ (GitHub Pages from `main`). Read README.md for controls, camera setups, and the startup sequence.

## Rules

- Everything the game needs lives in `index.html`. No build step, no extra runtime files. Scripts load only from CDNs.
- The shared tracking code is the `body core v0.2` `<script>` block, between its start and end markers. Keep it free of game globals so it can be copied into other games (Stomp City, Downhill, a wrestling game, a vigilante game). If you change the core, bump the version in both markers and in `VERSION`.
- Touch play must keep working in every build. It's how Mark tests on his phone, and it must behave the same unless a change is meant for touch.
- One commit per feature, pushed to `main`. Pages redeploys in a minute or two, and Mark refreshes the link.
- Writing in the UI, commits, and replies: sentence case, no em dashes, no all caps for emphasis.
- Play is audio-first and glanceable: big shapes, color flashes, spoken calls. No reading text mid-play.
- Phone or tablet only. A TV is a bonus, never required, and no accessories.

## Body core conventions

- MediaPipe Pose Landmarker lite, capped at 30 fps.
- Body heights (hip drop, knee rise) come from image landmarks, in torso lengths. Angles and arm heights come from world landmarks, measured against the "up" direction learned at the stand calibration. Never use knee angle, because ankles leave frame in knees-up modes. Use thigh pitch instead.
- Every trigger has 3 cues: it fires on 2 of 3, has hysteresis, and has a 250 ms refractory window. Missing landmarks count as unknown, not off.
- Event `t` is detection time. `tEff` subtracts the measured latency. Game timing windows use `tEff`, and contact and line calls wait `LAT()` before resolving.

## Tests (Node 22, no install)

Run these from the repo root after any change to logic:

```
node tests/core_test.js index.html 1.5 0       # synthetic body through the core; try other distances (m) and tilts (deg)
node tests/camera_test.js index.html           # living room fallback chain and auto-pick
node tests/full_game.js index.html good        # full touch game with an autopilot (also: lazy)
node tests/pass_test.js index.html good        # forced pass plays (also: nopunch, nostance, lazy)
node tests/route_test.js index.html good       # forced route plays (also: nobreak, wrongway, nohands, lazy)
node tests/startup_test.js index.html living_room 2.3 0.3   # setup, warm-up, latency, play; add "pass" or "route"; MISS=duck,jump skips moves to test the third round
```

These are simulations. They prove the logic, not how real tracking feels. Thresholds get tuned from Mark's playtest notes.

## Status

Done: body core v0.2 (adds arm raise, duck, jump), six viewing modes with auto-pick, startup sequence (framing check, move test, latency check), pass protection and route running on 3rd and long, 3D stadium (three.js, 2D fallback with `?2d`), synthesized crowd and band, best-voice picker, iOS playback audio session.

The 3D view and the crowd can't be checked by the Node tests. Check them in Chromium with Playwright (pre-installed in cloud sessions), serving three.js from npm because the CDN may be blocked there.

Next: Mark's real-device playtests on iPhone, iPad, and living room mode with screen mirroring. Expect threshold tuning first. Gameplay balance (jukes score too easily) comes later, on purpose.
