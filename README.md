# HorarioGen 🗓

Generador de horarios universitarios. Sube la carga horaria oficial de la universidad,
selecciona tus cursos y genera todas las combinaciones de horario posibles.

---

## Instalación rápida (VS Code)

### 1. Requisitos previos
- Python 3.10 o superior instalado
- VS Code con la extensión Python

### 2. Clonar / abrir el proyecto
Abre la carpeta `horariogen` en VS Code.

### 3. Crear entorno virtual (recomendado)
Abre la terminal integrada de VS Code (`Ctrl + ñ`) y ejecuta:

```bash
python -m venv venv
```

Activar el entorno:
- **Windows:**   `venv\Scripts\activate`
- **Mac/Linux:** `source venv/bin/activate`

### 4. Instalar dependencias

```bash
pip install -r requirements.txt
```

### 5. Agregar tu imagen
Coloca tu imagen (la del ícono de Harry) en:
```
static/img/harry.png
```
El archivo debe llamarse exactamente `harry.png`.
Si tienes otro formato (.jpg, .webp), renómbralo o cambia la extensión
en `templates/base.html` en la línea:
```html
<img src="{{ url_for('static', filename='img/harry.png') }}" ...>
```

### 6. Ejecutar la app

```bash
python app.py
```

La app estará disponible en: **http://localhost:5000**

---

## Estructura del proyecto

```
horariogen/
├── app.py                  ← Backend Flask (rutas y lógica)
├── requirements.txt        ← Dependencias Python
├── utils/
│   ├── __init__.py
│   └── parser.py           ← Parseo del Excel de la universidad
├── templates/
│   ├── base.html           ← Layout base (firma Harry aquí)
│   ├── index.html          ← Página de inicio: subir Excel + buscar cursos
│   └── generador.html      ← Página del generador: secciones + calendario
└── static/
    ├── css/
    │   └── style.css       ← Todos los estilos
    ├── js/
    │   └── generador.js    ← Lógica del calendario y favoritos
    └── img/
        └── harry.png       ← Tu imagen (agregar manualmente)
```

---

## Flujo de uso

1. **Subir Excel** — Carga el Excel oficial de la universidad (cualquier semestre)
2. **Buscar cursos** — Escribe el nombre del curso y agrégalo con `+`
3. **Elegir secciones** — Para cada curso, marca qué secciones quieres considerar
4. **Configurar cruces** — Define cuántos cruces de teoría permites (0 = sin cruces)
5. **Generar** — El sistema calcula todas las combinaciones válidas
6. **Navegar y guardar** — Usa ◀ ▶ para ver opciones, ★ para guardar favoritos
7. **Exportar** — Descarga el horario como imagen PNG

---

## Convertir a Django (pasos futuros)

Si en el futuro quieres migrar a Django:
1. La lógica de `utils/parser.py` se mueve sin cambios a un `management command`
2. `app.py` se convierte en `views.py` + `urls.py`
3. Los templates usan la misma sintaxis Jinja2 (compatible con Django templates)
4. Agregar modelos para persistir favoritos en base de datos

---

## Notas técnicas

- Los favoritos se guardan **en memoria** mientras la app esté corriendo.
  Al reiniciar el servidor se pierden. Para persistirlos, agregar SQLite/PostgreSQL.
- El Excel debe tener los headers en cualquier fila (el parser los detecta automáticamente).
- Compatible con los formatos de carga horaria de la UNMSM (probado con 2025-2 y 2026-1).
