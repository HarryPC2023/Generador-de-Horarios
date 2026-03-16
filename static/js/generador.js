// ── CONSTANTES ────────────────────────────────────────────────
const DIAS = ["LUNES", "MARTES", "MIERCOLES", "JUEVES", "VIERNES", "SABADO"];
const DIAS_LABEL = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const ROW_H = 38;
const HOUR_START = 7;
const HOUR_END = 22;

const PALETTE = [
  "#0ea5e9", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444",
  "#0891b2", "#16a34a", "#84cc16", "#f97316", "#6366f1"
];

let courseColors = {};
let combosValidos = [];
let currentIndex = 0;
let maxCruces = 0;
let seccionesData = {};

// cargaGlobal viene de generador.html (recuperada de sessionStorage)
// Es el equivalente de carga_horaria en app.py
// Se declara aquí como let por si no fue definida antes
if (typeof cargaGlobal === 'undefined') var cargaGlobal = null;

// ── TOOLTIP ───────────────────────────────────────────────────
let tooltipEl = null;
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('calendarWrap')) {
    tooltipEl = document.createElement('div');
    tooltipEl.className = 'tooltip';
    document.body.appendChild(tooltipEl);
  }
  if (document.getElementById('crucesInput')) {
    setCruces(0);
  }
});

// ── INICIALIZAR ───────────────────────────────────────────────
// Antes hacía fetch('/secciones') al servidor Flask.
// Ahora lee directamente de cargaGlobal (que viene de sessionStorage).
function inicializar(cursos) {
  if (!cursos || !cursos.length) {
    window.location.href = 'index.html';
    return;
  }

  // Si no hay carga horaria en memoria, el usuario llegó sin pasar por index
  if (!cargaGlobal) {
    document.getElementById('listaCursos').innerHTML =
      '<div style="color:#ef4444;font-size:12px">Sin datos. <a href="index.html">Vuelve al inicio</a> y carga el Excel.</div>';
    return;
  }

  // Asigna un color a cada curso — igual que antes
  cursos.forEach((c, i) => {
    courseColors[c] = PALETTE[i % PALETTE.length];
  });

  // Construye seccionesData filtrando solo los cursos seleccionados
  // Equivale a la respuesta que antes daba fetch('/secciones')
  seccionesData = {};
  cursos.forEach(curso => {
    if (curso in cargaGlobal) {
      seccionesData[curso] = cargaGlobal[curso];
    }
  });

  renderSidebar(seccionesData);
}

// ── SIDEBAR: RENDER SECCIONES ─────────────────────────────────
// Sin cambios — ya recibía el objeto seccionesData igual que antes
function renderSidebar(data) {
  const container = document.getElementById('listaCursos');
  container.innerHTML = '';

  Object.entries(data).forEach(([curso, secMap]) => {
    const color = courseColors[curso] || '#06b6d4';
    const secciones = Object.keys(secMap).sort();

    const block = document.createElement('div');
    block.className = 'course-block';
    block.style.borderLeftColor = color;

    const header = document.createElement('div');
    header.className = 'course-header';
    header.innerHTML = `
      <div class="course-dot" style="background:${color}"></div>
      <div class="course-name" title="${curso}">${curso}</div>
      <div class="course-chevron">▶</div>`;

    const profsDiv = document.createElement('div');
    profsDiv.className = 'course-profs';

    secciones.forEach(sec => {
      const docente = secMap[sec].docente;
      const label = document.createElement('label');
      label.className = 'prof-option';
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.className = 'p-check';
      cb.dataset.curso = curso;
      cb.dataset.seccion = sec;
      cb.value = sec;
      cb.checked = true;
      const span = document.createElement('span');
      span.innerHTML = `<strong>Sección ${sec}</strong> — ${docente}`;
      label.appendChild(cb);
      label.appendChild(span);
      profsDiv.appendChild(label);
    });

    header.addEventListener('click', () => {
      const open = profsDiv.classList.toggle('open');
      header.querySelector('.course-chevron').classList.toggle('open', open);
    });

    block.appendChild(header);
    block.appendChild(profsDiv);
    container.appendChild(block);
  });
}

