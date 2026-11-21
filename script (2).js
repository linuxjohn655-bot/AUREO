(()=>{
'use strict';
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid=()=>Math.random().toString(36).slice(2,10)+Date.now().toString(36);
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
const phone=()=>matchMedia('(max-width:760px)').matches;
const wait=ms=>new Promise(r=>setTimeout(r,ms));

/* ---------- icons ---------- */
const svg=(d,s=18)=>`<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const I={
  gear:svg('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>'),
  send:svg('<path d="M22 2 11 13"/><path d="M22 2 15 22l-4-9-9-4z"/>'),
  back:svg('<path d="M15 18l-6-6 6-6"/>',20),
  x:svg('<path d="M18 6 6 18M6 6l12 12"/>',20),
  bug:svg('<rect x="8" y="8" width="8" height="11" rx="4"/><path d="M9 5.5 10.5 8M15 5.5 13.5 8M8 12H4M16 12h4M8.5 16.5 5 18.5M15.5 16.5 19 18.5M12 8v11"/>')
};

/* ---------- storage ---------- */
const KEY='tuso.v1';
let storeOK=true, mem=null;
try{localStorage.setItem('tuso.t','1');localStorage.removeItem('tuso.t')}catch(e){storeOK=false}
const PROTECTED='devlearn';
const ADMIN_SEED={id:'devlearn',email:'devlearn@tuso.local',username:'devlearn',display:'Devlearn',salt:'tuso:devlearn:v1',hash:'p76948c8799f37ec2971dc214311454da3f724f1e689bd810ac5841d3758560e1',kdf:'pbkdf2',role:'admin',created:1795046400000,avatar:null,bio:'Runs TuSo.',banner:1,status:'online',seen:0};
function seedAdmin(o){
  if(o.users.some(u=>u.id===PROTECTED))return;
  const clash=o.users.find(u=>u.username==='devlearn');if(clash)clash.username='devlearn_user';
  o.users.push({...ADMIN_SEED});o.data[PROTECTED]=o.data[PROTECTED]||{last:null,prefs:{}};
}
const blank=()=>({users:[],session:null,data:{},dms:{},servers:{},bugs:[]});
function load(){
  let o=null;
  try{const s=localStorage.getItem(KEY);if(s)o=JSON.parse(s)}catch(e){}
  if(!o||!Array.isArray(o.users))o=mem||blank();
  o.data=o.data||{};o.dms=o.dms||{};o.servers=o.servers||{};o.bugs=o.bugs||[];
  for(const u of o.users){if(u.staff&&!u.role)u.role='staff';delete u.staff}
  seedAdmin(o);
  for(const id in o.data){const d=o.data[id];if(d){delete d.convos;d.prefs=d.prefs||{}}}
  return o;
}
let db=load();
function save(){mem=db;try{localStorage.setItem(KEY,JSON.stringify(db))}catch(e){if(me)toast('Storage is full. Free some space in Settings, Storage.')}}
const SS={get(){try{return sessionStorage.getItem('tuso.sess')}catch(e){return null}},set(v){try{v?sessionStorage.setItem('tuso.sess',v):sessionStorage.removeItem('tuso.sess')}catch(e){}}};

/* ---------- crypto ---------- */
function rand(n=16){try{const a=new Uint8Array(n);crypto.getRandomValues(a);return [...a].map(b=>b.toString(16).padStart(2,'0')).join('')}catch(e){return uid()+uid()}}
async function sha(pw,salt){
  const enc=new TextEncoder().encode(salt+':'+pw);
  try{const d=await crypto.subtle.digest('SHA-256',enc);return [...new Uint8Array(d)].map(b=>b.toString(16).padStart(2,'0')).join('')}
  catch(e){let h=5381;for(const b of enc)h=((h<<5)+h+b)>>>0;return 'x'+h.toString(16)}
}

/* PBKDF2 with a per-account salt. Accounts hashed the old way are upgraded on their next login. */
async function hashPw(pw,salt){
  try{
    const enc=new TextEncoder(),k=await crypto.subtle.importKey('raw',enc.encode(pw),'PBKDF2',false,['deriveBits']);
    const bits=await crypto.subtle.deriveBits({name:'PBKDF2',salt:enc.encode(salt),iterations:100000,hash:'SHA-256'},k,256);
    return 'p'+[...new Uint8Array(bits)].map(b=>b.toString(16).padStart(2,'0')).join('');
  }catch(e){return sha(pw,salt)}
}
async function checkPw(u,pw){
  if(u.kdf==='pbkdf2')return (await hashPw(pw,u.salt))===u.hash;
  if((await sha(pw,u.salt))!==u.hash)return false;
  u.salt=rand();u.hash=await hashPw(pw,u.salt);u.kdf='pbkdf2';save();return true;
}

/* ---------- animated background ---------- */
const cv=$('#bg'), cx=cv.getContext('2d');
let W=0,H=0;
const BL=[
  {r:.62,l:64,a:.20,fx:.000071,fy:.000093,px:0,py:.4},
  {r:.50,l:82,a:.13,fx:.000113,fy:.000067,px:2.1,py:1.1},
  {r:.72,l:38,a:.32,fx:.000053,fy:.000081,px:4.2,py:2.3},
  {r:.42,l:92,a:.09,fx:.000137,fy:.000109,px:1,py:5},
  {r:.56,l:52,a:.24,fx:.000089,fy:.000061,px:3.3,py:3.7}
];
const ptr={x:.5,y:.5,tx:.5,ty:.5};
const bg={mode:'animated',speed:1,clock:26000,last:0,raf:0};
function bgSize(){const s=.18;W=cv.width=Math.max(2,Math.ceil(innerWidth*s));H=cv.height=Math.max(2,Math.ceil(innerHeight*s))}
function bgDraw(t){
  cx.globalCompositeOperation='source-over';
  cx.fillStyle='#060606';cx.fillRect(0,0,W,H);
  cx.globalCompositeOperation='lighter';
  for(const b of BL){
    const x=W*(.5+.4*Math.sin(t*b.fx+b.px)), y=H*(.5+.4*Math.cos(t*b.fy+b.py)), r=Math.max(W,H)*b.r;
    const g=cx.createRadialGradient(x,y,0,x,y,r);
    g.addColorStop(0,`hsla(0,0%,${b.l}%,${b.a})`);
    g.addColorStop(.5,`hsla(0,0%,${b.l}%,${b.a*.32})`);
    g.addColorStop(1,'hsla(0,0%,0%,0)');
    cx.fillStyle=g;cx.fillRect(0,0,W,H);
  }
  // soft light that follows the pointer
  const gx=W*ptr.x, gy=H*ptr.y, gr=Math.max(W,H)*.34;
  const pg=cx.createRadialGradient(gx,gy,0,gx,gy,gr);
  pg.addColorStop(0,'hsla(0,0%,88%,.12)');pg.addColorStop(1,'hsla(0,0%,0%,0)');
  cx.fillStyle=pg;cx.fillRect(0,0,W,H);
  // one slow diagonal light sweep
  const p=((t*.000028)%1.8)-.4, bx=W*p, bw=W*.22;
  cx.save();cx.translate(bx,0);cx.transform(1,0,-.55,1,0,0);
  const sg=cx.createLinearGradient(-bw,0,bw,0);
  sg.addColorStop(0,'rgba(255,255,255,0)');sg.addColorStop(.5,'rgba(255,255,255,.045)');sg.addColorStop(1,'rgba(255,255,255,0)');
  cx.fillStyle=sg;cx.fillRect(-bw,0,bw*2,H);cx.restore();
  cx.globalCompositeOperation='source-over';
}
const GATE=matchMedia('(pointer:coarse)').matches?72:42;
function bgLoop(ts){
  bg.raf=0;
  if(document.hidden||bg.mode==='static')return;
  if(ts-bg.last>=GATE){
    bg.clock+=Math.min(100,ts-bg.last)*bg.speed;bg.last=ts;
    ptr.x+=(ptr.tx-ptr.x)*.06;ptr.y+=(ptr.ty-ptr.y)*.06;
    bgDraw(bg.clock);
  }
  bg.raf=requestAnimationFrame(bgLoop);
}
function bgSet(mode){
  bg.mode=mode;bg.speed=mode==='calm'?.35:1;
  document.documentElement.classList.toggle('still',mode==='static');
  if(bg.raf){cancelAnimationFrame(bg.raf);bg.raf=0}
  bgDraw(bg.clock);
  if(mode!=='static'){bg.last=performance.now();bg.raf=requestAnimationFrame(bgLoop)}
}
function makeGrain(){
  try{
    const n=document.createElement('canvas');n.width=n.height=160;
    const g=n.getContext('2d'),d=g.createImageData(160,160);
    for(let i=0;i<d.data.length;i+=4){const v=Math.random()*255|0;d.data[i]=d.data[i+1]=d.data[i+2]=v;d.data[i+3]=255}
    g.putImageData(d,0,0);$('#grain').style.backgroundImage=`url(${n.toDataURL()})`;
  }catch(e){}
}
addEventListener('resize',()=>{bgSize();bgDraw(bg.clock)});
addEventListener('pointermove',e=>{ptr.tx=e.clientX/innerWidth;ptr.ty=e.clientY/innerHeight},{passive:true});

/* ---------- helpers ---------- */
const hashNum=s=>{let h=7;for(let i=0;i<s.length;i++)h=(h*31+s.charCodeAt(i))>>>0;return h};
const STATUS={online:'Online',idle:'Idle',dnd:'Do not disturb',invisible:'Invisible',offline:'Offline'};
const OFFICIAL={id:'tuso',display:'TuSo',username:'tuso',official:true,status:'online',banner:2,avatar:null,bio:'Official messages from the TuSo team.'};
const STAFF='<span class="staff" data-tip="Staff: part of the TuSo team. Can warn and ban members." role="img" aria-label="Staff"><svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" aria-hidden="true"><path d="M6 1 10.5 3.2v3.1C10.5 8.7 8.6 10.4 6 11 3.4 10.4 1.5 8.7 1.5 6.3V3.2z"/><path d="M6 4v3" stroke-linecap="round"/></svg></span>';
const ADMIN='<span class="admin" data-tip="Admin: runs TuSo. Manages staff, accounts and servers." role="img" aria-label="Admin"><svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" aria-hidden="true"><path d="M1.6 9.6 1.2 4l3 2.4L6 2.4l1.8 4L10.8 4l-.4 5.6z"/></svg></span>';
const HUNTER='<span class="hunter" data-tip="Bug hunter: reported a bug that got fixed." role="img" aria-label="Bug hunter"><svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3.6" y="3.4" width="4.8" height="6.2" rx="2.4"/><path d="M4.6 3.2 3.9 1.8M7.4 3.2 8.1 1.8M3.6 6H1.6M8.4 6h2M3.8 8.2 2.2 9.4M8.2 8.2l1.6 1.2M6 3.8v5.6"/></svg></span>';
const isAdmin=u=>!!u&&u.role==='admin';
const isStaff=u=>!!u&&(u.role==='admin'||u.role==='staff');
const tags=u=>!u?'':u.official?TAG:((isAdmin(u)?ADMIN:(u.role==='staff'?STAFF:''))+(u.hunter?HUNTER:''));
const TAG='<span class="official" data-tip="Official: a verified TuSo account." role="img" aria-label="Official"><svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 6.4 4.8 9 10 3.2"/></svg>Official</span>';
function av(u,s=40,st=null){
  const h=hashNum(u.id||u.username||'x'), a=90-(h%12), b=a-28-((h>>3)%10), ang=120+(h%90);
  if(u.official)return `<span class="av" style="--s:${s}px;--bgv:#f1f1ef;letter-spacing:-.06em;font-size:${Math.round(s*.4)}px">Tu${st?`<i class="dot" data-s="${st}"></i>`:''}</span>`;
  const inner=u.avatar?`<img src="${esc(u.avatar)}" alt="">`:esc((u.display||u.username||'?').trim().charAt(0).toUpperCase()||'?');
  return `<span class="av" style="--s:${s}px;--bgv:linear-gradient(${ang}deg,hsl(0 0% ${a}%),hsl(0 0% ${b}%))">${inner}${st?`<i class="dot" data-s="${st}"></i>`:''}</span>`;
}
const hm=ts=>new Date(ts).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
const sameDay=(a,b)=>new Date(a).toDateString()===new Date(b).toDateString();
function dayLabel(ts){
  const d=new Date(ts),n=new Date(),y=new Date(Date.now()-864e5);
  if(d.toDateString()===n.toDateString())return 'Today';
  if(d.toDateString()===y.toDateString())return 'Yesterday';
  return d.toLocaleDateString([],{weekday:'long',day:'numeric',month:'long',year:d.getFullYear()===n.getFullYear()?undefined:'numeric'});
}
function fmt(t){return esc(t).replace(/(https?:\/\/[^\s<]+[^\s<.,;:!?)\]'"])/g,u=>`<a href="${u}" target="_blank" rel="noopener noreferrer">${u}</a>`)}
const BANNERS=[
  {n:'Graphite',css:'linear-gradient(135deg,#323232,#0e0e0e)'},
  {n:'Fog',css:'radial-gradient(circle at 18% 25%,#a4a4a0,transparent 62%),linear-gradient(135deg,#3b3b39,#141414)'},
  {n:'Chalk',css:'linear-gradient(135deg,#dcdcd8,#7c7c78)'},
  {n:'Stripe',css:'repeating-linear-gradient(45deg,#1a1a1a 0 10px,#262626 10px 20px)'},
  {n:'Ink',css:'linear-gradient(180deg,#000,#222)'},
  {n:'Halftone',css:'radial-gradient(circle,#666663 1.2px,transparent 1.7px) 0 0/10px 10px,#131313'}
];
const STALE=150000;
function presence(u){
  if(u&&u.official)return 'online';
  if(!u||!u.seen||Date.now()-u.seen>STALE)return 'offline';
  return u.status==='invisible'?'offline':(u.status||'online');
}
function bannerBg(u,o){
  const img=o.bannerImg!==undefined?o.bannerImg:u.bannerImg;
  if(img&&/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+\/=]+$/.test(img))return `url('${img}') center/cover no-repeat,#111`;
  return (BANNERS[o.banner??u.banner??0]||BANNERS[0]).css;
}
function pcard(u,o={}){
  const name=o.display??u.display, bio=o.bio??u.bio, st=o.state||'offline';
  const au={...u,display:name,avatar:o.avatar!==undefined?o.avatar:u.avatar};
  return `<div class="pcard"><div class="banner" style="background:${bannerBg(u,o)}"></div><div class="pbody"><div class="pav">${av(au,84,st)}</div><b class="pname">${esc(name)}${tags(u)}</b><span class="un">@${esc(u.username)}</span><span class="pill"><i class="dot" data-s="${st}"></i>${STATUS[st]}</span>${bio?`<div class="psec"><span class="lbl">About me</span><p>${esc(bio)}</p></div>`:''}</div></div>`;
}

let toastT=0;
function toast(msg){const t=$('#toast');t.textContent=msg;t.classList.add('show');clearTimeout(toastT);toastT=setTimeout(()=>t.classList.remove('show'),2400)}
function ask({title,body,ok='Confirm',danger=false}){
  return new Promise(res=>{
    const m=$('#modal'),y=$('#mYes'),n=$('#mNo'),prev=document.activeElement;
    $('#mTitle').textContent=title;$('#mBody').textContent=body;
    y.textContent=ok;y.className='btn '+(danger?'btn-danger':'btn-primary');
    m.classList.add('open');
    const done=v=>{m.classList.remove('open');y.onclick=n.onclick=m.onclick=m.onkeydown=null;if(prev&&prev.focus)prev.focus();res(v)};
    y.onclick=()=>done(true);n.onclick=()=>done(false);
    m.onclick=e=>{if(e.target===m)done(false)};
    m.onkeydown=e=>{if(e.key==='Escape'){e.stopPropagation();done(false)}};
    setTimeout(()=>n.focus(),30);
  });
}
function setErr(input,msg){
  const f=input.closest('.field');if(!f)return;
  f.classList.toggle('bad',!!msg);
  const e=f.querySelector('.err');if(e)e.textContent=msg||'';
  input.setAttribute('aria-invalid',msg?'true':'false');
}
function clearErrs(form){$$('.input',form).forEach(i=>setErr(i,''));$$('.formerr',form).forEach(e=>e.textContent='')}
function busy(btn,on,label){btn.disabled=on;btn.classList.toggle('loading',on)}
function shake(){const c=$('#authCard');c.classList.remove('shake');void c.offsetWidth;c.classList.add('shake')}
$('#authCard').addEventListener('animationend',e=>{if(e.animationName==='shake')e.currentTarget.classList.remove('shake')});

const reEmail=/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const reUser=/^[a-z0-9_.]{2,24}$/;

/* ---------- auth ---------- */
let swapping=false;
function authTab(which,animate){
  const login=which==='login';
  const to=login?$('#fLogin'):$('#fSignup'), from=login?$('#fSignup'):$('#fLogin');
  const title=login?'Welcome back!':'Create an account', sub=login?'We’re so excited to see you again!':'';
  const set=()=>{from.hidden=true;to.hidden=false;$('#authTitle').textContent=title;$('#authSub').textContent=sub};
  if(!to.hidden)return;
  if(!animate||reduce){set();return}
  if(swapping)return;swapping=true;
  const wrap=$('#formWrap'),head=$('#cardHead'),h0=wrap.offsetHeight;
  wrap.style.height=h0+'px';wrap.style.overflow='hidden';
  from.classList.add('leaving');head.classList.add('leaving');
  setTimeout(()=>{
    set();from.classList.remove('leaving');head.classList.remove('leaving');to.classList.add('entering');
    wrap.style.height='auto';const h1=wrap.offsetHeight;
    wrap.style.height=h0+'px';void wrap.offsetHeight;
    wrap.style.transition='height .45s cubic-bezier(.22,1,.36,1)';wrap.style.height=h1+'px';
    setTimeout(()=>{wrap.style.cssText='';to.classList.remove('entering');swapping=false},470);
  },170);
}
$$('[data-go]').forEach(b=>b.onclick=()=>authTab(b.dataset.go,true));
document.addEventListener('click',e=>{
  const b=e.target.closest('.pwt');if(!b)return;
  const i=document.getElementById(b.dataset.for),show=i.type==='password';
  i.type=show?'text':'password';b.textContent=show?'Hide':'Show';b.setAttribute('aria-label',show?'Hide password':'Show password');
});
if(!storeOK)$('#storeWarn').hidden=false;

$('#fLogin').addEventListener('submit',async e=>{
  e.preventDefault();
  const f=e.target,idEl=$('#liId'),pwEl=$('#liPw');clearErrs(f);
  const id=idEl.value.trim().toLowerCase().replace(/^@/,''),pw=pwEl.value;
  let ok=true;
  if(!id){setErr(idEl,'Enter your email or username.');ok=false}
  if(!pw){setErr(pwEl,'Enter your password.');ok=false}
  if(!ok){shake();return}
  const btn=$('#liBtn');busy(btn,true);
  db=load();
  const u=db.users.find(x=>x.email===id||x.username===id);
  const good=u?await checkPw(u,pw):false;
  await wait(260);
  busy(btn,false);
  if(!u||!good){[idEl,pwEl].forEach(i=>i.closest('.field').classList.add('bad'));$('#liErr').textContent='Email, username or password is invalid.';shake();return}
  if(u.ban){$('#liErr').textContent='This account is banned.'+(u.ban.reason?' Reason: '+u.ban.reason:'');shake();return}
  f.reset();enter(u);
});

$('#fSignup').addEventListener('submit',async e=>{
  e.preventDefault();
  const f=e.target;clearErrs(f);db=load();
  const emEl=$('#suEmail'),dnEl=$('#suName'),unEl=$('#suUser'),pwEl=$('#suPw'),p2El=$('#suPw2');
  const em=emEl.value.trim().toLowerCase(),dn=dnEl.value.trim(),un=unEl.value.trim().toLowerCase().replace(/^@/,''),pw=pwEl.value;
  let ok=true;
  if(!reEmail.test(em)){setErr(emEl,'Enter a valid email address.');ok=false}
  else if(db.users.some(x=>x.email===em)){setErr(emEl,'An account with this email already exists. Try logging in.');ok=false}
  if(!reUser.test(un)){setErr(unEl,'Use 2 to 24 letters, numbers, dots or underscores.');ok=false}
  else if(un==='tuso'||db.users.some(x=>x.username===un)){setErr(unEl,'That username is taken.');ok=false}
  if(pw.length<8){setErr(pwEl,'Use at least 8 characters.');ok=false}
  if(p2El.value!==pw){setErr(p2El,'The passwords do not match.');ok=false}
  if(!ok){shake();return}
  const btn=$('#suBtn');busy(btn,true);
  const salt=rand(),hash=await hashPw(pw,salt);
  await wait(260);
  db=load();
  if(db.users.some(x=>x.username===un||x.email===em)){busy(btn,false);setErr(unEl,'That username or email was just taken.');shake();return}
  const u={id:uid(),email:em,username:un,display:dn||un,salt,hash,kdf:'pbkdf2',created:Date.now(),avatar:null,bio:'',banner:0,status:'online',seen:0};
  db.users.push(u);db.data[u.id]={last:null,prefs:{...DEF}};save();
  busy(btn,false);f.reset();enter(u);
});

/* ---------- state ---------- */
const DEF={bg:reduce?'static':'animated',dens:'cozy',size:'md',badges:true,sound:false};
let me=null,active=null,activeServer=null;
const MAX_SERVERS=100;
const UD=()=>db.data[me.id];
const prefs=()=>UD().prefs;
const contact=id=>id==='tuso'?OFFICIAL:(db.users.find(u=>u.id===id)||null);
const dmKey=(a,b)=>[a,b].sort().join(':');
const lastOf=d=>d.msgs[d.msgs.length-1];
function getDm(other,create){
  const k=dmKey(me.id,other);let d=db.dms[k];
  if(!d&&create)d=db.dms[k]={users:[me.id,other],msgs:[],read:{},open:{},closed:{}};
  return d||null;
}
const activity=d=>Math.max((lastOf(d)||{}).ts||0,(d.open||{})[me.id]||0);
const dmVisible=d=>d.users.includes('tuso')||activity(d)>((d.closed||{})[me.id]||0);
const unreadOf=d=>{const r=(d.read||{})[me.id]||0;return d.msgs.reduce((n,m)=>n+(m.from!==me.id&&m.ts>r?1:0),0)};
function markRead(d){const l=lastOf(d);if(l&&((d.read||(d.read={}))[me.id]||0)<l.ts){d.read[me.id]=l.ts;return true}return false}
function convoList(){
  return Object.values(db.dms).filter(d=>d.users.includes(me.id)).map(d=>({d,u:contact(d.users.find(x=>x!==me.id))})).filter(r=>r.u&&dmVisible(r.d)).sort((a,b)=>(b.u.official?1:0)-(a.u.official?1:0)||activity(b.d)-activity(a.d));
}
const totalUnread=()=>convoList().reduce((n,r)=>n+unreadOf(r.d),0);

/* The one built-in account. It is created once per user and can't be replied to. */
function ensureWelcome(){
  const k=dmKey(me.id,'tuso');
  if(db.dms[k])return;
  UD().newsSent=NEWS_VER;
  db.dms[k]={users:[me.id,'tuso'],read:{},open:{},closed:{},msgs:[{id:uid(),from:'tuso',ts:Date.now(),text:`Welcome to TuSo, ${me.display}. This is your first direct message.\n\nAccounts made in this browser can message each other. Open TuSo in a second tab, sign up with another account, then use “Find or start a conversation” to say hi.`}]};
}

/* A new release is posted once to each account's TuSo conversation. */
function announce(){
  const ud=UD();if(ud.newsSent===NEWS_VER)return;
  ud.newsSent=NEWS_VER;
  const r=RELEASES[0];
  tusoSay(me.id,`TuSo v${r.ver} is out: ${r.title}\n\n${r.blurb}\n\n${r.items.map(i=>'• '+i[1]).join('\n')}\n\nMore detail is in Settings, What’s new.`);
}

/* ---------- entering / leaving ---------- */
function enter(u){
  me=u;db.session=u.id;SS.set(u.id);
  db.data[u.id]=db.data[u.id]||{last:null,prefs:{}};
  const ud=UD();ud.prefs={...DEF,...ud.prefs};
  u.seen=Date.now();ensureWelcome();announce();save();
  const d=ud.last&&getDm(ud.last,false);
  active=(d&&contact(ud.last)&&dmVisible(d))?ud.last:null;
  const auth=$('#auth'),app=$('#app');
  activeServer=null;applyPrefs();renderMe();renderRail();showSide();renderList(true);renderChat(false);
  $('#shell').classList.remove('chat-open');
  app.hidden=false;void app.offsetWidth;app.classList.add('in');
  auth.classList.add('out');setTimeout(()=>{auth.hidden=true;auth.classList.remove('out')},reduce?0:340);
  if(!phone()&&active)setTimeout(()=>$('#ta').focus(),400);
  checkWarnings();
}
function leave(){
  if(me&&db.users.some(x=>x.id===me.id)){me.seen=0}
  db.session=null;SS.set(null);save();
  closeSettings(true);closeQS();closeSrvM();closeEmoji();
  me=null;active=null;activeServer=null;
  const auth=$('#auth'),app=$('#app');
  app.classList.remove('in');
  auth.hidden=false;auth.classList.remove('out');
  const a=$('#authIn');a.style.animation='none';void a.offsetWidth;a.style.animation='';
  setTimeout(()=>{app.hidden=true},reduce?0:420);
  authTab('login',false);
}

/* ---------- prefs ---------- */
function applyPrefs(){
  const p=prefs(),app=$('#app');
  app.dataset.dens=p.dens;app.dataset.size=p.size;app.classList.toggle('nobadge',!p.badges);
  if(bg.mode!==p.bg||document.documentElement.classList.contains('still')!==(p.bg==='static'))bgSet(p.bg);
}
function syncPrefUI(){
  const p=prefs();
  $$('#p-appearance [data-pref]').forEach(g=>$$('[role=radio]',g).forEach(b=>b.setAttribute('aria-checked',b.dataset.v===p[g.dataset.pref])));
  $$('.switch').forEach(s=>s.setAttribute('aria-checked',!!p[s.dataset.pref]));
}
$('#p-appearance').addEventListener('click',e=>{
  const b=e.target.closest('[role=radio]');if(!b)return;
  const g=b.closest('[data-pref]');prefs()[g.dataset.pref]=b.dataset.v;save();applyPrefs();syncPrefUI();
});
$('#p-notify').addEventListener('click',e=>{
  const s=e.target.closest('.switch');if(!s)return;
  const k=s.dataset.pref;prefs()[k]=!prefs()[k];save();applyPrefs();syncPrefUI();
  if(k==='sound'&&prefs().sound)blip();
});
let actx=null;
function blip(){
  try{
    actx=actx||new (window.AudioContext||window.webkitAudioContext)();
    const o=actx.createOscillator(),g=actx.createGain();
    o.type='sine';o.frequency.value=660;g.gain.setValueAtTime(.0001,actx.currentTime);
    g.gain.exponentialRampToValueAtTime(.07,actx.currentTime+.02);g.gain.exponentialRampToValueAtTime(.0001,actx.currentTime+.28);
    o.connect(g);g.connect(actx.destination);o.start();o.stop(actx.currentTime+.3);
  }catch(e){}
}

/* ---------- sidebar ---------- */
function renderMe(){
  $('#me').innerHTML=`
    <div id="myProfileBtn" style="display:flex; align-items:center; gap:10px; flex:1; cursor:pointer;" title="View my profile">
      ${av(me,38,me.status||'online')}
      <div class="who" style="pointer-events:none;">
        <b><span class="nmt">${esc(me.display)}</span>${tags(me)}</b>
        <span>@${esc(me.username)}</span>
      </div>
    </div>
    <button class="icon-btn" id="bugBtn" type="button" aria-label="Report a bug" title="Report a bug">${I.bug}</button>
    <button class="icon-btn" id="openSettings" type="button" aria-label="Open settings">${I.gear}</button>
  `;
  
  // Clicking your name/avatar opens your profile card
  $('#myProfileBtn').onclick = () => {
    $('#myProfileContent').innerHTML = pcard(me, { state: presence(me) });
    $('#myProfileM').classList.add('open');
  };

  $('#openSettings').onclick=()=>openSettings('account');
  $('#bugBtn').onclick=openBug;
  $('#adminTab').hidden=!isStaff(me);syncNewDot();
}

// Close profile popup when clicking the dark background
$('#myProfileM').addEventListener('click', e => {
  if (e.target === e.currentTarget) e.currentTarget.classList.remove('open');
});

let staggerT=0;
function renderList(stagger){
  const rows=convoList(),ul=$('#dmList');
  if(stagger){ul.classList.add('stagger');clearTimeout(staggerT);staggerT=setTimeout(()=>ul.classList.remove('stagger'),1400)}
  ul.innerHTML=rows.length?rows.map(({d,u},i)=>{
    const l=lastOf(d),n=unreadOf(d),pv=l?((l.from===me.id?'You: ':'')+l.text.replace(/\s+/g,' ')):'No messages yet';
    return `<li style="--i:${i}"><button type="button" class="dm${u.id===active?' active':''}${n?' unread':''}" data-id="${u.id}">${av(u,40,presence(u))}<span class="meta"><span class="nm">${esc(u.display)}${tags(u)}</span><span class="pv">${esc(pv)}</span></span>${n?`<span class="badge" aria-label="${n} unread">${n>99?'99+':n}</span>`:''}</button></li>`;
  }).join(''):`<li class="none"><b>No conversations yet</b><span>Use “Find or start a conversation” to message someone.</span></li>`;
}
$('#dmList').addEventListener('click',e=>{const b=e.target.closest('.dm');if(b)select(b.dataset.id)});
$('#findKbd').textContent=/Mac|iPhone|iPad/.test(navigator.platform||navigator.userAgent)?'⌘ K':'Ctrl K';
$('#findBtn').onclick=openQS;
$('#emptyStart').onclick=openQS;

function select(id){
  if(activeServer){activeServer=null;renderRail();showSide()}
  active=id;const d=getDm(id,false);
  if(d&&markRead(d))save();
  UD().last=id;save();
  renderList();renderChat(true);
  $('#shell').classList.add('chat-open');
  if(!phone())setTimeout(()=>$('#ta').focus(),60);
}
function closeConvo(){
  const d=getDm(active,false);if(!d||active==='tuso')return;
  d.closed[me.id]=Math.max(Date.now(),activity(d));
  UD().last=null;active=null;save();
  renderList();renderChat(true);
  $('#shell').classList.remove('chat-open');
}

/* ---------- quick switcher ---------- */
let qsSel=0,qsItems=[];
function openQS(){
  if(!me)return;
  $('#qs').classList.add('open');$('#qsIn').value='';qsSel=0;renderQS();
  setTimeout(()=>$('#qsIn').focus(),40);
}
function closeQS(){$('#qs').classList.remove('open')}
function renderQS(){
  const q=$('#qsIn').value.trim().toLowerCase().replace(/^@/,'');
  const others=[OFFICIAL,...db.users.filter(u=>u.id!==me.id)];
  const inConvo=u=>{const d=getDm(u.id,false);return d&&dmVisible(d)?1:0};
  qsItems=others.filter(u=>!q||u.display.toLowerCase().includes(q)||u.username.includes(q)).sort((a,b)=>inConvo(b)-inConvo(a)||a.display.localeCompare(b.display));
  qsSel=Math.min(qsSel,Math.max(0,qsItems.length-1));
  $('#qsList').innerHTML=qsItems.length?qsItems.map((u,i)=>`<li><button type="button" data-i="${i}" class="${i===qsSel?'sel':''}">${av(u,36,presence(u))}<span class="q-meta"><b>${esc(u.display)}${tags(u)}</b><span>@${esc(u.username)}</span></span>${inConvo(u)?'<span class="q-tag">Open</span>':''}</button></li>`).join('')
    :`<li class="none">${others.length?`Nobody matches “${esc(q)}”.`:'No other accounts yet. Open TuSo in a second tab, sign up with another account, then message it from here.'}</li>`;
}
function qsMove(d){
  if(!qsItems.length)return;
  qsSel=(qsSel+d+qsItems.length)%qsItems.length;
  $$('#qsList button').forEach((b,i)=>b.classList.toggle('sel',i===qsSel));
  const el=$$('#qsList button')[qsSel];if(el)el.scrollIntoView({block:'nearest'});
}
function openDm(id){
  const d=getDm(id,true);
  d.open[me.id]=Math.max(Date.now(),(d.closed[me.id]||0)+1);
  save();closeQS();select(id);
}
$('#qsIn').addEventListener('input',()=>{qsSel=0;renderQS()});
$('#qsIn').addEventListener('keydown',e=>{
  if(e.key==='ArrowDown'){e.preventDefault();qsMove(1)}
  else if(e.key==='ArrowUp'){e.preventDefault();qsMove(-1)}
  else if(e.key==='Enter'){e.preventDefault();if(qsItems[qsSel])openDm(qsItems[qsSel].id)}
});
$('#qsList').addEventListener('click',e=>{const b=e.target.closest('button[data-i]');if(b&&qsItems[+b.dataset.i])openDm(qsItems[+b.dataset.i].id)});
$('#qs').addEventListener('click',e=>{if(e.target===e.currentTarget)closeQS()});

/* ---------- chat ---------- */
let seen=new Set();
function renderHead(){
  const srv=activeServer&&db.servers[activeServer];
  if(srv){
    $('#chHead').innerHTML=`<button class="icon-btn back" id="backBtn" type="button" aria-label="Back to server">${I.back}</button><span class="hash" aria-hidden="true">#</span><div class="t"><b>general</b><span>${esc(srv.name)} · ${srv.members.length} member${srv.members.length===1?'':'s'}</span></div>`;
    $('#backBtn').onclick=()=>$('#shell').classList.remove('chat-open');
    return;
  }
  const c=contact(active);if(!c)return;
  const st=presence(c);
  $('#chHead').innerHTML=`<button class="icon-btn back" id="backBtn" type="button" aria-label="Back to conversations">${I.back}</button>${av(c,36,st)}<div class="t"><b>${esc(c.display)}${tags(c)}</b><span>@${esc(c.username)} · ${STATUS[st]}</span></div>${c.official?'':`<button class="icon-btn" id="closeBtn" type="button" aria-label="Close conversation" title="Close conversation">${I.x}</button>`}`;
  $('#backBtn').onclick=()=>$('#shell').classList.remove('chat-open');
  if($('#closeBtn'))$('#closeBtn').onclick=closeConvo;
}
function renderChat(animate){
  const srv=activeServer&&db.servers[activeServer];
  if(activeServer&&!srv)activeServer=null;
  const c=srv?null:(active&&contact(active));
  const has=!!(srv||c);
  $('#chatEmpty').hidden=has;$('#chatMain').hidden=!has;
  closeEmoji();
  if(!has){active=null;return}
  renderHead();
  const ta=$('#ta');
  ta.disabled=!!(c&&c.official);
  $('.composer').classList.toggle('locked',!!(c&&c.official));
  ta.placeholder=srv?'Message #general':(c.official?'This is an official account. You can’t reply.':`Message @${c.username}`);ta.value='';grow();
  $('#sendBtn').innerHTML=I.send;
  seen=new Set();renderMsgs({initial:true});
  if(animate&&!reduce){const m=$('#chatMain');m.classList.remove('switching');void m.offsetWidth;m.classList.add('switching')}
}
function msgHTML(m,prev,isNew){
  const a=contact(m.from)||{id:m.from,display:'Deleted user',username:'deleted'},mine=m.from===me.id;
  const cont=prev&&prev.from===m.from&&m.ts-prev.ts<300000;
  return `<div class="msg${cont?' cont':''}${isNew?' enter':''}" data-id="${m.id}">${cont?`<span class="gt">${hm(m.ts)}</span>`:av(a,40)}<div class="mb">${cont?'':`<div class="mh"><span class="who">${esc(a.display)}</span>${tags(a)}<time class="when" datetime="${new Date(m.ts).toISOString()}">${hm(m.ts)}</time></div>`}<div class="txt">${fmt(m.text)}</div></div><div class="tools"><button type="button" data-act="copy">Copy</button>${mine?'<button type="button" data-act="del">Delete</button>':''}</div></div>`;
}
function renderMsgs(o={}){
  const box=$('#msgs'),srv=activeServer&&db.servers[activeServer],c=srv?null:contact(active);if(!srv&&!c)return;
  const st=store(),msgs=st?st.msgs:[];
  const near=box.scrollHeight-box.scrollTop-box.clientHeight<140;
  const fresh=o.initial?' fresh':'';
  let intro;
  if(srv)intro=`<div class="intro${fresh}"><div class="hash big" aria-hidden="true">#</div><h3>Welcome to #general</h3><p>This is the start of the <b>#general</b> channel in <b>${esc(srv.name)}</b>. Share the invite code <b>${esc(srv.code)}</b> to bring people in.</p></div>`;
  else if(c.official)intro=`<div class="intro${fresh}"><div class="intro-row">${av(c,56,'online')}<h3>${esc(c.display)}${TAG}</h3></div><p>Official messages from the TuSo team land here. You can’t reply to this account.</p></div>`;
  else intro=`<div class="intro${fresh}">${pcard(c,{state:presence(c)})}<p>This is the beginning of your direct message history with <b>@${esc(c.username)}</b>.</p></div>`;
  let h=intro,prev=null,day=null;
  for(const m of msgs){
    if(day===null||!sameDay(day,m.ts)){h+=`<div class="day"><span>${esc(dayLabel(m.ts))}</span></div>`;day=m.ts;prev=null}
    h+=msgHTML(m,prev,!o.initial&&!seen.has(m.id));prev=m;
  }
  box.innerHTML=h;
  seen=new Set(msgs.map(m=>m.id));
  if(o.initial)box.scrollTop=box.scrollHeight;
  else if(o.stick||near)box.scrollTo({top:box.scrollHeight,behavior:reduce?'auto':'smooth'});
}
$('#msgs').addEventListener('click',async e=>{
  const row=e.target.closest('.msg');if(!row)return;
  const btn=e.target.closest('[data-act]');
  if(!btn){if(!e.target.closest('a')){$$('.msg.tap').forEach(r=>{if(r!==row)r.classList.remove('tap')});row.classList.toggle('tap')}return}
  const d=store();if(!d)return;
  const m=d.msgs.find(x=>x.id===row.dataset.id);if(!m)return;
  if(btn.dataset.act==='copy'){
    try{await navigator.clipboard.writeText(m.text);toast('Copied.')}catch(err){toast('Copying is not available here.')}
  }else if(btn.dataset.act==='del'&&m.from===me.id){
    row.style.transition='opacity .25s,transform .3s';row.style.opacity='0';row.style.transform='translateX(14px)';
    await wait(reduce?0:260);
    d.msgs=d.msgs.filter(x=>x.id!==m.id);save();renderMsgs({});renderList();toast('Message deleted.');
  }
});

/* ---------- composer ---------- */
const ta=$('#ta');
function grow(){
  ta.style.height='auto';ta.style.height=Math.min(ta.scrollHeight,160)+'px';
  const n=ta.value.length,over=n>2000;
  $('#sendBtn').disabled=!ta.value.trim()||over||ta.disabled;
  $('#emojiBtn').disabled=ta.disabled;
  const cnt=$('#cnt');cnt.textContent=n>1600?`${n} / 2000`:'';cnt.classList.toggle('over',over);
}
ta.addEventListener('input',grow);
ta.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.isComposing){e.preventDefault();send()}});
$('#sendBtn').addEventListener('click',send);
function send(){
  const v=ta.value.trim();
  if(!v||v.length>2000||(!active&&!activeServer)||ta.disabled)return;
  const d=activeServer?db.servers[activeServer]:getDm(active,true);if(!d)return;
  const l=lastOf(d),ts=Math.max(Date.now(),(l?l.ts:0)+1);
  d.msgs.push({id:uid(),from:me.id,ts,text:v});
  if(d.msgs.length>500)d.msgs.splice(0,d.msgs.length-500);
  if(!activeServer){d.read[me.id]=ts;d.open[me.id]=ts}
  save();ta.value='';grow();closeEmoji();renderMsgs({stick:true});if(!activeServer)renderList();
}

