const DB_KEY='sriNidhiStudyHallV12';
const ATTENDANCE_BACKUP_KEY='sriNidhiAttendanceV293';
const LEGACY_DB_KEYS=['sriNidhiStudyHallV11','sriNidhiStudyHallV10','sriNidhiStudyHall','sriNidhiDB','studyHallDB'];
const defaultDB={
 meta:{schemaVersion:2,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()},
 settings:{hallName:'Sri Nidhi Study Hall',academicYear:'2026-27',phone:'',address:'',monthlyFee:1500,feeDueDay:10,adminUser:'admin',adminPass:'1234',autoBackupDays:7},
 students:[
  {id:'SN0001',name:'Anusha',gender:'Female',dob:'',phone:'9876543210',parentName:'',parentPhone:'9123456780',emergencyPhone:'',address:'',course:'DSC',batch:'Morning',seat:'G-01',joinDate:'2026-07-01',monthlyFee:1500,idProof:'',status:'Active',photo:''},
  {id:'SN0002',name:'Kavya',gender:'Female',dob:'',phone:'9876501234',parentName:'',parentPhone:'9012345678',emergencyPhone:'',address:'',course:'TET',batch:'Morning',seat:'G-02',joinDate:'2026-07-03',monthlyFee:1500,idProof:'',status:'Active',photo:''},
  {id:'SN0003',name:'Ramesh',gender:'Male',dob:'',phone:'9866001122',parentName:'',parentPhone:'9000011111',emergencyPhone:'',address:'',course:'Police',batch:'Evening',seat:'B-01',joinDate:'2026-07-05',monthlyFee:1500,idProof:'',status:'Active',photo:''}
 ],
 fees:[
  {id:uid(),studentId:'SN0001',month:'2026-07',amount:1500,paid:1500,date:'2026-07-05',mode:'UPI',receipt:'RC001'},
  {id:uid(),studentId:'SN0002',month:'2026-07',amount:1500,paid:500,date:'2026-07-06',mode:'Cash',receipt:'RC002'}
 ], attendance:[], movements:[], audit:[]
};
let db=loadDB(), currentPage='dashboard';
function uid(){return (crypto.randomUUID?.()||Date.now()+'-'+Math.random().toString(16).slice(2))}
function clone(v){return JSON.parse(JSON.stringify(v))}
function localISODate(value=new Date()){
 const d=value instanceof Date?value:new Date(value);
 if(Number.isNaN(d.getTime()))return '';
 const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,'0'),day=String(d.getDate()).padStart(2,'0');
 return `${y}-${m}-${day}`;
}
function normalizeArraySource(value){
 if(Array.isArray(value))return value;
 if(value&&typeof value==='object')return Object.values(value).filter(x=>x&&typeof x==='object');
 return [];
}
function mergeUniqueRecords(primary,extra,kind){
 const seen=new Set(),out=[];
 const sig=x=>kind==='attendance'?`${x.studentId||x.student||x.sid||''}|${localISODate(x.date||x.attendanceDate||x.createdAt)}|${String(x.status||'').toLowerCase()}`:
  kind==='fees'?`${x.id||''}|${x.studentId||x.student||x.sid||''}|${localISODate(x.date||x.paymentDate||x.createdAt)}|${Number(x.paid??x.amountPaid??x.received??0)}`:
  kind==='movements'?`${x.id||''}|${x.studentId||x.student||x.sid||''}|${x.outTime||x.exitTime||x.createdAt||''}`:
  `${x.id||''}|${JSON.stringify(x)}`;
 for(const item of [...normalizeArraySource(primary),...normalizeArraySource(extra)]){const k=sig(item);if(!seen.has(k)){seen.add(k);out.push(item)}}
 return out;
}
function extractLegacyCollections(source){
 const d=source&&typeof source==='object'?source:{};
 return {
  students:normalizeArraySource(d.students||d.studentMaster||d.studentList),
  fees:normalizeArraySource(d.fees||d.payments||d.feePayments||d.feeHistory),
  attendance:normalizeArraySource(d.attendance||d.attendanceRecords||d.attendanceHistory||d.dailyAttendance),
  movements:normalizeArraySource(d.movements||d.movementHistory||d.entryExit||d.entryExitRecords),
  audit:normalizeArraySource(d.audit||d.auditLog),notices:normalizeArraySource(d.notices),diary:normalizeArraySource(d.diary||d.dailyDiary)
 };
}
function loadDB(){
 try{
  const raw=localStorage.getItem(DB_KEY);let data=raw?JSON.parse(raw):clone(defaultDB),migrated=[];
  data.meta=data.meta||{schemaVersion:2,createdAt:new Date().toISOString()};
  data.settings={...clone(defaultDB.settings),...(data.settings||{})};
  const direct=extractLegacyCollections(data);
  for(const key of ['students','fees','attendance','movements','audit','notices','diary'])data[key]=direct[key];
  for(const legacyKey of LEGACY_DB_KEYS){
   const legacyRaw=localStorage.getItem(legacyKey);if(!legacyRaw)continue;
   try{const legacy=extractLegacyCollections(JSON.parse(legacyRaw));let added=0;
    for(const key of ['students','fees','attendance','movements','audit','notices','diary']){const before=data[key].length;data[key]=mergeUniqueRecords(data[key],legacy[key],key);added+=data[key].length-before}
    if(added)migrated.push(`${legacyKey}: ${added}`);
   }catch{}
  }
  try{const backupRaw=localStorage.getItem(ATTENDANCE_BACKUP_KEY);if(backupRaw){const backup=JSON.parse(backupRaw);data.attendance=mergeUniqueRecords(data.attendance,backup,'attendance')}}catch{}
  if(migrated.length){data.meta.legacyMigration={at:new Date().toISOString(),sources:migrated};localStorage.setItem(DB_KEY,JSON.stringify(data))}
  return data;
 }catch{return clone(defaultDB)}
}
function saveDB(){
 try{db.meta=db.meta||{};db.meta.schemaVersion=4;db.meta.updatedAt=new Date().toISOString();localStorage.setItem(DB_KEY,JSON.stringify(db));if(typeof currentPage!=='undefined'&&currentPage==='reports'&&typeof window.v29GenerateReport==='function'&&document.getElementById('reportTable'))setTimeout(()=>window.v29GenerateReport(),0);return true}
 catch(e){alert('Data save కాలేదు. Photo size తగ్గించి మళ్లీ ప్రయత్నించండి.');return false}
}
function persistAttendanceVerified(){
 try{
  db.attendance=normalizeArraySource(db.attendance).map(a=>({...a,studentId:String(a.studentId||a.student||a.sid||'').trim(),date:localISODate(a.date||a.attendanceDate||a.createdAt),status:v291NormalizeStatus(a.status,'attendance')})).filter(a=>a.studentId&&a.date&&a.status);
  localStorage.setItem(ATTENDANCE_BACKUP_KEY,JSON.stringify(db.attendance));
  if(!saveDB())return false;
  const stored=JSON.parse(localStorage.getItem(DB_KEY)||'{}');
  const verified=Array.isArray(stored.attendance)&&stored.attendance.length===db.attendance.length;
  if(!verified)throw new Error('Attendance verification failed');
  return true;
 }catch(e){console.error(e);alert('Attendance save కాలేదు. Browser storage permission/check చేసి మళ్లీ ప్రయత్నించండి.');return false}
}
function attendanceKey(studentId,date){return `${String(studentId||'').trim()}|${localISODate(date)}`}
function upsertAttendanceRecord(studentId,status,date){
 const sid=String(studentId||'').trim(),day=localISODate(date||today()),st=v291NormalizeStatus(status,'attendance');
 if(!sid||!day||!st)return false;
 db.attendance=normalizeArraySource(db.attendance).filter(x=>attendanceKey(x.studentId||x.student||x.sid,x.date||x.attendanceDate||x.createdAt)!==attendanceKey(sid,day));
 db.attendance.push({id:uid(),studentId:sid,date:day,status:st,time:new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}),updatedAt:new Date().toISOString(),source:'attendance-module-v3.0-rc'});
 return persistAttendanceVerified();
}
function showAttendanceSaveState(message,ok=true){const x=el('attendanceSaveState');if(!x)return;x.textContent=message;x.className=`attendance-save-state ${ok?'ok':'error'}`;clearTimeout(window._attendanceStateTimer);window._attendanceStateTimer=setTimeout(()=>{if(x)x.textContent=''},2500)}
function logAction(type,details){db.audit=db.audit||[];db.audit.unshift({id:uid(),type,details,time:new Date().toISOString()});db.audit=db.audit.slice(0,250)}
function el(id){return document.getElementById(id)}
function money(n){return '₹'+Number(n||0).toLocaleString('en-IN')}
function today(){return localISODate()}
function monthNow(){return today().slice(0,7)}
function studentName(id){return db.students.find(s=>s.id===id)?.name||id}
function esc(v=''){return String(v).replace(/[&<>'"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[m]))}
function hallFee(s){return Number(s?.monthlyFee||db.settings.monthlyFee||0)}
function validPhone(v){return !v||/^[6-9]\d{9}$/.test(String(v).trim())}
function isLateMovement(m){return m.status==='Outside'&&m.expectedReturn&&new Date(m.expectedReturn).getTime()<Date.now()}
function closeMenu(){el('sidebar').classList.remove('open');el('overlay').classList.add('hidden')}
function openMenu(){el('sidebar').classList.add('open');el('overlay').classList.remove('hidden')}

el('todayText').textContent=new Date().toLocaleDateString('en-IN',{weekday:'long',year:'numeric',month:'long',day:'numeric'});
el('loginBtn').onclick=()=>{const u=el('loginUser').value.trim(),p=el('loginPass').value;if(u===db.settings.adminUser&&p===db.settings.adminPass){el('loginView').classList.add('hidden');el('appView').classList.remove('hidden');history.replaceState({page:'dashboard'},'',location.href);render('dashboard',false)}else el('loginError').textContent='Wrong username or password'};
el('loginPass').addEventListener('keydown',e=>{if(e.key==='Enter')el('loginBtn').click()});
el('logoutBtn').onclick=()=>location.reload();
el('menuBtn').onclick=()=>el('sidebar').classList.contains('open')?closeMenu():openMenu();
el('overlay').onclick=closeMenu;
el('navMenu').onclick=e=>{const b=e.target.closest('button[data-page]');if(!b)return;render(b.dataset.page);closeMenu()};
el('modalClose').onclick=closeModal;el('modal').onclick=e=>{if(e.target===el('modal'))closeModal()};
function openModal(html){el('modalBody').innerHTML=html;el('modal').classList.remove('hidden')}
function closeModal(){el('modal').classList.add('hidden');el('modalBody').innerHTML=''}

function render(page,pushHistory=true){currentPage=page;document.querySelectorAll('#navMenu button').forEach(b=>b.classList.toggle('active',b.dataset.page===page));const titles={dashboard:'Home',students:'Students',admissions:'Admissions',fees:'Fees',pending:'Pending Fees',attendance:'Attendance',movement:'Entry / Exit',notices:'Notices',diary:'Daily Diary',dailyupdates:'Daily Updates',reports:'Reports',settings:'Settings'};el('pageTitle').textContent=titles[page]||page;el('sideHallName').textContent=db.settings.hallName.replace(/Study Hall/i,'').trim()||'Sri Nidhi';if(pushHistory&&page!==history.state?.page)history.pushState({page},'',location.href);({dashboard:renderDashboard,students:renderStudents,admissions:renderAdmissions,fees:renderFees,pending:renderPending,attendance:renderAttendance,movement:renderMovement,notices:renderNotices,diary:renderDiary,dailyupdates:renderDailyUpdates,reports:renderReports,settings:renderSettings}[page]||renderDashboard)()}
window.addEventListener('popstate',e=>{if(!el('modal').classList.contains('hidden')){closeModal();history.pushState({page:currentPage},'',location.href);return}if(!el('appView').classList.contains('hidden')){const target=e.state?.page||'dashboard';render(target,false)}});

function updateLiveClock(){const clock=el('liveClock');if(clock)clock.textContent=new Date().toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit',second:'2-digit'});}
function renderDashboard(){
 const content=el('pageContent'),t=today(),active=db.students.filter(s=>(s.status||'Active')!=='Inactive');
 const todayAtt=db.attendance.filter(a=>localISODate(a.date)===t),present=todayAtt.filter(a=>v291NormalizeStatus(a.status,'attendance')==='Present').length;
 const todayFees=db.fees.filter(f=>localISODate(f.date)===t),collected=todayFees.reduce((n,f)=>n+Number(f.paid||0),0);
 const outside=db.movements.filter(m=>v291NormalizeStatus(m.status,'movement')==='Outside').length;
 const lastBackup=db.meta?.lastBackupAt?new Date(db.meta.lastBackupAt).toLocaleString('en-IN'):'Not created yet';
 content.innerHTML=`
 <section class="home-welcome">
   <p>V3.0 RC</p>
   <h1>${esc(db.settings.hallName)}</h1>
   <span>${esc(db.settings.academicYear||'')} • Student Management, Fees & Security</span>
 </section>
 <section class="v3-live-grid">
  <button onclick="render('students')"><small>Active Students</small><b>${active.length}</b></button>
  <button onclick="render('attendance')"><small>Present Today</small><b>${present}</b></button>
  <button onclick="render('fees')"><small>Collected Today</small><b>${money(collected)}</b></button>
  <button onclick="render('movement')"><small>Currently Outside</small><b>${outside}</b></button>
 </section>
 <div class="v3-sync-note"><span><b>Live database:</b> ${db.attendance.length} attendance • ${db.fees.length} fees • ${db.movements.length} entry/exit records</span><small>Last backup: ${esc(lastBackup)}</small></div>
 <section class="home-menu-list" aria-label="Main modules">
   ${homeCard('students','Students')}${homeCard('admissions','Admissions')}${homeCard('attendance','Attendance')}${homeCard('movement','Entry / Exit')}${homeCard('notices','Notices')}${homeCard('diary','Daily Diary')}${homeCard('dailyupdates','Daily Updates')}${homeCard('fees','Fees')}${homeCard('pending','Pending Fees')}${homeCard('reports','Reports')}${homeCard('settings','Settings')}
 </section>`;
}
function homeCard(page,label){return `<button class="home-menu-card" onclick="render('${page}')"><span>${label}</span><b aria-hidden="true">›</b></button>`}

function renderDailyUpdates(){
 const t=today(), active=db.students.filter(s=>s.status!=='Inactive');
 const admissions=active.filter(s=>s.joinDate===t).length;
 const feesToday=db.fees.filter(f=>f.date===t); const collected=feesToday.reduce((a,f)=>a+Number(f.paid||0),0);
 const present=db.attendance.filter(a=>a.date===t&&a.status==='Present').length;
 const absent=db.attendance.filter(a=>a.date===t&&a.status==='Absent').length;
 const outside=db.movements.filter(m=>m.status==='Outside');
 const late=outside.filter(isLateMovement);
 const notices=(db.notices||[]).filter(n=>(n.date||'')===t).length;
 const diary=(db.diary||[]).find(d=>d.date===t);
 el('pageContent').innerHTML=`<div class="daily-grid">
   ${dailyCard('Today Admissions',admissions,'admissions')}
   ${dailyCard('Fees Collected',money(collected),'fees')}
   ${dailyCard('Present',present,'attendance')}
   ${dailyCard('Absent',absent,'attendance')}
   ${dailyCard('Students Outside',outside.length,'movement')}
   ${dailyCard('Not Returned',late.length,'movement',late.length?'alert':'')}
   ${dailyCard('Today Notices',notices,'notices')}
   ${dailyCard('Diary Status',diary?'Updated':'Not Updated','diary')}
 </div>`;
}
function dailyCard(label,value,page,cls=''){return `<button class="daily-card ${cls}" onclick="render('${page}')"><span>${label}</span><b>${value}</b><small>Open ›</small></button>`}

function overviewRow(label,value){return `<div class="d3-row"><span>${label}</span><b>${value}</b></div>`}
function importantRow(label,value,page){return `<button class="d3-row d3-row-button" onclick="render('${page}')"><span>${label}</span><b>${value}</b></button>`}
window.dashboardStudentSearch=function(){const q=(el('dashboardSearch')?.value||'').trim().toLowerCase();if(!q)return alert('Student name, ID, phone లేదా parent name enter చేయండి');const s=db.students.find(x=>[x.id,x.name,x.phone,x.parentName,x.parentPhone,x.course,x.batch].join(' ').toLowerCase().includes(q));if(!s)return alert('Student not found');viewStudent(s.id)}

function renderStudents(){el('pageContent').innerHTML=`<div class="card"><div class="toolbar"><input id="studentSearch" placeholder="Search name / phone / ID / parent"><select id="genderFilter"><option value="">All</option><option>Female</option><option>Male</option></select><button class="primary" onclick="showStudentForm()">+ Add Student</button></div><div id="studentsTable"></div></div>`;el('studentSearch').oninput=drawStudents;el('genderFilter').onchange=drawStudents;drawStudents()}
function avatar(s){return s.photo?`<img class="avatar" src="${s.photo}" alt="">`:`<span class="avatar">${esc((s.name||'?').slice(0,1).toUpperCase())}</span>`}
function drawStudents(){const q=(el('studentSearch')?.value||'').toLowerCase(),g=el('genderFilter')?.value||'';const list=db.students.filter(s=>(!g||s.gender===g)&&[s.id,s.name,s.phone,s.parentName,s.parentPhone,s.course,s.batch].join(' ').toLowerCase().includes(q));el('studentsTable').innerHTML=list.length?`<div class="table-wrap"><table><thead><tr><th>Student</th><th>ID</th><th>Gender</th><th>Phone</th><th>Course / Batch</th><th>Parent</th><th>Fee</th><th>Status</th><th>Actions</th></tr></thead><tbody>${list.map(s=>`<tr><td><div class="student-name">${avatar(s)}<b>${esc(s.name)}</b></div></td><td>${esc(s.id)}</td><td>${esc(s.gender)}</td><td>${esc(s.phone)}</td><td>${esc(s.course||'-')} / ${esc(s.batch||'-')}</td><td>${esc(s.parentName||'-')}</td><td>${money(hallFee(s))}</td><td><span class="badge ${s.status==='Inactive'?'absent':'present'}">${esc(s.status||'Active')}</span></td><td><button class="secondary" onclick="viewStudent('${s.id}')">View</button> <button class="secondary" onclick="editStudent('${s.id}')">Edit</button> <button class="danger" onclick="deleteStudent('${s.id}')">Delete</button></td></tr>`).join('')}</tbody></table></div>`:'<div class="empty">No students found</div>'}

function renderAdmissions(){el('pageContent').innerHTML=`<div class="card"><h3>New Student Admission</h3>${studentForm()}</div>`;bindStudentForm()}
function studentForm(s={}){return `<form id="studentForm" class="form-grid">
<div class="section-title">Student Details</div>
<div class="field"><label>Student ID *</label><input name="id" value="${esc(s.id||nextStudentId())}" required ${s.id?'readonly':''}></div>
<div class="field"><label>Full Name *</label><input name="name" value="${esc(s.name||'')}" required></div>
<div class="field"><label>Gender *</label><select name="gender"><option ${s.gender==='Female'?'selected':''}>Female</option><option ${s.gender==='Male'?'selected':''}>Male</option><option ${s.gender==='Other'?'selected':''}>Other</option></select></div>
<div class="field"><label>Date of Birth</label><input type="date" name="dob" value="${esc(s.dob||'')}"></div>
<div class="field"><label>Student Phone *</label><input name="phone" inputmode="numeric" value="${esc(s.phone||'')}" required></div>
<div class="field"><label>Photo</label><input id="photoInput" type="file" accept="image/*"></div>
<div class="field"><label>Photo Preview</label><img id="photoPreview" class="photo-preview" src="${s.photo||''}" alt=""></div>
<div class="section-title">Parent & Contact Details</div>
<div class="field"><label>Parent / Guardian Name</label><input name="parentName" value="${esc(s.parentName||'')}"></div>
<div class="field"><label>Parent Phone *</label><input name="parentPhone" inputmode="numeric" value="${esc(s.parentPhone||'')}" required></div>
<div class="field"><label>Emergency Phone</label><input name="emergencyPhone" inputmode="numeric" value="${esc(s.emergencyPhone||'')}"></div>
<div class="field span-3"><label>Address</label><textarea name="address">${esc(s.address||'')}</textarea></div>
<div class="section-title">Study Hall Details</div>
<div class="field"><label>Course / Exam</label><input name="course" value="${esc(s.course||'')}"></div>
<div class="field"><label>Batch / Timing</label><input name="batch" value="${esc(s.batch||'')}"></div>
<div class="field"><label>Seat Number (Optional)</label><input name="seat" value="${esc(s.seat||'')}"></div>
<div class="field"><label>Joining Date</label><input type="date" name="joinDate" value="${esc(s.joinDate||today())}"></div>
<div class="field"><label>Monthly Fee</label><input type="number" name="monthlyFee" value="${hallFee(s)}"></div>
<div class="field"><label>ID Proof / Aadhaar (Optional)</label><input name="idProof" value="${esc(s.idProof||'')}"></div>
<div class="field"><label>Status</label><select name="status"><option ${s.status!=='Inactive'?'selected':''}>Active</option><option ${s.status==='Inactive'?'selected':''}>Inactive</option></select></div>
<input type="hidden" name="photo" value="${s.photo||''}">
<div class="span-3 actions"><button class="primary" type="submit">Save Student</button><button type="button" class="secondary" onclick="render('students')">Cancel</button></div>
</form>`}
function bindStudentForm(editId=null){const form=el('studentForm'),photo=el('photoInput'),preview=el('photoPreview');if(photo)photo.onchange=()=>{const file=photo.files[0];if(!file)return;if(file.size>800000)return alert('Photo size 800 KB లోపు ఉండాలి.');const r=new FileReader();r.onload=()=>{form.elements.photo.value=r.result;preview.src=r.result};r.readAsDataURL(file)};form.onsubmit=e=>{e.preventDefault();const o=Object.fromEntries(new FormData(form));o.monthlyFee=Number(o.monthlyFee||db.settings.monthlyFee);if(!/^\d{10}$/.test(o.phone.replace(/\D/g,'')))return alert('Student phone number 10 digits enter చేయండి');if(editId){db.students=db.students.map(s=>s.id===editId?o:s)}else{if(db.students.some(s=>s.id===o.id))return alert('Student ID already exists');db.students.push(o)}saveDB();closeModal();render('students');alert('Student saved successfully')}}
function nextStudentId(){let n=1;while(db.students.some(s=>s.id===`SN${String(n).padStart(4,'0')}`))n++;return `SN${String(n).padStart(4,'0')}`}
window.showStudentForm=()=>{openModal(`<h3>Add Student</h3>${studentForm()}`);bindStudentForm()};
window.editStudent=id=>{const s=db.students.find(x=>x.id===id);openModal(`<h3>Edit Student</h3>${studentForm(s)}`);bindStudentForm(id)};
window.viewStudent=id=>{const s=db.students.find(x=>x.id===id);openModal(`<h3>Student Profile</h3><div class="student-name">${avatar(s)}<div><h2 style="margin:0">${esc(s.name)}</h2><span class="muted">${esc(s.id)}</span></div></div><div class="card"><div class="form-grid"><div><b>Phone</b><p>${esc(s.phone||'-')}</p></div><div><b>Parent</b><p>${esc(s.parentName||'-')} / ${esc(s.parentPhone||'-')}</p></div><div><b>Course</b><p>${esc(s.course||'-')}</p></div><div><b>Batch</b><p>${esc(s.batch||'-')}</p></div><div><b>Seat</b><p>${esc(s.seat||'-')}</p></div><div><b>Monthly Fee</b><p>${money(hallFee(s))}</p></div><div class="span-3"><b>Address</b><p>${esc(s.address||'-')}</p></div></div></div>`)};
window.deleteStudent=id=>{const s=db.students.find(x=>x.id===id);if(!s)return;if(confirm(`Delete ${s.name}? Fee, attendance and movement history will remain in reports.`)){db.students=db.students.filter(x=>x.id!==id);logAction('student_deleted',`${s.id} - ${s.name} deleted`);saveDB();drawStudents()}};

function studentOptions(){return db.students.filter(s=>s.status!=='Inactive').map(s=>`<option value="${s.id}">${esc(s.id)} - ${esc(s.name)}</option>`).join('')}
function renderFees(){el('pageContent').innerHTML=`<div class="card"><h3>Add Fee Payment</h3><form id="feeForm" class="form-grid"><div class="field"><label>Student</label><select id="feeStudent" name="studentId" required>${studentOptions()}</select></div><div class="field"><label>Month</label><input type="month" name="month" value="${monthNow()}" required></div><div class="field"><label>Monthly Fee</label><input id="feeAmount" type="number" name="amount" value="${db.settings.monthlyFee}" required></div><div class="field"><label>Paid Amount</label><input type="number" name="paid" required></div><div class="field"><label>Payment Date</label><input type="date" name="date" value="${today()}" required></div><div class="field"><label>Payment Mode</label><select name="mode"><option>Cash</option><option>UPI</option><option>Bank</option></select></div><div class="span-3"><button class="primary">Save Payment</button></div></form></div><div class="card"><h3>Payment History</h3><div id="feeTable"></div></div>`;el('feeStudent').onchange=()=>{el('feeAmount').value=hallFee(db.students.find(s=>s.id===el('feeStudent').value))};el('feeStudent').dispatchEvent(new Event('change'));el('feeForm').onsubmit=e=>{e.preventDefault();const o=Object.fromEntries(new FormData(e.target));o.id=uid();o.amount=Number(o.amount);o.paid=Number(o.paid);o.receipt='RC'+String(db.fees.length+1).padStart(4,'0');if(o.paid<=0||o.paid>o.amount)return alert('Paid amount సరైనదిగా నమోదు చేయండి');db.fees.push(o);logAction('fee_paid',`Fee received: ${studentName(o.studentId)} - ${money(o.paid)}`);saveDB();renderFees();alert('Fee payment saved')};drawFees()}
function drawFees(){const list=[...db.fees].reverse();el('feeTable').innerHTML=list.length?`<div class="table-wrap"><table><thead><tr><th>Receipt</th><th>Student</th><th>Month</th><th>Fee</th><th>Paid</th><th>Balance</th><th>Date</th><th>Mode</th><th></th></tr></thead><tbody>${list.map(f=>`<tr><td>${esc(f.receipt||'-')}</td><td>${esc(studentName(f.studentId))}</td><td>${esc(f.month)}</td><td>${money(f.amount)}</td><td>${money(f.paid)}</td><td>${money(Number(f.amount)-Number(f.paid))}</td><td>${esc(f.date)}</td><td>${esc(f.mode)}</td><td><button class="danger" onclick="deleteFee('${f.id}')">Delete</button></td></tr>`).join('')}</tbody></table></div>`:'<div class="empty">No payments</div>'}
window.deleteFee=id=>{if(confirm('Delete payment?')){db.fees=db.fees.filter(f=>f.id!==id);saveDB();renderFees()}};
function getPending(month=monthNow()){return db.students.filter(s=>s.status!=='Inactive').map(s=>{const paid=db.fees.filter(f=>f.studentId===s.id&&f.month===month).reduce((a,f)=>a+Number(f.paid||0),0),fee=hallFee(s);return {...s,paid,balance:Math.max(0,fee-paid),fee}}).filter(x=>x.balance>0)}
function renderPending(){el('pageContent').innerHTML=`<div class="card"><div class="toolbar"><input id="pendingMonth" type="month" value="${monthNow()}"><button class="primary" onclick="downloadPendingPDF()">Download PDF</button></div><div id="pendingTable"></div></div>`;el('pendingMonth').onchange=drawPending;drawPending()}
function drawPending(){const month=el('pendingMonth')?.value||monthNow(),list=getPending(month);el('pendingTable').innerHTML=`<h3>Pending Fee List - ${esc(month)}</h3>${list.length?`<div class="table-wrap"><table><thead><tr><th>ID</th><th>Name</th><th>Phone</th><th>Fee</th><th>Paid</th><th>Balance</th><th>Status</th></tr></thead><tbody>${list.map(x=>`<tr><td>${esc(x.id)}</td><td>${esc(x.name)}</td><td>${esc(x.phone)}</td><td>${money(x.fee)}</td><td>${money(x.paid)}</td><td><b>${money(x.balance)}</b></td><td><span class="badge pending">Pending</span></td></tr>`).join('')}</tbody></table></div>`:'<div class="empty">No pending fees</div>'}`}
window.downloadPendingPDF=()=>{const month=el('pendingMonth')?.value||monthNow(),list=getPending(month),{jsPDF}=window.jspdf,doc=new jsPDF();doc.setFontSize(16);doc.text(`${db.settings.hallName} - Pending Fee List`,14,18);doc.setFontSize(10);let y=30;doc.text('Month: '+month,14,y);y+=10;list.forEach((x,i)=>{doc.text(`${i+1}. ${x.id} - ${x.name} | Phone: ${x.phone} | Balance: Rs.${x.balance}`,14,y);y+=8;if(y>280){doc.addPage();y=20}});doc.save(`Pending-Fees-${month}.pdf`)};

function renderAttendance(){const d=today();el('pageContent').innerHTML=`<div class="card"><h3>Attendance - ${d}</h3><div class="table-wrap"><table><thead><tr><th>ID</th><th>Name</th><th>Status</th><th>Action</th></tr></thead><tbody>${db.students.filter(s=>s.status!=='Inactive').map(s=>{const a=db.attendance.find(x=>x.studentId===s.id&&x.date===d);return `<tr><td>${s.id}</td><td>${esc(s.name)}</td><td><span class="badge ${a?.status==='Present'?'present':a?.status==='Absent'?'absent':'pending'}">${a?.status||'Not Marked'}</span></td><td><button class="success" onclick="markAttendance('${s.id}','Present')">Present</button> <button class="danger" onclick="markAttendance('${s.id}','Absent')">Absent</button></td></tr>`}).join('')}</tbody></table></div></div>`}
window.markAttendance=(studentId,status)=>{db.attendance=db.attendance.filter(x=>!(x.studentId===studentId&&x.date===today()));db.attendance.push({studentId,date:today(),status,time:new Date().toLocaleTimeString()});logAction('attendance',`${studentName(studentId)} marked ${status}`);saveDB();renderAttendance()};
window.markReturned=id=>{const x=db.movements.find(m=>m.id===id);if(x){x.status='Returned';x.returnTime=new Date().toISOString().slice(0,16);logAction('returned',`${studentName(x.studentId)} returned`);saveDB();renderMovement()}};
function renderReports(){el('pageContent').innerHTML=`<div class="grid stats"><div class="card"><h3>Student List</h3><p class="muted">All student details.</p><button class="primary" onclick="downloadStudentsPDF()">Download PDF</button></div><div class="card"><h3>Pending Fees</h3><p class="muted">Current month pending list.</p><button class="primary" onclick="downloadPendingPDF()">Download PDF</button></div><div class="card"><h3>Backup</h3><p class="muted">Download complete data backup.</p><button class="secondary" onclick="downloadBackup()">Download JSON</button></div><div class="card"><h3>Restore Backup</h3><p class="muted">Restore previously downloaded JSON.</p><input id="restoreFile" type="file" accept="application/json"><button class="secondary" onclick="restoreBackup()">Restore</button></div></div>`}
window.downloadStudentsPDF=()=>{const {jsPDF}=window.jspdf,doc=new jsPDF();doc.setFontSize(16);doc.text(`${db.settings.hallName} - Student List`,14,18);doc.setFontSize(10);let y=30;db.students.forEach((s,i)=>{doc.text(`${i+1}. ${s.id} - ${s.name} | ${s.phone} | Seat: ${s.seat||'-'} | ${s.course||'-'}`,14,y);y+=8;if(y>280){doc.addPage();y=20}});doc.save('Sri-Nidhi-Students.pdf')};
window.downloadBackup=()=>{db.meta=db.meta||{};db.meta.lastBackupAt=new Date().toISOString();saveDB();const payload={product:'Sri Nidhi Study Hall ERP',version:'3.0-beta-1',exportedAt:new Date().toISOString(),database:db};const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}));a.download=`Sri-Nidhi-Backup-${today()}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)};
window.restoreBackup=()=>{const f=el('restoreFile')?.files?.[0];if(!f)return alert('Select backup file');const r=new FileReader();r.onload=()=>{try{const raw=JSON.parse(r.result),x=raw.database||raw;if(!x||!Array.isArray(x.students)||!x.settings)throw Error('Invalid structure');if(!confirm(`Restore backup with ${x.students.length} students? Current data will be replaced.`))return;db={...clone(defaultDB),...x,settings:{...clone(defaultDB.settings),...(x.settings||{})}};v291NormalizeData();db.meta=db.meta||{};db.meta.lastRestoreAt=new Date().toISOString();if(!saveDB())throw Error('Save failed');localStorage.setItem(ATTENDANCE_BACKUP_KEY,JSON.stringify(db.attendance||[]));alert('Backup restored and verified');render('dashboard')}catch(e){console.error(e);alert('Invalid or damaged backup file')}};r.readAsText(f)};
window.runDataIntegrityCheck=()=>{v291NormalizeData();const known=new Set(db.students.map(s=>String(s.id))),orphanAttendance=db.attendance.filter(a=>!known.has(String(a.studentId))).length,orphanFees=db.fees.filter(f=>!known.has(String(f.studentId))).length,duplicateStudents=db.students.length-new Set(db.students.map(s=>String(s.id))).size;const ok=saveDB();alert(`Data Integrity Check\n\nStudents: ${db.students.length}\nAttendance: ${db.attendance.length}\nFees: ${db.fees.length}\nEntry/Exit: ${db.movements.length}\nDuplicate student IDs: ${duplicateStudents}\nOrphan attendance: ${orphanAttendance}\nOrphan fees: ${orphanFees}\nStorage verification: ${ok?'Passed':'Failed'}`)};
function renderSettings(){const lastBackup=db.meta?.lastBackupAt?new Date(db.meta.lastBackupAt).toLocaleString('en-IN'):'Not created';el('pageContent').innerHTML=`
<section class="settings-hero"><div><p>V3.0 RC</p><h1>Study Hall Settings</h1><span>Profile, fee defaults, security and data safety.</span></div><b>Schema v${db.meta?.schemaVersion||4}</b></section>
<div class="card"><form id="settingsForm" class="form-grid"><div class="section-title">Study Hall Profile</div><div class="field"><label>Study Hall Name</label><input name="hallName" value="${esc(db.settings.hallName)}" required></div><div class="field"><label>Academic Year</label><input name="academicYear" value="${esc(db.settings.academicYear||'2026-27')}"></div><div class="field"><label>Contact Phone</label><input name="phone" inputmode="tel" value="${esc(db.settings.phone||'')}"></div><div class="field span-3"><label>Address</label><textarea name="address">${esc(db.settings.address||'')}</textarea></div><div class="section-title">Fee Defaults</div><div class="field"><label>Default Monthly Fee</label><input type="number" min="0" name="monthlyFee" value="${Number(db.settings.monthlyFee||0)}"></div><div class="field"><label>Monthly Fee Due Day</label><input type="number" min="1" max="28" name="feeDueDay" value="${Number(db.settings.feeDueDay||10)}"></div><div class="field"><label>Backup Reminder (days)</label><input type="number" min="1" max="90" name="autoBackupDays" value="${Number(db.settings.autoBackupDays||7)}"></div><div class="section-title">Admin Login</div><div class="field"><label>Admin Username</label><input name="adminUser" value="${esc(db.settings.adminUser)}" required></div><div class="field"><label>Admin Password</label><input type="password" name="adminPass" value="${esc(db.settings.adminPass)}" required></div><div class="span-3 actions"><button class="primary">Save Settings</button></div></form></div>
<div class="settings-data-grid"><div class="card"><h3>Backup Database</h3><p class="muted">Students, fees, attendance, movement, notices and settings.</p><button class="secondary" onclick="downloadBackup()">Download Verified Backup</button><small>Last backup: ${esc(lastBackup)}</small></div><div class="card"><h3>Restore Database</h3><p class="muted">Select a Sri Nidhi JSON backup. Current data will be replaced after confirmation.</p><input id="restoreFile" type="file" accept="application/json"><button class="secondary" onclick="restoreBackup()">Validate & Restore</button></div><div class="card"><h3>Data Integrity</h3><p class="muted">Normalize saved records and check duplicates/orphan records.</p><button class="secondary" onclick="runDataIntegrityCheck()">Run Integrity Check</button></div><div class="card danger-zone"><h3>Danger Zone</h3><p class="muted">Reset all local data to demo records.</p><button class="danger" onclick="resetDemo()">Reset Demo Data</button></div></div>`;el('settingsForm').onsubmit=e=>{e.preventDefault();const o=Object.fromEntries(new FormData(e.target));o.monthlyFee=Math.max(0,Number(o.monthlyFee||0));o.feeDueDay=Math.min(28,Math.max(1,Number(o.feeDueDay||10)));o.autoBackupDays=Math.min(90,Math.max(1,Number(o.autoBackupDays||7)));db.settings={...db.settings,...o};logAction('settings','V3 settings updated');saveDB();alert('Settings saved successfully');render('dashboard')}}
window.resetDemo=()=>{if(confirm('Reset all data?')){db=clone(defaultDB);saveDB();render('dashboard')}};
window.render=render;

/* v1.3 stable feature layer */
db.notices=db.notices||[];db.diary=db.diary||[];saveDB();
function fmtDateTime(v){if(!v)return '-';const d=new Date(v);return Number.isNaN(d.getTime())?v:d.toLocaleString('en-IN')}
function nextReceipt(){const nums=db.fees.map(f=>Number(String(f.receipt||'').replace(/\D/g,''))||0);return 'RC'+String(Math.max(0,...nums)+1).padStart(4,'0')}
function monthPaid(studentId,month){return db.fees.filter(f=>f.studentId===studentId&&f.month===month).reduce((a,f)=>a+Number(f.paid||0),0)}

window.viewStudent=function(id){const s=db.students.find(x=>x.id===id);if(!s)return;const fees=db.fees.filter(x=>x.studentId===id).sort((a,b)=>String(b.date).localeCompare(String(a.date)));const at=db.attendance.filter(x=>x.studentId===id).sort((a,b)=>String(b.date).localeCompare(String(a.date)));const mv=db.movements.filter(x=>x.studentId===id).sort((a,b)=>String(b.outTime).localeCompare(String(a.outTime)));openModal(`<h2>Student Master File</h2><div class="profile-head">${s.photo?`<img class="profile-photo" src="${s.photo}" alt="">`:`<div class="profile-photo">${esc((s.name||'?')[0])}</div>`}<div><h2 style="margin:0">${esc(s.name)}</h2><div class="muted">${esc(s.id)} • ${esc(s.course||'-')} • Seat ${esc(s.seat||'-')}</div><div class="actions" style="margin-top:10px"><button class="primary" onclick="downloadStudentProfilePDF('${s.id}')">Profile PDF</button><button class="secondary" onclick="editStudent('${s.id}');closeModal()">Edit</button></div></div></div><div class="profile-grid">${[['Phone',s.phone],['Parent',s.parentName],['Parent Phone',s.parentPhone],['Emergency',s.emergencyPhone],['Gender',s.gender],['DOB',s.dob],['Batch',s.batch],['Join Date',s.joinDate],['Monthly Fee',money(hallFee(s))],['Status',s.status],['Address',s.address],['ID Proof',s.idProof]].map(x=>`<div class="profile-field"><small>${x[0]}</small><b>${esc(x[1]||'-')}</b></div>`).join('')}</div><div class="card"><h3>Fee History</h3>${fees.length?`<div class="table-wrap"><table><thead><tr><th>Receipt</th><th>Month</th><th>Paid</th><th>Date</th><th>Mode</th></tr></thead><tbody>${fees.map(f=>`<tr><td>${esc(f.receipt)}</td><td>${esc(f.month)}</td><td>${money(f.paid)}</td><td>${esc(f.date)}</td><td>${esc(f.mode)}</td></tr>`).join('')}</tbody></table></div>`:'<div class="empty">No fee history</div>'}</div><div class="card"><h3>Attendance History</h3>${at.length?`<div class="table-wrap"><table><thead><tr><th>Date</th><th>Status</th><th>Time</th></tr></thead><tbody>${at.slice(0,60).map(a=>`<tr><td>${esc(a.date)}</td><td>${esc(a.status)}</td><td>${esc(a.time||'-')}</td></tr>`).join('')}</tbody></table></div>`:'<div class="empty">No attendance history</div>'}</div><div class="card"><h3>Entry / Exit History</h3>${mv.length?`<div class="table-wrap"><table><thead><tr><th>Out</th><th>Expected</th><th>Returned</th><th>Reason</th><th>Status</th></tr></thead><tbody>${mv.slice(0,40).map(m=>`<tr><td>${esc(fmtDateTime(m.outTime))}</td><td>${esc(fmtDateTime(m.expectedReturn))}</td><td>${esc(fmtDateTime(m.returnTime))}</td><td>${esc(m.reason||'-')}</td><td>${esc(m.status)}</td></tr>`).join('')}</tbody></table></div>`:'<div class="empty">No movement history</div>'}</div>`)}
window.downloadStudentProfilePDF=function(id){const s=db.students.find(x=>x.id===id);if(!s)return;const {jsPDF}=window.jspdf,doc=new jsPDF();doc.setFontSize(17);doc.text(db.settings.hallName,14,18);doc.setFontSize(13);doc.text('Student Master Profile',14,27);doc.setFontSize(10);let y=40;const rows=[['Student ID',s.id],['Name',s.name],['Gender',s.gender],['Phone',s.phone],['Parent',s.parentName],['Parent Phone',s.parentPhone],['Emergency',s.emergencyPhone],['Course / Batch',`${s.course||'-'} / ${s.batch||'-'}`],['Seat',s.seat],['Join Date',s.joinDate],['Monthly Fee',`Rs.${hallFee(s)}`],['Status',s.status],['Address',s.address]];rows.forEach(r=>{doc.text(`${r[0]}: ${r[1]||'-'}`,14,y);y+=8});y+=4;doc.setFontSize(12);doc.text('Recent Fee History',14,y);y+=8;doc.setFontSize(9);db.fees.filter(f=>f.studentId===id).slice(-12).reverse().forEach(f=>{doc.text(`${f.receipt} | ${f.month} | Rs.${f.paid} | ${f.date} | ${f.mode}`,14,y);y+=7});doc.save(`${s.id}-${s.name}-Profile.pdf`)}

function renderFees(){const active=db.students.filter(s=>s.status!=='Inactive');el('pageContent').innerHTML=`<div class="card"><h3>Collect Monthly Fee</h3><form id="feeForm" class="form-grid"><div class="field"><label>Student</label><select id="feeStudent" name="studentId" required>${active.map(s=>`<option value="${s.id}">${esc(s.id)} - ${esc(s.name)}</option>`).join('')}</select></div><div class="field"><label>Month</label><input id="feeMonth" type="month" name="month" value="${monthNow()}" required></div><div class="field"><label>Monthly Fee</label><input id="feeAmount" type="number" name="amount" readonly></div><div class="field"><label>Already Paid</label><input id="alreadyPaid" type="number" readonly></div><div class="field"><label>Balance</label><input id="feeBalance" type="number" readonly></div><div class="field"><label>Pay Now</label><input id="payNow" type="number" name="paid" required></div><div class="field"><label>Payment Date</label><input type="date" name="date" value="${today()}" required></div><div class="field"><label>Payment Mode</label><select name="mode"><option>Cash</option><option>UPI</option><option>Bank</option></select></div><div class="field"><label>Transaction / Note</label><input name="reference" placeholder="Optional"></div><div class="span-3"><button class="primary">Save & Generate Receipt</button></div></form></div><div class="card"><h3>Payment History</h3><div id="feeTable"></div></div>`;const refresh=()=>{const sid=el('feeStudent').value,m=el('feeMonth').value,s=db.students.find(x=>x.id===sid),amount=hallFee(s),paid=monthPaid(sid,m),bal=Math.max(0,amount-paid);el('feeAmount').value=amount;el('alreadyPaid').value=paid;el('feeBalance').value=bal;el('payNow').value=bal||'';el('payNow').max=bal};el('feeStudent').onchange=refresh;el('feeMonth').onchange=refresh;refresh();el('feeForm').onsubmit=e=>{e.preventDefault();const o=Object.fromEntries(new FormData(e.target)),balance=Number(el('feeBalance').value);o.id=uid();o.amount=Number(o.amount);o.paid=Number(o.paid);if(balance<=0)return alert('ఈ నెల fee ఇప్పటికే పూర్తిగా చెల్లించారు');if(o.paid<=0||o.paid>balance)return alert(`Pay Now amount ₹1 నుండి ${money(balance)} మధ్య ఉండాలి`);o.receipt=nextReceipt();db.fees.push(o);logAction('fee_paid',`Fee received: ${studentName(o.studentId)} - ${money(o.paid)} (${o.receipt})`);saveDB();downloadReceiptPDF(o.id);renderFees()};drawFees()}
function drawFees(){const list=[...db.fees].reverse();el('feeTable').innerHTML=list.length?`<div class="table-wrap"><table><thead><tr><th>Receipt</th><th>Student</th><th>Month</th><th>Paid</th><th>Date</th><th>Mode</th><th>Actions</th></tr></thead><tbody>${list.map(f=>`<tr><td>${esc(f.receipt||'-')}</td><td>${esc(studentName(f.studentId))}</td><td>${esc(f.month)}</td><td>${money(f.paid)}</td><td>${esc(f.date)}</td><td>${esc(f.mode)}</td><td class="receipt-actions"><button class="secondary" onclick="downloadReceiptPDF('${f.id}')">Receipt</button><button class="danger" onclick="deleteFee('${f.id}')">Delete</button></td></tr>`).join('')}</tbody></table></div>`:'<div class="empty">No payments</div>'}
window.downloadReceiptPDF=function(id){const f=db.fees.find(x=>x.id===id),s=f&&db.students.find(x=>x.id===f.studentId);if(!f||!s)return;const {jsPDF}=window.jspdf,doc=new jsPDF({format:'a5'});doc.setFontSize(17);doc.text(db.settings.hallName,74,18,{align:'center'});doc.setFontSize(11);doc.text('FEE RECEIPT',74,27,{align:'center'});doc.line(12,32,136,32);doc.setFontSize(10);const rows=[['Receipt No',f.receipt],['Date',f.date],['Student ID',s.id],['Student Name',s.name],['Month',f.month],['Monthly Fee',`Rs.${f.amount}`],['Paid Now',`Rs.${f.paid}`],['Payment Mode',f.mode],['Reference',f.reference||'-'],['Total Paid for Month',`Rs.${monthPaid(s.id,f.month)}`],['Balance',`Rs.${Math.max(0,hallFee(s)-monthPaid(s.id,f.month))}`]];let y=43;rows.forEach(r=>{doc.text(r[0],16,y);doc.text(': '+String(r[1]),60,y);y+=9});doc.line(12,y+2,136,y+2);doc.text('Authorized Signature',92,y+18);doc.save(`${f.receipt}-${s.name}.pdf`)}

function renderAttendance(){const d=window._attendanceDate||today();el('pageContent').innerHTML=`<div class="card"><div class="toolbar"><input id="attendanceDate" type="date" value="${d}"><button class="success" onclick="markAllAttendance('Present')">Mark All Present</button><button class="danger" onclick="markAllAttendance('Absent')">Mark All Absent</button><button class="secondary" onclick="downloadAttendancePDF()">Day PDF</button></div><div id="attendanceTable"></div></div><div class="card"><h3>Monthly Attendance Summary</h3><div class="toolbar"><input id="attendanceMonth" type="month" value="${d.slice(0,7)}"><button class="primary" onclick="downloadMonthlyAttendancePDF()">Monthly PDF</button></div><div id="attendanceSummary"></div></div>`;el('attendanceDate').onchange=e=>{window._attendanceDate=e.target.value;renderAttendance()};el('attendanceMonth').onchange=drawAttendanceSummary;drawAttendanceDay();drawAttendanceSummary()}
function drawAttendanceDay(){const d=el('attendanceDate').value,students=db.students.filter(s=>s.status!=='Inactive');el('attendanceTable').innerHTML=`<div class="table-wrap"><table><thead><tr><th>ID</th><th>Name</th><th>Status</th><th>Action</th></tr></thead><tbody>${students.map(s=>{const a=db.attendance.find(x=>x.studentId===s.id&&x.date===d);return `<tr><td>${s.id}</td><td>${esc(s.name)}</td><td><span class="badge ${a?.status==='Present'?'present':a?.status==='Absent'?'absent':'pending'}">${a?.status||'Not Marked'}</span></td><td><button class="success" onclick="markAttendanceForDate('${s.id}','Present','${d}')">Present</button> <button class="danger" onclick="markAttendanceForDate('${s.id}','Absent','${d}')">Absent</button></td></tr>`}).join('')}</tbody></table></div>`}
window.markAttendanceForDate=(studentId,status,date)=>{db.attendance=db.attendance.filter(x=>!(x.studentId===studentId&&x.date===date));db.attendance.push({studentId,date,status,time:new Date().toLocaleTimeString()});logAction('attendance',`${studentName(studentId)} marked ${status} on ${date}`);saveDB();drawAttendanceDay();drawAttendanceSummary()};window.markAllAttendance=status=>{const d=el('attendanceDate').value;db.students.filter(s=>s.status!=='Inactive').forEach(s=>{db.attendance=db.attendance.filter(x=>!(x.studentId===s.id&&x.date===d));db.attendance.push({studentId:s.id,date:d,status,time:new Date().toLocaleTimeString()})});logAction('attendance_bulk',`All students marked ${status} on ${d}`);saveDB();drawAttendanceDay();drawAttendanceSummary()}
function drawAttendanceSummary(){const m=el('attendanceMonth').value,list=db.students.filter(s=>s.status!=='Inactive').map(s=>{const a=db.attendance.filter(x=>x.studentId===s.id&&x.date.startsWith(m));return {s,p:a.filter(x=>x.status==='Present').length,a:a.filter(x=>x.status==='Absent').length}});el('attendanceSummary').innerHTML=`<div class="table-wrap"><table><thead><tr><th>ID</th><th>Name</th><th>Present</th><th>Absent</th><th>Marked Days</th></tr></thead><tbody>${list.map(x=>`<tr><td>${x.s.id}</td><td>${esc(x.s.name)}</td><td>${x.p}</td><td>${x.a}</td><td>${x.p+x.a}</td></tr>`).join('')}</tbody></table></div>`}
window.downloadAttendancePDF=()=>{const d=el('attendanceDate').value,{jsPDF}=window.jspdf,doc=new jsPDF();doc.setFontSize(15);doc.text(`${db.settings.hallName} - Attendance`,14,18);doc.setFontSize(10);doc.text(`Date: ${d}`,14,27);let y=38;db.students.filter(s=>s.status!=='Inactive').forEach((s,i)=>{const a=db.attendance.find(x=>x.studentId===s.id&&x.date===d);doc.text(`${i+1}. ${s.id} - ${s.name} - ${a?.status||'Not Marked'}`,14,y);y+=7;if(y>282){doc.addPage();y=18}});doc.save(`Attendance-${d}.pdf`)}
window.downloadMonthlyAttendancePDF=()=>{const m=el('attendanceMonth').value,{jsPDF}=window.jspdf,doc=new jsPDF();doc.setFontSize(15);doc.text(`${db.settings.hallName} - Monthly Attendance`,14,18);doc.setFontSize(10);doc.text(`Month: ${m}`,14,27);let y=38;db.students.filter(s=>s.status!=='Inactive').forEach((s,i)=>{const a=db.attendance.filter(x=>x.studentId===s.id&&x.date.startsWith(m)),p=a.filter(x=>x.status==='Present').length,ab=a.filter(x=>x.status==='Absent').length;doc.text(`${i+1}. ${s.id} - ${s.name} | Present: ${p} | Absent: ${ab}`,14,y);y+=7;if(y>282){doc.addPage();y=18}});doc.save(`Monthly-Attendance-${m}.pdf`)}

function renderNotices(){const list=[...(db.notices||[])].sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt)));el('pageContent').innerHTML=`<div class="card"><h3>Add Notice</h3><form id="noticeForm" class="form-grid"><div class="field span-2"><label>Title</label><input name="title" required></div><div class="field"><label>Priority</label><select name="priority"><option>Normal</option><option>Urgent</option></select></div><div class="field span-3"><label>Notice</label><textarea name="message" required></textarea></div><div class="span-3"><button class="primary">Publish Notice</button></div></form></div><div class="card"><h3>Notice Board</h3>${list.length?list.map(n=>`<div class="notice-card ${n.priority==='Urgent'?'urgent':''}"><div style="display:flex;justify-content:space-between;gap:10px"><b>${esc(n.title)}</b><button class="danger" onclick="deleteNotice('${n.id}')">Delete</button></div><p>${esc(n.message)}</p><small class="muted">${fmtDateTime(n.createdAt)} • ${esc(n.priority)}</small></div>`).join(''):'<div class="empty">No notices</div>'}</div>`;el('noticeForm').onsubmit=e=>{e.preventDefault();const o=Object.fromEntries(new FormData(e.target));o.id=uid();o.createdAt=new Date().toISOString();db.notices.push(o);logAction('notice',`Notice published: ${o.title}`);saveDB();renderNotices()}}
window.deleteNotice=id=>{if(confirm('Delete notice?')){db.notices=db.notices.filter(x=>x.id!==id);saveDB();renderNotices()}}
function renderDiary(){const d=window._diaryDate||today(),entry=db.diary.find(x=>x.date===d)||{};el('pageContent').innerHTML=`<div class="card"><div class="toolbar"><input id="diaryDate" type="date" value="${d}"><button class="secondary" onclick="downloadDailyClosingPDF()">Closing Report PDF</button></div><form id="diaryForm" class="form-grid"><div class="field span-3"><label>Important Notes</label><textarea name="notes" placeholder="Admissions, visitors, complaints, special events...">${esc(entry.notes||'')}</textarea></div><div class="field"><label>Cash Expenses</label><input type="number" name="expenses" value="${Number(entry.expenses||0)}"></div><div class="field span-2"><label>Expense Details</label><input name="expenseDetails" value="${esc(entry.expenseDetails||'')}"></div><div class="span-3"><button class="primary">Save Daily Diary</button></div></form></div><div class="card"><h3>Automatic Day Summary</h3><div id="dailySummary" class="diary-summary"></div></div>`;el('diaryDate').onchange=e=>{window._diaryDate=e.target.value;renderDiary()};el('diaryForm').onsubmit=e=>{e.preventDefault();const o=Object.fromEntries(new FormData(e.target));o.date=d;o.expenses=Number(o.expenses||0);o.updatedAt=new Date().toISOString();db.diary=db.diary.filter(x=>x.date!==d);db.diary.push(o);logAction('diary',`Daily diary saved for ${d}`);saveDB();renderDiary()};el('dailySummary').textContent=buildDailySummary(d)}
function buildDailySummary(d){const admissions=db.students.filter(s=>s.joinDate===d).length,fees=db.fees.filter(f=>f.date===d),collection=fees.reduce((a,f)=>a+Number(f.paid||0),0),present=db.attendance.filter(a=>a.date===d&&a.status==='Present').length,absent=db.attendance.filter(a=>a.date===d&&a.status==='Absent').length,out=db.movements.filter(m=>String(m.outTime||'').startsWith(d)).length,returned=db.movements.filter(m=>String(m.returnTime||'').startsWith(d)).length,entry=db.diary.find(x=>x.date===d)||{};return `Date: ${d}\nNew Admissions: ${admissions}\nFee Transactions: ${fees.length}\nFee Collection: ${money(collection)}\nPresent: ${present}\nAbsent: ${absent}\nWent Outside: ${out}\nReturned: ${returned}\nExpenses: ${money(entry.expenses||0)}\nNet Cash Position: ${money(collection-Number(entry.expenses||0))}\n\nNotes: ${entry.notes||'-'}\nExpense Details: ${entry.expenseDetails||'-'}`}
window.downloadDailyClosingPDF=()=>{const d=el('diaryDate').value,{jsPDF}=window.jspdf,doc=new jsPDF();doc.setFontSize(16);doc.text(db.settings.hallName,14,18);doc.setFontSize(12);doc.text('Daily Closing Report',14,27);doc.setFontSize(10);const lines=doc.splitTextToSize(buildDailySummary(d),180);doc.text(lines,14,40);doc.save(`Daily-Closing-${d}.pdf`)}

function renderReports(){el('pageContent').innerHTML=`<div class="grid stats"><div class="card"><h3>Student List</h3><p class="muted">All active and inactive students.</p><button class="primary" onclick="downloadStudentsPDF()">Download PDF</button></div><div class="card"><h3>Pending Fees</h3><p class="muted">Current month pending list.</p><button class="primary" onclick="downloadPendingPDF()">Download PDF</button></div><div class="card"><h3>Daily Closing</h3><p class="muted">Today collection, attendance and movement.</p><button class="primary" onclick="render('diary')">Open Diary</button></div><div class="card"><h3>Backup</h3><p class="muted">Complete local database backup.</p><button class="secondary" onclick="downloadBackup()">Download JSON</button></div><div class="card"><h3>Restore Backup</h3><p class="muted">Restore a valid Sri Nidhi backup.</p><input id="restoreFile" type="file" accept="application/json"><button class="secondary" onclick="restoreBackup()">Restore</button></div><div class="card"><h3>Install as App</h3><p class="muted">Chrome menu → Add to Home screen.</p><div class="install-tip">Works after GitHub Pages deployment.</div></div></div>`}

/* v2.5 Build 2 — Student Master, PDF/Excel/CSV bulk import */
let studentImportRows=[];
function uniqueStudentValues(key){return [...new Set(db.students.map(s=>String(s[key]||'').trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b))}
function renderStudents(){const batches=uniqueStudentValues('batch');el('pageContent').innerHTML=`
<div class="student-summary-grid">
 <div><b>${db.students.length}</b><span>Total Students</span></div>
 <div><b>${db.students.filter(s=>(s.status||'Active')==='Active').length}</b><span>Active</span></div>
 <div><b>${db.students.filter(s=>(s.status||'Active')==='Inactive').length}</b><span>Inactive</span></div>
 <div><b>${uniqueStudentValues('batch').length}</b><span>Batches</span></div>
</div>
<div class="student-actions-grid">
 <button class="student-action-card" onclick="showStudentForm()"><b>Add Single Student</b><span>Enter one student manually</span></button>
 <button class="student-action-card" onclick="openStudentImport('pdf')"><b>Import PDF</b><span>Auto read, preview and bulk save</span></button>
 <button class="student-action-card" onclick="openStudentPaste()"><b>Paste Data Bulk Add</b><span>Paste rows, parse, preview and save</span></button>
 <button class="student-action-card" onclick="openStudentImport('sheet')"><b>Excel / CSV Import</b><span>Upload spreadsheet or CSV file</span></button>
</div>
<div class="card student-master-card">
 <div class="student-toolbar">
  <input id="studentSearch" placeholder="Search name, ID, phone, parent, course, batch, seat or Aadhaar">
  <select id="batchFilter"><option value="">All Batches</option>${batches.map(x=>`<option>${esc(x)}</option>`).join('')}</select>
  <select id="statusFilter"><option value="">All Status</option><option>Active</option><option>Inactive</option></select>
  <select id="genderFilter"><option value="">All Gender</option><option>Female</option><option>Male</option><option>Other</option></select>
  <button class="secondary" onclick="clearStudentFilters()">Clear</button>
 </div>
 <div id="studentResultInfo" class="student-result-info"></div>
 <div id="studentsTable"></div>
</div>`;
['studentSearch','batchFilter','statusFilter','genderFilter'].forEach(id=>{const x=el(id);if(x)x[id==='studentSearch'?'oninput':'onchange']=drawStudents});drawStudents()}
window.clearStudentFilters=function(){['studentSearch','batchFilter','statusFilter','genderFilter'].forEach(id=>{if(el(id))el(id).value=''});drawStudents()}
function studentCard(s){return `<article class="student-mobile-card">
 <div class="student-card-head" onclick="viewStudent('${s.id}')">${avatar(s)}<div><h3>${esc(s.name)}</h3><p>${esc(s.id)} · ${esc(s.course||'No Course')}</p></div><span class="badge ${(s.status||'Active')==='Inactive'?'absent':'present'}">${esc(s.status||'Active')}</span></div>
 <div class="student-card-details"><span><b>Phone</b>${esc(s.phone||'-')}</span><span><b>Batch</b>${esc(s.batch||'-')}</span><span><b>Seat</b>${esc(s.seat||'-')}</span><span><b>Fee</b>${money(hallFee(s))}</span></div>
 <div class="student-card-parent"><b>Parent:</b> ${esc(s.parentName||s.fatherName||s.motherName||'-')} ${s.parentPhone||s.fatherPhone?`· ${esc(s.parentPhone||s.fatherPhone)}`:''}</div>
 <div class="student-card-actions"><button class="secondary" onclick="viewStudent('${s.id}')">View</button><button class="secondary" onclick="editStudent('${s.id}')">Edit</button><button class="danger" onclick="deleteStudent('${s.id}')">Delete</button></div>
 </article>`}
function drawStudents(){const q=(el('studentSearch')?.value||'').trim().toLowerCase(),g=el('genderFilter')?.value||'',st=el('statusFilter')?.value||'',batch=el('batchFilter')?.value||'';const list=db.students.filter(s=>(!g||s.gender===g)&&(!st||(s.status||'Active')===st)&&(!batch||(s.batch||'')===batch)&&[s.id,s.name,s.phone,s.parentName,s.parentPhone,s.fatherName,s.fatherPhone,s.motherName,s.motherPhone,s.course,s.batch,s.seat,s.aadhaar,s.address].join(' ').toLowerCase().includes(q));const info=el('studentResultInfo');if(info)info.textContent=`Showing ${list.length} of ${db.students.length} students`;el('studentsTable').innerHTML=list.length?`<div class="student-mobile-list">${list.map(studentCard).join('')}</div><div class="student-desktop-table table-wrap"><table><thead><tr><th>Student</th><th>ID</th><th>Phone</th><th>Parent</th><th>Course / Batch</th><th>Joining</th><th>Fee</th><th>Status</th><th>Actions</th></tr></thead><tbody>${list.map(s=>`<tr><td><div class="student-name">${avatar(s)}<div><b>${esc(s.name)}</b><small>${esc(s.seat||'No seat')}</small></div></div></td><td>${esc(s.id)}</td><td>${esc(s.phone||'-')}</td><td>${esc(s.parentName||s.fatherName||s.motherName||'-')}<br><small>${esc(s.parentPhone||s.fatherPhone||'-')}</small></td><td>${esc(s.course||'-')} / ${esc(s.batch||'-')}</td><td>${esc(s.joinDate||'-')}</td><td>${money(hallFee(s))}</td><td><span class="badge ${(s.status||'Active')==='Inactive'?'absent':'present'}">${esc(s.status||'Active')}</span></td><td><div class="row-actions"><button class="secondary" onclick="viewStudent('${s.id}')">View</button><button class="secondary" onclick="editStudent('${s.id}')">Edit</button><button class="danger" onclick="deleteStudent('${s.id}')">Delete</button></div></td></tr>`).join('')}</tbody></table></div>`:'<div class="empty">No students match the selected search or filters.</div>'}
function studentForm(s={}){return `<form id="studentForm" class="form-grid">
<div class="section-title">Student Details</div>
<div class="field"><label>Student ID *</label><input name="id" value="${esc(s.id||nextStudentId())}" required ${s.id?'readonly':''}></div><div class="field"><label>Full Name *</label><input name="name" value="${esc(s.name||'')}" required></div><div class="field"><label>Gender</label><select name="gender"><option ${s.gender==='Female'?'selected':''}>Female</option><option ${s.gender==='Male'?'selected':''}>Male</option><option ${s.gender==='Other'?'selected':''}>Other</option></select></div>
<div class="field"><label>Date of Birth</label><input type="date" name="dob" value="${esc(s.dob||'')}"></div><div class="field"><label>Student Phone</label><input name="phone" inputmode="numeric" value="${esc(s.phone||'')}"></div><div class="field"><label>Student Aadhaar</label><input name="aadhaar" inputmode="numeric" maxlength="12" value="${esc(s.aadhaar||'')}"></div>
<div class="field"><label>Photo</label><input id="photoInput" type="file" accept="image/*"></div><div class="field"><label>Photo Preview</label><img id="photoPreview" class="photo-preview" src="${s.photo||''}" alt=""></div>
<div class="section-title">Parent Details</div>
<div class="field"><label>Father Name</label><input name="fatherName" value="${esc(s.fatherName||s.parentName||'')}"></div><div class="field"><label>Father Phone</label><input name="fatherPhone" inputmode="numeric" value="${esc(s.fatherPhone||s.parentPhone||'')}"></div><div class="field"><label>Father Aadhaar</label><input name="fatherAadhaar" inputmode="numeric" maxlength="12" value="${esc(s.fatherAadhaar||'')}"></div>
<div class="field"><label>Mother Name</label><input name="motherName" value="${esc(s.motherName||'')}"></div><div class="field"><label>Mother Phone</label><input name="motherPhone" inputmode="numeric" value="${esc(s.motherPhone||'')}"></div><div class="field"><label>Mother Aadhaar</label><input name="motherAadhaar" inputmode="numeric" maxlength="12" value="${esc(s.motherAadhaar||'')}"></div>
<div class="field"><label>Emergency Phone</label><input name="emergencyPhone" inputmode="numeric" value="${esc(s.emergencyPhone||'')}"></div><div class="field span-3"><label>Address</label><textarea name="address">${esc(s.address||'')}</textarea></div>
<div class="section-title">Study Hall & Fee Details</div>
<div class="field"><label>Course / Exam</label><input name="course" value="${esc(s.course||'')}"></div><div class="field"><label>Batch / Timing</label><input name="batch" value="${esc(s.batch||'')}"></div><div class="field"><label>Seat Number</label><input name="seat" value="${esc(s.seat||'')}"></div>
<div class="field"><label>Joining Date</label><input type="date" name="joinDate" value="${esc(s.joinDate||today())}"></div><div class="field"><label>Monthly Fee</label><input type="number" name="monthlyFee" value="${hallFee(s)}"></div><div class="field"><label>Next Due Date</label><input type="date" name="nextDueDate" value="${esc(s.nextDueDate||addOneMonth(s.joinDate||today()))}"></div>
<div class="field"><label>Status</label><select name="status"><option ${s.status!=='Inactive'?'selected':''}>Active</option><option ${s.status==='Inactive'?'selected':''}>Inactive</option></select></div><input type="hidden" name="photo" value="${s.photo||''}"><input type="hidden" name="parentName" value="${esc(s.parentName||'')}"><input type="hidden" name="parentPhone" value="${esc(s.parentPhone||'')}">
<div class="span-3 actions"><button class="primary" type="submit">Save Student</button><button type="button" class="secondary" onclick="closeModal()">Cancel</button></div></form>`}
function addOneMonth(d){const x=new Date((d||today())+'T00:00:00');x.setMonth(x.getMonth()+1);return x.toISOString().slice(0,10)}
function bindStudentForm(editId=null){const form=el('studentForm'),photo=el('photoInput'),preview=el('photoPreview');if(photo)photo.onchange=()=>{const file=photo.files[0];if(!file)return;if(file.size>800000)return alert('Photo size 800 KB లోపు ఉండాలి.');const r=new FileReader();r.onload=()=>{form.elements.photo.value=r.result;preview.src=r.result};r.readAsDataURL(file)};form.elements.joinDate.onchange=()=>{if(!editId)form.elements.nextDueDate.value=addOneMonth(form.elements.joinDate.value)};form.onsubmit=e=>{e.preventDefault();const o=Object.fromEntries(new FormData(form));o.monthlyFee=Number(o.monthlyFee||db.settings.monthlyFee);o.parentName=o.fatherName||o.motherName||'';o.parentPhone=o.fatherPhone||o.motherPhone||'';for(const k of ['phone','fatherPhone','motherPhone','emergencyPhone']){const v=(o[k]||'').replace(/\D/g,'');if(v&&v.length!==10)return alert(`${k} number 10 digits ఉండాలి`);o[k]=v}for(const k of ['aadhaar','fatherAadhaar','motherAadhaar']){const v=(o[k]||'').replace(/\D/g,'');if(v&&v.length!==12)return alert(`${k} 12 digits ఉండాలి`);o[k]=v}const duplicate=db.students.find(s=>s.id!==editId&&((o.aadhaar&&s.aadhaar===o.aadhaar)||(o.phone&&s.phone===o.phone)));if(duplicate)return alert(`Duplicate warning: ${duplicate.id} - ${duplicate.name}`);if(editId)db.students=db.students.map(s=>s.id===editId?o:s);else{if(db.students.some(s=>s.id===o.id))return alert('Student ID already exists');db.students.push(o)}saveDB();closeModal();render('students');alert('Student saved successfully')}}
window.showStudentForm=()=>{openModal(`<h3>Add Single Student</h3>${studentForm()}`);bindStudentForm()};
window.editStudent=id=>{const s=db.students.find(x=>x.id===id);openModal(`<h3>Edit Student</h3>${studentForm(s)}`);bindStudentForm(id)};
window.openStudentPaste=function(){studentImportRows=[];openModal(`<h2>Paste Data Bulk Add</h2><p class="muted">Excel, WhatsApp, Google Keep లేదా table నుంచి student data paste చేయండి. మొదటి row headings ఉంటే వాటిని automaticగా గుర్తిస్తుంది.</p><div class="paste-help"><b>Recommended columns:</b> Student ID, Student Name, Gender, DOB, Student Phone, Student Aadhaar, Father Name, Father Phone, Mother Name, Mother Phone, Address, Course, Batch, Seat, Joining Date, Monthly Fee, Status</div><textarea id="studentPasteData" class="student-paste-box" placeholder="Student ID\tStudent Name\tPhone\tFather Name\nSN0001\tRavi Kumar\t9876543210\tRamesh"></textarea><div class="actions paste-actions"><button class="primary" onclick="parseStudentPaste()">Parse Data</button><button class="secondary" onclick="loadPasteSample()">Show & Parse Sample</button><button class="secondary" onclick="clearStudentPaste()">Clear</button></div><div id="importMessage" class="import-message">Data paste చేసి <b>Parse Data</b> నొక్కండి.</div><div id="studentImportPreview"></div>`);const t=el('studentPasteData');if(t)t.addEventListener('paste',()=>setTimeout(()=>{if(t.value.trim())parseStudentPaste()},120))};
window.loadPasteSample=function(){const t=el('studentPasteData');if(t){t.value='Student ID\tStudent Name\tGender\tStudent Phone\tFather Name\tMother Name\tCourse\tBatch\tJoining Date\tMonthly Fee\nSN0001\tSample Student\tFemale\t9876543210\tFather Name\tMother Name\tDSC\tMorning\t2026-07-20\t1500';parseStudentPaste()}};
window.clearStudentPaste=function(){const t=el('studentPasteData');if(t)t.value='';studentImportRows=[];const p=el('studentImportPreview');if(p)p.innerHTML='';const m=el('importMessage');if(m)m.textContent=''};
window.parseStudentPaste=function(){const text=(el('studentPasteData')?.value||'').trim();if(!text)return alert('Student data paste చేయండి');try{const raw=parsePastedStudentData(text);studentImportRows=raw.map(normalizeImportStudent);renderStudentImportPreview();setTimeout(()=>el('studentImportPreview')?.scrollIntoView({behavior:'smooth',block:'start'}),120)}catch(e){console.error(e);el('importMessage').textContent='Data parse కాలేదు: '+e.message}};
function parsePastedStudentData(text){const lines=text.replace(/^\uFEFF/,'').split(/\r?\n/).map(x=>x.trim()).filter(Boolean);if(!lines.length)return[];const splitLine=line=>{if(line.includes('\t'))return line.split('\t').map(x=>x.trim());if(line.includes('|'))return line.split(/\s*\|\s*/).map(x=>x.trim());if(line.includes(','))return parseCSV(line+'\n').length?[]:splitCSVLine(line);return line.split(/\s{2,}/).map(x=>x.trim()).filter(Boolean)};const splitCSVLine=line=>{const out=[];let q=false,v='';for(let i=0;i<line.length;i++){const c=line[i];if(c==='"'){if(q&&line[i+1]==='"'){v+='"';i++}else q=!q}else if(c===','&&!q){out.push(v.trim());v=''}else v+=c}out.push(v.trim());return out};let rows=lines.map(line=>line.includes(',')?splitCSVLine(line):splitLine(line));const looksHeader=rows[0].some(v=>/(student|name|phone|mobile|aadhaar|father|mother|gender|course|batch|joining|fee|status|address|seat|dob|id)/i.test(v));let headers;if(looksHeader){headers=rows.shift()}else{headers=['Student ID','Student Name','Gender','Student Phone','Student Aadhaar','Father Name','Father Phone','Mother Name','Mother Phone','Address','Course','Batch','Seat','Joining Date','Monthly Fee','Status']}
return rows.filter(r=>r.some(Boolean)).map(r=>Object.fromEntries(headers.map((h,i)=>[h,r[i]||''])))}
window.openStudentImport=function(type){const accept=type==='pdf'?'.pdf':'.xlsx,.xls,.csv';openModal(`<h2>${type==='pdf'?'PDF Auto Import':'Excel / CSV Bulk Add'}</h2><p class="muted">File select చేసిన తర్వాత data previewలో చూపబడుతుంది. Save ముందు ప్రతి row edit చేయవచ్చు.</p><div class="import-drop"><input id="studentImportFile" type="file" accept="${accept}"><button class="primary" onclick="readStudentImport('${type}')">Read File</button></div><div id="importMessage" class="import-message"></div><div id="studentImportPreview"></div>`) };
window.readStudentImport=async function(type){const f=el('studentImportFile')?.files?.[0];if(!f)return alert('ముందుగా file select చేయండి');el('importMessage').textContent='Reading file...';try{studentImportRows=type==='pdf'?await readStudentPDF(f):await readStudentSheet(f);studentImportRows=studentImportRows.map(normalizeImportStudent).filter(x=>x.name);renderStudentImportPreview()}catch(e){console.error(e);el('importMessage').textContent='File read కాలేదు: '+e.message}}
async function readStudentSheet(file){if(file.name.toLowerCase().endsWith('.csv'))return parseCSV(await file.text());if(!window.XLSX)throw new Error('Excel reader load కాలేదు. Internet connection check చేయండి.');const buf=await file.arrayBuffer(),wb=XLSX.read(buf),ws=wb.Sheets[wb.SheetNames[0]];return XLSX.utils.sheet_to_json(ws,{defval:''})}
function parseCSV(text){const lines=text.replace(/^\uFEFF/,'').split(/\r?\n/).filter(Boolean);if(!lines.length)return[];const split=line=>{const out=[];let q=false,v='';for(let i=0;i<line.length;i++){const c=line[i];if(c==='"'){if(q&&line[i+1]==='"'){v+='"';i++}else q=!q}else if(c===','&&!q){out.push(v.trim());v=''}else v+=c}out.push(v.trim());return out};const h=split(lines[0]);return lines.slice(1).map(l=>Object.fromEntries(split(l).map((v,i)=>[h[i]||`Column${i+1}`,v])))}
async function readStudentPDF(file){if(!window.pdfjsLib)throw new Error('PDF reader load కాలేదు. Internet connection check చేయండి.');pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs';const pdf=await pdfjsLib.getDocument({data:await file.arrayBuffer()}).promise;let lines=[];for(let p=1;p<=pdf.numPages;p++){const page=await pdf.getPage(p),content=await page.getTextContent(),items=content.items.map(i=>({s:i.str.trim(),x:i.transform[4],y:i.transform[5]})).filter(i=>i.s);const groups={};items.forEach(i=>{const y=Math.round(i.y/3)*3;(groups[y]??=[]).push(i)});Object.keys(groups).sort((a,b)=>b-a).forEach(y=>lines.push(groups[y].sort((a,b)=>a.x-b.x).map(i=>i.s).join(' | ')))}return parsePDFStudentLines(lines)}
function parsePDFStudentLines(lines){const useful=lines.filter(x=>/\d/.test(x)&&x.length>3);let rows=[];for(const line of useful){const c=line.split(/\s*\|\s*|\t|\s{2,}/).map(x=>x.trim()).filter(Boolean);if(c.length<2)continue;const phone=c.find(x=>/^\d{10}$/.test(x.replace(/\D/g,'')));const aadhaar=c.find(x=>/^\d{12}$/.test(x.replace(/\D/g,'')));const id=c.find(x=>/^(SN|STU|STD)?\d{2,}$/i.test(x.replace(/[-/ ]/g,'')));const name=c.find(x=>/[A-Za-z\u0C00-\u0C7F]{3}/.test(x)&&!/(father|mother|phone|aadhaar|name|student|class|batch)/i.test(x));if(name)rows.push({id:id||'',name,phone:phone||'',aadhaar:aadhaar||'',fatherName:c[c.indexOf(name)+1]||'',raw:line})}return rows}
function normalizeImportStudent(r){const pick=(...names)=>{for(const [k,v] of Object.entries(r)){const key=k.toLowerCase().replace(/[^a-z0-9]/g,'');if(names.some(n=>key===n||key.includes(n)))return String(v||'').trim()}return''};return {id:pick('studentid','id','admissionno','rollno')||'',name:pick('studentname','fullname','name'),gender:pick('gender','sex')||'Female',dob:dateVal(pick('dob','dateofbirth')),phone:digits(pick('studentphone','mobile','phone'),10),aadhaar:digits(pick('studentaadhaar','aadhaar'),12),fatherName:pick('fathername','father','parentname','guardian'),fatherPhone:digits(pick('fatherphone','parentphone','guardianphone'),10),fatherAadhaar:digits(pick('fatheraardhaar'),12),motherName:pick('mothername','mother'),motherPhone:digits(pick('motherphone'),10),motherAadhaar:digits(pick('motheraadhaar'),12),address:pick('address'),course:pick('course','exam','class'),batch:pick('batch','timing'),seat:pick('seat','seatno'),joinDate:dateVal(pick('joiningdate','joindate','admissiondate'))||today(),monthlyFee:Number(pick('monthlyfee','fee','amount')||db.settings.monthlyFee),status:pick('status')||'Active'}}
function digits(v,n){const d=String(v||'').replace(/\D/g,'');return d.length===n?d:''}function dateVal(v){if(!v)return'';const d=new Date(v);return isNaN(d)?'':d.toISOString().slice(0,10)}
function renderStudentImportPreview(){const msg=el('importMessage');msg.textContent=studentImportRows.length?`${studentImportRows.length} records found. Check and save.`:'Student records గుర్తించబడలేదు. Excel/CSV template ఉపయోగించండి లేదా PDFలో table text ఉండాలి.';const box=el('studentImportPreview');if(!studentImportRows.length){box.innerHTML='<button class="secondary" onclick="downloadStudentTemplate()">Download CSV Template</button>';return}box.innerHTML=`<div class="import-summary"><b>${studentImportRows.length} Records</b><span id="importValidCount"></span></div><div class="table-wrap import-table"><table><thead><tr><th>#</th><th>ID</th><th>Name *</th><th>Phone</th><th>Father</th><th>Mother</th><th>Join Date</th><th>Fee</th><th></th></tr></thead><tbody>${studentImportRows.map((r,i)=>`<tr data-i="${i}"><td>${i+1}</td><td><input data-k="id" value="${esc(r.id)}" placeholder="Auto"></td><td><input data-k="name" value="${esc(r.name)}"></td><td><input data-k="phone" value="${esc(r.phone)}"></td><td><input data-k="fatherName" value="${esc(r.fatherName)}"></td><td><input data-k="motherName" value="${esc(r.motherName)}"></td><td><input type="date" data-k="joinDate" value="${esc(r.joinDate)}"></td><td><input type="number" data-k="monthlyFee" value="${r.monthlyFee}"></td><td><button class="danger" onclick="removeImportRow(${i})">×</button></td></tr>`).join('')}</tbody></table></div><div class="actions"><button class="primary" onclick="saveImportedStudents()">Save All Students</button><button class="secondary" onclick="downloadStudentTemplate()">CSV Template</button></div>`}
window.removeImportRow=i=>{studentImportRows.splice(i,1);renderStudentImportPreview()};
window.saveImportedStudents=function(){document.querySelectorAll('#studentImportPreview tbody tr').forEach(tr=>{const i=Number(tr.dataset.i);tr.querySelectorAll('[data-k]').forEach(inp=>studentImportRows[i][inp.dataset.k]=inp.type==='number'?Number(inp.value):inp.value.trim())});let added=0,skipped=[];for(const r of studentImportRows){if(!r.name){skipped.push('Missing name');continue}r.id=r.id||nextStudentId();const dup=db.students.find(s=>s.id===r.id||(r.aadhaar&&s.aadhaar===r.aadhaar)||(r.phone&&s.phone===r.phone));if(dup){skipped.push(`${r.name} (${dup.id})`);continue}r.nextDueDate=addOneMonth(r.joinDate);r.parentName=r.fatherName||r.motherName||'';r.parentPhone=r.fatherPhone||r.motherPhone||'';db.students.push(r);added++}db.importHistory=db.importHistory||[];db.importHistory.push({id:uid(),date:new Date().toISOString(),added,skipped:skipped.length});saveDB();closeModal();render('students');alert(`${added} students added. ${skipped.length} duplicates/invalid skipped.`)}
window.downloadStudentTemplate=function(){const csv='Student ID,Student Name,Gender,DOB,Student Phone,Student Aadhaar,Father Name,Father Phone,Father Aadhaar,Mother Name,Mother Phone,Mother Aadhaar,Address,Course,Batch,Seat,Joining Date,Monthly Fee,Status\nSN0001,Sample Student,Female,2010-01-01,9876543210,123456789012,Father Name,9876543211,123456789013,Mother Name,9876543212,123456789014,Address,DSC,Morning,A01,2026-07-20,1500,Active';const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));a.download='Sri-Nidhi-Student-Import-Template.csv';a.click();URL.revokeObjectURL(a.href)}

