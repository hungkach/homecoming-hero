# Homecoming Hero: working notes for Claude

First-person running back fitness game played with your body in front of a phone or tablet camera. Mark (the owner) prototypes from his phone and plays at https://hungkach.github.io/homecoming-hero/ (GitHub Pages from `main`). Read README.md for controls, camera setups, and the startup sequence.

## Rules

- Everything the game needs lives in `index.html`. No build step, no extra runtime files. Scripts load only from CDNs.
- The shared tracking code is the `body core v0.5` `<script>` block, between its start and end markers. Keep it free of game globals so it can be copied into other games (Stomp City, Downhill, a wrestling game, a vigilante game). If you change the core, bump the version in both markers and in `VERSION`.
- Touch play must keep working in every build. It's how Mark tests on his phone, and it must behave the same unless a change is meant for touch.
- One commit per feature, pushed to `main`. Update the build stamp at the bottom of the start screen (`buildStamp`) with the date and a word or two about the latest change, so Mark can tell when Safari is showing an old copy. Pages redeploys in a minute or two, and Mark refreshes the link.
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
node tests/full_game.js index.html good        # full touch game with an autopilot (also: lazy); CADENCE=3.2 taps per second (default 4.6), MINUTES=20 game length (default 6), SCHEMES=1 prints yards by run scheme
node tests/pass_test.js index.html good        # forced pass plays (also: nopunch, nostance, quit, lazy)
node tests/route_test.js index.html good       # forced route plays (also: nobreak, wrongway, nohands, lazy); PLAY=screen or motion forces plays whose name contains it
node tests/speech_test.js index.html good      # simulated speech queue: play calls must never cut off the announcer (BOOTH=family, SHOW=1)
node tests/startup_test.js index.html living_room 2.3 0.3   # setup, warm-up, latency, play; add "pass" or "route"; MISS=duck,jump skips moves to test the third round
```

These are simulations. They prove the logic, not how real tracking feels. Thresholds get tuned from Mark's playtest notes.

## Status

Done: body core v0.5 (forgiving high knees: knee rise and lead are calibrated on a square-root scale, about 30 percent of the way to your warm-up lift, and each step event carries `h`, the knee height against your warm-up; arm raise, duck, jump, lateral bound and back, lean; the game no longer steers from a held lean: runs follow preset lanes, `playLanes()`, and a cut before the line moves to the next lane), six viewing modes with auto-pick, startup sequence (framing check, move test with big words and a looping demo figure, latency check), pass protection (a squat hold) and route running on 3rd and long, halfback screens (a convoy of releasing linemen) and halfback motion to the slot (slant, out, seam), workout pacing (sneaky rest motion after big plays or a hard stretch, a gentle rubber band after repeated stuffs; `pacing()`), 3D stadium (three.js, 2D fallback with `?2d`), synthesized crowd (breakaway roar, 3rd and 4th down build) and marching band (the Mustang March), best-voice picker, Studio voices (Piper in a classic worker: ONNX Runtime and the espeak phonemizer from jsdelivr, Ryan and Lessac voices from Hugging Face, models and lines in the Cache API; the phonemizer is rebuilt every 30 lines because it aborts after about 70; tested end to end in Chromium with a dummy model, since Hugging Face is blocked in cloud sessions), situational play calls and defensive fronts, run blocking schemes (zone, outside zone, power with a puller, toss, dive) with engagements and sheds, a green read arrow, and pile pushes, a goal line dive (inside the 3, a jump at the pile; `startDive()`), 4th down punts and field goals, workout length (15 to 30 minutes; the game clock follows real time), announcer booth (after dark by default, family, or off; it gets the gaps between calls and the snap count waits for it), iOS playback audio session.

The 3D view and the crowd can't be checked by the Node tests. Check them in Chromium with Playwright (pre-installed in cloud sessions), serving three.js from npm because the CDN may be blocked there.

Balance (perfect touch autopilot, about 8 games each): about 2 TDs a game and 7 yards a carry at 3.2 steps a second, about 5 to 6 TDs at 4.6 and up; the no-moves autopilot scores almost never. Speed is meant to pay off. Re-check these after any change to defense, contact, or speed.

Next: Mark's real-device playtests on iPhone, iPad, and living room mode with screen mirroring. Expect threshold tuning for the new moves first.
