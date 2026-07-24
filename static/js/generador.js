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
function inicializar(cursos) {
  if (!cursos || !cursos.length) {
    window.location.href = 'index.html';
    return;
  }

  if (!cargaGlobal) {
    const listaCursos = document.getElementById('listaCursos');
    if (listaCursos) listaCursos.innerHTML =
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
}

// ── SIDEBAR ───────────────────────────────────────────────────
function renderSidebar(data) {
  const container = document.getElementById('listaCursos');
  if (!container) return;
  container.innerHTML = '';

  Object.entries(data).forEach(([curso, secMap]) => {
    const color = courseColors[curso] || '#06b6d4';
    const secciones = Object.keys(secMap).sort();
    const codigo = (Object.values(secMap)[0] || {}).codigo || '';

    const block = document.createElement('div');
    block.className = 'course-block';
    block.style.borderLeftColor = color;

    const header = document.createElement('div');
    header.className = 'course-header';
    header.innerHTML = `
      <div class="course-dot" style="background:${color}"></div>
      <div class="course-name" title="${curso}">${codigo ? `<span class="curso-codigo">${codigo}</span> ` : ''}${curso}</div>
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
function setCruces(v) {
  v = Math.min(6, Math.max(0, isNaN(v) ? 0 : Math.round(v)));
  maxCruces = v;
  const input = document.getElementById('crucesInput');
  if (input) input.value = v;
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

  const titleEl = document.getElementById('topbarTitle');
  if (titleEl) titleEl.innerHTML = '<span class="spinner"></span> Generando combinaciones...';

  setTimeout(() => {
    try {
      const opciones = prepararOpciones(seleccion, cargaGlobal);
      combosValidos = generarCombos(opciones, maxCruces);

      if (!combosValidos.length) {
        const titleEl = document.getElementById('topbarTitle');
        const calWrapEl = document.getElementById('calendarWrap');
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

      // En móvil, scroll suave hasta el calendario
      if (window.innerWidth < 900) {
        const calWrap = document.getElementById('calendarWrap');
        if (calWrap) calWrap.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }

    } catch (e) {
      const errEl = document.getElementById('topbarTitle');
      if (errEl) errEl.innerHTML =
        '<span style="color:#ef4444">Error al generar combinaciones</span>';
    }
  }, 50);
}

// ── BOTONES VISIBLES ─────────────────────────────────────────
function _setBotonesVisibles(visible) {
  const display = visible ? 'flex' : 'none';
  const displayInline = visible ? 'inline-flex' : 'none';

  const navC = document.getElementById('navControls');
  const favB = document.getElementById('btnFav');
  const expI = document.getElementById('btnExportImg');
  const expX = document.getElementById('btnExportXls');
  if (navC) navC.style.display = display;
  if (favB) favB.style.display = displayInline;
  if (expI) expI.style.display = displayInline;
  if (expX) expX.style.display = displayInline;
}

// ── DIBUJAR CALENDARIO ────────────────────────────────────────
function dibujar(idx) {
  const combo = combosValidos[idx];
  const counterEl = document.getElementById('counter');
  const topbarTitleEl = document.getElementById('topbarTitle');
  const calWrap = document.getElementById('calendarWrap');

  if (counterEl) counterEl.textContent = `${idx + 1} / ${combosValidos.length}`;
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

  // ── Construir bloques por día ─────────────────────────────
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

  // ── Detectar columnas con cruces (solo en móvil) ──────────
  const colsConCruces = new Set();
  if (window.innerWidth < 900) {
    Object.entries(dayBlocks).forEach(([dIdx, blocks]) => {
      outer:
      for (let i = 0; i < blocks.length; i++) {
        for (let j = i + 1; j < blocks.length; j++) {
          const a = blocks[i].cl;
          const b = blocks[j].cl;
          const overlap = Math.max(0,
            Math.min(a.fin, b.fin) - Math.max(a.ini, b.ini));
          if (overlap > 0) {
            colsConCruces.add(parseInt(dIdx));
            break outer;
          }
        }
      }
    });

    // Aplicar ancho doble a columnas con cruces
    if (colsConCruces.size > 0) {
      const table = calWrap.querySelector('.sched-table');
      if (table) {
        colsConCruces.forEach(dIdx => {
          const colIndex = dIdx + 2; // +1 por th hora, +1 por nth-child base 1
          table.querySelectorAll(
            `tr td:nth-child(${colIndex}), tr th:nth-child(${colIndex})`
          ).forEach(cell => {
            cell.style.minWidth = '160px';
          });
        });
      }
    }
  }

  // ── Posicionar bloques ────────────────────────────────────
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
      const tipoClass = esTeoria ? 'teoria-badge' : 'practica-badge';

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
  if (!panel || !overlay) return;
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
  currentIndex = 0;
  toggleFavoritos();
  _setBotonesVisibles(true);
  dibujar(0);
  if (window.innerWidth < 900) {
    const calWrap = document.getElementById('calendarWrap');
    if (calWrap) calWrap.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
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

// ── EXPORTAR EXCEL ────────────────────────────────────────────
function exportarExcel() {
  if (!combosValidos.length) {
    showToast('Genera un horario primero', 'error');
    return;
  }

  const combo = combosValidos[currentIndex];
  const DIAS_XLS = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO'];
  const DIAS_LABEL_XLS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const fmt = n => `${Math.floor(n / 100)}:${String(n % 100).padStart(2, '0')}`;

  // Paleta usada en el Excel (mismo celeste de acento que el resto de la app)
  const ACCENT = '06B6D4';
  const AZUL_TEORIA = '2563EB';
  const ROJO_PRACTICA = 'DC2626';
  const bordeFino = { style: 'thin', color: { rgb: ACCENT } };
  const bordeCelda = { top: bordeFino, bottom: bordeFino, left: bordeFino, right: bordeFino };

  // NOTA TÉCNICA: se intentó colorear solo la letra T/P dentro de la misma
  // celda usando "rich text" (varios colores en un mismo texto), pero se
  // comprobó (generando y revisando el archivo real) que la librería no
  // conserva ese formato al escribir. Tampoco se usa emoji de color, para
  // que se vea prolijo. En su lugar, T/P queda en texto plano entre
  // paréntesis junto a la sección.

  // ═══════════════════════ HOJA "CALENDARIO" ═══════════════════
  const horasUnicas = new Set();
  combo.forEach(sec => sec.clases.forEach(cl => {
    for (let h = Math.floor(cl.ini / 100); h < Math.floor(cl.fin / 100); h++) {
      horasUnicas.add(h);
    }
  }));
  const horas = [...horasUnicas].sort((a, b) => a - b);

  const calendarioAOA = [['Hora', ...DIAS_LABEL_XLS]];

  horas.forEach((h, hi) => {
    const fila = [`${h}:00`];
    DIAS_XLS.forEach(dia => {
      const bloques = [];
      combo.forEach(sec => sec.clases.forEach(cl => {
        if (cl.dia !== dia) return;
        const startH = Math.floor(cl.ini / 100);
        const endH = Math.floor(cl.fin / 100);
        if (h >= startH && h < endH) bloques.push({ sec, cl });
      }));

      if (bloques.length) {
        fila.push(bloques.map(b => {
          const esTeoria = b.cl.tipo === 'T' || /TEOR/i.test(b.cl.tipo);
          const tipoLetra = esTeoria ? 'T' : 'P';
          return `${b.sec.nombre}\nSección ${b.sec.seccion} (${tipoLetra})`;
        }).join('\n\n'));
      } else {
        fila.push('');
      }
    });
    calendarioAOA.push(fila);
  });

  const wsCalendario = XLSX.utils.aoa_to_sheet(calendarioAOA);
  const rangoCal = XLSX.utils.decode_range(wsCalendario['!ref']);

  for (let r = rangoCal.s.r; r <= rangoCal.e.r; r++) {
    for (let c = rangoCal.s.c; c <= rangoCal.e.c; c++) {
      const addr = XLSX.utils.encode_cell({ r, c });
      if (!wsCalendario[addr]) wsCalendario[addr] = { t: 's', v: '' };
      const celda = wsCalendario[addr];
      const esHeader = r === 0;
      const esColHora = c === 0;

      celda.s = {
        alignment: {
          horizontal: (esHeader || esColHora) ? 'center' : 'left',
          vertical: 'center',
          wrapText: true
        },
        border: bordeCelda,
        font: esHeader
          ? { bold: true, color: { rgb: 'FFFFFF' } }
          : (esColHora ? { bold: true } : {}),
        fill: esHeader ? { fgColor: { rgb: ACCENT } } : undefined
      };
    }
  }

  // Ancho automático por columna: se usa la línea más larga de esa columna
  // (no la palabra ni el bloque completo) para que el nombre del curso y la
  // sección se vean completos sin depender de que el salto de línea manual
  // se renderice igual en todos los programas.
  function anchoPorLineaMasLarga(aoa, colIndex, minWch, maxWch) {
    let max = minWch;
    aoa.forEach(fila => {
      const valor = fila[colIndex];
      if (!valor) return;
      String(valor).split('\n').forEach(linea => {
        max = Math.max(max, Math.min(linea.length + 2, maxWch));
      });
    });
    return max;
  }

  wsCalendario['!cols'] = [
    { wch: 9 },
    ...DIAS_XLS.map((_, i) => ({ wch: anchoPorLineaMasLarga(calendarioAOA, i + 1, 22, 55) }))
  ];

  // Alto de fila variable: según cuántas líneas tenga la celda más "cargada"
  // de esa fila (puede haber más de un curso a la misma hora).
  const alturasCalendario = calendarioAOA.slice(1).map(fila => {
    let maxLineas = 1;
    fila.slice(1).forEach(valor => {
      if (!valor) return;
      maxLineas = Math.max(maxLineas, String(valor).split('\n').length);
    });
    return { hpx: Math.max(32, maxLineas * 15 + 14) };
  });
  wsCalendario['!rows'] = [{ hpx: 26 }, ...alturasCalendario];

  // ═══════════════════════ HOJA "DETALLE" ═══════════════════════
  // Código va primero, según lo pedido
  const detalleData = [
    ['Código', 'Curso', 'Sección', 'Docente', 'Tipo', 'Día', 'Hora inicio', 'Hora fin', 'Aula']
  ];
  const tipoPorFila = []; // 'T' | 'P' | null(separador), alineado 1 a 1 con las filas de datos

  const comboOrdenado = [...combo].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  let cursoAnterior = null;
  comboOrdenado.forEach(sec => {
    if (cursoAnterior !== null && cursoAnterior !== sec.nombre) {
      detalleData.push(['', '', '', '', '', '', '', '', '']);
      tipoPorFila.push(null);
    }
    cursoAnterior = sec.nombre;
    [...sec.clases].sort((a, b) => DIAS_XLS.indexOf(a.dia) - DIAS_XLS.indexOf(b.dia)).forEach(cl => {
      const esTeoria = cl.tipo === 'T' || /TEOR/i.test(cl.tipo);
      detalleData.push([
        sec.codigo || '—',
        sec.nombre,
        sec.seccion,
        sec.docente,
        esTeoria ? 'Teoría' : 'Práctica',
        DIAS_LABEL_XLS[DIAS_XLS.indexOf(cl.dia)] || cl.dia,
        fmt(cl.ini),
        fmt(cl.fin),
        cl.aula || '—'
      ]);
      tipoPorFila.push(esTeoria ? 'T' : 'P');
    });
  });

  const wsDetalle = XLSX.utils.aoa_to_sheet(detalleData);
  const rangoDet = XLSX.utils.decode_range(wsDetalle['!ref']);

  // Columnas centradas: Código(0), Sección(2), Tipo(4), Día(5), Hora inicio(6), Hora fin(7), Aula(8)
  // Curso(1) y Docente(3) quedan a la izquierda por ser texto más largo
  const colsCentradas = new Set([0, 2, 4, 5, 6, 7, 8]);
  const COL_CURSO = 1;

  for (let r = rangoDet.s.r; r <= rangoDet.e.r; r++) {
    for (let c = rangoDet.s.c; c <= rangoDet.e.c; c++) {
      const addr = XLSX.utils.encode_cell({ r, c });
      if (!wsDetalle[addr]) wsDetalle[addr] = { t: 's', v: '' };
      const celda = wsDetalle[addr];
      const esHeader = r === 0;
      const tipoFila = tipoPorFila[r - 1];

      let font = {};
      if (esHeader) {
        font = { bold: true, color: { rgb: 'FFFFFF' } };
      } else if (c === 4 && tipoFila) {
        // Columna "Tipo": todo el texto de la celda coloreado (aquí sí es la celda completa)
        font = { bold: true, color: { rgb: tipoFila === 'T' ? AZUL_TEORIA : ROJO_PRACTICA } };
      }

      celda.s = {
        alignment: {
          horizontal: esHeader ? 'center' : (colsCentradas.has(c) ? 'center' : 'left'),
          vertical: 'center',
          wrapText: c === COL_CURSO
        },
        border: bordeCelda,
        font,
        fill: esHeader ? { fgColor: { rgb: ACCENT } } : undefined
      };
    }
  }

  const anchoCurso = Math.min(Math.max(20, ...detalleData.map(f => (f[1] || '').length + 2)), 60);
  const anchoDocente = Math.min(Math.max(18, ...detalleData.map(f => (f[3] || '').length + 2)), 40);

  wsDetalle['!cols'] = [
    { wch: 10 },          // Código
    { wch: anchoCurso },  // Curso (ancho automático)
    { wch: 9 },           // Sección
    { wch: anchoDocente },// Docente (ancho automático)
    { wch: 10 },          // Tipo
    { wch: 12 },          // Día
    { wch: 11 },          // Hora inicio
    { wch: 11 },          // Hora fin
    { wch: 12 }           // Aula
  ];
  wsDetalle['!rows'] = [{ hpx: 22 }, ...detalleData.slice(1).map(() => ({ hpx: 24 }))];

  // ═══════════════════════ LIBRO FINAL ═══════════════════════════
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, wsCalendario, 'Calendario');
  XLSX.utils.book_append_sheet(wb, wsDetalle, 'Detalle');

  XLSX.writeFile(wb, `horario_opcion_${currentIndex + 1}.xlsx`);
  showToast('Excel descargado ✓', 'success');
}

// ── TOAST ─────────────────────────────────────────────────────
function showToast(msg, type = 'info') {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.className = `toast show ${type}`;
  setTimeout(() => { t.className = 'toast'; }, 3000);
}