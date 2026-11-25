// Run with node qa-balance.cjs. Uses the offline game's flight loop without painting a HUD.
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
const element = {getBBox: () => ({})};
const gameMath = Object.create(Math);
const environment = {
  Math:gameMath, performance, clearTimeout, document:{getElementById:() => element},
  DOMRect:{fromRect:r => r}
};
const flight = vm.runInNewContext(script.replace(/\ninit\(\);\s*$/,'')+`
  measurePlot=renderGear=render=summary=()=>{};
  ({
    scenarios,gear,captureRadius,captureSpeedLimit,massOf,course,
    start:(i,level,day)=>newFlight(i,level,'none','',day), state:()=>state,
    release:(i,power,bearing)=>{selectTool(i);state.power=power;state.bearing=bearing;throwTool();},
    advance
  });
`,environment);

// The pilot reads only the displayed precision of range, bearing and velocity.
function readInstruments(s) {
  const radius = flight.captureRadius;
  const range = Math.round((Math.hypot(s.x,s.y)-radius)*100)/100+radius;
  const bearing = Math.round(Math.atan2(s.y,s.x)*180/Math.PI)*Math.PI/180;
  return {x:range*Math.cos(bearing),y:range*Math.sin(bearing),
    vx:Math.round(s.vx*1000)/1000,vy:Math.round(s.vy*1000)/1000,mask:s.mask};
}

function planThrow(reading,targetSpeed) {
  const distance = Math.hypot(reading.x,reading.y);
  const dx = -reading.x/distance*targetSpeed-reading.vx;
  const dy = -reading.y/distance*targetSpeed-reading.vy;
  const desired = Math.hypot(dx,dy);
  const mass = flight.massOf(reading.mask);
  let best;
  flight.gear.forEach((tool,i) => {
    if (!(reading.mask & (1<<i))) return;
    const kick = tool.speed*tool.mass/mass;
    const power = Math.max(10,Math.min(100,Math.round(100*desired/kick)));
    const residual = Math.abs(desired-kick*power/100);
    if (!best || residual<best.residual) best={i,power,kick,residual};
  });
  if (!best) return null;
  best.bearing = Math.round(Math.atan2(-dy,-dx)*180/Math.PI);
  return best;
}

function fly(index,level,seed,recheck,fastLaunch,day) {
  // Use paired, independent streams for release scatter and pilot inputs.
  const pilot = randomStream(seed);
  gameMath.random=randomStream(seed ^ 0x56e94517);
  flight.start(index,level,day);
  const s=flight.state(), landingSpeed=flight.captureSpeedLimit*.92;
  const targetSpeed=fastLaunch?flight.captureSpeedLimit*1.5:landingSpeed;
  let estimate=readInstruments(s);
  function execute(plan) {
    const aimingSlip=Math.round((pilot()*2-1)*2);
    const powerSlip=Math.round((pilot()*2-1)*2);
    flight.release(plan.i,Math.max(10,Math.min(100,plan.power+powerSlip)),plan.bearing+aimingSlip);
  }
  // Prepare up to two launch throws, with a 3–8 second gap. Plan the second
  // from the nominal first throw, as a player using a prepared solution might.
  for(let n=0;n<2;n++) {
    const plan=planThrow(estimate,targetSpeed);
    if(!plan)break;
    execute(plan);
    const a=plan.bearing*Math.PI/180, kick=plan.kick*plan.power/100;
    estimate.vx-=Math.cos(a)*kick; estimate.vy-=Math.sin(a)*kick;
    estimate.mask^=1<<plan.i;
    if(plan.residual<.002)break;
    const delay=3+pilot()*5;
    flight.advance(delay);estimate.x+=estimate.vx*delay;estimate.y+=estimate.vy*delay;
  }
  if(recheck) {
    const travel=Math.hypot(estimate.x,estimate.y)/targetSpeed;
    flight.advance(travel*.5);
    if(s.phase==='flying'){
      estimate=readInstruments(s);
      const coast=flight.course(estimate.x,estimate.y,estimate.vx,estimate.vy);
      if(coast.eta===null || coast.eta>s.oxygen || Math.hypot(estimate.vx,estimate.vy)>flight.captureSpeedLimit){
        const trim=planThrow(estimate,landingSpeed);
        if(trim)execute(trim);
      }
    }
  }
  flight.advance(s.oxygen+1);
  return {result:s.result.title,throws:s.throws};
}

const samples=2000;
const profiles=[
  ['launch only',false,false], ['one course check',true,false],
  ['fast launch only',false,true], ['fast launch and brake',true,true]
];
for(const level of ['Medium','Hard']) {
  for(const [index,scenario] of flight.scenarios.entries()) {
    for(const [name,recheck,fast] of profiles) {
      const outcomes={}, tools=[];
      for(let i=0;i<samples;i++) {
        const seed=(Math.imul(i+1,2654435761)+index)>>>0;
        const run=fly(index,level,seed,recheck,fast);
        outcomes[run.result]=(outcomes[run.result] || 0)+1;
        tools.push(run.throws);
      }
      const wins=outcomes['Capture confirmed'] || 0;
      console.log(level,scenario.name,name,
        wins+'/'+samples,'('+((100*wins)/samples).toFixed(1)+'%)',
        'max throws',Math.max(...tools),JSON.stringify(outcomes));
      if(fast && !recheck)assert(outcomes['Approach too fast']>0,'Expected an overspeed arrival');
      else assert(wins>0,'No winning runs for '+scenario.name);
    }
  }
}

// A dated start should admit a legal capture with the same imperfect pilot and course check.
for(const level of ['Medium','Hard']) {
  for(let dayIndex=0;dayIndex<365;dayIndex++) {
    const day=new Date(Date.UTC(2027,0,dayIndex+1)).toISOString().slice(0,10);
    let captured=false;
    for(let attempt=0;attempt<8 && !captured;attempt++) {
      const seed=(Math.imul(dayIndex+1,2654435761)+attempt)>>>0;
      captured=fly(flight.scenarios.length,level,seed,true,false,day).result==='Capture confirmed';
    }
    assert(captured,'No daily capture for '+day+' on '+level);
  }
  console.log(level,'daily drift: verified a safe capture for all 365 sampled dates');
}