/* v2.5 Build 5 — mobile-first preview grid, row actions and save workflow */
function syncStudentImportRows(){
 document.querySelectorAll('#studentImportPreview tbody tr[data-i]').forEach(tr=>{
  const i=Number(tr.dataset.i),row=studentImportRows[i]; if(!row)return;
  tr.querySelectorAll('[data-k]').forEach(inp=>row[inp.dataset.k]=inp.type==='number'?Number(inp.value||0):inp.value.trim());
  const cb=tr.querySelector('.import-select'); if(cb)row._selected=cb.checked;
 });
}
function importRowIssues(row,index){
 const issues=[];
 if(!String(row.name||'').trim())issues.push('Student Name required');
 const id=String(row.id||'').trim(),phone=String(row.phone||'').replace(/\D/g,''),aadhaar=String(row.aadhaar||'').replace(/\D/g,'');
 if(phone&&phone.length!==10)issues.push('Phone must be 10 digits');
 if(aadhaar&&aadhaar.length!==12)issues.push('Aadhaar must be 12 digits');
 const otherRows=studentImportRows.filter((_,i)=>i!==index);
 if(id&&(db.students.some(s=>s.id===id)||otherRows.some(r=>String(r.id||'').trim()===id)))issues.push('Duplicate Student ID');
 if(phone&&(db.students.some(s=>s.phone===phone)||otherRows.some(r=>String(r.phone||'').replace(/\D/g,'')===phone)))issues.push('Duplicate Phone');
 if(aadhaar&&(db.students.some(s=>s.aadhaar===aadhaar)||otherRows.some(r=>String(r.aadhaar||'').replace(/\D/g,'')===aadhaar)))issues.push('Duplicate Aadhaar');
 return issues;
}
function updateStudentImportValidation(){
 syncStudentImportRows();
 let valid=0,duplicate=0,invalid=0,selected=0;
 studentImportRows.forEach((r,i)=>{
  const issues=importRowIssues(r,i),tr=document.querySelector(`#studentImportPreview tr[data-i="${i}"]`);
  r._issues=issues;
  if(r._selected!==false)selected++;
  if(!issues.length)valid++; else if(issues.some(x=>x.startsWith('Duplicate')))duplicate++; else invalid++;
  if(tr){tr.classList.toggle('row-valid',!issues.length);tr.classList.toggle('row-invalid',issues.length>0);tr.classList.toggle('row-duplicate',issues.some(x=>x.startsWith('Duplicate')));const cell=tr.querySelector('.import-status-cell');if(cell)cell.innerHTML=issues.length?`<span class="import-error" title="${esc(issues.join(', '))}">${esc(issues[0])}</span>`:'<span class="import-ok">Valid</span>';}
 });
 const s=el('importStats');if(s)s.innerHTML=`<span><b>${studentImportRows.length}</b> Parsed</span><span><b>${valid}</b> Valid</span><span><b>${duplicate}</b> Duplicate</span><span><b>${invalid}</b> Invalid</span><span><b>${selected}</b> Selected</span>`;
 const all=el('importSelectAll');if(all)all.checked=studentImportRows.length>0&&studentImportRows.every(r=>r._selected!==false);
}
window.toggleImportAll=function(checked){studentImportRows.forEach(r=>r._selected=checked);document.querySelectorAll('.import-select').forEach(x=>x.checked=checked);updateStudentImportValidation()};
window.toggleImportRow=function(i,checked){if(studentImportRows[i])studentImportRows[i]._selected=checked;updateStudentImportValidation()};
window.renderStudentImportPreview=function(){
 const msg=el('importMessage');
 msg.textContent=studentImportRows.length?`${studentImportRows.length} records parsed. Invalid or duplicate rows are highlighted.`:'Student records గుర్తించబడలేదు. Excel/CSV template ఉపయోగించండి లేదా PDFలో table text ఉండాలి.';
 const box=el('studentImportPreview');if(!box)return;
 if(!studentImportRows.length){box.innerHTML='<button class="secondary" onclick="downloadStudentTemplate()">Download CSV Template</button>';return}
 studentImportRows.forEach(r=>{if(r._selected===undefined)r._selected=true});
 box.innerHTML=`<div id="importStats" class="import-stats"></div><div class="table-wrap import-table excel-preview"><table><thead><tr><th><input id="importSelectAll" type="checkbox" checked onchange="toggleImportAll(this.checked)"></th><th>#</th><th>ID</th><th>Name *</th><th>Phone</th><th>Aadhaar</th><th>Father</th><th>Mother</th><th>Course</th><th>Batch</th><th>Join Date</th><th>Fee</th><th>Validation</th><th></th></tr></thead><tbody>${studentImportRows.map((r,i)=>`<tr data-i="${i}"><td><input class="import-select" type="checkbox" ${r._selected!==false?'checked':''} onchange="toggleImportRow(${i},this.checked)"></td><td>${i+1}</td><td><input data-k="id" value="${esc(r.id)}" placeholder="Auto"></td><td><input data-k="name" value="${esc(r.name)}"></td><td><input data-k="phone" inputmode="numeric" value="${esc(r.phone)}"></td><td><input data-k="aadhaar" inputmode="numeric" value="${esc(r.aadhaar)}"></td><td><input data-k="fatherName" value="${esc(r.fatherName)}"></td><td><input data-k="motherName" value="${esc(r.motherName)}"></td><td><input data-k="course" value="${esc(r.course)}"></td><td><input data-k="batch" value="${esc(r.batch)}"></td><td><input type="date" data-k="joinDate" value="${esc(r.joinDate)}"></td><td><input type="number" data-k="monthlyFee" value="${Number(r.monthlyFee||0)}"></td><td class="import-status-cell"></td><td><button class="danger mini" onclick="removeImportRow(${i})">×</button></td></tr>`).join('')}</tbody></table></div><div class="actions import-actions"><button class="secondary" onclick="addBlankImportRow()">+ Add Row</button><button class="primary" onclick="saveImportedStudents('selected')">Save Selected</button><button class="primary" onclick="saveImportedStudents('all')">Save All Valid</button><button class="secondary" onclick="downloadStudentTemplate()">CSV Template</button></div>`;
 box.querySelectorAll('[data-k]').forEach(inp=>inp.addEventListener('input',updateStudentImportValidation));updateStudentImportValidation();
};
window.addBlankImportRow=function(){syncStudentImportRows();studentImportRows.push(normalizeImportStudent({id:'',name:'',phone:'',aadhaar:'',fatherName:'',motherName:'',course:'',batch:'',joinDate:new Date().toISOString().slice(0,10),monthlyFee:db.settings.monthlyFee||0,status:'Active'}));renderStudentImportPreview();setTimeout(()=>document.querySelector('#studentImportPreview tbody tr:last-child input[data-k="name"]')?.focus(),50)};
window.removeImportRow=function(i){syncStudentImportRows();studentImportRows.splice(i,1);renderStudentImportPreview()};
window.saveImportedStudents=function(mode='all'){
 syncStudentImportRows();let added=0,skipped=[];
 studentImportRows.forEach((r,i)=>{
  const issues=importRowIssues(r,i);if(mode==='selected'&&r._selected===false)return;
  if(issues.length){skipped.push(`${r.name||'Unnamed'}: ${issues.join(', ')}`);return}
  r.id=r.id||nextStudentId();r.phone=String(r.phone||'').replace(/\D/g,'');r.aadhaar=String(r.aadhaar||'').replace(/\D/g,'');r.nextDueDate=addOneMonth(r.joinDate);r.parentName=r.fatherName||r.motherName||'';r.parentPhone=r.fatherPhone||r.motherPhone||'';
  const clean={...r};delete clean._selected;delete clean._issues;db.students.push(clean);added++;
 });
 if(!added)return alert(`No valid students to save. ${skipped.length} rows need correction.`);
 db.importHistory=db.importHistory||[];db.importHistory.push({id:uid(),date:new Date().toISOString(),added,skipped:skipped.length,build:'v2.5 Build 5'});saveDB();closeModal();render('students');alert(`${added} students added successfully. ${skipped.length} rows skipped.`)
};

