// Forces pass plays with a touch autopilot. Usage: node tests/pass_test.js index.html [good|nopunch|nostance|lazy]
const fs = require("fs"), path = require("path"), vm = require("vm");
let src = fs.readFileSync(path.join(__dirname, "full_game.js"), "utf8");
src = src.replace('await els.touchBtn._l.click();', 'globalThis.__hhForcePass = true; await els.touchBtn._l.click();');
src = src.replace('if (skill === "good"){\n        HH.input.keyStance = true;', `if (skill === "good" || skill === "nopunch" || skill === "nostance"){
        HH.input.keyStance = skill !== "nostance";`);
src = src.replace('if (!pp._punched && pp.rusher.state', 'if (skill !== "nopunch" && !pp._punched && pp.rusher.state');
src = src.replace('HH.game.phase !== "over"; i++)', 'HH.game.phase !== "over" && HH.game.stats.passPro < 40; i++)');
process.argv[1] = __filename;
vm.runInThisContext(`(function(require, __dirname){ ${src} })`)(require, __dirname);
