import asyncio
import time
from uuid import uuid4
import pytest
from fastapi import HTTPException
from pydantic import ValidationError
from backend.studio import Engine, Definition, Launch
from backend.storage import Store
from backend.memory import MemoryStore

class FakeAgent:
    def __init__(self):self.calls=[]
    async def run(self,message,preferences,history,**kwargs):
        self.calls.append(kwargs)
        return {'answer':'Evidence-based plan','mode':'ai','sources':[{'title':'Source','url':'https://example.com'}]}

def definition():
    return Definition(name='Trip',nodes=[{'id':'a','kind':'research','label':'Research','tools':['hotels'],'next':'b'}, {'id':'b','kind':'approval','label':'Review','next':'c'},{'id':'c','kind':'finish','label':'Done'}])

def setup(tmp_path):
    agent=FakeAgent();store=Store(tmp_path/'db.sqlite3');return Engine(store,agent),agent

def test_checkpoint_review_and_restart(tmp_path):
    e,a=setup(tmp_path);d=e.save('alice',definition());job=e.enqueue('alice','alice',Launch(definition_id=d['id'],message='Goa trip'))
    asyncio.run(e.execute(e.claim()))
    assert a.calls==[{'allowed_tools':['hotels']}]
    restarted=Engine(e.store,a)
    asyncio.run(restarted.execute(restarted.claim()))
    run=restarted.snapshot('alice')['runs'][0]
    assert run['status']=='awaiting_review' and run['results']['a']['answer']
    with pytest.raises(HTTPException):restarted.decide('bob',job['id'],'approve','bob')
    restarted.decide('alice',job['id'],'approve','alice')
    asyncio.run(restarted.execute(restarted.claim()))
    assert restarted.snapshot('alice')['runs'][0]['status']=='completed'
    assert len(a.calls)==1

def test_fencing_and_crash_recovery(tmp_path):
    e,a=setup(tmp_path);d=e.save('alice',definition());e.enqueue('alice','alice',Launch(definition_id=d['id'],message='Goa trip'))
    stale=e.claim();assert e.claim() is None
    with e.store.connect() as c:c.execute('UPDATE studio_jobs SET lease=0')
    newer=e.claim();assert newer['token']!=stale['token']
    assert not e.checkpoint(stale,stale['payload'])
    assert e.checkpoint(newer,newer['payload'])

def test_cancel_stops_late_commit(tmp_path):
    e,a=setup(tmp_path);d=e.save('alice',definition());j=e.enqueue('alice','alice',Launch(definition_id=d['id'],message='Goa trip'));job=e.claim()
    e.decide('alice',j['id'],'cancel','alice')
    assert not e.checkpoint(job,job['payload'])
    assert e.snapshot('alice')['runs'][0]['status']=='cancelled'

def test_graph_validation():
    with pytest.raises(ValidationError):Definition(name='cycle',nodes=[{'id':'a','kind':'note','label':'A','next':'a'}])
    with pytest.raises(ValidationError):Definition(name='missing',nodes=[{'id':'a','kind':'note','label':'A','next':'missing'}])
    with pytest.raises(ValidationError):Definition(name='hidden',nodes=[{'id':'a','kind':'finish','label':'A'},{'id':'b','kind':'finish','label':'B'}])

def test_rbac(tmp_path):
    e,a=setup(tmp_path)
    with e.store.connect() as c:
        for sid,role in [('o','owner'),('e','editor'),('r','reviewer'),('v','viewer')]:c.execute('INSERT INTO studio_members VALUES(?,?,?)',('team',sid,role))
    assert e.scope('e','team',write=True)=='team:team'
    assert e.scope('r','team',review=True)=='team:team'
    for sid,kwargs in [('v',{'write':True}),('e',{'review':True}),('r',{'write':True}),('stranger',{})]:
        with pytest.raises(HTTPException):e.scope(sid,'team',**kwargs)

