// Feeds synthetic body motion through body core and checks which events fire.
// Usage: node tests/core_test.js index.html [distanceMeters] [cameraTiltDeg]
const fs = require("fs"), vm = require("vm");
const html = fs.readFileSync(process.argv[2], "utf8");
const core = html.match(/<script>\n\/\* =+\n   body core v0\.\d+  \(start\)[\s\S]*?<\/script>/)[0].replace(/^<script>|<\/script>$/g, "");
vm.runInThisContext(core + "\nglobalThis.BodyCore = BodyCore;");
const D = +(process.argv[3] || 1.5), TILT = +(process.argv[4] || 0) * Math.PI/180;
const VW = 640, VH = 480, FX = 0.714, FY = FX*VW/VH;

// person frame: meters, y down, x = person's left, z toward the camera is negative; hips at origin
function standing(){
  return {nose:[0,-0.62,-0.08], lSh:[0.19,-0.48,0], rSh:[-0.19,-0.48,0], lEl:[0.22,-0.22,0], rEl:[-0.22,-0.22,0],
    lWr:[0.23,0.02,0], rWr:[-0.23,0.02,0], lHip:[0.1,0,0], rHip:[-0.1,0,0], lKn:[0.11,0.45,0], rKn:[-0.11,0.45,0],
    lAn:[0.11,0.88,0], rAn:[-0.11,0.88,0], lEar:[0.07,-0.62,0], rEar:[-0.07,-0.62,0]};
}
const IDX = {nose:0, lEar:7, rEar:8, lSh:11, rSh:12, lEl:13, rEl:14, lWr:15, rWr:16, lHip:23, rHip:24, lKn:25, rKn:26, lAn:27, rAn:28};
const noise = a => (Math.random() - 0.5)*2*a;
// world landmarks are hip-centered; the image adds body offset (hop, squat) and the camera view
function frame(P, off = {x:0, y:0}){
  const img = Array.from({length:33}, () => ({x:0.5, y:0.5, z:0, visibility:0.1}));
  const wld = Array.from({length:33}, () => ({x:0, y:0, z:0}));
  for (const k in IDX){
    const [x, y, z] = P[k];
    // the camera can be tilted (pitched); MediaPipe world axes follow the camera, so rotate both
    const cy = y*Math.cos(TILT) - z*Math.sin(TILT), cz = y*Math.sin(TILT) + z*Math.cos(TILT);
    wld[IDX[k]] = {x: x + noise(0.006), y: cy + noise(0.006), z: cz + noise(0.012)};
    const X = x + off.x, Y = y + off.y;
    const Yc = Y*Math.cos(TILT) - z*Math.sin(TILT), Zc = Y*Math.sin(TILT) + z*Math.cos(TILT);
    const depth = D + Zc;
    const u = 0.5 + FX*X/depth + noise(0.002), v = 0.5 + FY*Yc/depth + noise(0.002);
    const inside = u >= 0 && u <= 1 && v >= 0 && v <= 1;
    img[IDX[k]] = {x: u, y: v, z: 0, visibility: inside ? 0.97 : 0.2};
  }
  return {img, wld};
}
let t = 100;
const log = [];
function run(secs, poseAt){
  const n = Math.round(secs*30);
  for (let i = 0; i < n; i++){
    const u = i/30, {P, off} = poseAt(u);
    const f = frame(P, off);
    BodyCore.feed(f.img, f.wld, t, VW, VH);
    for (const e of BodyCore.drain()) log.push(e);
    t += 1/30;
  }
}
const ease = u => u < 0 ? 0 : u > 1 ? 1 : u*u*(3 - 2*u);
const stand = () => ({P: standing(), off: {x:0, y:0}});
function thigh(P, side, deg){
  const h = P[side + "Hip"], a = deg*Math.PI/180;
  P[side + "Kn"] = [h[0], h[1] + 0.45*Math.cos(a), h[2] - 0.45*Math.sin(a)];
  P[side + "An"] = [h[0], P[side + "Kn"][1] + 0.43, P[side + "Kn"][2]];
}
function section(name, secs, fn){
  const start = log.length; run(secs, fn);
  const ev = log.slice(start).map(e => e.type + (e.side ? e.side : "") + (e.dir ? (e.dir > 0 ? ">" : "<") : ""));
  const count = {}; ev.forEach(k => count[k] = (count[k] || 0) + 1);
  console.log(name.padEnd(34), JSON.stringify(count));
  return count;
}
const results = {};

