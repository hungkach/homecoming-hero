# Homecoming Hero

A first-person running back game you play with your body. Prop a phone or tablet in front of you, take the handoff, and sprint, juke, truck, and stiff arm your way through a four-quarter homecoming game. On 3rd and long, you stay in to pick up the blitz or run a route out of the backfield.

Play at **https://hungkach.github.io/homecoming-hero/**. Camera play needs that https link. Touch play works anywhere.

## Controls

| Move | Body | Touch |
| --- | --- | --- |
| Take the handoff | Start sprinting at the snap; the QB meets you at the mesh (or pitches on a toss) | Tap fast |
| Sprint | High knees in place | Tap fast |
| Juke | Bound out to one side and straight back to center | Swipe sideways |
| Truck | Duck your head and shoulder as you hit a tackler | Swipe down |
| Stiff arm | Raise one arm out to the side the tackler is on | Swipe up |
| Pass pro: shuffle | Bound toward the blitzer (and back) | Swipe toward him |
| Pass pro: stance | Hold a quarter squat | Hold a thumb down |
| Pass pro: block | Both arms out to the sides together | Tap |
| Route: run it | High knees | Tap fast |
| Route: break | Bound toward the break when it beeps at the cone | Swipe toward the break |
| Route: catch | Jump (or both arms up) as the ring closes | Swipe up |

On 3rd and 5 or more, the call is either pass pro or a route.

Pass pro read: before the snap, the real blitzer creeps closer and sinks lower. The other one bounces in place, then drops into coverage.

Routes: the route is drawn on the grass before the snap, with an orange cone at the break. A linebacker covers you. Break on time and he bites, which opens space for the catch. The ball's whoosh rises to its peak right as it arrives, so you can time your hands by ear. After the catch it's a normal run.

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

## Startup (every session, about a minute)

1. **Framing check.** Live camera view with spoken coaching (step back, step closer, step left or right, tilt up or down) until you fit with a little margin. Full-body setups also check that your hands fit overhead.
2. **Warm-up.** Two rounds of every move: high knees, bound left and back, bound right and back, squat (first round only), truck, stiff arm left, stiff arm right, block, jump. Anything the camera still missed gets a short third round. Each trigger is set to 60 percent of your weakest round that still showed the move, so it fires on a tired rep too.
3. **Latency check.** Four clicks to count in, then one arm out to the side on each of the next four beats. The measured delay (camera plus TV mirroring) is subtracted from every timing window.

## How it's built

- One file, `index.html`, with no build step.
- The stadium, field, and players are 3D (three.js from a CDN): tiered stands with a crowd that jumps on big plays, light towers, a live scoreboard, goal posts, and fireworks on touchdowns. Your hands, timing rings, and the camera view stay 2D on top. Without WebGL, or with `?2d` added to the link, the game draws the flat 2D view instead. In body play, if tracking drops under 20 fps, the 3D view lowers its resolution, then falls back to 2D.
- Defense, after Ghost Reps' team pursuit: linebackers read and take on blockers, then shed; everyone takes a leading pursuit angle on where they last saw you heading; defensive backs keep a cushion and come downhill under control; defenders break down when you run at them. Bodies accelerate and turn gradually and don't run through each other.
- Contact is a small momentum model. Your speed into the hit (more when trucking) is weighed against the defender's speed and planted strength. Fast runners break more tackles, knock defenders back, and fall forward for extra yards. A defender who comes in hot can be juked clean; one who breaks down still gets a hand on you. A cut costs speed, and getting back up to speed takes a moment.
- All sound is synthesized: a stadium crowd that hushes for the snap count and builds as you break into the open, chants, a band, and an air horn. Spoken calls use the best English voice on the device, and you can pick one on the start screen.
- Body tracking uses MediaPipe Pose Landmarker (lite model, capped at 30 fps) from a CDN.
- The shared tracking lives in one marked `<script>` block, **body core v0.3**, so it can be copied into other games:
  - Body heights (hip drop, knee rise) come from image landmarks, in torso lengths. Angles and arm heights come from world landmarks, measured against the "up" direction learned while you stand tall. Knee angle is never used.
  - Every trigger has three cues, fires when 2 of 3 cross their threshold, needs 2 of 3 to drop back before it can fire again, and has a 250 ms refractory window.
  - Triggered moves: step, hop or lateral bound (the step back to center doesn't count), level change, duck, jump, arm raise (left or right), punch, rip, swim, arms overhead. Arm raises are measured in the picture's plane, which the camera sees best; punches toward the camera track poorly up close. Continuous signals: stance, cadence, lateral offset, shoulder turn.
  - The game calls `BodyCore.update()` every frame, drains events with `BodyCore.drain()`, and reads `BodyCore.state`.
