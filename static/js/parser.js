// ============================================================
// parser.js — Equivalente exacto de parser.py pero en JS
// Usa la librería SheetJS (se cargará desde el HTML)
// ============================================================


// ------------------------------------------------------------
// norm_dia: convierte abreviaciones al nombre completo del día
// Equivale a norm_dia() en parser.py
// ------------------------------------------------------------
function normDia(d) {
    if (!d) return '';
    // Elimina tildes y pasa a mayúsculas
    let s = String(d).toUpperCase().trim()
        .replace(/Á/g, 'A').replace(/É/g, 'E')
        .replace(/Í/g, 'I').replace(/Ó/g, 'O')
        .replace(/Ú/g, 'U');

    const mapping = {
        'LU': 'LUNES', 'LUN': 'LUNES',
        'MA': 'MARTES', 'MAR': 'MARTES',
        'MI': 'MIERCOLES', 'MIE': 'MIERCOLES',
        'JU': 'JUEVES', 'JUE': 'JUEVES',
        'VI': 'VIERNES', 'VIE': 'VIERNES',
        'SA': 'SABADO', 'SAB': 'SABADO',
        'DO': 'DOMINGO', 'DOM': 'DOMINGO',
    };

    // Intenta primero con 2 letras, luego con 3
    return mapping[s] || mapping[s.slice(0, 3)] || s;
}


// ------------------------------------------------------------
// parseHora: convierte la hora del Excel a entero HHMM
// Ej: 16 → 1600 | 16.5 → 1630 | "16:30" → 1630
// Equivale a parse_hora() en parser.py
// ------------------------------------------------------------
function parseHora(h) {
    if (h === null || h === undefined || h === '') return null;

    // Si es número (int o float)
    if (typeof h === 'number') {
        // Excel guarda horas como fracción del día (0.0 a 1.0)
        // Ej: 0.6666... = 16:00
        if (h > 0 && h < 1) {
            const totalMins = Math.round(h * 24 * 60);
            return Math.floor(totalMins / 60) * 100 + (totalMins % 60);
        }
        // Si es un entero simple tipo 16 → 1600
        if (h >= 0 && h <= 24) {
            return Math.floor(h) * 100;
        }
    }

    // Si es string tipo "16:30" o "1630"
    let s = String(h).replace(':', '').replace('.', '').trim();
    if (!s || !/^\d+$/.test(s)) return null;
    s = s.slice(0, 4);

    if (s.length <= 2) return parseInt(s) * 100;
    if (s.length === 3) return parseInt(s[0]) * 100 + parseInt(s.slice(1));
    return parseInt(s.slice(0, 2)) * 100 + parseInt(s.slice(2, 4));
}


// ------------------------------------------------------------
// normStr: limpia espacios raros y caracteres invisibles
// Equivale a norm_str() en parser.py
// ------------------------------------------------------------
function normStr(v) {
    if (v === null || v === undefined) return '';
    // Reemplaza espacios de no-ruptura (\u00a0) y limpia extremos
    return String(v).replace(/\u00a0/g, ' ').replace(/\xa0/g, ' ').trim()
        .replace(/\s+/g, ' ');
}


// ------------------------------------------------------------
// findHeaderRow: busca la fila con los encabezados reales
// Busca palabras clave como CÓDIGO, NOMBRE DEL CURSO, etc.
// Equivale a find_header_row() en parser.py
// ------------------------------------------------------------
function findHeaderRow(rows) {
    const keywords = ['CÓDIGO', 'CODIGO', 'NOMBRE DEL CURSO', 'ASIGNATURA'];

    for (let i = 0; i < rows.length; i++) {
        const rowVals = rows[i].map(c => normStr(c).toUpperCase());
        // Si alguna celda de esta fila coincide con una palabra clave, es el header
        if (keywords.some(kw => rowVals.includes(kw))) {
            return i; // índice base 0 (en Python era base 1, aquí ajustamos)
        }
    }
    return null;
}


