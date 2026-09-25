/* ============================================================
   MYTRM prototype — single-page app with an in-browser mock API.
   The `api` object mirrors the REST endpoints a production
   backend would expose; data persists in this browser only.
   ============================================================ */
(function(){
"use strict";

/* ---------- utilities ---------- */
const $ = (s, r=document) => r.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const uid = p => p + "_" + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);
const wait = (ms=220) => new Promise(r => setTimeout(r, ms));
const inr = n => "₹" + Math.round(n).toLocaleString("en-IN");
const pad = n => String(n).padStart(2, "0");
const ymd = d => d.getFullYear() + "-" + pad(d.getMonth()+1) + "-" + pad(d.getDate());
const parseYmd = s => { const [y,m,d] = s.split("-").map(Number); return new Date(y, m-1, d); };
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate()+n); return x; };
const WD = ["sun","mon","tue","wed","thu","fri","sat"];
const WD_LABEL = {mon:"Mon",tue:"Tue",wed:"Wed",thu:"Thu",fri:"Fri",sat:"Sat",sun:"Sun"};
const MON = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const fmtDate = s => { const d = parseYmd(s); return WD_LABEL[WD[d.getDay()]] + ", " + d.getDate() + " " + MON[d.getMonth()] + " " + d.getFullYear(); };
const fmtTime = t => { const [h,m] = t.split(":").map(Number); return ((h+11)%12+1) + ":" + pad(m) + (h<12?" AM":" PM"); };
const fmtStamp = iso => { const d = new Date(iso); return d.getDate()+" "+MON[d.getMonth()]+", "+fmtTime(pad(d.getHours())+":"+pad(d.getMinutes())); };
const sessionTs = (date, time) => { const d = parseYmd(date); const [h,m] = time.split(":").map(Number); d.setHours(h, m, 0, 0); return d.getTime(); };
const hash = s => { let h = 5381; for (const c of s) h = ((h << 5) + h + c.charCodeAt(0)) | 0; return "h" + (h >>> 0).toString(16); };
const initials = n => n.replace(/^Dr\.?\s+/,"").split(/\s+/).map(w=>w[0]).slice(0,2).join("").toUpperCase();
const ENV = Object.assign({APP_ENV:"local", RAZORPAY_KEY_ID:"rzp_test_xxxxxxxx", PAYMENT_MODE:"simulated", GST_RATE:0.18, SUPPORT_EMAIL:"support@mytrm.in"}, window.MYTRM_ENV || {});
const GST = Number(ENV.GST_RATE) || 0.18;

/* ---------- persistence ---------- */
const KEY = "mytrm_db_v1", SKEY = "mytrm_session_v1";
const ls = {
  get(k){ try { return JSON.parse(localStorage.getItem(k)); } catch(e){ return null; } },
  set(k,v){ try { localStorage.setItem(k, JSON.stringify(v)); } catch(e){} },
  del(k){ try { localStorage.removeItem(k); } catch(e){} }
};

/* ---------- seed data (demo only) ---------- */
function seed(){
  const T = (h) => h.map(x => x.length === 2 ? x + ":00" : x);
  const wk = (days, hrs) => { const a = {}; for (const d of ["mon","tue","wed","thu","fri","sat","sun"]) a[d] = days.includes(d) ? T(hrs) : []; return a; };
  const therapists = [
    {id:"t_meera", name:"Dr. Meera Iyer", title:"Clinical Psychologist", quals:"PhD, M.Phil Clinical Psychology", exp:11, gender:"Female", city:"Bengaluru", langs:["English","Hindi","Tamil"], specialties:["Anxiety","Depression","Burnout"], modes:["Video","Audio"], fee:1800, rating:4.9, reviews:212, color:"#C4621A",
      bio:"I work with young adults who feel stuck between who they are and who they think they should be. Sessions are structured but never stiff.", approach:["CBT","ACT","Mindfulness"], availability:wk(["mon","tue","wed","thu","fri"],["10","11","12","16","17","18"]), blocked:[]},
    {id:"t_arjun", name:"Arjun Mehta", title:"Counselling Psychologist", quals:"MA Counselling Psychology", exp:6, gender:"Male", city:"Mumbai", langs:["English","Hindi","Gujarati"], specialties:["Relationships","Self-esteem","LGBTQIA+ affirmative"], modes:["Video","Chat"], fee:1200, rating:4.8, reviews:148, color:"#7A3E1D",
      bio:"Queer-affirmative and relationship-focused. We'll look at the patterns you keep repeating and practise new ones between sessions.", approach:["Person-centred","Emotionally Focused"], availability:wk(["mon","wed","thu","fri","sat"],["11","13","15","19","20"]), blocked:[]},
    {id:"t_sana", name:"Sana Qureshi", title:"Psychotherapist", quals:"M.Sc Psychology, CBT certified", exp:8, gender:"Female", city:"Delhi", langs:["English","Hindi","Urdu"], specialties:["Anxiety","Panic","OCD"], modes:["Video","Audio","In-person"], fee:1500, rating:4.9, reviews:176, color:"#9B4D16",
      bio:"If your mind races at 2 AM, we'll work on that first. I use practical CBT tools and plenty of homework you'll actually do.", approach:["CBT","ERP"], availability:wk(["tue","wed","thu","fri","sat"],["09","10","14","15","16"]), blocked:[]},
    {id:"t_rohan", name:"Dr. Rohan Das", title:"Clinical Psychologist · Trauma", quals:"PsyD, EMDR trained", exp:13, gender:"Male", city:"Kolkata", langs:["English","Bengali","Hindi"], specialties:["Trauma","Grief","Depression"], modes:["Video","In-person"], fee:2000, rating:4.8, reviews:131, color:"#5E2E14",
      bio:"Trauma work at a pace that feels safe. We build steadiness first, then gently process what's been weighing on you.", approach:["EMDR","Somatic","Trauma-informed CBT"], availability:wk(["mon","tue","thu","fri"],["10","12","17","18"]), blocked:[]},
    {id:"t_ishita", name:"Ishita Kapoor", title:"Counsellor · Workplace wellbeing", quals:"MA Applied Psychology", exp:4, gender:"Female", city:"Gurugram", langs:["English","Hindi"], specialties:["Burnout","Career","Stress"], modes:["Video","Audio","Chat"], fee:900, rating:4.7, reviews:94, color:"#D0752B",
      bio:"First job, toxic manager, or quarter-life career panic — I help you set boundaries and make decisions you can live with.", approach:["Solution-focused","CBT"], availability:wk(["mon","tue","wed","thu","fri","sat"],["08","19","20","21"]), blocked:[]},
    {id:"t_nikhil", name:"Nikhil Rao", title:"Counselling Psychologist", quals:"M.Phil Psychology", exp:7, gender:"Male", city:"Hyderabad", langs:["English","Telugu","Kannada"], specialties:["Grief","Men's mental health","Anger"], modes:["Video","Audio"], fee:1300, rating:4.8, reviews:88, color:"#86401A",
      bio:"A calm space for men and anyone who's been told to 'just deal with it'. No judgement, straight talk, real tools.", approach:["CBT","Narrative therapy"], availability:wk(["wed","thu","fri","sat","sun"],["10","11","17","18","19"]), blocked:[]},
    {id:"t_priya", name:"Priya Nair", title:"Family & Couples Therapist", quals:"MA Clinical Psychology", exp:9, gender:"Female", city:"Kochi", langs:["English","Malayalam","Hindi"], specialties:["Relationships","Family","Self-esteem"], modes:["Video","In-person"], fee:1600, rating:4.9, reviews:120, color:"#B0561A",
      bio:"Families and couples who keep having the same fight. I help you hear each other and change the script together.", approach:["Systemic","Gottman method"], availability:wk(["mon","tue","wed","sat"],["10","11","15","16"]), blocked:[]},
    {id:"t_kabir", name:"Kabir Singh", title:"Student Counsellor", quals:"M.Sc Counselling Psychology", exp:3, gender:"Male", city:"Chandigarh", langs:["English","Hindi","Punjabi"], specialties:["Exam stress","Stress","Self-esteem"], modes:["Video","Chat"], fee:800, rating:4.7, reviews:67, color:"#E07F2E",
      bio:"For students juggling exams, hostels, family expectations and figuring out who they are. Affordable, flexible, friendly.", approach:["CBT","Motivational interviewing"], availability:wk(["mon","tue","wed","thu","fri","sat","sun"],["16","17","20","21"]), blocked:[]}
  ];
  const now = new Date().toISOString();
  const users = [
    {id:"u_admin", name:"MYTRM Admin", email:"admin@mytrm.in", phone:"+91 90000 00001", pass:hash("admin123"), role:"admin", active:true, createdAt:now},
    {id:"u_aanya", name:"Aanya Sharma", email:"aanya@demo.in", phone:"+91 98765 43210", pass:hash("demo123"), role:"client", active:true, createdAt:now},
    {id:"u_rahul", name:"Rahul Verma", email:"rahul@demo.in", phone:"+91 98111 22334", pass:hash("demo123"), role:"client", active:true, createdAt:now},
    {id:"u_zoya", name:"Zoya Khan", email:"zoya@demo.in", phone:"+91 99887 66554", pass:hash("demo123"), role:"client", active:true, createdAt:now},
    {id:"u_meera", name:"Dr. Meera Iyer", email:"meera@mytrm.in", phone:"+91 90000 11111", pass:hash("therapist123"), role:"therapist", therapistId:"t_meera", active:true, createdAt:now}
  ];
  const db = {version:1, users, therapists, bookings:[], payments:[], assessments:[], inbox:[]};
  // past + upcoming demo bookings anchored to today
  const today = new Date(); today.setHours(0,0,0,0);
  const mk = (userId, tid, offset, time, mode, status) => {
    const t = therapists.find(x => x.id === tid);
    // shift to a day the therapist works
    let d = addDays(today, offset), guard = 0;
    while (!(t.availability[WD[d.getDay()]]||[]).includes(time) && guard++ < 14) d = addDays(d, offset < 0 ? -1 : 1);
    const fee = t.fee, gst = Math.round(fee*GST), total = fee + gst;
    const b = {id:uid("bk"), userId, therapistId:tid, date:ymd(d), time, mode, status, fee, gst, amount:total, notes:"", createdAt:addDays(d,-3).toISOString()};
    const p = {id:uid("pay"), orderId:uid("order"), bookingId:b.id, userId, amount:total, method: offset%2 ? "UPI" : "Card", status: status==="cancelled" ? "refunded" : "captured", createdAt:b.createdAt};
    b.paymentId = p.id;
    db.bookings.push(b); db.payments.push(p);
  };
  mk("u_aanya","t_meera",-12,"16:00","Video","completed");
  mk("u_aanya","t_meera",-5,"16:00","Video","completed");
  mk("u_aanya","t_meera",3,"16:00","Video","confirmed");
  mk("u_rahul","t_ishita",-7,"19:00","Chat","completed");
  mk("u_rahul","t_ishita",2,"20:00","Audio","confirmed");
  mk("u_zoya","t_arjun",-3,"15:00","Video","cancelled");
  mk("u_zoya","t_sana",4,"10:00","Video","confirmed");
  mk("u_rahul","t_meera",5,"11:00","Audio","confirmed");
  db.assessments.push({id:"as_aanya", userId:"u_aanya", createdAt:now, data:{age:"22–25", occupation:"Working professional", city:"Pune", concerns:["Anxiety","Burnout"], extra:"Work deadlines keep me up at night.", phq:[1,1,2,1], harm:"no", language:"English", mode:"Video", tgender:"No preference", budget:"₹1,000–₹2,000", prior:"No"}, phq4:5, band:"Mild", flag:false});
  db.inbox.push({id:uid("m"), userId:"u_aanya", subject:"Welcome to MYTRM", body:"Your safe space is ready. Take your check-in and book your first session whenever you feel ready.", createdAt:now, read:true});
  return db;
}

let DB = ls.get(KEY);
if (!DB || DB.version !== 1) { DB = seed(); ls.set(KEY, DB); }
const save = () => ls.set(KEY, DB);

/* ---------- mock backend API ---------- */
const byId = (col, id) => DB[col].find(x => x.id === id);
function notify(userId, subject, body){ DB.inbox.unshift({id:uid("m"), userId, subject, body, createdAt:new Date().toISOString(), read:false}); }
function therapistUser(tid){ return DB.users.find(u => u.therapistId === tid); }

function slotsFor(t, date){
  if ((t.blocked||[]).includes(date)) return [];
  const base = (t.availability[WD[parseYmd(date).getDay()]] || []).slice().sort();
  const taken = new Set(DB.bookings.filter(b => b.therapistId === t.id && b.date === date && b.status !== "cancelled").map(b => b.time));
  const cutoff = Date.now() + 2*3600e3;
  return base.map(time => ({time, free: !taken.has(time) && sessionTs(date, time) > cutoff}));
}

const api = {
  async register({name, email, phone, password}){
    await wait();
    email = email.trim().toLowerCase();
    if (!name.trim() || !email || password.length < 6) throw new Error("Fill in your name, a valid email and a password of at least 6 characters.");
    if (DB.users.some(u => u.email === email)) throw new Error("An account with this email already exists. Log in instead.");
    const u = {id:uid("u"), name:name.trim(), email, phone:phone.trim(), pass:hash(password), role:"client", active:true, createdAt:new Date().toISOString()};
    DB.users.push(u);
    notify(u.id, "Welcome to MYTRM", "Your safe space is ready. Take the 3-minute check-in so we can suggest therapists who fit you.");
    save(); return u;
  },
  async login(email, password){
    await wait();
    const u = DB.users.find(x => x.email === email.trim().toLowerCase());
    if (!u || u.pass !== hash(password)) throw new Error("That email and password don't match. Check them and try again.");
    if (!u.active) throw new Error("This account has been disabled. Contact " + ENV.SUPPORT_EMAIL + ".");
    return u;
  },
  async saveAssessment(userId, data){
    await wait();
    const phq4 = data.phq.reduce((a,b) => a + b, 0);
    const band = phq4 <= 2 ? "Minimal" : phq4 <= 5 ? "Mild" : phq4 <= 8 ? "Moderate" : "Severe";
    const a = {id:uid("as"), userId, data, phq4, band, flag: data.harm === "yes" || phq4 >= 9, createdAt:new Date().toISOString()};
    DB.assessments = DB.assessments.filter(x => x.userId !== userId);
    DB.assessments.push(a); save(); return a;
  },
  async createOrder({userId, therapistId, date, time, mode, notes}){
    await wait();
    const t = byId("therapists", therapistId);
    const slot = slotsFor(t, date).find(s => s.time === time);
    if (!slot || !slot.free) throw new Error("That slot was just taken. Pick another time.");
    const fee = t.fee, gst = Math.round(fee*GST);
    const b = {id:uid("bk"), userId, therapistId, date, time, mode, status:"pending_payment", fee, gst, amount:fee+gst, notes:notes||"", createdAt:new Date().toISOString()};
    const p = {id:uid("pay"), orderId:uid("order"), bookingId:b.id, userId, amount:b.amount, method:"", status:"created", createdAt:b.createdAt};
    b.paymentId = p.id;
    DB.bookings.push(b); DB.payments.push(p); save();
    return {booking:b, payment:p};
  },
  async capturePayment(paymentId, method, succeed){
    await wait(1400);
    const p = byId("payments", paymentId), b = byId("bookings", p.bookingId), t = byId("therapists", b.therapistId), u = byId("users", b.userId);
    p.method = method;
    if (!succeed) {
      p.status = "failed"; p.failedAt = new Date().toISOString(); save();
      throw new Error("Payment declined by the bank (test mode). No money was taken. Try again or use another method.");
    }
    p.status = "captured"; p.gatewayPaymentId = uid("pay_rzp").replace("pay_rzp_","pay_"); p.signatureVerified = true; p.capturedAt = new Date().toISOString();
    b.status = "confirmed";
    notify(u.id, "Booking confirmed · " + fmtDate(b.date), `Your ${b.mode.toLowerCase()} session with ${t.name} is confirmed for ${fmtDate(b.date)} at ${fmtTime(b.time)}. Booking ID ${b.id}. Amount paid ${inr(b.amount)} via ${method}.`);
    notify(u.id, "Payment receipt · " + inr(b.amount), `We received ${inr(b.amount)} (session ${inr(b.fee)} + GST ${inr(b.gst)}). Payment ID ${p.gatewayPaymentId}, Order ${p.orderId}.`);
    const tu = therapistUser(t.id); if (tu) notify(tu.id, "New booking · " + u.name, `${u.name} booked a ${b.mode.toLowerCase()} session on ${fmtDate(b.date)} at ${fmtTime(b.time)}.`);
    save(); return {booking:b, payment:p};
  },
  async cancelBooking(bookingId, by){
    await wait();
    const b = byId("bookings", bookingId), p = byId("payments", b.paymentId), t = byId("therapists", b.therapistId);
    const hoursLeft = (sessionTs(b.date, b.time) - Date.now()) / 3600e3;
    const refund = by === "admin" || hoursLeft >= 24;
    b.status = "cancelled"; b.cancelledBy = by;
    if (p && p.status === "captured") p.status = refund ? "refunded" : "no_refund";
    notify(b.userId, "Session cancelled", `Your session with ${t.name} on ${fmtDate(b.date)} was cancelled. ${p && p.status==="refunded" ? "A full refund of "+inr(b.amount)+" will reach your account in 5–7 working days." : p && p.status==="no_refund" ? "This was within 24 hours of the session, so it isn't refundable." : ""}`);
    save(); return {booking:b, refunded: p && p.status === "refunded"};
  },
  async reschedule(bookingId, date, time){
    await wait();
    const b = byId("bookings", bookingId), t = byId("therapists", b.therapistId);
    const s = slotsFor(t, date).find(x => x.time === time);
    if (!s || !s.free) throw new Error("That slot is no longer free. Pick another.");
    b.date = date; b.time = time;
    notify(b.userId, "Session rescheduled", `Your session with ${t.name} is now on ${fmtDate(date)} at ${fmtTime(time)}.`);
    const tu = therapistUser(t.id); if (tu) notify(tu.id, "Session rescheduled", `A client moved their session to ${fmtDate(date)} at ${fmtTime(time)}.`);
    save(); return b;
  }
};