/* ---------- settings ---------- */
const S=$('#settings');
function openSettings(t){
  initDraft();S.inert=false;S.classList.add('open');tab(t||'account');
  setTimeout(()=>{const b=$('.snav button');if(b)b.focus({preventScroll:true})},80);
}
function closeSettings(silent){
  if(!S.classList.contains('open'))return;
  S.classList.remove('open');S.inert=true;
  if(!silent&&$('#openSettings'))$('#openSettings').focus();
}
function tab(name){
  if(name==='admin'&&!isStaff(me))name='account';
  $$('.snav button[data-tab]').forEach(b=>b.setAttribute('aria-current',b.dataset.tab===name?'page':'false'));
  $$('.spanel').forEach(p=>p.hidden=p.id!=='p-'+name);
  if(name==='account')initAccount();
  if(name==='profile')syncProfile();
  if(name==='appearance'||name==='notify')syncPrefUI();
  if(name==='admin')renderAdmin();
  if(name==='new'){renderNews();UD().seenNew=NEWS_VER;save();syncNewDot()}
  $('#scontent').scrollTop=0;
}
$$('.snav button[data-tab]').forEach(b=>b.onclick=()=>tab(b.dataset.tab));
$('#sClose').innerHTML=I.x;
$('#sClose').onclick=()=>closeSettings();
$('#logoutBtn').onclick=async()=>{
  if(await ask({title:'Log out of TuSo?',body:'Your conversations stay saved in this browser. You can log back in any time.',ok:'Log out'}))leave();
};
document.addEventListener('keydown',e=>{
  if(e.key==='Escape'){
    if($('#modal').classList.contains('open'))return;
    if($('#lbM').classList.contains('open')){$('#lbM').classList.remove('open');return}
    if($('#bugM').classList.contains('open')){closeBug();return}
    if($('#delM').classList.contains('open')){closeDel();return}
    if($('#srvM').classList.contains('open')){closeSrvM();return}
    if($('#qs').classList.contains('open')){closeQS();return}
    if($('#emojiPop').classList.contains('open')){closeEmoji();return}
    if(me&&S.classList.contains('open'))closeSettings();
  }
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'&&me){
    e.preventDefault();
    if($('#qs').classList.contains('open')){closeQS();return}
    closeSettings(true);openQS();
  }
});