// ------------------------------------------------------------
// getColIndices: mapea nombre de columna a su posición numérica
// Equivale a get_col_indices() en parser.py
// ------------------------------------------------------------
function getColIndices(headerRow) {
    const idx = {};

    headerRow.forEach((val, i) => {
        if (val === null || val === undefined) return;
        const key = normStr(val).toUpperCase();

        if (/C[ÓO]DIGO/.test(key)) idx.codigo = i;
        else if (key.includes('NOMBRE DEL CURSO') ||
            key.includes('ASIGNATURA')) idx.nombre = i;
        else if (/SECCI[ÓO]N/.test(key) ||
            key.includes('GRUPO')) idx.seccion = i;
        else if ((/APELLIDOS/.test(key) &&
            key.includes('DOCENTE')) ||
            key.includes('PROFESOR')) idx.docente = i;
        else if (key.trim().startsWith('TIPO')) idx.tipo = i;
        else if (key.includes('AULA')) idx.aula = i;
        else if (/D[ÍI]A/.test(key)) idx.dia = i;
        else if (key.includes('INICIO') ||
            key.includes('H. INICIO')) idx.inicio = i;
        else if (/FINAL|FIN\b|H\. FIN/.test(key)) idx.fin = i;
    });

    return idx;
}


// ------------------------------------------------------------
// parsearExcel: función principal — recibe un File del input
// y devuelve el objeto carga con estructura:
// { "Cálculo I": { "A": { docente, clases: [...] } } }
// Equivale a parsear_excel() en parser.py
// ------------------------------------------------------------
function parsearExcel(file) {
    return new Promise((resolve, reject) => {

        const reader = new FileReader();

        reader.onload = function (e) {
            try {
                // SheetJS lee el archivo como binario
                const data = new Uint8Array(e.target.result);
                const wb = XLSX.read(data, { type: 'array' });

                // Toma la primera hoja activa
                const ws = wb.Sheets[wb.SheetNames[0]];

                // Convierte la hoja a array de arrays (equivale a iter_rows en openpyxl)
                const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });

                // Busca la fila de headers
                const headerIdx = findHeaderRow(rows);
                if (headerIdx === null) {
                    return reject('No se encontró la fila de encabezados. ' +
                        'Asegúrate de que el Excel tenga columnas como "Curso" o "Código".');
                }

                const col = getColIndices(rows[headerIdx]);

                // Verifica columnas obligatorias
                const required = ['nombre', 'seccion', 'dia', 'inicio', 'fin'];
                const missing = required.filter(r => !(r in col));
                if (missing.length > 0) {
                    return reject(`Faltan columnas obligatorias: ${missing.join(', ')}`);
                }

                // Construye el objeto carga
                const carga = {};

                // Itera desde la fila siguiente al header
                for (let r = headerIdx + 1; r < rows.length; r++) {
                    const row = rows[r];

                    // Salta filas completamente vacías
                    if (!row || row.every(c => c === null || c === '')) continue;

                    const nombre = normStr(row[col.nombre] ?? '');
                    const seccion = normStr(row[col.seccion] ?? '');
                    const docente = 'docente' in col ? normStr(row[col.docente] ?? '') || 'POR ASIGNAR' : 'POR ASIGNAR';
                    const tipo = 'tipo' in col ? normStr(row[col.tipo] ?? '').toUpperCase() || 'P' : 'P';
                    const diaRaw = 'dia' in col ? row[col.dia] : '';
                    const inicio = row[col.inicio];
                    const finVal = row[col.fin];
                    const aula = 'aula' in col ? normStr(row[col.aula] ?? '') || 'S/A' : 'S/A';

                    // Salta filas sin datos esenciales
                    if (!nombre || !seccion || !diaRaw) continue;

                    const dia = normDia(diaRaw);
                    const ini = parseHora(inicio);
                    const fin = parseHora(finVal);

                    // Salta clases con horas inválidas
                    if (ini === null || fin === null || ini >= fin) continue;

                    // Construye la estructura carga[nombre][seccion]
                    if (!(nombre in carga)) carga[nombre] = {};
                    if (!(seccion in carga[nombre])) carga[nombre][seccion] = { docente, clases: [] };

                    carga[nombre][seccion].clases.push({ dia, ini, fin, tipo, aula });
                }

                resolve(carga);

            } catch (err) {
                reject('Error al leer el archivo: ' + err.message);
            }
        };

        reader.onerror = () => reject('No se pudo leer el archivo.');

        // Lee el archivo como ArrayBuffer (necesario para SheetJS)
        reader.readAsArrayBuffer(file);
    });
}