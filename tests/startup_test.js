// End-to-end body session with a simulated player.
// Usage: node tests/startup_test.js index.html [modeKey] [distanceMeters] [extraDelaySec] [pass|route]
const fs = require("fs"), vm = require("vm");
const html = fs.readFileSync(process.argv[2], "utf8");
const KEY = process.argv[3] || "tablet_horizontal", D = +(process.argv[4] || 2.3), EXTRA = +(process.argv[5] || 0), PASS = process.argv[6] === "pass", ROUTE = process.argv[6] === "route";
if (PASS) globalThis.__hhForcePass = true;
if (ROUTE) globalThis.__hhForceRoute = true;
const noop = new Proxy(function(){}, {get: (t, k) => k === Symbol.toPrimitive ? () => 0 : noop, apply: () => noop, set: () => true});
const ctx = new Proxy({}, {get: (t, k) => (k in t ? t[k] : (typeof k === "string" ? (() => noop) : undefined)), set: (t, k, v) => { t[k] = v; return true; }});
const els = {};
const el = id => els[id] ||= {id, hidden: false, disabled: false, checked: true, value: "auto", textContent: "", innerHTML: "", style: {},
  classList: {toggle(){}, add(){}, remove(){}}, addEventListener(ev, fn){ (this._l ||= {})[ev] = fn; }, getContext: () => ctx, readyState: 0, videoWidth: 640, videoHeight: 480};
let rafCb = null, ms = 0;
Object.assign(globalThis, {innerWidth: 1280, innerHeight: 720, devicePixelRatio: 2, addEventListener(){}, isSecureContext: true,
  document: {getElementById: el, addEventListener(){}, hidden: false}, requestAnimationFrame: cb => { rafCb = cb; },
  CanvasRenderingContext2D: {prototype: {roundRect(){}}}});
globalThis.window = globalThis;
Object.defineProperty(globalThis, "performance", {value: {now: () => ms}, configurable: true});
Object.defineProperty(globalThis, "navigator", {value: {userAgent: "iPad", maxTouchPoints: 5}, configurable: true});
const spoken = [];
globalThis.speechSynthesis = {cancel(){}, speak(u){ if (u.text) spoken.push(u.text); }};
globalThis.SpeechSynthesisUtterance = function(t){ this.text = t; };
for (const m of html.matchAll(/<script>([\s\S]*?)<\/script>/g)) vm.runInThisContext(m[1]);
const HH = window.__hh;

// synthetic body (same model as core_test)
const IDX = {nose:0, lEar:7, rEar:8, lSh:11, rSh:12, lEl:13, rEl:14, lWr:15, rWr:16, lHip:23, rHip:24, lKn:25, rKn:26, lAn:27, rAn:28};
const VW = 640, VH = 480, FX = 0.714, FY = FX*VW/VH, noise = a => (Math.random() - 0.5)*2*a;
const standing = () => ({nose:[0,-0.62,-0.08], lSh:[0.19,-0.48,0], rSh:[-0.19,-0.48,0], lEl:[0.22,-0.22,0], rEl:[-0.22,-0.22,0],
  lWr:[0.23,0.02,0], rWr:[-0.23,0.02,0], lHip:[0.1,0,0], rHip:[-0.1,0,0], lKn:[0.11,0.45,0], rKn:[-0.11,0.45,0],
  lAn:[0.11,0.88,0], rAn:[-0.11,0.88,0], lEar:[0.07,-0.62,0], rEar:[-0.07,-0.62,0]});
function frame(P, off){
  const img = Array.from({length:33}, () => ({x:0.5, y:0.5, z:0, visibility:0.1})), wld = Array.from({length:33}, () => ({x:0, y:0, z:0}));
  for (const k in IDX){ const [x, y, z] = P[k];
    wld[IDX[k]] = {x: x + noise(0.006), y: y + noise(0.006), z: z + noise(0.012)};
    const depth = D + z, u = 0.5 + FX*(x + off.x)/depth + noise(0.002), v = 0.5 + FY*(y + off.y - camH)/depth + noise(0.002);
    img[IDX[k]] = {x: u, y: v, z: 0, visibility: u >= 0 && u <= 1 && v >= 0 && v <= 1 ? 0.97 : 0.2}; }
  return {img, wld};
}
const ease = u => u < 0 ? 0 : u > 1 ? 1 : u*u*(3 - 2*u);
function thigh(P, side, deg){ const h = P[side + "Hip"], a = deg*Math.PI/180;
  P[side + "Kn"] = [h[0], h[1] + 0.45*Math.cos(a), h[2] - 0.45*Math.sin(a)]; P[side + "An"] = [h[0], P[side + "Kn"][1] + 0.43, P[side + "Kn"][2]]; }
