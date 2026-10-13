# Homecoming Hero

A first-person running back game you play with your body. Prop a phone or tablet in front of you, take the handoff, and sprint, juke, truck, and stiff arm your way through a four-quarter homecoming game.

Play it at the GitHub Pages link for this repo. Camera play needs that https link; touch play works anywhere.

## Controls

| Move | Body | Touch |
| --- | --- | --- |
| Sprint | High knees in place | Tap fast |
| Juke | Hop left or right | Swipe sideways |
| Truck | Squat as you hit a tackler | Swipe down |
| Stiff arm | Snap one arm straight out | Swipe up |

## How it's built

- One file: `index.html`. No build step.
- Body tracking uses MediaPipe Pose Landmarker (lite model) from a CDN.
- The shared tracking code lives in one marked block, `body core v0.1`, so it can be copied into other games.
