# Player models

Drop rigged, animated character files here (`.glb`, binary glTF). The game loads them through the jsdelivr GitHub CDN
(`https://cdn.jsdelivr.net/gh/hungkach/homecoming-hero@main/models/...`), so nothing else needs hosting.

Rules:

- License must be CC0 (public domain) or another license that allows use in a game with no fee. Keep the pack's license file next to the model (for example `models/LICENSE-quaternius.txt`).
- One file per character is fine; animations can live inside the same `.glb`.
- Keep each file under about 10 MB so the game still starts quickly on a phone.

Animations the game will use, if the pack has them (any names; Claude maps them):

| Game moment | Look for |
| --- | --- |
| Pre-snap stance, huddle | Idle |
| Running, chasing | Run, sprint, jog |
| Blocking, engaged | Push, punch, shove, brace |
| Tackled, beaten | Fall, death, hit reaction, knockdown |
| Catch, jump | Jump |
| Stiff arm | Punch, push |

After uploading, tell Claude the file names and the pack they came from.
