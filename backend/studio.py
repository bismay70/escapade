"""Durable, bounded graph execution. Nodes are trusted application operations, not code."""
import asyncio
import json
import time
from uuid import uuid4
from typing import Literal
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field, model_validator
from backend.models import Preferences
from backend.telemetry import step_span
from backend.studio_storage import studio_store

TOOLS = ['hotels', 'flights', 'weather', 'activities']

class Strict(BaseModel):
    model_config = ConfigDict(extra='forbid', str_strip_whitespace=True)

class Node(Strict):
    id: str = Field(pattern=r'^[a-zA-Z0-9_-]{1,40}$')
    kind: Literal['research', 'approval', 'condition', 'note', 'finish']
    label: str = Field(min_length=1, max_length=100)
    instruction: str = Field(default='', max_length=2000)
    tools: list[Literal['hotels', 'flights', 'weather', 'activities']] = Field(default_factory=lambda: TOOLS.copy(), max_length=4)
    next: str | None = None
    otherwise: str | None = None
    condition: Literal['has_sources', 'ai_response'] = 'has_sources'

class Definition(Strict):
    name: str = Field(min_length=1, max_length=100)
    nodes: list[Node] = Field(min_length=1, max_length=16)
    @model_validator(mode='after')
    def graph(self):
        ids = [n.id for n in self.nodes]
        if len(set(ids)) != len(ids):
            raise ValueError('Node IDs must be unique.')
        mapping = {n.id:n for n in self.nodes}
        visited, stack = set(), set()
        def visit(key):
            if key in stack: raise ValueError('Cycles are not allowed.')
            if key in visited: return
            if key not in mapping: raise ValueError('An edge points to a missing node.')
            stack.add(key)
            n=mapping[key]
            if n.kind == 'finish' and (n.next or n.otherwise): raise ValueError('Finish nodes cannot have outgoing edges.')
            if n.kind == 'condition' and (not n.next or not n.otherwise): raise ValueError('Conditions need both branches.')
            if n.kind != 'finish' and not n.next: raise ValueError('Each non-final node needs a next step.')
            if n.kind != 'condition' and n.otherwise: raise ValueError('Only conditions can have an alternative branch.')
            for target in (n.next,n.otherwise):
                if target: visit(target)
            stack.remove(key);visited.add(key)
        visit(ids[0])
        if len(visited)!=len(ids): raise ValueError('All nodes must be reachable from the first node.')
        return self

class Launch(Strict):
    definition_id: str
    message: str = Field(min_length=3, max_length=4000)

class Decision(Strict):
    action: Literal['approve','reject','resume','cancel']

class Schedule(Launch):
    due_at: float
    interval_minutes: int = Field(default=0, ge=0, le=525600)
    @model_validator(mode='after')
    def interval(self):
        if self.interval_minutes and self.interval_minutes<15: raise ValueError('Minimum repeat interval is 15 minutes.')
        if self.due_at < time.time()-60: raise ValueError('Choose a future start time.')
        return self

class Team(Strict):
    name: str = Field(min_length=1,max_length=100)

class Member(Strict):
    uid: str = Field(min_length=1,max_length=128,pattern=r'^[^/\s]+$')
    role: Literal['editor','reviewer','viewer']