/* v2.6.1 Build 6.1 — student profile, fee badge, call actions and ID card */
function studentFeeStatus(s,month=monthNow()){
  const fee=hallFee(s),paid=db.fees.filter(f=>f.studentId===s.id&&f.month===month).reduce((n,f)=>n+Number(f.paid||0),0),balance=Math.max(0,fee-paid);
  return {fee,paid,balance,label:balance===0?'Paid':paid>0?'Part Paid':'Pending',className:balance===0?'present':paid>0?'pending':'absent'};
}
function telLink(v){const n=String(v||'').replace(/\D/g,'');return n?`tel:${n}`:'#'}
function studentCard(s){const fs=studentFeeStatus(s);return `<article class="student-mobile-card">
 <div class="student-card-head" onclick="viewStudent('${s.id}')">${avatar(s)}<div><h3>${esc(s.name)}</h3><p>${esc(s.id)} · ${esc(s.course||'No Course')}</p></div><span class="badge ${(s.status||'Active')==='Inactive'?'absent':'present'}">${esc(s.status||'Active')}</span></div>
 <div class="student-card-details"><span><b>Phone</b>${esc(s.phone||'-')}</span><span><b>Batch</b>${esc(s.batch||'-')}</span><span><b>Seat</b>${esc(s.seat||'-')}</span><span><b>This Month Fee</b><em class="badge ${fs.className}">${fs.label}</em></span></div>
 <div class="student-card-parent"><b>Parent:</b> ${esc(s.parentName||s.fatherName||s.motherName||'-')} ${s.parentPhone||s.fatherPhone?`· ${esc(s.parentPhone||s.fatherPhone)}`:''}</div>
 <div class="student-card-actions"><button class="secondary" onclick="viewStudent('${s.id}')">View</button><button class="secondary" onclick="editStudent('${s.id}')">Edit</button><button class="danger" onclick="deleteStudent('${s.id}')">Delete</button></div>
 </article>`}