/* ---------- app state ---------- */
const state = {
  route: {name:"home", params:{}},
  user: null,
  filters: {q:"", spec:"", lang:"", mode:"", budget:"", sort:"match"},
  picker: {date:null, time:null, mode:null},
  assess: {step:0, data:{concerns:[], phq:[null,null,null,null]}},
  pending: null,   // booking intent carried across login/intake
  checkout: null,  // {booking, payment}
  modal: null,     // function returning modal html
  pay: {tab:"UPI", outcome:"success", busy:false, error:""},
  dashTab: "sessions", adminTab: "overview", portalTab:"schedule",
  adminQ: "", adminStatus: "",
  menuOpen: false,
  authError: "", formError: ""
};
const sess = ls.get(SKEY);
if (sess) { const u = DB.users.find(x => x.id === sess.userId && x.active); if (u) state.user = u; }

/* ---------- router ---------- */
const ROUTES_TOP = ["home","therapists","assessment","login","register","dashboard","admin","portal"];
function go(name, params={}){
  state.route = {name, params}; state.menuOpen = false; state.formError = ""; state.authError = "";
  try { if (ROUTES_TOP.includes(name)) history.replaceState(null, "", "#" + name); } catch(e){}
  render(); window.scrollTo(0,0);
}
function initialRoute(){
  const h = (location.hash||"").replace("#","");
  if (ROUTES_TOP.includes(h)) state.route = {name:h, params:{}};
}

/* ---------- icons ---------- */
const I = {
  shield:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/></svg>',
  wallet:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="6" width="18" height="13" rx="2"/><path d="M16 12h2M3 10h18"/></svg>',
  chat:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a8 8 0 0 1-11.5 7.2L4 20l1-4.6A8 8 0 1 1 21 12z"/></svg>',
  heart:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.8 5.6a5 5 0 0 0-7.1 0L12 7.3l-1.7-1.7a5 5 0 0 0-7.1 7.1L12 21l8.8-8.3a5 5 0 0 0 0-7.1z"/></svg>',
  wave:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12c2-3 4-3 6 0s4 3 6 0 4-3 6 0"/><path d="M2 17c2-3 4-3 6 0s4 3 6 0 4-3 6 0" opacity=".5"/></svg>',
  people:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3.5"/><circle cx="17" cy="9" r="2.5"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M15 20c0-2 1-4 3.5-4S22 18 22 20"/></svg>',
  brief:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 13h18"/></svg>',
  check:'<svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>'
};

/* ---------- original illustrations: people + Mitraa mascot ---------- */
const SKIN = ["#FBD9B8","#F0BD8F","#D99A68","#B97A4E","#8F5A34","#6A4027"];
const HAIRC = ["#1E1220","#3B2219","#5B3620","#9A5222","#2E1A47","#E0679A","#7B61FF","#1E1220"];
const TOPS = ["#FF8A2B","#8B6CFF","#2BB673","#FF6FA8","#1E1220","#3A7BFF","#FFC93C","#00A6A6"];
const PASTEL = ["#FFE680","#CDBBFF","#B6F0D6","#FFB8D5","#BFE3FF","#FFD2A8","#E6F7A8","#FFC6B3"];
function rng(seed){ let h = 2166136261; for (const c of String(seed)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return ((h >>> 0) % 10000) / 10000; }; }
const pick = (r, a) => a[Math.floor(r() * a.length)];
function person(seed, o={}){
  const r = rng(seed);
  const skin = o.skin || pick(r, SKIN), hc = o.hairColor || pick(r, HAIRC), top = o.top || pick(r, TOPS), bg = o.bg || pick(r, PASTEL);
  const fem = o.gender ? o.gender === "Female" : r() > .5;
  const style = o.hair || (fem ? pick(r, ["long","bun","bob","curly","long"]) : pick(r, ["short","buzz","curly","short","swoop"]));
  const glasses = o.glasses ?? r() > .62, phones = o.headphones ?? r() > .8, beard = !fem && (o.beard ?? r() > .6), ear = fem && r() > .45;
  const ink = "#1E1220";
  const back = {
    long:`<path d="M58 92 C54 48 80 36 100 36 C124 36 148 50 142 94 L150 168 C128 156 72 156 50 168Z" fill="${hc}"/>`,
    bob:`<path d="M58 94 C54 50 80 40 100 40 C122 40 146 50 142 94 L144 126 C128 134 72 134 56 126Z" fill="${hc}"/>`,
    bun:`<circle cx="100" cy="36" r="17" fill="${hc}" stroke="${ink}" stroke-width="2.5"/>`,
    curly:[...Array(11)].map((_,i) => { const a = Math.PI*(0.95 + i*0.11); return `<circle cx="${(100+Math.cos(a)*38).toFixed(1)}" cy="${(84+Math.sin(a)*40).toFixed(1)}" r="15" fill="${hc}"/>`; }).join(""),
    short:"", buzz:"", swoop:""
  }[style];
  const front = {
    long:`<path d="M64 88 C66 56 86 46 102 48 C120 50 136 62 136 90 C126 68 112 60 98 62 C84 66 72 74 64 88Z" fill="${hc}"/>`,
    bob:`<path d="M64 82 C64 54 84 44 100 44 C118 44 136 54 136 82 C120 72 80 72 64 82Z" fill="${hc}"/>`,
    bun:`<path d="M66 84 C66 58 84 48 100 48 C118 48 134 58 134 84 C126 68 112 62 100 62 C88 62 74 68 66 84Z" fill="${hc}"/>`,
    curly:[[78,58],[92,50],[108,50],[122,58]].map(([x,y]) => `<circle cx="${x}" cy="${y}" r="11" fill="${hc}"/>`).join(""),
    short:`<path d="M64 88 C60 54 84 42 104 44 C126 46 142 60 136 88 C130 72 118 62 100 64 C84 64 70 72 64 88Z" fill="${hc}"/>`,
    buzz:`<path d="M66 84 C66 56 84 50 100 50 C118 50 134 56 134 84 C126 68 74 68 66 84Z" fill="${hc}" opacity=".9"/>`,
    swoop:`<path d="M62 86 C58 50 90 38 112 44 C132 50 142 66 136 86 C132 70 120 58 96 62 C82 66 70 72 62 86Z" fill="${hc}"/><path d="M84 52 C100 40 128 46 136 66 C120 56 102 56 84 52Z" fill="${hc}"/>`
  }[style];
  const eyes = o.closed ? `<path d="M82 94 q5 4 10 0 M108 94 q5 4 10 0" stroke="${ink}" stroke-width="2.6" fill="none" stroke-linecap="round"/>` : `<g class="p-eyes"><ellipse cx="87" cy="93" rx="3.4" ry="4" fill="${ink}"/><ellipse cx="113" cy="93" rx="3.4" ry="4" fill="${ink}"/><circle cx="88.2" cy="91.8" r="1.1" fill="#fff"/><circle cx="114.2" cy="91.8" r="1.1" fill="#fff"/></g>`;
  const mouth = o.mood === "calm" ? `<path d="M93 110 q7 4 14 0" stroke="${ink}" stroke-width="2.6" fill="none" stroke-linecap="round"/>` : `<path d="M89 107 Q100 119 111 107 Z" fill="${ink}"/><path d="M93 110 Q100 115 107 110" fill="#FF7A8A"/>`;
  return `<svg class="person" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Illustration">
    ${o.frame !== false ? `<rect width="200" height="200" fill="${bg}"/><circle cx="${40+r()*120}" cy="${30+r()*50}" r="${14+r()*18}" fill="#fff" opacity=".45"/>` : ""}
    ${back}
    <path d="M28 204 C30 156 60 140 100 140 C140 140 170 156 172 204Z" fill="${top}" stroke="${ink}" stroke-width="2.5"/>
    <path d="M86 140 Q100 156 114 140" fill="none" stroke="${ink}" stroke-width="2.5"/>
    <rect x="89" y="116" width="22" height="28" rx="9" fill="${skin}" stroke="${ink}" stroke-width="2.5"/>
    <circle cx="66" cy="96" r="8" fill="${skin}" stroke="${ink}" stroke-width="2.5"/><circle cx="134" cy="96" r="8" fill="${skin}" stroke="${ink}" stroke-width="2.5"/>
    <ellipse cx="100" cy="90" rx="34" ry="39" fill="${skin}" stroke="${ink}" stroke-width="2.5"/>
    ${front}
    ${beard ? `<path d="M68 98 C70 128 88 132 100 132 C112 132 130 128 132 98 C124 114 112 118 100 118 C88 118 76 114 68 98Z" fill="${hc}"/>` : ""}
    <path d="M80 82 q7 -4 13 0 M107 82 q7 -4 13 0" stroke="${ink}" stroke-width="2.6" fill="none" stroke-linecap="round"/>
    ${eyes}
    <circle cx="78" cy="104" r="5.5" fill="#FF7A8A" opacity=".35"/><circle cx="122" cy="104" r="5.5" fill="#FF7A8A" opacity=".35"/>
    ${mouth}
    ${glasses ? `<g fill="none" stroke="${ink}" stroke-width="2.4"><circle cx="87" cy="93" r="9.5"/><circle cx="113" cy="93" r="9.5"/><path d="M96.5 93 h7"/></g>` : ""}
    ${ear ? `<circle cx="66" cy="107" r="3.5" fill="none" stroke="#E0A800" stroke-width="2.2"/>` : ""}
    ${phones ? `<path d="M60 96 C58 42 142 42 140 96" fill="none" stroke="${ink}" stroke-width="6" stroke-linecap="round"/><rect x="54" y="86" width="14" height="24" rx="6" fill="${top}" stroke="${ink}" stroke-width="2.5"/><rect x="132" y="86" width="14" height="24" rx="6" fill="${top}" stroke="${ink}" stroke-width="2.5"/>` : ""}
  </svg>`;
}
/* Mitraa — MYTRM's original blob buddy */
const MOUTH = {
  happy:`<path d="M84 122 Q100 142 116 122 Z" fill="#1E1220"/><path d="M92 130 Q100 137 108 130" fill="#FF7A8A"/>`,
  calm:`<path d="M88 124 Q100 134 112 124" stroke="#1E1220" stroke-width="4" fill="none" stroke-linecap="round"/>`,
  meh:`<path d="M88 128 H112" stroke="#1E1220" stroke-width="4" stroke-linecap="round"/>`,
  stressed:`<path d="M84 130 q4 -6 8 0 t8 0 t8 0 t8 0" stroke="#1E1220" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M150 64 q6 10 0 14 q-6 -4 0 -14Z" fill="#8FD3FF" stroke="#1E1220" stroke-width="2"/>`,
  low:`<path d="M88 132 Q100 120 112 132" stroke="#1E1220" stroke-width="4" fill="none" stroke-linecap="round"/>`,
  wow:`<ellipse cx="100" cy="128" rx="8" ry="10" fill="#1E1220"/>`
};
function mascot(mood="happy", o={}){
  const body = o.color || "#FF8A2B";
  const brows = mood === "stressed" ? `<path d="M68 72 L90 80 M132 72 L110 80" stroke="#1E1220" stroke-width="4" stroke-linecap="round"/>` : mood === "low" ? `<path d="M68 80 L88 72 M132 80 L112 72" stroke="#1E1220" stroke-width="4" stroke-linecap="round"/>` : "";
  const lids = mood === "calm" ? `<path d="M66 86 Q80 78 94 86 M106 86 Q120 78 134 86" stroke="#1E1220" stroke-width="4" fill="none" stroke-linecap="round"/>` : "";
  return `<svg class="mitraa" viewBox="0 0 200 210" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Mitraa, the MYTRM buddy">
    <g class="sprout"><path d="M100 30 C100 18 102 10 108 4" stroke="#1E1220" stroke-width="3.5" fill="none" stroke-linecap="round"/><path d="M106 8 C116 -2 132 2 132 10 C122 16 112 16 106 8Z" fill="#2BB673" stroke="#1E1220" stroke-width="3"/></g>
    <path class="arm-l" d="M30 128 C14 126 8 112 16 104" stroke="#1E1220" stroke-width="12" stroke-linecap="round" fill="none"/><path d="M30 128 C14 126 8 112 16 104" stroke="${body}" stroke-width="6" stroke-linecap="round" fill="none"/>
    <g class="arm-r"><path d="M170 118 C186 110 190 94 182 84" stroke="#1E1220" stroke-width="12" stroke-linecap="round" fill="none"/><path d="M170 118 C186 110 190 94 182 84" stroke="${body}" stroke-width="6" stroke-linecap="round" fill="none"/></g>
    <path d="M100 30 C152 28 184 64 182 112 C180 162 146 196 100 194 C52 192 18 160 20 110 C22 62 50 32 100 30Z" fill="${body}" stroke="#1E1220" stroke-width="4"/>
    <ellipse cx="72" cy="62" rx="16" ry="9" fill="#fff" opacity=".45" transform="rotate(-24 72 62)"/>
    <g class="eyes">
      <ellipse cx="80" cy="96" rx="15" ry="${mood==="calm"?10:17}" fill="#fff" stroke="#1E1220" stroke-width="3.5"/>
      <ellipse cx="120" cy="96" rx="15" ry="${mood==="calm"?10:17}" fill="#fff" stroke="#1E1220" stroke-width="3.5"/>
      <g class="pupil"><circle cx="80" cy="98" r="7" fill="#1E1220"/><circle cx="82.5" cy="95" r="2.4" fill="#fff"/></g>
      <g class="pupil"><circle cx="120" cy="98" r="7" fill="#1E1220"/><circle cx="122.5" cy="95" r="2.4" fill="#fff"/></g>
    </g>
    ${lids}${brows}
    <circle cx="58" cy="122" r="9" fill="#FF6FA8" opacity=".45"/><circle cx="142" cy="122" r="9" fill="#FF6FA8" opacity=".45"/>
    ${MOUTH[mood] || MOUTH.happy}
    <ellipse cx="100" cy="205" rx="46" ry="5" fill="#1E1220" opacity=".15"/>
  </svg>`;
}

/* ---------- v2 visuals ---------- */
const tIndex = t => Math.max(0, DB.therapists.indexOf(t));
const tBg = t => PASTEL[tIndex(t) % PASTEL.length];
const portrait = (t, frame=true) => person(t.id, {gender:t.gender, bg:tBg(t), frame});
const avatar = (t, size=56) => `<div class="avatar" style="width:${size}px;height:${size}px;border-radius:${size>60?24:12}px" aria-hidden="true">${portrait(t)}</div>`;