def test_schedule_atomic_and_revocation(tmp_path):
    e,a=setup(tmp_path);d=e.save('alice',definition());body=Launch(definition_id=d['id'],message='Goa trip').model_dump_json()
    with e.store.connect() as c:c.execute('INSERT INTO studio_schedules VALUES(?,?,?,?,?,?,?)',('s','alice','alice',body,time.time()-5,0,1))
    e.tick_schedules();e.tick_schedules()
    assert len(e.snapshot('alice')['runs'])==1
    assert not e.snapshot('alice')['schedules'][0]['enabled']
    with e.store.connect() as c:c.execute('INSERT INTO studio_schedules VALUES(?,?,?,?,?,?,?)',('t','team:missing','user:gone',body,0,15,1))
    e.tick_schedules()
    assert not e.snapshot('team:missing')['schedules'][0]['enabled']

def test_failure_resume_and_dead_letter(tmp_path):
    e,a=setup(tmp_path);d=e.save('alice',definition());j=e.enqueue('alice','alice',Launch(definition_id=d['id'],message='Goa trip'))
    async def fail(*args,**kwargs):raise RuntimeError('secret-key-123')
    a.run=fail
    claimed=e.claim();claimed['payload']['attempts']=3
    asyncio.run(e.execute(claimed))
    assert 'secret' not in str(e.snapshot('alice'))
    assert e.snapshot('alice')['runs'][0]['status']=='dead_letter'
    e.decide('alice',j['id'],'resume','alice')
    for _ in range(3):
        assert e.claim()
        with e.store.connect() as c:c.execute('UPDATE studio_jobs SET lease=0')
    assert e.claim() is None
    assert e.snapshot('alice')['runs'][0]['status']=='dead_letter'

def test_memory_vector_update_delete_and_isolation(tmp_path):
    m=MemoryStore(tmp_path/'m.sqlite3')
    m.remember('a','food','vegan meals');m.remember('a','food','halal meals')
    assert len(m.recall('a'))==1 and m.recall('a')[0]['value']=='halal meals'
    assert m.recall('a','halal')[0]['key']=='food'
    assert not m.recall('b','halal')
    assert m.recall('a','!!!')==[]
    m.forget('a','food');assert not m.recall('a','halal')

def test_condition_branch(tmp_path):
    e,a=setup(tmp_path)
    d=Definition(name='Branch',nodes=[{'id':'check','kind':'condition','label':'Evidence?','next':'yes','otherwise':'no'},{'id':'yes','kind':'finish','label':'Yes'},{'id':'no','kind':'finish','label':'No'}])
    saved=e.save('a',d);e.enqueue('a','a',Launch(definition_id=saved['id'],message='Test branch'))
    asyncio.run(e.execute(e.claim()))
    assert e.snapshot('a')['runs'][0]['cursor']=='no'
    asyncio.run(e.execute(e.claim()))
    assert e.snapshot('a')['runs'][0]['status']=='completed'

def test_studio_api_scopes(tmp_path,monkeypatch):
    from backend.app import create_app
    from fastapi.testclient import TestClient
    monkeypatch.delenv('BACKEND_SERVICE_KEY',raising=False)
    app=create_app(store=Store(tmp_path/'api.sqlite3'),agent=FakeAgent())
    client=TestClient(app);a={'X-Session-Id':str(uuid4())};b={'X-Session-Id':str(uuid4())}
    d=client.post('/api/studio/definitions',headers=a,json=definition().model_dump()).json()
    assert client.get('/api/studio',headers=b).json()['definitions']==[]
    assert client.post('/api/studio/runs',headers=b,json={'definition_id':d['id'],'message':'Goa'}).status_code==404
    assert client.post('/api/studio/teams',headers=a,json={'name':'Team'}).status_code==401
    assert client.post('/api/studio/definitions',headers=a,json={'name':'bad','nodes':[]}).status_code==422
    assert client.post('/api/studio/runs',headers=a,json={'definition_id':d['id'],'message':'Goa'}).status_code==200
