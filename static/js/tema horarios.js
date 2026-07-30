// SIGA — motor de temas para el Generador de Horarios
// Mismo criterio que Intranotas: 'claro' ES el tono de marca SIGA
// (no hay una opción de menú aparte llamada "SIGA"), y conviven con
// él Oscuro / Ocean / Forest como alternativas reales.
//
// Se apoya en localStorage para que la elección se mantenga al pasar
// de index.html a generador.html (misma clave para las dos pantallas).
(function () {
    const LS_TEMA = 'horarioGen_tema';
    const TEMA_POR_DEFECTO = 'claro';

    const TEMAS = [
        { id: 'claro', etiqueta: 'Claro', icono: '☀️' },
        { id: 'oscuro', etiqueta: 'Oscuro', icono: '🌙' },
        { id: 'ocean', etiqueta: 'Ocean', icono: '🌊' },
        { id: 'forest', etiqueta: 'Forest', icono: '🌲' },
    ];

    function temaGuardado() {
        try {
            return localStorage.getItem(LS_TEMA) || TEMA_POR_DEFECTO;
        } catch (e) {
            return TEMA_POR_DEFECTO;
        }
    }

    function aplicarTema(id) {
        if (!TEMAS.some((t) => t.id === id)) id = TEMA_POR_DEFECTO;

        document.documentElement.setAttribute('data-tema', id);
        try {
            localStorage.setItem(LS_TEMA, id);
        } catch (e) {
            // Ej: navegación privada sin acceso a localStorage — el tema
            // igual se aplica, solo no persiste entre pantallas/sesiones.
        }

        document.querySelectorAll('.tema-opcion').forEach((op) => {
            op.classList.toggle('activo', op.dataset.tema === id);
        });

        const meta = TEMAS.find((t) => t.id === id);
        if (meta) {
            document.querySelectorAll('.tema-boton-icono').forEach((ic) => {
                ic.textContent = meta.icono;
            });
        }
    }

    // Wiring del/los desplegable(s) .tema-selector presentes en la
    // página (puede haber uno en el siga-topbar de cada pantalla).
    function inicializarSelector() {
        document.querySelectorAll('.tema-selector').forEach((selector) => {
            const boton = selector.querySelector('.tema-boton');
            const menu = selector.querySelector('.tema-menu');
            if (!boton || !menu) return;

            boton.addEventListener('click', (ev) => {
                ev.stopPropagation();
                const abierto = menu.classList.toggle('abierto');
                boton.setAttribute('aria-expanded', abierto ? 'true' : 'false');
            });

            menu.querySelectorAll('.tema-opcion').forEach((op) => {
                op.addEventListener('click', () => {
                    aplicarTema(op.dataset.tema);
                    menu.classList.remove('abierto');
                    boton.setAttribute('aria-expanded', 'false');
                });
            });
        });

        document.addEventListener('click', () => {
            document.querySelectorAll('.tema-menu.abierto').forEach((m) => {
                m.classList.remove('abierto');
            });
        });

        document.addEventListener('keydown', (ev) => {
            if (ev.key === 'Escape') {
                document.querySelectorAll('.tema-menu.abierto').forEach((m) => {
                    m.classList.remove('abierto');
                });
            }
        });
    }

    document.addEventListener('DOMContentLoaded', () => {
        aplicarTema(temaGuardado());
        inicializarSelector();
    });
})();