class Engine:
    def __init__(self, store, agent):
        self.store,self.agent=studio_store(store),agent
        with self.store.connect() as c:
            c.executescript('''
            CREATE TABLE IF NOT EXISTS studio_teams(id TEXT PRIMARY KEY,name TEXT NOT NULL,owner TEXT NOT NULL);
            CREATE TABLE IF NOT EXISTS studio_members(team TEXT,identity TEXT,role TEXT,PRIMARY KEY(team,identity));
            CREATE TABLE IF NOT EXISTS studio_definitions(id TEXT PRIMARY KEY,scope TEXT,payload TEXT,updated REAL);
            CREATE TABLE IF NOT EXISTS studio_jobs(id TEXT PRIMARY KEY,scope TEXT,owner TEXT,status TEXT,payload TEXT,token TEXT,lease REAL,created REAL,updated REAL);
            CREATE INDEX IF NOT EXISTS studio_job_queue ON studio_jobs(status,lease);
            CREATE TABLE IF NOT EXISTS studio_events(id INTEGER PRIMARY KEY,job TEXT,scope TEXT,kind TEXT,payload TEXT,at REAL);
            CREATE TABLE IF NOT EXISTS studio_schedules(id TEXT PRIMARY KEY,scope TEXT,owner TEXT,payload TEXT,due REAL,interval INTEGER,enabled INTEGER);
            ''')

    def scope(self,sid,team=None,write=False,review=False):
        if not team:return sid
        with self.store.connect() as c:
            row=c.execute('SELECT role FROM studio_members WHERE team=? AND identity=?',(team,sid)).fetchone()
        if not row:raise HTTPException(404,'Workspace not found.')
        allowed={'owner','editor'} if write else {'owner','reviewer'} if review else {'owner','editor','reviewer','viewer'}
        if row['role'] not in allowed:raise HTTPException(403,'Your workspace role does not allow this action.')
        return 'team:'+team

    def event(self,c,job,scope,kind,payload=None):
        c.execute('INSERT INTO studio_events(job,scope,kind,payload,at) VALUES(?,?,?,?,?)',(job,scope,kind,json.dumps(payload or {}),time.time()))

    def save(self,scope,definition):
        key=str(uuid4())
        with self.store.connect() as c:
            c.execute('INSERT INTO studio_definitions VALUES(?,?,?,?)',(key,scope,definition.model_dump_json(),time.time()))
        return {'id':key,**definition.model_dump()}

    def enqueue(self,scope,sid,request,c=None):
        if c is None:
            with self.store.connect() as conn:
                conn.execute('BEGIN IMMEDIATE')
                return self.enqueue(scope,sid,request,conn)
        row=c.execute('SELECT payload FROM studio_definitions WHERE id=? AND scope=?',(request.definition_id,scope)).fetchone()
        if not row:raise HTTPException(404,'Workflow definition not found.')
        count=c.execute("SELECT COUNT(*) FROM studio_jobs WHERE scope=? AND status IN ('queued','running')",(scope,)).fetchone()[0]
        recent=c.execute('SELECT COUNT(*) FROM studio_jobs WHERE scope=? AND created>?',(scope,time.time()-60)).fetchone()[0]
        if count>=5 or recent>=10:raise HTTPException(429,'Workspace run limit reached. Try again later.')
        definition=json.loads(row['payload']);key=str(uuid4());now=time.time()
        # Profile/history intentionally stay private: team runs share only the output and selected preferences.
        payload={'definition':definition,'message':request.message,'preferences':self.store.profile(sid).model_dump(mode='json'),'cursor':definition['nodes'][0]['id'],'results':{},'attempts':0,'error':None}
        c.execute('INSERT INTO studio_jobs VALUES(?,?,?,?,?,?,?,?,?)',(key,scope,sid,'queued',json.dumps(payload),'',0,now,now))
        self.event(c,key,scope,'queued',{'actor':sid})
        return {'id':key,'status':'queued'}

    def claim(self):
        now=time.time()
        with self.store.connect() as c:
            c.execute('BEGIN IMMEDIATE')
            c.execute("UPDATE studio_jobs SET status='queued',token='',lease=0 WHERE status='running' AND lease<?",(now,))
            row=c.execute("SELECT * FROM studio_jobs WHERE status='queued' AND lease<=? ORDER BY created LIMIT 1",(now,)).fetchone()
            if not row:return None
            token=str(uuid4());p=json.loads(row['payload'])
            p['attempts']+=1
            if p['attempts']>3:
                c.execute("UPDATE studio_jobs SET status='dead_letter',updated=? WHERE id=?",(now,row['id']))
                self.event(c,row['id'],row['scope'],'dead_letter');return None
            c.execute("UPDATE studio_jobs SET status='running',token=?,lease=?,payload=?,updated=? WHERE id=?",(token,now+60,json.dumps(p),now,row['id']))
            self.event(c,row['id'],row['scope'],'claimed',{'attempt':p['attempts']})
            return {**dict(row),'token':token,'payload':p}

    def checkpoint(self,job,p,status='queued',kind='checkpoint',delay=0):
        with self.store.connect() as c:
            c.execute('BEGIN IMMEDIATE')
            changed=c.execute("UPDATE studio_jobs SET payload=?,status=?,token='',lease=?,updated=? WHERE id=? AND token=? AND status='running'",(json.dumps(p),status,time.time()+delay if delay else 0,time.time(),job['id'],job['token'])).rowcount
            if changed:self.event(c,job['id'],job['scope'],kind,{'node':p['cursor']})
            return bool(changed)

    async def heartbeat(self,job):
        while True:
            await asyncio.sleep(15)
            with self.store.connect() as c:
                c.execute("UPDATE studio_jobs SET lease=? WHERE id=? AND token=? AND status='running'",(time.time()+60,job['id'],job['token']))

    async def execute(self,job):
        p=job['payload'];node=next(n for n in p['definition']['nodes'] if n['id']==p['cursor'])
        heartbeat=asyncio.create_task(self.heartbeat(job))
        started=time.monotonic()
        span_context=step_span(job,node)
        span=span_context.__enter__()
        try:
            if node['kind']=='approval':
                self.checkpoint(job,p,'awaiting_review','approval_requested');return
            result={}
            next_node=node['next']
            if node['kind']=='research':
                prior=[{'role':'assistant','content':v.get('answer',''),'payload':None} for v in p['results'].values() if v.get('answer')]
                result=await asyncio.wait_for(self.agent.run(p['message']+'\nTask instructions: '+node['instruction'],Preferences.model_validate(p['preferences']),prior,allowed_tools=node['tools']),110)
            elif node['kind']=='condition':
                latest=next((r for r in reversed(list(p['results'].values())) if 'answer' in r),{})
                yes=bool(latest.get('sources')) if node['condition']=='has_sources' else latest.get('mode')=='ai'
                next_node=node['next'] if yes else node['otherwise'];result={'matched':yes}
            elif node['kind']=='note':result={'note':node['instruction']}
            elif node['kind']=='finish':result={'complete':True}
            result['duration_ms']=round((time.monotonic()-started)*1000)
            p['results'][node['id']]=result;p['cursor']=next_node;p['attempts']=0;p['error']=None
            self.checkpoint(job,p,'completed' if node['kind']=='finish' else 'queued','step_complete')
        except asyncio.CancelledError:
            self.checkpoint(job,p,'queued','worker_stopped');raise
        except Exception:
            span.set_attribute("workflow.failed",True)
            p['error']='This step failed. Provider details were withheld; completed checkpoints are retained.'
            retry=p['attempts']<3
            self.checkpoint(job,p,'queued' if retry else 'dead_letter','step_retry' if retry else 'dead_letter',delay=2**p['attempts'] if retry else 0)
        finally:
            heartbeat.cancel();await asyncio.gather(heartbeat,return_exceptions=True)
            span_context.__exit__(None,None,None)

    def decide(self,scope,key,action,actor):
        with self.store.connect() as c:
            c.execute('BEGIN IMMEDIATE')
            row=c.execute('SELECT * FROM studio_jobs WHERE scope=? AND id=?',(scope,key)).fetchone()
            if not row:raise HTTPException(404,'Run not found.')
            p=json.loads(row['payload']);status=row['status']
            if action in ('approve','reject'):
                if status!='awaiting_review':raise HTTPException(409,'Run is not waiting for review.')
                if action=='approve':
                    node=next(n for n in p['definition']['nodes'] if n['id']==p['cursor'])
                    p['results'][node['id']]={'decision':'approved','actor':actor};p['cursor']=node['next'];p['attempts']=0;status='queued'
                else:status='rejected'
            elif action=='resume':
                if status not in ('failed','dead_letter'):raise HTTPException(409,'Only failed runs can resume.')
                p['attempts']=0;p['error']=None;status='queued'
            else:
                if status in ('completed','cancelled','rejected'):raise HTTPException(409,'Run has already ended.')
                status='cancelled'
            c.execute("UPDATE studio_jobs SET status=?,payload=?,token='',lease=0,updated=? WHERE id=?",(status,json.dumps(p),time.time(),key))
            self.event(c,key,scope,action,{'actor':actor})
        return {'id':key,'status':status}

    def tick_schedules(self):
        now=time.time()
        with self.store.connect() as c:
            c.execute('BEGIN IMMEDIATE')
            rows=c.execute('SELECT * FROM studio_schedules WHERE enabled=1 AND due<=? ORDER BY due LIMIT 10',(now,)).fetchall()
            for row in rows:
                # Removing a member revokes their scheduled team's execution too.
                if row['scope'].startswith('team:'):
                    role=c.execute('SELECT role FROM studio_members WHERE team=? AND identity=?',(row['scope'][5:],row['owner'])).fetchone()
                    if not role or role['role'] not in ('owner','editor'):
                        c.execute('UPDATE studio_schedules SET enabled=0 WHERE id=?',(row['id'],));continue
                try:self.enqueue(row['scope'],row['owner'],Launch.model_validate_json(row['payload']),c)
                except HTTPException as e:
                    if e.status_code==429:continue
                    c.execute('UPDATE studio_schedules SET enabled=0 WHERE id=?',(row['id'],));continue
                c.execute('UPDATE studio_schedules SET enabled=?,due=? WHERE id=?',(int(row['interval']>0),now+row['interval']*60,row['id']))

    async def worker(self):
        while True:
            self.tick_schedules()
            job=self.claim()
            if job:await self.execute(job)
            else:await asyncio.sleep(1)

    def snapshot(self,scope):
        with self.store.connect() as c:
            definitions=[{'id':r['id'],**json.loads(r['payload'])} for r in c.execute('SELECT * FROM studio_definitions WHERE scope=? ORDER BY updated DESC LIMIT 100',(scope,))]
            runs=[{'id':r['id'],'status':r['status'],'created_at':r['created'],**json.loads(r['payload'])} for r in c.execute('SELECT * FROM studio_jobs WHERE scope=? ORDER BY created DESC LIMIT 100',(scope,))]
            schedules=[{'id':r['id'],'due_at':r['due'],'interval_minutes':r['interval'],'enabled':bool(r['enabled']),**json.loads(r['payload'])} for r in c.execute('SELECT * FROM studio_schedules WHERE scope=? ORDER BY due LIMIT 100',(scope,))]
            events=[{'id':r['id'],'run_id':r['job'],'kind':r['kind'],'at':r['at'],'data':json.loads(r['payload'])} for r in c.execute('SELECT * FROM studio_events WHERE scope=? ORDER BY id DESC LIMIT 200',(scope,))]
            counts={r['status']:r['n'] for r in c.execute('SELECT status,count(*) n FROM studio_jobs WHERE scope=? GROUP BY status',(scope,))}
        return {'definitions':definitions,'runs':runs,'schedules':schedules,'events':events,'metrics':counts}


