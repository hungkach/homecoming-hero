# Homecoming Hero

A first-person running back game you play with your body. Prop a phone or tablet in front of you, take the handoff, and sprint, juke, truck, and stiff arm your way through a four-quarter homecoming game. On 3rd and long, you stay in to pick up the blitz.

Play at **https://hungkach.github.io/homecoming-hero/**. Camera play needs that https link. Touch play works anywhere.

## Controls

| Move | Body | Touch |
| --- | --- | --- |
| Sprint | High knees in place | Tap fast |
| Juke | Hop left or right | Swipe sideways |
| Truck | Squat as you hit a tackler | Swipe down |
| Stiff arm | Snap one arm straight out | Swipe up |
| Pass pro: shuffle | Hop toward the blitzer | Swipe toward him |
| Pass pro: stance | Hold a quarter squat | Hold a thumb down |
| Pass pro: punch | Both hands out together | Tap |

Pass pro read: before the snap, the real blitzer creeps closer and sinks lower. The other one bounces in place, then drops into coverage.

## Camera setups

Pick "Play with body." Phones get one question: watch on this phone, or on your TV. Everything else is picked automatically, and a manual override lets you test any setup.

| Setup | Camera | Distance | Fits |
| --- | --- | --- | --- |
| Living room | Phone back camera, screen mirrored to TV | 3 to 4 ft | Head to feet |
| Phone upright | Front camera, portrait | about 4.5 ft | Head to feet |
| Phone sideways | Front camera, landscape | about 4 ft | Head to knees |
| Tablet sideways | Front camera | 3 to 4 ft | Head to feet |
| Tablet upright | Front camera | about 4 ft | Head to feet |
| Laptop | Webcam | about 5.5 ft | Head to knees |

Distances vary by device. Living room tries the back ultra-wide lens first, then the main back camera (upright, knees-up at about 3 ft), then the front camera on the phone screen.

## Startup (every session, about 30 seconds)

1. **Framing check.** Live camera view with spoken coaching (step back, step closer, step left or right, tilt up or down) until you fit with a little margin. Full-body setups also check that your hands fit overhead.
2. **Move test.** Stand tall, high knees, hop left, hop right, squat, stiff arm. Each move's trigger is set to 60 percent of your own peak.
3. **Latency check.** Four clicks to count in, then a stiff arm on each of the next four beats. The measured delay (camera plus TV mirroring) is subtracted from every timing window.

## How it's built

- One file, `index.html`, with no build step.
- Body tracking uses MediaPipe Pose Landmarker (lite model, capped at 30 fps) from a CDN.
- The shared tracking lives in one marked `<script>` block, **body core v0.1**, so it can be copied into other games:
  - Body heights (hip drop, knee rise) come from image landmarks, in torso lengths. Angles and arm heights come from world landmarks, measured against the "up" direction learned while you stand tall. Knee angle is never used.
  - Every trigger has three cues, fires when 2 of 3 cross their threshold, needs 2 of 3 to drop back before it can fire again, and has a 250 ms refractory window.
  - Triggered moves: step, hop, level change, punch, rip, swim, arms overhead. Continuous signals: stance, cadence, lateral offset, shoulder turn.
  - The game calls `BodyCore.update()` every frame, drains events with `BodyCore.drain()`, and reads `BodyCore.state`.