// ── CRUCES ────────────────────────────────────────────────────
// Sin cambios
function setCruces(v) {
  v = Math.min(6, Math.max(0, isNaN(v) ? 0 : Math.round(v)));
  maxCruces = v;
  const input = document.getElementById('crucesInput');
  if (input) input.value = v;
}

// ── GENERAR ───────────────────────────────────────────────────
// Antes hacía fetch('/generar') al servidor Flask.
// Ahora llama a prepararOpciones() y generarCombos() de scheduler.js.
function generar() {
  const seleccion = {};
  document.querySelectorAll('.p-check').forEach(cb => {
    if (!seleccion[cb.dataset.curso]) seleccion[cb.dataset.curso] = [];
    if (cb.checked) seleccion[cb.dataset.curso].push(cb.dataset.seccion);
  });

  if (!Object.keys(seleccion).length) {
    showToast('Selecciona al menos una sección', 'error');
    return;
  }

  document.getElementById('topbarTitle').innerHTML =
    '<span class="spinner"></span> Generando combinaciones...';

  // Usa setTimeout para que el spinner se muestre antes de que
  // el backtracking bloquee el hilo — mismo efecto visual que antes
  setTimeout(() => {
    try {
      // prepararOpciones y generarCombos vienen de scheduler.js
      const opciones = prepararOpciones(seleccion, cargaGlobal);
      combosValidos = generarCombos(opciones, maxCruces);

      if (!combosValidos.length) {
        document.getElementById('topbarTitle').innerHTML =
          '<span style="color:#ef4444">0 combinaciones</span> — sube los cruces o selecciona más secciones';
        document.getElementById('navControls').style.display = 'none';
        document.getElementById('btnFav').style.display = 'none';
        document.getElementById('btnExport').style.display = 'none';
        document.getElementById('calendarWrap').innerHTML = `
          <div class="empty-state">
            <div class="empty-icon">😕</div>
            <div class="empty-text">Sin combinaciones posibles</div>
            <div class="empty-sub">Aumenta los cruces o selecciona más secciones</div>
          </div>`;
        return;
      }

      currentIndex = 0;
      document.getElementById('navControls').style.display = 'flex';
      document.getElementById('btnFav').style.display = 'inline-flex';
      document.getElementById('btnExport').style.display = 'inline-flex';
      dibujar(0);

    } catch (e) {
      document.getElementById('topbarTitle').innerHTML =
        '<span style="color:#ef4444">Error al generar combinaciones</span>';
    }
  }, 50);
}