function therapistCard(t, showMatch){
  const m = showMatch ? matchScore(t) : 0;
  return `<article class="t2">
    <div class="shot" style="background:${tBg(t)}">${person(t.id,{gender:t.gender, frame:false})}<span class="rate">★ ${t.rating} · ${t.reviews}</span><span class="fee">${inr(t.fee)}</span>${m >= 4 ? `<span class="fitb">good match ✓</span>` : ""}</div>
    <div class="body">
      <div><h3>${esc(t.name)}</h3><div class="t-sub">${esc(t.title)} · ${t.exp} yrs · ${esc(t.city)}</div></div>
      <div class="tags">${t.specialties.slice(0,3).map(s => `<span class="tag">${esc(s)}</span>`).join("")}</div>
      <div class="t-sub">Speaks ${t.langs.map(esc).join(", ")}</div>
      <div class="t-foot"><div class="t-sub">${t.modes.map(esc).join(" · ")}</div><button class="btn btn-dark btn-sm" data-go="therapist" data-id="${t.id}">View & book</button></div>
    </div></article>`;
}

const ROT = ["overthinking","burnout","situationships","placement stress","3 AM thoughts","family pressure","loneliness","imposter syndrome"];
const MOODS = [
  {k:"great", label:"thriving", m:"happy", bg:"var(--mint)", h:"Love that for you.", p:"Therapy isn't only for bad days. Use a session to set goals, build habits or understand yourself better.", cta:"Browse therapists", to:"therapists"},
  {k:"okay", label:"okay-ish", m:"calm", bg:"var(--sky)", h:"Okay is valid.", p:"A quick check-in helps you notice what's quietly draining you before it snowballs.", cta:"Take the 3-min check-in", to:"assessment"},
  {k:"meh", label:"meh", m:"meh", bg:"var(--butter)", h:"Feeling flat? It happens.", p:"Low energy that sticks around is worth talking about. Counsellors start from ₹800.", cta:"Find someone affordable", to:"therapists", budget:"lt1000"},
  {k:"stressed", label:"stressed", m:"stressed", bg:"var(--peach)", h:"Breathe in for 4, out for 6.", p:"Deadlines, exams, family pressure — our stress and burnout people get it.", cta:"See stress specialists", to:"therapists", spec:"Burnout"},
  {k:"low", label:"low", m:"low", bg:"var(--lilac)", h:"We're really glad you're here.", p:"You don't have to carry this alone. If you're in crisis right now, call Tele-MANAS on 14416 (free, 24×7).", cta:"Talk to someone", to:"therapists", spec:"Depression"}
];

function homeView(){
  const ts = DB.therapists.filter(t => t.active !== false);
  const mood = MOODS.find(m => m.k === state.mood);
  const words = ["overthinking","burnout","situationships","placement stress","family expectations","loneliness","imposter syndrome","3 AM thoughts","exam anxiety","breakups"];
  const strip = (cls) => `<div class="marquee ${cls}" aria-hidden="true"><div class="track">${[0,1].map(() => `<span>${words.map(w => `${w} <span class="star">✺</span>`).join(" ")}</span>`).join("")}</div></div>`;
  const stories = [["I finally stopped treating my anxiety like a personality trait.","Student, 21","s1"],["Evening chat sessions = no awkward 'why are you leaving early' convos with my manager.","Analyst, 26","s2"],["Talking in Malayalam made it click for my parents and me.","Designer, 24","s3"],["Booked at 11 PM, talked the next evening. Zero phone calls.","Engineer, 23","s4"],["My therapist gets placement season. That's rare.","MBA student, 22","s5"],["I didn't know I needed boundaries until week three.","Content creator, 25","s6"]];
  return `
  <section class="hero2"><div class="wrap grid-h">
    <div>
      <span class="sticker"><span class="new">NEW</span> therapy for the group-chat generation</span>
      <h1>Your mind deserves a <span class="squig"><span class="it">safe space</span><svg viewBox="0 0 300 30" preserveAspectRatio="none" aria-hidden="true"><path d="M4 20 C60 4 110 28 160 14 S250 6 296 16" stroke="#FF8A2B" stroke-width="7" fill="none" stroke-linecap="round"/></svg></span>.</h1>
      <div class="rot-line">Talk it out: <span class="rot" id="rot">${ROT[0]}</span></div>
      <p class="lead">Verified psychologists who actually get exam pressure, first jobs and family expectations. Video, voice or chat, from ₹800. No waitlists, no judgement.</p>
      <div class="row"><button class="btn btn-orange btn-lg" data-go="assessment">Take the 3-min vibe check</button><button class="btn btn-ghost btn-lg" data-go="therapists">Browse therapists →</button></div>
      <div class="social"><div class="faces">${["a1","a2","a3","a4","a5"].map((s,i) => `<div class="face">${person(s,{bg:PASTEL[i]})}</div>`).join("")}</div><div class="small"><b>4.8/5</b> from early users · <span class="ph-tag">sample</span></div></div>
    </div>
    <div class="stage">
      <div class="ring"></div><div class="orb"></div>
      <div class="mascot-hero">${mascot("happy")}</div>
      <div class="float f1" data-speed="0.10"><span class="dot" style="background:var(--mint)">✓</span><div>Session booked<small>Tonight · 8:00 PM · Video</small></div></div>
      <div class="float f2" data-speed="-0.12"><div>"you're doing better than you think"<small>— your therapist, probably</small></div></div>
      <div class="float f3" data-speed="0.07"><span class="dot" style="background:var(--butter);font-size:11px">3m</span><div>Vibe check done<small>PHQ-4 · private</small></div></div>
      <div class="float f4" data-speed="-0.16">${person("hero-face",{bg:"#CDBBFF", gender:"Female", hair:"curly"})}</div>
    </div>
  </div></section>
  ${strip("")}${strip("alt")}

  <section><div class="wrap"><div class="vibe reveal">
    <div>
      <span class="eyebrow">Vibe check</span>
      <h2 class="h2">How are you <span class="it">actually</span> doing?</h2>
      <p class="lead mt">No sign-up. Tap one — Mitraa will point you somewhere useful.</p>
      <div class="moods" role="group" aria-label="Pick your mood">${MOODS.map(m => `<button class="${state.mood===m.k?"on":""}" data-act="mood" data-k="${m.k}" aria-pressed="${state.mood===m.k}">${mascot(m.m)}${m.label}</button>`).join("")}</div>
    </div>
    <div class="vibe-out" style="background:${mood ? mood.bg : "var(--cream)"}">
      <div class="mas">${mascot(mood ? mood.m : "wow")}</div>
      <div>${mood ? `<h3>${mood.h}</h3><p class="small">${mood.p}</p><button class="btn btn-dark btn-sm mt" data-act="moodGo" data-k="${mood.k}">${mood.cta} →</button>`
        : `<h3>Hi, I'm Mitraa.</h3><p class="small">Your MYTRM buddy. Pick a mood on the left and I'll suggest a next step. I also follow your cursor. Try it.</p>`}</div>
    </div>
  </div></div></section>

  <section style="padding-top:0"><div class="wrap">
    <div class="sec-head"><div><span class="eyebrow">Why MYTRM</span><h2 class="h2 mt">Therapy, minus the <span class="it">awkward</span></h2></div><p class="lead" style="max-width:38ch">Mitraa means friend. We built this for people who'd rather book at 11 PM on their phone than call a clinic at 11 AM.</p></div>
    <div class="bento">
      <div class="bx tall reveal" style="background:var(--lilac)"><h3>Real humans.<br>Verified.</h3><p>Every psychologist is qualification-checked and interviewed before they're listed.</p>
        <div class="collage"><div class="ph">${ts[0]?portrait(ts[0]):""}</div><div class="ph">${ts[1]?portrait(ts[1]):""}</div></div></div>
      <div class="bx reveal" style="background:var(--orange)"><p style="font-weight:700;color:var(--ink)">sessions from</p><div class="big">₹800</div><p style="color:var(--ink)">GST shown upfront. No subscriptions.</p></div>
      <div class="bx reveal" style="background:var(--mint)"><h3>Your format</h3><p>Switch any time.</p><div class="mode-chips"><span>Video</span><span>Voice</span><span>Chat</span><span>In-person</span></div></div>
      <div class="bx reveal" style="background:var(--butter)"><p style="font-weight:700">slots open</p><div class="big" style="font-size:clamp(34px,3.6vw,46px)">8AM–10PM</div><p>After class, after work, weekends too.</p></div>
      <div class="bx wide reveal" style="background:var(--ink);color:var(--cream)"><h3>Private by design</h3><p style="color:#D8C9D2">Your check-in and notes are shared only with the therapist you book. Nothing goes to your college, employer or parents.</p>
        <svg class="deco" viewBox="0 0 120 120" aria-hidden="true"><rect x="22" y="52" width="76" height="58" rx="14" fill="#FFE680" stroke="#FFF8F0" stroke-width="3"/><path d="M38 52 V38 a22 22 0 0 1 44 0 V52" fill="none" stroke="#FFF8F0" stroke-width="6"/><circle cx="60" cy="80" r="7" fill="#1E1220"/></svg></div>
      <div class="bx reveal" style="background:var(--pink)"><h3>No-judgement zone</h3><p>Queer-affirmative, neurodivergent-friendly, jargon-free.</p><div style="width:90px;margin-top:10px">${mascot("calm",{color:"#FFA95C"})}</div></div>
    </div>
  </div></section>

  <section style="padding-top:0"><div class="wrap">
    <div class="sec-head"><div><span class="eyebrow">What we help with</span><h2 class="h2 mt">What's on your mind?</h2></div><button class="btn btn-dark" data-go="therapists">All therapists</button></div>
    <div class="stickers">
      ${[["heart","Anxiety & overthinking","Racing thoughts, panic, the 2 AM spiral.","Anxiety","var(--butter)"],["wave","Low mood & burnout","When everything feels heavy or you're running on empty.","Burnout","var(--sky)"],["people","Relationships & family","Situationships, parents, friendships, boundaries.","Relationships","var(--pink)"],["brief","Career & exam stress","Placements, toxic bosses, entrance exams.","Stress","var(--mint)"]]
        .map(([ic,h,p,spec,bg]) => `<div class="reveal"><button class="stk" data-tilt data-act="filterSpec" data-spec="${spec}" style="background:${bg};width:100%"><div class="ico">${I[ic]}</div><h3>${h}</h3><p>${p}</p><div class="go">See therapists <span>→</span></div></button></div>`).join("")}
    </div>
  </div></section>

  <section id="how" style="padding-top:0"><div class="wrap">
    <div class="sec-head"><div><span class="eyebrow">How it works</span><h2 class="h2 mt">Four steps. <span class="it">Ten minutes.</span></h2></div><p class="lead" style="max-width:36ch">From "I should talk to someone" to a confirmed session. Stop at any step.</p></div>
    <div class="steps">
      ${[["Vibe check","Answer a few private questions about the last two weeks.","wow"],["Get matched","We suggest therapists by concern, language, budget and format.","happy"],["Book & pay","Pick a slot, pay by UPI, card or netbanking.","calm"],["Talk","Join from your phone. Reschedule free up to 24 h before.","happy"]]
        .map(([h,p,m],i) => `<div class="card reveal"><div class="mini">${mascot(m)}</div><div class="n">0${i+1}</div><h3 class="mt" style="font-size:20px">${h}</h3><p>${p}</p></div>`).join("")}
    </div>
  </div></section>

  <section style="padding-top:0"><div class="wrap">
    <div class="sec-head"><div><span class="eyebrow">The team</span><h2 class="h2 mt">Therapists who speak <span class="it">your</span> language</h2></div><button class="btn btn-ghost" data-go="therapists">See all ${ts.length} →</button></div>
    <div class="rail">${ts.map(t => therapistCard(t)).join("")}</div>
  </div></section>

  <section style="padding-top:0"><div class="wrap"><div class="stats-band reveal">
    <div class="row mb" style="justify-content:space-between"><h2 class="h2" style="color:var(--cream)">Built for how you <span class="it" style="color:var(--orange-2)">actually</span> live</h2><span class="ph-tag">placeholder figures</span></div>
    <div class="grid g4 mt">
      <div class="s"><div class="v" data-count="800" data-pre="₹">₹800</div><p>starting price per session</p></div>
      <div class="s"><div class="v" data-count="10" data-suf="+">10+</div><p>languages, Hindi to Malayalam</p></div>
      <div class="s"><div class="v" data-count="14" data-suf="h">14h</div><p>of slots every day, 8 AM–10 PM</p></div>
      <div class="s"><div class="v" data-count="3" data-suf=" min">3 min</div><p>to finish the vibe check</p></div>
    </div>
  </div></div></section>

  <section style="padding-top:0"><div class="wrap">
    <div class="sec-head"><div><span class="eyebrow">Stories</span><h2 class="h2 mt">What talking to someone changed</h2></div><span class="ph-tag">Placeholder testimonials — replace with real, consented stories</span></div>
  </div>
    <div class="chats"><div class="track">${[0,1].map(k => stories.map(([q,w,s],i) => `<div class="bubble" ${k?'aria-hidden="true"':""}><div class="stars">★★★★★</div>"${q}"<div class="who"><div class="face">${person(s,{bg:PASTEL[(i+2)%8]})}</div>${w}</div></div>`).join("")).join("")}</div></div>
  </section>

  <section style="padding-top:0"><div class="wrap"><div class="cta2 reveal">
    <div><h2>Not sure where to start? Start here.</h2><p>Take the free vibe check. Get a short summary of how you've been and therapists who fit. No commitment to book.</p><div class="row"><button class="btn btn-dark btn-lg" data-go="assessment">Start the vibe check</button><div class="typing" aria-hidden="true"><i></i><i></i><i></i></div></div></div>
    <div class="mas">${mascot("happy",{color:"#FFE680"})}</div>
  </div></div></section>

  <section id="faq" style="padding-top:0"><div class="wrap" style="max-width:780px">
    <div style="text-align:center;margin-bottom:28px"><span class="eyebrow">FAQs</span><h2 class="h2 mt">Before your first session</h2></div>
    ${[["What happens in my first session?","Your therapist gets to know you, what's bringing you in and what you'd like to be different. You don't need to prepare anything. You'll leave with a sense of next steps."],["Is this confidential?","Yes. What you share stays between you and your therapist, except where there's a risk to your safety or someone else's, which your therapist will explain up front."],["How much does it cost?","Each therapist sets their fee, shown on their profile with GST included at checkout. Sessions are 50 minutes."],["Can I cancel or reschedule?","Reschedule or cancel for a full refund up to 24 hours before your session from My space. Later cancellations aren't refunded."],["Is MYTRM for emergencies?","No. If you're in immediate danger, call 112 or Tele-MANAS on 14416."]]
      .map(([q,a],i) => `<details class="faq" ${i===0?"open":""}><summary>${q}</summary><p>${a}</p></details>`).join("")}
  </div></section>`;
}

