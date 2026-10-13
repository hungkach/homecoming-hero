// Mocks cameras to check the living room fallback chain and auto-pick. Usage: node tests/camera_test.js index.html
const fs = require("fs"), vm = require("vm");
const html = fs.readFileSync(process.argv[2], "utf8");
const core = html.match(/<script>\n\/\* =+\n   body core v0\.1  \(start\)[\s\S]*?<\/script>/)[0].replace(/^<script>|<\/script>$/g, "");
function setup(cams, {envFails = false, zoomMin = null} = {}){
  const track = (label, facing) => ({label, stop(){}, getSettings: () => ({deviceId: label, facingMode: facing, width: 640, height: 480, zoom: 1}),
    getCapabilities: () => (zoomMin != null ? {zoom: {min: zoomMin, max: 10}} : {}), applyConstraints: async () => {}});
  Object.defineProperty(globalThis, "navigator", {configurable: true, writable: true, value: {userAgent: "iPhone", maxTouchPoints: 5, mediaDevices: {
    async getUserMedia({video}){
      let cam;
      if (video.deviceId) cam = cams.find(c => c.label === video.deviceId.exact);
      else if (video.facingMode && (video.facingMode.ideal || video.facingMode) === "environment"){ if (envFails) throw Object.assign(new Error("x"), {name: "OverconstrainedError"}); cam = cams.find(c => c.facing === "environment" && c.default); }
      else cam = cams.find(c => c.facing === "user");
      const tr = track(cam.label, cam.facing);
      return {getVideoTracks: () => [tr], getTracks: () => [tr]};
    },
    async enumerateDevices(){ return cams.map(c => ({kind: "videoinput", label: c.label, deviceId: c.label})); }
  }}});
  globalThis.BodyCore = vm.runInNewContext(core + "\nBodyCore;", {navigator: globalThis.navigator, performance, console});
}
const video = {play: async () => {}, videoWidth: 640, videoHeight: 480};
const FRONT = {label: "Front Camera", facing: "user"};
(async () => {
  const cases = [
    ["ultra-wide listed", [FRONT, {label: "Back Camera", facing: "environment", default: true}, {label: "Back Ultra Wide Camera", facing: "environment"}], {}],
    ["no ultra-wide, zoom to 0.5", [FRONT, {label: "Back Dual Wide Camera", facing: "environment", default: true}], {zoomMin: 0.5}],
    ["main back camera only", [FRONT, {label: "Back Camera", facing: "environment", default: true}], {}],
    ["back camera refused", [FRONT], {envFails: true}],
  ];
  for (const [name, cams, opts] of cases){
    setup(cams, opts);
    const info = await BodyCore.openCamera("living_room", video);
    console.log(name.padEnd(28), "->", info.mode.key, info.mode.camera, info.mode.orient, info.mode.frame, "|", info.label);
  }
  setup([FRONT]);
  const P = (o) => BodyCore.pickMode(o);
  console.log("pickMode phone+tv:", P({device:"phone", screen:"tv"}), "| tablet:", P({device:"tablet"}), "| laptop:", P({device:"laptop"}),
    "| phone upright:", P({device:"phone", screen:"device", isVertical:true}), "| phone sideways:", P({device:"phone", screen:"device"}));
})();
