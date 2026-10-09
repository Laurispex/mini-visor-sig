
// ============================================================
// INVERSIG — UI V1
// Capa de interfaz sobre el Mini Visor SIG existente.
// No reemplaza la lógica de Leaflet/PyProj de app.js.
// ============================================================

(function () {
    "use strict";

    const navItems = document.querySelectorAll(".nav-item");
    const panels = document.querySelectorAll(".view-panel");

    function activarVista(view) {
        navItems.forEach((item) => {
            item.classList.toggle("active", item.dataset.view === view);
        });

        panels.forEach((panel) => {
            panel.classList.toggle("active", panel.id === `view-${view}`);
        });

        // Leaflet necesita recalcular su tamaño cuando cambia el panel.
        if (window.map && typeof window.map.invalidateSize === "function") {
            setTimeout(() => window.map.invalidateSize(), 80);
        }
    }

    navItems.forEach((item) => {
        item.addEventListener("click", () => activarVista(item.dataset.view));
    });

    document.querySelectorAll("[data-view-target]").forEach((button) => {
        button.addEventListener("click", () => activarVista(button.dataset.viewTarget));
    });

    // ------------------------------------------------------------
    // Búsqueda: busca entidades que ya estén cargadas en Leaflet.
    // No inventa terrenos ni datos de mercado.
    // ------------------------------------------------------------

    const searchInput = document.getElementById("globalSearch");
    const searchMessage = document.getElementById("searchMessage");

    function mostrarMensaje(texto) {
        if (!searchMessage) return;
        searchMessage.textContent = texto;
        searchMessage.style.display = "block";
        clearTimeout(mostrarMensaje.timer);
        mostrarMensaje.timer = setTimeout(() => {
            searchMessage.style.display = "none";
        }, 3500);
    }

    function normalizar(valor) {
        return String(valor ?? "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .trim();
    }

    function buscarEnCapas(texto) {
        if (!window.map || !texto) return null;

        const q = normalizar(texto);
        let encontrado = null;

        window.map.eachLayer((layer) => {
            if (encontrado || !layer.feature) return;

            const props = layer.feature.properties || {};
            const valores = Object.values(props).map(normalizar);

            if (valores.some((valor) => valor.includes(q))) {
                encontrado = layer;
            }
        });

        return encontrado;
    }

    function ejecutarBusqueda() {
        const texto = searchInput?.value?.trim();

        if (!texto) {
            mostrarMensaje("Escribe un municipio, nombre o código para buscar.");
            return;
        }

        const encontrado = buscarEnCapas(texto);

        if (!encontrado) {
            mostrarMensaje(
                "No se encontró en las capas cargadas. La búsqueda de terrenos reales se conectará en la siguiente fase."
            );
            return;
        }

        activarVista("explore");

        if (typeof encontrado.getBounds === "function") {
            const bounds = encontrado.getBounds();
            if (bounds && bounds.isValid && bounds.isValid()) {
                window.map.fitBounds(bounds, { padding: [50, 50] });
            }
        } else if (typeof encontrado.getLatLng === "function") {
            window.map.setView(encontrado.getLatLng(), 12);
        }

        if (typeof encontrado.openPopup === "function") {
            encontrado.openPopup();
        }

        mostrarMensaje("Ubicación encontrada en las capas cargadas.");
    }

    if (searchInput) {
        searchInput.addEventListener("keydown", (event) => {
            if (event.key === "Enter") ejecutarBusqueda();
        });
    }

    // Botón de captura del diseño: reutiliza el botón que app.js ya controla.
    const mapCaptureButton = document.getElementById("mapCaptureButton");
    const legacyCapture = [...document.querySelectorAll(".tool-button")]
        .find((button) => button.textContent.includes("Capturar Coordenadas"));

    if (mapCaptureButton && legacyCapture) {
        mapCaptureButton.addEventListener("click", () => legacyCapture.click());
    }

    // Filtros: por ahora validan que no se presenten resultados ficticios.
    const applyFilters = document.getElementById("applyFilters");
    if (applyFilters) {
        applyFilters.addEventListener("click", () => {
            mostrarMensaje(
                "Filtros preparados. Se activarán cuando conectemos la fuente real de terrenos."
            );
        });
    }

    // Estado inicial.
    activarVista("explore");
})();