/* account */
function initAccount(){
  $('#acctTop').innerHTML=`${av(me,72,me.status||'online')}<div class="nm"><b>${esc(me.display)}${tags(me)}</b><span>@${esc(me.username)} · ${esc(me.email)}</span></div>`;
  $('#acUser').value=me.username;$('#acEmail').value=me.email;
  clearErrs($('#fAccount'));clearErrs($('#fPass'));
}
$('#fAccount').addEventListener('submit',e=>{
  e.preventDefault();clearErrs(e.target);db=load();me=db.users.find(u=>u.id===me.id)||me;
  const uEl=$('#acUser'),mEl=$('#acEmail');
  const un=uEl.value.trim().toLowerCase().replace(/^@/,''),em=mEl.value.trim().toLowerCase();
  let ok=true;
  if(!reUser.test(un)){setErr(uEl,'Use 2 to 24 letters, numbers, dots or underscores.');ok=false}
  else if(un==='tuso'||db.users.some(x=>x.id!==me.id&&x.username===un)){setErr(uEl,'That username is taken.');ok=false}
  if(!reEmail.test(em)){setErr(mEl,'Enter a valid email address.');ok=false}
  else if(db.users.some(x=>x.id!==me.id&&x.email===em)){setErr(mEl,'Another account already uses this email.');ok=false}
  if(!ok)return;
  if(me.id===PROTECTED&&un!==me.username){setErr(uEl,'The default admin username can’t be changed.');return}
  me.username=un;me.email=em;save();
  renderMe();initAccount();toast('Account updated.');
});
$('#fPass').addEventListener('submit',async e=>{
  e.preventDefault();clearErrs(e.target);
  const c=$('#pwCur'),n=$('#pwNew'),n2=$('#pwNew2');let ok=true;
  if(!c.value){setErr(c,'Enter your current password.');ok=false}
  if(n.value.length<8){setErr(n,'Use at least 8 characters.');ok=false}
  if(n2.value!==n.value){setErr(n2,'The passwords do not match.');ok=false}
  if(!ok)return;
  if(!await checkPw(me,c.value)){setErr(c,'That is not your current password.');return}
  me.salt=rand();me.hash=await hashPw(n.value,me.salt);me.kdf='pbkdf2';save();
  e.target.reset();toast('Password updated.');
});

