(()=>{'use strict';
const KEY='dayflow_settings_v1';
const read=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'{}')}catch{return {}}};
const write=s=>{localStorage.setItem(KEY,JSON.stringify(s));window.dispatchEvent(new Event('dayflow-modified'))};
const pad=n=>String(n).padStart(2,'0');
const today=()=>{const d=new Date();return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=n=>new Intl.NumberFormat('nl-NL',{style:'currency',currency:'EUR'}).format(Number(n)||0);
const makeId=()=>window.crypto?.randomUUID?.()||('df'+Date.now().toString(36)+Math.random().toString(36).slice(2,7));
const dateLabel=s=>{if(!s)return '';const d=new Date(s+'T12:00:00');return isNaN(d)?s:d.toLocaleDateString('tr-TR',{day:'numeric',month:'short',year:'numeric'})};

function migrateOldData(){
 const s=read();let changed=false;
 if((!Array.isArray(s.finance?.expenses)||!s.finance.expenses.length)&&Array.isArray(s.suite?.expenses)&&s.suite.expenses.length){
  s.finance={...(s.finance||{}),expenses:s.suite.expenses.map(x=>({id:x.id||makeId(),title:String(x.title||'Harcama'),amount:Number(x.amount)||0,category:String(x.category||'Diğer'),date:String(x.date||today())})).filter(x=>x.amount>0)};
  changed=true;
 }
 if(!s.focus?.spotifyUrl&&s.suite?.spotifyUrl){s.focus={...(s.focus||{}),spotifyUrl:String(s.suite.spotifyUrl)};changed=true}
 if((!Array.isArray(s.focus?.history)||!s.focus.history.length)&&Array.isArray(s.suite?.sessions)&&s.suite.sessions.length){
  s.focus={...(s.focus||{}),history:s.suite.sessions.map(x=>({id:x.id||makeId(),date:x.date||today(),time:'',minutes:Number(x.minutes)||25,completedAt:''})).slice(0,100)};
  changed=true;
 }
 if(changed)write(s);
}

function financeData(){const s=read();const f=s.finance||{};return Array.isArray(f.expenses)?f.expenses:[]}
function saveFinance(expenses){const s=read();s.finance={...(s.finance||{}),expenses:expenses};write(s)}
function initExpenses(){
 const view=document.getElementById('expensesExtraView'),host=document.getElementById('expensesExtraGrid');
 if(!view||!host)return;
 const hero=view.querySelector('.v10-hero');
 if(hero){hero.querySelector('h2').textContent='Harcamalarım';hero.querySelector('p').textContent='Günlük harcamalarını kaydet ve aylık bütçeni takip et.'}
 host.innerHTML=
  '<div class="panel df-expense-wide"><div class="panel-head"><h2>Harcama özeti</h2><span class="info" id="dfExpenseMonth"></span></div><div class="stats df-expense-summary" id="dfExpenseSummary"></div></div>'+
  '<div class="panel"><h2>Yeni harcama ekle</h2><form id="dfExpenseForm" class="formgrid">'+
  '<label class="field full">Harcama adı<input name="title" maxlength="100" required placeholder="Örn. Market alışverişi"></label>'+
  '<label class="field">Tutar (€)<input name="amount" type="number" min="0.01" step="0.01" required placeholder="0,00"></label>'+
  '<label class="field">Kategori<select name="category"><option>Market</option><option>Ulaşım</option><option>Kira</option><option>Fatura</option><option>Eğitim</option><option>Sağlık</option><option>Eğlence</option><option>Restoran</option><option>Diğer</option></select></label>'+
  '<label class="field full">Tarih<input name="date" type="date" required value="'+today()+'"></label>'+
  '<div class="actions full"><button class="btn primary" type="submit">+ Harcama ekle</button></div></form></div>'+
  '<div class="panel"><div class="panel-head"><h2>Harcama geçmişi</h2><select id="dfExpenseFilter" aria-label="Harcama filtresi"><option value="month">Bu ay</option><option value="all">Tümü</option></select></div><div class="list" id="dfExpenseList"></div></div>'+
  '<div class="panel"><h2>Kategori dağılımı · Bu ay</h2><div class="list" id="dfExpenseCategories"></div></div>';
 const form=document.getElementById('dfExpenseForm');
 form.addEventListener('submit',e=>{
  e.preventDefault();const fd=new FormData(form),title=String(fd.get('title')||'').trim(),amount=Number(fd.get('amount')),category=String(fd.get('category')||'Diğer'),date=String(fd.get('date')||today());
  if(!title||!Number.isFinite(amount)||amount<=0)return;
  const items=financeData();items.unshift({id:makeId(),title,amount,category,date});saveFinance(items);form.reset();form.elements.date.value=today();
 });
 host.addEventListener('click',e=>{
  const b=e.target.closest('[data-expense-delete]');if(!b)return;
  saveFinance(financeData().filter(x=>x.id!==b.dataset.expenseDelete));
 });
 document.getElementById('dfExpenseFilter').addEventListener('change',renderExpenses);
 renderExpenses();
}
function renderExpenses(){
 const summary=document.getElementById('dfExpenseSummary');if(!summary)return;
 const all=financeData(),month=today().slice(0,7),current=all.filter(x=>String(x.date||'').slice(0,7)===month),sum=a=>a.reduce((n,x)=>n+(Number(x.amount)||0),0);
 document.getElementById('dfExpenseMonth').textContent=new Date().toLocaleDateString('tr-TR',{month:'long',year:'numeric'});
 summary.innerHTML='<article class="stat"><span>Bu ay</span><strong>'+money(sum(current))+'</strong></article><article class="stat"><span>Toplam</span><strong>'+money(sum(all))+'</strong></article><article class="stat"><span>Bu ay kayıt</span><strong>'+current.length+'</strong></article>';
 const filter=document.getElementById('dfExpenseFilter'),items=filter?.value==='all'?all:current,list=document.getElementById('dfExpenseList');
 if(list)list.innerHTML=items.length?items.slice().sort((a,b)=>String(b.date).localeCompare(String(a.date))).map(x=>'<div class="list-item"><div class="details"><b>'+esc(x.title)+'</b><small>'+esc(x.category)+' · '+esc(dateLabel(x.date))+'</small></div><strong>'+money(x.amount)+'</strong><button class="btn" type="button" data-expense-delete="'+esc(x.id)+'" aria-label="Harcamayı sil">Sil</button></div>').join(''):'<div class="empty">Henüz harcama eklenmedi.</div>';
 const cats={};current.forEach(x=>{const k=x.category||'Diğer';cats[k]=(cats[k]||0)+(Number(x.amount)||0)});
 const categoryHost=document.getElementById('dfExpenseCategories');
 if(categoryHost)categoryHost.innerHTML=Object.keys(cats).length?Object.entries(cats).sort((a,b)=>b[1]-a[1]).map(([k,v])=>'<div class="list-item"><div class="details"><b>'+esc(k)+'</b></div><strong>'+money(v)+'</strong></div>').join(''):'<div class="empty">Bu ay için kategori verisi yok.</div>';
}
function renderStats(){
 const host=document.getElementById('personalStats');if(!host)return;
 host.querySelectorAll('[data-df-extra-stat]').forEach(x=>x.remove());
 const s=read(),expenses=financeData(),month=today().slice(0,7),monthTotal=expenses.filter(x=>String(x.date||'').slice(0,7)===month).reduce((n,x)=>n+(Number(x.amount)||0),0),allTotal=expenses.reduce((n,x)=>n+(Number(x.amount)||0),0),history=Array.isArray(s.focus?.history)?s.focus.history:[];
 const focusMinutes=history.reduce((n,x)=>n+(Number(x.minutes)||0),0);
 const items=[['💶',money(monthTotal),'Bu ay harcama'],['🧾',money(allTotal),'Toplam harcama'],['⌛',focusMinutes+' dk','Kaydedilen odak süresi']];
 items.forEach(([icon,value,label])=>{const el=document.createElement('div');el.className='personal-stat';el.dataset.dfExtraStat='1';el.innerHTML='<span>'+icon+' '+label+'</span><strong>'+esc(value)+'</strong>';host.append(el)});
}
function focusData(){const s=read();return s.focus||{}}
function saveFocus(patch){const s=read();s.focus={...(s.focus||{}),...patch};write(s)}
function renderFocusHistory(){
 const host=document.getElementById('dfFocusHistory');if(!host)return;
 const history=focusData().history||[];
 host.innerHTML=history.length?history.slice(0,8).map(x=>'<div class="list-item"><div class="details"><b>'+esc(x.minutes||25)+' dakika odak</b><small>'+esc(dateLabel(x.date))+(x.time?' · '+esc(x.time):'')+'</small></div><span class="badge">Tamamlandı</span></div>').join(''):'<div class="empty">Henüz tamamlanmış odak seansı yok.</div>';
}
function initFocus(){
 const view=document.getElementById('focusView');if(!view||document.getElementById('dfFocusTools'))return;
 const panel=document.createElement('div');panel.id='dfFocusTools';panel.className='panel feature-panel';panel.innerHTML=
  '<div class="panel-head"><h2>Odak araçları</h2><span class="info">Kişisel ayarların</span></div>'+
  '<div class="formgrid"><label class="field full">Spotify playlist bağlantısı<input id="dfFocusSpotify" type="url" placeholder="https://open.spotify.com/playlist/..."></label>'+
  '<div class="actions full"><button class="btn" type="button" id="dfFocusSaveSpotify">Bağlantıyı kaydet</button><button class="btn primary" type="button" id="dfFocusOpenSpotify">Spotify\'ı aç</button><button class="btn" type="button" id="dfFocusNotify">Bildirimleri aç</button></div></div>'+
  '<div class="divider"></div><h2>Son odak seansların</h2><div class="list" id="dfFocusHistory"></div>';
 view.append(panel);
 const input=document.getElementById('dfFocusSpotify');input.value=focusData().spotifyUrl||'';
 document.getElementById('dfFocusSaveSpotify').addEventListener('click',()=>saveFocus({spotifyUrl:input.value.trim()}));
 document.getElementById('dfFocusOpenSpotify').addEventListener('click',()=>{
  const raw=input.value.trim();if(!raw){alert('Önce Spotify playlist bağlantısını ekle.');return}
  try{const u=new URL(raw);if(u.protocol!=='https:'||!['open.spotify.com','spotify.link'].includes(u.hostname)){alert('Geçerli bir Spotify bağlantısı gir.');return}window.open(u.href,'_blank','noopener,noreferrer')}catch{alert('Bağlantıyı kontrol et.')}
 });
 document.getElementById('dfFocusNotify').addEventListener('click',async()=>{
  if(!('Notification'in window)){alert('Tarayıcın bildirimleri desteklemiyor.');return}
  const p=await Notification.requestPermission();document.getElementById('dfFocusNotify').textContent=p==='granted'?'Bildirimler açık':p==='denied'?'Bildirim izni reddedildi':'Bildirim izni bekleniyor';
 });
 renderFocusHistory();
}
function recordFocus(e){
 const minutes=Number(e.detail?.minutes)||Number(document.getElementById('timerMinutes')?.value)||25,s=read(),f=s.focus||{},history=Array.isArray(f.history)?f.history.slice():[],d=new Date();
 history.unshift({id:makeId(),date:today(),time:pad(d.getHours())+':'+pad(d.getMinutes()),minutes:minutes,completedAt:d.toISOString()});
 s.focus={...f,history:history.slice(0,100)};write(s);renderFocusHistory();renderStats();
}
function refresh(){
 renderExpenses();renderStats();renderFocusHistory();
 const input=document.getElementById('dfFocusSpotify');if(input&&document.activeElement!==input)input.value=focusData().spotifyUrl||'';
}
function init(){
 migrateOldData();initExpenses();initFocus();renderExpenses();renderStats();renderFocusHistory();
 window.addEventListener('dayflow-modified',refresh);
 window.addEventListener('dayflow-remote-applied',()=>{migrateOldData();refresh()});
 window.addEventListener('dayflow-focus-complete',recordFocus);
 window.addEventListener('storage',e=>{if(e.key===KEY)refresh()});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();