from flask import Flask, render_template, request, jsonify, session, redirect, url_for
import json, os, sys, webbrowser
from threading import Timer
from utils.parser import parsear_excel

# ── CONFIGURACIÓN PARA APP DE ESCRITORIO (.EXE) ──
def resource_path(relative_path):
    """ Obtiene la ruta absoluta para recursos, compatible con PyInstaller """
    if hasattr(sys, '_MEIPASS'):
        # Ruta cuando es un ejecutable (.exe)
        return os.path.join(sys._MEIPASS, relative_path)
    # Ruta cuando es código normal (.py)
    return os.path.join(os.path.abspath("."), relative_path)

app = Flask(__name__, 
            template_folder=resource_path('templates'),
            static_folder=resource_path('static'))

app.secret_key = 'horariogen-secret-2026'
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024 

# ── ALMACENAMIENTO (En memoria) ──
carga_horaria = {} 
favoritos     = [] 

@app.route('/')
def index():
    nombres = sorted(carga_horaria.keys()) if carga_horaria else []
    return render_template('index.html', cargado=bool(carga_horaria), cursos_nombres=nombres)

@app.route('/generador')
def generador():
    return render_template('generador.html')

# --- RUTA CORREGIDA PARA COINCIDIR CON EL HTML ---
@app.route('/upload', methods=['POST'])
def upload():
    global carga_horaria
    # Ahora busca 'file' que es lo que envía el nuevo index.html
    if 'file' not in request.files:
        return jsonify({'ok': False, 'error': 'No se recibió archivo'})
    
    f = request.files['file']
    if not f.filename:
        return jsonify({'ok': False, 'error': 'Archivo vacío'})
    
    try:
        carga_horaria = parsear_excel(f)
        cursos = sorted(carga_horaria.keys())
        return jsonify({'ok': True, 'cursos': cursos, 'total': len(cursos)})
    except Exception as e:
        return jsonify({'ok': False, 'error': str(e)})

@app.route('/secciones', methods=['POST'])
def secciones():
    data = request.get_json()
    cursos = data.get('cursos', [])
    result = {}
    for curso in cursos:
        if curso in carga_horaria:
            result[curso] = {sec: info for sec, info in carga_horaria[curso].items()}
    return jsonify(result)

@app.route('/generar', methods=['POST'])
def generar():
    data = request.get_json()
    seleccion = data.get('seleccion', {})
    max_cruces = int(data.get('max_cruces', 0))
    opciones_por_curso = []
    for curso, secs in seleccion.items():
        if curso not in carga_horaria: continue
        opts = [ {**info, 'nombre': curso, 'seccion': sec} 
                 for sec, info in carga_horaria[curso].items() if sec in secs ]
        if opts: opciones_por_curso.append(opts)
    if not opciones_por_curso: return jsonify({'ok': False, 'error': 'No hay clases válidas'})
    
    combos = []
    def calcular_cruces(combo):
        cruces = 0
        clases = [cl for sec in combo for cl in sec['clases']]
        for i in range(len(clases)):
            for j in range(i + 1, len(clases)):
                a, b = clases[i], clases[j]
                if a['dia'] != b['dia']: continue
                overlap = max(0, min(a['fin'], b['fin']) - max(a['ini'], b['ini']))
                if overlap <= 0: continue
                if a.get('tipo') == 'P' and b.get('tipo') == 'P': return float('inf')
                cruces += 1
        return cruces

    def solve(idx, curr):
        if idx == len(opciones_por_curso):
            combos.append([s.copy() for s in curr])
            return
        for sec in opciones_por_curso[idx]:
            if calcular_cruces(curr + [sec]) <= max_cruces:
                curr.append(sec); solve(idx + 1, curr); curr.pop()
    solve(0, [])
    return jsonify({'ok': True, 'combos': combos, 'total': len(combos)})

@app.route('/favoritos', methods=['GET', 'POST'])
def handle_favoritos():
    if request.method == 'POST':
        data = request.get_json()
        combo, nombre = data.get('combo'), data.get('nombre', f'Favorito {len(favoritos)+1}')
        if combo: favoritos.append({'nombre': nombre, 'combo': combo})
        return jsonify({'ok': True, 'total': len(favoritos)})
    return jsonify(favoritos)

@app.route('/favoritos/<int:idx>', methods=['DELETE'])
def del_favorito(idx):
    if 0 <= idx < len(favoritos): favoritos.pop(idx)
    return jsonify({'ok': True})

# ── LÓGICA DE LANZAMIENTO ──
def open_browser():
    """ Abre el navegador en la dirección local """
    webbrowser.open_new('http://127.0.0.1:5000/')

if __name__ == '__main__':
    Timer(1.5, open_browser).start()
    app.run(host='127.0.0.1', port=5000, debug=True)