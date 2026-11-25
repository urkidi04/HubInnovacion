// Admisibilidad de CC-nóminas por infotipo y por estructura organizativa.
// Regla (igual que SAP, clase CL_HRPAD00_WTYP_PERMISSIBILITY):
//   1) la CC-nómina está en T512Z para el infotipo;
//   2) existe en T511 vigente;
//   3) T511-WKTYZ en la posición T001P-WKTYP (agrupación de subdivisión) es 1 (ok) o 2 (aviso);
//      si la subdivisión no tiene agrupación, no se restringe;
//   4) T511-ABTYZ en la posición T503-ABTYP (agrupación del área de personal) es 1 o 2.
(() => {
  const CFG = window.APP_CONFIG || {};
  const DOMAIN = (CFG.ALLOWED_DOMAIN || "bafar.com.mx").toLowerCase();
  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
  const fdate = d => d ? d.split("-").reverse().join("/") : "";

  let sb = null, rows = [], infotipos = [], view = "list", sort = {k:"infty", dir:1};
  let perm = new Map(), subs = [], areas = [];

  function status(t, err){ const s=$("status"); s.textContent=t||""; s.classList.toggle("err", !!err); }

  // ---------- reglas ----------
  const at = (z, n) => (z || "").charAt(+n);
  function wkState(lgart, sub){            // "ok" | "warn" | "no" | "t511"
    const p = perm.get(lgart); if(!p) return "t511";
    if(!sub.wktyp) return "ok";
    const c = at(p.wktyz, sub.wktyp); return c==="1" ? "ok" : c==="2" ? "warn" : "no";
  }
  function abState(lgart, abtyp){
    const p = perm.get(lgart); if(!p) return "t511";
    if(!/^[0-9]$/.test(abtyp||"")) return "no";
    const c = at(p.abtyz, abtyp); return c==="1" ? "ok" : c==="2" ? "warn" : "no";
  }
  const worst = (a, b) => { const o={ok:0,warn:1,no:2,t511:3}; return o[a]>=o[b]?a:b; };
  const PILL = {ok:'<span class="pill ok">Permitida</span>', warn:'<span class="pill warn">Con aviso</span>', no:'<span class="pill no">No permitida</span>', t511:'<span class="pill no">Sin T511</span>'};

  function subCount(lgart){
    let n=0; for(const s of subs){ const w=wkState(lgart,s); if(w==="ok"||w==="warn") n++; } return n;
  }

  // ---------- filtros ----------
  function filtered(){
    const it = $("fInfty").value, q = $("fText").value.trim().toLowerCase();
    return rows.filter(r => (!it || r.infty === it) &&
      (!q || r.lgart.toLowerCase().includes(q) || (r.lgtxt||"").toLowerCase().includes(q)));
  }
  function hl(text){
    const q = $("fText").value.trim(); const s = esc(text);
    if(!q) return s;
    const t = String(text??""), i = t.toLowerCase().indexOf(q.toLowerCase());
    if(i < 0) return s;
    return esc(t.slice(0,i)) + "<mark>" + esc(t.slice(i,i+q.length)) + "</mark>" + esc(t.slice(i+q.length));
  }

  // ---------- estructura seleccionada ----------
  function orgSel(){
    const b=$("oBukrs").value, w=$("oWerks").value, t=$("oBtrtl").value, g=$("oPersg").value, k=$("oPersk").value;
    const ss = subs.filter(s => (!b||s.bukrs===b) && (!w||s.werks===w) && (!t||s.btrtl===t));
    const aa = areas.filter(a => (!g||a.persg===g) && (!k||a.persk===k));
    return {b,w,t,g,k,ss,aa, anyArea: !!(g||k)};
  }
  function fillOrg(){
    const keep = id => $(id).value;
    const b=keep("oBukrs"), w=keep("oWerks"), t=keep("oBtrtl"), g=keep("oPersg"), k=keep("oPersk");
    const opt = (v,l,sel) => `<option value="${esc(v)}" ${v===sel?"selected":""}>${esc(l)}</option>`;
    const uniq = (arr, key) => { const m=new Map(); arr.forEach(x=>{ if(!m.has(key(x))) m.set(key(x),x); }); return [...m.values()]; };
    $("oBukrs").innerHTML = opt("","Todas",b) + uniq(subs, s=>s.bukrs).sort((x,y)=>(x.bukrs||"").localeCompare(y.bukrs||"")).map(s=>opt(s.bukrs, `${s.bukrs} · ${s.butxt||""}`, b)).join("");
    const sw = subs.filter(s=>!$("oBukrs").value||s.bukrs===$("oBukrs").value);
    $("oWerks").innerHTML = opt("","Todas",w) + uniq(sw, s=>s.werks).sort((x,y)=>x.werks.localeCompare(y.werks)).map(s=>opt(s.werks, `${s.werks} · ${s.name1||""}`, w)).join("");
    if(![...$("oWerks").options].some(o=>o.value===w)) $("oWerks").value="";
    const st = sw.filter(s=>!$("oWerks").value||s.werks===$("oWerks").value);
    $("oBtrtl").innerHTML = opt("","Todas",t) + st.sort((x,y)=>(x.werks+x.btrtl).localeCompare(y.werks+y.btrtl)).map(s=>opt(s.btrtl, `${s.btrtl} · ${s.btext||""}`, t)).join("");
    if(![...$("oBtrtl").options].some(o=>o.value===t)) $("oBtrtl").value="";
    $("oPersg").innerHTML = opt("","Todos",g) + uniq(areas, a=>a.persg).map(a=>opt(a.persg, `${a.persg} · ${a.gtext||""}`, g)).join("");
    const ak = areas.filter(a=>!$("oPersg").value||a.persg===$("oPersg").value);
    $("oPersk").innerHTML = opt("","Todas",k) + ak.map(a=>opt(a.persk, `${a.persk} · ${a.ktext||""}${$("oPersg").value?"":" ("+a.persg+")"}`, k)).join("");
    if(![...$("oPersk").options].some(o=>o.value===k)) $("oPersk").value="";
  }

  // estado de una fila (infotipo+CC-nómina) para la estructura seleccionada
  function orgState(r, o){
    if(!perm.has(r.lgart)) return {st:"t511", n:0, of:o.ss.length};
    let n=0, best="no";
    for(const s of o.ss){ const w=wkState(r.lgart,s); if(w==="ok"||w==="warn"){ n++; best = best==="ok"?"ok":(w==="ok"?"ok":"warn"); } }
    let st = n ? best : "no";
    if(o.anyArea && st!=="no"){
      let a="no"; for(const x of o.aa){ const s2=abState(r.lgart,x.abtyp); if(s2==="ok"){a="ok";break;} if(s2==="warn") a="warn"; }
      st = a==="no" ? "no" : worst(st,a);
    }
    return {st, n, of:o.ss.length};
  }

  // ---------- render ----------
  function renderKpis(){
    const sel = $("fInfty").value;
    let h = `<div class="kpi total"><b>TOTAL</b><span>Registros admisibles</span><strong>${rows.length}</strong></div>`;
    for(const it of infotipos){
      h += `<button class="kpi" data-it="${it.infty}" aria-pressed="${sel===it.infty}" title="${esc(it.itext)}"><b>IT ${it.infty}</b><span>${esc(it.itext)}</span><strong>${it.n}</strong></button>`;
    }
    $("kpis").innerHTML = h;
  }

  function sortRows(list, extra){
    const k = sort.k, d = sort.dir;
    const val = r => k==="subs" ? String(subCount(r.lgart)).padStart(4,"0") : k==="st" ? extra.get(r).st : String(r[k]??"");
    return [...list].sort((a,b) => val(a).localeCompare(val(b),"es") * d || a.lgart.localeCompare(b.lgart) || a.infty.localeCompare(b.infty));
  }
  function head(cols){
    let h = "<table><thead><tr>";
    cols.forEach(([c,t,cl]) => h += `<th data-k="${c}" class="${cl||""}" ${c===sort.k?`aria-sort="${sort.dir>0?"ascending":"descending"}"`:""}>${t}</th>`);
    return h + "</tr></thead><tbody>";
  }

  function renderList(list){
    const total = subs.length;
    let h = head([["infty","Infotipo"],["itext","Texto infotipo"],["lgart","CC-nómina"],["lgtxt","Texto CC-nómina"],["subs","Subdivisiones permitidas","num"],["begda","Inicio validez"],["endda","Fin validez"]]);
    for(const r of sortRows(list)){
      const n = perm.has(r.lgart) ? subCount(r.lgart) : null;
      h += `<tr class="clk" data-lg="${esc(r.lgart)}" title="Clic para ver sociedades, divisiones y subdivisiones"><td class="code">${r.infty}</td><td>${esc(r.itext)}</td><td class="code">${hl(r.lgart)}</td>` +
           (r.lgtxt ? `<td>${hl(r.lgtxt)}</td>` : `<td class="na">sin texto en T512T</td>`) +
           `<td class="num">${n===null?PILL.t511:`${n} de ${total}`}</td>` +
           `<td class="code">${fdate(r.begda)}</td><td class="code">${fdate(r.endda)}</td></tr>`;
    }
    $("sheet").innerHTML = h + "</tbody></table>";
  }

  function renderOrg(list){
    const o = orgSel();
    const ex = new Map(list.map(r => [r, orgState(r,o)]));
    const showNo = $("oNo").checked;
    let shown = list.filter(r => showNo || ["ok","warn"].includes(ex.get(r).st));
    const many = o.ss.length !== 1;
    let h = head([["infty","Infotipo"],["itext","Texto infotipo"],["lgart","CC-nómina"],["lgtxt","Texto CC-nómina"],["st","¿Se puede capturar?"]].concat(many?[["subs",`Subdivisiones (de ${o.ss.length})`,"num"]]:[]));
    for(const r of sortRows(shown, ex)){
      const e = ex.get(r);
      h += `<tr class="clk" data-lg="${esc(r.lgart)}"><td class="code">${r.infty}</td><td>${esc(r.itext)}</td><td class="code">${hl(r.lgart)}</td>` +
           (r.lgtxt ? `<td>${hl(r.lgtxt)}</td>` : `<td class="na">sin texto</td>`) + `<td>${PILL[e.st]}</td>` +
           (many ? `<td class="num">${e.st==="t511"?"–":e.n}</td>` : "") + "</tr>";
    }
    $("sheet").innerHTML = h + "</tbody></table>";
    return shown;
  }

  function renderMatrix(list){
    const its = infotipos.filter(it => !$("fInfty").value || it.infty === $("fInfty").value);
    const by = new Map();
    for(const r of list){
      if(!by.has(r.lgart)) by.set(r.lgart, {lgart:r.lgart, lgtxt:r.lgtxt, set:new Set()});
      by.get(r.lgart).set.add(r.infty);
    }
    const lg = [...by.values()].sort((a,b) => a.lgart.localeCompare(b.lgart));
    let h = `<table class="mx"><thead><tr><th class="sticky" style="cursor:default">CC-nómina</th><th style="cursor:default">Texto</th>`;
    its.forEach(it => h += `<th class="it" title="${esc(it.itext)}"><small>${it.infty}</small> ${esc(it.itext)}</th>`);
    h += `<th class="num" style="cursor:default">IT</th></tr></thead><tbody>`;
    for(const w of lg){
      h += `<tr class="clk" data-lg="${esc(w.lgart)}"><td class="sticky code">${hl(w.lgart)}</td>` + (w.lgtxt?`<td>${hl(w.lgtxt)}</td>`:`<td class="na">sin texto</td>`);
      its.forEach(it => { const y = w.set.has(it.infty); h += `<td class="c ${y?"y":""}" title="${w.lgart} · IT ${it.infty}">${y?"✓":""}</td>`; });
      h += `<td class="num">${w.set.size}</td></tr>`;
    }
    $("sheet").innerHTML = h + "</tbody></table>";
  }

  function render(){
    renderKpis();
    $("orgBar").hidden = view !== "org";
    let list = filtered();
    if(view === "list") renderList(list);
    else if(view === "matrix") renderMatrix(list);
    else { fillOrg(); const s = renderOrg(list); const o = orgSel();
      status(`${s.length} registros · ${o.ss.length} subdivisiones en la selección`); return; }
    status(`${list.length} registros · ${new Set(list.map(r => r.lgart)).size} CC-nóminas`);
  }

  // ---------- detalle de una CC-nómina ----------
  function openDetail(lgart){
    const rs = rows.filter(r => r.lgart === lgart);
    const p = perm.get(lgart);
    $("dlgT").textContent = `${lgart} · ${rs[0]?.lgtxt || "sin texto"}`;
    $("dlgS").textContent = "Infotipos: " + rs.map(r => `${r.infty} ${r.itext||""}`).join(" · ");
    let h = "";
    if(!p){
      h = `<p>${PILL.t511} Esta CC-nómina está en T512Z pero no tiene registro vigente en T511, así que SAP no permite capturarla en ninguna estructura.</p>`;
    } else {
      // grupos de personal
      const ok = [], wr = [];
      const byG = new Map();
      for(const a of areas){ const s=abState(lgart,a.abtyp); if(!byG.has(a.persg)) byG.set(a.persg,{g:a.persg,t:a.gtext,ok:0,warn:0,n:0}); const x=byG.get(a.persg); x.n++; if(s==="ok") x.ok++; else if(s==="warn") x.warn++; }
      h += `<h3>Grupos de personal (por agrupación de áreas de personal, T503-ABTYP)</h3><div class="chips">`;
      for(const x of byG.values()){
        const st = x.ok===x.n ? "ok" : (x.ok+x.warn)===0 ? "no" : "warn";
        const lbl = st==="ok" ? "todas sus áreas" : st==="no" ? "ninguna área" : `${x.ok+x.warn} de ${x.n} áreas`;
        h += `<span class="pill ${st}" title="${esc(x.t)}">${x.g} · ${esc(x.t)}: ${lbl}</span>`;
      }
      h += `</div>`;
      // sociedades
      const bySoc = new Map();
      for(const s of subs){
        const k = s.bukrs||"—"; if(!bySoc.has(k)) bySoc.set(k,{b:k,t:s.butxt,list:[],ok:0});
        const st = wkState(lgart,s), e = bySoc.get(k); e.list.push([s,st]); if(st==="ok"||st==="warn") e.ok++;
      }
      const socs = [...bySoc.values()].sort((a,b) => (b.ok>0)-(a.ok>0) || a.b.localeCompare(b.b));
      const nOk = socs.filter(s=>s.ok).length;
      h += `<h3>Sociedades, divisiones y subdivisiones (T001P-WKTYP) · ${nOk} de ${socs.length} sociedades con al menos una subdivisión</h3>`;
      for(const s of socs){
        h += `<details class="soc" ${socs.length<=3?"open":""}><summary>${esc(s.b)} · ${esc(s.t||"")}<span>${s.ok} de ${s.list.length} subdivisiones</span></summary><ul>`;
        for(const [x,st] of s.list.sort((a,b)=>(a[0].werks+a[0].btrtl).localeCompare(b[0].werks+b[0].btrtl))){
          const okk = st==="ok"||st==="warn";
          h += `<li class="${okk?"":"n"}">${okk?(st==="warn"?"⚠ ":"✓ "):""}${esc(x.werks)} ${esc(x.name1||"")} / ${esc(x.btrtl)} ${esc(x.btext||"")}</li>`;
        }
        h += `</ul></details>`;
      }
      h += `<p class="hint">T511 · WKTYZ «${esc(p.wktyz)}» · ABTYZ «${esc(p.abtyz)}». Cada posición (0–9) es una agrupación: 1 permitida, 2 permitida con aviso, vacío no permitida.</p>`;
    }
    $("dlgB").innerHTML = h;
    $("dlg").showModal();
  }
  $("dlgX").addEventListener("click", () => $("dlg").close());

  // ---------- eventos ----------
  $("kpis").addEventListener("click", e => {
    const b = e.target.closest("button.kpi"); if(!b) return;
    $("fInfty").value = $("fInfty").value === b.dataset.it ? "" : b.dataset.it; render();
  });
  $("fInfty").addEventListener("change", render);
  let t; $("fText").addEventListener("input", () => { clearTimeout(t); t = setTimeout(render, 150); });
  ["oBukrs","oWerks","oBtrtl","oPersg","oPersk","oNo"].forEach(id => $(id).addEventListener("change", render));
  document.querySelector(".modes").addEventListener("click", e => {
    const b = e.target.closest("button[data-view]"); if(!b) return;
    view = b.dataset.view;
    document.querySelectorAll(".modes button").forEach(x => x.setAttribute("aria-pressed", x === b));
    render();
  });
  $("sheet").addEventListener("click", e => {
    const th = e.target.closest("th[data-k]");
    if(th){ sort = {k: th.dataset.k, dir: sort.k === th.dataset.k ? -sort.dir : 1}; render(); return; }
    const tr = e.target.closest("tr[data-lg]"); if(tr) openDetail(tr.dataset.lg);
  });

  // ---------- Excel ----------
  $("btnXlsx").addEventListener("click", () => {
    const X = window.XLSX; if(!X){ status("Cargando librería de Excel…"); return; }
    const list = filtered();
    const hdr = {font:{bold:true}, fill:{patternType:"solid", fgColor:{rgb:"E7EEFA"}}, alignment:{wrapText:true, vertical:"top"}};
    const wb = X.utils.book_new();
    const add = (name, aoa, widths) => {
      const ws = X.utils.aoa_to_sheet(aoa);
      for(let C=0; C<aoa[0].length; C++) ws[X.utils.encode_cell({r:0,c:C})].s = hdr;
      ws["!cols"] = widths.map(w => ({wch:w})); ws["!freeze"] = {xSplit:0, ySplit:1};
      X.utils.book_append_sheet(wb, ws, name);
    };
    add("Catálogo", [["Infotipo","Texto infotipo","CC-nómina","Texto CC-nómina","Subdivisiones permitidas","Inicio validez","Fin validez"],
      ...list.map(r => [r.infty, r.itext||"", r.lgart, r.lgtxt||"", perm.has(r.lgart)?subCount(r.lgart):"Sin T511", fdate(r.begda), fdate(r.endda)])], [9,34,11,40,14,13,13]);
    if(view === "org"){
      const o = orgSel(), lbl = {ok:"Permitida",warn:"Con aviso",no:"No permitida",t511:"Sin T511"};
      add("Por estructura", [["Infotipo","Texto infotipo","CC-nómina","Texto CC-nómina","¿Se puede capturar?","Subdivisiones de la selección"],
        ...list.map(r => { const e=orgState(r,o); return [r.infty, r.itext||"", r.lgart, r.lgtxt||"", lbl[e.st], e.n]; })], [9,34,11,40,18,16]);
      if(o.ss.length <= 40){
        const lgs = [...new Set(list.map(r=>r.lgart))].sort();
        add("Detalle subdivisiones", [["CC-nómina","Texto","Sociedad","Texto sociedad","División","Texto división","Subdivisión","Texto subdivisión","¿Permitida?"],
          ...lgs.flatMap(lg => o.ss.map(s => { const st=wkState(lg,s); const r=list.find(x=>x.lgart===lg); return [lg, r?.lgtxt||"", s.bukrs||"", s.butxt||"", s.werks, s.name1||"", s.btrtl, s.btext||"", lbl[st]]; }))],
          [11,34,9,28,9,22,11,24,14]);
      }
    }
    const its = infotipos.filter(it => !$("fInfty").value || it.infty === $("fInfty").value);
    const by = new Map();
    list.forEach(r => { if(!by.has(r.lgart)) by.set(r.lgart,{lgtxt:r.lgtxt, s:new Set()}); by.get(r.lgart).s.add(r.infty); });
    add("Matriz", [["CC-nómina","Texto", ...its.map(i => i.infty+" "+i.itext)],
      ...[...by.entries()].sort((x,y)=>x[0].localeCompare(y[0])).map(([k,v]) => [k, v.lgtxt||"", ...its.map(i => v.s.has(i.infty)?"X":"")])], [11,40, ...its.map(()=>12)]);
    X.writeFile(wb, "Admisibilidad CC-nominas K8E.xlsx");
  });

  // ---------- datos ----------
  async function fetchAll(table, cols, orderCols){
    const all = []; let from = 0;
    while(true){
      let q = sb.from(table).select(cols); orderCols.forEach(c => q = q.order(c));
      const {data, error} = await q.range(from, from + 999);
      if(error) throw error;
      all.push(...data); if(data.length < 1000) break; from += 1000;
    }
    return all;
  }
  async function load(){
    status("Cargando…");
    let a, b, c, d;
    try{
      [a, b, c, d] = await Promise.all([
        fetchAll("ccnom_admisibilidad", "sistema,molga,infty,itext,lgart,lgtxt,begda,endda,extraido", ["infty","lgart"]),
        fetchAll("ccnom_lgart_perm", "lgart,wktyz,abtyz,begda,endda", ["lgart"]),
        fetchAll("ccnom_subdivisiones", "bukrs,butxt,werks,name1,btrtl,btext,wktyp", ["bukrs","werks","btrtl"]),
        fetchAll("ccnom_areas", "persg,gtext,persk,ktext,abtyp", ["persg","persk"])
      ]);
    } catch(error){ $("app").hidden = true; $("setup").hidden = false; $("setupErr").textContent = error.message; status("Base sin preparar", true); return; }
    if(!a.length){ $("app").hidden = true; $("setup").hidden = false; $("setupErr").textContent = "La tabla ccnom_admisibilidad está vacía."; status(""); return; }
    rows = a; perm = new Map(b.map(x => [x.lgart, x])); subs = c; areas = d;
    const m = new Map();
    rows.forEach(r => { if(!m.has(r.infty)) m.set(r.infty, {infty:r.infty, itext:r.itext||"", n:0}); m.get(r.infty).n++; });
    infotipos = [...m.values()].sort((x,y) => x.infty.localeCompare(y.infty));
    $("fInfty").innerHTML = '<option value="">Todos los infotipos</option>' + infotipos.map(i => `<option value="${i.infty}">${i.infty} · ${esc(i.itext)}</option>`).join("");
    const r0 = rows[0], ext = new Date(r0.extraido);
    $("sub").textContent = `SAP HCM · T512Z, T511, T001P, T503 · sistema ${r0.sistema} · agrupación de países ${r0.molga} (México)`;
    $("foot").textContent = `Datos extraídos de ${r0.sistema} el ${ext.toLocaleDateString("es-MX",{day:"numeric",month:"long",year:"numeric"})}. ` +
      `Una CC-nómina se puede capturar si está en T512Z para el infotipo y en T511 está permitida para la agrupación de la subdivisión (T001P-WKTYP) y la del área de personal (T503-ABTYP), igual que la validación estándar de SAP. ` +
      `Clic en un renglón para ver dónde se permite. Programa equivalente en SAP: ZHRRE_ADMISIB_CCNOM.`;
    $("setup").hidden = true; $("app").hidden = false;
    render();
  }

  // ---------- acceso ----------
  function showLogin(){ $("login").hidden = false; $("app").hidden = true; $("who").hidden = true; $("btnOut").hidden = true; }
  function showApp(email){ $("login").hidden = true; $("who").hidden = false; $("who").textContent = (email||"").toLowerCase(); $("btnOut").hidden = false; }
  $("btnMs").addEventListener("click", async () => {
    $("msMsg").textContent = "Abriendo Microsoft…";
    const {error} = await sb.auth.signInWithOAuth({provider:"azure", options:{scopes:"email", redirectTo:location.href.split("#")[0].split("?")[0]}});
    if(error) $("msMsg").textContent = "Error: " + error.message;
  });
  $("loginForm").addEventListener("submit", async ev => {
    ev.preventDefault();
    const email = $("loginEmail").value.trim().toLowerCase();
    if(!email.endsWith("@" + DOMAIN)){ $("loginMsg").textContent = "Usa tu correo @" + DOMAIN; return; }
    $("loginMsg").textContent = "Enviando…";
    const {error} = await sb.auth.signInWithOtp({email, options:{emailRedirectTo:location.href.split("#")[0]}});
    $("loginMsg").textContent = error ? ("No se pudo enviar el correo (" + error.message + "). Usa «Entrar con Microsoft».") : "Listo. Revisa tu correo y abre el enlace en este navegador.";
  });
  $("btnOut").addEventListener("click", async () => { await sb.auth.signOut(); rows = []; showLogin(); status(""); });

  async function start(){
    if(!(CFG.SUPABASE_URL && CFG.SUPABASE_ANON_KEY && window.supabase)){ status("Falta config.js de Supabase", true); return; }
    sb = window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY);
    let loaded = false;
    sb.auth.onAuthStateChange((_e, session) => {
      if(session){
        if(!(session.user.email||"").toLowerCase().endsWith("@" + DOMAIN)){ sb.auth.signOut(); showLogin(); $("loginMsg").textContent = "Solo correos @" + DOMAIN; return; }
        showApp(session.user.email); if(!loaded){ loaded = true; load(); }
      } else { loaded = false; showLogin(); }
    });
    const {data} = await sb.auth.getSession(); if(!data.session) showLogin();
  }
  start();
})();
