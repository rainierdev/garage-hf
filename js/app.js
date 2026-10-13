(async function () {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const U = window.HF, esc = U.esc;

  const ICONS = {
    lavagem: '<path d="M7 16a5 5 0 0 1 10 0"/><path d="M12 3c2 3 4 5 4 7a4 4 0 0 1-8 0c0-2 2-4 4-7z"/><path d="M3 21h18"/>',
    polimento: '<circle cx="12" cy="14" r="7"/><circle cx="12" cy="14" r="3"/><path d="M12 7V3M9 3h6"/>',
    higienizacao: '<path d="M6 20V9a3 3 0 0 1 3-3h6a3 3 0 0 1 3 3v11"/><path d="M4 20h16M6 14h12"/><path d="M19 3l1 2 2 1-2 1-1 2-1-2-2-1 2-1z"/>',
    cristalizacao: '<path d="M3 16c3-6 15-6 18 0l-2 3H5z"/><path d="M8 9l1 2M12 8v2M16 9l-1 2"/>',
    farois: '<path d="M14 5a7 7 0 0 1 0 14H9V5z"/><path d="M2 8h4M2 12h4M2 16h4"/>',
    padrao: '<path d="M12 2l3 6 6 1-4.5 4 1 6.5L12 16l-5.5 3.5 1-6.5L3 9l6-1z"/>'
  };

  let cfg = await (async () => { await Store.init(); return Store.getConfig(); })();
  let busy = await Store.getBusy();

  const sel = { servicos: new Set(), veiculo: null, data: null, hora: null };
  let step = 1;
  const CAT_CODE = { h: 'hatch', s: 'sedan', u: 'suv', p: 'pickup' };

  /* ========== lista de carros ========== */
  const CARS = [];
  Object.entries(window.HF_CARS).forEach(([marca, str]) => str.split('|').forEach((p) => {
    const [modelo, c] = p.split(':');
    CARS.push({ marca: marca.replace(/ \(clássicos\)/, ''), grupo: marca, modelo, cat: CAT_CODE[c] });
  }));
  const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

  /* ========== helpers ========== */
  const activeServices = () => cfg.services.filter((s) => s.ativo !== false);
  const catById = (id) => cfg.categorias.find((c) => c.id === id);
  const chosen = () => activeServices().filter((s) => sel.servicos.has(s.id));
  const totalDur = () => chosen().reduce((a, s) => a + Number(s.duracao), 0);
  const totalPrice = () => chosen().reduce((a, s) => a + U.preco(s, sel.veiculo && catById(sel.veiculo.cat)), 0);
  const waLink = (num, txt) => 'https://wa.me/' + U.soDigitos(num) + (txt ? '?text=' + encodeURIComponent(txt) : '');
  const fmtPhone = (n) => { const d = U.soDigitos(n).replace(/^55/, ''); return d.length === 11 ? `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}` : n; };
  function toast(msg, type = '') { const t = document.createElement('div'); t.className = 'toast ' + type; t.textContent = msg; document.body.appendChild(t); setTimeout(() => t.remove(), 2900); }

  /* ========== conteúdo dinâmico ========== */
  function renderStatic() {
    const s = cfg.settings;
    const ticker = activeServices().map((x) => `<span>${esc(x.nome)}</span>`).join('');
    $('#ticker').innerHTML = ticker + ticker + ticker + ticker;

    $('#svcGrid').innerHTML = activeServices().map((x, i) => `
      <article class="svc-card morph" data-morph style="--i:${i}">
        <div class="svc-icon"><svg viewBox="0 0 24 24">${ICONS[x.id] || ICONS.padrao}</svg></div>
        <h3>${esc(x.nome)}</h3>
        <p>${esc(x.descricao || '')}</p>
        <div class="svc-meta">
          <div><small>a partir de</small><span class="svc-price">${U.brl(x.preco)}</span></div>
          <span class="svc-time">⏱ ${U.dur(Number(x.duracao))}</span>
        </div>
        <button class="btn btn-ghost btn-block" data-book="${esc(x.id)}">Agendar este serviço</button>
      </article>`).join('');

    const w = waLink(s.whatsapp, 'Olá! Vim pelo site da ' + s.nomeLoja + ' e gostaria de tirar uma dúvida.');
    $('#fabWhats').href = w; $('#cBtn').href = w;
    $('#cWhats').href = w; $('#cWhats').textContent = fmtPhone(s.whatsapp);
    const ig = 'https://instagram.com/' + String(s.instagram || '').replace('@', '');
    $('#cInsta').href = ig; $('#cInsta').textContent = '@' + String(s.instagram || '').replace('@', '');
    $('#instaLink').href = ig;
    $('#cEnd').textContent = s.endereco;
    $('#cHoras').innerHTML = horariosTexto();
    $('#ano').textContent = new Date().getFullYear();
    $('[data-count="5"]') && ($('[data-count="5"]').dataset.count = activeServices().length);
    observeMorph();
  }

  function horariosTexto() {
    // agrupa dias consecutivos com o mesmo horário
    const ordem = [1, 2, 3, 4, 5, 6, 0], out = [];
    let grp = null;
    ordem.forEach((d) => {
      const sc = cfg.schedule[d], key = sc.aberto ? sc.inicio + '–' + sc.fim : 'Fechado';
      if (grp && grp.key === key) grp.fim = d; else { grp = { key, ini: d, fim: d }; out.push(grp); }
    });
    return out.map((g) => {
      const n = (d) => U.diaSemana[d].slice(0, 3);
      return (g.ini === g.fim ? n(g.ini) : n(g.ini) + ' a ' + n(g.fim)) + ': ' + g.key.replace('–', ' às ');
    }).join('<br>');
  }

  /* ========== efeitos de rolagem ========== */
  const prog = $('.scroll-progress span'), nav = $('#nav'), proc = $('[data-process]');
  let morphEls = [];
  function observeMorph() { morphEls = $$('[data-morph]'); onScroll(); }
  function onScroll() {
    const y = scrollY, vh = innerHeight, max = document.documentElement.scrollHeight - vh;
    prog.style.transform = `scaleX(${max > 0 ? y / max : 0})`;
    document.documentElement.style.setProperty('--hero', Math.min(1, y / vh).toFixed(3));
    nav.classList.toggle('scrolled', y > 40);
    for (const el of morphEls) {
      const r = el.getBoundingClientRect();
      if (r.top > vh + 100 || r.bottom < -100) continue;
      const p = Math.max(0, Math.min(1, (vh - r.top) / (vh * 0.55)));
      el.style.setProperty('--p', p.toFixed(3));
    }
    if (proc) {
      const r = proc.getBoundingClientRect();
      const p = Math.max(0, Math.min(1, -r.top / (r.height - vh)));
      proc.style.setProperty('--p', p.toFixed(3));
      const items = $$('.process-steps li', proc);
      const n = Math.min(items.length, Math.floor(p * items.length * 1.05) + 1);
      items.forEach((li, i) => li.classList.toggle('on', i < n));
    }
  }
  let ticking = false;
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(() => { onScroll(); ticking = false; }); } }, { passive: true });
  addEventListener('resize', onScroll);

  const io = new IntersectionObserver((ents) => ents.forEach((e) => {
    if (!e.isIntersecting) return;
    e.target.classList.add('in');
    const c = e.target.querySelector('[data-count]');
    if (c) countUp(c);
    io.unobserve(e.target);
  }), { threshold: 0.15 });
  $$('.reveal').forEach((el) => io.observe(el));

  function countUp(el) {
    const to = Number(el.dataset.count), suf = el.dataset.suffix || '', t0 = performance.now();
    const f = (t) => { const k = Math.min(1, (t - t0) / 1400), e = 1 - Math.pow(1 - k, 3); el.textContent = Math.round(to * e) + suf; if (k < 1) requestAnimationFrame(f); };
    requestAnimationFrame(f);
  }

  // vídeos só tocam quando aparecem
  const vio = new IntersectionObserver((ents) => ents.forEach((e) => { e.isIntersecting ? e.target.play().catch(() => {}) : e.target.pause(); }), { threshold: 0.3 });
  $$('video[data-autoplay]').forEach((v) => vio.observe(v));

  // antes/depois
  $$('[data-ba]').forEach((f) => { const r = $('input', f); r.addEventListener('input', () => f.style.setProperty('--pos', r.value + '%')); });

  // brilho que segue o mouse nos cartões
  document.addEventListener('pointermove', (e) => {
    const c = e.target.closest && e.target.closest('.svc-card'); if (!c) return;
    const r = c.getBoundingClientRect();
    c.style.setProperty('--mx', (e.clientX - r.left) + 'px'); c.style.setProperty('--my', (e.clientY - r.top) + 'px');
  });

  // menu mobile + link ativo
  $('#navToggle').addEventListener('click', () => nav.classList.toggle('open'));
  $$('#navLinks a').forEach((a) => a.addEventListener('click', () => nav.classList.remove('open')));
  const secIO = new IntersectionObserver((ents) => ents.forEach((e) => {
    if (e.isIntersecting) $$('#navLinks a').forEach((a) => a.classList.toggle('active', a.getAttribute('href') === '#' + e.target.id));
  }), { rootMargin: '-45% 0px -50% 0px' });
  $$('section[id]').forEach((s) => secIO.observe(s));

  /* ========== WIZARD ========== */
  function goStep(n) {
    step = n;
    $$('.wz-pane').forEach((p) => p.classList.toggle('cur', Number(p.dataset.step) === n));
    $$('#wzSteps li').forEach((li) => {
      const k = Number(li.dataset.go);
      li.classList.toggle('cur', k === n); li.classList.toggle('done', k < n);
    });
    $('#wzBack').style.visibility = n === 1 ? 'hidden' : 'visible';
    $('#wzNext').textContent = n === 4 ? 'Confirmar agendamento' : 'Continuar';
    $('#wzError').textContent = '';
    if (n === 3) renderDates();
    if (n === 2) setTimeout(() => innerWidth > 760 && $('#carSearch').focus({ preventScroll: true }), 50);
    renderSummary();
  }
  $$('#wzSteps li').forEach((li) => li.addEventListener('click', () => { const k = Number(li.dataset.go); if (k < step) goStep(k); }));
  $('#wzBack').addEventListener('click', () => step > 1 && goStep(step - 1));
  $('#wzNext').addEventListener('click', () => {
    const err = validate(step);
    if (err) { $('#wzError').textContent = err; return; }
    if (step < 4) { goStep(step + 1); scrollToWizard(); } else confirmar();
  });
  function scrollToWizard() { const r = $('#wizard').getBoundingClientRect(); if (r.top < 0 || r.top > innerHeight * .4) $('#wizard').scrollIntoView({ behavior: 'smooth', block: 'start' }); }
  function validate(n) {
    if (n === 1 && !sel.servicos.size) return 'Escolha pelo menos um serviço.';
    if (n === 2 && !sel.veiculo) return 'Selecione o seu veículo.';
    if (n === 3 && (!sel.data || !sel.hora)) return 'Escolha um dia e um horário disponível.';
    if (n === 4) {
      const f = $('#dadosForm');
      if (f.nome.value.trim().length < 3) return 'Informe seu nome.';
      if (U.soDigitos(f.telefone.value).length < 10) return 'Informe um WhatsApp válido com DDD.';
    }
    return '';
  }

  // passo 1
  function renderPick() {
    const cat = sel.veiculo && catById(sel.veiculo.cat);
    $('#pickServices').innerHTML = activeServices().map((s) => `
      <label class="pick ${sel.servicos.has(s.id) ? 'on' : ''}">
        <input type="checkbox" value="${esc(s.id)}" ${sel.servicos.has(s.id) ? 'checked' : ''}>
        <span class="box"></span>
        <span><b>${esc(s.nome)}</b><small>${esc(s.descricao || '')}</small></span>
        <span class="pr">${U.brl(U.preco(s, cat))}<small>${cat ? '' : 'a partir · '}${U.dur(Number(s.duracao))}</small></span>
      </label>`).join('');
  }
  $('#pickServices').addEventListener('change', (e) => {
    const id = e.target.value;
    e.target.checked ? sel.servicos.add(id) : sel.servicos.delete(id);
    e.target.closest('.pick').classList.toggle('on', e.target.checked);
    sel.hora = null; renderSummary();
  });
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-book]'); if (!b) return;
    sel.servicos.add(b.dataset.book); renderPick(); goStep(1);
    $('#agendar').scrollIntoView({ behavior: 'smooth' });
  });

  // passo 2
  let brand = '';
  const brands = [...new Set(CARS.map((c) => c.marca))];
  $('#brandChips').innerHTML = `<button type="button" class="chip on" data-brand="">Todas</button>` +
    brands.map((b) => `<button type="button" class="chip" data-brand="${esc(b)}">${esc(b)}</button>`).join('');
  $('#brandChips').addEventListener('click', (e) => {
    const c = e.target.closest('.chip'); if (!c) return;
    brand = c.dataset.brand;
    $$('#brandChips .chip').forEach((x) => x.classList.toggle('on', x === c));
    renderCars();
  });
  $('#carSearch').addEventListener('input', renderCars);
  function renderCars() {
    const q = norm($('#carSearch').value.trim());
    let list = CARS.filter((c) => (!brand || c.marca === brand) && (!q || norm(c.marca + ' ' + c.modelo).includes(q) || norm(c.modelo).includes(q)));
    if (!q && !brand) list = list.filter((c) => !c.grupo.includes('clássicos')).slice(0, 60);
    const catName = (id) => (catById(id) || {}).nome || '';
    $('#carResults').innerHTML = list.length ? list.map((c) => {
      const on = sel.veiculo && sel.veiculo.marca === c.marca && sel.veiculo.modelo === c.modelo;
      return `<button type="button" class="car ${on ? 'on' : ''}" data-m="${esc(c.marca)}" data-o="${esc(c.modelo)}" data-c="${c.cat}"><b>${esc(c.modelo)}</b><small>${esc(c.marca)} · ${esc(catName(c.cat))}</small></button>`;
    }).join('') : `<div class="car-empty">Nenhum modelo encontrado. Use “Não achei meu veículo” abaixo.</div>`;
  }
  $('#carResults').addEventListener('click', (e) => {
    const b = e.target.closest('.car'); if (!b) return;
    sel.veiculo = { marca: b.dataset.m, modelo: b.dataset.o, cat: b.dataset.c };
    $$('#carResults .car').forEach((x) => x.classList.toggle('on', x === b));
    renderPick(); renderSummary(); $('#wzError').textContent = '';
  });
  $('#manCat').innerHTML = cfg.categorias.map((c) => `<option value="${c.id}">${esc(c.nome)}</option>`).join('');
  $('#manOk').addEventListener('click', () => {
    const m = $('#manMarca').value.trim(), o = $('#manModelo').value.trim();
    if (!o) { $('#wzError').textContent = 'Digite pelo menos o modelo.'; return; }
    sel.veiculo = { marca: m || 'Outro', modelo: o, cat: $('#manCat').value };
    $$('#carResults .car').forEach((x) => x.classList.remove('on'));
    renderPick(); renderSummary(); toast('Veículo selecionado: ' + o, 'ok'); $('#wzError').textContent = '';
  });

  // passo 3
  function renderDates() {
    const dur = totalDur(), n = Number(cfg.settings.diasAFrente) || 30, out = [];
    $('#durHint').textContent = `Duração estimada: ${U.dur(dur)}. Mostramos só os horários em que o serviço cabe inteiro.`;
    const d0 = new Date(); d0.setHours(0, 0, 0, 0);
    let firstOk = null;
    for (let i = 0; i <= n; i++) {
      const d = new Date(d0); d.setDate(d.getDate() + i);
      const key = U.ymd(d), info = U.slots(cfg, busy, key, dur);
      const livres = info.lista.filter((s) => s.status === 'livre').length;
      let cls = '', em = '';
      if (info.fechado) { cls = 'off'; em = info.tipo === 'feriado' ? 'Feriado' : info.tipo === 'folga' ? 'Folga' : 'Fechado'; }
      else if (!livres) { cls = 'off full'; em = info.lista.every((s) => s.status === 'passado' || s.status === 'curto') ? 'Encerrado' : 'Lotado'; }
      else { em = livres + (livres > 1 ? ' livres' : ' livre'); if (!firstOk) firstOk = key; }
      out.push(`<button type="button" class="day ${cls} ${sel.data === key ? 'on' : ''}" data-d="${key}" ${cls ? 'aria-disabled="true"' : ''} title="${esc(info.motivo || '')}">
        <small>${i === 0 ? 'HOJE' : U.diaCurto[d.getDay()]}</small><strong>${d.getDate()}</strong><small>${U.mesCurto[d.getMonth()]}</small><em>${em}</em></button>`);
    }
    $('#dateStrip').innerHTML = out.join('');
    if (!sel.data || $(`.day[data-d="${sel.data}"]`)?.classList.contains('off')) { sel.data = null; sel.hora = null; }
    if (!sel.data && firstOk) sel.data = firstOk;
    $$('#dateStrip .day').forEach((b) => b.classList.toggle('on', b.dataset.d === sel.data));
    const cur = $('#dateStrip .day.on'); if (cur) cur.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
    renderSlots();
  }
  $('#dateStrip').addEventListener('click', (e) => {
    const b = e.target.closest('.day'); if (!b) return;
    if (b.classList.contains('off')) { toast(b.title || 'Dia indisponível'); return; }
    sel.data = b.dataset.d; sel.hora = null;
    $$('#dateStrip .day').forEach((x) => x.classList.toggle('on', x === b));
    renderSlots(); renderSummary();
  });
  $$('.strip-nav').forEach((b) => b.addEventListener('click', () => $('#dateStrip').scrollBy({ left: Number(b.dataset.dir) * 340 })));
  function renderSlots() {
    const g = $('#slotGrid');
    if (!sel.data) { $('#slotHead').textContent = ''; g.innerHTML = `<div class="slot-closed">Nenhum dia disponível nos próximos dias. Fale com a gente no WhatsApp.</div>`; return; }
    const info = U.slots(cfg, busy, sel.data, totalDur());
    $('#slotHead').textContent = U.dataLonga(sel.data) + (info.fechado ? '' : ` · aberto das ${info.inicio} às ${info.fim}`);
    if (info.fechado) { g.innerHTML = `<div class="slot-closed">${esc(info.motivo)}</div>`; return; }
    const lbl = { livre: 'Livre', ocupado: 'Ocupado', bloqueado: 'Indisponível', passado: 'Encerrado', curto: 'Não cabe', conflito: 'Não cabe' };
    g.innerHTML = info.lista.map((s) => {
      const cls = s.status === 'livre' ? 'livre' : s.status === 'ocupado' ? 'ocupado' : 'indisp';
      const tip = s.status === 'curto' ? 'O serviço passaria do horário de fechamento' : s.status === 'conflito' ? 'O serviço esbarra em outro agendamento' : '';
      return `<button type="button" class="slot ${cls} ${sel.hora === s.hm ? 'on' : ''}" data-h="${s.hm}" data-s="${s.status}" title="${tip}"><span>${s.hm}</span><small>${lbl[s.status]}</small></button>`;
    }).join('');
  }
  $('#slotGrid').addEventListener('click', (e) => {
    const b = e.target.closest('.slot'); if (!b) return;
    if (b.dataset.s !== 'livre') { toast(b.title || 'Horário indisponível'); return; }
    sel.hora = b.dataset.h;
    $$('#slotGrid .slot').forEach((x) => x.classList.toggle('on', x === b));
    $('#wzError').textContent = '';
    renderSummary();
  });

  // resumo
  function renderSummary() {
    const cat = sel.veiculo && catById(sel.veiculo.cat), list = chosen();
    const dd = (v) => v ? `<dd>${v}</dd>` : `<dd class="none">—</dd>`;
    $('#summary').innerHTML =
      `<div><dt>Serviços</dt>${list.length ? '<dd>' + list.map((s) => `<div class="row"><span>${esc(s.nome)}</span><span>${U.brl(U.preco(s, cat))}</span></div>`).join('') + '</dd>' : dd()}</div>` +
      `<div><dt>Veículo</dt>${dd(sel.veiculo ? esc(sel.veiculo.marca + ' ' + sel.veiculo.modelo) + `<br><small style="color:var(--muted);font-weight:500">${esc(cat ? cat.nome : '')}</small>` : '')}</div>` +
      `<div><dt>Data e horário</dt>${dd(sel.data && sel.hora ? U.dataLonga(sel.data) + ' às ' + sel.hora : '')}</div>` +
      `<div><dt>Duração estimada</dt>${dd(list.length ? U.dur(totalDur()) : '')}</div>`;
    $('#sumTotal').textContent = U.brl(totalPrice());
    $('#sumNote').textContent = sel.veiculo ? 'Valor final pode variar conforme o estado do veículo.' : 'Valores a partir de. O total ajusta pelo porte do veículo.';
  }

  // confirmar
  async function confirmar() {
    const btn = $('#wzNext'); btn.disabled = true; btn.textContent = 'Reservando...';
    try {
      busy = await Store.getBusy();
      const info = U.slots(cfg, busy, sel.data, totalDur());
      const slot = info.lista.find((s) => s.hm === sel.hora);
      if (!slot || slot.status !== 'livre') {
        sel.hora = null; goStep(3);
        $('#wzError').textContent = 'Esse horário acabou de ser reservado por outra pessoa. Escolha outro, por favor.';
        return;
      }
      const f = $('#dadosForm'), cat = catById(sel.veiculo.cat);
      const b = {
        nome: f.nome.value.trim(), telefone: U.soDigitos(f.telefone.value),
        placa: f.placa.value.trim().toUpperCase(), cor: f.cor.value.trim(), ano: f.ano.value.trim(), obs: f.obs.value.trim(),
        servicos: chosen().map((s) => ({ id: s.id, nome: s.nome, preco: U.preco(s, cat), duracao: Number(s.duracao) })),
        veiculo: { ...sel.veiculo, catNome: cat ? cat.nome : '' },
        data: sel.data, inicio: sel.hora, duracao: totalDur(), total: totalPrice(),
        status: 'confirmado', criadoEm: new Date().toISOString()
      };
      await Store.createBooking(b);
      busy = await Store.getBusy();

      const fim = U.toHM(U.toMin(b.inicio) + b.duracao);
      const msg = [
        `*NOVO AGENDAMENTO — ${cfg.settings.nomeLoja}*`, '',
        `👤 *Cliente:* ${b.nome}`, `📱 *WhatsApp:* ${fmtPhone(b.telefone)}`, '',
        `🚗 *Veículo:* ${b.veiculo.marca} ${b.veiculo.modelo}${b.ano ? ' ' + b.ano : ''} (${b.veiculo.catNome})`,
        (b.cor ? `🎨 *Cor:* ${b.cor}` : ''), (b.placa ? `🔖 *Placa:* ${b.placa}` : ''), '',
        `🧽 *Serviços:*`, ...b.servicos.map((s) => `• ${s.nome} — ${U.brl(s.preco)}`), '',
        `📅 *Data:* ${U.dataLonga(b.data)}`, `⏰ *Horário:* ${b.inicio} (previsão de término ${fim})`,
        `💰 *Total estimado:* ${U.brl(b.total)}`,
        (b.obs ? `\n📝 *Obs.:* ${b.obs}` : '')
      ].filter((l, i, a) => l !== '' || a[i - 1] !== '').join('\n');
      const link = waLink(cfg.settings.whatsapp, msg);

      $('#okText').innerHTML = `<b>${esc(U.dataLonga(b.data))} às ${b.inicio}</b><br>${esc(b.servicos.map((s) => s.nome).join(' + '))}`;
      $('#okWhats').href = link;
      $('#okModal').hidden = false;
      window.open(link, '_blank');

      sel.servicos.clear(); sel.hora = null; f.reset();
      renderPick(); goStep(1);
    } catch (e) {
      console.error(e);
      $('#wzError').textContent = 'Não foi possível salvar o agendamento. Tente novamente ou chame no WhatsApp.';
    } finally { btn.disabled = false; if (step === 4) btn.textContent = 'Confirmar agendamento'; }
  }
  $('#okClose').addEventListener('click', () => { $('#okModal').hidden = true; });
  $('#okModal').addEventListener('click', (e) => { if (e.target.id === 'okModal') e.target.hidden = true; });

  // máscara de telefone
  $('#dadosForm').telefone.addEventListener('input', (e) => {
    let d = U.soDigitos(e.target.value).slice(0, 11);
    e.target.value = d.length > 6 ? `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}` : d.length > 2 ? `(${d.slice(0, 2)}) ${d.slice(2)}` : d;
  });

  // atualização em tempo real
  Store.subscribe(async () => {
    cfg = await Store.getConfig(); busy = await Store.getBusy();
    renderStatic(); renderPick(); if (step === 3) renderDates(); renderSummary();
  });

  renderStatic(); renderPick(); renderCars(); goStep(1); onScroll();
})();
