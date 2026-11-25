// Reproduce the Orbital playtest with node qa-orbital.cjs.
const assert=require('node:assert/strict');
const {flight:f,randomStream}=require('./qa-flight.cjs');
const count=2000, trials=3, randomIndex=f.scenarios.length;
const draw=randomStream(0x0B17A1);

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
  {name:'Exact controls'},
  {name:'Aim ±1°, power ±1 point',aim:1,power:1},
  {name:'Aim ±2°, power ±2 points',aim:2,power:2},
  {name:'Same + Hard scatter ±2°',aim:2,power:2,scatter:2},
  {name:'Launch 15 seconds late',delay:15},
  {name:'Aim ±5°, power ±5 points',aim:5,power:5},
  {name:'Aim ±5°, power ±5 points + midpoint trim',aim:5,power:5,trim:true}
];

function fly(start,index,plan,profile,seed){
  const pilot=randomStream(seed), scatter=randomStream(seed ^ 0xAF35BB17);
  const slip=(stream,amplitude)=>(stream()*2-1)*amplitude;
  f.start(index,'Orbital',start);
  const s=f.state();
  if(profile.delay){f.toggleClock();f.advance(profile.delay);}
  function release(steps){
    for(const [j,step] of steps.entries()){
      if(j)f.advance(4);
      if(s.phase==='ended')break;
      const bearing=step.bearing+Math.round(slip(pilot,profile.aim || 0))+slip(scatter,profile.scatter || 0);
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

// This pilot gets rounded instrument readings and tries a small menu of throw
// previews. It never calls the transfer solver or reads a seed's recovery plan.
function flyByForecast(start,index,seed) {
  const pilot=randomStream(seed);
  f.start(index,'Orbital',start);
  const s=f.state();
  for(let attempt=0;attempt<3;attempt++){
    const current=f.flightCourse();
    if(f.safeCoast(current) || s.phase==='ended')break;
    const range=Math.round((Math.hypot(s.x,s.y)-f.captureRadius)*100)/100+f.captureRadius;
    const angle=Math.round(Math.atan2(s.y,s.x)*180/Math.PI)*Math.PI/180;
    const vx=Math.round(s.vx*1000)/1000,vy=Math.round(s.vy*1000)/1000;
    const returnSpeed=Math.min(.065,Math.max(.04,range/(s.oxygen*.8)));
    const dx=vx+returnSpeed*Math.cos(angle),dy=vy+returnSpeed*Math.sin(angle);
    const bearing=Math.round(Math.atan2(dy,dx)*180/Math.PI),wanted=Math.hypot(dx,dy);
    const candidates=f.gear.flatMap((tool,i)=>{
      if(!(s.mask & (1<<i)))return [];
      const kick=tool.speed*tool.mass/f.massOf(s.mask);
      const power=Math.min(100,Math.max(10,Math.round(100*wanted/kick)));
      return [{i,power,error:Math.abs(wanted-kick*power/100)}];
    }).sort((a,b)=>a.error-b.error).slice(0,2);
    let best=null;
    for(const tool of candidates){
      for(const turn of [0,-15,15,-30,30,-45,45])for(const change of [0,-10,10]){
        const power=Math.max(10,Math.min(100,tool.power+change)),aim=bearing+turn;
        const kick=f.impulse(tool.i,power,aim,s.mask);
        const preview=f.flightCourse(s.vx+kick.dx,s.vy+kick.dy);
        // Use only information the forecast prints: rail safety, ETA or miss distance.
        const safe=f.safeCoast(preview);
        const score=safe?-1000+Math.ceil(preview.eta)/1000:
          preview.eta!==null?10+Math.round(preview.arrivalSpeed*1000)/1000:Math.round(preview.clearance*100)/100;
        if(!best || score<best.score)best={i:tool.i,power,aim,score};
      }
    }
    f.release(best.i,Math.min(100,Math.max(10,best.power+Math.round(4*pilot()-2))),
      best.aim+Math.round(4*pilot()-2));
    const path=f.flightCourse();
    if(f.safeCoast(path))break;
    f.advance(Math.min(60,Math.max(4,(path.eta ?? path.closestTime)/2)));
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
  f.start(index,'Orbital');const s=f.state();
  for(const [j,k] of f.orbitalRecovery(s).entries()){
    if(j)f.advance(4);f.release(k.i,k.power,k.bearing);
  }
  const expected=s.elapsed+f.flightCourse().eta;
  f.coastToHatch();assert.equal(s.midpointThrow,s.throws);
  assert(Math.abs(Math.hypot(s.x,s.y)-f.captureRadius-s.halfwayGap)<1e-8);
  f.coastToHatch();f.advance(900);
  assert.equal(s.result.title,'Capture confirmed');assert(Math.abs(s.elapsed-expected)<1e-7);
}

let forecastWins=0;
const forecastCount=300;
const totals=profiles.map(()=>({wins:0,wide:0,maxThrows:0}));
const lengths={},seen=new Set(), positions=new Set(), directions=new Set();
let leastBudget=Infinity,longest=0,maxSpeed=0;
for(let i=0;i<count;i++){
  const start=f.generateDrift(draw,'Orbital');
  assert(start.orbital && f.decodeSeed(start.seed)?.seed===start.seed);
  assert.equal(f.orbitalCourse(start,900).eta,null,'free capture');
  seen.add(start.seed);positions.add(Math.sign(start.x)+','+Math.sign(start.y));
  directions.add(Math.sign(start.vx)+','+Math.sign(start.vy));
  const plan=f.orbitalRecovery(start), delayed=f.orbitalRecovery(f.orbitalMotion(start,30),f.fullMask,870);
  assert(plan && delayed,start.seed);
  assert(fly(start,randomIndex,delayed,{delay:30},i).won,'no recovery after 30s '+start.seed);
  if(i<forecastCount && flyByForecast(start,randomIndex,(i+1)*73))forecastWins++;
  lengths[plan.length]=(lengths[plan.length]||0)+1;
  for(const [j,profile] of profiles.entries()){
    const repetitions=profile.aim?trials:1;
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
profiles.forEach((p,i)=>console.log(p.name,'/',count*(p.aim?trials:1),totals[i]));
console.log('Forecast-only pilot, up to three throws with ±2°/±2 points:',forecastWins,'/',forecastCount);