// ── DIBUJAR CALENDARIO ────────────────────────────────────────
// Sin cambios — recibía combo con la misma estructura que ahora
function dibujar(idx) {
  const combo = combosValidos[idx];
  document.getElementById('counter').textContent = `${idx + 1} / ${combosValidos.length}`;
  document.getElementById('topbarTitle').innerHTML =
    `Opción <span>${idx + 1}</span> de <span>${combosValidos.length}</span> combinaciones`;

  const HOURS = [];
  for (let h = HOUR_START; h <= HOUR_END; h++) HOURS.push(h);

  let html = `<table class="sched-table">
    <thead><tr>
      <th class="hour-th"></th>
      ${DIAS_LABEL.map(d => `<th>${d}</th>`).join('')}
    </tr></thead><tbody>`;
  HOURS.forEach(h => {
    html += `<tr>
      <td class="hour-td">${h}:00</td>
      ${DIAS.map((_, di) => `<td id="c-${h}-${di}"></td>`).join('')}
    </tr>`;
  });
  html += `</tbody></table>`;
  document.getElementById('calendarWrap').innerHTML = html;

  const dayBlocks = {};
  combo.forEach((sec, ci) => {
    const color = courseColors[sec.nombre] || PALETTE[ci % PALETTE.length];
    sec.clases.forEach(cl => {
      const dIdx = DIAS.indexOf(cl.dia);
      if (dIdx === -1) return;
      const startH = Math.floor(cl.ini / 100);
      if (startH < HOUR_START || startH >= HOUR_END) return;
      if (!dayBlocks[dIdx]) dayBlocks[dIdx] = [];
      dayBlocks[dIdx].push({ sec, cl, color });
    });
  });

  Object.entries(dayBlocks).forEach(([dIdx, blocks]) => {
    blocks.sort((a, b) => a.cl.ini - b.cl.ini);

    const slots = [];
    blocks.forEach(b => {
      let assigned = -1;
      for (let s = 0; s < slots.length; s++) {
        if (slots[s] <= b.cl.ini) { assigned = s; slots[s] = b.cl.fin; break; }
      }
      if (assigned === -1) { assigned = slots.length; slots.push(b.cl.fin); }
      b.slot = assigned;
    });

    blocks.forEach(b => {
      let maxSlot = 0;
      blocks.forEach(other => {
        const overlap = Math.max(0,
          Math.min(b.cl.fin, other.cl.fin) - Math.max(b.cl.ini, other.cl.ini));
        if (overlap > 0) maxSlot = Math.max(maxSlot, other.slot);
      });
      b.totalSlots = maxSlot + 1;
    });

    blocks.forEach(({ sec, cl, color, slot, totalSlots }) => {
      const startH = Math.floor(cl.ini / 100);
      const startM = cl.ini % 100;
      const endH = Math.floor(cl.fin / 100);
      const endM = cl.fin % 100;

      const anchor = document.getElementById(`c-${startH}-${dIdx}`);
      if (!anchor) return;

      const durationMin = (endH * 60 + endM) - (startH * 60 + startM);
      const topPx = (startM / 60) * ROW_H;
      const heightPx = Math.max((durationMin / 60) * ROW_H - 2, 18);
      const pct = 100 / totalSlots;
      const leftPct = slot * pct;
      const gap = 2;

      const esTeoria = cl.tipo === 'T' || /TEOR/i.test(cl.tipo);
      const tipoLabel = esTeoria ? 'T' : 'P';
      const tipoClass = esTeoria ? 'teoria-badge' : '';

      const block = document.createElement('div');
      block.className = 'class-block';
      block.style.cssText = `
        top: ${topPx}px; height: ${heightPx}px;
        left: calc(${leftPct}% + ${slot > 0 ? gap : 2}px);
        right: auto;
        width: calc(${pct}% - ${slot > 0 ? gap + 1 : 3}px);
        background: ${color}33;
        border-left-color: ${color};`;
      block.innerHTML = `
        <div class="cb-name">${sec.nombre}</div>
        <div class="cb-bottom">
          <div class="cb-meta">${cl.aula || 'Sec. ' + sec.seccion}</div>
          <div class="cb-badge ${tipoClass}">${tipoLabel}</div>
        </div>`;

      block.addEventListener('mouseenter', e => showTip(e, sec, cl, color));
      block.addEventListener('mousemove', moveTooltip);
      block.addEventListener('mouseleave', hideTip);
      anchor.appendChild(block);
    });
  });
}

// ── NAVEGAR ───────────────────────────────────────────────────
function cambiar(n) {
  currentIndex = (currentIndex + n + combosValidos.length) % combosValidos.length;
  dibujar(currentIndex);
}

