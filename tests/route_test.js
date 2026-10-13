// Forces route plays with a touch autopilot. Usage: node tests/route_test.js index.html [good|nobreak|wrongway|nohands|lazy]
// good: sprints, breaks the called way at the cone, hands out as the ball arrives, then runs after the catch.
const fs = require("fs"), path = require("path"), vm = require("vm");
let src = fs.readFileSync(path.join(__dirname, "full_game.js"), "utf8");
src = src.replace('await els.touchBtn._l.click();', 'globalThis.__hhForceRoute = true; await els.touchBtn._l.click();');
// the run autopilot keeps tapping and juking after the catch; this adds the route itself
src = src.replace('if (g.phase === "live" && g.playType !== "pass"){', `if (g.phase === "live" && g.playType === "route"){
      const rt = g.rt;
      if (skill !== "lazy" && t >= nextStep){ els.field._l.pointerdown({clientX:100, clientY:100}); els.field._l.pointerup({clientX:100, clientY:100}); nextStep = t + 1/4.6; }
      if (rt.cueAt != null && !rt._cut && t > rt.cueAt + 0.2){ rt._cut = true;
        if (skill === "good" || skill === "nohands") { HH.input.juke = g.play.dir; HH.input.jukeT = t; }
        if (skill === "wrongway") { HH.input.juke = -g.play.dir; HH.input.jukeT = t; } }
      if (rt.arriveAt != null && !rt._hands && t > rt.arriveAt - 0.1 && skill !== "nohands" && skill !== "lazy"){ rt._hands = true; HH.input.punch = true; HH.input.punchT = t; }
    }
    else if (g.phase === "live" && g.playType !== "pass"){`);
src = src.replace('HH.game.phase !== "over"; i++)', 'HH.game.phase !== "over" && HH.game.stats.targets < 40; i++)');
src = src.replace('console.log("pass plays"', 'console.log("routes", JSON.stringify({targets: g.stats.targets, catches: g.stats.catches, recYards: g.stats.recYards, avg: g.stats.catches ? (g.stats.recYards/g.stats.catches).toFixed(1) : 0}));\n  console.log("pass plays"');
process.argv[1] = __filename;
vm.runInThisContext(`(function(require, __dirname){ ${src} })`)(require, __dirname);
