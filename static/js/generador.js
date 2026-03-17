// ── CONSTANTES ────────────────────────────────────────────────
const DIAS       = ["LUNES","MARTES","MIERCOLES","JUEVES","VIERNES","SABADO"];
const DIAS_LABEL = ["Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"];
const ROW_H      = 38;
const HOUR_START = 7;
const HOUR_END   = 22;
 
const PALETTE = [
  "#0ea5e9","#8b5cf6","#10b981","#f59e0b","#ef4444",
  "#0891b2","#16a34a","#84cc16","#f97316","#6366f1"
];
 
let courseColors  = {};
let combosValidos = [];
let currentIndex  = 0;
let maxCruces     = 0;
let seccionesData = {};
 
// cargaGlobal viene de generador.html (recuperada de sessionStorage)
if (typeof cargaGlobal === 'undefined') var cargaGlobal = null;
 
// ── HELPERS ───────────────────────────────────────────────────
// Devuelve true si la pantalla es móvil
function esMobileNow() {
  return window.innerWidth < 900;
}
 
// Obtiene el elemento correcto según el layout activo
function getEl(idEscritorio, idMobile) {
  return esMobileNow()
    ? document.getElementById(idMobile)
    : document.getElementById(idEscritorio);
}
 
// ── TOOLTIP ───────────────────────────────────────────────────
let tooltipEl = null;
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('calendarWrap') ||
      document.getElementById('calendarWrapMobile')) {
    tooltipEl = document.createElement('div');
    tooltipEl.className = 'tooltip';
    document.body.appendChild(tooltipEl);
  }
  if (document.getElementById('crucesInput')) {
    setCruces(0);
  }
});
 
// ── INICIALIZAR ───────────────────────────────────────────────
function inicializar(cursos) {
  if (!cursos || !cursos.length) {
    window.location.href = 'index.html';
    return;
  }
 
  if (!cargaGlobal) {
    const listaCursos = document.getElementById('listaCursos');
    if (listaCursos) listaCursos.innerHTML =
      '<div style="color:#ef4444;font-size:12px">Sin datos. <a href="index.html">Vuelve al inicio</a> y carga el Excel.</div>';
    const listaCursosMobile = document.getElementById('listaCursosMobile');
    if (listaCursosMobile) listaCursosMobile.innerHTML =
      '<div style="color:#ef4444;font-size:12px">Sin datos. <a href="index.html">Vuelve al inicio</a> y carga el Excel.</div>';
    return;
  }
 
  cursos.forEach((c, i) => {
    courseColors[c] = PALETTE[i % PALETTE.length];
  });
 
  seccionesData = {};
  cursos.forEach(curso => {
    if (curso in cargaGlobal) {
      seccionesData[curso] = cargaGlobal[curso];
    }
  });
 
  renderSidebar(seccionesData);
  renderSidebarMobile(seccionesData);
}
 
// ── SIDEBAR ESCRITORIO ────────────────────────────────────────
function renderSidebar(data) {
  const container = document.getElementById('listaCursos');
  if (!container) return;
  container.innerHTML = '';
  _renderCursos(container, data);
}
 
// ── SIDEBAR MÓVIL ─────────────────────────────────────────────
function renderSidebarMobile(data) {
  const container = document.getElementById('listaCursosMobile');
  if (!container) return;
  container.innerHTML = '';
  _renderCursos(container, data);
}
 
