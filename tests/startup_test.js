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
function knees(P, t, deg = 80){ const ph = t*2.3*Math.PI*2; thigh(P, "l", Math.max(0, Math.sin(ph))*deg); thigh(P, "r", Math.max(0, -Math.sin(ph))*deg); }
function punchL(P, k){ P.lEl = [0.2 - 0.03*k, -0.3 - 0.17*k, -0.15 - 0.16*k]; P.lWr = [0.15, -0.45, -0.28 - 0.34*k]; }
function punch(P, k){ P.rEl = [-0.2 + 0.03*k, -0.3 - 0.17*k, -0.15 - 0.16*k]; P.rWr = [-0.15, -0.45, -0.28 - 0.34*k]; }
function guard(P){ P.lEl = [0.2, -0.3, -0.15]; P.lWr = [0.15, -0.45, -0.28]; punch(P, 0); }
// lateral raise to shoulder height (person frame: +x is the person's left)
function raiseArm(P, side, k){ const sh = P[side + "Sh"], sx = side === "l" ? 1 : -1, a = k*Math.PI/2*0.95;
  P[side + "El"] = [sh[0] + sx*0.26*Math.sin(a), sh[1] + 0.26*Math.cos(a), 0]; P[side + "Wr"] = [sh[0] + sx*0.5*Math.sin(a), sh[1] + 0.5*Math.cos(a), 0]; }
const armPulse = u => u < 0 ? 0 : u < 0.2 ? ease(u/0.2) : u < 0.5 ? 1 : 1 - ease((u - 0.5)/0.25);
function duck(P, k){ for (const j of ["nose","lEar","rEar"]) P[j] = [P[j][0], P[j][1] + 0.22*k, P[j][2] - 0.22*k];
  for (const j of ["lSh","rSh","lEl","rEl","lWr","rWr"]) P[j] = [P[j][0], P[j][1] + 0.14*k, P[j][2] - 0.12*k]; thigh(P, "l", 15*k); thigh(P, "r", 15*k); }
const jumpUp = u => u > 0 && u < 0.45 ? -0.18*Math.sin(Math.PI*u/0.45) : 0;
// lean: shoulders and head tip sideways over still hips (person frame +x is the person's left; dir +1 = right)
function lean(P, dir, k){ const d = -dir*0.2*k; for (const j of ["nose","lEar","rEar","lSh","rSh","lEl","rEl","lWr","rWr"]) P[j] = [P[j][0] + d*(j === "nose" || j.endsWith("Ear") ? 1.2 : 1), P[j][1], P[j][2]]; }
function overhead(P){ P.lEl = [0.25, -0.82, 0]; P.rEl = [-0.25, -0.82, 0]; P.lWr = [0.25, -1.1, 0]; P.rWr = [-0.25, -1.1, 0]; }