run(1.5, stand);
console.log("calibrated:", BodyCore.calibrateStand(), "| distance", D, "m, tilt", process.argv[4] || 0, "deg");
results.idle = section("stand still", 2, stand);
results.knees = section("high knees 3 s (4.6 steps/s)", 3, u => { const P = standing(); const ph = u*2.3*Math.PI*2;
  thigh(P, "l", Math.max(0, Math.sin(ph))*80); thigh(P, "r", Math.max(0, -Math.sin(ph))*80);
  // bent-arm pump: elbows at 90 degrees swinging
  const sw = Math.sin(ph)*0.15;
  P.lEl = [0.22, -0.25, sw]; P.lWr = [0.22, -0.3, sw - 0.22]; P.rEl = [-0.22, -0.25, -sw]; P.rWr = [-0.22, -0.3, -sw - 0.22];
  return {P, off: {x:0, y:0}}; });
console.log("   cadence after high knees:", BodyCore.state.cadence.toFixed(2), "steps/s");
results.calm = section("stand", 1.2, stand);
results.hopR = section("hop to player's right", 1.2, u => ({P: standing(), off: {x: -0.38*ease(u/0.25), y: -0.06*Math.sin(Math.PI*Math.min(1, u/0.25))}}));
results.back = section("slow walk back to center", 1.5, u => ({P: standing(), off: {x: -0.38*(1 - ease(u/1.2)), y: 0}}));
results.hopL = section("hop to player's left", 1.2, u => ({P: standing(), off: {x: 0.38*ease(u/0.25), y: 0}}));
results.back2 = section("slow walk back", 1.5, u => ({P: standing(), off: {x: 0.38*(1 - ease(u/1.2)), y: 0}}));
// a lateral bound: out to the player's right and straight back to center
results.boundR = section("bound right and straight back", 1.6, u => ({P: standing(), off: {x: -0.4*(u < 0.3 ? ease(u/0.3) : 1 - ease((u - 0.45)/0.35))*(u > 1 ? 0 : 1), y: 0}}));
results.boundL = section("bound left and straight back", 1.6, u => ({P: standing(), off: {x: 0.4*(u < 0.3 ? ease(u/0.3) : 1 - ease((u - 0.45)/0.35))*(u > 1 ? 0 : 1), y: 0}}));
results.lean = section("lean right, hips still", 1.5, u => { const P = standing(), d = -0.22*ease(u/0.3);
  for (const k of ["nose","lEar","rEar","lSh","rSh","lEl","rEl","lWr","rWr"]) P[k] = [P[k][0] + d, P[k][1], P[k][2]];
  return {P, off: {x:0, y:0}}; });
console.log("   steering lean while leaning right:", BodyCore.state.lean.toFixed(2));
results.calm2 = section("stand", 1, stand);
results.squat = section("squat and hold", 2, u => { const P = standing(), a = 60*ease(u/0.5), r = a*Math.PI/180;
  thigh(P, "l", a); thigh(P, "r", a); const drop = 0.45*(1 - Math.cos(r));
  // hip-centered world: knees and ankles move up toward hips; image: upper body drops
  for (const k of ["lAn","rAn"]) P[k] = [P[k][0], P[k][1] - drop*0.2, P[k][2]];
  return {P, off: {x:0, y: drop}}; });
results.rise = section("stand up", 1.2, stand);
results.punchR = section("guard, two right stiff arms", 2, u => { const P = standing();
  P.lEl = [0.2, -0.3, -0.15]; P.lWr = [0.15, -0.45, -0.28];
  const k = Math.max(ease((u - 0.3)/0.12) * (u < 0.9 ? 1 : 1 - ease((u - 0.9)/0.2)), u > 1.3 ? ease((u - 1.3)/0.12) : 0);
  P.rEl = [-0.2 + 0.03*k, -0.3 - 0.17*k, -0.15 - 0.16*k]; P.rWr = [-0.15, -0.45, -0.28 - 0.34*k];
  return {P, off: {x:0, y:0}}; });
