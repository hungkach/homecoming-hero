// Plays a full touch game in Node with an autopilot. Usage: node tests/full_game.js index.html [good|lazy]
const fs = require("fs");
const html = fs.readFileSync(process.argv[2], "utf8");
const srcs = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
const skill = process.argv[3] || "good";   // "good" jukes on time, "lazy" never jukes

const noop = new Proxy(function(){}, { get: (t, k) => k === Symbol.toPrimitive ? () => 0 : noop, apply: () => noop, set: () => true });
const ctx = new Proxy({}, { get: (t, k) => (k in t ? t[k] : (typeof k === "string" ? (() => noop) : undefined)), set: (t, k, v) => { t[k] = v; return true; } });
const els = {};
function el(id){
  if (!els[id]) els[id] = { id, hidden: false, disabled: false, checked: true, textContent: "", innerHTML: "", style: {},
    classList: { toggle(){}, add(){}, remove(){} }, addEventListener(ev, fn){ (this._l ||= {})[ev] = fn; },
    getContext: () => ctx, readyState: 0, videoWidth: 640, videoHeight: 480 };
  return els[id];
}
let rafCb = null, ms = 0;
global.window = globalThis; Object.assign(globalThis, { innerWidth: 390, innerHeight: 844, devicePixelRatio: 3, addEventListener(){}, isSecureContext: true });
global.document = { getElementById: el, addEventListener(){}, hidden: false };
global.navigator = {};
global.performance = { now: () => ms };
global.requestAnimationFrame = cb => { rafCb = cb; };
global.CanvasRenderingContext2D = { prototype: { roundRect(){} } };

globalThis.__hhMinutes = +process.env.MINUTES || 6;   // game length in minutes (the real default is 20)
const vm = require("vm"); for (const src of srcs) vm.runInThisContext(src);
const HH = window.__hh;

(async () => {
  await els.touchBtn._l.click();
  let errors = 0, nextStep = 0, plays = [], lastPhase = "";
  for (let i = 0; i < 60*60*45 && HH.game.phase !== "over"; i++){
    ms += 1000/60; const t = ms/1000;
    const g = HH.game;
    if (g.phase === "live" && g.playType === "pass"){
      const pp = g.pp, p = g.p;
      if (skill === "good"){
        HH.input.keyStance = true;
        if (!pp._read && pp.liveT > 0.25){ pp._read = true; const right = Math.random() < 0.85 ? pp.side : -pp.side; HH.input.juke = right; HH.input.jukeT = t; }
        if (!pp._punched && pp.rusher.state === "rush" && pp.eta < 0.12){ pp._punched = true; HH.input.punch = true; HH.input.punchT = t; }
        if (pp.counterAt && !pp._mirror && t > pp.counterAt + 0.25){ pp._mirror = true; if (Math.random() < 0.85){ HH.input.juke = pp.counterSide; HH.input.jukeT = t; } }
      } else HH.input.keyStance = false;
    }
    if (g.phase === "live" && g.playType !== "pass"){
      if (t >= nextStep){ els.field._l.pointerdown({clientX:100, clientY:100}); els.field._l.pointerup({clientX:100, clientY:100}); nextStep = t + 1/(+process.env.CADENCE || 4.6); }
      // the read: cut toward the green lane once, before the line
      // zone runs: at the handoff, bound toward the green lane if it says bounce or bend (else bang it); other runs cut toward it once
      const zoneRun = g.play.scheme === "zone" || g.play.scheme === "ozone";
      if (skill === "good" && zoneRun && g.lane && g.hand && g.hand.state === "rb" && !g._readCut){ g._readCut = true; if (!/bang|press/.test(g.lane.k)){ HH.input.juke = Math.sign(g.lane.x - g.play.hole) || 1; HH.input.jukeT = t; } }
      else if (skill === "good" && !zoneRun && g.lane && g.p.z < -0.5 && !g._readCut && Math.abs(g.lane.x - g.p.x) > 1.2){ g._readCut = true; HH.input.juke = Math.sign(g.lane.x - g.p.x); HH.input.jukeT = t; }
      if (skill === "good"){
        const p = g.p;
        // the clock: a man in front (10 to 2) gets a juke, a truck or a hurdle; a man at your side (2 to 5, 7 to 10) a stiff arm
        const live = g.defenders.filter(d => d.state !== "down" && d.state !== "resolved" && !d.block && (g.t <= -d.delay) && Math.hypot(d.x - p.x, d.z - p.z) < 2.4);
        const ang = d => Math.abs(Math.atan2(d.x - p.x, d.z - p.z))*180/Math.PI;
        const near = live.sort((a, b) => Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b.x - p.x, b.z - p.z))[0];   // whoever hits you first
        const threat = near && ang(near) < 60 && near.z - p.z < 2.3 ? near : null, side = near && !threat && ang(near) >= 60 && ang(near) < 150 && Math.hypot(near.x - p.x, near.z - p.z) < 1.8 ? near : null;
        if (threat && t - p.lastJuke > 0.6 && t - (g._moveAt || -9) > 0.6){
          g._moveAt = t; const r = Math.random();
          if (r < 0.5) HH.input.juke = (threat.x > p.x ? -1 : 1) * (Math.abs(p.x) > 20 ? -Math.sign(p.x)*Math.sign(threat.x > p.x ? -1 : 1) : 1);
          else if (r < 0.8 || process.env.NOHURDLE) HH.input.shoulder = true; else { HH.input.hurdle = true; HH.input.hurdleT = t; }
        } else if (side && t - (g._moveAt || -9) > 0.6){ g._moveAt = t; HH.input.stiff = true; }
      }
    }
    if (g.phase !== lastPhase){ if (g.phase === "dead"){ plays.push(`${g.result.kind}:${g.result.gain}`); if (g.playType === "run" || g.caught === false && g.play.scheme) (globalThis.__byScheme ||= []).push([g.play.scheme || "pass", g.result.gain]); } lastPhase = g.phase; }
    try { rafCb(ms); } catch(e){ errors++; if (errors < 4) console.error("frame error", e.stack.split("\n").slice(0,3).join(" | ")); }
  }
  const g = HH.game;
  console.log("skill", skill, "errors", errors, "sim minutes", (ms/60000).toFixed(1), "phase", g.phase);
  console.log("final", (els.endTitle||{}).textContent, "|", (els.endSub||{}).textContent);
  console.log("plays", plays.join(" "));
  console.log("stats", JSON.stringify(g.stats));
  if (process.env.SCHEMES){ const by = {}; for (const [k, v] of (globalThis.__byScheme || [])) (by[k] ||= []).push(v); console.log("schemes " + JSON.stringify(by)); }
  console.log("pass plays", JSON.stringify({passPro: g.stats.passPro, pickups: g.stats.pickups, clean: g.stats.clean, sacks: g.stats.sacks}));
})();