// Función compartida para renderizar cursos en cualquier contenedor
function _renderCursos(container, data) {
  Object.entries(data).forEach(([curso, secMap]) => {
    const color     = courseColors[curso] || '#06b6d4';
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
      const label   = document.createElement('label');
      label.className = 'prof-option';
      const cb = document.createElement('input');
      cb.type            = 'checkbox';
      cb.className       = 'p-check';
      cb.dataset.curso   = curso;
      cb.dataset.seccion = sec;
      cb.value           = sec;
      cb.checked         = true;
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
function setCruces(v) {
  v = Math.min(6, Math.max(0, isNaN(v) ? 0 : Math.round(v)));
  maxCruces = v;
  const input       = document.getElementById('crucesInput');
  const inputMobile = document.getElementById('crucesInputMobile');
  if (input)       input.value       = v;
  if (inputMobile) inputMobile.value = v;
}
 
// ── GENERAR ───────────────────────────────────────────────────
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
 
  // Muestra spinner en el título correcto según el layout
  const spinnerEl = getEl('topbarTitle', 'topbarTitleMobile');
  if (spinnerEl) spinnerEl.innerHTML = '<span class="spinner"></span> Generando combinaciones...';
 
  setTimeout(() => {
    try {
      const opciones = prepararOpciones(seleccion, cargaGlobal);
      combosValidos  = generarCombos(opciones, maxCruces);
 
      if (!combosValidos.length) {
        const titleEl   = getEl('topbarTitle', 'topbarTitleMobile');
        const calWrapEl = getEl('calendarWrap', 'calendarWrapMobile');
        if (titleEl) titleEl.innerHTML =
          '<span style="color:#ef4444">0 combinaciones</span> — sube los cruces o selecciona más secciones';
        if (calWrapEl) calWrapEl.innerHTML = `
          <div class="empty-state">
            <div class="empty-icon">😕</div>
            <div class="empty-text">Sin combinaciones posibles</div>
            <div class="empty-sub">Aumenta los cruces o selecciona más secciones</div>
          </div>`;
        _setBotonesVisibles(false);
        return;
      }
 
      currentIndex = 0;
      _setBotonesVisibles(true);
      dibujar(0);
 
    } catch (e) {
      const errEl = getEl('topbarTitle', 'topbarTitleMobile');
      if (errEl) errEl.innerHTML =
        '<span style="color:#ef4444">Error al generar combinaciones</span>';
    }
  }, 50);
}
 
// Muestra u oculta los botones de navegación y exportación
function _setBotonesVisibles(visible) {
  const display = visible ? 'flex' : 'none';
  const displayInline = visible ? 'inline-flex' : 'none';
 
  // Escritorio
  const navC = document.getElementById('navControls');
  const favB = document.getElementById('btnFav');
  const expI = document.getElementById('btnExportImg');
  const expX = document.getElementById('btnExportXls');
  if (navC) navC.style.display = display;
  if (favB) favB.style.display = displayInline;
  if (expI) expI.style.display = displayInline;
  if (expX) expX.style.display = displayInline;
 
  // Móvil
  const navM    = document.getElementById('navControlsMobile');
  const favM    = document.getElementById('btnFavMobile');
  const expImgM = document.getElementById('btnExportImgMobile');
  const expXlsM = document.getElementById('btnExportXlsMobile');
  if (navM)    navM.style.display    = display;
  if (favM)    favM.style.display    = displayInline;
  if (expImgM) expImgM.style.display = displayInline;
  if (expXlsM) expXlsM.style.display = displayInline;
}
 
// ── DIBUJAR CALENDARIO ────────────────────────────────────────
function dibujar(idx) {
  const combo         = combosValidos[idx];
  const counterEl     = getEl('counter', 'counterMobile');
  const topbarTitleEl = getEl('topbarTitle', 'topbarTitleMobile');
  const calWrap       = getEl('calendarWrap', 'calendarWrapMobile');
 
  if (counterEl)     counterEl.textContent = `${idx + 1} / ${combosValidos.length}`;
  if (topbarTitleEl) topbarTitleEl.innerHTML =
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
  if (calWrap) calWrap.innerHTML = html;
 
  const dayBlocks = {};
  combo.forEach((sec, ci) => {
    const color = courseColors[sec.nombre] || PALETTE[ci % PALETTE.length];
    sec.clases.forEach(cl => {
      const dIdx   = DIAS.indexOf(cl.dia);
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
      const endH   = Math.floor(cl.fin / 100);
      const endM   = cl.fin % 100;
 
      const anchor = document.getElementById(`c-${startH}-${dIdx}`);
      if (!anchor) return;
 
      const durationMin = (endH * 60 + endM) - (startH * 60 + startM);
      const topPx       = (startM / 60) * ROW_H;
      const heightPx    = Math.max((durationMin / 60) * ROW_H - 2, 18);
      const pct         = 100 / totalSlots;
      const leftPct     = slot * pct;
      const gap         = 2;
 
      const esTeoria  = cl.tipo === 'T' || /TEOR/i.test(cl.tipo);
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
  const fmt  = n => `${Math.floor(n / 100)}:${String(n % 100).padStart(2, '0')}`;
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
  tooltipEl.style.top  = (e.clientY - 8)  + 'px';
}
 
function hideTip() {
  if (tooltipEl) tooltipEl.style.display = 'none';
}
 
// ── PESTAÑAS MÓVIL ────────────────────────────────────────────
function switchTab(tab) {
  const config     = document.getElementById('tabConfig');
  const horario    = document.getElementById('tabHorario');
  const btnConfig  = document.getElementById('tabConfigBtn');
  const btnHorario = document.getElementById('tabHorarioBtn');
 
  if (!config || !horario) return;
 
  if (tab === 'config') {
    config.style.display  = 'block';
    horario.style.display = 'none';
    if (btnConfig)  btnConfig.classList.add('active');
    if (btnHorario) btnHorario.classList.remove('active');
  } else {
    config.style.display  = 'none';
    horario.style.display = 'block';
    if (btnConfig)  btnConfig.classList.remove('active');
    if (btnHorario) btnHorario.classList.add('active');
  }
}
 
// Generar desde móvil — sincroniza cruces y cambia a pestaña horario
function generarMobile() {
  const inputMobile = document.getElementById('crucesInputMobile');
  if (inputMobile) setCruces(parseInt(inputMobile.value) || 0);
  generar();
  setTimeout(() => switchTab('horario'), 200);
}
 
// ── FAVORITOS ─────────────────────────────────────────────────
function guardarFavorito() {
  if (!combosValidos.length) return;
  const combo  = combosValidos[currentIndex];
  const nombre = prompt('Nombre para este horario:', `Opción ${currentIndex + 1}`);
  if (!nombre) return;
  Favoritos.agregar(combo, nombre);
  showToast('Horario guardado en favoritos ★', 'success');
}
 
function toggleFavoritos() {
  const panel   = document.getElementById('favsPanel');
  const overlay = document.getElementById('favsOverlay');
  if (!panel || !overlay) return;
  const visible = panel.style.display !== 'none';
  if (visible) {
    panel.style.display   = 'none';
    overlay.style.display = 'none';
  } else {
    panel.style.display   = 'flex';
    overlay.style.display = 'block';
    renderFavoritos();
  }
}
 
function renderFavoritos() {
  const favs  = Favoritos.obtener();
  const lista = document.getElementById('favsList');
  if (!lista) return;
 
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
  currentIndex  = 0;
  toggleFavoritos();
  _setBotonesVisibles(true);
  if (esMobileNow()) switchTab('horario');
  dibujar(0);
}
 
function eliminarFavorito(idx) {
  Favoritos.eliminar(idx);
  renderFavoritos();
  showToast('Favorito eliminado', 'error');
}
 
// ── EXPORTAR IMAGEN ───────────────────────────────────────────
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
      width:  tabla.scrollWidth,
      height: tabla.scrollHeight
    });
    const link    = document.createElement('a');
    link.download = `horario_opcion_${currentIndex + 1}.png`;
    link.href     = canvas.toDataURL('image/png');
    link.click();
    showToast('Imagen descargada ✓', 'success');
  } catch (e) {
    showToast('Error al exportar', 'error');
  }
}
 
// ── EXPORTAR EXCEL ────────────────────────────────────────────
function exportarExcel() {
  if (!combosValidos.length) {
    showToast('Genera un horario primero', 'error');
    return;
  }
 
  const combo      = combosValidos[currentIndex];
  const DIAS_XLS   = ['LUNES','MARTES','MIERCOLES','JUEVES','VIERNES','SABADO'];
  const DIAS_LABEL_XLS = ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
  const fmt = n => `${Math.floor(n / 100)}:${String(n % 100).padStart(2, '0')}`;
 
  // Hoja 1: Calendario
  const horasUnicas = new Set();
  combo.forEach(sec => sec.clases.forEach(cl => {
    for (let h = Math.floor(cl.ini / 100); h < Math.floor(cl.fin / 100); h++) {
      horasUnicas.add(h);
    }
  }));
  const horas = [...horasUnicas].sort((a, b) => a - b);
  const calendarioData = [['Hora', ...DIAS_LABEL_XLS]];
  horas.forEach(h => {
    const fila = [`${h}:00`];
    DIAS_XLS.forEach(dia => {
      const claseEnEstaHora = [];
      combo.forEach(sec => {
        sec.clases.forEach(cl => {
          if (cl.dia === dia) {
            const startH = Math.floor(cl.ini / 100);
            const endH   = Math.floor(cl.fin / 100);
            if (h >= startH && h < endH) {
              claseEnEstaHora.push(`${sec.nombre} (${cl.tipo}) Sec.${sec.seccion}`);
            }
          }
        });
      });
      fila.push(claseEnEstaHora.join(' | ') || '');
    });
    calendarioData.push(fila);
  });
 
  // Hoja 2: Detalle
  const detalleData = [
    ['Curso','Sección','Docente','Tipo','Día','Hora inicio','Hora fin','Aula']
  ];
  combo.forEach(sec => {
    sec.clases.forEach(cl => {
      detalleData.push([
        sec.nombre,
        sec.seccion,
        sec.docente,
        cl.tipo === 'T' ? 'Teoría' : 'Práctica',
        cl.dia,
        fmt(cl.ini),
        fmt(cl.fin),
        cl.aula || '—'
      ]);
    });
  });
 
  const wb = XLSX.utils.book_new();
 
  const wsCalendario = XLSX.utils.aoa_to_sheet(calendarioData);
  wsCalendario['!cols'] = [{ wch: 8 }, ...DIAS_LABEL_XLS.map(() => ({ wch: 25 }))];
  XLSX.utils.book_append_sheet(wb, wsCalendario, 'Calendario');
 
  const wsDetalle = XLSX.utils.aoa_to_sheet(detalleData);
  wsDetalle['!cols'] = [
    { wch: 30 },{ wch: 10 },{ wch: 30 },{ wch: 10 },
    { wch: 12 },{ wch: 12 },{ wch: 12 },{ wch: 15 }
  ];
  XLSX.utils.book_append_sheet(wb, wsDetalle, 'Detalle');
 
  XLSX.writeFile(wb, `horario_opcion_${currentIndex + 1}.xlsx`);
  showToast('Excel descargado ✓', 'success');
}
 
// ── TOAST ─────────────────────────────────────────────────────
function showToast(msg, type = 'info') {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.className   = `toast show ${type}`;
  setTimeout(() => { t.className = 'toast'; }, 3000);
}