// lateral raise: arm swings out to the side, up to shoulder height (person frame: +x is the person's left)
function raiseArm(P, side, k){ const sh = P[side + "Sh"], sx = side === "l" ? 1 : -1, a = k*Math.PI/2*0.95;
  P[side + "El"] = [sh[0] + sx*0.26*Math.sin(a), sh[1] + 0.26*Math.cos(a), 0]; P[side + "Wr"] = [sh[0] + sx*0.5*Math.sin(a), sh[1] + 0.5*Math.cos(a), 0]; }
const pulse = (u, t0, up = 0.25, hold = 0.35) => u < t0 ? 0 : u < t0 + up ? ease((u - t0)/up) : u < t0 + up + hold ? 1 : 1 - ease((u - t0 - up - hold)/0.3);
results.raiseL = section("raise left arm out, twice", 2.6, u => { const P = standing(); raiseArm(P, "l", Math.max(pulse(u, 0.2), pulse(u, 1.4))); return {P, off: {x:0, y:0}}; });
results.raiseR = section("raise right arm out", 1.4, u => { const P = standing(); raiseArm(P, "r", pulse(u, 0.2)); return {P, off: {x:0, y:0}}; });
results.raiseB = section("raise both arms out", 1.4, u => { const P = standing(), k = pulse(u, 0.2); raiseArm(P, "l", k); raiseArm(P, "r", k); return {P, off: {x:0, y:0}}; });
// truck: lower the head and shoulder, bending a little at the hips and knees
results.duck = section("duck head and shoulders (truck)", 1.6, u => { const P = standing(), k = pulse(u, 0.2, 0.2, 0.3);
  for (const j of ["nose","lEar","rEar"]) P[j] = [P[j][0], P[j][1] + 0.22*k, P[j][2] - 0.22*k];
  for (const j of ["lSh","rSh","lEl","rEl","lWr","rWr"]) P[j] = [P[j][0], P[j][1] + 0.14*k, P[j][2] - 0.12*k];
  thigh(P, "l", 15*k); thigh(P, "r", 15*k); return {P, off: {x:0, y: 0.04*k}}; });
results.jump = section("jump", 1.6, u => { const P = standing(), h = u > 0.3 && u < 0.75 ? Math.sin(Math.PI*(u - 0.3)/0.45) : 0;
  return {P, off: {x:0, y: -0.18*h}}; });
results.calm3 = section("stand", 1, stand);
results.over = section("both arms overhead", 1.5, u => { const P = standing(), k = ease(u/0.3);
  P.lEl = [0.25, -0.22 - 0.6*k, 0]; P.rEl = [-0.25, -0.22 - 0.6*k, 0]; P.lWr = [0.25, 0.02 - 1.12*k, 0]; P.rWr = [-0.25, 0.02 - 1.12*k, 0];
  return {P, off: {x:0, y:0}}; });
console.log("   overhead state:", BodyCore.state.overhead);
// tired knees: warm up at full height, then march at about half the thigh lift. They should still step,
// and each step should carry a lower knee height (h) than the warm-up ones.
const march = deg => u => { const P = standing(), ph = u*2.3*Math.PI*2; thigh(P, "l", Math.max(0, Math.sin(ph))*deg); thigh(P, "r", Math.max(0, -Math.sin(ph))*deg); return {P, off: {x:0, y:0}}; };
results.lowBefore = section("low knees, default thresholds", 3, march(48));
BodyCore.captureStart("stand", 0); run(1, stand); BodyCore.captureStop();
BodyCore.captureStart(["step"], "jog1"); run(2.6, march(50)); BodyCore.captureStop();   // the warm-up's easy jog
BodyCore.captureStart(["step"], 1); run(3, march(80)); BodyCore.captureStop();
BodyCore.applyMoveTest(); run(0.5, stand);
let s0 = log.length; results.highAfter = section("high knees after warm-up", 3, march(80)); const hHigh = log.slice(s0).filter(e => e.type === "step" && e.h != null).map(e => e.h);
run(0.5, stand);
s0 = log.length; results.lowAfter = section("tired knees after warm-up (48 deg)", 3, march(48)); const hLow = log.slice(s0).filter(e => e.type === "step" && e.h != null).map(e => e.h);
const avg = a => a.length ? a.reduce((x, y) => x + y, 0)/a.length : 0;
console.log("   knee height: high", avg(hHigh).toFixed(2), "tired", avg(hLow).toFixed(2));

