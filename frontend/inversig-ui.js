
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
    // BUSCADOR GEOGRÁFICO INVERSIG
    // Municipios, coordenadas y direcciones.
    // ------------------------------------------------------------

    const searchInput = document.getElementById("globalSearch");
    const searchMessage = document.getElementById("searchMessage");

    let marcadorBusqueda = null;
    let busquedaEnCurso = false;

    function mostrarMensaje(texto) {
        if (!searchMessage) return;
        searchMessage.textContent = texto;
        searchMessage.style.display = "block";
    }

    function normalizar(valor) {
        return String(valor ?? "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .trim();
    }

    function centrarEnPunto(lat, lon, zoom = 15) {
        if (!window.map) {
            mostrarMensaje("El mapa todavía no está disponible.");
            return;
        }

        window.map.setView([lat, lon], zoom);

        if (marcadorBusqueda) {
            window.map.removeLayer(marcadorBusqueda);
        }

        marcadorBusqueda = L.marker([lat, lon])
            .addTo(window.map)
            .bindPopup(
                `<strong>Ubicación encontrada</strong><br>
                 Latitud: ${lat.toFixed(6)}<br>
                 Longitud: ${lon.toFixed(6)}`
            )
            .openPopup();

        mostrarMensaje(
            `Ubicación: ${lat.toFixed(6)}, ${lon.toFixed(6)}`
        );
    }

    async function ejecutarBusqueda() {
        const texto = searchInput?.value?.trim();

        if (!texto || busquedaEnCurso) {
            if (!texto) mostrarMensaje("Escribe un municipio, dirección o coordenadas.");
            return;
        }

        if (!window.map) {
            mostrarMensaje("El mapa todavía no está disponible.");
            return;
        }

        busquedaEnCurso = true;
        mostrarMensaje("Buscando ubicación...");

        try {
            // 1. Coordenadas: latitud, longitud
            const coincidencia = texto.match(
                /^\s*(-?\d{1,2}(?:\.\d+)?)\s*[,;]\s*(-?\d{1,3}(?:\.\d+)?)\s*$/
            );

            if (coincidencia) {
                const lat = Number(coincidencia[1]);
                const lon = Number(coincidencia[2]);

                if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
                    mostrarMensaje("Las coordenadas están fuera de los rangos válidos.");
                    return;
                }

                centrarEnPunto(lat, lon);
                return;
            }

            // 2. Buscar municipios en el catálogo existente
            const respuesta = await fetch(
                "https://mini-visor-sig.onrender.com/municipios/catalogo"
            );

            if (!respuesta.ok) {
                throw new Error("No se pudo consultar el catálogo de municipios.");
            }

            const municipios = await respuesta.json();
            const consulta = normalizar(texto);

            const municipio = municipios.find(
                item => normalizar(item.nombre) === consulta
            ) || municipios.find(
                item => normalizar(item.nombre).includes(consulta)
            );

            if (municipio) {
                // El polígono se busca en la capa municipal cargada
                let capaEncontrada = null;

                window.map.eachLayer(layer => {
                    if (!layer.feature || capaEncontrada) return;

                    const props = layer.feature.properties || {};

                    if (
                        String(props.codigo) === String(municipio.codigo) ||
                        normalizar(props.nombre) === normalizar(municipio.nombre)
                    ) {
                        capaEncontrada = layer;
                    }
                });

                if (capaEncontrada) {
                    const bounds = capaEncontrada.getBounds();

                    if (bounds?.isValid()) {
                        window.map.fitBounds(bounds, {
                            padding: [35, 35],
                            maxZoom: 12
                        });
                    }

                    capaEncontrada.openPopup?.();

                    mostrarMensaje(
                        `Municipio encontrado: ${municipio.nombre}`
                    );
                } else {
                    mostrarMensaje(
                        `Encontrado ${municipio.nombre}, pero su geometría aún no está cargada en el mapa.`
                    );
                }

                return;
            }

            // 3. Buscar dirección o lugar mediante geocodificación
            const url = new URL(
                "https://nominatim.openstreetmap.org/search"
            );

            url.search = new URLSearchParams({
                q: `${texto}, Colombia`,
                format: "jsonv2",
                limit: "1",
                countrycodes: "co"
            }).toString();

            const geoRespuesta = await fetch(url);

            if (!geoRespuesta.ok) {
                throw new Error("No fue posible consultar el servicio de direcciones.");
            }

            const resultados = await geoRespuesta.json();

            if (!resultados.length) {
                mostrarMensaje("No encontramos esa ubicación. Prueba con otro nombre o una dirección más completa.");
                return;
            }

            const lugar = resultados[0];

            centrarEnPunto(
                Number(lugar.lat),
                Number(lugar.lon),
                16
            );

            mostrarMensaje(`Ubicación encontrada: ${lugar.display_name}`);

        } catch (error) {
            console.error("Error en el buscador INVERSIG:", error);
            mostrarMensaje(
                "No se pudo completar la búsqueda. Verifica la conexión e inténtalo nuevamente."
            );
        } finally {
            busquedaEnCurso = false;
        }
    }

    if (searchInput) {
        searchInput.addEventListener("keydown", event => {
            if (event.key === "Enter") ejecutarBusqueda();
        });
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
