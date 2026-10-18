# Homecoming Hero: working notes for Claude

First-person running back fitness game played with your body in front of a phone or tablet camera. Mark (the owner) prototypes from his phone and plays at https://hungkach.github.io/homecoming-hero/ (GitHub Pages from `main`). Read README.md for controls, camera setups, and the startup sequence.

Homecoming Hero is part of the body arcade (https://github.com/hungkach/body-arcade) and follows its philosophy: reward effort, stay accessible. A minimum honest rep (from the player's own warm-up, including the tired-pace jog) always works; more effort always pays more (knee height and cadence, bound size, squat depth); winning is never punished; precision the camera or a tired body can't give is automated. Check every new move against it. The arcade's other games run on rep-engine; this game keeps body core for now, and moving onto rep-engine is a later milestone there.

## Rules

- Everything the game needs lives in `index.html`. No build step, no extra runtime files. Scripts load only from CDNs.
- The shared tracking code is the `body core v0.6` `<script>` block, between its start and end markers. Keep it free of game globals so it can be copied into other games (Stomp City, Downhill, a wrestling game, a vigilante game). If you change the core, bump the version in both markers and in `VERSION`.
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

Done: body core v0.6 (forgiving high knees: the warm-up has an easy jog round (capture round "jog1"), knee rise and lead are calibrated on a square-root scale, 40 percent of the way to the jog lift; a lean while running needs 1.7 times the calibrated lean; and each step event carries `h`, the knee height against your warm-up; arm raise, duck, jump, lateral bound and back, lean; body play no longer uses the lean (Mark disliked it); the bound is the juke. `autoPath()` follows the most open lane behind the line and bends toward open grass past it, until a free defender squares you up (`g.squared`, a gold ring and a beep): then the path stops and the move is the player's; body route breaks are automatic; duck, squat, and arm raises wait 0.25 s in `pumpBody()` and are dropped within 0.5 s of a bound, so a juke never reads as a truck or stiff arm; effort pays: the body juke grows with the bound (`p.jukeK`, lateral shift over 0.3 s, 1.2 to 2.6 yd), the truck with squat depth (`p.depth`), and a deep squat into a pile allows beast mode by churning alone), six viewing modes with auto-pick, startup sequence (framing check, move test with big words and a looping demo figure, latency check), pass protection (a squat hold) and route running on 3rd and long, halfback screens (a convoy of releasing linemen) and halfback motion to the slot (slant, out, seam), workout pacing (sneaky rest motion after big plays or a hard stretch, a gentle rubber band after repeated stuffs; `pacing()`), 3D stadium (three.js, 2D fallback with `?2d`) with procedural player models (lathed bodies, pads, helmets with facemasks, merged per material in `buildMaterials()`; Mark approved model files from his repo through jsdelivr if a CC0 rigged pack is ever added, but cloud sessions can only reach npm), synthesized crowd (breakaway roar, 3rd and 4th down build) and marching band (the Mustang March), best-voice picker, Studio voices (Piper in a classic worker: ONNX Runtime and the espeak phonemizer from jsdelivr, Ryan (QB) and Joe (booth) voices from Hugging Face, models and lines in the Cache API; the phonemizer is rebuilt every 30 lines because it aborts after about 70; tested end to end in Chromium with a dummy model, since Hugging Face is blocked in cloud sessions), situational play calls and defensive fronts, run blocking schemes (zone, outside zone, power with a puller, toss, dive) with engagements and sheds, a green read arrow, and pile pushes, broadcast replays of big plays (recorded at 15 Hz, `recordPlay()`, a TV camera with pitch in `replayCam()`, 3D only), a goal line dive (inside the 3, a jump at the pile; `startDive()`), 4th down punts and field goals, workout length (15 to 30 minutes; the game clock follows real time), announcer booth (after dark by default, family, or off; it gets the gaps between calls and the snap count waits for it), iOS playback audio session.

The 3D view and the crowd can't be checked by the Node tests. Check them in Chromium with Playwright (pre-installed in cloud sessions), serving three.js from npm because the CDN may be blocked there.

Balance (perfect touch autopilot, about 8 games each, 6 minute games; Mark wants the runner slightly overpowered: beating a man barely slows you, beast mode out of piles): about 3 TDs a game and 11 yards a carry at 3.2 steps a second, about 1.6 at 2.4; the no-moves autopilot (a flat-out sprinter with no trucks or stiff arms) about 2. The 3D view never falls back to 2D mid-game (`guard()` only steps the pixel ratio down); players use Lambert except helmets and masks. The perfect bot at 4.6 also swipes jukes, which body play no longer has, so it runs high (about 8). Voices are American men (Mark): the QB and the booth. Speed is meant to pay off. Re-check these after any change to defense, contact, or speed.

Next: Mark's real-device playtests on iPhone, iPad, and living room mode with screen mirroring. Expect threshold tuning for the new moves first.