const n = (o, k) => o[k] || 0;
const checks = [
  ["no events while standing", Object.keys(results.idle).length === 0],
  ["high knees give 12 to 15 steps", n(results.knees, "stepL") + n(results.knees, "stepR") >= 12 && n(results.knees, "stepL") + n(results.knees, "stepR") <= 15],
  ["no squat or punch during high knees", !n(results.knees, "level") && !n(results.knees, "punchL") && !n(results.knees, "punchR")],
  ["hop right fires once, to the right", n(results.hopR, "hop>") === 1 && !n(results.hopR, "hop<")],
  ["walking back does not fire", !n(results.back, "hop<") && !n(results.back, "hop>")],
  ["hop left fires once, to the left", n(results.hopL, "hop<") === 1 && !n(results.hopL, "hop>")],
  ["bound right and back fires once, to the right", n(results.boundR, "hop>") === 1 && !n(results.boundR, "hop<")],
  ["bound left and back fires once, to the left", n(results.boundL, "hop<") === 1 && !n(results.boundL, "hop>")],
  ["a lean is not a hop", !n(results.lean, "hop<") && !n(results.lean, "hop>")],
  ["a lean right fires one lean to the right", n(results.lean, "leanR") === 1 && !n(results.lean, "leanL")],
  ["no lean during high knees, hops, squats, or arm raises", !Object.keys({...results.knees, ...results.hopR, ...results.hopL, ...results.squat, ...results.raiseL, ...results.raiseR, ...results.raiseB, ...results.jump}).some(k => k.startsWith("lean"))],
  ["squat fires one level change", n(results.squat, "level") === 1],
  ["two right stiff arms, no left (fist may leave frame when close and tilted)", n(results.punchR, "punchR") >= (D < 2 && TILT < 0 ? 1 : 2) && !n(results.punchR, "punchL")],
  ["arms overhead fires once" + (D < 2 ? " (skipped: wrists leave frame this close)" : ""), D < 2 || n(results.over, "overhead") === 1],
  ["no raise, duck, or jump during high knees", !Object.keys(results.knees).some(k => /^(raise|duck|jump)/.test(k))],
  ["no jump or raise during hops", !Object.keys({...results.hopR, ...results.hopL, ...results.back, ...results.back2, ...results.boundR, ...results.boundL}).some(k => /^(jump|raise)/.test(k))],
  ["left arm raise fires twice, only left", n(results.raiseL, "raiseL") === 2 && !n(results.raiseL, "raiseR")],
  ["right arm raise fires once, only right", n(results.raiseR, "raiseR") === 1 && !n(results.raiseR, "raiseL")],
  ["both arms raise fires both sides", n(results.raiseB, "raiseL") === 1 && n(results.raiseB, "raiseR") === 1],
  ["arm raises don't punch", !Object.keys({...results.raiseL, ...results.raiseR, ...results.raiseB}).some(k => k.startsWith("punch"))],
  ["duck fires once, no jump", n(results.duck, "duck") === 1 && !n(results.duck, "jump")],
  ["jump fires once, no hop or duck", n(results.jump, "jump") === 1 && !n(results.jump, "hop<") && !n(results.jump, "hop>") && !n(results.jump, "duck")],
  ["tired knees (48 deg) still step after a jog-and-high-knees warm-up (10 or more in 3 s)", n(results.lowAfter, "stepL") + n(results.lowAfter, "stepR") >= 10],
  ["tired knees carry a lower knee height than full ones", avg(hLow) > 0 && avg(hLow) < avg(hHigh) - 0.2 && avg(hHigh) > 0.8],
  ["no stray rip or swim", !Object.keys({...results.punchR, ...results.over}).some(k => k.startsWith("rip") || k.startsWith("swim"))],
];
let fail = 0;
for (const [name, ok] of checks){ console.log(ok ? "PASS" : "FAIL", name); if (!ok) fail++; }
process.exit(fail ? 1 : 0);
