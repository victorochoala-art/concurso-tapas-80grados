/* Panel de organización · Concurso de Tapas UFV × 80 Grados
   Todo lo que escribe un participante se pinta siempre como texto, nunca como HTML. */
(() => {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const cfg = window.CONCURSO_CONFIG || {};
  const DEMO = !(cfg.supabaseUrl && cfg.supabaseAnonKey);
  const sb = !DEMO && window.supabase ? window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey) : null;
  const BUCKET = cfg.bucket || 'candidaturas';

  // Crea un elemento: h('p', { class: 'x', onclick: fn }, 'texto', otroElemento)
  function h(tag, props, ...kids) {
    const el = document.createElement(tag);
    Object.entries(props || {}).forEach(([k, v]) => {
      if (v == null || v === false) return;
      if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else if (k === 'class') el.className = v;
      else el.setAttribute(k, v === true ? '' : v);
    });
    kids.flat().forEach((k) => { if (k != null && k !== false) el.append(k); });
    return el;
  }

  const ESTADOS = { recibida: 'Recibida', finalista: 'Finalista', ganadora: 'Ganadora', lista_espera: 'Lista de espera', descartada: 'Descartada' };
  const EN_PLAZA = ['recibida', 'finalista', 'ganadora'];
  const fecha = (iso) => new Date(iso).toLocaleString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

  /* ==========================================================
     DATOS: base de datos real o ejemplos
     ========================================================== */
  const plateSvg = (a, b) => 'data:image/svg+xml,' + encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><rect width="200" height="200" fill="#f7f5f1"/><circle cx="100" cy="100" r="82" fill="#fff"/><circle cx="100" cy="100" r="60" fill="#f1eee8"/><circle cx="92" cy="96" r="30" fill="${a}"/><circle cx="122" cy="118" r="16" fill="${b}"/></svg>`);

  function demoApi() {
    const ej = (n, estado, plato, resumen, grado, curso, a, b, video) => ({
      id: 'ejemplo-' + n, numero: n, estado, creado: new Date(2026, 11, n, 18, 20 + n).toISOString(),
      nombre: 'Participante', apellidos: 'de ejemplo ' + n, email: `ejemplo${n}@example.com`, telefono: '600 000 00' + n,
      grado, curso, plato, resumen,
      concepto: 'Texto de ejemplo: aquí aparece la explicación que escribe cada participante sobre la idea de su plato.',
      ingredientes: [{ n: 'Ingrediente principal', q: '120', u: 'g' }, { n: 'Aceite de oliva', q: '2', u: 'cda' }, { n: 'Sal', q: '1', u: 'pizca' }],
      elaboracion: 'Texto de ejemplo: aquí aparecen los pasos de elaboración.',
      alergenos: n % 2 ? ['Gluten', 'Huevo'] : ['Lácteos'],
      foto: plateSvg(a, b), fotos: n % 3 === 0 ? [plateSvg(b, a), plateSvg(a, a)] : [], video: video ? 'ejemplo' : null,
      notas: '',
    });
    let rows = [
      ej(1, 'finalista', 'Croqueta líquida de cocido', 'El cocido del domingo, en un bocado.', 'Gastronomía', '3.º', '#c98a4b', '#ef544e', true),
      ej(2, 'recibida', 'Tartar de tomate y albahaca', 'Fresco, rojo y sin horno.', 'ADE', '2.º', '#ef544e', '#3e8e45', false),
      ej(3, 'recibida', 'Mini bao de rabo de toro', 'Guiso de siempre en pan al vapor.', 'Derecho', '4.º', '#7a4a2a', '#f3e3bd', true),
      ej(4, 'finalista', 'Gilda templada', 'La gilda, pasada por la plancha.', 'Marketing', '1.º', '#6c9a3a', '#c8362e', false),
      ej(5, 'descartada', 'Tosta de sardina ahumada', 'Mar, humo y pan de masa madre.', 'Periodismo', '2.º', '#8d939b', '#d7a163', false),
      ej(6, 'lista_espera', 'Torrija salada de queso', 'Postre de abuela convertido en tapa.', 'Medicina', '5.º', '#e6c15a', '#fff', true),
    ];
    return {
      demo: true,
      async session() { return { email: 'modo demostración' }; },
      async login() { return {}; },
      async logout() {},
      async settings() { return { max_plazas: 80, max_finalistas: 8 }; },
      async list() { return rows; },
      async emails() { return [{ candidatura_id: 'ejemplo-1', tipo: 'confirmacion', asunto: 'Hemos recibido tu plato', estado: 'enviado', creado: rows[0].creado }]; },
      async update(id, patch) { rows = rows.map((r) => (r.id === id ? { ...r, ...patch } : r)); return rows.find((r) => r.id === id); },
      async urls(paths) { return Object.fromEntries(paths.map((p) => [p, p])); },
      async send() { return { demo: true }; },
    };
  }

  function liveApi() {
    const must = ({ data, error }) => { if (error) throw new Error(error.message); return data; };
    return {
      demo: false,
      async session() {
        const { data } = await sb.auth.getSession();
        if (!data.session) return null;
        const ok = must(await sb.rpc('es_admin'));
        if (!ok) { await sb.auth.signOut(); throw new Error('SIN_ACCESO'); }
        return { email: data.session.user.email };
      },
      async login(email, password) {
        const { error } = await sb.auth.signInWithPassword({ email, password });
        if (error) throw new Error('CREDENCIALES');
      },
      async logout() { await sb.auth.signOut(); },
      async settings() { return must(await sb.from('ajustes').select('*').eq('id', 1).single()); },
      async list() { return must(await sb.from('candidaturas').select('*').order('numero', { ascending: true })); },
      async emails() { return must(await sb.from('emails').select('*').order('creado', { ascending: false })); },
      async update(id, patch) { return must(await sb.from('candidaturas').update(patch).eq('id', id).select().single()); },
      // Los archivos son privados: se piden enlaces temporales (1 hora)
      async urls(paths) {
        if (!paths.length) return {};
        const data = must(await sb.storage.from(BUCKET).createSignedUrls(paths, 3600));
        return Object.fromEntries(data.filter((d) => d.signedUrl).map((d) => [d.path, d.signedUrl]));
      },
      async send(body) {
        const { data, error } = await sb.functions.invoke('enviar-email', { body });
        if (error) throw new Error('EMAIL_NO_DISPONIBLE');
        return data;
      },
    };
  }

  if (!DEMO && !sb) {
    document.body.append(h('p', { class: 'empty' }, 'No se ha podido cargar la conexión con la base de datos. Recarga la página.'));
    return;
  }
  const api = DEMO ? demoApi() : liveApi();

  /* ==========================================================
     ESTADO Y ARRANQUE
     ========================================================== */
  const state = { rows: [], emails: [], settings: { max_plazas: 80, max_finalistas: 8 }, urls: {}, filter: 'activas', q: '', open: null };

  const toastEl = $('#toast');
  let toastTimer = 0;
  function toast(msg) {
    toastEl.textContent = msg; toastEl.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(() => { toastEl.hidden = true; }, 3600);
  }

  async function boot() {
    let me = null;
    try { me = await api.session(); }
    catch (e) { showLogin(e.message === 'SIN_ACCESO' ? 'Esta cuenta no tiene acceso al panel.' : ''); return; }
    if (!me) { showLogin(''); return; }
    $('#login').hidden = true; $('#app').hidden = false;
    $('#who').textContent = me.email;
    $('#demoBanner').hidden = !api.demo;
    await reload();
  }

  function showLogin(msg) {
    $('#app').hidden = true; $('#login').hidden = false;
    const err = $('#loginError'); err.textContent = msg; err.hidden = !msg;
  }

  $('#loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = $('#loginBtn'); btn.disabled = true;
    try { await api.login($('#loginEmail').value.trim(), $('#loginPass').value); $('#loginPass').value = ''; await boot(); }
    catch { showLogin('Email o contraseña incorrectos.'); }
    finally { btn.disabled = false; }
  });
  $('#logout').addEventListener('click', async () => { await api.logout(); if (api.demo) toast('En modo demostración no hay sesión que cerrar.'); else showLogin(''); });

  async function reload() {
    try {
      const [rows, emails, settings] = await Promise.all([api.list(), api.emails(), api.settings()]);
      state.rows = rows; state.emails = emails; state.settings = settings;
      state.urls = { ...state.urls, ...(await api.urls(rows.map((r) => r.foto).filter((p) => !state.urls[p]))) };
      render();
    } catch {
      $('#list').replaceChildren();
      const empty = $('#empty'); empty.textContent = 'No se han podido cargar las candidaturas. Recarga la página.'; empty.hidden = false;
    }
  }

  /* ==========================================================
     LISTA
     ========================================================== */
  const FILTERS = [
    ['activas', 'Activas', (r) => EN_PLAZA.includes(r.estado)],
    ['finalista', 'Finalistas', (r) => r.estado === 'finalista' || r.estado === 'ganadora'],
    ['lista_espera', 'Lista de espera', (r) => r.estado === 'lista_espera'],
    ['descartada', 'Descartadas', (r) => r.estado === 'descartada'],
    ['todas', 'Todas', () => true],
  ];
  const count = (fn) => state.rows.filter(fn).length;
  const finalistas = () => count((r) => r.estado === 'finalista' || r.estado === 'ganadora');
  const enPlaza = () => count((r) => EN_PLAZA.includes(r.estado));

  function matches(r) {
    if (!state.q) return true;
    const hay = [r.plato, r.nombre, r.apellidos, r.email, r.grado, r.resumen, String(r.numero)].join(' ').toLowerCase();
    return state.q.split(/\s+/).every((w) => hay.includes(w));
  }

  function render() {
    const stat = (id, n, of) => $(id).replaceChildren(String(n), ...(of != null ? [h('small', null, ' / ' + of)] : []));
    stat('#stPlazas', enPlaza(), state.settings.max_plazas);
    stat('#stFinal', finalistas(), state.settings.max_finalistas);
    stat('#stEspera', count((r) => r.estado === 'lista_espera'));
    stat('#stVideo', count((r) => r.video && r.estado !== 'descartada'));

    $('#filters').replaceChildren(...FILTERS.map(([key, label, fn]) => h('button', {
      class: 'fchip', type: 'button', 'aria-pressed': String(state.filter === key),
      onclick: () => { state.filter = key; render(); },
    }, label, h('b', null, String(count(fn))))));

    const fn = FILTERS.find((f) => f[0] === state.filter)[2];
    const rows = state.rows.filter((r) => fn(r) && matches(r));
    $('#list').replaceChildren(...rows.map(rowEl));
    const empty = $('#empty');
    empty.hidden = rows.length > 0;
    empty.textContent = state.rows.length ? 'Ninguna candidatura coincide con la búsqueda o el filtro.' : 'Todavía no ha llegado ninguna candidatura. Aparecerán aquí en cuanto alguien envíe su plato.';
  }

  function rowEl(r) {
    const isFinal = r.estado === 'finalista' || r.estado === 'ganadora';
    return h('article', { class: 'row' },
      h('button', { class: 'row__main', type: 'button', onclick: () => openDetail(r.id) },
        h('img', { class: 'row__thumb', src: state.urls[r.foto] || '', alt: '', loading: 'lazy' }),
        h('span', { class: 'row__num' }, 'n.º ' + r.numero),
        h('span', { class: 'row__dish' }, h('strong', null, r.plato), h('span', null, `${r.nombre} ${r.apellidos}`)),
        h('span', { class: 'row__who' }, r.grado, h('span', null, r.curso + ' · ' + fecha(r.creado))),
        h('span', { class: 'row__tags' },
          r.video && h('span', { class: 'pill pill--video' }, 'Vídeo'),
          r.estado !== 'recibida' && h('span', { class: 'pill pill--' + r.estado }, ESTADOS[r.estado]))),
      h('button', {
        class: 'row__star', type: 'button', 'aria-pressed': String(isFinal),
        'aria-label': isFinal ? 'Quitar de finalistas' : 'Marcar como finalista',
        title: isFinal ? 'Quitar de finalistas' : 'Marcar como finalista',
        disabled: !EN_PLAZA.includes(r.estado) || r.estado === 'ganadora',
        onclick: () => toggleFinalist(r),
      }, isFinal ? '★' : '☆'));
  }

  $('#search').addEventListener('input', (e) => { state.q = e.target.value.trim().toLowerCase(); render(); });

  /* ==========================================================
     CAMBIOS DE ESTADO
     ========================================================== */
  async function setEstado(r, estado, msg) {
    try {
      const updated = await api.update(r.id, { estado });
      state.rows = state.rows.map((x) => (x.id === r.id ? updated : x));
      render();
      if (state.open === r.id) openDetail(r.id);
      if (msg) toast(msg);
    } catch { toast('No se ha podido guardar el cambio.'); }
  }

  function toggleFinalist(r) {
    if (r.estado === 'finalista') return setEstado(r, 'recibida', 'Quitado de finalistas.');
    if (finalistas() >= state.settings.max_finalistas) return toast(`Ya hay ${state.settings.max_finalistas} finalistas. Quita uno antes de añadir otro.`);
    return setEstado(r, 'finalista', `Finalista ${finalistas() + 1} de ${state.settings.max_finalistas}.`);
  }

  /* ==========================================================
     FICHA
     ========================================================== */
  const drawer = $('#drawer');
  const closeAll = () => { drawer.hidden = true; $('#mailer').hidden = true; state.open = null; };
  document.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) closeAll(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeAll(); });

  async function openDetail(id) {
    const r = state.rows.find((x) => x.id === id);
    if (!r) return;
    state.open = id;
    const paths = [r.foto, ...(r.fotos || []), r.video].filter((p) => p && !state.urls[p]);
    if (paths.length) { try { Object.assign(state.urls, await api.urls(paths)); } catch { /* se pinta sin archivos */ } }
    if (state.open !== id) return;

    const sec = (title, ...kids) => h('section', { class: 'd-sec' }, title && h('h3', null, title), ...kids);
    const mails = state.emails.filter((m) => m.candidatura_id === r.id);
    const isFinal = r.estado === 'finalista';
    let confirmDiscard = false;

    const discardBtn = h('button', { class: 'btn btn--sm btn--danger', type: 'button', onclick: () => {
      if (!confirmDiscard) { confirmDiscard = true; discardBtn.textContent = '¿Seguro? Pulsa otra vez para descartar'; return; }
      setEstado(r, 'descartada', 'Candidatura descartada. Su plaza queda libre.');
    } }, 'Descartar');

    const actions = [];
    if (r.estado === 'recibida' || isFinal) actions.push(h('button', { class: 'btn btn--sm ' + (isFinal ? 'btn--ghost' : 'btn--primary'), type: 'button', onclick: () => toggleFinalist(r) }, isFinal ? 'Quitar de finalistas' : 'Marcar como finalista'));
    if (isFinal && !state.rows.some((x) => x.estado === 'ganadora')) actions.push(h('button', { class: 'btn btn--sm btn--primary', type: 'button', onclick: () => setEstado(r, 'ganadora', 'Marcada como ganadora.') }, 'Marcar como ganadora'));
    if (r.estado === 'ganadora') actions.push(h('button', { class: 'btn btn--sm btn--ghost', type: 'button', onclick: () => setEstado(r, 'finalista', 'Vuelve a finalista.') }, 'Quitar ganadora'));
    if (r.estado === 'lista_espera' || r.estado === 'descartada') {
      const hayPlaza = enPlaza() < state.settings.max_plazas;
      actions.push(h('button', { class: 'btn btn--sm btn--primary', type: 'button', onclick: () => (hayPlaza
        ? setEstado(r, 'recibida', 'Candidatura con plaza.')
        : (r.estado === 'descartada' ? setEstado(r, 'lista_espera', 'No quedan plazas: pasa a lista de espera.') : toast('No quedan plazas libres.'))) },
      r.estado === 'descartada' ? 'Recuperar' : 'Dar plaza'));
    }
    if (r.estado !== 'descartada') actions.push(discardBtn);

    const notes = h('textarea', { id: 'dNotes', placeholder: 'Solo las ven los organizadores.' });
    notes.value = r.notas || '';
    notes.addEventListener('change', async () => {
      try { const u = await api.update(r.id, { notas: notes.value }); state.rows = state.rows.map((x) => (x.id === r.id ? u : x)); toast('Notas guardadas.'); }
      catch { toast('No se han podido guardar las notas.'); }
    });

    $('#drawerBody').replaceChildren(
      h('header', { class: 'd-head' },
        h('div', null,
          h('h2', { id: 'dTitle' }, r.plato),
          h('p', null, h('span', { class: 'pill pill--' + r.estado }, ESTADOS[r.estado]), `n.º ${r.numero} · ${fecha(r.creado)}`)),
        h('button', { class: 'icon-btn', type: 'button', 'data-close': true, 'aria-label': 'Cerrar' }, '×')),
      sec(null, h('div', { class: 'd-actions' }, ...actions)),
      sec(null, h('div', { class: 'd-gallery' }, ...[r.foto, ...(r.fotos || [])].map((p) => h('a', { href: state.urls[p] || '#', target: '_blank', rel: 'noopener' }, h('img', { src: state.urls[p] || '', alt: 'Foto del plato' }))))),
      r.video && sec('Vídeo', api.demo ? h('p', { class: 'hint' }, 'En el panel real aquí se reproduce el vídeo del participante.') : h('video', { src: state.urls[r.video] || '', controls: true, preload: 'metadata' })),
      sec(null, h('p', { class: 'd-lead' }, r.resumen)),
      sec('La idea', h('p', null, r.concepto)),
      sec('Ingredientes', h('table', { class: 'd-ings' }, h('tbody', null, ...(r.ingredientes || []).map((i) => h('tr', null, h('td', null, i.n), h('td', null, `${i.q || ''} ${i.u || ''}`.trim())))))),
      sec('Elaboración', h('p', null, r.elaboracion)),
      sec('Alérgenos', (r.alergenos || []).length ? h('div', { class: 'd-chips' }, ...r.alergenos.map((a) => h('span', { class: 'pill' }, a))) : h('p', { class: 'hint' }, 'No ha marcado ninguno.')),
      sec('Participante', h('dl', { class: 'd-facts' },
        h('dt', null, 'Nombre'), h('dd', null, `${r.nombre} ${r.apellidos}`),
        h('dt', null, 'Email'), h('dd', null, r.email),
        h('dt', null, 'Teléfono'), h('dd', null, r.telefono),
        h('dt', null, 'Estudios'), h('dd', null, `${r.grado} · ${r.curso}`))),
      h('section', { class: 'd-sec d-notes' }, h('h3', null, h('label', { for: 'dNotes' }, 'Notas internas')), notes),
      sec('Emails enviados', mails.length
        ? h('ul', { class: 'd-mails' }, ...mails.map((m) => h('li', null, h('span', null, m.asunto || m.tipo), h('span', { class: m.estado === 'enviado' ? '' : 'bad' }, `${m.estado === 'enviado' ? 'Enviado' : 'Error'} · ${fecha(m.creado)}`))))
        : h('p', { class: 'hint' }, 'Todavía no se le ha enviado ningún email.')),
    );
    drawer.hidden = false;
    $('.drawer__panel', drawer).scrollTop = 0;
  }

  /* ==========================================================
     EXPORTAR
     ========================================================== */
  $('#exportBtn').addEventListener('click', () => {
    const cols = ['numero', 'estado', 'creado', 'nombre', 'apellidos', 'email', 'telefono', 'grado', 'curso', 'plato', 'resumen', 'concepto', 'ingredientes', 'elaboracion', 'alergenos', 'video', 'notas'];
    const cell = (r, c) => {
      let v = r[c];
      if (c === 'ingredientes') v = (v || []).map((i) => `${i.n} (${`${i.q || ''} ${i.u || ''}`.trim()})`).join('; ');
      else if (c === 'alergenos') v = (v || []).join('; ');
      else if (c === 'video') v = v ? 'sí' : 'no';
      else if (c === 'estado') v = ESTADOS[v] || v;
      v = String(v == null ? '' : v);
      if (/^[=+\-@]/.test(v)) v = "'" + v; // evita que Excel lo interprete como fórmula
      return '"' + v.replace(/"/g, '""') + '"';
    };
    const csv = '﻿' + [cols.join(';'), ...state.rows.map((r) => cols.map((c) => cell(r, c)).join(';'))].join('\r\n');
    const a = h('a', { href: URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' })), download: 'candidaturas-concurso-tapas.csv' });
    document.body.append(a); a.click(); a.remove();
    toast(`Exportadas ${state.rows.length} candidaturas.`);
  });

  /* ==========================================================
     EMAILS
     ========================================================== */
  const AUDIENCES = [
    ['finalistas', 'Finalistas', (r) => r.estado === 'finalista' || r.estado === 'ganadora'],
    ['no_finalistas', 'Con plaza que no son finalistas', (r) => r.estado === 'recibida'],
    ['espera', 'Lista de espera', (r) => r.estado === 'lista_espera'],
    ['activas', 'Todas las candidaturas con plaza', (r) => EN_PLAZA.includes(r.estado)],
  ];
  const TEMPLATES = {
    finalistas: ['Tu plato es finalista del Concurso de Tapas UFV',
      'Hola {{nombre}}:\n\nEl jurado de 80 Grados ha elegido «{{plato}}» como uno de los 8 platos finalistas.\n\nLa final en directo será el [FECHA] a las [HORA] en [LUGAR]. Cocinarás tu plato delante del jurado; te escribiremos con los detalles de material e ingredientes.\n\nConfírmanos tu asistencia respondiendo a este email.\n\nEnhorabuena,\nInvesting UFV × 80 Grados'],
    no_finalistas: ['Gracias por participar en el Concurso de Tapas UFV',
      'Hola {{nombre}}:\n\nGracias por presentar «{{plato}}». Esta vez no ha sido seleccionado entre los 8 finalistas, pero el jurado ha valorado cada propuesta.\n\nTe esperamos en la final en directo: [FECHA], [LUGAR].\n\nInvesting UFV × 80 Grados'],
    espera: ['Tu plato sigue en lista de espera', 'Hola {{nombre}}:\n\n«{{plato}}» sigue en lista de espera. Te avisaremos si queda una plaza libre.\n\nInvesting UFV × 80 Grados'],
    activas: ['Concurso de Tapas UFV', 'Hola {{nombre}}:\n\n[MENSAJE]\n\nInvesting UFV × 80 Grados'],
  };
  const mailer = $('#mailer');
  const mAudience = $('#mAudience'), mSubject = $('#mSubject'), mBody = $('#mBody'), mSend = $('#mSend'), mError = $('#mError');
  AUDIENCES.forEach(([k, label]) => mAudience.add(new Option(label, k)));
  const recipients = () => state.rows.filter(AUDIENCES.find((a) => a[0] === mAudience.value)[2]);
  const fill = (t, r) => t.replace(/\{\{\s*nombre\s*\}\}/g, r.nombre).replace(/\{\{\s*plato\s*\}\}/g, r.plato);
  let armed = false;

  function refreshMailer() {
    const to = recipients();
    armed = false;
    mError.hidden = true;
    mSend.disabled = !to.length;
    mSend.textContent = to.length ? `Enviar a ${to.length} ${to.length === 1 ? 'persona' : 'personas'}` : 'Nadie en este grupo';
    $('#mPreview').replaceChildren(...(to.length
      ? [h('strong', null, `Así lo recibirá ${to[0].nombre} ${to[0].apellidos}`), h('pre', null, fill(mSubject.value, to[0]) + '\n\n' + fill(mBody.value, to[0]))]
      : ['No hay nadie en este grupo todavía.']));
  }
  function loadTemplate() { [mSubject.value, mBody.value] = TEMPLATES[mAudience.value]; refreshMailer(); }
  mAudience.addEventListener('change', loadTemplate);
  mSubject.addEventListener('input', refreshMailer);
  mBody.addEventListener('input', refreshMailer);
  $('#mailBtn').addEventListener('click', () => { closeAll(); mAudience.value = 'finalistas'; loadTemplate(); mailer.hidden = false; });

  mSend.addEventListener('click', async () => {
    const to = recipients();
    const fail = (msg) => { mError.textContent = msg; mError.hidden = false; armed = false; refreshSendLabel(to); };
    const refreshSendLabel = (list) => { mSend.textContent = `Enviar a ${list.length} ${list.length === 1 ? 'persona' : 'personas'}`; };
    if (!mSubject.value.trim() || !mBody.value.trim()) return fail('Faltan el asunto o el mensaje.');
    if (/\[[A-ZÁÉÍÓÚÑ ]+\]/.test(mSubject.value + mBody.value)) return fail('Quedan datos por completar entre corchetes (por ejemplo [FECHA]).');
    if (!armed) { armed = true; mError.hidden = true; mSend.textContent = `Confirmar envío a ${to.length}`; return; }
    mSend.disabled = true; mSend.textContent = 'Enviando…';
    try {
      const res = await api.send({ tipo: 'personalizado', etiqueta: mAudience.value === 'finalistas' ? 'finalista' : 'personalizado', ids: to.map((r) => r.id), asunto: mSubject.value.trim(), cuerpo: mBody.value.trim() });
      mailer.hidden = true;
      if (res && res.demo) toast('Modo demostración: no se ha enviado ningún email.');
      else { toast(`Enviados: ${res.enviados}. Errores: ${res.errores}.`); state.emails = await api.emails(); }
    } catch {
      fail('El envío de emails todavía no está activado o ha fallado. No se ha enviado nada.');
    } finally { mSend.disabled = false; }
  });

  boot();
})();