function drawStudents(){const q=(el('studentSearch')?.value||'').trim().toLowerCase(),g=el('genderFilter')?.value||'',st=el('statusFilter')?.value||'',batch=el('batchFilter')?.value||'';const list=db.students.filter(s=>(!g||s.gender===g)&&(!st||(s.status||'Active')===st)&&(!batch||(s.batch||'')===batch)&&[s.id,s.name,s.phone,s.parentName,s.parentPhone,s.fatherName,s.fatherPhone,s.motherName,s.motherPhone,s.course,s.batch,s.seat,s.aadhaar,s.address].join(' ').toLowerCase().includes(q));const info=el('studentResultInfo');if(info)info.textContent=`Showing ${list.length} of ${db.students.length} students`;el('studentsTable').innerHTML=list.length?`<div class="student-mobile-list">${list.map(studentCard).join('')}</div><div class="student-desktop-table table-wrap"><table><thead><tr><th>Student</th><th>ID</th><th>Phone</th><th>Parent</th><th>Course / Batch</th><th>Joining</th><th>Fee Status</th><th>Status</th><th>Actions</th></tr></thead><tbody>${list.map(s=>{const fs=studentFeeStatus(s);return `<tr><td><div class="student-name">${avatar(s)}<div><b>${esc(s.name)}</b><small>${esc(s.seat||'No seat')}</small></div></div></td><td>${esc(s.id)}</td><td>${esc(s.phone||'-')}</td><td>${esc(s.parentName||s.fatherName||s.motherName||'-')}<br><small>${esc(s.parentPhone||s.fatherPhone||'-')}</small></td><td>${esc(s.course||'-')} / ${esc(s.batch||'-')}</td><td>${esc(s.joinDate||'-')}</td><td><span class="badge ${fs.className}">${fs.label}</span><br><small>${money(fs.paid)} / ${money(fs.fee)}</small></td><td><span class="badge ${(s.status||'Active')==='Inactive'?'absent':'present'}">${esc(s.status||'Active')}</span></td><td><div class="row-actions"><button class="secondary" onclick="viewStudent('${s.id}')">View</button><button class="secondary" onclick="editStudent('${s.id}')">Edit</button><button class="danger" onclick="deleteStudent('${s.id}')">Delete</button></div></td></tr>`}).join('')}</tbody></table></div>`:'<div class="empty">No students match the selected search or filters.</div>'}
window.viewStudent=id=>{const s=db.students.find(x=>x.id===id);if(!s)return;const fs=studentFeeStatus(s),parentPhone=s.parentPhone||s.fatherPhone||s.motherPhone||'';openModal(`<div class="profile-hero">${avatar(s)}<div><h2>${esc(s.name)}</h2><p>${esc(s.id)} · ${esc(s.course||'No Course')} · ${esc(s.batch||'No Batch')}</p></div><span class="badge ${(s.status||'Active')==='Inactive'?'absent':'present'}">${esc(s.status||'Active')}</span></div>
<div class="profile-quick-actions"><a class="secondary button-link ${s.phone?'':'disabled'}" href="${telLink(s.phone)}">Call Student</a><a class="secondary button-link ${parentPhone?'':'disabled'}" href="${telLink(parentPhone)}">Call Parent</a><button class="primary" onclick="printStudentId('${s.id}')">Print ID Card</button><button class="secondary" onclick="editStudent('${s.id}')">Edit</button></div>
<div class="profile-grid">
<section class="profile-panel"><h3>Student Details</h3><dl><dt>Phone</dt><dd>${esc(s.phone||'-')}</dd><dt>Date of Birth</dt><dd>${esc(s.dob||'-')}</dd><dt>Aadhaar</dt><dd>${esc(s.aadhaar||'-')}</dd><dt>Seat</dt><dd>${esc(s.seat||'-')}</dd><dt>Joining Date</dt><dd>${esc(s.joinDate||'-')}</dd><dt>Address</dt><dd>${esc(s.address||'-')}</dd></dl></section>
<section class="profile-panel"><h3>Parent Details</h3><dl><dt>Father</dt><dd>${esc(s.fatherName||'-')}</dd><dt>Father Phone</dt><dd>${esc(s.fatherPhone||'-')}</dd><dt>Father Aadhaar</dt><dd>${esc(s.fatherAadhaar||'-')}</dd><dt>Mother</dt><dd>${esc(s.motherName||'-')}</dd><dt>Mother Phone</dt><dd>${esc(s.motherPhone||'-')}</dd><dt>Mother Aadhaar</dt><dd>${esc(s.motherAadhaar||'-')}</dd></dl></section>
<section class="profile-panel fee-panel"><h3>Fee Status — ${esc(monthNow())}</h3><div class="fee-status-large"><span class="badge ${fs.className}">${fs.label}</span><b>${money(fs.balance)}</b><small>Balance</small></div><dl><dt>Monthly Fee</dt><dd>${money(fs.fee)}</dd><dt>Paid</dt><dd>${money(fs.paid)}</dd><dt>Next Due Date</dt><dd>${esc(s.nextDueDate||'-')}</dd></dl></section>
</div>`)};
window.printStudentId=id=>{const s=db.students.find(x=>x.id===id);if(!s)return;const hall=esc(db.settings.hallName||'Sri Nidhi Study Hall'),photo=s.photo?`<img src="${s.photo}" alt="">`:`<div class="id-avatar">${esc((s.name||'?').slice(0,1).toUpperCase())}</div>`,w=window.open('','_blank','width=480,height=700');if(!w)return alert('Popup blocked. Please allow popups.');w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(s.id)} ID Card</title><style>body{font-family:Arial,sans-serif;background:#eef6f5;padding:25px}.id{width:320px;margin:auto;background:white;border:2px solid #0f7f7a;border-radius:18px;overflow:hidden;box-shadow:0 10px 30px #0002}.head{background:#0f7f7a;color:#fff;text-align:center;padding:18px}.head h2{margin:0;font-size:20px}.body{text-align:center;padding:22px}.body img,.id-avatar{width:92px;height:92px;border-radius:50%;object-fit:cover;margin:auto;border:4px solid #dff3f1}.id-avatar{display:grid;place-items:center;background:#dff3f1;color:#0f7f7a;font-size:42px;font-weight:800}.body h1{font-size:21px;margin:13px 0 3px}.body p{margin:5px;color:#455}.grid{display:grid;grid-template-columns:1fr 1fr;text-align:left;gap:8px;margin-top:17px;padding-top:14px;border-top:1px solid #ddd}.grid b{display:block;font-size:10px;color:#789;text-transform:uppercase}.foot{text-align:center;background:#f2fbfa;padding:10px;font-size:11px;color:#456}@media print{body{background:#fff;padding:0}.id{box-shadow:none}}</style></head><body><div class="id"><div class="head"><h2>${hall}</h2><small>STUDENT ID CARD</small></div><div class="body">${photo}<h1>${esc(s.name)}</h1><p><b>${esc(s.id)}</b></p><div class="grid"><div><b>Course</b>${esc(s.course||'-')}</div><div><b>Batch</b>${esc(s.batch||'-')}</div><div><b>Seat</b>${esc(s.seat||'-')}</div><div><b>Phone</b>${esc(s.phone||'-')}</div></div></div><div class="foot">Valid while student status is active</div></div><script>window.onload=()=>setTimeout(()=>window.print(),250)<\/script></body></html>`);w.document.close()};
window.deleteStudent=id=>{const s=db.students.find(x=>x.id===id);if(!s)return;openModal(`<div class="delete-confirm"><h2>Delete Student?</h2><p><b>${esc(s.name)}</b> (${esc(s.id)}) will be removed from the student master.</p><p class="muted">Fee, attendance and movement history will remain in reports.</p><div class="actions"><button class="danger" onclick="confirmDeleteStudent('${s.id}')">Yes, Delete</button><button class="secondary" onclick="closeModal()">Cancel</button></div></div>`)};
window.confirmDeleteStudent=id=>{const s=db.students.find(x=>x.id===id);if(!s)return;db.students=db.students.filter(x=>x.id!==id);logAction('student_deleted',`${s.id} - ${s.name} deleted`);saveDB();closeModal();render('students')};

/* =========================================================
   v2.7 — FEES MODULE
   Scope: fee collection, auto receipts, ledger, filters,
   printable receipts and collection summaries.
   ========================================================= */
function feeMonthLabel(value){
  if(!value) return '-';
  const [y,m]=String(value).split('-');
  const d=new Date(Number(y),Number(m)-1,1);
  return d.toLocaleDateString('en-IN',{month:'short',year:'numeric'});
}
function feeTotals(list=db.fees){
  return list.reduce((a,f)=>{
    a.collected+=Number(f.paid||0);
    a.billed+=Number(f.amount||0);
    a.balance+=Math.max(0,Number(f.amount||0)-Number(f.paid||0));
    a.count++;
    return a;
  },{collected:0,billed:0,balance:0,count:0});
}
function feeStatus(f){
  const amount=Number(f.amount||0),paid=Number(f.paid||0);
  if(paid>=amount) return {label:'Paid',className:'present'};
  if(paid>0) return {label:'Part Paid',className:'pending'};
  return {label:'Pending',className:'absent'};
}
function renderFees(){
  const thisMonth=monthNow(),todayDate=today();
  el('pageContent').innerHTML=`
  <div class="fee-stats" id="feeStats"></div>
  <div class="card fee-entry-card">
    <div class="card-heading-row"><div><h3>Fee Collection</h3><p class="muted">Record a payment and generate an automatic receipt.</p></div><span class="receipt-preview">Next: ${esc(nextReceipt())}</span></div>
    <form id="feeForm" class="form-grid">
      <div class="field span-2"><label>Student</label><select id="feeStudent" name="studentId" required>${studentOptions()}</select></div>
      <div class="field"><label>Fee Month</label><input type="month" name="month" value="${thisMonth}" required></div>
      <div class="field"><label>Monthly Fee</label><input id="feeAmount" type="number" min="1" name="amount" value="${db.settings.monthlyFee}" required></div>
      <div class="field"><label>Paid Amount</label><input id="feePaid" type="number" min="1" name="paid" required></div>
      <div class="field"><label>Payment Date</label><input type="date" name="date" value="${todayDate}" required></div>
      <div class="field"><label>Payment Mode</label><select name="mode"><option>Cash</option><option>UPI</option><option>Bank</option><option>Card</option></select></div>
      <div class="field span-2"><label>Remarks</label><input name="remarks" placeholder="Optional note"></div>
      <div class="span-3 fee-form-footer"><div id="feeBalanceHint" class="fee-balance-hint"></div><button class="primary">Save Payment & Receipt</button></div>
    </form>
  </div>
  <div class="card">
    <div class="card-heading-row"><div><h3>Payment History</h3><p class="muted">Search, filter, print receipts or open a student ledger.</p></div><button class="secondary" onclick="downloadFeeReportCSV()">Export CSV</button></div>
    <div class="fee-filters">
      <input id="feeSearch" placeholder="Search student / receipt / phone">
      <input id="feeMonthFilter" type="month" value="${thisMonth}">
      <select id="feeModeFilter"><option value="">All Modes</option><option>Cash</option><option>UPI</option><option>Bank</option><option>Card</option></select>
      <button class="secondary" type="button" onclick="clearFeeFilters()">Clear Filters</button>
    </div>
    <div id="feeResultInfo" class="result-info"></div>
    <div id="feeTable"></div>
  </div>`;
  const student=el('feeStudent');
  const syncFee=()=>{const s=db.students.find(x=>x.id===student.value);el('feeAmount').value=hallFee(s);updateFeeBalanceHint()};
  student.onchange=syncFee;
  el('feeAmount').oninput=updateFeeBalanceHint;
  el('feePaid').oninput=updateFeeBalanceHint;
  student.dispatchEvent(new Event('change'));
  ['feeSearch','feeMonthFilter','feeModeFilter'].forEach(id=>{el(id).oninput=drawFees;el(id).onchange=drawFees});
  el('feeForm').onsubmit=e=>{
    e.preventDefault();
    const o=Object.fromEntries(new FormData(e.target));
    o.id=uid();o.amount=Number(o.amount);o.paid=Number(o.paid);o.receipt=nextReceipt();o.createdAt=new Date().toISOString();
    if(!o.studentId)return alert('Student select చేయండి');
    if(o.paid<=0||o.paid>o.amount)return alert('Paid amount సరైనదిగా నమోదు చేయండి');
    db.fees.push(o);
    logAction('fee_paid',`Fee received: ${studentName(o.studentId)} - ${money(o.paid)} (${o.receipt})`);
    saveDB();
    renderFees();
    setTimeout(()=>printFeeReceipt(o.id,false),50);
  };
  drawFees();
}
function updateFeeBalanceHint(){
  const amount=Number(el('feeAmount')?.value||0),paid=Number(el('feePaid')?.value||0),hint=el('feeBalanceHint');
  if(!hint)return;
  const balance=Math.max(0,amount-paid);
  hint.innerHTML=paid?`Balance after payment: <b>${money(balance)}</b>`:'Enter the amount received';
}
function filteredFees(){
  const q=(el('feeSearch')?.value||'').trim().toLowerCase();
  const month=el('feeMonthFilter')?.value||'';
  const mode=el('feeModeFilter')?.value||'';
  return [...db.fees].filter(f=>{
    const s=db.students.find(x=>x.id===f.studentId)||{};
    return (!month||f.month===month)&&(!mode||f.mode===mode)&&(!q||[f.receipt,f.month,f.mode,f.remarks,s.id,s.name,s.phone,s.parentPhone].join(' ').toLowerCase().includes(q));
  }).sort((a,b)=>String(b.date||'').localeCompare(String(a.date||''))||String(b.createdAt||'').localeCompare(String(a.createdAt||'')));
}
function drawFees(){
  const list=filteredFees(),tot=feeTotals(list),month=el('feeMonthFilter')?.value||monthNow();
  const monthPending=getPending(month).reduce((n,x)=>n+Number(x.balance||0),0);
  const todayTotal=db.fees.filter(f=>f.date===today()).reduce((n,f)=>n+Number(f.paid||0),0);
  const stats=el('feeStats');
  if(stats)stats.innerHTML=`
    <div class="fee-stat"><small>Today's Collection</small><b>${money(todayTotal)}</b></div>
    <div class="fee-stat"><small>Filtered Collection</small><b>${money(tot.collected)}</b><span>${tot.count} payments</span></div>
    <div class="fee-stat"><small>${esc(feeMonthLabel(month))} Pending</small><b>${money(monthPending)}</b></div>
    <div class="fee-stat"><small>Total Receipts</small><b>${db.fees.length}</b></div>`;
  const info=el('feeResultInfo');if(info)info.textContent=`Showing ${list.length} payment${list.length===1?'':'s'} • Collected ${money(tot.collected)}`;
  el('feeTable').innerHTML=list.length?`<div class="fee-mobile-list">${list.map(f=>feeMobileCard(f)).join('')}</div><div class="fee-desktop-table table-wrap"><table><thead><tr><th>Receipt</th><th>Student</th><th>Month</th><th>Fee</th><th>Paid</th><th>Balance</th><th>Date</th><th>Mode</th><th>Status</th><th>Actions</th></tr></thead><tbody>${list.map(f=>{const st=feeStatus(f);return `<tr><td><b>${esc(f.receipt||'-')}</b></td><td>${esc(studentName(f.studentId))}<br><small>${esc(f.studentId)}</small></td><td>${esc(feeMonthLabel(f.month))}</td><td>${money(f.amount)}</td><td><b>${money(f.paid)}</b></td><td>${money(Math.max(0,Number(f.amount)-Number(f.paid)))}</td><td>${esc(f.date)}</td><td>${esc(f.mode||'-')}</td><td><span class="badge ${st.className}">${st.label}</span></td><td><div class="row-actions"><button class="secondary" onclick="printFeeReceipt('${f.id}')">Receipt</button><button class="secondary" onclick="openStudentLedger('${f.studentId}')">Ledger</button><button class="danger" onclick="deleteFee('${f.id}')">Delete</button></div></td></tr>`}).join('')}</tbody></table></div>`:'<div class="empty">No payments match the selected filters.</div>';
}
function feeMobileCard(f){
  const st=feeStatus(f),s=db.students.find(x=>x.id===f.studentId)||{};
  return `<article class="fee-mobile-card"><div class="fee-mobile-top"><div><small>${esc(f.receipt||'-')}</small><h4>${esc(s.name||f.studentId)}</h4><span>${esc(feeMonthLabel(f.month))} • ${esc(f.date)}</span></div><span class="badge ${st.className}">${st.label}</span></div><div class="fee-mobile-money"><div><small>Paid</small><b>${money(f.paid)}</b></div><div><small>Balance</small><b>${money(Math.max(0,Number(f.amount)-Number(f.paid)))}</b></div><div><small>Mode</small><b>${esc(f.mode||'-')}</b></div></div><div class="row-actions"><button class="secondary" onclick="printFeeReceipt('${f.id}')">Receipt</button><button class="secondary" onclick="openStudentLedger('${f.studentId}')">Ledger</button><button class="danger" onclick="deleteFee('${f.id}')">Delete</button></div></article>`;
}
window.clearFeeFilters=()=>{if(el('feeSearch'))el('feeSearch').value='';if(el('feeMonthFilter'))el('feeMonthFilter').value=monthNow();if(el('feeModeFilter'))el('feeModeFilter').value='';drawFees()};
window.openStudentLedger=function(studentId){
  const s=db.students.find(x=>x.id===studentId);if(!s)return;
  const rows=[...db.fees].filter(f=>f.studentId===studentId).sort((a,b)=>String(b.date).localeCompare(String(a.date)));
  const tot=feeTotals(rows),current=studentFeeStatus(s);
  openModal(`<div class="ledger-head"><div><h2>${esc(s.name)} — Fee Ledger</h2><p class="muted">${esc(s.id)} • ${esc(s.phone||'-')} • ${esc(s.batch||'-')}</p></div><button class="primary" onclick="printStudentLedger('${s.id}')">Print Ledger</button></div><div class="fee-stats ledger-stats"><div class="fee-stat"><small>Total Paid</small><b>${money(tot.collected)}</b></div><div class="fee-stat"><small>Payments</small><b>${rows.length}</b></div><div class="fee-stat"><small>Current Month</small><b>${current.label}</b><span>${money(current.balance)} balance</span></div></div>${rows.length?`<div class="table-wrap"><table><thead><tr><th>Receipt</th><th>Month</th><th>Date</th><th>Fee</th><th>Paid</th><th>Mode</th><th></th></tr></thead><tbody>${rows.map(f=>`<tr><td>${esc(f.receipt)}</td><td>${esc(feeMonthLabel(f.month))}</td><td>${esc(f.date)}</td><td>${money(f.amount)}</td><td><b>${money(f.paid)}</b></td><td>${esc(f.mode||'-')}</td><td><button class="secondary" onclick="printFeeReceipt('${f.id}')">Receipt</button></td></tr>`).join('')}</tbody></table></div>`:'<div class="empty">No fee history</div>'}`);
};
window.printFeeReceipt=function(id,openPrint=true){
  const f=db.fees.find(x=>x.id===id);if(!f)return;
  const s=db.students.find(x=>x.id===f.studentId)||{};
  const balance=Math.max(0,Number(f.amount)-Number(f.paid));
  const w=window.open('','_blank','width=760,height=800');if(!w)return alert('Popup blocked. Allow popups to print receipt.');
  w.document.write(`<!doctype html><html><head><title>${esc(f.receipt)}</title><style>body{font-family:Arial,sans-serif;color:#17202a;padding:28px}.receipt{max-width:650px;margin:auto;border:2px solid #0f7f7a;border-radius:16px;overflow:hidden}.head{background:#0f7f7a;color:#fff;text-align:center;padding:22px}.head h1{margin:0 0 4px}.body{padding:24px}.meta,.amounts{display:grid;grid-template-columns:1fr 1fr;gap:12px}.box{border:1px solid #d8e3e7;border-radius:10px;padding:12px}.amounts{margin:20px 0}.paid{font-size:24px;color:#0f7f7a}.foot{text-align:center;border-top:1px dashed #aaa;padding-top:16px;color:#667}.actions{text-align:center;margin:20px}button{padding:10px 18px}@media print{.actions{display:none}}</style></head><body><div class="receipt"><div class="head"><h1>${esc(db.settings.hallName)}</h1><div>FEE RECEIPT</div></div><div class="body"><div class="meta"><div class="box"><small>Receipt Number</small><br><b>${esc(f.receipt)}</b></div><div class="box"><small>Payment Date</small><br><b>${esc(f.date)}</b></div><div class="box"><small>Student</small><br><b>${esc(s.name||f.studentId)}</b><br>${esc(f.studentId)}</div><div class="box"><small>Fee Month</small><br><b>${esc(feeMonthLabel(f.month))}</b></div></div><div class="amounts"><div class="box"><small>Monthly Fee</small><div>${money(f.amount)}</div></div><div class="box"><small>Amount Paid</small><div class="paid"><b>${money(f.paid)}</b></div></div><div class="box"><small>Balance</small><div><b>${money(balance)}</b></div></div><div class="box"><small>Payment Mode</small><div><b>${esc(f.mode||'-')}</b></div></div></div>${f.remarks?`<p><b>Remarks:</b> ${esc(f.remarks)}</p>`:''}<div class="foot">Thank you. This is a computer-generated receipt.</div></div></div><div class="actions"><button onclick="window.print()">Print Receipt</button></div></body></html>`);w.document.close();if(openPrint)setTimeout(()=>w.print(),350);
};
window.printStudentLedger=function(studentId){
  const s=db.students.find(x=>x.id===studentId);if(!s)return;const rows=[...db.fees].filter(f=>f.studentId===studentId).sort((a,b)=>String(a.date).localeCompare(String(b.date)));const tot=feeTotals(rows);const w=window.open('','_blank');if(!w)return alert('Popup blocked');w.document.write(`<!doctype html><html><head><title>${esc(s.name)} Fee Ledger</title><style>body{font-family:Arial;padding:28px}h1{margin-bottom:4px}table{width:100%;border-collapse:collapse;margin-top:20px}th,td{border:1px solid #bbb;padding:8px;text-align:left}th{background:#eef7f6}.summary{margin:14px 0;font-weight:bold}@media print{button{display:none}}</style></head><body><h1>${esc(db.settings.hallName)}</h1><h2>Student Fee Ledger</h2><p><b>${esc(s.name)}</b> — ${esc(s.id)} — ${esc(s.phone||'-')}</p><div class="summary">Total Paid: ${money(tot.collected)} | Payments: ${rows.length}</div><table><thead><tr><th>Receipt</th><th>Month</th><th>Date</th><th>Fee</th><th>Paid</th><th>Balance</th><th>Mode</th></tr></thead><tbody>${rows.map(f=>`<tr><td>${esc(f.receipt)}</td><td>${esc(feeMonthLabel(f.month))}</td><td>${esc(f.date)}</td><td>${money(f.amount)}</td><td>${money(f.paid)}</td><td>${money(Math.max(0,Number(f.amount)-Number(f.paid)))}</td><td>${esc(f.mode||'-')}</td></tr>`).join('')}</tbody></table><p><button onclick="window.print()">Print Ledger</button></p></body></html>`);w.document.close();setTimeout(()=>w.print(),350)};
window.downloadFeeReportCSV=function(){
  const rows=filteredFees();
  const header=['Receipt','Student ID','Student Name','Month','Fee','Paid','Balance','Date','Mode','Remarks'];
  const data=rows.map(f=>[f.receipt,f.studentId,studentName(f.studentId),f.month,f.amount,f.paid,Math.max(0,Number(f.amount)-Number(f.paid)),f.date,f.mode||'',f.remarks||'']);
  const csv=[header,...data].map(r=>r.map(v=>`"${String(v??'').replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob=new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`Fee-Collection-${el('feeMonthFilter')?.value||'all'}.csv`;a.click();URL.revokeObjectURL(a.href);
};
const _deleteFeeV27=window.deleteFee;
window.deleteFee=id=>{const f=db.fees.find(x=>x.id===id);if(!f)return;if(confirm(`Delete receipt ${f.receipt||''}?`)){db.fees=db.fees.filter(x=>x.id!==id);logAction('fee_deleted',`Deleted ${f.receipt||id}`);saveDB();drawFees()}};

/* =========================================================
   v2.8 — Attendance + Entry / Exit improvements
   ========================================================= */
function v28DateTimeLocal(){const n=new Date(Date.now()-new Date().getTimezoneOffset()*60000);return n.toISOString().slice(0,16)}
function v28AttendanceRecord(studentId,date){return db.attendance.find(x=>x.studentId===studentId&&x.date===date)}
function v28StatusClass(status){return status==='Present'?'present':status==='Absent'?'absent':status==='Late'?'outside':status==='Leave'?'pending':'pending'}
function v28DownloadCSV(name,rows){const csv=rows.map(r=>r.map(v=>`"${String(v??'').replace(/"/g,'""')}"`).join(',')).join('\n');const blob=new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),500)}

function renderAttendance(){
 const d=window._attendanceDate||today(), active=db.students.filter(s=>s.status!=='Inactive');
 const recs=active.map(s=>v28AttendanceRecord(s.id,d));
 const count=st=>recs.filter(a=>a?.status===st).length;
 el('pageContent').innerHTML=`
 <div class="attendance-stats">
  <div><small>Total Students</small><b>${active.length}</b></div>
  <div><small>Present</small><b>${count('Present')}</b></div>
  <div><small>Absent</small><b>${count('Absent')}</b></div>
  <div><small>Late / Leave</small><b>${count('Late')+count('Leave')}</b></div>
 </div>
 <div class="card attendance-card">
  <div class="card-heading-row"><div><h3>Daily Attendance</h3><p class="muted">Mark and review student attendance.</p></div><span class="version-chip">v2.8</span></div>
  <div class="attendance-toolbar">
   <input id="attendanceDate" type="date" value="${d}">
   <input id="attendanceSearch" placeholder="Search student / ID / batch">
   <select id="attendanceFilter"><option value="">All Status</option><option>Present</option><option>Absent</option><option>Late</option><option>Leave</option><option value="Not Marked">Not Marked</option></select>
   <button class="secondary" onclick="clearAttendanceFilters()">Clear Filters</button>
  </div>
  <div class="bulk-attendance-actions"><button class="success" onclick="markAllAttendance('Present')">Mark All Present</button><button class="danger" onclick="markAllAttendance('Absent')">Mark All Absent</button><button class="secondary" onclick="exportAttendanceCSV()">Export CSV</button><button class="secondary" onclick="downloadAttendancePDF()">Day PDF</button></div>
  <div id="attendanceSaveState" class="attendance-save-state"></div><div id="attendanceResultInfo" class="result-info"></div><div id="attendanceTable"></div>
 </div>
 <div class="card"><div class="card-heading-row"><div><h3>Monthly Attendance Summary</h3><p class="muted">Present, absent, late and leave totals.</p></div></div><div class="attendance-summary-tools"><input id="attendanceMonth" type="month" value="${d.slice(0,7)}"><button class="primary" onclick="downloadMonthlyAttendancePDF()">Monthly PDF</button></div><div id="attendanceSummary"></div></div>`;
 el('attendanceDate').onchange=e=>{window._attendanceDate=e.target.value;renderAttendance()};
 el('attendanceSearch').oninput=drawAttendanceDay; el('attendanceFilter').onchange=drawAttendanceDay; el('attendanceMonth').onchange=drawAttendanceSummary;
 drawAttendanceDay(); drawAttendanceSummary();
}
function drawAttendanceDay(){
 const d=el('attendanceDate').value,q=(el('attendanceSearch')?.value||'').trim().toLowerCase(),f=el('attendanceFilter')?.value||'';
 const students=db.students.filter(s=>s.status!=='Inactive').filter(s=>`${s.id} ${s.name} ${s.batch||''}`.toLowerCase().includes(q)).filter(s=>{const st=v28AttendanceRecord(s.id,d)?.status||'Not Marked';return !f||st===f});
 el('attendanceResultInfo').textContent=`Showing ${students.length} students • ${d}`;
 const cards=students.map(s=>{const a=v28AttendanceRecord(s.id,d),st=a?.status||'Not Marked';return `<div class="attendance-mobile-card"><div class="attendance-mobile-head"><div><small>${esc(s.id)}</small><h4>${esc(s.name)}</h4><span>${esc(s.batch||'No Batch')}</span></div><span class="badge ${v28StatusClass(st)}">${esc(st)}</span></div><div class="attendance-time">Marked time: <b>${esc(a?.time||'-')}</b></div><div class="attendance-buttons">${['Present','Absent','Late','Leave'].map(x=>`<button class="${x==='Present'?'success':x==='Absent'?'danger':'secondary'}" onclick="markAttendanceForDate('${s.id}','${x}','${d}')">${x}</button>`).join('')}</div></div>`}).join('');
 el('attendanceTable').innerHTML=students.length?`<div class="attendance-desktop-table table-wrap"><table><thead><tr><th>ID</th><th>Name</th><th>Batch</th><th>Status</th><th>Marked Time</th><th>Action</th></tr></thead><tbody>${students.map(s=>{const a=v28AttendanceRecord(s.id,d),st=a?.status||'Not Marked';return `<tr><td>${esc(s.id)}</td><td>${esc(s.name)}</td><td>${esc(s.batch||'-')}</td><td><span class="badge ${v28StatusClass(st)}">${esc(st)}</span></td><td>${esc(a?.time||'-')}</td><td class="attendance-row-actions">${['Present','Absent','Late','Leave'].map(x=>`<button class="${x==='Present'?'success':x==='Absent'?'danger':'secondary'}" onclick="markAttendanceForDate('${s.id}','${x}','${d}')">${x}</button>`).join('')}</td></tr>`}).join('')}</tbody></table></div><div class="attendance-mobile-list">${cards}</div>`:'<div class="empty">No students found</div>';
}
window.markAttendanceForDate=(studentId,status,date)=>{const ok=upsertAttendanceRecord(studentId,status,date);if(ok){logAction('attendance',`${studentName(studentId)} marked ${status} on ${localISODate(date)}`);saveDB();drawAttendanceDay();drawAttendanceSummary();renderAttendanceStatsOnly();showAttendanceSaveState(`${studentName(studentId)} - ${status} saved`,true)}else showAttendanceSaveState('Attendance save failed',false)};
window.markAllAttendance=status=>{const d=localISODate(el('attendanceDate').value),active=db.students.filter(s=>s.status!=='Inactive');const ids=new Set(active.map(s=>String(s.id).trim()));db.attendance=normalizeArraySource(db.attendance).filter(x=>!(ids.has(String(x.studentId||x.student||x.sid||'').trim())&&localISODate(x.date||x.attendanceDate||x.createdAt)===d));const t=new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'});active.forEach(s=>db.attendance.push({id:uid(),studentId:String(s.id).trim(),date:d,status:v291NormalizeStatus(status,'attendance'),time:t,updatedAt:new Date().toISOString(),source:'attendance-module-v3.0-rc'}));if(persistAttendanceVerified()){logAction('attendance_bulk',`All students marked ${status} on ${d}`);saveDB();renderAttendance()}else showAttendanceSaveState('Bulk attendance save failed',false)};
window.clearAttendanceFilters=()=>{el('attendanceSearch').value='';el('attendanceFilter').value='';drawAttendanceDay()};
function renderAttendanceStatsOnly(){/* renderAttendance refresh is intentionally avoided while tapping multiple rows */}
function drawAttendanceSummary(){const m=el('attendanceMonth').value,list=db.students.filter(s=>s.status!=='Inactive').map(s=>{const a=db.attendance.filter(x=>x.studentId===s.id&&x.date.startsWith(m));return {s,p:a.filter(x=>x.status==='Present').length,a:a.filter(x=>x.status==='Absent').length,l:a.filter(x=>x.status==='Late').length,lv:a.filter(x=>x.status==='Leave').length}});el('attendanceSummary').innerHTML=`<div class="table-wrap"><table><thead><tr><th>ID</th><th>Name</th><th>Present</th><th>Absent</th><th>Late</th><th>Leave</th><th>Marked Days</th></tr></thead><tbody>${list.map(x=>`<tr><td>${esc(x.s.id)}</td><td>${esc(x.s.name)}</td><td>${x.p}</td><td>${x.a}</td><td>${x.l}</td><td>${x.lv}</td><td>${x.p+x.a+x.l+x.lv}</td></tr>`).join('')}</tbody></table></div>`}
window.exportAttendanceCSV=()=>{const d=el('attendanceDate').value;const rows=[['Student ID','Student Name','Batch','Date','Status','Marked Time'],...db.students.filter(s=>s.status!=='Inactive').map(s=>{const a=v28AttendanceRecord(s.id,d);return [s.id,s.name,s.batch||'',d,a?.status||'Not Marked',a?.time||'']})];v28DownloadCSV(`Attendance-${d}.csv`,rows)};
window.downloadMonthlyAttendancePDF=()=>{const m=el('attendanceMonth').value,{jsPDF}=window.jspdf,doc=new jsPDF();doc.setFontSize(15);doc.text(`${db.settings.hallName} - Monthly Attendance`,14,18);doc.setFontSize(10);doc.text(`Month: ${m}`,14,27);let y=38;db.students.filter(s=>s.status!=='Inactive').forEach((s,i)=>{const a=db.attendance.filter(x=>x.studentId===s.id&&x.date.startsWith(m)),p=a.filter(x=>x.status==='Present').length,ab=a.filter(x=>x.status==='Absent').length,l=a.filter(x=>x.status==='Late').length,lv=a.filter(x=>x.status==='Leave').length;doc.text(`${i+1}. ${s.id} - ${s.name} | P:${p} A:${ab} L:${l} Leave:${lv}`,14,y);y+=7;if(y>282){doc.addPage();y=18}});doc.save(`Monthly-Attendance-${m}.pdf`)};

function movementLate(x){return x.status==='Outside'&&x.expectedReturn&&new Date(x.expectedReturn)<new Date()}
function drawOutsideList(){const list=db.movements.filter(x=>x.status==='Outside').sort((a,b)=>String(a.expectedReturn||'9999').localeCompare(String(b.expectedReturn||'9999')));const html=list.map(x=>`<div class="outside-card ${movementLate(x)?'overdue':''}"><div><small>${esc(db.students.find(s=>s.id===x.studentId)?.id||x.studentId)}</small><h4>${esc(studentName(x.studentId))}</h4><p>${esc(x.reason||'-')}</p></div><div class="outside-times"><span>Out <b>${esc(fmtDateTime(x.outTime))}</b></span><span>Expected <b>${esc(fmtDateTime(x.expectedReturn))}</b></span></div><div class="outside-actions"><span class="badge ${movementLate(x)?'absent':'outside'}">${movementLate(x)?'Overdue':'Outside'}</span><button class="success" onclick="markReturned('${x.id}')">Mark Returned</button></div></div>`).join('');el('outsideList').innerHTML=html||'<div class="empty">No students outside</div>'}
window.markReturned=id=>{const x=db.movements.find(m=>m.id===id);if(x){x.status='Returned';x.returnTime=v28DateTimeLocal();logAction('returned',`${studentName(x.studentId)} returned`);saveDB();renderMovement()}};
window.exportMovementCSV=()=>{const rows=[['Student ID','Student Name','Out Time','Expected Return','Return Time','Reason','Contact / Note','Status'],...[...db.movements].sort((a,b)=>String(b.outTime).localeCompare(String(a.outTime))).map(x=>[x.studentId,studentName(x.studentId),x.outTime||'',x.expectedReturn||'',x.returnTime||'',x.reason||'',x.contactNote||'',x.status])];v28DownloadCSV('Entry-Exit-Records.csv',rows)};

/* =========================================================
   v2.8.1 COMPLETE — GPS Location Tracking for Entry / Exit
   Note: browser GPS tracks the device on which this app is open.
   Background tracking can pause when the browser/app is closed.
   ========================================================= */
const V281_GPS_INTERVAL = 5 * 60 * 1000;
const v281Watchers = new Map();
function v281NowLocal(){const n=new Date(Date.now()-new Date().getTimezoneOffset()*60000);return n.toISOString().slice(0,16)}
function v282ExpectedReturn(hours=2){const n=new Date(Date.now()+hours*60*60*1000-new Date().getTimezoneOffset()*60000);return n.toISOString().slice(0,16)}
let v282Flash='';
function v282Toast(message,type='success'){let box=document.getElementById('v282Toast');if(!box){box=document.createElement('div');box.id='v282Toast';document.body.appendChild(box)}box.className=`v282-toast ${type} show`;box.textContent=message;clearTimeout(v282Toast._t);v282Toast._t=setTimeout(()=>box.classList.remove('show'),2800)}
function v281MapLink(lat,lng){return `https://www.google.com/maps?q=${Number(lat).toFixed(6)},${Number(lng).toFixed(6)}`}
function v281LocationLabel(p){return `${Number(p.latitude).toFixed(6)}, ${Number(p.longitude).toFixed(6)}`}
function v281Position(timeout=15000){return new Promise((resolve,reject)=>{if(!navigator.geolocation)return reject(new Error('GPS is not supported on this device.'));navigator.geolocation.getCurrentPosition(resolve,reject,{enableHighAccuracy:true,timeout,maximumAge:15000})})}
function v281SavePoint(movement,pos,type='tracking'){
 const c=pos.coords||pos;
 movement.locationHistory=Array.isArray(movement.locationHistory)?movement.locationHistory:[];
 const point={id:uid(),time:v281NowLocal(),latitude:Number(c.latitude),longitude:Number(c.longitude),accuracy:Math.round(Number(c.accuracy)||0),type,mapLink:v281MapLink(c.latitude,c.longitude)};
 movement.locationHistory.push(point);
 movement.lastLocation=point;
 if(type==='start') movement.startLocation=point;
 if(type==='return') movement.returnLocation=point;
 saveDB();
 return point;
}
function v281StopTracking(id){const watch=v281Watchers.get(id);if(watch!=null&&navigator.geolocation)navigator.geolocation.clearWatch(watch);v281Watchers.delete(id)}
function v281StartTracking(id){
 const movement=db.movements.find(x=>x.id===id);
 if(!movement||movement.status!=='Outside'||movement.gpsTracking===false||!navigator.geolocation||v281Watchers.has(id))return;
 let lastSaved=Number(movement.lastGpsSavedAt||0);
 const watch=navigator.geolocation.watchPosition(pos=>{
   const now=Date.now();
   if(!lastSaved||now-lastSaved>=V281_GPS_INTERVAL){v281SavePoint(movement,pos,'tracking');lastSaved=now;movement.lastGpsSavedAt=now;saveDB();if(currentPage==='movement')drawOutsideList()}
 },err=>{console.warn('GPS tracking:',err.message)},{enableHighAccuracy:true,maximumAge:30000,timeout:20000});
 v281Watchers.set(id,watch);
}
function v281ResumeTracking(){db.movements.filter(x=>x.status==='Outside'&&x.gpsTracking!==false).forEach(x=>v281StartTracking(x.id))}
function v281LocationSummary(x){const p=x.lastLocation||x.startLocation;return p?`<a target="_blank" rel="noopener" href="${esc(p.mapLink)}">${esc(v281LocationLabel(p))}</a>`:(x.location?`<a target="_blank" rel="noopener" href="${esc(x.location)}">Open Map</a>`:'-')}
function v281HistoryButton(x){const n=Array.isArray(x.locationHistory)?x.locationHistory.length:0;return `<button class="secondary gps-history-btn" onclick="viewLocationHistory('${x.id}')">Location History (${n})</button>`}

function renderMovement(){
 const all=[...db.movements].sort((a,b)=>String(b.outTime).localeCompare(String(a.outTime))),outside=all.filter(x=>x.status==='Outside'),now=new Date(),overdue=outside.filter(x=>x.expectedReturn&&new Date(x.expectedReturn)<now),returnedToday=all.filter(x=>x.status==='Returned'&&String(x.returnTime||'').startsWith(today())).length;
 el('pageContent').innerHTML=`
 <div class="movement-stats"><div><small>Currently Outside</small><b>${outside.length}</b></div><div><small>Overdue</small><b>${overdue.length}</b></div><div><small>Returned Today</small><b>${returnedToday}</b></div><div><small>Total Records</small><b>${all.length}</b></div></div>
 <div class="card movement-form-card"><div class="card-heading-row"><div><h3>Student Entry / Exit</h3><p class="muted">Exit save చేసినప్పుడు ఈ device GPS tracking start అవుతుంది.</p></div><div class="tracking-head"><span class="tracking-status stopped">🔴 Stopped</span><span class="version-chip">v2.8.3 Stable</span></div></div>
 <div class="gps-note"><b>GPS Note:</b><span>Tracking ఈ app open చేసిన phone/device locationను record చేస్తుంది. Browser పూర్తిగా close చేస్తే Android restrictions వల్ల background tracking pause కావచ్చు.</span></div>
 <form id="moveForm" class="form-grid">
  <div class="field"><label>Student</label><select name="studentId" required>${studentOptions()}</select></div>
  <div class="field"><label>Out Time</label><input type="datetime-local" name="outTime" value="${v281NowLocal()}" required></div>
  <div class="field"><label>Expected Return</label><input type="datetime-local" name="expectedReturn" value="${v282ExpectedReturn(2)}"></div>
  <div class="field span-2"><label>Location / Destination</label><input name="destination" placeholder="Example: Hospital, Bus Stand, Home" required></div>
  <div class="field"><label>Reason</label><input name="reason" placeholder="Reason for going out" required></div>
  <div class="field"><label>Contact Person</label><input name="contactPerson" placeholder="Optional"></div>
  <div class="field"><label>Contact Number</label><input name="contactNumber" inputmode="tel" placeholder="Optional"></div>
  <div class="field span-2"><label>Remarks</label><input name="remarks" placeholder="Optional remarks"></div>
  <div class="field gps-toggle-field"><label><input type="checkbox" name="gpsTracking" value="yes" checked> Start GPS tracking (every 5 minutes)</label></div>
  <div class="span-3 movement-submit-row"><button class="primary" id="saveExitBtn">Save Exit & Start Tracking</button><span id="gpsFormStatus" class="muted"></span></div>
 </form></div>
 <div class="card"><div class="card-heading-row"><div><h3>Currently Outside</h3><p class="muted">Live GPS points, expected return and one-tap return.</p></div></div><div id="outsideList"></div></div>
 <div class="card" id="movementHistoryCard"><div class="card-heading-row"><div><h3>Movement History</h3><p class="muted">Search, inspect location history and export records.</p></div></div><div class="movement-filters"><input id="movementSearch" placeholder="Search student / location / reason"><input id="movementDate" type="date"><select id="movementStatus"><option value="">All Status</option><option>Outside</option><option>Returned</option></select><button class="secondary" onclick="exportMovementCSV()">Export CSV</button></div><div id="movementHistory"></div></div>`;
 el('moveForm').onsubmit=async e=>{
   e.preventDefault();const form=e.target,o=Object.fromEntries(new FormData(form));
   if(db.movements.some(m=>m.studentId===o.studentId&&m.status==='Outside'))return alert('This student is already marked outside.');
   o.id=uid();o.status='Outside';o.returnTime='';o.gpsTracking=o.gpsTracking==='yes';o.locationHistory=[];o.createdAt=v281NowLocal();
   const btn=el('saveExitBtn'),status=el('gpsFormStatus');btn.disabled=true;
   try{
     if(o.gpsTracking){status.textContent='Getting current GPS location...';const pos=await v281Position();v281SavePoint(o,pos,'start');o.lastGpsSavedAt=Date.now()}
     db.movements.push(o);logAction('went_out',`${studentName(o.studentId)} went outside to ${o.destination||'-'}`);saveDB();
     if(o.gpsTracking)v281StartTracking(o.id);v282Flash=o.gpsTracking?'Exit saved — GPS tracking started successfully.':'Exit record saved successfully.';renderMovement();
   }catch(err){
     const continueWithout=confirm(`GPS location రాలేదు: ${err.message}\n\nGPS లేకుండా exit record save చేయాలా?`);
     if(continueWithout){o.gpsTracking=false;db.movements.push(o);logAction('went_out',`${studentName(o.studentId)} went outside (GPS unavailable)`);saveDB();v282Flash='Exit saved without GPS tracking.';renderMovement()}
     else{btn.disabled=false;status.textContent='GPS permission/location required.'}
   }
 };
 document.querySelectorAll('#movementHistoryCard').forEach((node,index)=>{if(index>0)node.remove()});
 el('movementSearch').oninput=drawMovementHistory;el('movementDate').onchange=drawMovementHistory;el('movementStatus').onchange=drawMovementHistory;drawOutsideList();drawMovementHistory();v281ResumeTracking();const activeGps=outside.some(x=>x.gpsTracking!==false);const headBadge=document.querySelector('.tracking-head .tracking-status');if(headBadge){headBadge.className=`tracking-status ${activeGps?'tracking':'stopped'}`;headBadge.textContent=activeGps?'🟢 Tracking':'🔴 Stopped'}if(v282Flash){const m=v282Flash;v282Flash='';setTimeout(()=>v282Toast(m,m.includes('without')?'warning':'success'),80)}
}
function drawOutsideList(){
 const list=db.movements.filter(x=>x.status==='Outside').sort((a,b)=>String(a.expectedReturn||'9999').localeCompare(String(b.expectedReturn||'9999')));
 const html=list.map(x=>`<div class="outside-card ${movementLate(x)?'overdue':''}"><div><small>${esc(db.students.find(s=>s.id===x.studentId)?.id||x.studentId)}</small><h4>${esc(studentName(x.studentId))}</h4><p><b>${esc(x.destination||'Location not entered')}</b> • ${esc(x.reason||'-')}</p><div class="gps-last">Last GPS: ${v281LocationSummary(x)}</div></div><div class="outside-times"><span>Out <b>${esc(fmtDateTime(x.outTime))}</b></span><span>Expected <b>${esc(fmtDateTime(x.expectedReturn))}</b></span><span>GPS Points <b>${Array.isArray(x.locationHistory)?x.locationHistory.length:0}</b></span></div><div class="outside-actions"><div class="outside-badges"><span class="badge ${movementLate(x)?'absent':'outside'}">${movementLate(x)?'Overdue':'Outside'}</span><span class="tracking-status ${x.gpsTracking!==false?'tracking':'stopped'}">${x.gpsTracking!==false?'🟢 Tracking':'🔴 Stopped'}</span></div>${v281HistoryButton(x)}<button class="success" onclick="markReturned('${x.id}')">Mark Returned</button></div></div>`).join('');
 el('outsideList').innerHTML=html||'<div class="empty">No students outside</div>';
}
function drawMovementHistory(){
 const q=(el('movementSearch')?.value||'').toLowerCase(),d=el('movementDate')?.value||'',st=el('movementStatus')?.value||'';
 const list=[...db.movements].sort((a,b)=>String(b.outTime).localeCompare(String(a.outTime))).filter(x=>`${studentName(x.studentId)} ${x.destination||''} ${x.reason||''} ${x.contactPerson||''}`.toLowerCase().includes(q)).filter(x=>!d||String(x.outTime||'').startsWith(d)).filter(x=>!st||x.status===st);
 el('movementHistory').innerHTML=list.length?`<div class="movement-desktop table-wrap"><table><thead><tr><th>Student</th><th>Out</th><th>Expected</th><th>Returned</th><th>Location</th><th>Reason</th><th>GPS</th><th>Status</th></tr></thead><tbody>${list.map(x=>`<tr><td>${esc(studentName(x.studentId))}</td><td>${esc(fmtDateTime(x.outTime))}</td><td>${esc(fmtDateTime(x.expectedReturn))}</td><td>${esc(fmtDateTime(x.returnTime))}</td><td>${esc(x.destination||'-')}</td><td>${esc(x.reason||'-')}</td><td>${v281HistoryButton(x)}</td><td><span class="badge ${x.status==='Returned'?'present':movementLate(x)?'absent':'outside'}">${movementLate(x)?'Overdue':esc(x.status)}</span></td></tr>`).join('')}</tbody></table></div><div class="movement-mobile-list">${list.map(x=>`<div class="movement-history-card"><div><h4>${esc(studentName(x.studentId))}</h4><span>${esc(x.destination||'-')} • ${esc(x.reason||'-')}</span></div><span class="badge ${x.status==='Returned'?'present':movementLate(x)?'absent':'outside'}">${movementLate(x)?'Overdue':esc(x.status)}</span><dl><dt>Out</dt><dd>${esc(fmtDateTime(x.outTime))}</dd><dt>Expected</dt><dd>${esc(fmtDateTime(x.expectedReturn))}</dd><dt>Returned</dt><dd>${esc(fmtDateTime(x.returnTime))}</dd><dt>Last GPS</dt><dd>${v281LocationSummary(x)}</dd></dl>${v281HistoryButton(x)}</div>`).join('')}</div>`:'<div class="empty">No movement records found</div>';
}
window.viewLocationHistory=id=>{
 const x=db.movements.find(m=>m.id===id);if(!x)return;const points=Array.isArray(x.locationHistory)?x.locationHistory:[];
 openModal(`<h2>Location History</h2><p><b>${esc(studentName(x.studentId))}</b> — ${esc(x.destination||'-')}</p><div class="gps-history-summary"><span>Out: <b>${esc(fmtDateTime(x.outTime))}</b></span><span>Returned: <b>${esc(fmtDateTime(x.returnTime))}</b></span><span>Points: <b>${points.length}</b></span></div>${points.length?`<div class="gps-timeline">${points.map((p,i)=>`<div class="gps-point"><div class="gps-dot"></div><div><b>${i+1}. ${p.type==='start'?'Exit Location':p.type==='return'?'Return Location':'Tracking Point'}</b><small>${esc(fmtDateTime(p.time))} • Accuracy ${esc(p.accuracy||'-')} m</small><a target="_blank" rel="noopener" href="${esc(p.mapLink)}">${esc(v281LocationLabel(p))} — Open Map</a></div></div>`).join('')}</div>`:'<div class="empty">No GPS points saved for this record.</div>'}`)
};
window.markReturned=async id=>{
 const x=db.movements.find(m=>m.id===id);if(!x)return;
 if(!confirm(`Mark ${studentName(x.studentId)} as returned?`))return;
 try{if(x.gpsTracking!==false){const pos=await v281Position(12000);v281SavePoint(x,pos,'return')}}catch(err){console.warn('Final GPS:',err.message)}
 v281StopTracking(id);x.status='Returned';x.returnTime=v281NowLocal();x.gpsTracking=false;logAction('returned',`${studentName(x.studentId)} returned`);saveDB();v282Flash='Student returned — GPS tracking stopped.';renderMovement();
};
window.exportMovementCSV=()=>{const rows=[['Student ID','Student Name','Out Time','Expected Return','Return Time','Destination','Reason','Contact Person','Contact Number','Remarks','GPS Points','Start Location','Last Location','Status'],...[...db.movements].sort((a,b)=>String(b.outTime).localeCompare(String(a.outTime))).map(x=>[x.studentId,studentName(x.studentId),x.outTime||'',x.expectedReturn||'',x.returnTime||'',x.destination||'',x.reason||'',x.contactPerson||'',x.contactNumber||'',x.remarks||'',Array.isArray(x.locationHistory)?x.locationHistory.length:0,x.startLocation?.mapLink||'',x.lastLocation?.mapLink||'',x.status])];v28DownloadCSV('Entry-Exit-GPS-Records.csv',rows)};
window.addEventListener('beforeunload',()=>{for(const id of v281Watchers.keys())v281StopTracking(id)});

/* =========================================================
   V2.9.1 LIVE REPORTS INTEGRATION
   ========================================================= */
const V29_VERSION='3.0 RC';
function v291IsoDate(value){
 const raw=String(value||'').trim();
 if(!raw)return '';
 const iso=raw.match(/^(\d{4})-(\d{2})-(\d{2})/);if(iso)return `${iso[1]}-${iso[2]}-${iso[3]}`;
 const dmy=raw.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})/);if(dmy)return `${dmy[3]}-${String(dmy[2]).padStart(2,'0')}-${String(dmy[1]).padStart(2,'0')}`;
 const d=new Date(raw);return Number.isNaN(d.getTime())?'':`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function v291NormalizeStatus(v,type){const x=String(v||'').trim().toLowerCase();const maps={attendance:{present:'Present',p:'Present',absent:'Absent',a:'Absent',late:'Late',leave:'Leave'},movement:{outside:'Outside',out:'Outside',returned:'Returned',return:'Returned'},student:{active:'Active',inactive:'Inactive'}};return maps[type]?.[x]||String(v||'')}
function v291NormalizeData(){
 let changed=false;
 db.attendance=(db.attendance||[]).map(a=>{const n={...a};n.studentId=n.studentId||n.student||n.sid||'';n.date=v291IsoDate(n.date||n.attendanceDate||n.createdAt);n.status=v291NormalizeStatus(n.status,'attendance');n.time=n.time||n.markedTime||'';if(JSON.stringify(n)!==JSON.stringify(a))changed=true;return n});
 db.fees=(db.fees||[]).map(f=>{const n={...f};n.studentId=n.studentId||n.student||n.sid||'';n.date=v291IsoDate(n.date||n.paymentDate||n.createdAt);n.amount=Number(n.amount??n.fee??n.total??0);n.paid=Number(n.paid??n.amountPaid??n.received??0);n.mode=n.mode||n.paymentMode||'';if(JSON.stringify(n)!==JSON.stringify(f))changed=true;return n});
 db.movements=(db.movements||[]).map(m=>{const n={...m};n.studentId=n.studentId||n.student||n.sid||'';n.outTime=n.outTime||n.exitTime||n.createdAt||'';n.expectedReturn=n.expectedReturn||n.expectedTime||'';n.returnTime=n.returnTime||n.inTime||'';n.status=v291NormalizeStatus(n.status|| (n.returnTime?'Returned':'Outside'),'movement');if(!Array.isArray(n.locationHistory))n.locationHistory=[];if(JSON.stringify(n)!==JSON.stringify(m))changed=true;return n});
 if(changed){db.meta=db.meta||{};db.meta.reportIntegrationAt=new Date().toISOString();saveDB()}
 return changed;
}
function v29DateValue(v,fallback){return /^\d{4}-\d{2}-\d{2}$/.test(v||'')?v:fallback}
function v29StartOfMonth(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01`}
function v29EndOfMonth(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(new Date(d.getFullYear(),d.getMonth()+1,0).getDate()).padStart(2,'0')}`}
function v29InRange(date,from,to){const d=v291IsoDate(date);return !!d&&d>=from&&d<=to}
function v29StudentOptions(){return `<option value="">All Students</option>${[...db.students].sort((a,b)=>a.name.localeCompare(b.name)).map(s=>`<option value="${esc(s.id)}">${esc(s.id)} - ${esc(s.name)}</option>`).join('')}`}
function v29ReportFilters(){let from=v29DateValue(el('reportFrom')?.value,v29StartOfMonth()),to=v29DateValue(el('reportTo')?.value,v29EndOfMonth());if(from>to)[from,to]=[to,from];return {type:el('reportType')?.value||'attendance',from,to,studentId:el('reportStudent')?.value||'',status:el('reportStatus')?.value||''}}
function v29DurationMinutes(a,b){if(!a||!b)return '';const n=Math.max(0,Math.round((new Date(b)-new Date(a))/60000));return Number.isFinite(n)?n:''}
function v29StatusOptions(type){const map={attendance:['','Present','Absent','Late','Leave'],movement:['','Outside','Returned'],fees:['','Paid','Partial'],student:['','Active','Inactive']};return (map[type]||['']).map(x=>`<option value="${x}">${x||'All Status'}</option>`).join('')}
function renderReports(){
 v291NormalizeData();
 const from=window._v29From||v29StartOfMonth(),to=window._v29To||v29EndOfMonth(),type=window._v29Type||'attendance';
 el('pageContent').innerHTML=`
 <section class="reports-hero"><div><p>V3.0 RELEASE CANDIDATE</p><h1>Reports & Exports</h1><span>Attendance, fees, entry/exit and student-wise records are synchronized live.</span></div><div class="reports-version">v${V29_VERSION}</div><button class="secondary" onclick="runRCSystemCheck()">Run RC System Check</button></section>
 <div class="report-sync-bar"><span><b>Live Sync:</b> Unified local database</span><span id="reportLastSync">Updated now</span></div>
 <div id="reportAudit" class="report-audit"></div>
 <div class="report-kpis" id="reportKpis"></div>
 <div class="card report-control-card"><div class="report-filters">
  <div class="field"><label>Report</label><select id="reportType"><option value="attendance">Attendance</option><option value="fees">Fees Collection</option><option value="movement">Entry / Exit + GPS</option><option value="student">Student-wise Summary</option></select></div>
  <div class="field"><label>From</label><input id="reportFrom" type="date" value="${from}"></div>
  <div class="field"><label>To</label><input id="reportTo" type="date" value="${to}"></div>
  <div class="field"><label>Student</label><select id="reportStudent">${v29StudentOptions()}</select></div>
  <div class="field"><label>Status</label><select id="reportStatus">${v29StatusOptions(type)}</select></div>
  <div class="report-actions"><button class="primary" onclick="v29GenerateReport()">Generate</button><button class="secondary" onclick="v29ExportCSV()">Export CSV</button><button class="secondary" onclick="v29ExportPDF()">Export PDF</button></div>
 </div></div>
 <div class="card"><div class="card-heading-row"><div><h3 id="reportHeading">Report Preview</h3><p class="muted" id="reportMeta"></p></div><button class="secondary report-refresh" onclick="v291RefreshReports()">Refresh Live Data</button></div><div id="reportTable"></div></div>`;
 el('reportType').value=type;
 ['reportType','reportFrom','reportTo','reportStudent','reportStatus'].forEach(id=>el(id).onchange=()=>{if(id==='reportType'){window._v29Type=el(id).value;el('reportStatus').innerHTML=v29StatusOptions(el(id).value)}v29GenerateReport()});
 v292RenderAudit();
 v29GenerateReport();
}
function v292DataDates(){const dates=[...db.attendance.map(x=>v291IsoDate(x.date)),...db.fees.map(x=>v291IsoDate(x.date)),...db.movements.map(x=>v291IsoDate(x.outTime))].filter(Boolean).sort();return {min:dates[0]||today(),max:dates.at(-1)||today()}}
function v292RenderAudit(){const box=el('reportAudit');if(!box)return;const counts={students:db.students.length,attendance:db.attendance.length,fees:db.fees.length,movements:db.movements.length};const dates=v292DataDates(),migration=db.meta?.legacyMigration?.sources?.join(', ')||'No legacy data found';box.innerHTML=`<div><b>Data Audit</b><span>Students ${counts.students} • Attendance ${counts.attendance} • Fees ${counts.fees} • Entry/Exit ${counts.movements}</span></div><div><span>Saved data range: ${esc(dates.min)} to ${esc(dates.max)}</span><small>${esc(migration)}</small></div><button class="secondary" onclick="v292ShowAllData()">Show All Saved Data</button>`}
window.v292ShowAllData=()=>{const d=v292DataDates();el('reportFrom').value=d.min;el('reportTo').value=d.max;v29GenerateReport()}
window.v291RefreshReports=()=>{db=loadDB();v291NormalizeData();v292RenderAudit();v29GenerateReport();const x=el('reportLastSync');if(x)x.textContent=`Updated ${new Date().toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}`}
function v29AttendanceRows(f){return db.attendance.filter(a=>v29InRange(a.date,f.from,f.to)&&(!f.studentId||a.studentId===f.studentId)&&(!f.status||v291NormalizeStatus(a.status,'attendance')===f.status)).sort((a,b)=>String(b.date).localeCompare(String(a.date))||studentName(a.studentId).localeCompare(studentName(b.studentId))).map(a=>[v291IsoDate(a.date),a.studentId,studentName(a.studentId),v291NormalizeStatus(a.status,'attendance'),a.time||''])}
function v29FeeRows(f){return db.fees.filter(x=>v29InRange(x.date,f.from,f.to)&&(!f.studentId||x.studentId===f.studentId)).sort((a,b)=>String(b.date).localeCompare(String(a.date))).map(x=>{const due=Number(x.amount||0),paid=Number(x.paid||0),status=paid>=due&&due>0?'Paid':'Partial';return [v291IsoDate(x.date),x.studentId,studentName(x.studentId),x.month||'',due,paid,Math.max(0,due-paid),x.mode||'',x.receipt||'',status]}).filter(r=>!f.status||r[9]===f.status)}
function v29MovementRows(f){return db.movements.filter(x=>v29InRange(x.outTime,f.from,f.to)&&(!f.studentId||x.studentId===f.studentId)&&(!f.status||v291NormalizeStatus(x.status,'movement')===f.status)).sort((a,b)=>String(b.outTime).localeCompare(String(a.outTime))).map(x=>[String(x.outTime||'').replace('T',' '),x.studentId,studentName(x.studentId),x.destination||'',x.reason||'',String(x.expectedReturn||'').replace('T',' '),String(x.returnTime||'').replace('T',' '),v29DurationMinutes(x.outTime,x.returnTime),Array.isArray(x.locationHistory)?x.locationHistory.length:0,v291NormalizeStatus(x.status,'movement')])}
function v29StudentRows(f){return db.students.filter(s=>(!f.studentId||s.id===f.studentId)&&(!f.status||v291NormalizeStatus(s.status||'Active','student')===f.status)).map(s=>{const att=db.attendance.filter(a=>a.studentId===s.id&&v29InRange(a.date,f.from,f.to)),fees=db.fees.filter(x=>x.studentId===s.id&&v29InRange(x.date,f.from,f.to)),mov=db.movements.filter(x=>x.studentId===s.id&&v29InRange(x.outTime,f.from,f.to));return [s.id,s.name,s.course||'',s.batch||'',v291NormalizeStatus(s.status||'Active','student'),att.filter(a=>v291NormalizeStatus(a.status,'attendance')==='Present').length,att.filter(a=>v291NormalizeStatus(a.status,'attendance')==='Absent').length,att.filter(a=>v291NormalizeStatus(a.status,'attendance')==='Late').length,fees.reduce((n,x)=>n+Number(x.paid||0),0),mov.length]})}
function v29Data(){const f=v29ReportFilters();let title,headers,rows;if(f.type==='fees'){title='Fees Collection Report';headers=['Date','Student ID','Student','Month','Fee','Paid','Balance','Mode','Receipt','Status'];rows=v29FeeRows(f)}else if(f.type==='movement'){title='Entry / Exit + GPS Report';headers=['Out Time','Student ID','Student','Destination','Reason','Expected Return','Return Time','Minutes','GPS Points','Status'];rows=v29MovementRows(f)}else if(f.type==='student'){title='Student-wise Summary';headers=['Student ID','Student','Course','Batch','Status','Present','Absent','Late','Fees Collected','Movements'];rows=v29StudentRows(f)}else{title='Attendance Report';headers=['Date','Student ID','Student','Status','Marked Time'];rows=v29AttendanceRows(f)}return {f,title,headers,rows}}
window.v29GenerateReport=()=>{const {f,title,headers,rows}=v29Data();window._v29From=f.from;window._v29To=f.to;window._v29Type=f.type;el('reportFrom').value=f.from;el('reportTo').value=f.to;el('reportHeading').textContent=title;el('reportMeta').textContent=`${f.from} to ${f.to} • ${rows.length} record${rows.length===1?'':'s'} • Live data`;v292RenderAudit();el('reportTable').innerHTML=rows.length?`<div class="table-wrap report-table"><table><thead><tr>${headers.map(h=>`<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map((c,i)=>`<td>${(f.type==='fees'&&[4,5,6].includes(i))||(f.type==='student'&&i===8)?money(c):esc(c===null||c===undefined?'':c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`:`<div class="empty"><b>No records found</b><br><span>Selected dates or filters may not contain saved ${esc(f.type)} data.</span></div>`;v29RenderKpis(f)}
function v29RenderKpis(f){const byStudent=x=>!f.studentId||x.studentId===f.studentId;const att=db.attendance.filter(a=>byStudent(a)&&v29InRange(a.date,f.from,f.to)),fees=db.fees.filter(x=>byStudent(x)&&v29InRange(x.date,f.from,f.to)),mov=db.movements.filter(x=>byStudent(x)&&v29InRange(x.outTime,f.from,f.to));const cards=[['Attendance Marked',att.length],['Present',att.filter(a=>v291NormalizeStatus(a.status,'attendance')==='Present').length],['Fees Collected',money(fees.reduce((n,x)=>n+Number(x.paid||0),0))],['Outside Trips',mov.length],['Returned',mov.filter(x=>v291NormalizeStatus(x.status,'movement')==='Returned').length]];el('reportKpis').innerHTML=cards.map(([l,v])=>`<div class="report-kpi"><span>${l}</span><b>${v}</b></div>`).join('')}
window.v29ExportCSV=()=>{const {title,headers,rows}=v29Data();if(!rows.length)return alert('No report records to export.');v28DownloadCSV(`${title.replace(/[^a-z0-9]+/gi,'-')}-${today()}.csv`,[headers,...rows])}
window.v29ExportPDF=()=>{const {f,title,headers,rows}=v29Data();if(!rows.length)return alert('No report records to export.');if(!window.jspdf)return alert('PDF library loading. Please try again.');const {jsPDF}=window.jspdf,doc=new jsPDF({orientation:headers.length>6?'landscape':'portrait'}),w=doc.internal.pageSize.getWidth();doc.setFontSize(16);doc.text(db.settings.hallName,14,16);doc.setFontSize(12);doc.text(title,14,24);doc.setFontSize(9);doc.text(`${f.from} to ${f.to} | Records: ${rows.length} | Live integrated data`,14,31);let y=40;rows.forEach(r=>{const text=r.map((c,i)=>`${headers[i]}: ${String(c??'')}`).join(' | '),wrapped=doc.splitTextToSize(text,w-28);if(y+wrapped.length*5>doc.internal.pageSize.getHeight()-12){doc.addPage();y=16}doc.text(wrapped,14,y);y+=wrapped.length*5+3});doc.save(`${title.replace(/[^a-z0-9]+/gi,'-')}-${f.from}-to-${f.to}.pdf`)}