/* ---------- motion engine ---------- */
const REDUCE = (() => { try { return matchMedia("(prefers-reduced-motion: reduce)").matches; } catch(e){ return false; } })();
const motion = {mx:0, my:0, tx:0, ty:0, px:-999, py:-999, tilt:null};
function setupMotion(){
  const blobs = [...document.querySelectorAll("#bg .blob")], glow = $("#glow"), bar = $("#progress");
  addEventListener("pointermove", e => {
    motion.mx = e.clientX / innerWidth * 2 - 1; motion.my = e.clientY / innerHeight * 2 - 1; motion.px = e.clientX; motion.py = e.clientY;
    if (e.pointerType === "mouse" && !REDUCE) { glow.classList.add("on"); glow.style.transform = `translate(${e.clientX}px,${e.clientY}px) translate(-50%,-50%)`; }
    const el = e.target.closest && e.target.closest("[data-tilt]");
    if (motion.tilt && motion.tilt !== el) { motion.tilt.style.transform = ""; motion.tilt = null; }
    if (el && !REDUCE && e.pointerType === "mouse") { const r = el.getBoundingClientRect(); const x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5; el.style.transform = `perspective(700px) rotateX(${(-y*12).toFixed(2)}deg) rotateY(${(x*14).toFixed(2)}deg) translateY(-6px)`; motion.tilt = el; }
  }, {passive:true});
  document.addEventListener("pointerleave", () => glow.classList.remove("on"));
  const frame = (t) => {
    motion.tx += (motion.mx - motion.tx) * .05; motion.ty += (motion.my - motion.ty) * .05;
    const s = scrollY, max = Math.max(1, document.documentElement.scrollHeight - innerHeight);
    bar.style.transform = `scaleX(${Math.min(1, s / max)})`;
    if (!REDUCE) {
      const dirs = [1,-1.3,.9,-.7];
      blobs.forEach((b,i) => { const d = dirs[i];
        b.style.transform = `translate3d(${(motion.tx*70*d + Math.sin(t/4200+i*2)*40 + Math.sin(s/700+i)*60).toFixed(1)}px, ${(motion.ty*60*d + Math.cos(t/5200+i)*40 - Math.sin(s/900+i*1.7)*140).toFixed(1)}px,0) rotate(${(s*.03*d).toFixed(1)}deg) scale(${(1 + Math.sin(t/6000+i)*.1 + Math.sin(s/1200+i)*.1).toFixed(3)})`; });
      const vh = innerHeight;
      document.querySelectorAll("[data-speed]").forEach(el => {
        const r = el.getBoundingClientRect(), cur = el._py || 0;
        if (r.bottom < -200 || r.top > vh + 200) return;
        const c = r.top - cur + r.height/2 - vh/2, v = -c * parseFloat(el.dataset.speed);
        el._py = v; el.style.translate = `0 ${v.toFixed(1)}px`;
      });
      document.querySelectorAll(".mitraa").forEach(m => {
        const r = m.getBoundingClientRect(); if (r.bottom < 0 || r.top > vh || r.width < 20) return;
        const cx = r.left + r.width/2, cy = r.top + r.height*.45;
        const a = Math.atan2(motion.py - cy, motion.px - cx), dist = Math.min(1, Math.hypot(motion.px - cx, motion.py - cy) / 300);
        const dx = Math.cos(a)*5*dist, dy = Math.sin(a)*6*dist;
        m.querySelectorAll(".pupil").forEach(p => p.style.transform = `translate(${dx.toFixed(1)}px,${dy.toFixed(1)}px)`);
      });
    }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
  let ri = 0;
  if (!REDUCE) setInterval(() => { const el = $("#rot"); if (!el) return; ri = (ri + 1) % ROT.length; el.textContent = ROT[ri]; el.classList.remove("flip"); void el.offsetWidth; el.classList.add("flip"); }, 2100);
  setTimeout(() => { if (!state.buddyDismissed) { state.buddyTip = true; renderBuddy(); } }, 4500);
}
let countObs;
function afterRender(){
  if (!("IntersectionObserver" in window) || REDUCE) return;
  if (countObs) countObs.disconnect();
  countObs = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return; const el = e.target; countObs.unobserve(el);
    const n = +el.dataset.count, pre = el.dataset.pre || "", suf = el.dataset.suf || "", t0 = performance.now();
    const step = (t) => { const k = Math.min(1, (t - t0) / 1100), v = Math.round(n * (1 - Math.pow(1 - k, 3))); el.textContent = pre + v.toLocaleString("en-IN") + suf; if (k < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  }), {threshold:.6});
  document.querySelectorAll("[data-count]").forEach(el => countObs.observe(el));
}
function renderBuddy(){
  const b = $("#buddy"); if (!b) return;
  const r = state.route.name;
  if (["admin","portal","assessment"].includes(r)) { b.innerHTML = ""; return; }
  b.innerHTML = `${state.buddyTip ? `<div class="say" role="status">hey, I'm Mitraa! Need to talk? The vibe check takes 3 min.<div class="row" style="gap:6px"><button class="btn btn-orange btn-sm" data-act="buddyGo">Let's go</button><button class="btn btn-ghost btn-sm" data-act="buddyX">Later</button></div></div>` : ""}<button class="me" data-act="buddy" aria-label="Open Mitraa">${mascot(state.buddyTip ? "wow" : "happy")}</button>`;
}

/* ---------- layout ---------- */
function nav(){
  const r = state.route.name, u = state.user;
  const link = (n, label) => `<button data-go="${n}" class="${r===n?"on":""}">${label}</button>`;
  let right;
  if (!u) right = `<button class="btn btn-dark btn-sm" data-go="therapists">Book a session</button>`;
  else {
    const home = u.role === "admin" ? "admin" : u.role === "therapist" ? "portal" : "dashboard";
    const label = u.role === "admin" ? "Admin panel" : u.role === "therapist" ? "My practice" : "My space";
    const unread = DB.inbox.filter(m => m.userId === u.id && !m.read).length;
    right = `<button class="btn btn-dark btn-sm" data-go="${home}">${label}${unread?` <span class="pill" style="background:var(--orange);color:var(--ink)">${unread}</span>`:""}</button><button class="btn btn-ghost btn-sm hide-sm" data-act="logout">Log out</button>`;
  }
  return `<div class="demo-bar"><b>Prototype</b> · sample data · payments run in Razorpay <b>test mode</b> (no real money moves)</div>
  <header class="nav"><div class="wrap"><div class="nav-in">
    <button class="logo" data-go="home" aria-label="MYTRM home"><span class="logo-mark">MYTRM</span><span class="logo-tag">your safe space, your Mitraa.</span></button>
    <button class="menu-btn" data-act="menu" aria-label="Menu">☰</button>
    <nav class="nav-links ${state.menuOpen?"open":""}">
      ${link("home","Home")}${link("therapists","Therapists")}${link("assessment","Check-in")}
      <button data-act="scrollTo" data-id="how">How it works</button><button data-act="scrollTo" data-id="faq">FAQs</button>
      ${u ? `<button data-act="logout" class="hide-lg">Log out</button>` : `<button data-go="login">Log in</button>`}
    </nav>
    <div class="nav-cta">${right}</div>
  </div></div></header>`;
}
function footer(){
  return `<footer><div class="wrap">
    <div class="cols">
      <div>
        <div class="logo-mark" style="display:inline-block;margin-bottom:12px">MYTRM</div>
        <p>Therapy for Gen Z and young professionals. Verified psychologists, honest prices, sessions that fit around college and work.</p>
        <div class="crisis"><b>In crisis right now?</b> Call Tele-MANAS on <b>14416</b> (free, 24×7) or dial <b>112</b> for emergencies. MYTRM is not an emergency service.</div>
      </div>
      <div><h4>Explore</h4><button data-go="therapists">Find a therapist</button><button data-go="assessment">3-min check-in</button><button data-act="scrollTo" data-id="how">How it works</button><button data-act="scrollTo" data-id="faq">FAQs</button></div>
      <div><h4>Accounts</h4><button data-go="login">Log in</button><button data-go="register">Create account</button><button data-act="demoLogin" data-who="therapist">Therapist portal</button><button data-act="demoLogin" data-who="admin">Admin panel</button></div>
      <div><h4>Contact</h4><p>hello@mytrm.in</p><p>+91 90000 00000</p><p class="mt small">Privacy · Terms · Refund policy</p></div>
    </div>
    <p class="small" style="margin-top:34px;border-top:1px solid #4A3226;padding-top:18px">© ${new Date().getFullYear()} MYTRM. Prototype build — all therapist profiles, figures and stories are placeholders.</p>
  </div></footer>`;
}

/* ---------- views ---------- */
const V = {};
V.home = homeView;

function matchScore(t){
  const a = state.user && DB.assessments.find(x => x.userId === state.user.id);
  if (!a) return 0;
  let s = 0;
  const map = {"Anxiety":["Anxiety","Panic","OCD"],"Low mood":["Depression","Burnout"],"Stress / burnout":["Burnout","Stress","Career"],"Relationships":["Relationships"],"Family":["Family","Relationships"],"Self-esteem":["Self-esteem"],"Sleep":["Anxiety","Stress"],"Grief":["Grief"],"Identity":["LGBTQIA+ affirmative","Self-esteem"],"Trauma":["Trauma"],"Career":["Career","Burnout"],"Exam stress":["Exam stress","Stress"],"Burnout":["Burnout","Stress"]};
  for (const c of a.data.concerns) for (const sp of (map[c]||[c])) if (t.specialties.includes(sp)) { s += 2; break; }
  if (t.langs.includes(a.data.language)) s += 2;
  if (t.modes.includes(a.data.mode)) s += 1;
  if (a.data.tgender && a.data.tgender !== "No preference" && t.gender === a.data.tgender) s += 1;
  const b = a.data.budget;
  if (b === "Under ₹1,000" && t.fee < 1000) s += 1;
  if (b === "₹1,000–₹2,000" && t.fee >= 1000 && t.fee <= 2000) s += 1;
  return s;
}

V.therapists = () => {
  const f = state.filters;
  const all = DB.therapists.filter(t => t.active !== false);
  const specs = [...new Set(all.flatMap(t => t.specialties))].sort();
  const langs = [...new Set(all.flatMap(t => t.langs))].sort();
  let list = all.filter(t =>
    (!f.q || (t.name + " " + t.specialties.join(" ") + " " + t.city).toLowerCase().includes(f.q.toLowerCase())) &&
    (!f.spec || t.specialties.includes(f.spec)) && (!f.lang || t.langs.includes(f.lang)) && (!f.mode || t.modes.includes(f.mode)) &&
    (!f.budget || (f.budget === "lt1000" ? t.fee < 1000 : f.budget === "1000-1500" ? t.fee >= 1000 && t.fee <= 1500 : t.fee > 1500)));
  const hasA = state.user && DB.assessments.some(a => a.userId === state.user.id);
  if (f.sort === "price") list.sort((a,b) => a.fee - b.fee);
  else if (f.sort === "rating") list.sort((a,b) => b.rating - a.rating);
  else if (f.sort === "exp") list.sort((a,b) => b.exp - a.exp);
  else if (hasA) list.sort((a,b) => matchScore(b) - matchScore(a));
  const opt = (v, cur, label) => `<option value="${esc(v)}" ${v===cur?"selected":""}>${esc(label||v)}</option>`;
  return `<div class="wrap">
    <div class="page-head"><span class="eyebrow">Therapists</span><h1>Find someone you'll feel comfortable with</h1>
      <p class="lead mt">${hasA ? "Sorted by how well each therapist fits your check-in." : `Filter by what matters to you, or <button class="link" data-go="assessment">take the check-in</button> for personalised matches.`}</p></div>
    <div class="filters">
      <input id="f-q" data-filter="q" placeholder="Search name, concern, city" value="${esc(f.q)}" aria-label="Search">
      <select id="f-spec" data-filter="spec" aria-label="Concern">${opt("",f.spec,"Any concern")}${specs.map(s => opt(s,f.spec)).join("")}</select>
      <select id="f-lang" data-filter="lang" aria-label="Language">${opt("",f.lang,"Any language")}${langs.map(s => opt(s,f.lang)).join("")}</select>
      <select id="f-mode" data-filter="mode" aria-label="Format">${opt("",f.mode,"Any format")}${["Video","Audio","Chat","In-person"].map(s => opt(s,f.mode)).join("")}</select>
      <select id="f-budget" data-filter="budget" aria-label="Budget">${opt("",f.budget,"Any budget")}${opt("lt1000",f.budget,"Under ₹1,000")}${opt("1000-1500",f.budget,"₹1,000–₹1,500")}${opt("gt1500",f.budget,"Above ₹1,500")}</select>
      <select id="f-sort" data-filter="sort" aria-label="Sort">${opt("match",f.sort,hasA?"Best match":"Recommended")}${opt("price",f.sort,"Lowest price")}${opt("rating",f.sort,"Highest rated")}${opt("exp",f.sort,"Most experienced")}</select>
      ${(f.q||f.spec||f.lang||f.mode||f.budget) ? `<button class="link" data-act="clearFilters">Clear filters</button>` : ""}
    </div>
    ${list.length ? `<div class="grid g3" style="padding-bottom:64px">${list.map(t => therapistCard(t, hasA)).join("")}</div>`
      : `<div class="card empty" style="margin-bottom:64px">No therapists match these filters. <button class="link" data-act="clearFilters">Clear filters</button></div>`}
  </div>`;
};

function nextDays(n=14){ const out=[]; const d=new Date(); d.setHours(0,0,0,0); for(let i=0;i<n;i++) out.push(ymd(addDays(d,i))); return out; }

function slotPicker(t, ctx){
  const p = state.picker;
  const days = nextDays(14);
  if (!p.date) { const first = days.find(d => slotsFor(t,d).some(s => s.free)); p.date = first || days[0]; }
  const slots = slotsFor(t, p.date);
  return `<div class="dates" role="listbox" aria-label="Choose a date">${days.map(d => {
      const n = slotsFor(t,d).filter(s => s.free).length, dt = parseYmd(d);
      return `<button class="date-chip ${d===p.date?"on":""}" data-act="pickDate" data-ctx="${ctx}" data-date="${d}" ${n?"":"disabled"}><small>${WD_LABEL[WD[dt.getDay()]]}</small><b>${dt.getDate()}</b><small>${n?n+" free":"—"}</small></button>`;
    }).join("")}</div>
    <div class="times">${slots.length ? slots.map(s => `<button class="time ${s.time===p.time?"on":""}" data-act="pickTime" data-ctx="${ctx}" data-time="${s.time}" ${s.free?"":"disabled"}>${fmtTime(s.time)}</button>`).join("") : `<p class="muted small">No slots on this day.</p>`}</div>`;
}

V.therapist = ({id}) => {
  const t = byId("therapists", id);
  if (!t) return `<div class="wrap empty">Therapist not found. <button class="link" data-go="therapists">Back to therapists</button></div>`;
  const p = state.picker;
  if (p.tid !== t.id) { state.picker = {tid:t.id, date:null, time:null, mode:t.modes[0]}; }
  const pk = state.picker;
  return `<div class="wrap" style="padding-block:28px 64px">
    <button class="link" data-go="therapists">← All therapists</button>
    <div class="prof mt">
      <div>
        <div class="prof-head">${avatar(t, 96)}<div><h1>${esc(t.name)}</h1><p class="muted">${esc(t.title)} · ${esc(t.quals)}</p><p class="small mt" style="margin-top:6px">★ ${t.rating} · ${t.reviews} reviews · ${esc(t.city)} · <span class="match">Verified</span></p></div></div>
        <div class="kv"><div><b>${t.exp} yrs</b><span>Experience</span></div><div><b>${inr(t.fee)}</b><span>Per 50-min session</span></div><div><b>${t.langs.length}</b><span>Languages</span></div></div>
        <div class="card"><h3>About</h3><p style="color:var(--ink-2);font-size:15px">${esc(t.bio)}</p>
          <span class="label">Helps with</span><div class="tags">${t.specialties.map(s => `<span class="tag">${esc(s)}</span>`).join("")}</div>
          <span class="label">Approach</span><div class="tags">${t.approach.map(s => `<span class="tag">${esc(s)}</span>`).join("")}</div>
          <span class="label">Languages</span><p class="small">${t.langs.map(esc).join(" · ")}</p>
          <span class="label">Session formats</span><p class="small">${t.modes.map(esc).join(" · ")}</p>
        </div>
        <div class="card mt"><h3>Weekly availability</h3><p class="small mb">Regular hours. Booked and past slots are hidden in the picker.</p>
          <div class="tbl-wrap" style="border:0"><table><tbody>${["mon","tue","wed","thu","fri","sat","sun"].map(d => `<tr><th style="width:70px">${WD_LABEL[d]}</th><td style="white-space:normal">${(t.availability[d]||[]).length ? t.availability[d].slice().sort().map(fmtTime).join(" · ") : `<span class="muted">Unavailable</span>`}</td></tr>`).join("")}</tbody></table></div>
        </div>
      </div>
      <aside class="card soft book-card">
        <h3 style="font-size:18px">Book a session</h3>
        <span class="label">Format</span>
        <div class="seg">${t.modes.map(m => `<button class="${pk.mode===m?"on":""}" data-act="pickMode" data-mode="${m}">${m}</button>`).join("")}</div>
        <span class="label">Date & time <span class="muted" style="font-weight:400">(IST)</span></span>
        ${slotPicker(t, "book")}
        <div class="summary mt"><div><span class="muted">Session (50 min)</span><span>${inr(t.fee)}</span></div><div><span class="muted">GST 18%</span><span>${inr(Math.round(t.fee*GST))}</span></div><div class="tot"><span>Total</span><span>${inr(t.fee+Math.round(t.fee*GST))}</span></div></div>
        <button class="btn btn-dark btn-block mt" data-act="startBooking" ${pk.time?"":"disabled"}>${pk.time ? `Continue · ${fmtDate(pk.date).split(",")[0]} ${fmtTime(pk.time)}` : "Choose a time to continue"}</button>
        <p class="note mt" style="text-align:center">Free reschedule or full refund up to 24 hours before.</p>
      </aside>
    </div>
  </div>`;
};

