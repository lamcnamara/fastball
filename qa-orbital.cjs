// Reproduce the Orbital playtest with node qa-orbital.cjs.
const assert=require('node:assert/strict');
const {flight:f,gameMath,randomStream}=require('./qa-flight.cjs');
const count=2000, trials=3, randomIndex=f.scenarios.length;
const draw=randomStream(0x0B17A1);
f.start(0,'Orbital');
const reserve=f.state().oxygen;
assert.equal(reserve,450);

// Cross-check the closed-form propagator against independent RK4 integration of
// the differential equations. Test both directions along both orbital axes.
const n=2*Math.PI/5520;
const derivative=([x,y,vx,vy])=>[vx,vy,3*n*n*x+2*n*vy,-2*n*vx];
const add=(v,k,t)=>v.map((a,i)=>a+t*k[i]);
for(const start of [...f.scenarios,{x:-20,y:8,vx:-.09,vy:.06}]){
  let v=[start.x,start.y,start.vx,start.vy];
  for(let t=0;t<900;t++){
    const a=derivative(v),b=derivative(add(v,a,.5)),c=derivative(add(v,b,.5)),d=derivative(add(v,c,1));
    v=v.map((x,i)=>x+(a[i]+2*b[i]+2*c[i]+d[i])/6);
  }
  const end=f.orbitalMotion(start,900);
  for(const [i,key] of ['x','y','vx','vy'].entries())assert(Math.abs(v[i]-end[key])<1e-8,'propagator '+key);
}

const profiles=[
  {name:'Nominal route, zero release error',nominal:true},
  {name:'Exact aim and power, flight scatter'},
  {name:'Aim ±1°, power ±1 point',aim:1,power:1},
  {name:'Aim ±2°, power ±2 points',aim:2,power:2},
  {name:'Launch 15 seconds late',delay:15},
  {name:'Aim ±5°, power ±5 points',aim:5,power:5},
  {name:'Aim ±5°, power ±5 points + midpoint trim',aim:5,power:5,trim:true}
];

function fly(start,index,plan,profile,seed){
  const pilot=randomStream(seed);
  gameMath.random=profile.nominal?()=>.5:randomStream(seed ^ 0xAF35BB17);
  const slip=(stream,amplitude)=>(stream()*2-1)*amplitude;
  f.start(index,'Orbital',start);
  const s=f.state();
  if(profile.delay){f.toggleClock();f.advance(profile.delay);}
  function release(steps){
    for(const [j,step] of steps.entries()){
      if(j)f.advance(4);
      if(s.phase==='ended')break;
      const bearing=step.bearing+Math.round(slip(pilot,profile.aim || 0));
      const power=Math.min(100,Math.max(10,step.power+Math.round(slip(pilot,profile.power || 0))));
      f.release(step.i,power,bearing);
    }
  }
  release(plan);
  if(profile.trim && s.phase==='flying'){
    const forecast=f.orbitalCourse(s,s.oxygen);
    if(forecast.eta===null || forecast.arrivalSpeed>f.captureSpeedLimit){
      f.advance((forecast.eta ?? forecast.closestTime)/2);
      const trim=f.orbitalRecovery(s,s.mask,s.oxygen);
      if(trim)release(trim);
    }
  }
  // Counterfactual for the same final coast if the reach zone grew to 1.6 m.
  const wide=f.orbitalCourse(s,s.oxygen,1.6);
  f.advance(s.oxygen+1);
  return {won:s.result?.title==='Capture confirmed',wide:wide.eta!==null && wide.arrivalSpeed<=f.captureSpeedLimit,
    throws:s.throws,time:s.elapsed,speed:Math.hypot(s.vx,s.vy),budget:f.budget(s.mask)};
}

for(const [i,s] of f.scenarios.entries()){
  const plan=f.orbitalRecovery(s);
  assert(plan,'no solution for '+s.name);
  const result=fly(s,i,plan,profiles[0],73);
  assert(result.won,s.name);
  console.log(s.name,JSON.stringify(plan.map(t=>[f.gear[t.i].name,t.bearing,t.power])),result);
}

// Use the grey arrow and rounded telemetry to aim. Only a committed release
// unlocks the HUD's safe-coast verdict. Check for a trim at 10 s and halfway.
function flyByInstruments(start,index,seed) {
  const pilot=randomStream(seed);
  gameMath.random=randomStream(seed ^ 0xAF35BB17);
  f.start(index,'Orbital',start);
  const s=f.state();
  const gap=()=>Math.round((Math.hypot(s.x,s.y)-f.captureRadius)*100)/100;
  const halfway=gap()/2;
  function pitch() {
    const range=gap(), lead=range>12?20:range>6?10:5;
    const hatch=Math.round(Math.atan2(-s.y,-s.x)*180/Math.PI);
    const heading=(hatch+lead)*Math.PI/180;
    const speed=Math.min(.075,Math.max(.065,(range+f.captureRadius)/(.85*s.oxygen)));
    const dx=Math.round(s.vx*1000)/1000-speed*Math.cos(heading);
    const dy=Math.round(s.vy*1000)/1000-speed*Math.sin(heading);
    const wanted=Math.hypot(dx,dy), bearing=Math.round(Math.atan2(dy,dx)*180/Math.PI);
    const tools=f.gear.flatMap((tool,i)=>(s.mask & (1<<i))?
      [{i,max:tool.speed*tool.mass/f.massOf(s.mask)}]:[]).sort((a,b)=>a.max-b.max);
    const tool=tools.find(t=>t.max>=wanted) ?? tools.at(-1);
    const power=Math.round(100*wanted/tool.max)+Math.round(4*pilot()-2);
    f.release(tool.i,Math.min(100,Math.max(10,power)),bearing+Math.round(4*pilot()-2));
  }
  pitch();
  if(!f.safeCoast(f.flightCourse())){
    f.advance(10);
    if(s.phase==='flying')pitch();
  }
  if(s.phase==='flying' && !f.safeCoast(f.flightCourse())){
    while(s.phase==='flying' && gap()>halfway)f.advance(5);
    if(s.phase==='flying')pitch();
  }
  f.advance(s.oxygen+1);
  return s.result?.title==='Capture confirmed';
}