function knees(P, t){ const ph = t*2.3*Math.PI*2; thigh(P, "l", Math.max(0, Math.sin(ph))*80); thigh(P, "r", Math.max(0, -Math.sin(ph))*80); }
function punchL(P, k){ P.lEl = [0.2 - 0.03*k, -0.3 - 0.17*k, -0.15 - 0.16*k]; P.lWr = [0.15, -0.45, -0.28 - 0.34*k]; }
function punch(P, k){ P.rEl = [-0.2 + 0.03*k, -0.3 - 0.17*k, -0.15 - 0.16*k]; P.rWr = [-0.15, -0.45, -0.28 - 0.34*k]; }
function guard(P){ P.lEl = [0.2, -0.3, -0.15]; P.lWr = [0.15, -0.45, -0.28]; punch(P, 0); }
function overhead(P){ P.lEl = [0.25, -0.82, 0]; P.rEl = [-0.25, -0.82, 0]; P.lWr = [0.25, -1.1, 0]; P.rWr = [-0.25, -1.1, 0]; }

// director: what the simulated player does, based on what the game shows
let passSeen = false, camH = 0, offX = -0.7, phaseLog = [], lastPhase = "", stepStart = 0, lastStep = -1, hopFrom = 0, hopAt = -9, hopDir = 0, lastJukeAt = -9, playsSeen = 0;
function director(t){
  const S = HH.setup, P = standing(); let off = {x: offX, y: 0};
  const ph = S.active ? S.phase : (HH.game ? "game:" + HH.game.phase : "none");
  if (ph !== lastPhase){ phaseLog.push(`${ph}@${t.toFixed(1)}`); lastPhase = ph; }
  if (S.active){
    if (t > 2.0) offX += (0 - offX)*0.08;           // walks to center after being told
    const c = S.frame && S.frame.code; if (c === 'tiltUp') camH -= 0.004; if (c === 'tiltDown') camH += 0.004;   // tilts the camera when told
    if (S.phase === "reach") overhead(P);
    if (S.phase === "movetest"){
      if (S.step !== lastStep){ lastStep = S.step; stepStart = t; }
      const u = t - stepStart - 0.35;                 // reaction time to the spoken prompt
      if (S.step === 1 && u > 0) knees(P, u);
      if (S.step === 2) off.x = offX + 0.38*ease(u/0.25);            // hop left = person's +x
      if (S.step === 3) off.x = offX + 0.38*(1 - ease(u/0.25))*(u < 0 ? 1 : 1) - 0.38*ease((u)/0.25) + 0.38*ease(u/0.25) - 0.38*ease(u/0.25);
      if (S.step === 4 && u > 0){ const a = 60*ease(u/0.5), r = a*Math.PI/180; thigh(P, "l", a); thigh(P, "r", a); off.y = 0.45*(1 - Math.cos(r)); }
      if (S.step === 5){ guard(P); punch(P, ease(u/0.12)); }
    }
    if (S.phase === "latIntro") guard(P);
    if (S.phase === "latency"){ guard(P);
      for (let i = 4; i < 8; i++){ const u = t - (S.beats[i] + EXTRA + 0.02); if (u > -0.05 && u < 0.6){ punch(P, ease(u/0.12)*(u < 0.35 ? 1 : 1 - ease((u - 0.35)/0.2))); } } }
  } else if (HH.game && HH.game.playType === "route"){
    // route: high knees, hop toward the break when the cue shows, both hands out as the ring closes (all seen EXTRA late)
    const g = HH.game, rt = g.rt;
    if (g.phase === "live"){
      knees(P, t);
      if (rt.cueAt != null && !rt._cut){ rt._cut = true; hopAt = t + 0.15 + EXTRA; hopDir = g.play.dir; hopFrom = offX; }
      if (rt.arriveAt != null && !rt._ht){ rt._ht = rt.arriveAt - 0.1 + EXTRA; }
      if (rt._ht){ const u = t - rt._ht, k = ease(u/0.12)*(u < 0.4 ? 1 : 1 - ease((u - 0.4)/0.2)); if (u > 0){ punch(P, k); punchL(P, k); } }
    }
    const hu = t - hopAt; if (hu > 0 && hu < 0.25) off.x = hopFrom - hopDir*0.38*ease(hu/0.25); else if (hu >= 0.25 && hu < 1.2) off.x = hopFrom - hopDir*0.38*(1 - ease((hu - 0.25)/0.9));
  } else if (HH.game && HH.game.playType === "pass"){
    const g = HH.game, pp = g.pp;
    guard(P);
    if (g.phase === "live"){
      // quarter squat
      const a = 38, r = a*Math.PI/180; thigh(P, "l", a); thigh(P, "r", a); off.y = 0.45*(1 - Math.cos(r));
      if (!pp._shuf && pp.liveT > 0.3){ pp._shuf = t + EXTRA; pp._dir = pp.side; }
      if (pp.counterAt && !pp._mir && t > pp.counterAt + 0.2){ pp._mir = t + EXTRA; }
      if (!pp._pt && pp.rusher.state === "rush" && pp.eta < 0.2){ pp._pt = t + EXTRA; }
      const hop = (t0, dir, size) => { const hu = t - t0; if (hu > 0) shiftX -= dir*size*ease(hu/0.25) - (shiftDone[t0] || 0); };
      let x = 0;
      if (pp._shuf){ const hu = t - pp._shuf; if (hu > 0) x -= pp._dir*0.38*ease(hu/0.25); }
      if (pp._mir){ const hu = t - pp._mir; if (hu > 0) x -= pp.counterSide*0.38*ease(hu/0.25); }
      off.x = offX + x;
      if (pp._pt){ const u = t - pp._pt, k = ease(u/0.12)*(u < 0.4 ? 1 : 1 - ease((u - 0.4)/0.2)); if (u > 0){ punch(P, k); punchL(P, k); } }
    }
    passSeen = true;
  } else if (HH.game){
    const g = HH.game;
    if (g.phase === "live"){
      // run on screen events as the player sees them, EXTRA seconds late
      knees(P, t);
      const p = g.p, th = g.defenders.find(d => d.state !== "down" && d.state !== "resolved" && d.state !== "contact" && p.z > 0 && d.z > p.z && d.z - p.z < 2.6 && Math.abs(d.x - p.x) < 1.3);
      if (th && t - lastJukeAt > 1.2){ lastJukeAt = t; hopAt = t + EXTRA; hopDir = th.x > p.x ? 1 : -1; hopFrom = offX; }
    }
    if (g.phase === "dead" && g._counted !== true){ g._counted = true; }
    // hop: person's right is -x; game dir +1 = player's right
    const hu = t - hopAt; if (hu > 0 && hu < 0.25) off.x = hopFrom - hopDir*0.38*ease(hu/0.25); else if (hu >= 0.25 && hu < 1.2) off.x = hopFrom - hopDir*0.38*(1 - ease((hu - 0.25)/0.9)); 
  }
  return frame(P, off);
}
(async () => {
  HH.testBody(KEY);
  let errors = 0, framingSays = new Set();
  for (let i = 0; i < 60*120; i++){
    ms += 1000/60; const t = ms/1000;
    if (i % 2 === 0){ const f = director(t); BodyCore.feed(f.img, f.wld, t, VW, VH); }
    try { rafCb(ms); } catch(e){ errors++; if (errors < 4) console.error("frame error", e.stack.split("\n").slice(0, 3).join(" | ")); }
    if (HH.setup.active && HH.setup.frame && !HH.setup.frame.ok) framingSays.add(HH.setup.frame.code);
    if (HH.game && (HH.game.stats.carries >= 4 || HH.game.stats.passPro >= 6 || HH.game.stats.targets >= 5)) break;
  }
  const g = HH.game;
  console.log("mode", KEY, "dist", D, "extra delay", EXTRA, "| errors", errors);
  console.log("phases:", phaseLog.filter(x => !x.startsWith("game:")).join(" "));
  console.log("framing coached:", [...framingSays].join(", "));
  console.log("spoken:", spoken.slice(0, 14).join(" | "));
  console.log("final coach line:", els.calibMsg.textContent);
  console.log("latency set to", Math.round(BodyCore.latency*1000), "ms");
  if (g) console.log("game:", JSON.stringify({carries: g.stats.carries, yards: g.stats.yards, steps: g.stats.steps, jukes: g.stats.jukes, broken: g.stats.broken, passPro: g.stats.passPro, pickups: g.stats.pickups, clean: g.stats.clean, sacks: g.stats.sacks, targets: g.stats.targets, catches: g.stats.catches, recYards: g.stats.recYards}));
})();
