/* Camada de dados + utilitários compartilhados entre o site e o painel. */
(function () {
  const CFG = window.HF_CONFIG || {};
  const DEF = window.HF_DEFAULTS;
  const clone = (o) => JSON.parse(JSON.stringify(o));

  /* ---------- utilitários ---------- */
  const pad = (n) => String(n).padStart(2, '0');
  const U = {
    toMin: (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; },
    toHM: (m) => pad(Math.floor(m / 60)) + ':' + pad(m % 60),
    ymd: (d) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()),
    parse: (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); },
    brl: (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
    dur: (m) => m < 60 ? m + ' min' : (m % 60 ? Math.floor(m / 60) + 'h' + pad(m % 60) : m / 60 + 'h'),
    esc: (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])),
    diaSemana: ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'],
    diaCurto: ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'],
    mesCurto: ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'],
    tipoLabel: { feriado: 'Feriado', folga: 'Folga', fechado: 'Fechado' },
    dataLonga(s) { const d = U.parse(s); return U.diaSemana[d.getDay()] + ', ' + d.getDate() + ' de ' + U.mesCurto[d.getMonth()] + '.'; },
    preco(serv, cat) { return Math.round(Number(serv.preco) * (1 + (cat ? Number(cat.acrescimo) : 0) / 100)); },
    soDigitos: (s) => String(s || '').replace(/\D/g, ''),

    /* Calcula a grade de horários de um dia.
       status: livre | ocupado | bloqueado | passado | curto (não cabe até o fechamento) | conflito (esbarra em outro agendamento) */
    slots(cfg, busy, data, dur) {
      const fb = cfg.bloqueios.find((b) => b.data === data && !(b.horarios && b.horarios.length));
      if (fb) return { fechado: true, tipo: fb.tipo, motivo: fb.motivo || U.tipoLabel[fb.tipo] || 'Fechado', lista: [] };
      const sc = cfg.schedule[U.parse(data).getDay()];
      if (!sc || !sc.aberto) return { fechado: true, tipo: 'fechado', motivo: 'Não abrimos neste dia', lista: [] };

      const st = cfg.settings, step = Number(st.slotMinutes) || 60, cap = Number(st.capacidade) || 1;
      const ini = U.toMin(sc.inicio), fim = U.toMin(sc.fim);
      const parciais = new Set(cfg.bloqueios.filter((b) => b.data === data && b.horarios && b.horarios.length).flatMap((b) => b.horarios));
      const now = new Date(), hoje = U.ymd(now);
      const minNow = now.getHours() * 60 + now.getMinutes() + (Number(st.antecedenciaHoras) || 0) * 60;
      const doDia = busy.filter((b) => b.data === data);

      const base = [];
      for (let t = ini; t < fim; t += step) {
        const cnt = doDia.filter((b) => U.toMin(b.inicio) <= t && t < U.toMin(b.inicio) + Number(b.duracao)).length;
        let s = 'livre';
        if (parciais.has(U.toHM(t))) s = 'bloqueado';
        else if (cnt >= cap) s = 'ocupado';
        base.push({ t, hm: U.toHM(t), base: s });
      }
      const lista = base.map((x, i) => {
        let status = x.base;
        if (data < hoje || (data === hoje && x.t < minNow)) status = 'passado';
        else if (status === 'livre') {
          if (x.t + dur > fim) status = 'curto';
          else for (let j = i; j < base.length && base[j].t < x.t + dur; j++) {
            if (base[j].base !== 'livre') { status = 'conflito'; break; }
          }
        }
        return { ...x, status };
      });
      return { fechado: false, lista, inicio: sc.inicio, fim: sc.fim };
    },

    /* Feriados nacionais do ano (inclui datas móveis calculadas pela Páscoa). */
    feriados(ano) {
      const a = ano % 19, b = Math.floor(ano / 100), c = ano % 100, d = Math.floor(b / 4), e = b % 4,
        f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30,
        i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451),
        mes = Math.floor((h + l - 7 * m + 114) / 31), dia = ((h + l - 7 * m + 114) % 31) + 1;
      const pascoa = new Date(ano, mes - 1, dia);
      const rel = (n) => { const x = new Date(pascoa); x.setDate(x.getDate() + n); return U.ymd(x); };
      return [
        { data: ano + '-01-01', motivo: 'Confraternização Universal' },
        { data: rel(-48), motivo: 'Carnaval (segunda)' },
        { data: rel(-47), motivo: 'Carnaval (terça)' },
        { data: rel(-2), motivo: 'Sexta-feira Santa' },
        { data: ano + '-04-21', motivo: 'Tiradentes' },
        { data: ano + '-05-01', motivo: 'Dia do Trabalho' },
        { data: rel(60), motivo: 'Corpus Christi' },
        { data: ano + '-09-07', motivo: 'Independência do Brasil' },
        { data: ano + '-10-12', motivo: 'Nossa Senhora Aparecida' },
        { data: ano + '-11-02', motivo: 'Finados' },
        { data: ano + '-11-15', motivo: 'Proclamação da República' },
        { data: ano + '-11-20', motivo: 'Dia da Consciência Negra' },
        { data: ano + '-12-25', motivo: 'Natal' }
      ].sort((x, y) => x.data.localeCompare(y.data));
    }
  };

  function mergeConfig(c) {
    c = c || {};
    const d = clone(DEF);
    return {
      settings: { ...d.settings, ...(c.settings || {}) },
      categorias: c.categorias || d.categorias,
      services: c.services || d.services,
      schedule: { ...d.schedule, ...(c.schedule || {}) },
      bloqueios: c.bloqueios || []
    };
  }
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const toBusy = (b) => ({ id: b.id, data: b.data, inicio: b.inicio, duracao: b.duracao });

  /* ---------- MODO DEMONSTRAÇÃO (navegador) ---------- */
  const Local = {
    mode: 'local',
    async init() {},
    _get(k, def) { try { return JSON.parse(localStorage.getItem(k)) ?? def; } catch (e) { return def; } },
    _set(k, v) { localStorage.setItem(k, JSON.stringify(v)); },
    async getConfig() { return mergeConfig(this._get('hf_config', null)); },
    async saveConfig(cfg) { this._set('hf_config', cfg); },
    async getBusy() { return this._get('hf_bookings', []).filter((b) => b.status !== 'cancelado').map(toBusy); },
    async createBooking(b) { const l = this._get('hf_bookings', []); b.id = uid(); l.push(b); this._set('hf_bookings', l); return b.id; },
    async listBookings() { return this._get('hf_bookings', []); },
    async updateBooking(b, patch) {
      const l = this._get('hf_bookings', []); const i = l.findIndex((x) => x.id === b.id);
      if (i > -1) { Object.assign(l[i], patch); this._set('hf_bookings', l); }
    },
    async deleteBooking(b) { this._set('hf_bookings', this._get('hf_bookings', []).filter((x) => x.id !== b.id)); },
    subscribe(cb) { window.addEventListener('storage', (e) => { if (e.key && e.key.startsWith('hf_')) cb(); }); },
    async login(_user, pass) {
      const cfg = await this.getConfig();
      if (String(pass) !== String(cfg.settings.pin)) throw new Error('Senha incorreta.');
      sessionStorage.setItem('hf_admin', '1');
    },
    isLogged() { return sessionStorage.getItem('hf_admin') === '1'; },
    async logout() { sessionStorage.removeItem('hf_admin'); }
  };

  /* ---------- MODO ONLINE (Firebase Firestore) ---------- */
  const Fire = {
    mode: 'firebase',
    async init() {
      firebase.initializeApp(CFG.firebase);
      this.db = firebase.firestore();
      this.auth = firebase.auth();
      await new Promise((r) => { const u = this.auth.onAuthStateChanged(() => { u(); r(); }); });
    },
    async getConfig() {
      const s = await this.db.doc('config/main').get();
      const c = mergeConfig(s.exists ? s.data() : null);
      delete c.settings.pin;
      return c;
    },
    async saveConfig(cfg) { const c = clone(cfg); delete c.settings.pin; await this.db.doc('config/main').set(c); },
    async getBusy() {
      const s = await this.db.collection('busy').where('data', '>=', U.ymd(new Date())).get();
      return s.docs.map((d) => ({ id: d.id, ...d.data() }));
    },
    async createBooking(b) {
      const ref = this.db.collection('bookings').doc();
      b.id = ref.id;
      const batch = this.db.batch();
      batch.set(ref, b);
      batch.set(this.db.collection('busy').doc(ref.id), { data: b.data, inicio: b.inicio, duracao: b.duracao });
      await batch.commit();
      return ref.id;
    },
    async listBookings() { const s = await this.db.collection('bookings').get(); return s.docs.map((d) => ({ ...d.data(), id: d.id })); },
    async updateBooking(b, patch) {
      await this.db.collection('bookings').doc(b.id).update(patch);
      const busyRef = this.db.collection('busy').doc(b.id);
      if (patch.status === 'cancelado') await busyRef.delete().catch(() => {});
      else if (patch.status) await busyRef.set({ data: b.data, inicio: b.inicio, duracao: b.duracao });
    },
    async deleteBooking(b) {
      const batch = this.db.batch();
      batch.delete(this.db.collection('bookings').doc(b.id));
      batch.delete(this.db.collection('busy').doc(b.id));
      await batch.commit();
    },
    subscribe(cb) {
      let first = 2;
      const go = () => { if (first > 0) { first--; return; } cb(); };
      this.db.collection('busy').onSnapshot(go);
      this.db.doc('config/main').onSnapshot(go);
    },
    async login(email, pass) { await this.auth.signInWithEmailAndPassword(email, pass); },
    isLogged() { return !!this.auth.currentUser; },
    async logout() { await this.auth.signOut(); }
  };

  window.HF = U;
  window.Store = CFG.firebase ? Fire : Local;
})();