V.login = () => authView("login");
V.register = () => authView("register");
function authView(mode){
  const reg = mode === "register";
  return `<div class="wrap"><div class="auth card soft">
    <span class="eyebrow">${reg ? "Create account" : "Welcome back"}</span>
    <h1 style="font-size:28px;margin-bottom:6px">${reg ? "Start your safe space" : "Log in to MYTRM"}</h1>
    <p class="muted small mb">${state.pending ? "Log in or sign up to finish booking your session." : reg ? "It takes less than a minute. We never share your details." : "Pick up where you left off."}</p>
    ${state.authError ? `<div class="err" role="alert">${esc(state.authError)}</div>` : ""}
    <form data-form="${mode}" novalidate>
      ${reg ? `<div class="field"><label for="r-name">Full name</label><input class="input" id="r-name" name="name" autocomplete="name" required></div>
      <div class="field"><label for="r-phone">Mobile number</label><input class="input" id="r-phone" name="phone" placeholder="+91" autocomplete="tel"></div>` : ""}
      <div class="field"><label for="a-email">Email</label><input class="input" id="a-email" name="email" type="email" autocomplete="email" required></div>
      <div class="field"><label for="a-pass">Password</label><input class="input" id="a-pass" name="password" type="password" autocomplete="${reg?"new-password":"current-password"}" required minlength="6"></div>
      ${reg ? `<label class="small" style="display:flex;gap:8px;align-items:flex-start;margin-bottom:14px"><input type="checkbox" id="r-consent" name="consent" required style="margin-top:4px"> I'm 18 or older and agree to the Terms and Privacy Policy.</label>` : ""}
      <button class="btn btn-dark btn-block" type="submit">${reg ? "Create account" : "Log in"}</button>
    </form>
    <p class="small mt" style="text-align:center">${reg ? `Already have an account? <button class="link" data-go="login">Log in</button>` : `New here? <button class="link" data-go="register">Create an account</button>`}</p>
    ${reg ? "" : `<div class="demo-accts"><p class="small muted">Demo accounts — tap to sign in</p>
      <button data-act="demoLogin" data-who="client"><span><b>Client</b> · aanya@demo.in</span><span class="mono">demo123</span></button>
      <button data-act="demoLogin" data-who="therapist"><span><b>Therapist</b> · meera@mytrm.in</span><span class="mono">therapist123</span></button>
      <button data-act="demoLogin" data-who="admin"><span><b>Admin</b> · admin@mytrm.in</span><span class="mono">admin123</span></button></div>`}
  </div></div>`;
}

/* ---------- assessment ---------- */
const PHQ = ["Feeling nervous, anxious or on edge","Not being able to stop or control worrying","Little interest or pleasure in doing things","Feeling down, depressed or hopeless"];
const FREQ = ["Not at all","Several days","More than half the days","Nearly every day"];
const CONCERNS = ["Anxiety","Low mood","Stress / burnout","Relationships","Family","Self-esteem","Sleep","Grief","Identity","Trauma","Career","Exam stress"];
const STEPS = ["About you","What's on your mind","The last two weeks","Your preferences"];

V.assessment = () => {
  const A = state.assess, d = A.data;
  const existing = state.user && DB.assessments.find(a => a.userId === state.user.id);
  if (A.step === "done" || (A.step === 0 && existing && !A.retake && !state.pending)) return assessmentResult(existing);
  const seg = (field, opts) => `<div class="chips">${opts.map(o => `<button type="button" class="${d[field]===o?"on":""}" data-act="aSet" data-f="${field}" data-v="${esc(o)}">${esc(o)}</button>`).join("")}</div>`;
  let body = "";
  if (A.step === 0) body = `
    <span class="label">Age range</span>${seg("age",["18–21","22–25","26–30","31+"])}
    <span class="label">What do you do?</span>${seg("occupation",["Student","Working professional","Between jobs","Other"])}
    <div class="field mt"><label for="as-city">City (optional)</label><input class="input" id="as-city" data-a="city" value="${esc(d.city||"")}"></div>`;
  if (A.step === 1) body = `
    <span class="label">Pick everything that applies</span>
    <div class="chips">${CONCERNS.map(c => `<button type="button" class="${d.concerns.includes(c)?"on":""}" data-act="aToggle" data-v="${c}">${c}</button>`).join("")}</div>
    <div class="field mt"><label for="as-extra">Anything you'd like your therapist to know? (optional)</label><textarea class="input" id="as-extra" rows="3" data-a="extra">${esc(d.extra||"")}</textarea></div>`;
  if (A.step === 2) body = `
    <p class="small muted">Over the last 2 weeks, how often have you been bothered by the following?</p>
    ${PHQ.map((q,i) => `<div class="q"><p>${q}</p><div class="scale">${FREQ.map((f,v) => `<button type="button" class="${d.phq[i]===v?"on":""}" data-act="aPhq" data-i="${i}" data-v="${v}">${f}</button>`).join("")}</div></div>`).join("")}
    <div class="q" style="border:0"><p>In the last 2 weeks, have you had thoughts that you'd be better off dead or of hurting yourself?</p>${seg("harm",["no","yes"]).replace(/>no</,">No<").replace(/>yes</,">Yes<")}</div>
    ${d.harm === "yes" ? crisisCard() : ""}`;
  if (A.step === 3) body = `
    <span class="label">Preferred language</span>${seg("language",["English","Hindi","Tamil","Bengali","Malayalam","Telugu","Gujarati","Punjabi"])}
    <span class="label">Preferred format</span>${seg("mode",["Video","Audio","Chat","In-person"])}
    <span class="label">Therapist gender</span>${seg("tgender",["No preference","Female","Male"])}
    <span class="label">Budget per session</span>${seg("budget",["Under ₹1,000","₹1,000–₹2,000","Flexible"])}
    <span class="label">Have you had therapy before?</span>${seg("prior",["No","Yes"])}`;
  const pct = ((A.step+1)/STEPS.length)*100;
  const answered = d.phq.filter(v => v !== null), psum = answered.reduce((x,y) => x+y, 0);
  const gMood = d.harm === "yes" ? "low" : A.step === 2 && psum >= 6 ? "calm" : A.step === 3 ? "wow" : "happy";
  const GUIDE = ["Hey, I'm Mitraa! Let's start easy — a little about you.", "What's been taking up space in your head lately? Pick as many as you like.", d.harm === "yes" ? "Thank you for telling me. That took courage. Please look at the helpline below." : "Be honest, nobody's grading this. Just how the last two weeks felt.", "Almost done! Let's find someone who fits your vibe."];
  return `<div class="wrap" style="max-width:720px;padding-block:36px 72px">
    <span class="eyebrow">Check-in · ${A.step+1} of ${STEPS.length}</span>
    <h1 style="font-size:clamp(26px,3vw,34px)">${STEPS[A.step]}</h1>
    <div class="progress"><i style="width:${pct}%"></i></div>
    <div class="guide"><div class="mas">${mascot(gMood)}</div><div class="say" id="guide-say">${GUIDE[A.step]}</div></div>
    <div class="card soft">
      ${state.formError ? `<div class="err" role="alert">${esc(state.formError)}</div>` : ""}
      ${body}
      <div class="row mt" style="justify-content:space-between">
        ${A.step > 0 ? `<button class="btn btn-ghost" data-act="aBack">Back</button>` : `<span class="note">Private · used only to match you and brief your therapist</span>`}
        <button class="btn btn-dark" data-act="aNext">${A.step === 3 ? "See my results" : "Next"}</button>
      </div>
    </div>
    <p class="note mt">This check-in uses the PHQ-4, a short screening questionnaire. It isn't a diagnosis.</p>
  </div>`;
};
function crisisCard(){
  return `<div class="alert bad mt"><b>Thank you for telling us. You don't have to handle this alone.</b><br>Please reach out now: call <b>Tele-MANAS on 14416</b> (free, 24×7, many languages) or <b>112</b> if you're in immediate danger. You can still continue — we'll flag this so your therapist can prioritise your safety.</div>`;
}
function assessmentResult(a){
  a = a || (state.user && DB.assessments.find(x => x.userId === state.user.id));
  if (!a) { state.assess.step = 0; return V.assessment(); }
  const tips = {Minimal:"You're reporting few symptoms right now. Therapy can still help with specific goals, stress or relationships.", Mild:"You're reporting some symptoms. Talking to someone early often stops things from building up.", Moderate:"You're reporting a noticeable level of symptoms. We'd recommend booking a session soon.", Severe:"You're reporting a high level of symptoms. Please book a session soon, and reach out to a helpline if things feel unmanageable."};
  const recs = DB.therapists.filter(t => t.active !== false).map(t => ({t, s:matchScore(t)})).sort((x,y) => y.s - x.s).slice(0,3);
  return `<div class="wrap" style="max-width:980px;padding-block:36px 72px">
    <span class="eyebrow">Your check-in</span>
    <h1 style="font-size:clamp(26px,3vw,34px)">Here's a snapshot of how you've been</h1>
    <div class="grid g2 mt">
      <div class="card soft"><p class="small muted">PHQ-4 score</p><p style="font-size:44px;font-weight:700;line-height:1.1">${a.phq4}<span class="muted" style="font-size:18px"> / 12</span></p><p><span class="pill ${a.band==="Minimal"?"confirmed":a.band==="Mild"?"completed":a.band==="Moderate"?"pending_payment":"cancelled"}">${a.band}</span></p><p class="mt small">${tips[a.band]}</p></div>
      <div class="card soft"><p class="small muted">You told us about</p><div class="tags mt" style="margin-top:8px">${a.data.concerns.map(c => `<span class="tag">${esc(c)}</span>`).join("")}</div>
        <p class="small mt">Prefers <b>${esc(a.data.language)}</b> · <b>${esc(a.data.mode)}</b> · budget <b>${esc(a.data.budget)}</b></p>
        <p class="note mt">Completed ${fmtStamp(a.createdAt)} · <button class="link" data-act="aRetake">Retake</button></p></div>
    </div>
    ${a.flag ? crisisCard() : ""}
    ${state.pending ? `<div class="alert info mt">Your check-in is saved. <button class="link" data-act="resumeBooking">Continue your booking →</button></div>` : ""}
    <h2 class="h2 mt" style="font-size:24px;margin-top:36px;margin-bottom:16px">Suggested for you</h2>
    <div class="grid g3">${recs.map(r => therapistCard(r.t, true)).join("")}</div>
  </div>`;
}

/* ---------- checkout & payment ---------- */
V.checkout = () => {
  const c = state.checkout;
  if (!c) return `<div class="wrap empty">Nothing to pay for. <button class="link" data-go="therapists">Find a therapist</button></div>`;
  const b = byId("bookings", c.booking.id), t = byId("therapists", b.therapistId), p = byId("payments", b.paymentId);
  return `<div class="wrap" style="max-width:880px;padding-block:32px 72px">
    <button class="link" data-act="changeTime" data-id="${b.id}">← Change time</button>
    <h1 class="mt" style="font-size:clamp(26px,3vw,34px)">Review and pay</h1>
    <div class="grid g2 mt" style="align-items:start">
      <div class="card soft">
        <div class="t-top">${avatar(t,52)}<div><h3>${esc(t.name)}</h3><div class="t-sub">${esc(t.title)}</div></div></div>
        <div class="summary mt"><div><span class="muted">Date</span><span>${fmtDate(b.date)}</span></div><div><span class="muted">Time</span><span>${fmtTime(b.time)} IST · 50 min</span></div><div><span class="muted">Format</span><span>${esc(b.mode)}</span></div><div><span class="muted">Booking ID</span><span class="mono">${b.id}</span></div></div>
        <div class="field mt"><label for="c-notes">Note for your therapist (optional)</label><textarea class="input" id="c-notes" rows="3" data-act-input="notes" placeholder="Anything you'd like them to know before you meet">${esc(b.notes)}</textarea></div>
      </div>
      <div class="card soft">
        <h3>Payment summary</h3>
        <div class="summary mt"><div><span class="muted">Session fee</span><span>${inr(b.fee)}</span></div><div><span class="muted">GST (18%)</span><span>${inr(b.gst)}</span></div><div class="tot"><span>Total payable</span><span>${inr(b.amount)}</span></div></div>
        ${p.status === "failed" ? `<div class="alert bad mt">Your last attempt failed. No money was taken. You can try again.</div>` : ""}
        <button class="btn btn-orange btn-block mt" data-act="openPay">Pay ${inr(b.amount)} securely</button>
        <p class="note mt" style="text-align:center">UPI · Cards · Netbanking · Wallets, powered by Razorpay (test mode). Slot held for 10 minutes.</p>
        <div class="flow mt">
          <div><b>1. Create order</b>Server calls Orders API</div><div><b>2. Checkout</b>Customer pays</div><div><b>3. Verify</b>HMAC signature check</div><div><b>4. Confirm</b>Webhook → booking</div>
        </div>
      </div>
    </div>
  </div>`;
};
function payModal(){
  const c = state.checkout, b = byId("bookings", c.booking.id), p = byId("payments", b.paymentId), P = state.pay;
  if (P.busy) return `<div class="modal" role="dialog" aria-label="Processing payment"><div class="modal-b" style="text-align:center;padding:48px 22px"><div class="spinner"></div><h3>Processing ${inr(b.amount)}…</h3><p class="muted small mt">Contacting bank · verifying payment signature</p></div></div>`;
  const tab = P.tab;
  let body;
  if (tab === "UPI") body = `<div class="field"><label for="p-vpa">UPI ID</label><input class="input mono" id="p-vpa" value="success@razorpay"></div><p class="note">Test VPA prefilled. Any UPI app works in production.</p>`;
  else if (tab === "Card") body = `<div class="field"><label for="p-card">Card number</label><input class="input mono" id="p-card" value="4111 1111 1111 1111" inputmode="numeric"></div>
    <div class="grid g2" style="gap:12px"><div class="field"><label for="p-exp">Expiry</label><input class="input mono" id="p-exp" value="12/30"></div><div class="field"><label for="p-cvv">CVV</label><input class="input mono" id="p-cvv" value="123"></div></div><p class="note">Test card prefilled. Never enter a real card here.</p>`;
  else body = `<div class="field"><label for="p-bank">Bank</label><select class="input" id="p-bank"><option>HDFC Bank</option><option>ICICI Bank</option><option>State Bank of India</option><option>Axis Bank</option><option>Kotak Mahindra Bank</option></select></div>`;
  return `<div class="modal" role="dialog" aria-label="Payment">
    <div class="pay-h"><div><b>MYTRM</b><small>Order ${p.orderId}</small></div><div style="text-align:right"><b>${inr(b.amount)}</b><small>Test mode</small></div></div>
    <div class="pay-tabs">${["UPI","Card","Netbanking"].map(x => `<button class="${tab===x?"on":""}" data-act="payTab" data-tab="${x}">${x}</button>`).join("")}</div>
    <div class="modal-b">
      ${P.error ? `<div class="alert bad mb" role="alert">${esc(P.error)}</div>` : ""}
      ${body}
      <span class="label">Simulate result (demo only)</span>
      <div class="seg"><button class="${P.outcome==="success"?"on":""}" data-act="payOutcome" data-v="success">Success</button><button class="${P.outcome==="fail"?"on":""}" data-act="payOutcome" data-v="fail">Failure</button></div>
      <div class="row mt"><button class="btn btn-ghost" data-act="closeModal">Cancel</button><button class="btn btn-dark right" data-act="doPay">Pay ${inr(b.amount)}</button></div>
    </div></div>`;
}