def register_studio(app,session):
    engine=Engine(app.state.store,app.state.agent);app.state.studio=engine
    router=APIRouter(prefix='/api/studio')
    @router.get('')
    async def snapshot(team: str|None=None,sid=Depends(session)):
        scope=engine.scope(sid,team)
        with engine.store.connect() as c:
            teams=[dict(r) for r in c.execute('SELECT t.id,t.name,m.role FROM studio_teams t JOIN studio_members m ON t.id=m.team WHERE m.identity=?',(sid,))]
            members=[dict(r) for r in c.execute('SELECT identity,role FROM studio_members WHERE team=?',(team,))] if team else []
        return {**engine.snapshot(scope),'teams':teams,'members':members,'identity':sid}
    @router.post('/definitions')
    async def save(body:Definition,team:str|None=None,sid=Depends(session)):
        return engine.save(engine.scope(sid,team,write=True),body)
    @router.post('/runs')
    async def launch(body:Launch,team:str|None=None,sid=Depends(session)):
        scope=engine.scope(sid,team,write=True)
        if hasattr(engine.store,'sync_profile'):engine.store.sync_profile(sid)
        return engine.enqueue(scope,sid,body)
    @router.post('/runs/{key}')
    async def decide(key:str,body:Decision,team:str|None=None,sid=Depends(session)):
        scope=engine.scope(sid,team,write=body.action in ('resume','cancel'),review=body.action in ('approve','reject'))
        return engine.decide(scope,key,body.action,sid)
    @router.post('/schedules')
    async def schedule(body:Schedule,team:str|None=None,sid=Depends(session)):
        scope=engine.scope(sid,team,write=True);key=str(uuid4())
        if hasattr(engine.store,'sync_profile'):engine.store.sync_profile(sid)
        with engine.store.connect() as c:
            c.execute('BEGIN IMMEDIATE')
            if not c.execute('SELECT id FROM studio_definitions WHERE id=? AND scope=?',(body.definition_id,scope)).fetchone():raise HTTPException(404,'Definition not found.')
            if c.execute('SELECT COUNT(*) FROM studio_schedules WHERE scope=? AND enabled=1',(scope,)).fetchone()[0]>=10:raise HTTPException(429,'Limit of 10 active schedules.')
            c.execute('INSERT INTO studio_schedules VALUES(?,?,?,?,?,?,1)',(key,scope,sid,Launch(**body.model_dump(include={'definition_id','message'})).model_dump_json(),body.due_at,body.interval_minutes))
        return {'id':key}
    @router.delete('/schedules/{key}')
    async def cancel_schedule(key:str,team:str|None=None,sid=Depends(session)):
        scope=engine.scope(sid,team,write=True)
        with engine.store.connect() as c:c.execute('UPDATE studio_schedules SET enabled=0 WHERE id=? AND scope=?',(key,scope))
        return {'success':True}
    @router.post('/teams')
    async def team(body:Team,sid=Depends(session)):
        if not sid.startswith('user:'):raise HTTPException(401,'Sign in to create a shared workspace.')
        key=str(uuid4())
        with engine.store.connect() as c:
            c.execute('INSERT INTO studio_teams VALUES(?,?,?)',(key,body.name,sid));c.execute('INSERT INTO studio_members VALUES(?,?,?)',(key,sid,'owner'))
        return {'id':key}
    @router.post('/teams/{key}/members')
    async def member(key:str,body:Member,sid=Depends(session)):
        with engine.store.connect() as c:
            c.execute('BEGIN IMMEDIATE')
            if not c.execute('SELECT id FROM studio_teams WHERE id=? AND owner=?',(key,sid)).fetchone():raise HTTPException(403,'Only the workspace owner can manage members.')
            identity='user:'+body.uid
            if identity==sid:raise HTTPException(422,'The owner role cannot be changed.')
            c.execute('INSERT INTO studio_members VALUES(?,?,?) ON CONFLICT(team,identity) DO UPDATE SET role=excluded.role',(key,identity,body.role))
        return {'success':True}
    @router.delete('/teams/{key}/members/{uid}')
    async def remove_member(key:str,uid:str,sid=Depends(session)):
        with engine.store.connect() as c:
            c.execute('BEGIN IMMEDIATE')
            if not c.execute('SELECT id FROM studio_teams WHERE id=? AND owner=?',(key,sid)).fetchone():raise HTTPException(403,'Only the workspace owner can manage members.')
            if 'user:'+uid==sid:raise HTTPException(422,'Cannot remove the owner.')
            c.execute('DELETE FROM studio_members WHERE team=? AND identity=?',(key,'user:'+uid))
        return {'success':True}
    app.include_router(router)