/* profile */
let draft=null;
const savedProfile=()=>({display:me.display,bio:me.bio||'',avatar:me.avatar||null,banner:me.banner||0,bannerImg:me.bannerImg||null,status:me.status||'online'});
const isDirty=()=>{const s=savedProfile();return Object.keys(s).some(k=>s[k]!==draft[k])};
function initDraft(){
  draft=savedProfile();
  $('#prName').value=draft.display;$('#prBio').value=draft.bio;$('#prErr').textContent='';$('#bnErr').textContent='';
  setErr($('#prName'),'');
}
$('#prBanner').innerHTML=BANNERS.map((b,i)=>`<button type="button" class="sw" role="radio" data-i="${i}" aria-checked="false" aria-label="${b.n}" title="${b.n}" style="background:${b.css}"></button>`).join('');
function syncProfile(){
  if(!draft)return;
  $$('#prStatus .chip').forEach(b=>b.setAttribute('aria-checked',b.dataset.v===draft.status));
  $$('#prBanner .sw').forEach(b=>b.setAttribute('aria-checked',!draft.bannerImg&&+b.dataset.i===draft.banner));
  $('#prCount').textContent=`${draft.bio.length} / 190`;
  $('#prRm').disabled=!draft.avatar;
  $('#bnRm').disabled=!draft.bannerImg;
  const name=draft.display.trim()||me.display;
  $('#prAvThumb').innerHTML=av({...me,display:name,avatar:draft.avatar},72);
  $('#prPreview').innerHTML=pcard(me,{display:name,bio:draft.bio.trim(),avatar:draft.avatar,banner:draft.banner,bannerImg:draft.bannerImg,state:draft.status});
  $('#saveBar').classList.toggle('show',isDirty());
}
$('#prName').addEventListener('input',e=>{draft.display=e.target.value;setErr(e.target,'');syncProfile()});
$('#prBio').addEventListener('input',e=>{draft.bio=e.target.value;syncProfile()});
$('#prStatus').addEventListener('click',e=>{const b=e.target.closest('.chip');if(!b)return;draft.status=b.dataset.v;syncProfile()});
$('#prBanner').addEventListener('click',e=>{const b=e.target.closest('.sw');if(!b)return;draft.banner=+b.dataset.i;draft.bannerImg=null;syncProfile()});
$('#prUp').onclick=()=>$('#prFile').click();
$('#prRm').onclick=()=>{draft.avatar=null;syncProfile()};
$('#bnUp').onclick=()=>$('#bnFile').click();
$('#bnRm').onclick=()=>{draft.bannerImg=null;syncProfile()};
$('#bnFile').addEventListener('change',async e=>{
  const f=e.target.files[0];e.target.value='';if(!f)return;
  $('#bnErr').textContent='';
  if(f.size>8*1024*1024){$('#bnErr').textContent='Choose an image under 8 MB.';return}
  try{draft.bannerImg=await fileToImage(f,680,180,.8);syncProfile()}catch(err){$('#bnErr').textContent=err.message}
});
$('#prFile').addEventListener('change',async e=>{
  const f=e.target.files[0];e.target.value='';if(!f)return;
  $('#prErr').textContent='';
  if(f.size>8*1024*1024){$('#prErr').textContent='Choose an image under 8 MB.';return}
  try{draft.avatar=await fileToImage(f,160,160,.85);syncProfile()}catch(err){$('#prErr').textContent=err.message}
});
function fileToImage(file,W,H,q){
  return new Promise((res,rej)=>{
    if(!/^image\//.test(file.type))return rej(new Error('Choose an image file.'));
    const fr=new FileReader();
    fr.onerror=()=>rej(new Error('That file could not be read.'));
    fr.onload=()=>{
      const im=new Image();
      im.onerror=()=>rej(new Error('That image could not be opened.'));
      im.onload=()=>{
        const c=document.createElement('canvas');c.width=W;c.height=H;
        const sc=Math.max(W/im.width,H/im.height),sw=W/sc,sh=H/sc;
        c.getContext('2d').drawImage(im,(im.width-sw)/2,(im.height-sh)/2,sw,sh,0,0,W,H);
        res(c.toDataURL('image/jpeg',q));
      };
      im.src=fr.result;
    };
    fr.readAsDataURL(file);
  });
}
$('#prReset').onclick=()=>{initDraft();syncProfile()};
$('#prSave').onclick=()=>{
  const name=draft.display.trim();
  if(!name){setErr($('#prName'),'Display name can’t be empty.');$('#prName').focus();return}
  db=load();me=db.users.find(u=>u.id===me.id)||me;
  me.display=name;me.bio=draft.bio.trim();me.avatar=draft.avatar;me.banner=draft.banner;me.bannerImg=draft.bannerImg;me.status=draft.status;me.seen=Date.now();save();
  draft=savedProfile();$('#prName').value=draft.display;
  renderMe();renderList();if(active)renderMsgs({});syncProfile();toast('Profile saved.');
};

/* ---------- emoji ---------- */
const EMOJIS=Array.from('😀😃😄😁😆😅😂🤣😊😇🙂🙃😉😌😍🥰😘😋😛😜🤪🤨🧐🤓😎🥳😏😒😞😔😕🙁😣😫🥺😢😭😤😠😡🤯😳🥵🥶😱😨😰🤗🤔🤭🤫😶😐🙄😴👍👎👌🤞🤝👏🙌🙏💪👋🤙👊🤘🤟👀💙💚💛🧡💜🖤🤍💔💯🔥✨⭐🎉🎊🎁🎮🎧🎵🏆🚀💡💻📱📷🍕🍔🍟🍺☕🌙');
$('#emojiPop').innerHTML=EMOJIS.map(e=>`<button type="button" data-e="${e}" aria-label="${e}">${e}</button>`).join('');
function closeEmoji(){$('#emojiPop').classList.remove('open');$('#emojiBtn').setAttribute('aria-expanded','false')}
$('#emojiBtn').addEventListener('click',()=>{
  const pop=$('#emojiPop'),open=!pop.classList.contains('open');
  pop.classList.toggle('open',open);$('#emojiBtn').setAttribute('aria-expanded',String(open));
});
$('#emojiPop').addEventListener('click',e=>{
  const b=e.target.closest('button[data-e]');if(!b)return;
  const t=$('#ta');if(t.disabled)return;
  const a=t.selectionStart==null?t.value.length:t.selectionStart,z=t.selectionEnd==null?a:t.selectionEnd;
  const next=t.value.slice(0,a)+b.dataset.e+t.value.slice(z);
  if(next.length>2400)return;
  t.value=next;const pos=a+b.dataset.e.length;t.focus();t.setSelectionRange(pos,pos);grow();
});
document.addEventListener('click',e=>{if(!e.target.closest('#emojiPop,#emojiBtn'))closeEmoji()});

/* ---------- servers ---------- */
const ALPHA='ABCDEFGHJKMNPQRSTUVWXYZ23456789';
function refresh(){db=load();if(me)me=db.users.find(u=>u.id===me.id)||me}
function store(){return activeServer?(db.servers[activeServer]||null):(active?getDm(active,false):null)}
const mySrvs=()=>Object.values(db.servers).filter(s=>s.members.includes(me.id)).sort((a,b)=>a.created-b.created);
const joinedCount=()=>mySrvs().length;
function genCode(){
  let c;
  do{c='';for(let i=0;i<8;i++)c+=ALPHA[Math.floor(Math.random()*ALPHA.length)]}while(Object.values(db.servers).some(s=>s.code===c));
  return c;
}
function initials(n){const w=n.trim().split(/\s+/);return (w.length>1?Array.from(w[0])[0]+Array.from(w[1])[0]:Array.from(n.trim()).slice(0,2).join('')).toUpperCase()}
function renderRail(){
  const list=mySrvs();
  $('#rail').innerHTML=`<button class="rail-btn${activeServer?'':' active'}" id="railDm" type="button" aria-label="Direct messages" title="Direct messages"${activeServer?'':' aria-current="page"'}>Tu</button><hr>`
    +list.map(s=>`<button class="rail-btn srv${s.id===activeServer?' active':''}" type="button" data-sid="${s.id}" aria-label="${esc(s.name)}" title="${esc(s.name)}">${esc(initials(s.name))}</button>`).join('')
    +`<button class="rail-btn add" id="railAdd" type="button" aria-label="Add a server" title="Add a server (${list.length} / ${MAX_SERVERS})">+</button>`;
}
function showSide(){$('#dmSide').hidden=!!activeServer;$('#srvSide').hidden=!activeServer}
function renderServerSide(){
  const s=db.servers[activeServer];if(!s)return;
  const members=s.members.map(contact).filter(Boolean).sort((a,b)=>((presence(b)!=='offline')-(presence(a)!=='offline'))||a.display.localeCompare(b.display));
  $('#srvSide').innerHTML=`<div class="srv-head"><b>${esc(s.name)}</b><span>${s.members.length} member${s.members.length===1?'':'s'}</span></div>
  <div class="srv-scroll"><div class="side-label">Text channels</div><div class="chan"><span aria-hidden="true">#</span>general</div>
  <div class="side-label">Members · ${members.length}</div>
  <ul class="mems">${members.map(u=>`<li class="mem">${av(u,32,presence(u))}<span class="mn"><span>${esc(u.display)}</span>${tags(u)}${u.id===s.owner?'<span class="owner">Owner</span>':''}</span></li>`).join('')}</ul></div>
  <div class="srv-foot"><div class="invite"><div><span class="lbl">Invite code</span><code>${esc(s.code)}</code></div><button class="btn btn-ghost" id="copyInvite" type="button">Copy</button></div><button class="btn btn-danger" id="leaveSrv" type="button">Leave server</button></div>`;
  $('#copyInvite').onclick=async()=>{try{await navigator.clipboard.writeText(s.code);toast('Invite code copied.')}catch(err){toast('Copying isn’t available here. Select the code instead.')}};
  $('#leaveSrv').onclick=leaveServer;
}
function selectServer(id){
  const s=db.servers[id];if(!s||!s.members.includes(me.id))return;
  activeServer=id;active=null;
  renderRail();showSide();renderServerSide();renderChat(true);
  if(phone())$('#shell').classList.add('chat-open');
  else setTimeout(()=>$('#ta').focus(),60);
}
function showDms(){
  activeServer=null;
  const last=UD().last,d=last&&getDm(last,false);
  active=(d&&contact(last)&&dmVisible(d))?last:null;
  renderRail();showSide();renderList();renderChat(true);
  $('#shell').classList.remove('chat-open');
}
async function leaveServer(){
  const s=db.servers[activeServer];if(!s)return;
  if(!await ask({title:`Leave ${s.name}?`,body:'You can rejoin later with the invite code. Leaving frees up a spot toward your limit of 100 servers.',ok:'Leave server',danger:true}))return;
  refresh();
  const s2=db.servers[s.id];
  if(s2){
    s2.members=s2.members.filter(x=>x!==me.id);
    if(!s2.members.length)delete db.servers[s.id];else if(s2.owner===me.id)s2.owner=s2.members[0];
  }
  save();showDms();
  toast(`Left ${s.name}. ${joinedCount()} of ${MAX_SERVERS} spots used.`);
}
$('#rail').addEventListener('click',e=>{
  const b=e.target.closest('button');if(!b)return;
  if(b.id==='railDm'){if(activeServer)showDms()}
  else if(b.id==='railAdd')openSrvM('create');
  else if(b.dataset.sid)selectServer(b.dataset.sid);
});
let srvTab='create';
function syncSrvM(){
  const n=joinedCount(),full=n>=MAX_SERVERS;
  $('#srvCount').textContent=`${n} of ${MAX_SERVERS} servers joined`;
  $$('#srvTabs [role=radio]').forEach(b=>b.setAttribute('aria-checked',b.dataset.t===srvTab));
  $('#fSrvCreate').hidden=srvTab!=='create';$('#fSrvJoin').hidden=srvTab!=='join';
  $('#srvLimit').textContent=full?`You are in ${MAX_SERVERS} servers, the most allowed. Leave one to make room.`:'';
  $$('#srvM button[type=submit]').forEach(b=>b.disabled=full);
}
function openSrvM(tab){
  if(!me)return;
  srvTab=tab||'create';
  [$('#fSrvCreate'),$('#fSrvJoin')].forEach(f=>{f.reset();clearErrs(f)});
  syncSrvM();$('#srvM').classList.add('open');
  setTimeout(()=>$(srvTab==='create'?'#svName':'#svCode').focus(),60);
}
function closeSrvM(){$('#srvM').classList.remove('open')}
$('#srvM').addEventListener('click',e=>{if(e.target===e.currentTarget||e.target.closest('[data-close]'))closeSrvM()});
$('#srvTabs').addEventListener('click',e=>{
  const b=e.target.closest('[role=radio]');if(!b)return;
  srvTab=b.dataset.t;syncSrvM();setTimeout(()=>$(srvTab==='create'?'#svName':'#svCode').focus(),30);
});
$('#fSrvCreate').addEventListener('submit',e=>{
  e.preventDefault();clearErrs(e.target);refresh();
  const el=$('#svName'),name=el.value.trim().replace(/\s+/g,' ');
  if(joinedCount()>=MAX_SERVERS){syncSrvM();return}
  if(name.length<2||name.length>32){setErr(el,'Use 2 to 32 characters.');return}
  const s={id:uid(),name,owner:me.id,code:genCode(),members:[me.id],msgs:[],created:Date.now()};
  db.servers[s.id]=s;save();closeSrvM();selectServer(s.id);toast(`Created ${name}.`);
});
$('#fSrvJoin').addEventListener('submit',e=>{
  e.preventDefault();clearErrs(e.target);refresh();
  const el=$('#svCode'),code=el.value.trim().toUpperCase().replace(/[^A-Z0-9]/g,'');
  if(joinedCount()>=MAX_SERVERS){syncSrvM();return}
  if(!code){setErr(el,'Enter an invite code.');return}
  const s=Object.values(db.servers).find(x=>x.code===code);
  if(!s){setErr(el,'That invite code doesn’t match any server.');return}
  if(s.members.includes(me.id)){setErr(el,'You are already in this server.');return}
  s.members.push(me.id);save();closeSrvM();selectServer(s.id);
  toast(`Joined ${s.name}. ${joinedCount()} of ${MAX_SERVERS} spots used.`);
});

/* ---------- what's new ---------- */
const NEWS_VER='0.6';
const RELEASES=[
  {ver:'0.6',date:'Nov 21, 2026',title:'Safer bug triage and update messages',blurb:'Marking a bug fixed now asks first and can be undone. New releases are also posted to you by TuSo.',items:[
    ['New','Release messages','Every new update is posted to your TuSo conversation, so you never miss one.'],
    ['Improved','Fixed warning','Admins confirm before a report is marked fixed.'],
    ['Improved','Revert a fix','A fixed report can be reverted, which also removes the Bug hunter badge if it was the only one.']]},
  {ver:'0.5',date:'Nov 20, 2026',title:'Bug reports and a smoother phone',blurb:'Tell us what broke, and get a badge when it gets fixed. TuSo also feels lighter under your thumb.',items:[
    ['New','Bug reports','The bug button opens a form with a title, what went wrong, steps and up to 5 screenshots.'],
    ['New','Admin triage','Reports land in the Admin panel. Admins mark them Checking, Fixed or Not a bug, and you get a TuSo message.'],
    ['New','Bug hunter badge','Get a report fixed and the badge appears next to your name.'],
    ['Improved','Phone experience','Full-screen layout for iPhone and Android, bottom sheets, bigger touch targets, safe areas, no zoom on typing and slide transitions.'],
    ['Improved','Status dots','Online, Idle, Do not disturb and Invisible dots are larger and easier to read.']]},
  {ver:'0.4',date:'Nov 20, 2026',title:'Moderation, roles and a lighter TuSo',blurb:'Staff can now warn and ban, admins manage the team, and the whole site runs with far less weight.',items:[
    ['Security','Password hashing','Passwords are hashed with PBKDF2 and a unique salt. Older accounts upgrade the next time they log in.'],
    ['New','Warn and Ban','Staff can warn or ban members from the Admin panel. Warnings arrive as a notice and a TuSo message. Bans block sign-in.'],
    ['New','Admin and Staff roles','Admins add or remove Staff. Staff can warn and ban members, but not other staff.'],
    ['New','Badge tooltips','Hover any badge to see what it means.'],
    ['Improved','Lighter and faster','No blur effects, still film grain, fewer fonts and a gentler background redraw.'],
    ['Improved','Delete account','Moved under Log out. It asks for your password first.'],
    ['Improved','What’s new','Redesigned, with release notes you can expand.']]},
  {ver:'0.3',date:'Nov 20, 2026',title:'Servers, emoji and storage',blurb:'Group spaces, a bigger toolbox for messages, and a clear view of what TuSo keeps.',items:[
    ['New','Servers','Create one, join with an invite code and chat in #general. You can be in up to 100.'],
    ['New','Emoji picker','100 emoji, one click away from the message box.'],
    ['New','Profile banners','Pick a style or upload your own image.'],
    ['New','Storage page','A 10 MB meter with tools to clear messages and images.'],
    ['New','Admin panel and Staff badge','Manage accounts, servers and who is on staff.'],
    ['New','Bug report button','Next to Settings. It does nothing yet.']]},
  {ver:'0.2',date:'Nov 19, 2026',title:'Real conversations',blurb:'Direct messages between accounts, with a friendly official account.',items:[
    ['New','Live direct messages','Accounts in the same browser can talk, and updates appear across tabs.'],
    ['New','Official TuSo account','Sends the welcome message. It can’t be closed or replied to.'],
    ['Improved','Profile settings','Reorganised, with a live preview and an unsaved-changes bar.'],
    ['Improved','Motion','Smooth transitions across the whole site.']]},
  {ver:'0.1',date:'Nov 19, 2026',title:'First build',blurb:'The foundation.',items:[
    ['New','Login and sign up','Styled after Discord.'],
    ['New','Settings','Account, appearance and notifications.'],
    ['New','Animated background','Slow black, grey and white fog.']]}
];
const nitems=r=>r.items.map(([t,h,d])=>`<div class="nitem"><span class="ntag ${t[0].toLowerCase()}">${esc(t)}</span><div><b>${esc(h)}</b><span>${esc(d)}</span></div></div>`).join('');
function syncNewDot(){$('#newDot').hidden=!me||UD().seenNew===NEWS_VER}
function renderNews(){
  const [top,...rest]=RELEASES;
  $('#newsList').innerHTML=`<article class="hero"><div class="hero-top"><span class="ver">v${esc(top.ver)}</span><span class="latest">Latest</span><span class="rel-date">${esc(top.date)}</span></div><h3>${esc(top.title)}</h3><p>${esc(top.blurb)}</p><div class="nlist">${nitems(top)}</div></article><div class="news-h">Earlier releases</div>`
    +rest.map(r=>`<details class="reld"><summary><span class="ver o">v${esc(r.ver)}</span><b>${esc(r.title)}</b><span class="rel-date">${esc(r.date)}</span></summary><p>${esc(r.blurb)}</p><div class="nlist">${nitems(r)}</div></details>`).join('');
}

/* ---------- moderation helpers ---------- */
let noticeOpen=false;
function notice(title,body,ok){
  return new Promise(res=>{
    const m=$('#modal'),y=$('#mYes'),n=$('#mNo');
    $('#mTitle').textContent=title;$('#mBody').textContent=body;y.textContent=ok||'OK';y.className='btn btn-primary';n.hidden=true;
    m.classList.add('open');
    const done=()=>{m.classList.remove('open');n.hidden=false;y.onclick=null;m.onkeydown=null;res()};
    y.onclick=done;m.onkeydown=e=>{if(e.key==='Escape'){e.stopPropagation();done()}};
    setTimeout(()=>y.focus(),30);
  });
}
function enforceBan(){
  if(me&&me.ban){
    const r=me.ban.reason;leave();
    notice('Your account was banned',r?`Reason: ${r}`:'A staff member banned this account.');
    return true;
  }
  return false;
}
async function checkWarnings(){
  if(noticeOpen||!me)return;
  const w=(me.warnings||[]).find(x=>!x.ack);if(!w)return;
  noticeOpen=true;
  await notice('You received a warning',w.reason||'A staff member warned you about your behavior.','I understand');
  noticeOpen=false;
  if(!me)return;
  refresh();
  const w2=me&&(me.warnings||[]).find(x=>x.id===w.id);
  if(w2){w2.ack=true;save()}
  checkWarnings();
}
function tusoSay(userId,text){
  const k=dmKey(userId,'tuso');
  const d=db.dms[k]||(db.dms[k]={users:[userId,'tuso'],read:{},open:{},closed:{},msgs:[]});
  const l=lastOf(d);
  d.msgs.push({id:uid(),from:'tuso',ts:Math.max(Date.now(),(l?l.ts:0)+1),text});
}
function askReason({title,body,ok}){
  return new Promise(res=>{
    const m=$('#reasonM'),inp=$('#rsIn'),f=$('#fReason');
    $('#rsT').textContent=title;$('#rsB').textContent=body;$('#rsYes').textContent=ok;inp.value='';setErr(inp,'');
    m.classList.add('open');setTimeout(()=>inp.focus(),60);
    const done=v=>{m.classList.remove('open');f.onsubmit=null;$('#rsNo').onclick=null;m.onclick=null;m.onkeydown=null;res(v)};
    f.onsubmit=e=>{e.preventDefault();const r=inp.value.trim();if(r.length<3){setErr(inp,'Write a short reason, at least 3 characters.');return}done(r)};
    $('#rsNo').onclick=()=>done(null);
    m.onclick=e=>{if(e.target===m)done(null)};
    m.onkeydown=e=>{if(e.key==='Escape'){e.stopPropagation();done(null)}};
  });
}
const canManage=(actor,t)=>{
  if(!actor||!t||t.id===actor.id||t.id===PROTECTED||isAdmin(t))return false;
  return isAdmin(actor)||(isStaff(actor)&&!isStaff(t));
};
function removeUser(id){
  db.users=db.users.filter(u=>u.id!==id);delete db.data[id];
  for(const k of Object.keys(db.dms))if(db.dms[k].users.includes(id))delete db.dms[k];
  for(const sid of Object.keys(db.servers)){
    const sv=db.servers[sid];sv.members=sv.members.filter(x=>x!==id);
    if(!sv.members.length)delete db.servers[sid];else if(sv.owner===id)sv.owner=sv.members[0];
  }
}

/* ---------- bug reports ---------- */
const BUG_ST={open:'New',checking:'Checking',fixed:'Fixed',nobug:'Not a bug'};
let bugFilter='all';const openBugs=new Set();
const when=ts=>new Date(ts).toLocaleString([],{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'});
function renderBugs(){
  const A=isAdmin(me),all=[...db.bugs].sort((a,b)=>b.ts-a.ts);
  const cnt=k=>k==='all'?all.length:all.filter(b=>b.status===k).length;
  $('#bugF').innerHTML=[['all','All'],['open','New'],['checking','Checking'],['fixed','Fixed'],['nobug','Not a bug']].map(([k,l])=>`<button type="button" class="bf" data-bf="${k}" aria-pressed="${bugFilter===k}">${l}<span>${cnt(k)}</span></button>`).join('');
  const list=bugFilter==='all'?all:all.filter(b=>b.status===bugFilter);
  $('#adBugs').innerHTML=list.length?list.map(b=>{
    const u=db.users.find(x=>x.id===b.by);
    const shots=b.shots.map((x,i)=>`<button type="button" class="thumb" data-lb="${b.id}:${i}" aria-label="Open screenshot ${i+1}"><img src="${x}" alt="" loading="lazy"></button>`).join('');
    const sb=(st,l)=>`<button class="btn ${b.status===st?'btn-primary':'btn-ghost'}" type="button" data-act="bugst" data-id="${b.id}" data-st="${st}" aria-pressed="${b.status===st}">${l}</button>`;
    return `<li class="bug"><details data-bid="${b.id}"${openBugs.has(b.id)?' open':''}><summary><div class="ad-meta"><b>${esc(b.title)}</b><span>${u?esc(u.display)+' · @'+esc(u.username):'Deleted user'} · ${when(b.ts)}${b.shots.length?` · ${b.shots.length} photo${b.shots.length===1?'':'s'}`:''}</span></div><span class="bs ${b.status}">${BUG_ST[b.status]}</span></summary><div class="bug-body"><h4>What went wrong</h4><p>${esc(b.reason)}</p><h4>Steps</h4><p>${esc(b.steps)}</p>${shots?`<div class="thumbs">${shots}</div>`:''}${A?`<div class="actions">${sb('checking','Checking')}${sb('fixed','Fixed')}${sb('nobug','Not a bug')}${b.status==='fixed'?`<button class="btn btn-danger" type="button" data-act="bugst" data-id="${b.id}" data-st="revert">Revert fix</button>`:''}</div>`:'<p>Only admins can change the status.</p>'}</div></details></li>`;
  }).join(''):`<li class="none">${all.length?'No reports in this filter.':'No bug reports yet.'}</li>`;
}
$('#p-admin').addEventListener('click',e=>{
  const f=e.target.closest('[data-bf]');if(f){bugFilter=f.dataset.bf;renderBugs();return}
  const t=e.target.closest('[data-lb]');
  if(t){const [id,i]=t.dataset.lb.split(':'),b=db.bugs.find(x=>x.id===id);if(b){$('#lbImg').src=b.shots[+i];$('#lbM').classList.add('open')}}
});
$('#adBugs').addEventListener('toggle',e=>{const d=e.target;if(d.dataset&&d.dataset.bid){d.open?openBugs.add(d.dataset.bid):openBugs.delete(d.dataset.bid)}},true);
$('#lbM').addEventListener('click',()=>$('#lbM').classList.remove('open'));

/* ---------- send a bug report ---------- */
let bugShots=[];
const closeBug=()=>$('#bugM').classList.remove('open');
function drawShots(){
  $('#bgShots').innerHTML=bugShots.map((x,i)=>`<div class="shot"><img src="${x}" alt="Screenshot ${i+1}"><button type="button" data-rm="${i}" aria-label="Remove screenshot ${i+1}">×</button></div>`).join('')+(bugShots.length<5?'<button type="button" class="shot-add" id="bgAdd" aria-label="Add screenshots">+</button>':'');
  $('#bgCount').textContent=bugShots.length+' / 5';
}
function openBug(){
  refresh();bugShots=[];$('#fBug').reset();
  for(const k of ['#bgTitle','#bgReason','#bgSteps'])setErr($(k),'');
  $('#bgPhotoErr').textContent='';drawShots();
  $('#bugM').classList.add('open');
  if(!phone())setTimeout(()=>$('#bgTitle').focus(),60);
}
function fileToShot(file,max,q){
  return new Promise((res,rej)=>{
    if(!/^image\//.test(file.type))return rej(new Error('Only image files can be attached.'));
    const url=URL.createObjectURL(file),im=new Image();
    im.onerror=()=>{URL.revokeObjectURL(url);rej(new Error('One image could not be opened.'))};
    im.onload=()=>{
      URL.revokeObjectURL(url);
      const sc=Math.min(1,max/Math.max(im.width,im.height)),c=document.createElement('canvas');
      c.width=Math.round(im.width*sc);c.height=Math.round(im.height*sc);
      const g=c.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,c.width,c.height);g.drawImage(im,0,0,c.width,c.height);
      res(c.toDataURL('image/jpeg',q));
    };
    im.src=url;
  });
}
$('#bgShots').addEventListener('click',e=>{
  if(e.target.closest('#bgAdd')){$('#bgFile').click();return}
  const r=e.target.closest('[data-rm]');if(r){bugShots.splice(+r.dataset.rm,1);$('#bgPhotoErr').textContent='';drawShots()}
});
$('#bgFile').addEventListener('change',async e=>{
  const fs=[...e.target.files];e.target.value='';
  const err=$('#bgPhotoErr');err.textContent='';
  const room=5-bugShots.length;
  if(fs.length>room)err.textContent='You can attach up to 5 screenshots. The extra ones were skipped.';
  for(const f of fs.slice(0,room)){
    if(f.size>15*1024*1024){err.textContent='Each screenshot must be under 15 MB.';continue}
    try{bugShots.push(await fileToShot(f,720,.7))}catch(x){err.textContent=x.message}
  }
  drawShots();
});
$('#bgNo').onclick=closeBug;
for(const k of ['#bgTitle','#bgReason','#bgSteps'])$(k).addEventListener('input',()=>setErr($(k),''));
$('#fBug').addEventListener('submit',e=>{
  e.preventDefault();
  const t=$('#bgTitle'),r=$('#bgReason'),st=$('#bgSteps');
  for(const k of [t,r,st])setErr(k,'');
  let bad=null;
  if(t.value.trim().length<3){setErr(t,'Add a short title.');bad=bad||t}
  if(r.value.trim().length<10){setErr(r,'Describe what went wrong, at least 10 characters.');bad=bad||r}
  if(st.value.trim().length<5){setErr(st,'List the steps so we can repeat it.');bad=bad||st}
  if(bad){bad.focus();return}
  refresh();
  if(db.bugs.filter(b=>b.by===me.id&&Date.now()-b.ts<36e5).length>=5){toast('You have sent 5 reports in the last hour. Try again later.');return}
  const title=t.value.trim();
  db.bugs.push({id:uid(),by:me.id,ts:Date.now(),title,reason:r.value.trim(),steps:st.value.trim(),shots:bugShots.slice(),status:'open'});
  tusoSay(me.id,`Thanks for reporting “${title}”. Staff will take a look, and you will hear back here.`);
  save();closeBug();renderList();toast('Report sent. Thank you!');
});

/* ---------- admin panel ---------- */
function renderAdmin(){
  if(!isStaff(me))return;
  const A=isAdmin(me),users=[...db.users].sort((a,b)=>a.created-b.created),srvs=Object.values(db.servers).sort((a,b)=>a.created-b.created);
  const msgs=Object.values(db.dms).reduce((n,d)=>n+d.msgs.length,0)+srvs.reduce((n,s)=>n+s.msgs.length,0);
  $('#adStats').innerHTML=[['Accounts',users.length],['Staff',users.filter(isStaff).length],['Banned',users.filter(u=>u.ban).length],['Servers',srvs.length],['Messages',msgs],['New reports',db.bugs.filter(b=>b.status==='open').length]].map(([l,n])=>`<div class="stat"><b>${n}</b><span>${l}</span></div>`).join('');
  $('#adUsers').innerHTML=users.map(u=>{
    const w=(u.warnings||[]).length,m=canManage(me,u),acts=[];
    const btn=(act,label,cls)=>`<button class="btn ${cls||'btn-ghost'}" type="button" data-act="${act}" data-id="${u.id}">${label}</button>`;
    if(A&&!isAdmin(u)&&u.id!==me.id)acts.push(btn('staff',u.role==='staff'?'Remove staff':'Make staff'));
    if(m&&!u.ban)acts.push(btn('warn','Warn'));
    if(m)acts.push(u.ban?btn('unban','Unban'):btn('ban','Ban','btn-danger'));
    if(A&&m)acts.push(btn('deluser','Delete','btn-danger'));
    if(u.id===PROTECTED)acts.push('<span class="owner">Protected</span>');
    const meta=`@${esc(u.username)} · ${esc(u.email)} · joined ${new Date(u.created).toLocaleDateString()}${w?` · ${w} warning${w===1?'':'s'}`:''}${u.ban?` · <span class="ad-flag">banned${u.ban.reason?': '+esc(u.ban.reason):''}</span>`:''}`;
    return `<li>${av(u,36,presence(u))}<div class="ad-meta"><b>${esc(u.display)}${tags(u)}</b><span>${meta}</span></div><div class="actions">${acts.join('')}</div></li>`;
  }).join('');
  $('#adSrvs').innerHTML=srvs.length?srvs.map(s=>{const o=contact(s.owner);return `<li><span class="hash" aria-hidden="true">#</span><div class="ad-meta"><b>${esc(s.name)}</b><span>${s.members.length} member${s.members.length===1?'':'s'} · owner ${o?esc(o.display):'unknown'} · code ${esc(s.code)}</span></div><div class="actions">${A?`<button class="btn btn-danger" type="button" data-act="delsrv" data-id="${s.id}">Delete</button>`:''}</div></li>`}).join(''):'<li class="none">No servers yet.</li>';
  renderBugs();
}
$('#p-admin').addEventListener('click',async e=>{
  const b=e.target.closest('button[data-act]');if(!b)return;
  refresh();if(!isStaff(me)){toast('Staff only.');return}
  const id=b.dataset.id,act=b.dataset.act,u=db.users.find(x=>x.id===id);
  if(act==='delsrv'){
    const sv=db.servers[id];if(!sv||!isAdmin(me))return;
    if(!await ask({title:`Delete ${sv.name}?`,body:'The server and its messages are removed for everyone.',ok:'Delete server',danger:true}))return;
    refresh();delete db.servers[id];save();
    if(activeServer===id)showDms();else renderRail();
    renderAdmin();toast('Server deleted.');return;
  }
  if(act==='bugst'){
    if(!isAdmin(me)){toast('Only admins can change a report’s status.');return}
    let rp=db.bugs.find(x=>x.id===id),st=b.dataset.st;
    if(!rp)return;
    const revert=st==='revert';
    if(revert)st=(rp.prev&&rp.prev!=='fixed'&&BUG_ST[rp.prev])?rp.prev:'open';
    if(!BUG_ST[st]||rp.status===st)return;
    const reporter=db.users.find(x=>x.id===rp.by);
    if(st==='fixed'&&!await ask({title:'Mark this bug as fixed?',body:`${reporter?reporter.display:'The reporter'} gets the Bug hunter badge and a TuSo message. You can revert this afterwards.`,ok:'Mark as fixed'}))return;
    if(revert&&!await ask({title:'Revert this fix?',body:'The report goes back to '+BUG_ST[st].toLowerCase()+'. The Bug hunter badge is removed unless they have another fixed report.',ok:'Revert',danger:true}))return;
    refresh();if(!isAdmin(me))return;
    rp=db.bugs.find(x=>x.id===id);if(!rp||rp.status===st)return;
    if(st==='fixed')rp.prev=rp.status;
    rp.status=st;rp.upd=Date.now();rp.handler=me.id;
    const who=db.users.find(x=>x.id===rp.by);
    if(who){
      const had=!!who.hunter;
      if(db.bugs.some(x=>x.by===who.id&&x.status==='fixed'))who.hunter=true;else delete who.hunter;
      let msg;
      if(revert)msg=`Your bug report “${rp.title}” is no longer marked fixed.${had&&!who.hunter?' The Bug hunter badge was removed.':''}`;
      else msg={checking:`Staff are checking your bug report “${rp.title}”.`,nobug:`Staff reviewed your report “${rp.title}” and marked it as not a bug.`,fixed:`Your bug report “${rp.title}” was fixed. Thank you!${!had&&who.hunter?' You earned the Bug hunter badge.':''}`}[st];
      if(msg)tusoSay(who.id,msg);
    }
    save();renderAdmin();toast(revert?`Reverted to ${BUG_ST[st].toLowerCase()}.`:`Marked as ${BUG_ST[st].toLowerCase()}.`);return;
  }
  if(!u)return;
  if(act==='staff'){
    if(!isAdmin(me)||isAdmin(u)||u.id===me.id)return;
    if(u.role==='staff')delete u.role;else u.role='staff';
    save();renderAdmin();toast(u.role?`${u.display} is now staff.`:`${u.display} is no longer staff.`);
  }else if(act==='warn'||act==='ban'){
    if(!canManage(me,u))return;
    const warn=act==='warn';
    const r=await askReason(warn?{title:`Warn ${u.display}?`,body:'They see this reason as a notice and in their TuSo messages.',ok:'Send warning'}:{title:`Ban ${u.display}?`,body:'They are signed out now and can’t log in until you unban them.',ok:'Ban account'});
    if(!r)return;
    refresh();const t=db.users.find(x=>x.id===id);if(!t||!canManage(me,t))return;
    if(warn){(t.warnings=t.warnings||[]).push({id:uid(),ts:Date.now(),by:me.id,reason:r,ack:false});tusoSay(id,`Warning from staff: ${r}`)}
    else t.ban={reason:r,ts:Date.now(),by:me.id};
    save();renderAdmin();toast(warn?`Warning sent to ${t.display}.`:`${t.display} is banned.`);
  }else if(act==='unban'){
    if(!canManage(me,u))return;
    delete u.ban;save();renderAdmin();toast(`${u.display} is unbanned.`);
  }else if(act==='deluser'){
    if(!isAdmin(me)||!canManage(me,u))return;
    if(!await ask({title:`Delete ${u.display}?`,body:'Their account, conversations and server memberships are removed for good.',ok:'Delete account',danger:true}))return;
    refresh();removeUser(id);save();renderList();renderRail();renderAdmin();toast('Account deleted.');
  }
});

/* ---------- delete my account ---------- */
const closeDel=()=>$('#delM').classList.remove('open');
$('#delBtn').onclick=()=>{
  if(me.id===PROTECTED){toast('The default admin account can’t be deleted.');return}
  $('#fDel').reset();setErr($('#delPw'),'');$('#delM').classList.add('open');setTimeout(()=>$('#delPw').focus(),60);
};
$('#delNo').onclick=closeDel;
$('#delM').addEventListener('click',e=>{if(e.target===e.currentTarget)closeDel()});
$('#fDel').addEventListener('submit',async e=>{
  e.preventDefault();const p=$('#delPw');setErr(p,'');
  if(!p.value){setErr(p,'Enter your password to confirm.');return}
  refresh();
  if(!await checkPw(me,p.value)){setErr(p,'That password is not right.');return}
  removeUser(me.id);save();closeDel();leave();toast('Account deleted.');
});

/* ---------- tooltips for badges ---------- */
const tipEl=$('#tip');let tipT=0;
function showTip(el,touch){
  tipEl.textContent=el.dataset.tip;tipEl.classList.add('show');
  const r=el.getBoundingClientRect(),w=tipEl.offsetWidth,h=tipEl.offsetHeight;
  let x=Math.max(8,Math.min(innerWidth-w-8,r.left+r.width/2-w/2)),y=r.top-h-8;if(y<8)y=r.bottom+8;
  tipEl.style.left=x+'px';tipEl.style.top=y+'px';
  clearTimeout(tipT);if(touch)tipT=setTimeout(()=>tipEl.classList.remove('show'),2200);
}
document.addEventListener('pointerover',e=>{const t=e.target.closest&&e.target.closest('[data-tip]');if(t)showTip(t,e.pointerType==='touch')});
document.addEventListener('pointerout',e=>{if(e.target.closest&&e.target.closest('[data-tip]'))tipEl.classList.remove('show')});

/* ---------- live sync between tabs ---------- */
addEventListener('storage',e=>{
  if(e.key!==KEY)return;
  const before=me?totalUnread():0;
  db=load();
  if(!me)return;
  const fresh=db.users.find(u=>u.id===me.id);
  if(!fresh){leave();return}
  me=fresh;
  if(enforceBan())return;
  if(activeServer&&!(db.servers[activeServer]&&db.servers[activeServer].members.includes(me.id))){showDms();toast('That server is no longer available.')}
  const d=active&&getDm(active,false);
  if(active&&(!d||!contact(active))){active=null;$('#shell').classList.remove('chat-open');renderChat(true)}
  else if(active&&!document.hidden&&d&&markRead(d))save();
  const after=totalUnread();
  if(after>before&&prefs().sound)blip();
  renderMe();renderRail();renderList();
  if(activeServer){renderServerSide();renderHead();renderMsgs({})}
  else if(active){renderHead();renderMsgs({})}
  applyPrefs();
  checkWarnings();
  if(isStaff(me)&&!$('#p-admin').hidden)renderAdmin();
});
document.addEventListener('visibilitychange',()=>{
  if(document.hidden)return;
  if(bg.mode!=='static'&&!bg.raf){bg.last=performance.now();bg.raf=requestAnimationFrame(bgLoop)}
  if(me){
    me.seen=Date.now();
    const d=active&&getDm(active,false);if(d)markRead(d);
    save();renderList();
  }
});
setInterval(()=>{
  if(!me)return;
  db=load();const f=db.users.find(u=>u.id===me.id);
  if(!f)return;
  me=f;if(enforceBan())return;me.seen=Date.now();save();checkWarnings();
  renderList();
  if(activeServer){renderServerSide();renderHead()}else if(active)renderHead();
},60000);

/* ---------- init ---------- */
$('#sendBtn').innerHTML=I.send;
bgSize();makeGrain();bgSet(reduce?'static':'animated');
const sid=SS.get()||db.session;
const sess=sid&&db.users.find(u=>u.id===sid);
if(sess&&!sess.ban){enter(sess)}else{db.session=null}
})();