V.confirmation = ({id}) => {
  const b = byId("bookings", id); if (!b) return `<div class="wrap empty">Booking not found.</div>`;
  const t = byId("therapists", b.therapistId), p = byId("payments", b.paymentId);
  return `<div class="wrap" style="max-width:640px;padding-block:48px 72px;text-align:center">
    <div class="check">${I.check}</div>
    <h1 style="font-size:clamp(26px,3vw,34px)">You're booked in</h1>
    <p class="lead" style="margin:10px auto 26px">We've sent the confirmation and receipt to your inbox and ${esc(state.user.email)}. ${esc(t.name)} will see your check-in before you meet.</p>
    <div class="receipt" style="text-align:left">
      <div class="t-top">${avatar(t,48)}<div><h3>${esc(t.name)}</h3><div class="t-sub">${fmtDate(b.date)} · ${fmtTime(b.time)} IST · ${esc(b.mode)}</div></div></div>
      <div class="summary mt">
        <div><span class="muted">Booking ID</span><span class="mono">${b.id}</span></div>
        <div><span class="muted">Order ID</span><span class="mono">${p.orderId}</span></div>
        <div><span class="muted">Payment ID</span><span class="mono">${p.gatewayPaymentId||p.id}</span></div>
        <div><span class="muted">Method</span><span>${esc(p.method)} · <span class="pill captured">Signature verified</span></span></div>
        <div><span class="muted">Session fee</span><span>${inr(b.fee)}</span></div><div><span class="muted">GST</span><span>${inr(b.gst)}</span></div>
        <div class="tot"><span>Paid</span><span>${inr(b.amount)}</span></div>
      </div>
    </div>
    <div class="row mt" style="justify-content:center"><button class="btn btn-dark" data-act="toDash" data-tab="sessions">Go to My space</button><button class="btn btn-ghost" data-act="toDash" data-tab="inbox">View confirmation email</button></div>
  </div>`;
};

/* ---------- client dashboard ---------- */
function sessionRow(b, forRole){
  const t = byId("therapists", b.therapistId), u = byId("users", b.userId), d = parseYmd(b.date);
  const future = sessionTs(b.date, b.time) > Date.now();
  let acts = "";
  if (forRole === "client") {
    if (b.status === "confirmed" && future) acts = `<button class="btn btn-dark btn-sm" data-act="join" data-id="${b.id}">Join session</button><button class="btn btn-ghost btn-sm" data-act="reschedule" data-id="${b.id}">Reschedule</button><button class="btn btn-danger btn-sm" data-act="askCancel" data-id="${b.id}">Cancel</button>`;
    else if (b.status === "pending_payment") acts = `<button class="btn btn-orange btn-sm" data-act="resumePay" data-id="${b.id}">Complete payment</button><button class="btn btn-ghost btn-sm" data-act="askCancel" data-id="${b.id}">Discard</button>`;
    else if (b.status === "completed") acts = `<button class="btn btn-ghost btn-sm" data-go="therapist" data-id="${t.id}">Book again</button>`;
  } else if (forRole === "therapist") {
    if (b.status === "confirmed") acts = `<button class="btn btn-dark btn-sm" data-act="join" data-id="${b.id}">Start session</button>${!future?`<button class="btn btn-ghost btn-sm" data-act="markDone" data-id="${b.id}">Mark completed</button>`:""}`;
  }
  const who = forRole === "therapist" ? `<b>${esc(u.name)}</b><div class="t-sub">${esc(u.email)}</div>` : `<b>${esc(t.name)}</b><div class="t-sub">${esc(t.title)}</div>`;
  return `<div class="card sess">
    <div class="when"><small>${MON[d.getMonth()]}</small><b>${d.getDate()}</b><small>${WD_LABEL[WD[d.getDay()]]}</small></div>
    <div>${who}<div class="t-sub">${fmtTime(b.time)} IST · ${esc(b.mode)} · ${inr(b.amount)} · <span class="pill ${b.status}">${b.status.replace("_"," ")}</span></div>${b.notes?`<div class="small muted">Note: ${esc(b.notes)}</div>`:""}</div>
    <div class="acts">${acts}</div>
  </div>`;
}
V.dashboard = () => {
  const u = state.user;
  const mine = DB.bookings.filter(b => b.userId === u.id).sort((a,b) => sessionTs(a.date,a.time) - sessionTs(b.date,b.time));
  const upcoming = mine.filter(b => ["confirmed","pending_payment"].includes(b.status) && sessionTs(b.date,b.time) > Date.now());
  const past = mine.filter(b => !upcoming.includes(b)).reverse();
  const pays = DB.payments.filter(p => p.userId === u.id && p.status !== "created").sort((a,b) => b.createdAt.localeCompare(a.createdAt));
  const inbox = DB.inbox.filter(m => m.userId === u.id);
  const unread = inbox.filter(m => !m.read).length;
  const a = DB.assessments.find(x => x.userId === u.id);
  const tab = state.dashTab;
  const tabs = [["sessions","Sessions",upcoming.length],["payments","Payments",0],["intake","My check-in",0],["inbox","Inbox",unread],["profile","Profile",0]];
  let body = "";
  if (tab === "sessions") body = `
    <h3 class="mb">Upcoming</h3>
    ${upcoming.length ? `<div class="stack">${upcoming.map(b => sessionRow(b,"client")).join("")}</div>` : `<div class="card empty">No upcoming sessions. <button class="link" data-go="therapists">Book one</button></div>`}
    <h3 class="mb" style="margin-top:32px">Past & cancelled</h3>
    ${past.length ? `<div class="stack">${past.map(b => sessionRow(b,"client")).join("")}</div>` : `<p class="muted">Nothing here yet.</p>`}`;
  if (tab === "payments") body = pays.length ? `<div class="tbl-wrap"><table><thead><tr><th>Date</th><th>Therapist</th><th>Payment ID</th><th>Method</th><th>Status</th><th class="num">Amount</th></tr></thead><tbody>
    ${pays.map(p => { const b = byId("bookings", p.bookingId), t = b && byId("therapists", b.therapistId); return `<tr><td>${fmtStamp(p.createdAt)}</td><td>${esc(t?t.name:"—")}</td><td class="mono">${p.gatewayPaymentId||p.id}</td><td>${esc(p.method||"—")}</td><td><span class="pill ${p.status}">${p.status.replace("_"," ")}</span></td><td class="num">${inr(p.amount)}</td></tr>`; }).join("")}</tbody></table></div>` : `<div class="card empty">No payments yet.</div>`;
  if (tab === "intake") body = a ? `<div class="card soft">
      <div class="row"><div><p class="small muted">PHQ-4 score</p><p style="font-size:30px;font-weight:700">${a.phq4}/12 <span class="pill ${a.band==="Minimal"?"confirmed":a.band==="Mild"?"completed":a.band==="Moderate"?"pending_payment":"cancelled"}">${a.band}</span></p></div><button class="btn btn-ghost btn-sm right" data-act="aRetake">Retake check-in</button></div>
      <div class="summary mt">${[["Age",a.data.age],["Occupation",a.data.occupation],["City",a.data.city||"—"],["Concerns",a.data.concerns.join(", ")],["Language",a.data.language],["Format",a.data.mode],["Therapist gender",a.data.tgender],["Budget",a.data.budget],["Prior therapy",a.data.prior]].map(([k,v]) => `<div><span class="muted">${k}</span><span style="text-align:right">${esc(v)}</span></div>`).join("")}</div>
      ${a.data.extra ? `<p class="small mt"><b>Your note:</b> ${esc(a.data.extra)}</p>` : ""}
      <p class="note mt">Shared only with therapists you book.</p></div>` : `<div class="card empty">You haven't done the check-in yet. <button class="link" data-go="assessment">Start it</button></div>`;
  if (tab === "inbox") body = `<div class="card">${inbox.length ? inbox.map(m => `<div class="inbox-item"><div class="row"><b>${esc(m.subject)}</b>${m.read?"":`<span class="pill pending_payment">New</span>`}<span class="note right">${fmtStamp(m.createdAt)}</span></div><p class="small muted">${esc(m.body)}</p></div>`).join("") : `<p class="empty">No messages.</p>`}</div><p class="note mt">In production these go out by email and SMS/WhatsApp; here they're shown in-app.</p>`;
  if (tab === "profile") body = `<div class="card soft" style="max-width:520px"><form data-form="profile">
      <div class="field"><label for="pf-name">Name</label><input class="input" id="pf-name" name="name" value="${esc(u.name)}"></div>
      <div class="field"><label for="pf-phone">Mobile</label><input class="input" id="pf-phone" name="phone" value="${esc(u.phone||"")}"></div>
      <div class="field"><label for="pf-email">Email</label><input class="input" id="pf-email" value="${esc(u.email)}" disabled></div>
      <button class="btn btn-dark" type="submit">Save changes</button></form></div>`;
  return `<div class="wrap" style="padding-bottom:72px">
    <div class="page-head row"><div><span class="eyebrow">My space</span><h1>Hi ${esc(u.name.split(" ")[0])}</h1></div><button class="btn btn-orange right" data-go="therapists">Book a session</button></div>
    ${!a ? `<div class="alert info mb">Take the 3-minute check-in to get therapist matches. <button class="link" data-go="assessment">Start →</button></div>` : ""}
    <div class="tabs">${tabs.map(([k,l,n]) => `<button class="${tab===k?"on":""}" data-act="dashTab" data-tab="${k}">${l}${n?`<span class="count">${n}</span>`:""}</button>`).join("")}</div>
    ${body}
  </div>`;
};

/* ---------- therapist portal ---------- */
function availEditor(t){
  const hours = []; for (let h = 8; h <= 21; h++) hours.push(pad(h)+":00");
  const days = ["mon","tue","wed","thu","fri","sat","sun"];
  return `<div class="avail tbl-wrap"><table><thead><tr><th>Day</th>${hours.map(h => `<th class="mono" style="font-size:11px">${fmtTime(h).replace(":00","")}</th>`).join("")}</tr></thead><tbody>
    ${days.map(d => `<tr><th>${WD_LABEL[d]}</th>${hours.map(h => `<td><button class="slotbtn ${(t.availability[d]||[]).includes(h)?"on":""}" data-act="toggleAvail" data-tid="${t.id}" data-day="${d}" data-time="${h}" aria-label="${WD_LABEL[d]} ${fmtTime(h)}">${(t.availability[d]||[]).includes(h)?"✓":""}</button></td>`).join("")}</tr>`).join("")}
  </tbody></table></div>
  <div class="row mt"><button class="btn btn-ghost btn-sm" data-act="copyWeekday" data-tid="${t.id}">Copy Monday to weekdays</button><button class="btn btn-ghost btn-sm" data-act="clearAvail" data-tid="${t.id}">Clear all</button><span class="note right">${Object.values(t.availability).reduce((a,x) => a + x.length, 0)} weekly slots · saves automatically</span></div>
  <h3 class="mt" style="margin-top:28px">Days off</h3>
  <p class="small muted mb">Block a date for leave or holidays. Existing bookings stay.</p>
  <div class="row"><input type="date" class="input" id="block-${t.id}" style="max-width:200px" min="${ymd(new Date())}"><button class="btn btn-dark btn-sm" data-act="blockDate" data-tid="${t.id}">Block date</button></div>
  <div class="tags mt">${(t.blocked||[]).sort().map(d => `<span class="tag">${fmtDate(d)} <button class="link" style="text-decoration:none" data-act="unblock" data-tid="${t.id}" data-date="${d}" aria-label="Unblock">×</button></span>`).join("") || `<span class="note">No days blocked.</span>`}</div>`;
}
V.portal = () => {
  const u = state.user, t = byId("therapists", u.therapistId);
  if (!t) return `<div class="wrap empty">No therapist profile linked to this account.</div>`;
  const bk = DB.bookings.filter(b => b.therapistId === t.id && b.status !== "pending_payment").sort((a,b) => sessionTs(a.date,a.time) - sessionTs(b.date,b.time));
  const up = bk.filter(b => b.status === "confirmed");
  const done = bk.filter(b => b.status === "completed");
  const earn = done.concat(up).reduce((a,b) => a + b.fee, 0);
  const inbox = DB.inbox.filter(m => m.userId === u.id);
  const tab = state.portalTab;
  let body = "";
  if (tab === "schedule") body = `<div class="grid g3 mb">
      <div class="card kpi"><div class="k">Upcoming</div><div class="v">${up.length}</div><div class="d">confirmed sessions</div></div>
      <div class="card kpi"><div class="k">Completed</div><div class="v">${done.length}</div><div class="d">all time</div></div>
      <div class="card kpi"><div class="k">Earnings booked</div><div class="v">${inr(earn)}</div><div class="d">before platform commission</div></div></div>
    <h3 class="mb">Sessions</h3>${bk.length ? `<div class="stack">${bk.map(b => sessionRow(b,"therapist")).join("")}</div>` : `<div class="card empty">No sessions yet.</div>`}`;
  if (tab === "availability") body = `<div class="card soft"><h3>Weekly hours</h3><p class="small muted mb">Tap a cell to open or close a 50-minute slot. Clients see changes immediately.</p>${availEditor(t)}</div>`;
  if (tab === "profile") body = therapistForm(t, "portalProfile");
  if (tab === "inbox") body = `<div class="card">${inbox.length ? inbox.map(m => `<div class="inbox-item"><div class="row"><b>${esc(m.subject)}</b><span class="note right">${fmtStamp(m.createdAt)}</span></div><p class="small muted">${esc(m.body)}</p></div>`).join("") : `<p class="empty">No notifications yet. New bookings show up here.</p>`}</div>`;
  return `<div class="wrap" style="padding-bottom:72px">
    <div class="page-head row">${avatar(t,56)}<div><span class="eyebrow">Therapist portal</span><h1>${esc(t.name)}</h1></div><button class="btn btn-ghost right" data-go="therapist" data-id="${t.id}">View public profile</button></div>
    <div class="tabs">${[["schedule","Schedule"],["availability","Availability"],["profile","Profile"],["inbox","Notifications"]].map(([k,l]) => `<button class="${tab===k?"on":""}" data-act="portalTab" data-tab="${k}">${l}</button>`).join("")}</div>
    ${body}
  </div>`;
};
function therapistForm(t, formName){
  t = t || {name:"",title:"",quals:"",exp:1,city:"",gender:"Female",langs:["English"],specialties:[],modes:["Video"],fee:1000,bio:"",approach:[]};
  return `<div class="card soft"><form data-form="${formName}" data-tid="${t.id||""}">
    <div class="grid g2" style="gap:0 16px">
      <div class="field"><label for="tf-name">Name</label><input class="input" id="tf-name" name="name" value="${esc(t.name)}" required></div>
      <div class="field"><label for="tf-title">Title</label><input class="input" id="tf-title" name="title" value="${esc(t.title)}" required></div>
      <div class="field"><label for="tf-quals">Qualifications</label><input class="input" id="tf-quals" name="quals" value="${esc(t.quals)}"></div>
      <div class="field"><label for="tf-city">City</label><input class="input" id="tf-city" name="city" value="${esc(t.city)}"></div>
      <div class="field"><label for="tf-exp">Years of experience</label><input class="input" id="tf-exp" name="exp" type="number" min="0" value="${t.exp}"></div>
      <div class="field"><label for="tf-fee">Fee per session (₹)</label><input class="input" id="tf-fee" name="fee" type="number" min="100" step="50" value="${t.fee}"></div>
      <div class="field"><label for="tf-gender">Gender</label><select class="input" id="tf-gender" name="gender">${["Female","Male","Non-binary"].map(g => `<option ${t.gender===g?"selected":""}>${g}</option>`).join("")}</select></div>
      <div class="field"><label for="tf-modes">Formats (comma separated)</label><input class="input" id="tf-modes" name="modes" value="${esc(t.modes.join(", "))}"></div>
      <div class="field"><label for="tf-langs">Languages (comma separated)</label><input class="input" id="tf-langs" name="langs" value="${esc(t.langs.join(", "))}"></div>
      <div class="field"><label for="tf-spec">Specialties (comma separated)</label><input class="input" id="tf-spec" name="specialties" value="${esc(t.specialties.join(", "))}"></div>
    </div>
    <div class="field"><label for="tf-approach">Approach (comma separated)</label><input class="input" id="tf-approach" name="approach" value="${esc(t.approach.join(", "))}"></div>
    <div class="field"><label for="tf-bio">Bio</label><textarea class="input" id="tf-bio" name="bio" rows="3">${esc(t.bio)}</textarea></div>
    <button class="btn btn-dark" type="submit">${t.id ? "Save profile" : "Add therapist"}</button>
  </form></div>`;
}

