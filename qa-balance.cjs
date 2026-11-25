// Run with node qa-balance.cjs.
const assert=require('node:assert/strict');
const {flight,gameMath,randomStream}=require('./qa-flight.cjs');

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

function fly(index,level,seed,recheck,fastLaunch,drift) {
  // Use paired, independent streams for release scatter and pilot inputs.
  const pilot = randomStream(seed);
  gameMath.random=randomStream(seed ^ 0x56e94517);
  flight.start(index,level,drift);
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

const randomIndex=flight.scenarios.length, draw=randomStream(0xFA57BA11);
const sampleCount=10000, seeds=new Set(), positionQuadrants=new Set(), driftQuadrants=new Set();
const lengths={}, hardResults={};
let firstAttemptWins=0, recoveries=0;
for(let n=0;n<sampleCount;n++){
  const start=flight.generateDrift(draw);
  seeds.add(start.seed);
  positionQuadrants.add([Math.sign(start.x),Math.sign(start.y)].join(','));
  driftQuadrants.add([Math.sign(start.vx),Math.sign(start.vy)].join(','));
  assert.deepEqual(flight.decodeSeed(start.seed),start);
  assert.equal(flight.course(start.x,start.y,start.vx,start.vy).eta,null,'free coast to hatch');
  for(const level of ['Story','Easy','Medium','Hard']){
    const plan=flight.recoveryPlan(start,level==='Story');
    assert(plan && plan.length,'missing recovery '+start.seed);
    if(level==='Hard')lengths[plan.length]=(lengths[plan.length]||0)+1;
    gameMath.random=()=>.5; // Nominal release, then exercise real scatter below.
    flight.start(randomIndex,level,start);
    for(const [i,step] of plan.entries()){
      if(i)flight.advance(4);
      flight.release(step.i,step.power,step.bearing);
    }
    flight.advance(900);
    const s=flight.state();
    assert.equal(s.result?.title,'Capture confirmed',level+' '+start.seed);
    assert(s.elapsed<=430 && Math.hypot(s.vx,s.vy)<=flight.captureSpeedLimit-.003);
  }
  for(let attempt=0;attempt<8;attempt++){
    const seed=(Math.imul(n+1,2654435761)+attempt)>>>0;
    const result=fly(randomIndex,'Hard',seed,true,false,start).result;
    if(attempt===0)hardResults[result]=(hardResults[result]||0)+1;
    if(result==='Capture confirmed'){recoveries++;if(!attempt)firstAttemptWins++;break;}
  }
}
for(const x of [-1,1])for(const y of [-1,1]){
  assert(positionQuadrants.has([x,y].join(',')) && driftQuadrants.has([x,y].join(',')));
}
assert(seeds.size>sampleCount*.99 && lengths[2]>sampleCount*.15,'insufficient variety');
assert.equal(recoveries,sampleCount,'failed to recover a sampled seed with Hard scatter');
console.log('Random starts:',sampleCount,'verified recoverable on all four difficulties; finite-rack plan lengths:',lengths);
console.log('Hard with scatter and imperfect controls:',firstAttemptWins,'first-attempt captures;',recoveries,'within eight attempts;',hardResults);
