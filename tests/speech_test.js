// Plays a full touch game with a simulated speech engine (lines take time to say, a queue, cancel)
// and checks that play calls never cut off the announcer. Usage: node tests/speech_test.js index.html [good|lazy], BOOTH=family for the clean booth, SHOW=1 prints every line
const fs = require("fs"), path = require("path"), vm = require("vm");
let src = fs.readFileSync(path.join(__dirname, "full_game.js"), "utf8");
const MODE = process.env.BOOTH || "dark";
src = src.replace('const vm = require("vm"); for (const src of srcs) vm.runInThisContext(src);', `
const SP = { q: [], cur: null, log: [], cutoffs: [], get speaking(){ return !!SP.cur; }, get pending(){ return SP.q.length > 0; } };
const secs = u => u.text.length/14/(u.rate || 1);   // about 14 characters a second at normal rate
function spTick(){
  const t = ms/1000;
  if (SP.cur && t >= SP.cur.end){ const u = SP.cur.u; SP.cur = null; if (u.onend) u.onend(); }
  if (!SP.cur && SP.q.length){ const u = SP.q.shift(); if (u.text){ SP.cur = {u, start: t, end: t + secs(u)}; SP.log.push((u.pitch > 1 ? "BOOTH " : "coach ") + t.toFixed(1) + " " + u.text); } }
}
globalThis.speechSynthesis = {
  get speaking(){ return SP.speaking; }, get pending(){ return SP.pending; }, getVoices(){ return []; },
  speak(u){ SP.q.push(u); spTick(); },
  cancel(){ if (SP.cur && SP.cur.u.pitch > 1 && ms/1000 < SP.cur.end - 0.2) SP.cutoffs.push(SP.cur.u.text); SP.cur = null; SP.q = []; }
};
globalThis.SpeechSynthesisUtterance = function(t){ this.text = t; };
globalThis.__SP = SP; globalThis.__spTick = spTick;
const vm = require("vm"); for (const src of srcs) vm.runInThisContext(src);
el("booth").value = "${MODE}";`);
src = src.replace("    try { rafCb(ms); }", "    __spTick();\n    try { rafCb(ms); }");
src = src.replace('console.log("pass plays"', `const booth = __SP.log.filter(x => x.startsWith("BOOTH"));
  console.log("booth lines", booth.length, "| coach lines", __SP.log.length - booth.length, "| booth cut off", __SP.cutoffs.length);
  for (const c of __SP.cutoffs) console.log("   cut off:", c);
  if (process.env.SHOW) console.log(__SP.log.join("\\n"));
  console.log("pass plays"`);
process.argv[1] = __filename;
vm.runInThisContext(`(function(require, __dirname){ ${src} })`)(require, __dirname);
