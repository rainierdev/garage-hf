(async function () {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const U = window.HF, esc = U.esc;
  const clone = (o) => JSON.parse(JSON.stringify(o));
  function toast(msg, type = 'ok') { const t = document.createElement('div'); t.className = 'toast ' + type; t.textContent = msg; document.body.appendChild(t); setTimeout(() => t.remove(), 2900); }
  const fmtPhone = (n) => { const d = U.soDigitos(n).replace(/^55/, ''); return d.length === 11 ? `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}` : n; };
  const waTo = (num, txt) => { let d = U.soDigitos(num); if (d.length <= 11) d = '55' + d; return 'https://wa.me/' + d + '?text=' + encodeURIComponent(txt); };

  await Store.init();
  let cfg = await Store.getConfig();
  let bookings = [];

  /* ========== LOGIN ========== */
  const isFire = Store.mode === 'firebase';
  $('#emailWrap').hidden = !isFire;
  $('#loginHint').textContent = isFire ? 'Entre com o e-mail e a senha cadastrados no Firebase.' : 'Modo demonstração. Senha inicial: 1234';
  $('#loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    $('#loginErr').textContent = '';
    try { await Store.login(e.target.email.value.trim(), e.target.senha.value); start(); }
    catch (err) { $('#loginErr').textContent = isFire ? 'E-mail ou senha incorretos.' : err.message; }
  });

  /* ========== NAVEGAÇÃO ========== */
  const TABS = [
    ['agenda', 'Agendamentos', '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>'],
    ['folgas', 'Folgas e feriados', '<circle cx="12" cy="12" r="9"/><path d="M5.6 5.6l12.8 12.8"/>'],
    ['horarios', 'Horários', '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'],
    ['servicos', 'Serviços e preços', '<path d="M20 12l-8 8-9-9V3h8z"/><circle cx="7.5" cy="7.5" r="1.5"/>'],
    ['config', 'Configurações', '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-2.7-1.1l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.6 1.6 0 0 0 3.6 15H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.1-2.7l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.6 1.6 0 0 0 9 4.6V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 2.7 1.1l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0 1.1 2.7H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z"/>']
  ];
  function tabBtn([id, nome, ic]) { return `<button class="adm-tab" data-tab="${id}"><svg viewBox="0 0 24 24">${ic}</svg>${nome}${id === 'agenda' ? '<span class="badge" data-badge hidden></span>' : ''}</button>`; }
  $('#side').innerHTML = `<img src="img/logo.webp" alt="">` + TABS.map(tabBtn).join('') +
    `<div class="spacer"></div><div class="adm-mode">Modo: <b>${isFire ? 'Online (Firebase)' : 'Demonstração'}</b>${isFire ? '' : '<br>Os dados ficam só neste navegador.'}</div>
     <a class="adm-tab" href="index.html" target="_blank"><svg viewBox="0 0 24 24"><path d="M14 3h7v7M21 3l-9 9M19 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h5"/></svg>Ver site</a>
     <button class="adm-tab" id="logout"><svg viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>Sair</button>`;
  $('#mtabs').innerHTML = TABS.map(tabBtn).join('') + `<button class="adm-tab" id="logout2">Sair</button>`;
  document.addEventListener('click', (e) => { const t = e.target.closest('[data-tab]'); if (t) showTab(t.dataset.tab); });
  function showTab(id) {
    $$('[data-tab]').forEach((t) => t.classList.toggle('on', t.dataset.tab === id));
    $$('.adm-panel').forEach((p) => p.classList.toggle('on', p.dataset.panel === id));
    location.hash = id; scrollTo(0, 0);
  }
  const logout = async () => { await Store.logout(); location.reload(); };

  async function start() {
    $('#login').hidden = true; $('#app').hidden = false;
    $('#logout').addEventListener('click', logout); $('#logout2').addEventListener('click', logout);
    $('#pinCard').hidden = isFire;
    showTab((location.hash || '#agenda').slice(1));
    await loadBookings();
    renderAll();
    Store.subscribe(async () => { cfg = await Store.getConfig(); await loadBookings(); renderBookings(); renderCal(); });
    setInterval(async () => { await loadBookings(); renderBookings(); }, 60000);
  }
  async function loadBookings() { bookings = (await Store.listBookings()).sort((a, b) => (a.data + a.inicio).localeCompare(b.data + b.inicio)); }
  function renderAll() { renderBookings(); renderCal(); renderHol(); renderBlocks(); renderHorarios(); renderServicos(); renderConfig(); }
  async function saveCfg(msg) {
    try { await Store.saveConfig(cfg); toast(msg || 'Salvo!'); }
    catch (e) { console.error(e); toast('Erro ao salvar. Verifique a conexão.', 'err'); }
  }

  /* ========== AGENDA ========== */
  $('#reload').addEventListener('click', async () => { await loadBookings(); renderBookings(); toast('Atualizado'); });
  ['#fPeriodo', '#fStatus', '#fBusca'].forEach((s) => $(s).addEventListener('input', renderBookings));

  function renderBookings() {
    const hoje = U.ymd(new Date()), d7 = new Date(); d7.setDate(d7.getDate() + 7); const em7 = U.ymd(d7);
    const ativos = bookings.filter((b) => b.status !== 'cancelado');
    const doDia = ativos.filter((b) => b.data === hoje);
    const prox = ativos.filter((b) => b.data >= hoje && b.status === 'confirmado');
    const semana = ativos.filter((b) => b.data >= hoje && b.data <= em7);
    const mes = hoje.slice(0, 7);
    const fatMes = ativos.filter((b) => b.data.slice(0, 7) === mes).reduce((a, b) => a + Number(b.total || 0), 0);
    $('#kpis').innerHTML = [
      ['Hoje', doDia.length], ['Próximos 7 dias', semana.length], ['A atender', prox.length], ['Previsto no mês', U.brl(fatMes)]
    ].map(([l, v]) => `<div class="kpi"><small>${l}</small><strong>${v}</strong></div>`).join('');
    $$('[data-badge]').forEach((b) => { b.hidden = !doDia.length; b.textContent = doDia.length; });

    const per = $('#fPeriodo').value, st = $('#fStatus').value, q = $('#fBusca').value.trim().toLowerCase();
    let list = bookings.filter((b) => {
      if (per === 'prox' && b.data < hoje) return false;
      if (per === 'hoje' && b.data !== hoje) return false;
      if (per === 'semana' && (b.data < hoje || b.data > em7)) return false;
      if (per === 'passados' && b.data >= hoje) return false;
      if (st && b.status !== st) return false;
      if (q && !JSON.stringify([b.nome, b.telefone, b.placa, b.veiculo, b.servicos.map((s) => s.nome)]).toLowerCase().includes(q)) return false;
      return true;
    });
    if (per === 'passados') list = list.reverse();
    if (!list.length) { $('#bkList').innerHTML = `<div class="empty">Nenhum agendamento aqui.</div>`; return; }

    let lastDay = '', html = '';
    list.forEach((b) => {
      if (b.data !== lastDay) { lastDay = b.data; html += `<div class="bk-day">${b.data === hoje ? 'Hoje · ' : ''}${esc(U.dataLonga(b.data))}</div>`; }
      const fim = U.toHM(U.toMin(b.inicio) + Number(b.duracao));
      const stTag = { confirmado: '<span class="tag y">Confirmado</span>', concluido: '<span class="tag g">Concluído</span>', cancelado: '<span class="tag r">Cancelado</span>' }[b.status] || '';
      const v = b.veiculo || {};
      html += `<div class="bk ${esc(b.status)}">
        <div class="bk-time">${esc(b.inicio)}<small>até ${fim}</small></div>
        <div class="bk-info">
          <b>${esc(b.nome)}</b> · <a href="${waTo(b.telefone, 'Olá, ' + b.nome.split(' ')[0] + '! ')}" target="_blank" rel="noopener" style="color:var(--green)">${esc(fmtPhone(b.telefone))}</a>
          <p>🚗 ${esc(v.marca + ' ' + v.modelo)} ${b.ano ? esc(b.ano) : ''} ${b.cor ? '· ' + esc(b.cor) : ''} ${b.placa ? '· ' + esc(b.placa) : ''} <span style="color:var(--dim)">(${esc(v.catNome || '')})</span></p>
          <p>🧽 ${esc(b.servicos.map((s) => s.nome).join(' + '))} · <span class="bk-total">${U.brl(b.total)}</span></p>
          ${b.obs ? `<p>📝 ${esc(b.obs)}</p>` : ''}
          <div class="tags">${stTag}<span class="tag">⏱ ${U.dur(Number(b.duracao))}</span></div>
        </div>
        <div class="bk-act">
          ${b.status !== 'concluido' ? `<button class="btn btn-ghost" data-act="concluir" data-id="${b.id}">✓ Concluído</button>` : ''}
          ${b.status !== 'confirmado' ? `<button class="btn btn-ghost" data-act="reativar" data-id="${b.id}">Reativar</button>` : ''}
          ${b.status === 'confirmado' ? `<button class="btn btn-ghost" data-act="avisar" data-id="${b.id}">Lembrar cliente</button>` : ''}
          ${b.status !== 'cancelado' ? `<button class="btn btn-danger" data-act="cancelar" data-id="${b.id}">Cancelar</button>` : ''}
          <button class="btn btn-danger" data-act="remover" data-id="${b.id}" title="Apagar de vez">Remover</button>
        </div>
      </div>`;
    });
    $('#bkList').innerHTML = html;
  }

  $('#bkList').addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-act]'); if (!btn) return;
    const b = bookings.find((x) => x.id === btn.dataset.id); if (!b) return;
    const act = btn.dataset.act, primeiro = b.nome.split(' ')[0];
    const quando = U.dataLonga(b.data) + ' às ' + b.inicio;
    try {
      if (act === 'concluir') { await Store.updateBooking(b, { status: 'concluido' }); toast('Marcado como concluído'); }
      if (act === 'reativar') {
        const busy = (await Store.getBusy()).filter((x) => x.id !== b.id);
        const s = U.slots(cfg, busy, b.data, Number(b.duracao)).lista.find((x) => x.hm === b.inicio);
        if (b.data >= U.ymd(new Date()) && s && ['ocupado', 'conflito'].includes(s.status) && !confirm('Esse horário já tem outro agendamento. Reativar mesmo assim?')) return;
        await Store.updateBooking(b, { status: 'confirmado' }); toast('Agendamento reativado');
      }
      if (act === 'avisar') window.open(waTo(b.telefone, `Olá, ${primeiro}! Passando para lembrar do seu horário na ${cfg.settings.nomeLoja}: ${quando} (${b.servicos.map((s) => s.nome).join(' + ')}). Te esperamos! 🚗✨`), '_blank');
      if (act === 'cancelar') {
        if (!confirm(`Cancelar o agendamento de ${b.nome} (${quando})? O horário volta a ficar livre no site.`)) return;
        await Store.updateBooking(b, { status: 'cancelado' });
        toast('Agendamento cancelado');
        if (confirm('Quer avisar o cliente pelo WhatsApp?')) window.open(waTo(b.telefone, `Olá, ${primeiro}! Infelizmente precisamos cancelar seu horário de ${quando} na ${cfg.settings.nomeLoja}. Podemos remarcar? Desculpe o transtorno.`), '_blank');
      }
      if (act === 'remover') {
        if (!confirm(`Apagar DEFINITIVAMENTE o agendamento de ${b.nome}? Isso não pode ser desfeito.`)) return;
        await Store.deleteBooking(b); toast('Agendamento removido');
      }
      await loadBookings(); renderBookings(); renderCal();
    } catch (err) { console.error(err); toast('Não foi possível concluir a ação.', 'err'); }
  });

  /* ========== CALENDÁRIO / BLOQUEIOS ========== */
  let calRef = new Date(); calRef.setDate(1);
  let editDate = null;
  $('#calPrev').addEventListener('click', () => { calRef.setMonth(calRef.getMonth() - 1); renderCal(); });
  $('#calNext').addEventListener('click', () => { calRef.setMonth(calRef.getMonth() + 1); renderCal(); });

  function renderCal() {
    const y = calRef.getFullYear(), m = calRef.getMonth(), hoje = U.ymd(new Date());
    const t = calRef.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    $('#calTitle').textContent = t.charAt(0).toUpperCase() + t.slice(1);
    let html = U.diaCurto.map((d) => `<div class="cal-h">${d}</div>`).join('');
    const first = new Date(y, m, 1).getDay(), days = new Date(y, m + 1, 0).getDate();
    for (let i = 0; i < first; i++) html += `<div class="cal-d blank"></div>`;
    for (let d = 1; d <= days; d++) {
      const key = U.ymd(new Date(y, m, d));
      const bl = cfg.bloqueios.filter((b) => b.data === key);
      const full = bl.find((b) => !(b.horarios && b.horarios.length));
      const part = bl.filter((b) => b.horarios && b.horarios.length);
      const sc = cfg.schedule[new Date(y, m, d).getDay()];
      const n = bookings.filter((b) => b.data === key && b.status !== 'cancelado').length;
      let cls = [], label = '';
      if (key < hoje) cls.push('past');
      if (key === hoje) cls.push('today');
      if (full) { cls.push('blocked'); label = full.motivo || U.tipoLabel[full.tipo]; }
      else if (!sc.aberto) { cls.push('closed'); label = 'Fechado'; }
      else if (part.length) { cls.push('partial'); label = part.flatMap((p) => p.horarios).length + 'h bloq.'; }
      if (!label && n) { cls.push('has'); label = n + (n > 1 ? ' agend.' : ' agend.'); }
      else if (n && !full) label += ` · ${n} ag.`;
      html += `<button class="cal-d ${cls.join(' ')}" data-d="${key}">${d}<small>${esc(label)}</small></button>`;
    }
    $('#cal').innerHTML = html;
  }
  $('#cal').addEventListener('click', (e) => { const b = e.target.closest('.cal-d:not(.blank)'); if (b) openEditor(b.dataset.d); });

  function slotTimes(data) {
    const sc = cfg.schedule[U.parse(data).getDay()], step = Number(cfg.settings.slotMinutes) || 60, out = [];
    const ini = U.toMin(sc.aberto ? sc.inicio : '08:00'), fim = U.toMin(sc.aberto ? sc.fim : '18:00');
    for (let t = ini; t < fim; t += step) out.push(U.toHM(t));
    return out;
  }
  function openEditor(data) {
    editDate = data;
    const ex = cfg.bloqueios.filter((b) => b.data === data);
    const full = ex.find((b) => !(b.horarios && b.horarios.length));
    const horas = ex.flatMap((b) => b.horarios || []);
    const sc = cfg.schedule[U.parse(data).getDay()];
    const n = bookings.filter((b) => b.data === data && b.status !== 'cancelado').length;
    $('#beTitle').textContent = U.dataLonga(data);
    $('#beSub').textContent = (sc.aberto ? `Horário normal: ${sc.inicio} às ${sc.fim}.` : 'Normalmente fechado neste dia da semana.') + (n ? ` Atenção: já existem ${n} agendamento(s) neste dia.` : '');
    $('#beTipo').value = (ex[0] && ex[0].tipo) || 'folga';
    $('#beMotivo').value = (ex[0] && ex[0].motivo) || '';
    $('#beModo').value = !ex.length || full ? 'dia' : 'horas';
    $('#beHorasList').innerHTML = slotTimes(data).map((h) => `<label><input type="checkbox" value="${h}" ${horas.includes(h) ? 'checked' : ''}>${h}</label>`).join('');
    $('#beHoras').hidden = $('#beModo').value !== 'horas';
    $('#beRemove').hidden = !ex.length;
    $('#blockEditor').hidden = false;
    $('#blockEditor').scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  $('#beModo').addEventListener('change', () => { $('#beHoras').hidden = $('#beModo').value !== 'horas'; });
  $('#beCancel').addEventListener('click', () => { $('#blockEditor').hidden = true; });
  $('#beRemove').addEventListener('click', async () => {
    cfg.bloqueios = cfg.bloqueios.filter((b) => b.data !== editDate);
    $('#blockEditor').hidden = true; await saveCfg('Dia liberado'); renderCal(); renderBlocks(); renderHol();
  });
  $('#beSave').addEventListener('click', async () => {
    const modo = $('#beModo').value;
    const horas = $$('#beHorasList input:checked').map((i) => i.value);
    if (modo === 'horas' && !horas.length) { toast('Marque pelo menos um horário.', 'err'); return; }
    cfg.bloqueios = cfg.bloqueios.filter((b) => b.data !== editDate);
    cfg.bloqueios.push({ data: editDate, tipo: $('#beTipo').value, motivo: $('#beMotivo').value.trim(), horarios: modo === 'horas' ? horas : [] });
    $('#blockEditor').hidden = true; await saveCfg('Bloqueio salvo'); renderCal(); renderBlocks(); renderHol();
  });

  // feriados
  const anoAtual = new Date().getFullYear();
  $('#holAno').innerHTML = [anoAtual, anoAtual + 1].map((a) => `<option>${a}</option>`).join('');
  $('#holAno').addEventListener('change', renderHol);
  function renderHol() {
    const hoje = U.ymd(new Date());
    $('#holList').innerHTML = U.feriados(Number($('#holAno').value)).map((f) => {
      const on = cfg.bloqueios.some((b) => b.data === f.data && !(b.horarios && b.horarios.length));
      const past = f.data < hoje;
      return `<label class="hol" style="${past ? 'opacity:.4' : ''}"><input type="checkbox" value="${f.data}" data-m="${esc(f.motivo)}" ${on ? 'checked' : ''} ${past ? 'disabled' : ''}>
        <span><b>${esc(f.motivo)}</b><small>${esc(U.dataLonga(f.data))}</small></span></label>`;
    }).join('');
  }
  $('#holSave').addEventListener('click', async () => {
    $$('#holList input:not(:disabled)').forEach((i) => {
      const has = cfg.bloqueios.find((b) => b.data === i.value && !(b.horarios && b.horarios.length));
      if (i.checked && !has) { cfg.bloqueios = cfg.bloqueios.filter((b) => b.data !== i.value); cfg.bloqueios.push({ data: i.value, tipo: 'feriado', motivo: i.dataset.m, horarios: [] }); }
      if (!i.checked && has && has.tipo === 'feriado') cfg.bloqueios = cfg.bloqueios.filter((b) => b !== has);
    });
    await saveCfg('Feriados salvos'); renderCal(); renderBlocks();
  });

  function renderBlocks() {
    const hoje = U.ymd(new Date());
    // limpa bloqueios antigos
    cfg.bloqueios = cfg.bloqueios.filter((b) => b.data >= U.ymd(new Date(Date.now() - 60 * 864e5)));
    const list = cfg.bloqueios.filter((b) => b.data >= hoje).sort((a, b) => a.data.localeCompare(b.data));
    $('#blockList').innerHTML = list.length ? list.map((b) => `
      <div class="block-item">
        <span class="when">${esc(U.dataLonga(b.data))}</span>
        <span class="tag ${b.tipo === 'feriado' ? 'y' : 'r'}">${esc(U.tipoLabel[b.tipo] || b.tipo)}</span>
        <span class="why">${esc(b.motivo || '')} ${b.horarios && b.horarios.length ? '· horários: ' + esc(b.horarios.join(', ')) : '· dia inteiro'}</span>
        <button class="btn btn-ghost btn-sm" data-edit="${b.data}">Editar</button>
      </div>`).join('') : `<div class="empty">Nenhum bloqueio futuro. Clique num dia do calendário para criar.</div>`;
  }
  $('#blockList').addEventListener('click', (e) => { const b = e.target.closest('[data-edit]'); if (b) { const d = U.parse(b.dataset.edit); calRef = new Date(d.getFullYear(), d.getMonth(), 1); renderCal(); openEditor(b.dataset.edit); } });

  /* ========== HORÁRIOS ========== */
  function renderHorarios() {
    $('#week').innerHTML = [1, 2, 3, 4, 5, 6, 0].map((d) => {
      const s = cfg.schedule[d];
      return `<div class="week-row ${s.aberto ? '' : 'closed'}" data-wd="${d}">
        <b>${U.diaSemana[d]}</b>
        <label class="switch"><input type="checkbox" data-k="aberto" ${s.aberto ? 'checked' : ''}><span></span></label>
        <input type="time" data-k="inicio" value="${s.inicio}" step="1800">
        <input type="time" data-k="fim" value="${s.fim}" step="1800">
      </div>`;
    }).join('');
    $('#sSlot').value = String(cfg.settings.slotMinutes);
    $('#sCap').value = cfg.settings.capacidade;
    $('#sAnt').value = cfg.settings.antecedenciaHoras;
    $('#sDias').value = cfg.settings.diasAFrente;
  }
  $('#week').addEventListener('change', (e) => { const r = e.target.closest('.week-row'); if (e.target.dataset.k === 'aberto') r.classList.toggle('closed', !e.target.checked); });
  $('#saveHorarios').addEventListener('click', async () => {
    for (const r of $$('#week .week-row')) {
      const ini = $('[data-k=inicio]', r).value, fim = $('[data-k=fim]', r).value, aberto = $('[data-k=aberto]', r).checked;
      if (aberto && (!ini || !fim || ini >= fim)) { toast(`Confira o horário de ${U.diaSemana[r.dataset.wd]}.`, 'err'); return; }
      cfg.schedule[r.dataset.wd] = { aberto, inicio: ini, fim };
    }
    cfg.settings.slotMinutes = Number($('#sSlot').value);
    cfg.settings.capacidade = Math.max(1, Number($('#sCap').value) || 1);
    cfg.settings.antecedenciaHoras = Math.max(0, Number($('#sAnt').value) || 0);
    cfg.settings.diasAFrente = Math.max(7, Number($('#sDias').value) || 30);
    await saveCfg('Horários salvos'); renderCal();
  });

  /* ========== SERVIÇOS ========== */
  function renderServicos() {
    $('#svcList').innerHTML = cfg.services.map((s, i) => `
      <div class="svc-edit" data-i="${i}">
        <label class="switch" title="Ativo no site"><input type="checkbox" data-k="ativo" ${s.ativo !== false ? 'checked' : ''}><span></span></label>
        <label><span class="lbl">Nome</span><input data-k="nome" value="${esc(s.nome)}"></label>
        <label><span class="lbl">Preço (R$)</span><input data-k="preco" type="number" min="0" step="5" value="${s.preco}"></label>
        <label><span class="lbl">Duração</span><select data-k="duracao">${[30, 60, 90, 120, 150, 180, 240, 300, 360, 420, 480, 540, 600].map((m) => `<option value="${m}" ${Number(s.duracao) === m ? 'selected' : ''}>${U.dur(m)}</option>`).join('')}</select></label>
        <button class="btn btn-danger btn-sm" data-del="${i}" title="Excluir serviço">Excluir</button>
        <textarea data-k="descricao" rows="2" placeholder="Descrição que aparece no site">${esc(s.descricao || '')}</textarea>
      </div>`).join('') || `<div class="empty">Nenhum serviço. Clique em “+ Novo serviço”.</div>`;
    $('#catList').innerHTML = cfg.categorias.map((c, i) => `
      <label class="fld">${esc(c.nome)}<input type="number" data-cat="${i}" min="0" max="300" value="${c.acrescimo}"><small>% sobre o preço base</small></label>`).join('');
  }
  function readServicos() {
    $$('#svcList .svc-edit').forEach((r) => {
      const s = cfg.services[r.dataset.i];
      s.ativo = $('[data-k=ativo]', r).checked;
      s.nome = $('[data-k=nome]', r).value.trim() || 'Serviço';
      s.preco = Math.max(0, Number($('[data-k=preco]', r).value) || 0);
      s.duracao = Number($('[data-k=duracao]', r).value);
      s.descricao = $('[data-k=descricao]', r).value.trim();
    });
    $$('#catList [data-cat]').forEach((i) => { cfg.categorias[i.dataset.cat].acrescimo = Math.max(0, Number(i.value) || 0); });
  }
  $('#addSvc').addEventListener('click', () => {
    readServicos();
    cfg.services.push({ id: 's' + Date.now().toString(36), nome: 'Novo serviço', preco: 100, duracao: 60, ativo: true, descricao: '' });
    renderServicos();
    $('#svcList .svc-edit:last-child [data-k=nome]').select();
  });
  $('#svcList').addEventListener('click', (e) => {
    const b = e.target.closest('[data-del]'); if (!b) return;
    readServicos();
    const s = cfg.services[b.dataset.del];
    if (!confirm(`Excluir o serviço “${s.nome}”? (Para só esconder do site, desligue a chave ao lado do nome.)`)) return;
    cfg.services.splice(b.dataset.del, 1); renderServicos();
    toast('Clique em salvar para confirmar', 'ok');
  });
  $('#saveServicos').addEventListener('click', async () => { readServicos(); await saveCfg('Serviços e preços salvos'); renderServicos(); });

  /* ========== CONFIG ========== */
  function renderConfig() {
    const s = cfg.settings;
    $('#cNome').value = s.nomeLoja; $('#cWhats').value = s.whatsapp; $('#cInsta').value = s.instagram; $('#cEnd').value = s.endereco;
    $('#cPin').value = ''; $('#cPin2').value = '';
  }
  $('#saveConfig').addEventListener('click', async () => {
    const w = U.soDigitos($('#cWhats').value);
    if (w.length < 12) { toast('WhatsApp deve ter DDI + DDD + número. Ex.: 5564996186585', 'err'); return; }
    const p1 = $('#cPin').value, p2 = $('#cPin2').value;
    if (p1 || p2) {
      if (p1 !== p2) { toast('As senhas não conferem.', 'err'); return; }
      if (p1.length < 4) { toast('A senha precisa de pelo menos 4 caracteres.', 'err'); return; }
      cfg.settings.pin = p1;
    }
    Object.assign(cfg.settings, { nomeLoja: $('#cNome').value.trim() || 'Garage HF Estética', whatsapp: w, instagram: $('#cInsta').value.trim().replace('@', ''), endereco: $('#cEnd').value.trim() });
    await saveCfg('Configurações salvas'); renderConfig();
  });
  $('#exportBtn').addEventListener('click', async () => {
    const data = { exportadoEm: new Date().toISOString(), config: cfg, agendamentos: await Store.listBookings() };
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    a.download = 'garage-hf-backup-' + U.ymd(new Date()) + '.json'; a.click();
  });
  $('#importFile').addEventListener('change', async (e) => {
    const f = e.target.files[0]; if (!f) return;
    try {
      const data = JSON.parse(await f.text());
      if (!data.config || !data.config.services) throw new Error();
      if (!confirm('Substituir as configurações atuais (serviços, preços, horários e bloqueios) pelas do arquivo?')) return;
      cfg = { ...cfg, ...clone(data.config), settings: { ...cfg.settings, ...data.config.settings } };
      await saveCfg('Configurações restauradas'); renderAll();
    } catch (err) { toast('Arquivo inválido.', 'err'); }
    e.target.value = '';
  });

  if (Store.isLogged()) start(); else $('#login').hidden = false;
})();
