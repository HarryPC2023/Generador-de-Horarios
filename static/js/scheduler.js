// ============================================================
// scheduler.js — Motor de generación de horarios
// Equivale a las rutas /generar y /favoritos de app.py
// ============================================================


// ------------------------------------------------------------
// calcularCruces: detecta solapamientos entre las clases
// de una combinación parcial de secciones.
// Equivale a calcular_cruces() dentro de /generar en app.py
//
// Reglas (igual que Horext):
//   P vs P → infinito (combinación bloqueada)
//   T vs T o T vs P → +1 cruce
// ------------------------------------------------------------
function calcularCruces(combo) {
  let cruces = 0;

  // Junta todas las clases individuales de todas las secciones del combo
  const clases = combo.flatMap(sec => sec.clases);

  for (let i = 0; i < clases.length; i++) {
    for (let j = i + 1; j < clases.length; j++) {
      const a = clases[i];
      const b = clases[j];

      // Solo compara clases del mismo día
      if (a.dia !== b.dia) continue;

      // Calcula si hay solapamiento
      const overlap = Math.max(0, Math.min(a.fin, b.fin) - Math.max(a.ini, b.ini));
      if (overlap <= 0) continue;

      // P vs P → bloqueado, retorna infinito inmediatamente
      if (a.tipo === 'P' && b.tipo === 'P') return Infinity;

      // Cualquier otro solapamiento → +1 cruce
      cruces += 1;
    }
  }

  return cruces;
}


// ------------------------------------------------------------
// generarCombos: backtracking que genera todas las
// combinaciones válidas respetando el máximo de cruces.
// Equivale a solve() + /generar en app.py
//
// Parámetros:
//   opcionesPorCurso → array de arrays de secciones
//   maxCruces        → número máximo de cruces permitidos
// Retorna:
//   array de combinaciones válidas
// ------------------------------------------------------------
function generarCombos(opcionesPorCurso, maxCruces) {
  const combos = [];

  // Función recursiva de backtracking
  // idx  → índice del curso que estamos asignando ahora
  // curr → combinación parcial construida hasta ahora
  function solve(idx, curr) {

    // Caso base: ya asignamos todos los cursos → combinación completa
    if (idx === opcionesPorCurso.length) {
      // Guarda una copia para que no se modifique después
      combos.push(curr.map(s => ({ ...s })));
      return;
    }

    // Prueba cada sección disponible para el curso actual
    for (const sec of opcionesPorCurso[idx]) {

      // Poda: si al agregar esta sección ya supera el máximo, la descarta
      if (calcularCruces([...curr, sec]) <= maxCruces) {
        curr.push(sec);
        solve(idx + 1, curr); // recurse al siguiente curso
        curr.pop();           // deshace para probar la siguiente sección
      }
    }
  }

  solve(0, []);
  return combos;
}


// ------------------------------------------------------------
// prepararOpciones: construye el array opcionesPorCurso
// a partir de la selección del usuario y la carga horaria.
// Equivale a la preparación de opciones_por_curso en /generar
//
// Parámetros:
//   seleccion   → { "Cálculo I": ["A", "B"], "Física": ["C"] }
//   cargaGlobal → el objeto carga devuelto por parsearExcel()
// ------------------------------------------------------------
function prepararOpciones(seleccion, cargaGlobal) {
  const opcionesPorCurso = [];

  for (const [curso, secsElegidas] of Object.entries(seleccion)) {
    if (!(curso in cargaGlobal)) continue;

    // Filtra solo las secciones que el usuario seleccionó
    const opts = Object.entries(cargaGlobal[curso])
      .filter(([sec]) => secsElegidas.includes(sec))
      .map(([sec, info]) => ({
        ...info,        // docente y clases
        nombre: curso,  // agrega el nombre del curso
        seccion: sec    // agrega la sección
      }));

    if (opts.length > 0) opcionesPorCurso.push(opts);
  }

  return opcionesPorCurso;
}


// ============================================================
// FAVORITOS — equivale a /favoritos en app.py
// En vez del servidor, se guardan en memoria del navegador
// mientras la sesión esté abierta (se pierden al recargar,
// igual que la lista favoritos = [] en app.py)
// ============================================================

const Favoritos = {
  _lista: [], // equivale a favoritos = [] en app.py

  // Agrega un combo con nombre → equivale a POST /favoritos
  agregar(combo, nombre) {
    const n = nombre || `Favorito ${this._lista.length + 1}`;
    this._lista.push({ nombre: n, combo });
    return this._lista.length;
  },

  // Devuelve todos los favoritos → equivale a GET /favoritos
  obtener() {
    return this._lista;
  },

  // Elimina por índice → equivale a DELETE /favoritos/<idx>
  eliminar(idx) {
    if (idx >= 0 && idx < this._lista.length) {
      this._lista.splice(idx, 1);
    }
  },

  // Retorna cuántos favoritos hay guardados
  total() {
    return this._lista.length;
  }
};