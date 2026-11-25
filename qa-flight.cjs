// Both balance suites run the actual game with HUD painting disabled.
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const assert = require('node:assert/strict');

function randomStream(seed) {
  return () => {
    seed = (Math.imul(seed,1664525)+1013904223) >>> 0;
    return seed / 4294967296;
  };
}

const html = fs.readFileSync(path.join(__dirname,'index.html'),'utf8');
const script = html.split('<script>')[1].split('</script>')[0];
assert.match(script,/\ninit\(\);\s*$/);
const element = {focus:()=>{},getBBox: () => ({left:-22,right:22,top:-32,bottom:32})};
const gameMath = Object.create(Math);
const environment = {
  Math:gameMath, URLSearchParams, URL, performance, setTimeout:()=>0, clearTimeout, document:{getElementById:() => element},
  DOMRect:{fromRect:r => r}
};
const flight = vm.runInNewContext(script.replace(/\ninit\(\);\s*$/,'')+`
  measurePlot=renderGear=summary=()=>{};
  render=()=>{camera=plotCamera(state,plotW,plotH,plotH);};
  ({
    scenarios,gear,captureRadius,captureSpeedLimit,massOf,course,generateDrift,decodeSeed,recoveryPlan,
    orbitalMotion,orbitalCourse,orbitalRecovery,budget,fullMask,toggleClock,impulse,
    encodeSeed,readSeedInput,scenarioLink,flightCourse,safeCoast,coastToHatch,
    start:(i,level,drift)=>newFlight(i,level,'none','',drift), state:()=>state,
    release:(i,power,bearing)=>{selectTool(i);state.power=power;state.bearing=bearing;throwTool();},
    advance
  });
`,environment);

module.exports={flight,gameMath,randomStream};