// director: what the simulated player does, based on what the game shows
const seenSteps = new Set();
let drillSeen = {};
let moveN = 0, armAt = -9, armSide = "r", duckAt = -9, leanAt = -9, leanDir = 1;
let passSeen = false, camH = 0, offX = -0.7, phaseLog = [], lastPhase = "", stepStart = 0, lastStep = -1, hopFrom = 0, hopAt = -9, hopDir = 0, lastJukeAt = -9, playsSeen = 0;
function director(t){
  const S = HH.setup, P = standing(); let off = {x: offX, y: 0};
  const ph = S.active ? S.phase : (HH.game ? "game:" + HH.game.phase : "none");
  if (ph !== lastPhase){ phaseLog.push(`${ph}@${t.toFixed(1)}`); lastPhase = ph; }
  if (S.active){
    if (t > 2.0) offX += (0 - offX)*0.08;           // walks to center after being told
    const c = S.frame && S.frame.code; if (c === 'tiltUp') camH -= 0.004; if (c === 'tiltDown') camH += 0.004;   // tilts the camera when told
    if (S.phase === "reach") overhead(P);
    if (S.phase === "movetest" && S.cur){
      if (S.step !== lastStep){ lastStep = S.step; stepStart = t; }
      const u = t - stepStart - 0.35, id = S.cur.id;   // reaction time to the spoken prompt
      // MISS=duck,jump makes the simulated player skip those moves in rounds 1 and 2, to exercise the third round
      const skip = (process.env.MISS || "").split(",").includes(id) && S.cur.round <= 2;
      if (skip) {}
      else if (id === "knees" && u > 0) knees(P, u);
      else if (id === "jog" && u > 0) knees(P, u, 50);
      else if (id === "hopL") off.x = offX + 0.4*(u < 0.3 ? ease(u/0.3) : 1 - ease((u - 0.45)/0.35));   // bound left (person's +x) and back
      else if ((id === "halfSquat" || id === "deepSquat") && u > 0){ const a = (id === "deepSquat" ? 80 : 45)*ease(u/0.5), r = a*Math.PI/180; thigh(P, "l", a); thigh(P, "r", a); off.y = 0.45*(1 - Math.cos(r)); }
      else if (id === "duck") duck(P, armPulse(u));
      else if (id === "leanL") lean(P, -1, armPulse(u));
      else if (id === "leanR") lean(P, 1, armPulse(u));
      else if (id === "raiseL") raiseArm(P, "l", armPulse(u));
      else if (id === "raiseR") raiseArm(P, "r", armPulse(u));
      else if (id === "raiseB"){ raiseArm(P, "l", armPulse(u)); raiseArm(P, "r", armPulse(u)); }
      else if (id === "jump") off.y = jumpUp(u);
      if (id === "hopR") off.x = offX - 0.4*(u < 0.3 ? ease(u/0.3) : 1 - ease((u - 0.45)/0.35));
      if (id !== "hopL" && id !== "hopR") off.x = offX;
      seenSteps.add(id + (S.cur.round || 0));
    }
    if (S.phase === "drill" && S.drill && HH.game && HH.game.phase === "drill"){
      // the check on the dummy: do the move when it's time, the way it was asked (DRILLFAIL=run hides the knees on the first try)
      const D = S.drill, g = HH.game, id = D.st.id, side = D.reps[0], near = g.dummy.z - g.p.z;
      if (D !== drillSeen.D || D.tries !== drillSeen.tries || D.reps.length !== drillSeen.left){ drillSeen = {D, tries: D.tries, left: D.reps.length, at: null, t0: t}; }
      const failing = (process.env.DRILLFAIL || "").split(",").includes(id) && D.tries === 0;
      if (id === "run" || id === "sprint"){ knees(P, t - drillSeen.t0, id === "sprint" ? 80 : 50); if (failing) camH = -0.9; else if (camH === -0.9) camH = 0; }
      else if (failing){}
      else if ((id === "juke" || id === "truck" || id === "stiff" || (id === "jump" && side === "hurdle")) && near < 2.0 && drillSeen.at == null && !D.repDone) drillSeen.at = t + 0.2;
      else if ((id === "block") && drillSeen.at == null && t - drillSeen.t0 > 1.2) drillSeen.at = t;
      else if (id === "jump" && side === "catch" && g.ball && !g.ball.caught && t - g.ball.t0 > g.ball.dur - 0.5 && drillSeen.at == null) drillSeen.at = t;
      const u = drillSeen.at == null ? -1 : t - drillSeen.at;
      if (u >= 0 && u < 1.4){
        if (id === "juke") off.x = offX + side*-0.4*(u < 0.3 ? ease(u/0.3) : 1 - ease((u - 0.45)/0.35));   // person's +x is their left
        else if (id === "truck"){ const a = 70*armPulse(u*0.9), r = a*Math.PI/180; thigh(P, "l", a); thigh(P, "r", a); off.y = 0.45*(1 - Math.cos(r)); }
        else if (id === "stiff") raiseArm(P, side < 0 ? "l" : "r", armPulse(u));
        else if (id === "block"){ raiseArm(P, "l", armPulse(u)); raiseArm(P, "r", armPulse(u)); }
        else if (id === "jump") off.y = jumpUp(u);
      } else if (u >= 1.4) drillSeen.at = null;
      if (id !== "juke") off.x = offX;
      seenSteps.add("check:" + id + D.tries);
    }
    if (S.phase === "latency"){
      for (let i = 4; i < 8; i++){ const u = t - (S.beats[i] + EXTRA + 0.02); if (u > -0.05 && u < 0.6) raiseArm(P, "r", armPulse(u*1.6)); } }
  } else if (HH.game && HH.game.playType === "route"){
    // route: high knees, hop toward the break when the cue shows, both hands out as the ring closes (all seen EXTRA late)
    const g = HH.game, rt = g.rt;
    if (g.phase === "live"){
      knees(P, t);
      if (rt.cueAt != null && !rt._cut){ rt._cut = true; hopAt = t + 0.15 + EXTRA; hopDir = g.play.dir; hopFrom = offX; }
      if (rt.arriveAt != null && !rt._ht){ rt._ht = rt.arriveAt - 0.1 + EXTRA; }
      if (rt._ht) off.y = jumpUp(t - rt._ht);
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
      if (pp._pt){ const u = t - pp._pt; raiseArm(P, "l", armPulse(u)); raiseArm(P, "r", armPulse(u)); }
    }
    passSeen = true;
  } else if (HH.game){
    const g = HH.game;
    if (g.phase === "live"){
      // run on screen events as the player sees them, EXTRA seconds late
      knees(P, t);
      const p = g.p, th = g.defenders.find(d => d.state !== "down" && d.state !== "resolved" && d.state !== "contact" && p.z > 0 && d.z > p.z && d.z - p.z < 2.6 && Math.abs(d.x - p.x) < 1.3);
      // rotate through the three moves: juke away, stiff arm toward him, truck
      if (th && t - lastJukeAt > 1.2){ lastJukeAt = t; const k = moveN++ % 3, side = th.x > p.x ? 1 : -1;
        if (k === 0){ if (moveN % 2){ leanAt = t + EXTRA; leanDir = -side; } else { hopAt = t + EXTRA; hopDir = -side; hopFrom = offX; } }
        else if (k === 1){ armAt = t + EXTRA; armSide = side > 0 ? "r" : "l"; }
        else duckAt = t + EXTRA; }
    }
    if (g.phase === "dead" && g._counted !== true){ g._counted = true; }
    if (t > armAt && t - armAt < 0.8) raiseArm(P, armSide, armPulse(t - armAt));
    if (t > duckAt && t - duckAt < 0.8) duck(P, armPulse(t - duckAt));
    if (t > leanAt && t - leanAt < 0.8) lean(P, leanDir, armPulse(t - leanAt));
    // hop: person's right is -x; game dir +1 = player's right
    const hu = t - hopAt; if (hu > 0 && hu < 0.25) off.x = hopFrom - hopDir*0.38*ease(hu/0.25); else if (hu >= 0.25 && hu < 1.2) off.x = hopFrom - hopDir*0.38*(1 - ease((hu - 0.25)/0.9)); 
  }
  return frame(P, off);
}
const tally = {};
const drillTally = {};
{ const d0 = BodyCore.drain; BodyCore.drain = () => { const e = d0(); if (HH.game && !HH.setup.active) for (const x of e) tally[x.type + (x.side || "")] = (tally[x.type + (x.side || "")] || 0) + 1;
  if (HH.setup.active && HH.setup.phase === "drill" && HH.setup.drill) for (const x of e){ const k = HH.setup.drill.st.id + HH.setup.drill.tries + ":" + x.type; drillTally[k] = (drillTally[k] || 0) + 1; } return e; }; }