// ── TOOLTIP ───────────────────────────────────────────────────
function showTip(e, sec, cl, color) {
  if (!tooltipEl) return;
  const fmt = n => `${Math.floor(n / 100)}:${String(n % 100).padStart(2, '0')}`;
  const tipo = cl.tipo === 'T' ? 'Teoría' : cl.tipo === 'P' ? 'Práctica' : cl.tipo;
  tooltipEl.innerHTML = `
    <strong style="color:${color}">${sec.nombre}</strong>
    <span>👤 ${sec.docente}</span>
    <span>📋 ${tipo} · Sección ${sec.seccion}</span>
    <span>🏫 ${cl.aula || '—'}</span>
    <span>🕐 ${fmt(cl.ini)} – ${fmt(cl.fin)}</span>
    <span>📅 ${cl.dia}</span>`;
  tooltipEl.style.display = 'block';
  moveTooltip(e);
}
function moveTooltip(e) {
  if (!tooltipEl) return;
  tooltipEl.style.left = (e.clientX + 14) + 'px';
  tooltipEl.style.top = (e.clientY - 8) + 'px';
}
function hideTip() {
  if (tooltipEl) tooltipEl.style.display = 'none';
}

// ── FAVORITOS ─────────────────────────────────────────────────
// Antes hacía fetch('/favoritos') al servidor Flask.
// Ahora usa el objeto Favoritos de scheduler.js.
function guardarFavorito() {
  if (!combosValidos.length) return;
  const combo = combosValidos[currentIndex];
  const nombre = prompt('Nombre para este horario:', `Opción ${currentIndex + 1}`);
  if (!nombre) return;

  Favoritos.agregar(combo, nombre);
  showToast('Horario guardado en favoritos ★', 'success');
}

function toggleFavoritos() {
  const panel = document.getElementById('favsPanel');
  const overlay = document.getElementById('favsOverlay');
  const visible = panel.style.display !== 'none';

  if (visible) {
    panel.style.display = 'none';
    overlay.style.display = 'none';
  } else {
    panel.style.display = 'flex';
    overlay.style.display = 'block';
    renderFavoritos();
  }
}

function renderFavoritos() {
  const favs = Favoritos.obtener();
  const lista = document.getElementById('favsList');

  if (!favs.length) {
    lista.innerHTML = '<div class="favs-empty">No tienes horarios guardados aún.</div>';
    return;
  }

  lista.innerHTML = favs.map((fav, i) => {
    const cursos = [...new Set(fav.combo.map(s => s.nombre))].join(', ');
    return `<div class="fav-item">
      <div class="fav-item-header">
        <div class="fav-name">★ ${fav.nombre}</div>
        <div class="fav-actions">
          <button class="fav-btn ver" onclick="verFavorito(${i})">Ver</button>
          <button class="fav-btn del" onclick="eliminarFavorito(${i})">Eliminar</button>
        </div>
      </div>
      <div class="fav-courses">${cursos}</div>
    </div>`;
  }).join('');
}

function verFavorito(idx) {
  const favs = Favoritos.obtener();
  if (!favs[idx]) return;

  combosValidos = [favs[idx].combo];
  currentIndex = 0;
  toggleFavoritos();
  document.getElementById('navControls').style.display = 'flex';
  document.getElementById('btnFav').style.display = 'inline-flex';
  document.getElementById('btnExport').style.display = 'inline-flex';
  dibujar(0);
}

function eliminarFavorito(idx) {
  Favoritos.eliminar(idx);
  renderFavoritos();
  showToast('Favorito eliminado', 'error');
}

// ── EXPORTAR IMAGEN ───────────────────────────────────────────
// Sin cambios
async function exportarImagen() {
  const tabla = document.querySelector('.sched-table');
  if (!tabla) { showToast('Genera un horario primero', 'error'); return; }
  showToast('Generando imagen...', 'info');
  try {
    const canvas = await html2canvas(tabla, {
      backgroundColor: '#ffffff',
      scale: 2,
      useCORS: true,
      scrollX: 0, scrollY: 0,
      width: tabla.scrollWidth,
      height: tabla.scrollHeight
    });
    const link = document.createElement('a');
    link.download = `horario_opcion_${currentIndex + 1}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    showToast('Imagen descargada ✓', 'success');
  } catch (e) {
    showToast('Error al exportar', 'error');
  }
}

// ── TOAST ─────────────────────────────────────────────────────
// Sin cambios
function showToast(msg, type = 'info') {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.className = `toast show ${type}`;
  setTimeout(() => { t.className = 'toast'; }, 3000);
}