/* ---------- admin ---------- */
V.admin = () => {
  const tab = state.adminTab;
  const tabs = [["overview","Overview"],["users","Users"],["therapists","Therapists"],["bookings","Bookings"],["payments","Payments"],["settings","Settings"]];
  return `<div class="wrap admin">
    <aside class="side">${tabs.map(([k,l]) => `<button class="${tab===k?"on":""}" data-act="adminTab" data-tab="${k}">${l}</button>`).join("")}</aside>
    <div style="min-width:0">${A[tab]()}</div>
  </div>`;
};
const A = {};
A.overview = () => {
  const cap = DB.payments.filter(p => p.status === "captured"), ref = DB.payments.filter(p => p.status === "refunded");
  const rev = cap.reduce((a,p) => a + p.amount, 0);
  const upcoming = DB.bookings.filter(b => b.status === "confirmed" && sessionTs(b.date,b.time) > Date.now()).length;
  const statuses = ["confirmed","completed","pending_payment","cancelled"];
  const counts = statuses.map(s => [s, DB.bookings.filter(b => b.status === s).length]);
  const max = Math.max(1, ...counts.map(c => c[1]));
  const byT = DB.therapists.map(t => [t, DB.bookings.filter(b => b.therapistId === t.id && b.status !== "cancelled" && b.status !== "pending_payment").length]).sort((a,b) => b[1]-a[1]).slice(0,5);
  const recent = DB.bookings.slice().sort((a,b) => b.createdAt.localeCompare(a.createdAt)).slice(0,6);
  return `<h1 style="font-size:28px" class="mb">Overview</h1>
  <div class="grid g4">
    <div class="card kpi"><div class="k">Clients</div><div class="v">${DB.users.filter(u => u.role==="client").length}</div><div class="d">${DB.assessments.length} completed check-in</div></div>
    <div class="card kpi"><div class="k">Therapists</div><div class="v">${DB.therapists.filter(t => t.active!==false).length}</div><div class="d">${DB.therapists.filter(t => t.active===false).length} inactive</div></div>
    <div class="card kpi"><div class="k">Upcoming sessions</div><div class="v">${upcoming}</div><div class="d">${DB.bookings.length} bookings total</div></div>
    <div class="card kpi"><div class="k">Revenue (captured)</div><div class="v">${inr(rev)}</div><div class="d">${ref.length} refunded · ${inr(ref.reduce((a,p)=>a+p.amount,0))}</div></div>
  </div>
  <div class="grid g2 mt">
    <div class="card"><h3 class="mb">Bookings by status</h3><div class="bars">${counts.map(([s,n]) => `<div class="bar"><span>${s.replace("_"," ")}</span><div class="track"><i style="width:${(n/max)*100}%"></i></div><span class="num" style="text-align:right">${n}</span></div>`).join("")}</div></div>
    <div class="card"><h3 class="mb">Busiest therapists</h3><div class="bars">${byT.map(([t,n]) => `<div class="bar"><span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(t.name)}</span><div class="track"><i style="width:${(n/Math.max(1,byT[0][1]))*100}%;background:var(--ink)"></i></div><span style="text-align:right">${n}</span></div>`).join("")}</div></div>
  </div>
  ${DB.assessments.some(a => a.flag) ? `<div class="alert bad mt"><b>${DB.assessments.filter(a => a.flag).length} check-in(s) flagged for risk.</b> Clinical lead should review and reach out. <button class="link" data-act="adminTab" data-tab="users">View users</button></div>` : ""}
  <h3 class="mt mb" style="margin-top:28px">Recent bookings</h3>${bookingTable(recent)}`;
};
function bookingTable(list){
  if (!list.length) return `<div class="card empty">No bookings match.</div>`;
  return `<div class="tbl-wrap"><table><thead><tr><th>Booking</th><th>Client</th><th>Therapist</th><th>When</th><th>Format</th><th>Status</th><th class="num">Amount</th><th>Actions</th></tr></thead><tbody>
  ${list.map(b => { const u = byId("users", b.userId), t = byId("therapists", b.therapistId); return `<tr>
    <td class="mono">${b.id}</td><td>${esc(u?u.name:"—")}</td><td>${esc(t?t.name:"—")}</td><td>${fmtDate(b.date)} · ${fmtTime(b.time)}</td><td>${esc(b.mode)}</td>
    <td><span class="pill ${b.status}">${b.status.replace("_"," ")}</span></td><td class="num">${inr(b.amount)}</td>
    <td><div class="acts">${b.status==="confirmed"?`<button class="btn btn-ghost btn-sm" data-act="markDone" data-id="${b.id}">Complete</button><button class="btn btn-danger btn-sm" data-act="adminCancel" data-id="${b.id}">Cancel & refund</button>`:b.status==="pending_payment"?`<button class="btn btn-danger btn-sm" data-act="adminCancel" data-id="${b.id}">Release slot</button>`:`<span class="note">—</span>`}</div></td></tr>`; }).join("")}
  </tbody></table></div>`;
}
A.users = () => {
  const q = state.adminQ.toLowerCase();
  const list = DB.users.filter(u => !q || (u.name+" "+u.email).toLowerCase().includes(q));
  return `<div class="row mb"><h1 style="font-size:28px">Users</h1><input class="input right" id="admin-q" data-admin-q style="max-width:260px" placeholder="Search name or email" value="${esc(state.adminQ)}"></div>
  <div class="tbl-wrap"><table><thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Role</th><th>Check-in</th><th class="num">Sessions</th><th>Status</th><th>Actions</th></tr></thead><tbody>
  ${list.map(u => { const a = DB.assessments.find(x => x.userId === u.id); const n = DB.bookings.filter(b => b.userId === u.id && b.status !== "cancelled").length; return `<tr>
    <td><b>${esc(u.name)}</b></td><td>${esc(u.email)}</td><td>${esc(u.phone||"—")}</td><td>${u.role}</td>
    <td>${a ? `<span class="pill ${a.flag?"cancelled":"completed"}">${a.band} · ${a.phq4}${a.flag?" · flagged":""}</span>` : `<span class="note">—</span>`}</td>
    <td class="num">${n}</td><td><span class="pill ${u.active?"active":"disabled"}">${u.active?"active":"disabled"}</span></td>
    <td>${u.role==="admin"?`<span class="note">—</span>`:`<button class="btn btn-ghost btn-sm" data-act="toggleUser" data-id="${u.id}">${u.active?"Disable":"Enable"}</button>`}</td></tr>`; }).join("")}
  </tbody></table></div>`;
};
A.therapists = () => `<div class="row mb"><h1 style="font-size:28px">Therapists</h1><button class="btn btn-dark right" data-act="addTherapist">Add therapist</button></div>
  <div class="tbl-wrap"><table><thead><tr><th>Therapist</th><th>City</th><th>Languages</th><th class="num">Fee</th><th class="num">Weekly slots</th><th class="num">Bookings</th><th>Status</th><th>Actions</th></tr></thead><tbody>
  ${DB.therapists.map(t => `<tr><td><div class="row" style="gap:10px;flex-wrap:nowrap">${avatar(t,32)}<div><b>${esc(t.name)}</b><div class="t-sub">${esc(t.title)}</div></div></div></td><td>${esc(t.city)}</td><td>${t.langs.map(esc).join(", ")}</td><td class="num">${inr(t.fee)}</td>
    <td class="num">${Object.values(t.availability).reduce((a,x)=>a+x.length,0)}</td><td class="num">${DB.bookings.filter(b=>b.therapistId===t.id&&b.status!=="cancelled").length}</td>
    <td><span class="pill ${t.active!==false?"active":"disabled"}">${t.active!==false?"listed":"hidden"}</span></td>
    <td><div class="acts"><button class="btn btn-ghost btn-sm" data-act="editTherapist" data-id="${t.id}">Edit</button><button class="btn btn-ghost btn-sm" data-act="editAvail" data-id="${t.id}">Availability</button><button class="btn btn-ghost btn-sm" data-act="toggleTherapist" data-id="${t.id}">${t.active!==false?"Hide":"List"}</button></div></td></tr>`).join("")}
  </tbody></table></div>`;
A.bookings = () => {
  const s = state.adminStatus, q = state.adminQ.toLowerCase();
  const list = DB.bookings.filter(b => (!s || b.status === s) && (!q || (b.id + " " + (byId("users",b.userId)||{}).name + " " + (byId("therapists",b.therapistId)||{}).name).toLowerCase().includes(q))).sort((a,b) => sessionTs(b.date,b.time) - sessionTs(a.date,a.time));
  return `<div class="row mb"><h1 style="font-size:28px">Bookings</h1>
    <div class="row right" style="gap:8px"><select class="input" id="admin-status" data-admin-status style="max-width:180px"><option value="">All statuses</option>${["confirmed","completed","pending_payment","cancelled"].map(x => `<option value="${x}" ${s===x?"selected":""}>${x.replace("_"," ")}</option>`).join("")}</select>
    <input class="input" id="admin-q" data-admin-q style="max-width:220px" placeholder="Search" value="${esc(state.adminQ)}"></div></div>
  ${bookingTable(list)}`;
};
A.payments = () => {
  const list = DB.payments.slice().sort((a,b) => b.createdAt.localeCompare(a.createdAt));
  const sum = st => list.filter(p => p.status === st).reduce((a,p) => a + p.amount, 0);
  return `<h1 style="font-size:28px" class="mb">Payments</h1>
  <div class="grid g4 mb">
    <div class="card kpi"><div class="k">Captured</div><div class="v">${inr(sum("captured"))}</div></div>
    <div class="card kpi"><div class="k">Refunded</div><div class="v">${inr(sum("refunded"))}</div></div>
    <div class="card kpi"><div class="k">Failed attempts</div><div class="v">${list.filter(p => p.status==="failed").length}</div></div>
    <div class="card kpi"><div class="k">GST collected</div><div class="v">${inr(DB.bookings.filter(b => { const p = byId("payments", b.paymentId); return p && p.status==="captured"; }).reduce((a,b) => a + b.gst, 0))}</div></div>
  </div>
  <div class="tbl-wrap"><table><thead><tr><th>Created</th><th>Order ID</th><th>Payment ID</th><th>Client</th><th>Method</th><th>Status</th><th class="num">Amount</th><th>Actions</th></tr></thead><tbody>
  ${list.map(p => { const u = byId("users", p.userId); return `<tr><td>${fmtStamp(p.createdAt)}</td><td class="mono">${p.orderId}</td><td class="mono">${p.gatewayPaymentId||p.id}</td><td>${esc(u?u.name:"—")}</td><td>${esc(p.method||"—")}</td><td><span class="pill ${p.status}">${p.status.replace("_"," ")}</span></td><td class="num">${inr(p.amount)}</td>
    <td>${p.status==="captured"?`<button class="btn btn-danger btn-sm" data-act="refund" data-id="${p.id}">Refund</button>`:`<span class="note">—</span>`}</td></tr>`; }).join("")}
  </tbody></table></div>`;
};
A.settings = () => `<h1 style="font-size:28px" class="mb">Settings</h1>
  <div class="grid g2">
    <div class="card"><h3>Payment gateway</h3><p class="mb">Razorpay · <span class="pill pending_payment">${esc(ENV.PAYMENT_MODE)}</span> · env <b>${esc(ENV.APP_ENV)}</b></p>
      <div class="summary"><div><span class="muted">Key ID</span><span class="mono">${esc(String(ENV.RAZORPAY_KEY_ID).slice(0,9))}••••••••</span></div><div><span class="muted">Webhook</span><span class="mono">/api/webhooks/razorpay</span></div><div><span class="muted">Events</span><span class="small">payment.captured, payment.failed, refund.processed</span></div><div><span class="muted">GST on sessions</span><span>18%</span></div></div>
      <p class="note mt">Go-live: add live keys on the server, enable webhooks and switch off the "simulate result" toggle.</p></div>
    <div class="card"><h3>Policies</h3><div class="summary mt"><div><span class="muted">Session length</span><span>50 min</span></div><div><span class="muted">Free cancellation</span><span>≥ 24 h before</span></div><div><span class="muted">Minimum booking notice</span><span>2 h</span></div><div><span class="muted">Booking window</span><span>14 days</span></div></div></div>
    <div class="card"><h3>Demo data</h3><p class="mb">Resets all users, bookings and payments in this browser to the starting sample set.</p><button class="btn btn-danger" data-act="askReset">Reset demo data</button></div>
  </div>`;

/* ---------- render ---------- */
function guard(){
  const r = state.route.name, u = state.user;
  if (["dashboard","checkout","confirmation"].includes(r) && !u) { state.route = {name:"login", params:{}}; }
  if (r === "admin" && (!u || u.role !== "admin")) state.route = {name: u ? "home" : "login", params:{}};
  if (r === "portal" && (!u || u.role !== "therapist")) state.route = {name: u ? "home" : "login", params:{}};
}
let lastKey = "";
function render(){
  guard();
  const ae = document.activeElement, focusId = ae && ae.id, sel = ae && typeof ae.selectionStart === "number" ? ae.selectionStart : null;
  const r = state.route;
  const main = (V[r.name] || V.home)(r.params || {});
  const key = r.name + JSON.stringify(r.params || {}), fresh = key !== lastKey; lastKey = key;
  $("#app").innerHTML = nav() + `<main class="${fresh ? "page-in" : ""}">${main}</main>` + footer();
  renderBuddy(); afterRender();
  $("#modal-root").innerHTML = state.modal ? `<div class="overlay" data-overlay>${state.modal()}</div>` : "";
  if (focusId) { const el = document.getElementById(focusId); if (el && el.tagName !== "BUTTON") { el.focus(); if (sel !== null && el.setSelectionRange) try { el.setSelectionRange(sel, sel); } catch(e){} } }
}
let toastTimer;
function toast(msg){ const t = $("#toast"); t.textContent = msg; t.hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => t.hidden = true, 3200); }
function openModal(fn){ state.modal = fn; render(); }
function closeModal(){ state.modal = null; state.pay.error = ""; render(); }
function confirmBox(title, text, okLabel, onOk, danger=true){
  openModal(() => `<div class="modal" role="dialog" aria-label="${esc(title)}"><div class="modal-h"><h3>${esc(title)}</h3><button class="x" data-act="closeModal" aria-label="Close">×</button></div>
    <div class="modal-b"><p>${text}</p><div class="row mt"><button class="btn btn-ghost" data-act="closeModal">Keep it</button><button class="btn ${danger?"btn-danger":"btn-dark"} right" data-act="confirmOk">${esc(okLabel)}</button></div></div></div>`);
  state.onConfirm = onOk;
}

/* ---------- auth helpers ---------- */
async function signIn(u){
  state.user = u; ls.set(SKEY, {userId:u.id});
  if (state.assessDraft && state.assess.step === 3 && u.role === "client") {
    state.assessDraft = false;
    await api.saveAssessment(u.id, JSON.parse(JSON.stringify(state.assess.data)));
    state.assess = {step:"done", data:{concerns:[], phq:[null,null,null,null]}};
    toast("Signed in · check-in saved");
    if (state.pending) return resumeBooking();
    return go("assessment");
  }
  if (state.pending && u.role === "client") return resumeBooking();
  go(u.role === "admin" ? "admin" : u.role === "therapist" ? "portal" : "dashboard");
  toast("Signed in as " + u.name);
}
const DEMO = {client:["aanya@demo.in","demo123"], therapist:["meera@mytrm.in","therapist123"], admin:["admin@mytrm.in","admin123"]};

async function resumeBooking(){
  const p = state.pending; if (!p) return go("therapists");
  if (!state.user) return go("login");
  if (!DB.assessments.some(a => a.userId === state.user.id)) {
    state.assess = {step:0, data:{concerns:[], phq:[null,null,null,null]}, retake:true};
    toast("Quick check-in first — it helps your therapist prepare");
    return go("assessment");
  }
  try {
    const res = await api.createOrder({userId:state.user.id, ...p});
    state.pending = null; state.checkout = res; go("checkout");
  } catch(e) { state.pending = null; toast(e.message); go("therapist", {id:p.therapistId}); }
}

