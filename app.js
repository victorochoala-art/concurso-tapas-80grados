/* Concurso de Tapas UFV × 80 Grados */
(() => {
  'use strict';

  // Sin servidor conectado: el formulario se recorre entero pero no envía ni guarda nada fuera del dispositivo.
  // La conexión se define en config.js. Con ella puesta, el formulario guarda de verdad.
  const cfg = window.CONCURSO_CONFIG || {};
  const DEMO = !(cfg.supabaseUrl && cfg.supabaseAnonKey);
  const sb = !DEMO && window.supabase
    ? window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, { auth: { persistSession: false } })
    : null;
  const BUCKET = cfg.bucket || 'candidaturas';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  $('#demoNote').hidden = !DEMO;

  /* ==========================================================
     ESCENA FLOTANTE
     ========================================================== */
  // Los dibujos viven en art.js
  const { defs: SCENE_DEFS, art: ART } = window.SCENE_ART;
  $("#sceneDefs").innerHTML = `<defs>${SCENE_DEFS}</defs>`;

  // t: objeto · d: [x %, y %, ancho] en escritorio · m: lo mismo en móvil (sin m = solo escritorio)
  // r: rotación · z: profundidad (más = más cerca, se mueve más) · b: desenfoque · o: opacidad
  const SCENE = [
    { t: 'basil',   d: [3, 22, 300],  m: [-1, 35, 150], r: 38,  z: 1.5, b: 7, o: .9 },
    { t: 'tomato',  d: [96, 88, 240], m: [101, 30, 124], r: 0,  z: 1.5, b: 8, o: .9 },
    { t: 'pan',     d: [10, 82, 400], m: [22, 96, 250], r: -22, z: 1 },
    { t: 'oil',     d: [87, 30, 92],  m: [89, 83, 58],  r: 12,  z: .7 },
    { t: 'tomato',  d: [21, 24, 104], m: [13, 17, 62],  r: -8,  z: .8 },
    { t: 'tomato',  d: [77, 71, 64],  m: [58, 90, 40],  r: 10,  z: .5 },
    { t: 'basil',   d: [33, 11, 120], m: [80, 14, 92],  r: -24, z: .55 },
    { t: 'basil',   d: [66, 13, 84],  r: 28, z: .35, b: 1.2 },
    { t: 'spoon',   d: [13, 44, 50],  r: 28, z: .6 },
    { t: 'spatula', d: [90, 61, 54],  r: -20, z: .75 },
    { t: 'bread',   d: [68, 91, 130], r: -10, z: .55 },
    { t: 'chili',   d: [81, 11, 130], m: [74, 95, 88],  r: 14,  z: .5 },
    { t: 'garlic',  d: [35, 92, 66],  r: -12, z: .4 },
    { t: 'pepper',  d: [27, 62, 12],  m: [31, 21, 8],   z: .9 },
    { t: 'pepper',  d: [73, 45, 9],   m: [88, 66, 7],   z: .6 },
    { t: 'pepper',  d: [43, 7, 8],    z: .4, b: .6 },
    { t: 'pepper',  d: [58, 95, 10],  m: [44, 82, 7],   z: .7 },
    { t: 'pepper',  d: [17, 68, 7],   z: .3, b: .8 },
    { t: 'pepper',  d: [62, 24, 6],   z: .3, b: 1 },
  ];

  const hero = $('#hero');
  const scene = $('#scene');

  SCENE.forEach((o, i) => {
    const el = document.createElement('div');
    el.className = 'obj' + (o.m ? '' : ' obj--desk');
    const set = (k, v) => el.style.setProperty(k, v);
    set('--x', o.d[0]); set('--y', o.d[1]); set('--s', o.d[2]);
    if (o.m) { set('--mx', o.m[0]); set('--my', o.m[1]); set('--ms', o.m[2]); }
    set('--rot', (o.r || 0) + 'deg');
    set('--amp', (o.z * 26).toFixed(1) + 'px');
    set('--blur', (o.b || 0) + 'px');
    set('--o', o.o || 1);
    set('--fy', (5 + o.z * 7).toFixed(1) + 'px');
    set('--fr', (1.2 + (i % 3) * .9).toFixed(1) + 'deg');
    set('--dur', (6.5 + ((i * 1.7) % 5)).toFixed(1) + 's');
    set('--delay', (-((i * 1.3) % 7)).toFixed(1) + 's');
    set('--i', i);
    el.innerHTML = `<div class="obj__float"><div class="obj__art">${ART[o.t]}</div></div>`;
    scene.append(el);
  });

  // Paralaje: ratón en escritorio, scroll en todos
  if (!reduceMotion) {
    let tx = 0, ty = 0, cx = 0, cy = 0, raf = 0;
    const tick = () => {
      cx += (tx - cx) * .06; cy += (ty - cy) * .06;
      hero.style.setProperty('--px', cx.toFixed(4));
      hero.style.setProperty('--py', cy.toFixed(4));
      raf = Math.abs(tx - cx) + Math.abs(ty - cy) > .001 ? requestAnimationFrame(tick) : 0;
    };
    window.addEventListener('pointermove', (e) => {
      if (e.pointerType === 'touch') return;
      tx = (e.clientX / innerWidth - .5) * 2;
      ty = (e.clientY / innerHeight - .5) * 2;
      if (!raf) raf = requestAnimationFrame(tick);
    }, { passive: true });

    let ticking = false;
    window.addEventListener('scroll', () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        hero.style.setProperty('--sy', Math.min(scrollY / innerHeight, 1).toFixed(4));
        ticking = false;
      });
    }, { passive: true });
  }

  /* ==========================================================
     CIFRAS 80 · 8 · 1
     ========================================================== */
  if ('IntersectionObserver' in window && !reduceMotion) {
    const io = new IntersectionObserver((entries) => entries.forEach((e) => {
      if (!e.isIntersecting) return;
      io.unobserve(e.target);
      const n = +e.target.dataset.count;
      if (n < 2) return;
      const t0 = performance.now(), dur = 1100;
      const frame = (t) => {
        const p = Math.min((t - t0) / dur, 1);
        e.target.textContent = Math.max(1, Math.round(n * (1 - Math.pow(1 - p, 3))));
        if (p < 1) requestAnimationFrame(frame);
      };
      requestAnimationFrame(frame);
    }), { threshold: .6 });
    $$('.count__n').forEach((n) => io.observe(n));
  }

  /* ==========================================================
     BOTÓN FIJO EN MÓVIL
     ========================================================== */
  const sticky = $('#stickyCta');
  if ('IntersectionObserver' in window) {
    const seen = new Map();
    const io2 = new IntersectionObserver((entries) => {
      entries.forEach((e) => seen.set(e.target.id, e.isIntersecting));
      sticky.classList.toggle('is-visible', !seen.get('heroCta') && !seen.get('closeCard'));
    });
    io2.observe($('#heroCta'));
    io2.observe($('#closeCard'));
  }

  // Enlaces legales todavía sin página
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[data-pending]');
    if (a) { e.preventDefault(); e.stopPropagation(); }
  });

  /* ==========================================================
     FORMULARIO
     ========================================================== */
  const landing = $('#landing');
  const formView = $('#registro');
  const form = $('#form');
  const steps = $$('.step', form);
  const fnav = $('#fnav');
  const nextBtn = $('#nextBtn');
  const prevBtn = $('#prevBtn');
  const thermo = $('#thermo');
  const thermoFill = $('#thermoFill');
  const thermoLabel = $('#thermoLabel');
  const ingList = $('#ingList');
  const TEMPS = ['20°', '40°', '60°', '80°'];
  const UNITS = ['g', 'ml', 'ud', 'cda', 'cdta', 'pizca'];
  const ALLERGENS = ['Gluten', 'Crustáceos', 'Huevo', 'Pescado', 'Cacahuetes', 'Soja', 'Lácteos', 'Frutos de cáscara', 'Apio', 'Mostaza', 'Sésamo', 'Sulfitos', 'Altramuces', 'Moluscos'];
  const DRAFT_KEY = 'tapas80:borrador';
  let current = 1;

  // Un hueco de error por campo
  $$('.field', form).forEach((f) => {
    const p = document.createElement('p');
    p.className = 'field__error';
    p.setAttribute('aria-live', 'polite');
    f.append(p);
  });
  const setError = (field, msg) => {
    field.classList.toggle('has-error', !!msg);
    $('.field__error', field).textContent = msg || '';
  };

  // Contador de caracteres
  $$('[data-counter]', form).forEach((input) => {
    const c = document.createElement('p');
    c.className = 'field__count';
    input.after(c);
    const upd = () => { c.textContent = `${input.value.length} / ${input.maxLength}`; };
    input.addEventListener('input', upd);
    input._updCount = upd;
    upd();
  });

  // Ingredientes
  function addIngredient(v = {}) {
    const row = document.createElement('div');
    row.className = 'ing';
    const name = Object.assign(document.createElement('input'), { name: 'ing_nombre', placeholder: 'Ingrediente', autocomplete: 'off', value: v.n || '' });
    name.setAttribute('aria-label', 'Ingrediente');
    const qty = Object.assign(document.createElement('input'), { name: 'ing_cantidad', placeholder: 'Cant.', inputMode: 'decimal', autocomplete: 'off', value: v.q || '' });
    qty.setAttribute('aria-label', 'Cantidad');
    const unit = document.createElement('select');
    unit.name = 'ing_unidad';
    unit.setAttribute('aria-label', 'Unidad');
    UNITS.forEach((u) => unit.add(new Option(u, u)));
    if (v.u && UNITS.includes(v.u)) unit.value = v.u;
    const del = Object.assign(document.createElement('button'), { type: 'button', className: 'ing__del', textContent: '×' });
    del.setAttribute('aria-label', 'Quitar ingrediente');
    del.addEventListener('click', () => {
      if ($$('.ing', ingList).length > 1) row.remove();
      else { name.value = ''; qty.value = ''; }
      saveDraft();
    });
    row.append(name, qty, unit, del);
    ingList.append(row);
    return name;
  }
  $('#ingAdd').addEventListener('click', () => addIngredient().focus());

  // Alérgenos
  const allergenBox = $('#alergenos');
  ALLERGENS.forEach((a) => {
    const b = Object.assign(document.createElement('button'), { type: 'button', className: 'chip-btn', textContent: a });
    b.setAttribute('aria-pressed', 'false');
    b.addEventListener('click', () => {
      b.setAttribute('aria-pressed', b.getAttribute('aria-pressed') === 'true' ? 'false' : 'true');
      saveDraft();
    });
    allergenBox.append(b);
  });

  // Archivos
  const foto = $('#foto');
  const fotoPreview = $('#fotoPreview');
  const photoPlate = $('#photoPlate');
  foto.addEventListener('change', () => {
    const f = foto.files[0];
    if (!f) return;
    fotoPreview.src = URL.createObjectURL(f);
    fotoPreview.hidden = false;
    photoPlate.classList.add('has-photo');
    setError($('#fotoField'), '');
  });

  const fotos = $('#fotos');
  const thumbs = $('#thumbs');
  fotos.addEventListener('change', () => {
    $$('.thumb:not(.thumb--add)', thumbs).forEach((t) => t.remove());
    [...fotos.files].slice(0, 4).forEach((f) => {
      const t = document.createElement('div');
      t.className = 'thumb';
      const img = Object.assign(document.createElement('img'), { src: URL.createObjectURL(f), alt: '' });
      t.append(img);
      thumbs.insertBefore(t, $('.thumb--add', thumbs));
    });
    $('.thumb--add', thumbs).hidden = fotos.files.length >= 4;
  });

  const video = $('#video');
  const MAX_VIDEO_MB = cfg.maxVideoMB || 50;
  const VIDEO_EXT = { 'video/mp4': 'mp4', 'video/quicktime': 'mov', 'video/webm': 'webm' };
  const videoProblem = (f) => {
    if (!f) return '';
    if (!VIDEO_EXT[f.type]) return 'Formato de vídeo no admitido. Usa MP4 o MOV.';
    if (f.size / 1048576 > MAX_VIDEO_MB) return `El vídeo pesa demasiado (máx. ${MAX_VIDEO_MB} MB). Prueba con uno más corto.`;
    return '';
  };
  video.addEventListener('change', () => {
    const f = video.files[0];
    if (!f) return;
    $('#videoLabel').textContent = `${f.name} · ${Math.max(1, Math.round(f.size / 1048576))} MB`;
    setError($('#videoField'), videoProblem(f));
  });

  // Borrador en el dispositivo (solo texto)
  function saveDraft() {
    try {
      const fields = {};
      $$('input:not([type=file]):not([type=checkbox]), select, textarea', form).forEach((el) => {
        if (el.name && !el.name.startsWith('ing_')) fields[el.name] = el.value;
      });
      const ings = $$('.ing', ingList).map((r) => ({
        n: $('[name=ing_nombre]', r).value, q: $('[name=ing_cantidad]', r).value, u: $('[name=ing_unidad]', r).value,
      }));
      const alls = $$('.chip-btn[aria-pressed=true]', allergenBox).map((b) => b.textContent);
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ fields, ings, alls, step: Math.min(current, 4) }));
    } catch { /* almacenamiento no disponible: se sigue sin borrador */ }
  }
  function loadDraft() {
    let d = null;
    try { d = JSON.parse(localStorage.getItem(DRAFT_KEY)); } catch { /* sin borrador */ }
    if (d && d.fields) {
      Object.entries(d.fields).forEach(([k, v]) => { const el = form.elements[k]; if (el && typeof v === 'string') el.value = v; });
      $$('[data-counter]', form).forEach((i) => i._updCount && i._updCount());
    }
    const ings = d && Array.isArray(d.ings) && d.ings.length ? d.ings : [{}, {}, {}];
    ings.forEach((i) => addIngredient(i));
    if (d && Array.isArray(d.alls)) {
      $$('.chip-btn', allergenBox).forEach((b) => b.setAttribute('aria-pressed', String(d.alls.includes(b.textContent))));
    }
    if (d && d.step >= 1 && d.step <= 4) current = d.step;
  }
  let saveTimer = 0;
  form.addEventListener('input', () => { clearTimeout(saveTimer); saveTimer = setTimeout(saveDraft, 400); });
  loadDraft();

  // Validación
  function validate(n) {
    const step = steps[n - 1];
    let first = null;
    $$('.field', step).forEach((f) => {
      if (f.classList.contains('field--group')) return;
      const el = $('input, select, textarea', f);
      if (!el) return;
      const v = el.value.trim();
      let msg = '';
      if (el.required && !v) msg = 'Este campo es obligatorio.';
      else if (el.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) msg = 'Revisa el email.';
      else if (el.type === 'tel' && v.replace(/\D/g, '').length < 9) msg = 'Revisa el teléfono.';
      setError(f, msg);
      if (msg && !first) first = el;
    });
    if (n === 3) {
      const rows = $$('.ing', ingList);
      const filled = rows.filter((r) => $('[name=ing_nombre]', r).value.trim());
      const noQty = filled.some((r) => !$('[name=ing_cantidad]', r).value.trim());
      const msg = !filled.length ? 'Añade al menos un ingrediente.' : noQty ? 'Indica la cantidad de cada ingrediente.' : '';
      setError($('#ingField'), msg);
      if (msg && !first) first = $('input', rows[0]);
    }
    if (n === 4) {
      const noFoto = !foto.files.length;
      setError($('#fotoField'), noFoto ? 'Falta la foto principal del plato.' : '');
      if (noFoto && !first) first = foto;
      const badVideo = videoProblem(video.files[0]);
      setError($('#videoField'), badVideo);
      if (badVideo && !first) first = video;
      const legal = $('#bases').checked && $('#privacidad').checked;
      setError($('#legalField'), legal ? '' : 'Tienes que aceptar las bases y la política de privacidad.');
      if (!legal && !first) first = $('#bases');
    }
    if (first) { first.focus({ preventScroll: true }); first.closest('.field').scrollIntoView({ block: 'center', behavior: reduceMotion ? 'auto' : 'smooth' }); }
    return !first;
  }
  // Los errores se limpian al corregir
  form.addEventListener('input', (e) => { const f = e.target.closest('.field'); if (f && f.classList.contains('has-error')) setError(f, ''); });
  form.addEventListener('change', (e) => { const f = e.target.closest('.field'); if (f && e.target.type === 'checkbox') setError(f, ''); });

  function resetForm() {
    form.reset();
    ingList.replaceChildren();
    [{}, {}, {}].forEach((i) => addIngredient(i));
    $$('.chip-btn', allergenBox).forEach((b) => b.setAttribute('aria-pressed', 'false'));
    $$('[data-counter]', form).forEach((i) => i._updCount && i._updCount());
    fotoPreview.hidden = true;
    fotoPreview.removeAttribute('src');
    photoPlate.classList.remove('has-photo');
    $$('.thumb:not(.thumb--add)', thumbs).forEach((t) => t.remove());
    $('.thumb--add', thumbs).hidden = false;
    $('#videoLabel').textContent = 'Añadir vídeo';
  }

  function showStep(n, focus = true) {
    current = n;
    steps.forEach((s) => { s.hidden = +s.dataset.step !== n; });
    const done = n === 5;
    fnav.hidden = done;
    thermo.style.visibility = done ? 'hidden' : '';
    if (!done) {
      thermoFill.style.width = n * 25 + '%';
      thermoLabel.textContent = TEMPS[n - 1];
      thermo.setAttribute('aria-valuenow', n);
      nextBtn.textContent = n === 4 ? 'Enviar mi plato' : 'Continuar';
    }
    window.scrollTo(0, 0);
    if (focus) $('.step__title', steps[n - 1]).focus({ preventScroll: true });
  }

  /* ---------- Envío real ---------- */
  const submitError = $('#submitError');
  const ERRORS = {
    AUN_NO_ABIERTO: 'La inscripción todavía no está abierta.',
    CERRADO: 'El plazo de inscripción ha terminado.',
    EMAIL_REPETIDO: 'Ya hay un plato registrado con este email. Solo se admite uno por persona.',
    EMAIL_INVALIDO: 'Revisa el email del paso 1.',
    DATOS_INCOMPLETOS: 'Falta algún dato. Revisa los pasos anteriores.',
    FALTA_CONSENTIMIENTO: 'Tienes que aceptar las bases y la política de privacidad.',
    ARCHIVO_INVALIDO: 'No hemos podido guardar alguna foto o el vídeo. Vuelve a intentarlo.',
  };
  let sending = false;

  const newId = () => (crypto.randomUUID ? crypto.randomUUID()
    : '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, (c) => (c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))).toString(16)));

  // Las fotos del móvil pesan mucho: se reducen a 2000 px y JPEG antes de subirlas
  async function toJpeg(file) {
    try {
      const bmp = await createImageBitmap(file);
      const k = Math.min(1, 2000 / Math.max(bmp.width, bmp.height));
      const c = document.createElement('canvas');
      c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
      c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
      const blob = await new Promise((r) => c.toBlob(r, 'image/jpeg', .86));
      if (blob) return { blob, type: 'image/jpeg', ext: 'jpg' };
    } catch { /* si el navegador no puede leerla, se sube tal cual */ }
    const ext = { 'image/png': 'png', 'image/webp': 'webp', 'image/heic': 'heic', 'image/heif': 'heif' }[file.type] || 'jpg';
    return { blob: file, type: file.type || 'image/jpeg', ext };
  }

  async function sendCandidatura() {
    if (!sb) throw new Error('SIN_CONEXION');
    const id = newId();
    const store = sb.storage.from(BUCKET);
    const up = async (path, blob, type) => {
      const { error } = await store.upload(path, blob, { contentType: type, upsert: false });
      if (error) throw new Error('ARCHIVO_INVALIDO');
      return path;
    };
    const extras = [...fotos.files].slice(0, 4);
    const vid = video.files[0];
    const total = 1 + extras.length + (vid ? 1 : 0);
    let n = 0;
    const say = (what) => { nextBtn.textContent = `Subiendo ${what}… ${++n} de ${total}`; };

    say('foto');
    const main = await toJpeg(foto.files[0]);
    const fotoPath = await up(`${id}/foto.${main.ext}`, main.blob, main.type);
    const fotosPaths = [];
    for (const [i, f] of extras.entries()) {
      say('foto');
      const im = await toJpeg(f);
      fotosPaths.push(await up(`${id}/extra-${i + 1}.${im.ext}`, im.blob, im.type));
    }
    let videoPath = null;
    if (vid) {
      say('vídeo');
      videoPath = await up(`${id}/video.${VIDEO_EXT[vid.type]}`, vid, vid.type);
    }

    nextBtn.textContent = 'Registrando…';
    const val = (name) => form.elements[name].value.trim();
    const payload = {
      id,
      nombre: val('nombre'), apellidos: val('apellidos'), email: val('email'), telefono: val('telefono'),
      grado: val('grado'), curso: val('curso'),
      plato: val('plato'), resumen: val('resumen'), concepto: val('concepto'), elaboracion: val('elaboracion'),
      ingredientes: $$('.ing', ingList)
        .map((r) => ({ n: $('[name=ing_nombre]', r).value.trim(), q: $('[name=ing_cantidad]', r).value.trim(), u: $('[name=ing_unidad]', r).value }))
        .filter((i) => i.n),
      alergenos: $$('.chip-btn[aria-pressed=true]', allergenBox).map((b) => b.textContent),
      foto: fotoPath, fotos: fotosPaths, video: videoPath,
      acepta_bases: $('#bases').checked, acepta_privacidad: $('#privacidad').checked,
    };
    const { data, error } = await sb.rpc('registrar_candidatura', { p: payload });
    if (error) throw new Error((error.message || '').trim());
    // El email de confirmación va aparte: si falla, la candidatura ya está guardada
    sb.functions.invoke('enviar-email', { body: { tipo: 'confirmacion', id } }).catch(() => {});
    return data;
  }

  function showDone(result) {
    $('#doneDemo').hidden = !DEMO;
    const text = $('#doneText');
    if (DEMO) {
      text.textContent = 'Así verá el participante la confirmación al enviar su candidatura.';
    } else if (result && result.estado === 'lista_espera') {
      $('#doneTitle').textContent = 'Estás en lista de espera.';
      text.textContent = `Las ${result.max_plazas} plazas están ocupadas. Hemos guardado tu plato y te avisaremos por email si queda una libre.`;
    } else {
      text.textContent = `Plato n.º ${result.numero} registrado. Guarda este número: es tu referencia en el concurso.`;
    }
    try { localStorage.removeItem(DRAFT_KEY); } catch { /* nada que borrar */ }
    resetForm();
    showStep(5);
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (sending || !validate(current)) return;
    if (current < 4) { showStep(current + 1); saveDraft(); return; }
    submitError.hidden = true;
    let result = null;
    if (!DEMO) {
      sending = true; nextBtn.disabled = true; prevBtn.disabled = true;
      try {
        result = await sendCandidatura();
      } catch (err) {
        submitError.textContent = ERRORS[err.message] || 'No se ha podido enviar. Comprueba la conexión y vuelve a intentarlo.';
        submitError.hidden = false;
        return;
      } finally {
        sending = false; nextBtn.disabled = false; prevBtn.disabled = false;
        nextBtn.textContent = 'Enviar mi plato';
      }
    }
    showDone(result);
  });
  prevBtn.addEventListener('click', () => {
    if (current > 1) showStep(current - 1);
    else location.hash = '';
  });

  /* ==========================================================
     NAVEGACIÓN LANDING ↔ FORMULARIO
     ========================================================== */
  // Plazas libres y plazo, leídos de la base de datos
  let closed = false;
  if (sb) {
    sb.rpc('estado_concurso').then(({ data }) => {
      if (!data) return;
      const t = $('#plazasText');
      const libres = Math.max(0, data.max_plazas - data.ocupadas);
      if (data.abierto) {
        t.textContent = libres ? `Quedan ${libres} de ${data.max_plazas} plazas` : 'Plazas completas · lista de espera';
        return;
      }
      closed = true;
      const label = data.aun_no ? 'Abre el 1 de diciembre' : 'Inscripción cerrada';
      t.textContent = label;
      $$('a[href="#registro"]').forEach((a) => {
        a.removeAttribute('href'); a.classList.add('is-disabled'); a.setAttribute('aria-disabled', 'true');
        a.firstChild.textContent = label;
      });
      route();
    }, () => { /* sin conexión: la landing se queda con el texto fijo */ });
  }

  function route() {
    const onForm = location.hash === '#registro' && !closed;
    landing.hidden = onForm;
    formView.hidden = !onForm;
    if (onForm) showStep(current === 5 ? 1 : current, false);
    window.scrollTo(0, 0);
  }
  window.addEventListener('hashchange', route);
  route();
})();