(async () => {
  HH.testBody(KEY);
  let errors = 0, framingSays = new Set();
  for (let i = 0; i < 60*180; i++){
    ms += 1000/60; const t = ms/1000;
    if (i % 2 === 0){ const f = director(t); BodyCore.feed(f.img, f.wld, t, VW, VH); }
    try { rafCb(ms); } catch(e){ errors++; if (errors < 4) console.error("frame error", e.stack.split("\n").slice(0, 3).join(" | ")); }
    if (HH.setup.active && HH.setup.frame && !HH.setup.frame.ok) framingSays.add(HH.setup.frame.code);
    if (HH.game && (HH.game.stats.carries >= 8 || HH.game.stats.passPro >= 6 || HH.game.stats.targets >= 5)) break;
  }
  const g = HH.game;
  console.log("mode", KEY, "dist", D, "extra delay", EXTRA, "| errors", errors);
  console.log("phases:", phaseLog.filter(x => !x.startsWith("game:")).join(" "));
  console.log("framing coached:", [...framingSays].join(", "));
  console.log("spoken:", spoken.slice(0, 14).join(" | "));
  console.log("final coach line:", els.calibMsg.textContent);
  console.log("game events:", JSON.stringify(tally));
  console.log("warm-up steps:", [...seenSteps].join(" "));
  console.log("checks:", JSON.stringify(HH.setup.checks || {}));
  if (process.env.SHOWDRILL) console.log("drill events:", JSON.stringify(drillTally));
  console.log("latency set to", Math.round(BodyCore.latency*1000), "ms");
  if (g) console.log("game:", JSON.stringify({carries: g.stats.carries, yards: g.stats.yards, steps: g.stats.steps, jukes: g.stats.jukes, trucks: g.stats.trucks, stiffs: g.stats.stiffs, moves: moveN, broken: g.stats.broken, passPro: g.stats.passPro, pickups: g.stats.pickups, clean: g.stats.clean, sacks: g.stats.sacks, targets: g.stats.targets, catches: g.stats.catches, recYards: g.stats.recYards}));
})();
