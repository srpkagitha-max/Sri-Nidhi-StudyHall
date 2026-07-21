(function(){
'use strict';
let cloud={ready:false,loading:false,db:null,unsub:null,pushTimer:null,lastRemoteAt:0};
const statusText=()=>cloud.ready?'Connected':'Not connected';
function parseConfig(){try{const raw=db?.settings?.firebaseConfig||localStorage.getItem('sriNidhiFirebaseConfig')||'';return raw?JSON.parse(raw):null}catch{return null}}
function siteId(){return String(db?.settings?.firebaseSiteId||'sri-nidhi-main').trim().replace(/[^a-zA-Z0-9_-]/g,'-')||'sri-nidhi-main'}
async function importFirebase(){
 const [app,auth,fs]=await Promise.all([
  import('https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js'),
  import('https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js'),
  import('https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js')
 ]);return {app,auth,fs};
}
function setCloudBadge(text,ok){
 document.querySelectorAll('.cloud-status').forEach(x=>{x.textContent=text;x.classList.toggle('ok',!!ok);x.classList.toggle('bad',!ok)});
}
async function initCloud(force=false){
 if(cloud.loading||cloud.ready&&!force)return cloud.ready;
 const cfg=parseConfig();if(!cfg?.apiKey||!cfg?.projectId){setCloudBadge('Firebase not configured',false);return false}
 cloud.loading=true;setCloudBadge('Connecting…',false);
 try{
  if(cloud.unsub){cloud.unsub();cloud.unsub=null}
  const {app,auth,fs}=await importFirebase();
  const firebaseApp=app.getApps().length?app.getApp():app.initializeApp(cfg);
  const a=auth.getAuth(firebaseApp);await auth.signInAnonymously(a);
  const fdb=fs.getFirestore(firebaseApp);cloud.db=fdb;
  const ref=fs.doc(fdb,'studyHalls',siteId());
  cloud.unsub=fs.onSnapshot(ref,snap=>{
    if(!snap.exists()){window.cloudSyncPush(true);return}
    const remote=snap.data();const remoteDb=remote.database;if(!remoteDb)return;
    const remoteTime=Date.parse(remoteDb.meta?.updatedAt||0),localTime=Date.parse(db.meta?.updatedAt||0);
    if(remoteTime>localTime+1000){window.__cloudApplying=true;db={...clone(defaultDB),...remoteDb,settings:{...clone(defaultDB.settings),...(remoteDb.settings||{})}};localStorage.setItem(DB_KEY,JSON.stringify(db));window.__cloudApplying=false;cloud.lastRemoteAt=Date.now();refreshCurrentView();}
    setCloudBadge('Firebase connected',true);
  },e=>{console.error(e);cloud.ready=false;setCloudBadge('Firebase error',false)});
  cloud.ready=true;setCloudBadge('Firebase connected',true);return true;
 }catch(e){console.error(e);cloud.ready=false;setCloudBadge('Firebase connection failed',false);return false}finally{cloud.loading=false}
}
function refreshCurrentView(){
 try{if(!el('studentAppView').classList.contains('hidden'))renderStudentPage(document.querySelector('#studentNav button.active')?.dataset.studentPage||'overview');else if(!el('appView').classList.contains('hidden'))render(currentPage,false)}catch(e){console.warn(e)}
}
window.cloudSyncPush=function(immediate=false){
 clearTimeout(cloud.pushTimer);cloud.pushTimer=setTimeout(async()=>{
  if(!cloud.ready){await initCloud();if(!cloud.ready)return}
  try{
   const {fs}=await importFirebase();const ref=fs.doc(cloud.db,'studyHalls',siteId());
   const payload=clone(db);payload.meta=payload.meta||{};payload.meta.updatedAt=new Date().toISOString();
   await fs.setDoc(ref,{database:payload,siteId:siteId(),updatedAt:fs.serverTimestamp()},{merge:false});setCloudBadge('Firebase synced',true);
  }catch(e){console.error(e);setCloudBadge('Sync failed',false)}
 },immediate?0:700);
};
window.saveFirebaseSetup=async function(){
 const raw=el('firebaseConfigInput')?.value.trim()||'',sid=el('firebaseSiteIdInput')?.value.trim()||'sri-nidhi-main';
 try{const cfg=JSON.parse(raw);if(!cfg.apiKey||!cfg.projectId||!cfg.appId)throw Error('Required keys missing');db.settings.firebaseConfig=JSON.stringify(cfg);db.settings.firebaseSiteId=sid;localStorage.setItem('sriNidhiFirebaseConfig',db.settings.firebaseConfig);saveDB();cloud.ready=false;await initCloud(true);if(cloud.ready){window.cloudSyncPush(true);alert('Firebase cloud sync connected successfully.')}}catch(e){alert('Invalid Firebase config JSON. Copy the complete Firebase web app config object.')}};
window.testFirebaseSync=async function(){const ok=await initCloud(true);alert(ok?'Firebase connection successful.':'Firebase connection failed. Check config, Anonymous Authentication and Firestore rules.')};
function cloudCard(){return `<div class="card firebase-card"><div class="card-heading-row"><div><h3>Firebase Cloud Sync</h3><p class="muted">Student phone and admin phone data will sync through Firestore.</p></div><span class="cloud-status ${cloud.ready?'ok':'bad'}">${statusText()}</span></div><div class="form-grid"><div class="field span-2"><label>Firebase Web Config (JSON)</label><textarea id="firebaseConfigInput" rows="8" placeholder='{"apiKey":"...","authDomain":"...","projectId":"...","appId":"..."}'>${esc(db.settings.firebaseConfig||'')}</textarea></div><div class="field"><label>Study Hall Site ID</label><input id="firebaseSiteIdInput" value="${esc(db.settings.firebaseSiteId||'sri-nidhi-main')}"></div></div><div class="actions"><button class="primary" onclick="saveFirebaseSetup()">Save & Connect Firebase</button><button class="secondary" onclick="testFirebaseSync()">Test Connection</button></div><p class="muted">Firebase Console lo Anonymous Authentication enable cheyyali. Firestore Database create cheyyali.</p></div>`}
const obs=new MutationObserver(()=>{
 const content=el('pageContent');if(!content||currentPage!=='settings'||el('firebaseConfigInput'))return;content.insertAdjacentHTML('beforeend',cloudCard());
});obs.observe(document.documentElement,{childList:true,subtree:true});
window.addEventListener('load',()=>setTimeout(()=>initCloud(),700));
})();