const example='O1K7EDPYT3',fixture=f.decodeSeed(example);
assert.equal(f.encodeSeed(fixture),example);
assert.equal(f.readSeedInput(example.toLowerCase()).level,'Orbital');
assert.equal(f.readSeedInput('https://example.test/#seed='+example+'&level=Easy').level,'Orbital');
assert.equal(f.readSeedInput(f.scenarioLink(example,'Hard','two')).goal,'two');
assert.equal(f.decodeSeed('F1'+example.slice(2)),null);
assert.equal(f.readSeedInput('F1N73CGPHF').level,null);
for(const delta of [0,.00001]){
  const tangent=f.orbitalMotion({x:f.captureRadius+delta,y:0,vx:0,vy:.2},-5);
  const path=f.orbitalCourse(tangent,12);
  if(delta)assert.equal(path.eta,null);else assert(Math.abs(path.eta-5)<.00001);
}
for(const arrivalSpeed of [.079,.080,.081]){
  f.start(0,'Orbital');const s=f.state();
  Object.assign(s,f.orbitalMotion({x:1.2,y:0,vx:-arrivalSpeed,vy:0},-200));s.oxygen=200;
  f.toggleClock();const path=f.flightCourse();
  assert(Math.abs(path.eta-200)<1e-7 && Math.abs(path.arrivalSpeed-arrivalSpeed)<1e-9);
  assert.equal(f.safeCoast(path),arrivalSpeed<=.080);
  f.advance(1000);assert.equal(s.result.title,arrivalSpeed<=.080?'Capture confirmed':'Approach too fast');
}
for(const [index,start] of f.scenarios.entries()){
  gameMath.random=()=>.5;
  f.start(index,'Orbital');const s=f.state();
  for(const [j,k] of f.orbitalRecovery(s).entries()){
    if(j)f.advance(4);f.release(k.i,k.power,k.bearing);
  }
  const expected=s.elapsed+f.flightCourse().eta;
  f.coastToHatch();assert.equal(s.midpointThrow,s.throws);
  assert(Math.abs(Math.hypot(s.x,s.y)-f.captureRadius-s.halfwayGap)<1e-8);
  f.coastToHatch();f.advance(reserve);
  assert.equal(s.result.title,'Capture confirmed');assert(Math.abs(s.elapsed-expected)<1e-7);
}

let instrumentWins=0;
const instrumentCount=300;
const totals=profiles.map(()=>({wins:0,wide:0,maxThrows:0}));
const lengths={},seen=new Set(), positions=new Set(), directions=new Set();
let leastBudget=Infinity,longest=0,maxSpeed=0;
for(let i=0;i<count;i++){
  const start=f.generateDrift(draw,'Orbital');
  assert(start.orbital && f.decodeSeed(start.seed)?.seed===start.seed);
  assert.equal(f.orbitalCourse(start,reserve).eta,null,'free capture');
  seen.add(start.seed);positions.add(Math.sign(start.x)+','+Math.sign(start.y));
  directions.add(Math.sign(start.vx)+','+Math.sign(start.vy));
  const plan=f.orbitalRecovery(start), delayed=f.orbitalRecovery(f.orbitalMotion(start,30),f.fullMask,reserve-30);
  assert(plan && delayed,start.seed);
  assert(fly(start,randomIndex,delayed,{delay:30,nominal:true},i).won,'no recovery after 30s '+start.seed);
  if(i<instrumentCount && flyByInstruments(start,randomIndex,(i+1)*73))instrumentWins++;
  lengths[plan.length]=(lengths[plan.length]||0)+1;
  for(const [j,profile] of profiles.entries()){
    const repetitions=profile.nominal?1:trials;
    for(let r=0;r<repetitions;r++){
      const seed=(Math.imul(i+1,2654435761)+Math.imul(r,2246822519))>>>0;
      const result=fly(start,randomIndex,plan,profile,seed), total=totals[j];
      if(result.won)total.wins++;
      if(result.wide)total.wide++;
      total.maxThrows=Math.max(total.maxThrows,result.throws);
      if(!j){
        assert(result.won,start.seed);
        longest=Math.max(longest,result.time);maxSpeed=Math.max(maxSpeed,result.speed);
        leastBudget=Math.min(leastBudget,result.budget);
      }
    }
  }
}
assert.equal(seen.size,count);
for(const x of [-1,1])for(const y of [-1,1])assert(positions.has(x+','+y) && directions.has(x+','+y));
console.log({starts:count,planLengths:lengths,longest,maxSpeed,leastBudget});
profiles.forEach((p,i)=>console.log(p.name,'/',count*(p.nominal?1:trials),totals[i]));
console.log('Manual aim with committed coast, up to three throws with ±2°/±2 points:',instrumentWins,'/',instrumentCount);