/* ---------- actions ---------- */
const act = {
  mood(el){ state.mood = el.dataset.k; render(); },
  moodGo(el){ const m = MOODS.find(x => x.k === el.dataset.k); if (m.to === "therapists") { state.filters = {q:"", spec:m.spec||"", lang:"", mode:"", budget:m.budget||"", sort:"match"}; } go(m.to); },
  buddy(){ state.buddyTip = !state.buddyTip; renderBuddy(); },
  buddyGo(){ state.buddyTip = false; state.buddyDismissed = true; go("assessment"); },
  buddyX(){ state.buddyTip = false; state.buddyDismissed = true; renderBuddy(); },
  menu(){ state.menuOpen = !state.menuOpen; render(); },
  scrollTo(el){ const id = el.dataset.id; const doScroll = () => { const t = document.getElementById(id); if (t) t.scrollIntoView({behavior:"smooth", block:"start"}); };
    if (state.route.name !== "home") { go("home"); setTimeout(doScroll, 30); } else { state.menuOpen = false; render(); doScroll(); } },
  logout(){ state.user = null; ls.del(SKEY); state.pending = null; state.checkout = null; go("home"); toast("Logged out"); },
  async demoLogin(el){ const [e,p] = DEMO[el.dataset.who]; try { signIn(await api.login(e,p)); } catch(err){ toast(err.message); } },
  filterSpec(el){ state.filters = {q:"",spec:el.dataset.spec,lang:"",mode:"",budget:"",sort:"match"}; go("therapists"); },
  clearFilters(){ state.filters = {q:"",spec:"",lang:"",mode:"",budget:"",sort:state.filters.sort}; render(); },
  pickMode(el){ state.picker.mode = el.dataset.mode; render(); },
  pickDate(el){ state.picker.date = el.dataset.date; state.picker.time = null; render(); },
  pickTime(el){ state.picker.time = el.dataset.time; render(); },
  startBooking(){
    const p = state.picker; if (!p.time) return;
    state.pending = {therapistId:p.tid, date:p.date, time:p.time, mode:p.mode};
    if (!state.user) { toast("Log in or create an account to continue"); return go("login"); }
    if (state.user.role !== "client") { state.pending = null; return toast("Switch to a client account to book sessions"); }
    resumeBooking();
  },
  resumeBooking(){ resumeBooking(); },
  changeTime(el){ const b = byId("bookings", el.dataset.id); const tid = b.therapistId;
    if (b.status === "pending_payment") { DB.payments = DB.payments.filter(p => p.id !== b.paymentId); DB.bookings = DB.bookings.filter(x => x.id !== b.id); save(); }
    state.checkout = null; go("therapist", {id:tid}); },
  openPay(){ state.pay = {tab:"UPI", outcome:"success", busy:false, error:""}; openModal(payModal); },
  payTab(el){ state.pay.tab = el.dataset.tab; render(); },
  payOutcome(el){ state.pay.outcome = el.dataset.v; render(); },
  async doPay(){
    const c = state.checkout, b = byId("bookings", c.booking.id);
    state.pay.busy = true; state.pay.error = ""; render();
    try {
      await api.capturePayment(b.paymentId, state.pay.tab, state.pay.outcome === "success");
      state.pay.busy = false; state.modal = null; state.checkout = null;
      go("confirmation", {id:b.id}); toast("Payment successful · booking confirmed");
    } catch(e) { state.pay.busy = false; state.pay.error = e.message; render(); }
  },
  closeModal(){ if (state.pay.busy) return; closeModal(); },
  confirmOk(){ const f = state.onConfirm; state.onConfirm = null; state.modal = null; if (f) f(); else render(); },
  resumePay(el){ const b = byId("bookings", el.dataset.id); state.checkout = {booking:b, payment:byId("payments", b.paymentId)}; go("checkout"); },
  askCancel(el){
    const b = byId("bookings", el.dataset.id), t = byId("therapists", b.therapistId);
    const hrs = (sessionTs(b.date,b.time) - Date.now())/3600e3;
    const msg = b.status === "pending_payment" ? "This releases the held slot. You haven't been charged." : hrs >= 24 ? `Your session with ${esc(t.name)} on ${fmtDate(b.date)} will be cancelled and <b>${inr(b.amount)}</b> refunded in full.` : `This session is less than 24 hours away, so it <b>isn't refundable</b>. You can reschedule instead.`;
    confirmBox("Cancel this session?", msg, "Cancel session", async () => { const r = await api.cancelBooking(b.id, "client"); render(); toast(r.refunded ? "Cancelled · refund initiated" : "Session cancelled"); });
  },
  reschedule(el){
    const b = byId("bookings", el.dataset.id), t = byId("therapists", b.therapistId);
    state.picker = {tid:t.id, date:null, time:null, mode:b.mode, bookingId:b.id};
    openModal(() => `<div class="modal wide" role="dialog" aria-label="Reschedule"><div class="modal-h"><h3>Reschedule with ${esc(t.name)}</h3><button class="x" data-act="closeModal" aria-label="Close">×</button></div>
      <div class="modal-b"><p class="small muted mb">Currently ${fmtDate(b.date)} at ${fmtTime(b.time)}. Pick a new time — no extra charge.</p>${slotPicker(t,"resched")}
      <div class="row mt"><button class="btn btn-ghost" data-act="closeModal">Keep current time</button><button class="btn btn-dark right" data-act="doResched" ${state.picker.time?"":"disabled"}>Confirm new time</button></div></div></div>`);
  },
  async doResched(){ const p = state.picker; try { await api.reschedule(p.bookingId, p.date, p.time); state.modal = null; render(); toast("Rescheduled to " + fmtDate(p.date) + ", " + fmtTime(p.time)); } catch(e){ toast(e.message); } },
  join(el){ const b = byId("bookings", el.dataset.id); openModal(() => `<div class="modal" role="dialog" aria-label="Session room"><div class="modal-h"><h3>Session room</h3><button class="x" data-act="closeModal" aria-label="Close">×</button></div><div class="modal-b"><div class="alert info">In production this opens a secure ${esc(b.mode.toLowerCase())} room (for example via a HIPAA/DPDP-compliant video provider) 10 minutes before ${fmtTime(b.time)} on ${fmtDate(b.date)}.</div><p class="mono small mt">room: mytrm.live/${b.id}</p></div></div>`); },
  async markDone(el){ const b = byId("bookings", el.dataset.id); b.status = "completed"; save(); render(); toast("Marked as completed"); },
  toDash(el){ state.dashTab = el.dataset.tab; if (el.dataset.tab === "inbox") markRead(); go("dashboard"); },
  dashTab(el){ state.dashTab = el.dataset.tab; if (el.dataset.tab === "inbox") markRead(); render(); },
  portalTab(el){ state.portalTab = el.dataset.tab; if (el.dataset.tab === "inbox") markRead(); render(); },
  /* assessment */
  aSet(el){ state.assess.data[el.dataset.f] = el.dataset.v; state.formError = ""; render(); },
  aToggle(el){ const c = state.assess.data.concerns, v = el.dataset.v; const i = c.indexOf(v); i >= 0 ? c.splice(i,1) : c.push(v); state.formError = ""; render(); },
  aPhq(el){ state.assess.data.phq[+el.dataset.i] = +el.dataset.v; state.formError = ""; render(); },
  aBack(){ state.assess.step--; state.formError = ""; render(); },
  async aNext(){
    const A = state.assess, d = A.data;
    const need = [["age","occupation"],["concerns"],["phq","harm"],["language","mode","tgender","budget","prior"]][A.step];
    const missing = need.some(k => k === "concerns" ? !d.concerns.length : k === "phq" ? d.phq.some(v => v === null) : !d[k]);
    if (missing) { state.formError = A.step === 1 ? "Pick at least one thing you'd like help with." : "Answer every question on this step to continue."; return render(); }
    state.formError = "";
    if (A.step < 3) { A.step++; render(); window.scrollTo(0,0); return; }
    if (!state.user) { toast("Create a free account to save your check-in"); state.assessDraft = true; return go("register"); }
    await api.saveAssessment(state.user.id, JSON.parse(JSON.stringify(d)));
    state.assess = {step:"done", data:{concerns:[], phq:[null,null,null,null]}};
    if (state.pending) return resumeBooking();
    render(); window.scrollTo(0,0);
  },
  aRetake(){ state.assess = {step:0, data:{concerns:[], phq:[null,null,null,null]}, retake:true}; go("assessment"); },
  /* therapist availability */
  toggleAvail(el){ const t = byId("therapists", el.dataset.tid), d = el.dataset.day, h = el.dataset.time; const arr = t.availability[d] = t.availability[d] || []; const i = arr.indexOf(h); i >= 0 ? arr.splice(i,1) : arr.push(h); arr.sort(); save(); render(); },
  copyWeekday(el){ const t = byId("therapists", el.dataset.tid); for (const d of ["tue","wed","thu","fri"]) t.availability[d] = t.availability.mon.slice(); save(); render(); toast("Monday's hours copied to Tue–Fri"); },
  clearAvail(el){ const t = byId("therapists", el.dataset.tid); for (const d in t.availability) t.availability[d] = []; save(); render(); toast("All weekly slots cleared"); },
  blockDate(el){ const t = byId("therapists", el.dataset.tid), v = document.getElementById("block-"+t.id).value; if (!v) return toast("Pick a date first"); t.blocked = t.blocked || []; if (!t.blocked.includes(v)) t.blocked.push(v); save(); render(); toast("Blocked " + fmtDate(v)); },
  unblock(el){ const t = byId("therapists", el.dataset.tid); t.blocked = t.blocked.filter(d => d !== el.dataset.date); save(); render(); },
  /* admin */
  adminTab(el){ state.adminTab = el.dataset.tab; state.adminQ = ""; state.adminStatus = ""; render(); },
  toggleUser(el){ const u = byId("users", el.dataset.id); u.active = !u.active; save(); render(); toast(u.name + (u.active ? " enabled" : " disabled")); },
  toggleTherapist(el){ const t = byId("therapists", el.dataset.id); t.active = t.active === false; save(); render(); toast(t.name + (t.active ? " is listed" : " is hidden from clients")); },
  adminCancel(el){ const b = byId("bookings", el.dataset.id); confirmBox(b.status === "pending_payment" ? "Release this slot?" : "Cancel and refund?", b.status === "pending_payment" ? "The unpaid hold will be removed." : `Booking ${b.id} will be cancelled and ${inr(b.amount)} refunded to the client.`, "Confirm", async () => { await api.cancelBooking(b.id, "admin"); render(); toast("Booking cancelled"); }); },
  refund(el){ const p = byId("payments", el.dataset.id); confirmBox("Refund payment?", `Refund ${inr(p.amount)} for order ${p.orderId}? The booking will be cancelled.`, "Refund", async () => { const b = byId("bookings", p.bookingId); if (b && b.status !== "cancelled") await api.cancelBooking(b.id, "admin"); else { p.status = "refunded"; save(); } render(); toast("Refund initiated"); }); },
  editTherapist(el){ const t = byId("therapists", el.dataset.id); openModal(() => `<div class="modal wide" role="dialog" aria-label="Edit therapist"><div class="modal-h"><h3>Edit ${esc(t.name)}</h3><button class="x" data-act="closeModal" aria-label="Close">×</button></div><div class="modal-b" style="padding:0">${therapistForm(t, "adminTherapist").replace('class="card soft"','style="padding:22px"')}</div></div>`); },
  addTherapist(){ openModal(() => `<div class="modal wide" role="dialog" aria-label="Add therapist"><div class="modal-h"><h3>Add therapist</h3><button class="x" data-act="closeModal" aria-label="Close">×</button></div><div class="modal-b" style="padding:0">${therapistForm(null, "adminTherapist").replace('class="card soft"','style="padding:22px"')}</div></div>`); },
  editAvail(el){ const id = el.dataset.id; openModal(() => { const t = byId("therapists", id); return `<div class="modal wide" role="dialog" aria-label="Availability"><div class="modal-h"><h3>Availability · ${esc(t.name)}</h3><button class="x" data-act="closeModal" aria-label="Close">×</button></div><div class="modal-b">${availEditor(t)}</div></div>`; }); },
  askReset(){ confirmBox("Reset demo data?", "All accounts, bookings and payments created in this browser will be replaced with the original sample set.", "Reset", () => { DB = seed(); save(); state.user = null; ls.del(SKEY); go("home"); toast("Demo data reset"); }); }
};
function markRead(){ if (!state.user) return; DB.inbox.forEach(m => { if (m.userId === state.user.id) m.read = true; }); save(); }

/* ---------- forms ---------- */
const splitList = s => String(s||"").split(",").map(x => x.trim()).filter(Boolean);
const forms = {
  async login(f, fd){
    try { signIn(await api.login(fd.get("email")||"", fd.get("password")||"")); }
    catch(e){ state.authError = e.message; render(); }
  },
  async register(f, fd){
    if (!fd.get("consent")) { state.authError = "Please confirm you're 18 or older and agree to the terms."; return render(); }
    try {
      const u = await api.register({name:fd.get("name")||"", email:fd.get("email")||"", phone:fd.get("phone")||"", password:fd.get("password")||""});
      await signIn(u);
    } catch(e){ state.authError = e.message; render(); }
  },
  profile(f, fd){ const u = byId("users", state.user.id); u.name = (fd.get("name")||u.name).trim(); u.phone = (fd.get("phone")||"").trim(); state.user = u; save(); render(); toast("Profile saved"); },
  portalProfile(f, fd){ applyTherapist(byId("therapists", state.user.therapistId), fd); save(); render(); toast("Profile saved · visible to clients now"); },
  adminTherapist(f, fd){
    let t = f.dataset.tid ? byId("therapists", f.dataset.tid) : null;
    if (!t) { t = {id:uid("t"), rating:5.0, reviews:0, color:["#C4621A","#7A3E1D","#9B4D16","#D0752B"][DB.therapists.length%4], availability:{mon:[],tue:[],wed:[],thu:[],fri:[],sat:[],sun:[]}, blocked:[], active:true}; DB.therapists.push(t); }
    applyTherapist(t, fd); save(); state.modal = null; render(); toast(t.name + " saved");
  }
};
function applyTherapist(t, fd){
  t.name = (fd.get("name")||"").trim() || t.name || "New therapist"; t.title = (fd.get("title")||"").trim(); t.quals = (fd.get("quals")||"").trim(); t.city = (fd.get("city")||"").trim();
  t.exp = +fd.get("exp") || 0; t.fee = Math.max(100, +fd.get("fee") || 1000); t.gender = fd.get("gender");
  t.modes = splitList(fd.get("modes")); if (!t.modes.length) t.modes = ["Video"];
  t.langs = splitList(fd.get("langs")); if (!t.langs.length) t.langs = ["English"];
  t.specialties = splitList(fd.get("specialties")); t.approach = splitList(fd.get("approach")); t.bio = (fd.get("bio")||"").trim();
}

/* ---------- event wiring ---------- */
document.addEventListener("click", e => {
  if (e.target.matches && e.target.matches("[data-overlay]")) { act.closeModal(); return; }
  const g = e.target.closest("[data-go]");
  if (g) { e.preventDefault(); return go(g.dataset.go, g.dataset.id ? {id:g.dataset.id} : {}); }
  const a = e.target.closest("[data-act]");
  if (a && act[a.dataset.act] && !a.disabled) { e.preventDefault(); act[a.dataset.act](a); }
});
document.addEventListener("submit", e => {
  const f = e.target; if (!f.dataset.form) return;
  e.preventDefault(); forms[f.dataset.form](f, new FormData(f));
});
let qTimer;
document.addEventListener("input", e => {
  const el = e.target;
  if (el.dataset.filter === "q") { state.filters.q = el.value; clearTimeout(qTimer); qTimer = setTimeout(render, 180); }
  if (el.dataset.a) state.assess.data[el.dataset.a] = el.value;
  if (el.hasAttribute("data-admin-q")) { state.adminQ = el.value; clearTimeout(qTimer); qTimer = setTimeout(render, 180); }
  if (el.dataset.actInput === "notes" && state.checkout) { const b = byId("bookings", state.checkout.booking.id); b.notes = el.value; clearTimeout(qTimer); qTimer = setTimeout(save, 400); }
});
document.addEventListener("change", e => {
  const el = e.target;
  if (el.dataset.filter && el.dataset.filter !== "q") { state.filters[el.dataset.filter] = el.value; render(); }
  if (el.hasAttribute("data-admin-status")) { state.adminStatus = el.value; render(); }
});
document.addEventListener("keydown", e => { if (e.key === "Escape" && state.modal) act.closeModal(); });

initialRoute();
render();
setupMotion();
})();
