#!/usr/bin/env node
// cellmate.mjs — the tiny agent from Episode 1, runnable standalone.
// Places the same three cells, fires the crossing, and narrates its intent.
// Semantics mirror SuperInstance/quilt packages/core (see comments inline);
// this is a teaching model — the repo is the source of truth.
const engine = {
  cells: new Map(),
  define(def){ this.cells.set(def.id, {def, value:{data:def.value,status:'ready'}, dependents:[], prev:undefined}); },
  link(id, ws){ for(const w of ws) this.cells.get(w).dependents.push(id); },
  async get(id){ const c=this.cells.get(id);
    if(c.def.kind!=='formula') return c.value;
    const prev=c.value; c.prev=prev.data;
    c.value={data:c.def.fn(this), status:'ready'};   // PATCH 9: pull seeds the graph
    return c.value; },
  async set(id,v){ const c=this.cells.get(id); const prev=c.value;
    c.value={data:v,status:'ready'};
    await this.propagate(id, prev.data, new Set()); },
  async propagate(changed, prevData, seen){
    if(seen.has(changed)) return; seen.add(changed);              // cycle guard
    const c=this.cells.get(changed);
    for(const depId of c.dependents){
      const dep=this.cells.get(depId);
      if(dep.def.kind==='formula') await this.get(depId);
      await this.propagate(depId, dep.def.kind==='formula'?dep.prev:prevData, seen); }
    for(const depId of c.dependents){
      const dep=this.cells.get(depId);
      if(dep.def.kind!=='listener' || !dep.def.watch.includes(changed)) continue;
      const ev={changed, prev:prevData, current:c.value.data};    // honest prev
      if(dep.def.condition && !dep.def.condition(ev)) continue;
      await dep.def.action(ev); }
  }
};
const intent = s => console.log(`🦀 “${s}”`);
intent('I want to know when it gets hot.');
engine.define({id:'temp', kind:'value', value:20});
intent('cool is 1, hot is 2 — but only when asked');
engine.define({id:'sev', kind:'formula', fn:e=>e.cells.get('temp').value.data>30?2:1});
intent('wake me when it changes — and only then');
engine.define({id:'alarm', kind:'listener', watch:['sev'],
  condition:ev=>ev.current!==ev.prev,
  action:async ev=>console.log(`🔔 alarm · ${JSON.stringify(ev)}`)});
engine.link('sev',['temp']); engine.link('alarm',['sev']);
console.log('pull sev →', (await engine.get('sev')).data, '(seeds the graph)');
console.log('set temp, 35 …');
await engine.set('temp', 35);
console.log('sev now →', (await engine.get('sev')).data);
