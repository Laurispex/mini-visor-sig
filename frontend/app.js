// ============================================================
// MINI VISOR SIG
// ============================================================

// ============================================================
// MAPA BASE
// ============================================================

const map = L.map("map").setView(
    [4.5709, -74.2973],
    6
);
window.map = map;

function mostrarNotificacion(
    tipo,
    titulo,
    mensaje,
    detalle,
    accion = null
) {
    const estilos = {
        success: { borde: "#10b981", fondo: "#ecfdf5", texto: "#065f46", icono: "✓" },
        error:   { borde: "#ef4444", fondo: "#fef2f2", texto: "#991b1b", icono: "!" },
        warning: { borde: "#f59e0b", fondo: "#fffbeb", texto: "#92400e", icono: "⚠" },
        info:    { borde: "#3b82f6", fondo: "#eff6ff", texto: "#1e40af", icono: "i" }
    };
    const estilo = estilos[tipo] || estilos.info;

    let contenedor = document.getElementById("inversig-toast-container");
    if (!contenedor) {
        contenedor = document.createElement("div");
        contenedor.id = "inversig-toast-container";
        Object.assign(contenedor.style, {
            position: "fixed",
            top: "18px",
            right: "18px",
            zIndex: "200000",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
            width: "min(410px, calc(100vw - 36px))",
            pointerEvents: "none"
        });
        document.body.appendChild(contenedor);
    }

    const notificacion = document.createElement("section");
    notificacion.setAttribute("role", tipo === "error" ? "alert" : "status");
    notificacion.setAttribute("aria-live", tipo === "error" ? "assertive" : "polite");
    Object.assign(notificacion.style, {
        boxSizing: "border-box",
        width: "100%",
        display: "grid",
        gridTemplateColumns: "30px minmax(0, 1fr) 24px",
        columnGap: "10px",
        alignItems: "start",
        padding: "14px",
        background: estilo.fondo,
        color: estilo.texto,
        borderLeft: `5px solid ${estilo.borde}`,
        borderRadius: "12px",
        boxShadow: "0 10px 30px rgba(15, 23, 42, .2)",
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
        fontSize: "13px",
        lineHeight: "1.45",
        opacity: "0",
        transform: "translateY(-8px)",
        transition: "opacity .2s ease, transform .2s ease",
        pointerEvents: "auto"
    });

    const icono = document.createElement("span");
    icono.textContent = estilo.icono;
    Object.assign(icono.style, {
        width: "28px",
        height: "28px",
        borderRadius: "50%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: estilo.borde,
        color: "#fff",
        fontWeight: "800",
        fontSize: "16px"
    });

    const contenido = document.createElement("div");
    contenido.style.minWidth = "0";

    const encabezado = document.createElement("strong");
    encabezado.textContent = titulo;
    Object.assign(encabezado.style, {
        display: "block",
        fontSize: "14px",
        marginBottom: "4px"
    });
    contenido.appendChild(encabezado);

    const mensajeElemento = document.createElement("div");
    mensajeElemento.textContent = mensaje || "";
    contenido.appendChild(mensajeElemento);

    if (accion && typeof accion.onClick === "function") {
        const botonAccion = document.createElement("button");
        botonAccion.type = "button";
        botonAccion.textContent = accion.label || "Deshacer";
        Object.assign(botonAccion.style, {
            marginTop: "9px",
            padding: "6px 12px",
            border: `1px solid ${estilo.borde}`,
            borderRadius: "7px",
            background: "#ffffff",
            color: estilo.texto,
            fontWeight: "700",
            cursor: "pointer"
        });
        botonAccion.addEventListener("click", () => {
            accion.onClick();
            quitar();
        });
        contenido.appendChild(botonAccion);
    }

    if (detalle) {
        const detalleElemento = document.createElement("div");
        detalleElemento.textContent = detalle;
        Object.assign(detalleElemento.style, {
            marginTop: "5px",
            opacity: ".9",
            overflowWrap: "anywhere"
        });
        contenido.appendChild(detalleElemento);
    }

    const cerrar = document.createElement("button");
    cerrar.type = "button";
    cerrar.textContent = "×";
    cerrar.setAttribute("aria-label", "Cerrar notificación");
    Object.assign(cerrar.style, {
        border: "0",
        background: "transparent",
        color: estilo.texto,
        cursor: "pointer",
        fontSize: "22px",
        lineHeight: "20px",
        padding: "0"
    });

    const quitar = () => {
        notificacion.style.opacity = "0";
        notificacion.style.transform = "translateY(-8px)";
        window.setTimeout(() => notificacion.remove(), 220);
    };
    cerrar.addEventListener("click", quitar);

    notificacion.append(icono, contenido, cerrar);
    contenedor.appendChild(notificacion);

    requestAnimationFrame(() => {
        notificacion.style.opacity = "1";
        notificacion.style.transform = "translateY(0)";
    });

    const duracion = tipo === "error" ? 8500 : 6500;
    window.setTimeout(quitar, duracion);
}

L.tileLayer(
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    {
        maxZoom: 19,
        attribution:
            "&copy; OpenStreetMap contributors"
    }
).addTo(map);


// ============================================================
// COORDENADAS DEL CURSOR
// ============================================================

map.on(
    "mousemove",
    function (event) {

        const lat =
            event.latlng.lat.toFixed(6);

        const lng =
            event.latlng.lng.toFixed(6);

        const coordinates =
            document.getElementById(
                "coordinates"
            );

        const cursorInfo =
            document.getElementById(
                "cursor-info"
            );

        if (coordinates) {
            coordinates.textContent =
                `${lng}, ${lat}`;
        }

        if (cursorInfo) {
            cursorInfo.textContent =
                `CURSOR: ${lng}, ${lat}`;
        }
    }
);


// ============================================================
// MINIMIZAR PANEL DE EXPLORACIÓN
// ============================================================

(function inicializarMinimizacionExplorar() {
    const panel = document.getElementById("view-explore");
    if (!panel) return;

    const encabezado = panel.querySelector(".panel-heading");
    const appShell = document.querySelector(".app-shell");
    const mapContainer = document.querySelector(".map-container");
    if (!encabezado || !appShell || !mapContainer) return;

    let boton = encabezado.querySelector(".explore-minimize-button");
    if (!boton) {
        boton = document.createElement("button");
        boton.type = "button";
        boton.className = "explore-minimize-button";
        boton.textContent = "−";
        boton.title = "Minimizar panel";
        boton.setAttribute("aria-label", "Minimizar panel de exploración");
        encabezado.appendChild(boton);
    }

    let minimizado = false;
    boton.setAttribute("aria-expanded", "true");
    boton.setAttribute("aria-controls", panel.id);

    function actualizarEstadoMinimizacion() {
        appShell.classList.toggle("explore-panel-collapsed", minimizado);

        if (minimizado) {
            mapContainer.appendChild(boton);
            boton.classList.add("is-collapsed");
        } else {
            encabezado.appendChild(boton);
            boton.classList.remove("is-collapsed");
        }

        boton.textContent = minimizado ? "+" : "−";
        boton.title = minimizado ? "Expandir panel" : "Minimizar panel";
        boton.setAttribute(
            "aria-label",
            minimizado ? "Expandir panel de exploración" : "Minimizar panel de exploración"
        );
        boton.setAttribute("aria-expanded", String(!minimizado));

        if (window.map && typeof window.map.invalidateSize === "function") {
            window.setTimeout(() => window.map.invalidateSize(), 80);
        }
    }

    boton.addEventListener("click", function (event) {
        event.preventDefault();
        event.stopPropagation();

        minimizado = !minimizado;
        actualizarEstadoMinimizacion();
    });

    document.querySelectorAll(".nav-item, [data-view-target]").forEach((control) => {
        control.addEventListener("click", function () {
            const vista = control.dataset.view || control.dataset.viewTarget;
            if (vista !== "explore" && minimizado) {
                minimizado = false;
                actualizarEstadoMinimizacion();
            }
        });
    });
})();

// ============================================================
// EXPLORAR TERRENOS: CONECTOR VIXORA AI
// ============================================================

let vixoraMarkersLayer = null;
let vixoraMunicipalityLayer = null;
let vixoraLastResults = [];

const CODIGOS_MUNICIPIOS_VIXORA = {
    "rionegro": "05615",
    "la-ceja": "05376",
    "el-retiro": "05607",
    "guarne": "05318",
    "marinilla": "05440",
    "el-carmen-de-viboral": "05148",
    "el-santuario": "05697",
    "san-vicente-ferrer": "05674",
    "guatape": "05321",
    "el-penol": "05541",
    "san-rafael": "05667",
    "san-carlos": "05649",
    "sonson": "05756",
    "abejorral": "05002"
};

async function resaltarMunicipioVixora(municipioSlug) {
    if (!window.map || !municipioSlug) return;
    if (vixoraMunicipalityLayer) {
        window.map.removeLayer(vixoraMunicipalityLayer);
        vixoraMunicipalityLayer = null;
    }

    const codigo = CODIGOS_MUNICIPIOS_VIXORA[municipioSlug];
    if (!codigo) return;

    const response = await fetch(`https://mini-visor-sig.onrender.com/municipios/${codigo}/geometria`);
    if (!response.ok) throw new Error("No fue posible cargar el límite geográfico del municipio.");
    const geojson = await response.json();

    vixoraMunicipalityLayer = L.geoJSON(geojson, {
        style: {
            color: "#dc2626",
            weight: 3,
            opacity: 1,
            fillColor: "#ef4444",
            fillOpacity: 0.24
        },
        interactive: true
    }).addTo(window.map);

    const bounds = vixoraMunicipalityLayer.getBounds();
    if (bounds.isValid()) window.map.fitBounds(bounds.pad(0.12), { maxZoom: 12 });
}

function formatoCOP(valor) {
    const numero = Number(valor);
    if (!Number.isFinite(numero)) return "Precio no informado";
    return numero.toLocaleString("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });
}

function obtenerDatoAnuncio(anuncio, ruta) {
    return ruta.split(".").reduce((valor, clave) => valor && valor[clave] !== undefined ? valor[clave] : null, anuncio);
}

function obtenerCoordenadasAnuncio(anuncio) {
    const candidatos = [
        [obtenerDatoAnuncio(anuncio, "location.latitude"), obtenerDatoAnuncio(anuncio, "location.longitude")],
        [obtenerDatoAnuncio(anuncio, "location.lat"), obtenerDatoAnuncio(anuncio, "location.lng")],
        [anuncio.latitude, anuncio.longitude],
        [anuncio.lat, anuncio.lng],
        [anuncio.latitud, anuncio.longitud],
        [obtenerDatoAnuncio(anuncio, "coordinates.latitude"), obtenerDatoAnuncio(anuncio, "coordinates.longitude")],
        [obtenerDatoAnuncio(anuncio, "geo.latitude"), obtenerDatoAnuncio(anuncio, "geo.longitude")]
    ];
    for (const [lat, lng] of candidatos) {
        const y = Number(lat), x = Number(lng);
        // INVERSIG está probando el Oriente Antioqueño: descarta coordenadas fuera de Antioquia.
        if (Number.isFinite(y) && Number.isFinite(x) && y >= 5.3 && y <= 8.9 && x >= -77.3 && x <= -73.7) return [y, x];
    }
    return null;
}

function renderizarAnunciosVixora(anuncios) {
    const contenedor = document.getElementById("opportunityList");
    if (!contenedor) return;
    contenedor.replaceChildren();

    if (vixoraMarkersLayer && window.map) window.map.removeLayer(vixoraMarkersLayer);
    vixoraMarkersLayer = L.featureGroup();

    if (!anuncios.length) {
        contenedor.innerHTML = '<div class="empty-state"><div class="empty-icon">⌕</div><strong>No se encontraron publicaciones</strong><p>Prueba con otro municipio o ajusta el área y el precio máximo.</p></div>';
        return;
    }

    anuncios.forEach((anuncio) => {
        const codigo = anuncio.code || "Sin código";
        const titulo = anuncio.title || `${anuncio.type || "Terreno"} en venta`;
        const municipio = obtenerDatoAnuncio(anuncio, "location.municipality") || "Municipio no informado";
        const vereda = obtenerDatoAnuncio(anuncio, "location.vereda");
        const area = obtenerDatoAnuncio(anuncio, "areas.lot_m2") ?? anuncio.area_m2 ?? anuncio.area;
        const precio = obtenerDatoAnuncio(anuncio, "price.amount") ?? anuncio.price;
        const url = anuncio.url || anuncio.canonical_url || "https://vixoraai.com";
        const fotoRaw = (Array.isArray(anuncio.photos) && anuncio.photos[0]) || anuncio.image || anuncio.cover_image || "";
        const foto = typeof fotoRaw === "string" ? fotoRaw : (fotoRaw?.url || fotoRaw?.src || "");
        const ubicacionAprox = obtenerDatoAnuncio(anuncio, "location.approximate");

        const card = document.createElement("article");
        card.className = "opportunity-card";
        const fotoHtml = foto ? `<img class="opportunity-photo" src="${escaparHtmlMunicipio(foto)}" alt="Fotografía de ${escaparHtmlMunicipio(titulo)}" loading="lazy">` : '<div class="opportunity-photo opportunity-photo-placeholder">⌂</div>';
        card.innerHTML = `${fotoHtml}<div class="opportunity-card-body">
            <div class="opportunity-card-top"><span class="opportunity-code">${escaparHtmlMunicipio(codigo)}</span><span class="opportunity-type">${escaparHtmlMunicipio(anuncio.type || "terreno")}</span></div>
            <h4>${escaparHtmlMunicipio(titulo)}</h4>
            <p class="opportunity-location">⌖ ${escaparHtmlMunicipio(municipio)}${vereda ? ` · ${escaparHtmlMunicipio(vereda)}` : ""}${ubicacionAprox ? " · Ubicación aproximada" : ""}</p>
            <div class="opportunity-facts"><span><small>Área de lote</small><strong>${area !== null && area !== undefined ? `${Number(area).toLocaleString("es-CO")} m²` : "No informada"}</strong></span><span><small>Precio publicado</small><strong>${formatoCOP(precio)}</strong></span></div>
            <a class="opportunity-link" href="${escaparHtmlMunicipio(url)}" target="_blank" rel="noopener noreferrer">Ver publicación original ↗</a>
        </div>`;
        contenedor.appendChild(card);

        const coords = obtenerCoordenadasAnuncio(anuncio);
        if (coords) {
            const marker = L.marker(coords).bindPopup(`<strong>${escaparHtmlMunicipio(titulo)}</strong><br>${escaparHtmlMunicipio(municipio)}<br>${formatoCOP(precio)}<br><a href="${escaparHtmlMunicipio(url)}" target="_blank" rel="noopener noreferrer">Ver publicación</a>`);
            vixoraMarkersLayer.addLayer(marker);
        }
    });

    if (window.map && vixoraMarkersLayer.getLayers().length) {
        vixoraMarkersLayer.addTo(window.map);
    }
}

async function buscarTerrenosVixora() {
    const boton = document.getElementById("applyFilters");
    const estado = document.getElementById("opportunityStatus");
    const municipio = document.getElementById("terrainMunicipality")?.value || "";
    const tipo = document.getElementById("terrainType")?.value || "ambos";
    const areaMin = document.getElementById("minArea")?.value || "";
    const precioMax = document.getElementById("maxBudget")?.value || "";
    const params = new URLSearchParams({ tipo, page: "1", page_size: "50" });
    if (municipio) params.set("municipio", municipio);
    if (areaMin) params.set("area_min", areaMin);
    if (precioMax) params.set("precio_max", precioMax);

    if (boton) { boton.disabled = true; boton.textContent = "Consultando VIXORA…"; }
    if (estado) estado.textContent = "Consultando publicaciones disponibles…";
    const contenedor = document.getElementById("opportunityList");
    if (contenedor) contenedor.innerHTML = '<div class="empty-state"><strong>Buscando terrenos…</strong><p>Conectando con la fuente inmobiliaria.</p></div>';

    try {
        if (municipio) {
            try {
                await resaltarMunicipioVixora(municipio);
            } catch (mapError) {
                console.warn("No se pudo resaltar el municipio seleccionado:", mapError);
            }
        } else if (vixoraMunicipalityLayer && window.map) {
            window.map.removeLayer(vixoraMunicipalityLayer);
            vixoraMunicipalityLayer = null;
        }

        const response = await fetch(`https://mini-visor-sig.onrender.com/fuentes/vixora/propiedades?${params.toString()}`);
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.detail || `Error HTTP ${response.status}`);
        vixoraLastResults = Array.isArray(payload.data) ? payload.data : [];
        renderizarAnunciosVixora(vixoraLastResults);
        const cantidad = vixoraLastResults.length;
        if (estado) estado.textContent = `${cantidad} publicación${cantidad === 1 ? "" : "es"} recibida${cantidad === 1 ? "" : "s"} desde VIXORA`;
        if (typeof mostrarNotificacion === "function") {
            mostrarNotificacion("success", "Consulta completada", `${cantidad} publicaciones recibidas desde VIXORA AI.`, "Los datos se consultaron en línea y no se guardaron en INVERSIG.");
        }
    } catch (error) {
        console.error("Error consultando VIXORA:", error);
        if (estado) estado.textContent = "No fue posible consultar la fuente";
        if (contenedor) contenedor.innerHTML = `<div class="empty-state"><strong>Error de conexión con VIXORA</strong><p>${escaparHtmlMunicipio(error.message)}. Verifica que el backend de INVERSIG esté activo y tenga conexión a internet.</p></div>`;
        if (typeof mostrarNotificacion === "function") mostrarNotificacion("error", "No se pudo consultar VIXORA", error.message, "Comprueba que FastAPI esté activo en el puerto 8000.");
    } finally {
        if (boton) { boton.disabled = false; boton.innerHTML = '<span aria-hidden="true">⌕</span> Buscar terrenos publicados'; }
    }
}

const buscarTerrenosButton = document.getElementById("applyFilters");
if (buscarTerrenosButton) buscarTerrenosButton.addEventListener("click", buscarTerrenosVixora);

// ============================================================
// CONTENEDOR DEL PANEL
// ============================================================

const layersContainer =
    document.getElementById(
        "layersContainer"
    );


// ============================================================
// CREAR CAPA GEOJSON
// ============================================================

function crearCapaGeoJSON(
    geojson,
    opciones = {}
) {

    return L.geoJSON(
        geojson,
        {

            style: {

                color:
                    opciones.color ||
                    "#087f72",

                weight:
                    opciones.weight ||
                    2,

                fillOpacity:
                    opciones.fillOpacity ??
                    0.25
            },


            pointToLayer:
                function (
                    feature,
                    latlng
                ) {

                    return L.circleMarker(
                        latlng,
                        {
                            radius: 7,

                            fillColor:
                                "#e58b2a",

                            color:
                                "#ffffff",

                            weight: 2,

                            fillOpacity:
                                0.95
                        }
                    );
                },


            onEachFeature:
                function (
                    feature,
                    layer
                ) {

                    const datos =
                        feature.properties ||
                        {};


                    // ------------------------------------------------
                    // POPUP PARA CAPAS REPROYECTADAS
                    // ------------------------------------------------

                    if (
                        opciones.reproyectada &&
                        feature._coordenadasReproyectadas
                    ) {

                        const coord =
                            feature._coordenadasReproyectadas;

                        const originales =
                            feature._coordenadasOriginales;

                        const contenido = `

                            <div style="
                                min-width:250px;
                                font-family:Arial,sans-serif;
                            ">

                                <h3 style="
                                    margin:0 0 12px 0;
                                    color:#087f72;
                                ">
                                    ${
                                        datos.nombre ||
                                        "Elemento geográfico"
                                    }
                                </h3>


                                <div style="
                                    padding:10px;
                                    background:#ecfdf5;
                                    border-radius:8px;
                                    margin-bottom:12px;
                                ">
                                    <strong>
                                        ✓ Capa reproyectada
                                    </strong>
                                </div>


                                <p>
                                    <strong>CRS:</strong>
                                    ${opciones.crs}
                                </p>


                                <p>
                                    <strong>X:</strong>
                                    ${
                                        coord &&
                                        coord[0] !== undefined
                                            ? Number(
                                                coord[0]
                                            ).toFixed(3)
                                            : "—"
                                    }
                                </p>


                                <p>
                                    <strong>Y:</strong>
                                    ${
                                        coord &&
                                        coord[1] !== undefined
                                            ? Number(
                                                coord[1]
                                            ).toFixed(3)
                                            : "—"
                                    }
                                </p>


                                <hr>


                                <p style="
                                    font-size:12px;
                                    color:#6b7280;
                                ">
                                    <strong>
                                        Coordenadas originales
                                    </strong>
                                </p>


                                <p style="
                                    font-size:12px;
                                ">
                                    ${opciones.sourceCrs}
                                </p>


                                <p style="
                                    font-size:12px;
                                ">
                                    ${
                                        originales &&
                                        originales[0] !== undefined
                                            ? Number(
                                                originales[0]
                                            ).toFixed(6)
                                            : "—"
                                    },

                                    ${
                                        originales &&
                                        originales[1] !== undefined
                                            ? Number(
                                                originales[1]
                                            ).toFixed(6)
                                            : "—"
                                    }
                                </p>

                            </div>
                        `;

                        layer.bindPopup(
                            contenido
                        );

                    }

                    // ------------------------------------------------
                    // POPUP NORMAL
                    // ------------------------------------------------

                    else {

                        let contenido =
                            "<strong>Información geográfica</strong><br><br>";


                        Object.entries(
                            datos
                        ).forEach(
                            function (
                                [clave, valor]
                            ) {

                                contenido +=
                                    `<strong>${clave}:</strong> ${valor}<br>`;
                            }
                        );


                        layer.bindPopup(
                            contenido
                        );
                    }


                    // ------------------------------------------------
                    // TOOLTIP
                    // ------------------------------------------------

                    if (datos.nombre) {

                        layer.bindTooltip(
                            datos.nombre,
                            {
                                direction:
                                    "top",

                                sticky:
                                    true
                            }
                        );
                    }
                }
        }
    );
}


// ============================================================
// BOTÓN DE REPROYECCIÓN
// ============================================================

function agregarBotonReproyeccion(
    layerCard
) {

    if (
        layerCard.querySelector(
            ".reproject-button"
        )
    ) {
        return;
    }


    const boton =
        document.createElement(
            "button"
        );


    boton.className =
        "reproject-button";


    boton.type =
        "button";


    boton.textContent =
        "↗ Reproyectar";


    boton.style.width =
        "100%";

    boton.style.marginTop =
        "10px";

    boton.style.padding =
        "8px";

    boton.style.border =
        "none";

    boton.style.borderRadius =
        "7px";

    boton.style.cursor =
        "pointer";

    boton.style.background =
        "#087f72";

    boton.style.color =
        "#ffffff";

    boton.style.fontWeight =
        "600";


    layerCard.appendChild(
        boton
    );


    boton.addEventListener(
        "click",
        function (event) {

            event.preventDefault();

            event.stopPropagation();


            abrirVentanaReproyeccion(
                layerCard.dataset.layerName,
                layerCard.dataset.layerCrs,
                layerCard
            );
        }
    );
}


// ============================================================
// CONFIGURAR TARJETA DE CAPA
// ============================================================

function actualizarContadorCapas() {
    const contador = document.getElementById("layer-count");
    if (contador && layersContainer) {
        contador.textContent = String(
            layersContainer.querySelectorAll(".layer-card").length
        );
    }
}

function agregarBotonEliminarCapa(layerCard) {
    if (!layerCard) return;

    let boton = layerCard.querySelector(".delete-layer-button");
    if (!boton) {
        boton = document.createElement("button");
        boton.type = "button";
        boton.className = "delete-layer-button";
        boton.textContent = "×";
        boton.title = "Eliminar capa del mapa";
        boton.setAttribute("aria-label", "Eliminar capa del mapa");

        const titulo = layerCard.querySelector(".layer-title");
        if (titulo) {
            titulo.appendChild(boton);
        } else {
            layerCard.appendChild(boton);
        }
    }

    boton.onclick = function (event) {
        event.preventDefault();
        event.stopPropagation();

        const nombre = layerCard.dataset.layerName ||
            layerCard.querySelector(".layer-title strong")?.textContent?.trim() ||
            "la capa";

        // Guardar la ubicación de la tarjeta y el estado de visibilidad
        // de todas sus capas Leaflet para permitir deshacer sin recargar.
        const contenedorOriginal = layerCard.parentNode;
        const siguienteElemento = layerCard.nextSibling;
        const capas = [
            layerCard.leafletLayer,
            ...(Array.isArray(layerCard.auxiliaryLeafletLayers)
                ? layerCard.auxiliaryLeafletLayers
                : [])
        ].filter(Boolean);

        const estadoCapas = capas.map((capa) => ({
            capa,
            visible: map.hasLayer(capa)
        }));

        eliminarCapasDeTarjeta(layerCard);
        layerCard.remove();
        actualizarContadorCapas();

        mostrarNotificacion(
            "success",
            "Capa eliminada",
            `Se eliminó ${nombre} del mapa y del panel.`,
            null,
            {
                label: "Cancelar",
                onClick: function () {
                    // Reinsertar la misma tarjeta en su posición original.
                    if (contenedorOriginal) {
                        const referencia = (
                            siguienteElemento &&
                            siguienteElemento.parentNode === contenedorOriginal
                        ) ? siguienteElemento : null;

                        contenedorOriginal.insertBefore(layerCard, referencia);
                    }

                    // Recuperar exactamente las capas que estaban visibles.
                    estadoCapas.forEach(({ capa, visible }) => {
                        if (visible && !map.hasLayer(capa)) {
                            map.addLayer(capa);
                        } else if (!visible && map.hasLayer(capa)) {
                            map.removeLayer(capa);
                        }
                    });

                    const botonVisibilidad = layerCard.querySelector(".visibility");
                    const capaPrincipal = layerCard.leafletLayer;
                    const estabaVisible = capaPrincipal
                        ? map.hasLayer(capaPrincipal)
                        : false;

                    if (botonVisibilidad) {
                        botonVisibilidad.textContent = estabaVisible ? "●" : "○";
                        botonVisibilidad.classList.toggle("active", estabaVisible);
                    }

                    layerCard.classList.toggle("disabled", !estabaVisible);
                    actualizarContadorCapas();
                }
            }
        );
    };
}

function eliminarCapasDeTarjeta(layerCard) {
    const capas = [
        layerCard.leafletLayer,
        ...(Array.isArray(layerCard.auxiliaryLeafletLayers)
            ? layerCard.auxiliaryLeafletLayers
            : [])
    ];

    capas.forEach((capa) => {
        if (capa && map.hasLayer(capa)) {
            map.removeLayer(capa);
        }
    });
}

function configurarTarjeta(
    layerCard,
    nombre,
    capa,
    geojson,
    crs
) {

    if (!layerCard) {
        return;
    }


    layerCard.dataset.layerName =
        nombre;


    layerCard.dataset.layerCrs =
        crs;


    layerCard.geojson =
        geojson;


    layerCard.leafletLayer =
        capa;


    layerCard.displayGeojson =
        geojson;


    const visibilityButton =
        layerCard.querySelector(
            ".visibility"
        );


    if (visibilityButton) {

        visibilityButton.onclick =
            function (event) {

                event.preventDefault();

                event.stopPropagation();


                if (
                    map.hasLayer(capa)
                ) {

                    map.removeLayer(
                        capa
                    );

                    visibilityButton.textContent =
                        "○";

                    visibilityButton.classList.remove(
                        "active"
                    );

                    layerCard.classList.add(
                        "disabled"
                    );

                }

                else {

                    map.addLayer(
                        capa
                    );

                    visibilityButton.textContent =
                        "●";

                    visibilityButton.classList.add(
                        "active"
                    );

                    layerCard.classList.remove(
                        "disabled"
                    );
                }
            };
    }


    agregarBotonReproyeccion(
        layerCard
    );

    agregarBotonEliminarCapa(layerCard);
    actualizarContadorCapas();
}

function agregarBotonDescargaReproyeccion(layerCard) {
    let boton = layerCard.querySelector(".download-reprojected-button");

    if (!boton) {
        boton = document.createElement("button");
        boton.type = "button";
        boton.className = "download-reprojected-button";
        boton.textContent = "Descargar GeoJSON reproyectado";
        layerCard.appendChild(boton);
    }

    boton.onclick = function () {
        const geojson = layerCard.geojson;
        if (!geojson) {
            mostrarNotificacion(
                "error",
                "No se pudo descargar la capa",
                "No hay un resultado de reproyección disponible."
            );
            return;
        }

        const nombre = layerCard.dataset.layerName || "capa";
        const archivo = `${nombre}`
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-zA-Z0-9_-]+/g, "_")
            .replace(/^_+|_+$/g, "") || "capa";
        const url = URL.createObjectURL(
            new Blob(
                [JSON.stringify(geojson, null, 2)],
                { type: "application/geo+json" }
            )
        );
        const enlace = document.createElement("a");
        enlace.href = url;
        enlace.download = `${archivo}_${layerCard.dataset.layerCrs || "reproyectado"}.geojson`;
        enlace.click();
        window.setTimeout(
            function () {
                URL.revokeObjectURL(url);
            },
            1000
        );
    };
}


// ============================================================
// AGREGAR NUEVA CAPA AL PANEL
// ============================================================

function agregarCapaAlPanel(
    nombre,
    capa,
    cantidad,
    crs,
    geojson
) {

    if (!layersContainer) {
        return null;
    }


    // Evitar duplicados
    const tarjetas =
        layersContainer.querySelectorAll(
            ".layer-card"
        );


    for (
        let i = 0;
        i < tarjetas.length;
        i++
    ) {

        const titulo =
            tarjetas[i]
                .querySelector(
                    ".layer-title strong"
                );


        if (
            titulo &&
            titulo.textContent.trim() ===
                nombre
        ) {
            eliminarCapasDeTarjeta(tarjetas[i]);

            configurarTarjeta(
                tarjetas[i],
                nombre,
                capa,
                geojson,
                crs
            );

            return tarjetas[i];
        }
    }


    const layerCard =
        document.createElement(
            "div"
        );


    layerCard.className =
        "layer-card";


    layerCard.innerHTML = `

        <div class="layer-title">

            <span class="layer-symbol">
                ⬡
            </span>

            <strong>
                ${nombre}
            </strong>

            <button
                class="visibility active"
                type="button"
            >
                ●
            </button>

        </div>


        <div class="layer-info">

            <span class="epsg">
                ${crs}
            </span>

            <span>
                ${cantidad} entidades
            </span>

        </div>

    `;


    layersContainer.appendChild(
        layerCard
    );


    configurarTarjeta(
        layerCard,
        nombre,
        capa,
        geojson,
        crs
    );

    actualizarContadorCapas();

    return layerCard;
}


// ============================================================
// Capa ArcGIS de comunas y corregimientos desactivada por solicitud.
// Se conserva el resto de las capas y funcionalidades del visor.

// CAPITALes DEPARTAMENTALES
// ============================================================

function normalizarNombreMunicipio(valor) {
    return String(valor || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");
}

function obtenerAliasCapital(nombre) {
    const nombreNormalizado = normalizarNombreMunicipio(nombre);
    const alias = {
        bogotadc: "bogota",
        cartagenadeindias: "cartagena"
    };
    return alias[nombreNormalizado] || nombreNormalizado;
}

const municipiosCatalogoPromise = fetch(
    "https://mini-visor-sig.onrender.com/municipios/catalogo"
).then(function (response) {
    if (!response.ok) {
        throw new Error("No se pudo cargar el catálogo de municipios.");
    }
    return response.json();
});

let municipiosCatalogo = [];

municipiosCatalogoPromise.then(function (municipios) {
    municipiosCatalogo = municipios;
}).catch(function (error) {
    console.error("Error cargando el catálogo de municipios:", error);
});

function construirPopupCapital(capital, municipios) {
    const municipioCapital = municipios.find(function (municipio) {
        return obtenerAliasCapital(municipio.nombre) === obtenerAliasCapital(capital.nombre);
    });

    const codigoDepartamento = municipioCapital
        ? String(municipioCapital.codigo).slice(0, 2)
        : Object.entries(departamentosColombia).find(function ([, nombreDepartamento]) {
            return normalizarNombreMunicipio(nombreDepartamento)
                === normalizarNombreMunicipio(capital.departamento);
        })?.[0];

    const municipiosDepartamento = municipios.filter(function (municipio) {
        return String(municipio.codigo).slice(0, 2) === codigoDepartamento;
    });

    const opciones = municipiosDepartamento.map(function (municipio) {
        return `<option value="${escaparHtmlMunicipio(municipio.codigo)}">${escaparHtmlMunicipio(municipio.nombre)}</option>`;
    }).join("");

    return `
        <div class="capital-municipality-picker">
            <h3>${escaparHtmlMunicipio(capital.nombre || "Capital departamental")}</h3>
            <p class="capital-picker-help">Selecciona uno o varios municipios para consultar sus fichas.</p>
            <button type="button" class="capital-municipios-toggle" aria-expanded="false">
                Elegir municipios <span aria-hidden="true">▾</span>
            </button>
            <div class="capital-municipios-menu" hidden>
                <label>
                    <span>Municipios del departamento</span>
                    <select class="capital-municipio-select" multiple size="7" ${municipiosDepartamento.length ? "" : "disabled"} aria-label="Selecciona uno o varios municipios">
                        ${opciones || '<option value="">No hay municipios asociados</option>'}
                    </select>
                </label>
                <p class="capital-picker-help">En computador usa Ctrl/Cmd para seleccionar varios.</p>
                <div class="capital-selected-list" aria-live="polite">
                    <span class="capital-selected-empty">Aún no has seleccionado municipios.</span>
                </div>
            </div>
        </div>
    `;
}

document.addEventListener("click", function (event) {
    const toggle = event.target.closest?.(".capital-municipios-toggle");
    if (toggle) {
        const menu = toggle.nextElementSibling;
        const isExpanded = toggle.getAttribute("aria-expanded") === "true";
        toggle.setAttribute("aria-expanded", String(!isExpanded));
        menu.hidden = isExpanded;
        return;
    }

    const fichaButton = event.target.closest?.(".capital-selected-municipio");
    if (fichaButton) {
        const municipio = municipiosCatalogo.find(function (item) {
            return String(item.codigo) === fichaButton.dataset.codigo;
        });
        if (!municipio) return;
        map.closePopup();
        abrirFichaMunicipal({
            ...municipio,
            departamento: obtenerDepartamento(municipio.codigo)
        });
    }
});

document.addEventListener("change", function (event) {
    const select = event.target.closest?.(".capital-municipio-select");
    if (!select) return;

    const popup = select.closest(".capital-municipality-picker");
    const list = popup?.querySelector(".capital-selected-list");
    if (!list) return;

    list.replaceChildren();
    const selectedCodes = Array.from(select.selectedOptions).map(function (option) {
        return option.value;
    }).filter(Boolean);

    if (!selectedCodes.length) {
        const empty = document.createElement("span");
        empty.className = "capital-selected-empty";
        empty.textContent = "Aún no has seleccionado municipios.";
        list.append(empty);
        return;
    }

    const heading = document.createElement("strong");
    heading.className = "capital-selected-count";
    heading.textContent = `Seleccionados: ${selectedCodes.length}`;
    list.append(heading);

    selectedCodes.forEach(function (codigo) {
        const municipio = municipiosCatalogo.find(function (item) {
            return String(item.codigo) === codigo;
        });
        if (!municipio) return;

        const button = document.createElement("button");
        button.type = "button";
        button.className = "capital-selected-municipio";
        button.dataset.codigo = String(municipio.codigo);
        button.textContent = `Abrir ficha: ${municipio.nombre}`;
        list.append(button);
    });
});

fetch(
    "https://mini-visor-sig.onrender.com/capitales-departamentales"
)

    .then(
        function (response) {

            if (!response.ok) {

                throw new Error(
                    "No se pudieron cargar las capitales departamentales."
                );
            }

            return response.json();
        }
    )

    .then(
        function (data) {

            console.log(
                "Capitales cargadas:",
                data
            );


            const capitalesLayer = L.geoJSON(data, {
                pointToLayer: function (feature, latlng) {
                    return L.circleMarker(latlng, {
                        radius: 7,
                        color: "#ffffff",
                        weight: 2,
                        fillColor: "#d45b36",
                        fillOpacity: 1
                    });
                },
                onEachFeature: function (feature, layer) {
                    const capital = feature.properties || {};
                    layer.bindTooltip(capital.nombre || "Capital departamental");
                    layer.on("click", async function () {
                        try {
                            const municipios = await municipiosCatalogoPromise;
                            L.popup()
                                .setLatLng(layer.getLatLng())
                                .setContent(construirPopupCapital(capital, municipios))
                                .openOn(map);
                        } catch (error) {
                            console.error("No se pudo abrir el selector de municipios:", error);
                        }
                    });
                }
            });


            capitalesLayer.addTo(
                map
            );


            const tarjetas =
                document.querySelectorAll(
                    ".layer-card"
                );


            let tarjetaCapitales =
                null;


            tarjetas.forEach(
                function (
                    tarjeta
                ) {

                    const titulo =
                        tarjeta.querySelector(
                            ".layer-title strong"
                        );


                    if (
                        titulo &&
                        titulo.textContent.trim() ===
                            "Capitales Departamentales"
                    ) {

                        tarjetaCapitales =
                            tarjeta;
                    }
                }
            );


            if (
                tarjetaCapitales
            ) {

                configurarTarjeta(
                    tarjetaCapitales,
                    "Capitales Departamentales",
                    capitalesLayer,
                    data,
                    "EPSG:4326"
                );


                const epsg =
                    tarjetaCapitales.querySelector(
                        ".epsg"
                    );


                if (epsg) {

                    epsg.textContent =
                        "EPSG:4326";
                }


                const entityCount =
                    tarjetaCapitales.querySelector(
                        ".entity-count"
                    );


                if (entityCount) {

                    entityCount.textContent =
                        `· ${
                            data.features.length
                        } entidades`;
                }
            }


            console.log(
                `✓ Capitales Departamentales cargadas: ${
                    data.features.length
                }`
            );
        }
    )

    .catch(
        function (error) {

            console.error(
                "Error cargando capitales:",
                error
            );
        }
    );


// ============================================================
// VENTANA DE REPROYECCIÓN
// ============================================================

function abrirVentanaReproyeccion(
    nombre,
    crsActual,
    layerCard
) {

    const anterior =
        document.getElementById(
            "reprojectModal"
        );


    if (anterior) {
        anterior.remove();
    }


    const modal =
        document.createElement(
            "div"
        );


    modal.id =
        "reprojectModal";


    Object.assign(
        modal.style,
        {

            position:
                "fixed",

            inset:
                "0",

            width:
                "100vw",

            height:
                "100vh",

            background:
                "rgba(0,0,0,0.45)",

            display:
                "flex",

            alignItems:
                "center",

            justifyContent:
                "center",

            zIndex:
                "999999"
        }
    );


    const ventana =
        document.createElement(
            "div"
        );


    Object.assign(
        ventana.style,
        {

            width:
                "430px",

            maxWidth:
                "90%",

            background:
                "#ffffff",

            borderRadius:
                "14px",

            boxShadow:
                "0 20px 60px rgba(0,0,0,0.30)",

            overflow:
                "hidden",

            fontFamily:
                "Arial, sans-serif"
        }
    );


    ventana.innerHTML = `

        <div style="
            padding:20px 22px;
            border-bottom:1px solid #e5e7eb;
            display:flex;
            align-items:center;
            justify-content:space-between;
        ">

            <h2 style="
                margin:0;
                font-size:20px;
            ">
                Reproyectar capa
            </h2>


            <button
                id="cerrarReproyeccion"
                type="button"
                style="
                    border:none;
                    background:transparent;
                    font-size:28px;
                    cursor:pointer;
                "
            >
                ×
            </button>

        </div>


        <div style="
            padding:22px;
        ">

            <p>
                <strong>Capa:</strong>
                ${nombre}
            </p>


            <p>
                <strong>CRS actual:</strong>
                ${crsActual}
            </p>


            <label
                for="selectCrsDestino"
                style="
                    display:block;
                    margin:15px 0 8px;
                    font-weight:600;
                "
            >
                Reproyectar a
            </label>


            <select
                id="selectCrsDestino"
                style="
                    width:100%;
                    box-sizing:border-box;
                    padding:11px;
                    border:1px solid #d1d5db;
                    border-radius:8px;
                "
            >

                <option value="">
                    Seleccione un CRS
                </option>


                <option value="EPSG:4326">
                    EPSG:4326 — WGS 84
                </option>


                <option value="EPSG:3857">
                    EPSG:3857 — Web Mercator
                </option>


                <option value="EPSG:3116">
                    EPSG:3116 — MAGNA-SIRGAS
                </option>


                <option value="EPSG:9377">
                    EPSG:9377 — MAGNA-SIRGAS
                </option>

            </select>


            <div style="
                margin-top:18px;
                padding:12px;
                background:#f1f5f9;
                border-radius:8px;
                font-size:13px;
                line-height:1.5;
            ">

                <strong>
                    Reproyección real
                </strong>

                <br>

                Las coordenadas serán transformadas
                mediante Python + PyProj.

            </div>

        </div>


        <div style="
            padding:16px 22px;
            border-top:1px solid #e5e7eb;
            display:flex;
            justify-content:flex-end;
            gap:10px;
        ">

            <button
                id="cancelarReproyeccion"
                type="button"
                style="
                    padding:10px 16px;
                    border:none;
                    border-radius:8px;
                    cursor:pointer;
                "
            >
                Cancelar
            </button>


            <button
                id="confirmarReproyeccion"
                type="button"
                style="
                    padding:10px 16px;
                    border:none;
                    border-radius:8px;
                    background:#087f72;
                    color:white;
                    cursor:pointer;
                    font-weight:600;
                "
            >
                Reproyectar
            </button>

        </div>
    `;


    modal.appendChild(
        ventana
    );


    document.body.appendChild(
        modal
    );


    document
        .getElementById(
            "cerrarReproyeccion"
        )
        .addEventListener(
            "click",
            function () {
                modal.remove();
            }
        );


    document
        .getElementById(
            "cancelarReproyeccion"
        )
        .addEventListener(
            "click",
            function () {
                modal.remove();
            }
        );


    document
        .getElementById(
            "confirmarReproyeccion"
        )
        .addEventListener(
            "click",
            async function () {

                const destino =
                    document
                        .getElementById(
                            "selectCrsDestino"
                        )
                        .value;


                if (!destino) {

                    mostrarNotificacion(
                        "warning",
                        "Selecciona un sistema de referencia",
                        "Debes elegir un EPSG de destino antes de continuar."
                    );

                    return;
                }


                if (
                    destino ===
                    crsActual
                ) {

                    mostrarNotificacion(
                        "warning",
                        "El sistema de referencia no cambió",
                        `Seleccionaste ${destino}, que ya es el CRS actual de la capa.`
                    );

                    return;
                }


                const geojson =
                    layerCard.geojson;


                if (!geojson) {

                    mostrarNotificacion(
                        "error",
                        "No se encontró la geometría",
                        "No hay GeoJSON disponible para reproyectar esta capa."
                    );

                    return;
                }


                const boton =
                    document
                        .getElementById(
                            "confirmarReproyeccion"
                        );


                boton.disabled =
                    true;


                boton.textContent =
                    "Procesando...";


                try {

                    const response =
                        await fetch(
                            "https://mini-visor-sig.onrender.com/reproject",
                            {

                                method:
                                    "POST",

                                headers:
                                    {
                                        "Content-Type":
                                            "application/json"
                                    },

                                body:
                                    JSON.stringify(
                                        {
                                            source_crs:
                                                crsActual,

                                            target_crs:
                                                destino,

                                            geojson:
                                                geojson
                                        }
                                    )
                            }
                        );


                    const resultado =
                        await response.json().catch(
                            function () {
                                return null;
                            }
                        );


                    if (!response.ok) {

                        throw new Error(
                            resultado &&
                                resultado.detail ||
                            `El backend respondió con estado ${response.status}.`
                        );
                    }

                    if (!resultado) {
                        throw new Error(
                            "El backend devolvió una respuesta vacía o inválida."
                        );
                    }


                    const geojsonReproyectado =
                        resultado.geojson;


                    const geojsonVisualizacion =
                        resultado.display_geojson;


                    if (
                        !geojsonVisualizacion ||
                        !Array.isArray(geojsonReproyectado.features)
                    ) {

                        throw new Error(
                            "El backend no devolvió la capa reproyectada en un formato válido."
                        );
                    }

                    const crsDestino =
                        resultado.target_crs ||
                        destino;
                    const cantidadProcesada =
                        resultado.feature_count ??
                        geojsonReproyectado.features.length;


                    if (
                        geojsonVisualizacion.features &&
                        geojsonReproyectado.features
                    ) {

                        geojsonVisualizacion
                            .features
                            .forEach(
                                function (
                                    featureVisual,
                                    index
                                ) {

                                    const featureReal =
                                        geojsonReproyectado
                                            .features[index];


                                    const featureOriginal =
                                        geojson
                                            .features[index];


                                    if (
                                        featureReal &&
                                        featureReal.geometry
                                    ) {

                                        featureVisual
                                            ._coordenadasReproyectadas =
                                            obtenerPrimerPunto(
                                                featureReal.geometry
                                            );


                                        if (
                                            featureOriginal &&
                                            featureOriginal.geometry
                                        ) {

                                            featureVisual
                                                ._coordenadasOriginales =
                                                obtenerPrimerPunto(
                                                    featureOriginal.geometry
                                                );
                                        }
                                    }
                                }
                            );
                    }


                    const nuevaCapa =
                        crearCapaGeoJSON(
                            geojsonVisualizacion,
                            {

                                reproyectada:
                                    true,

                                crs:
                                    crsDestino,

                                sourceCrs:
                                    crsActual
                            }
                        );


                    nuevaCapa.addTo(
                        map
                    );

                    if (
                        layerCard.leafletLayer &&
                        map.hasLayer(layerCard.leafletLayer)
                    ) {
                        map.removeLayer(layerCard.leafletLayer);
                    }


                    layerCard.leafletLayer =
                        nuevaCapa;


                    layerCard.geojson =
                        geojsonReproyectado;


                    layerCard.displayGeojson =
                        geojsonVisualizacion;


                    const epsg =
                        layerCard.querySelector(
                            ".epsg"
                        );


                    if (epsg) {

                        epsg.textContent =
                            crsDestino;
                    }


                    layerCard.dataset.layerCrs =
                        crsDestino;


                    let entityCount =
                        layerCard.querySelector(
                            ".entity-count"
                        );

                    if (!entityCount) {
                        entityCount =
                            document.createElement("div");
                        entityCount.className =
                            "entity-count";
                        layerCard.appendChild(entityCount);
                    }

                    entityCount.textContent =
                        `· ${cantidadProcesada} ${
                            cantidadProcesada === 1
                                ? "entidad procesada"
                                : "entidades procesadas"
                        }`;

                    agregarBotonDescargaReproyeccion(
                        layerCard
                    );


                    try {

                        const bounds =
                            nuevaCapa.getBounds();


                        if (
                            bounds.isValid()
                        ) {

                            map.fitBounds(
                                bounds,
                                {
                                    padding:
                                        [
                                            30,
                                            30
                                        ]
                                }
                            );
                        }

                    }
                    catch (error) {

                        console.log(
                            "No fue posible ajustar el zoom."
                        );
                    }


                    modal.remove();


                    mostrarNotificacion(
                        "success",
                        "Capa reproyectada correctamente",
                        `${nombre} · ${crsActual} → ${crsDestino}`,
                        `Las coordenadas se transformaron al sistema de referencia de destino. ${cantidadProcesada} entidades procesadas; el resultado está disponible para descarga.`
                    );

                }

                catch (error) {

                    console.error(
                        "Error durante la reproyección:",
                        error
                    );


                    mostrarNotificacion(
                        "error",
                        "No se pudo reproyectar la capa",
                        `${nombre} · ${crsActual} → ${destino}`,
                        `${error.message || "Ocurrió un error inesperado."} Se conserva la capa original.`
                    );

                }

                finally {

                    boton.disabled =
                        false;

                    boton.textContent =
                        "Reproyectar";
                }
            }
        );
}


// ============================================================
// OBTENER PRIMER PUNTO
// ============================================================

function obtenerPrimerPunto(
    geometria
) {

    if (!geometria) {
        return null;
    }


    const tipo =
        geometria.type;


    const coordenadas =
        geometria.coordinates;


    if (
        tipo === "Point"
    ) {

        return coordenadas;
    }


    if (
        tipo === "LineString"
    ) {

        return coordenadas[0];
    }


    if (
        tipo === "Polygon"
    ) {

        return coordenadas[0][0];
    }


    if (
        tipo === "MultiPoint"
    ) {

        return coordenadas[0];
    }


    if (
        tipo === "MultiLineString"
    ) {

        return coordenadas[0][0];
    }


    if (
        tipo === "MultiPolygon"
    ) {

        return coordenadas[0][0][0];
    }


    return null;
}


// ============================================================
// CARGAR CAPAS: GEOJSON, KML, KMZ, SHP (.zip)
// ============================================================

const uploadButton =
    document.getElementById(
        "uploadButton"
    );


const layerInput =
    document.getElementById(
        "layerInput"
    );


if (
    uploadButton &&
    layerInput
) {

    uploadButton.addEventListener(
        "click",
        function () {

            layerInput.click();
        }
    );


    layerInput.addEventListener(
        "change",
        async function (event) {

            const file =
                event.target.files[0];


            if (!file) {
                return;
            }


            const extension =
                file.name
                    .split(".")
                    .pop()
                    .toLowerCase();


            const extensionesValidas =
                [
                    "geojson",
                    "json",
                    "kml",
                    "kmz",
                    "zip",
                    "shp"
                ];


            if (
                !extensionesValidas.includes(
                    extension
                )
            ) {

                alert(
                    "Formatos permitidos: GeoJSON, KML, KMZ, SHP (dentro de un .zip)."
                );


                layerInput.value =
                    "";

                return;
            }


            try {

                const geojson =
                    await convertirArchivoAGeoJSON(
                        file,
                        extension
                    );


                if (
                    !geojson ||
                    !geojson.features ||
                    !Array.isArray(
                        geojson.features
                    )
                ) {

                    throw new Error(
                        "El archivo no contiene elementos geográficos válidos."
                    );
                }


                let crs =
                    "EPSG:4326";


                if (
                    geojson.crs &&
                    geojson.crs.properties &&
                    geojson.crs.properties.name
                ) {

                    crs =
                        geojson.crs.properties.name;
                }


                // GeoJSON para Leaflet debe estar en coordenadas geográficas
                // (EPSG:4326). Si el archivo viene proyectado, lo transformamos
                // para visualizarlo, pero conservamos el GeoJSON original para
                // que la tarjeta y las descargas mantengan su CRS real.
                let geojsonVisualizacion = geojson;
                const crsNormalizado = String(crs || "EPSG:4326").trim();
                const matchEpsg = crsNormalizado.match(/(?:EPSG(?::|::|\/)|EPSG::|::)(\d+)$/i);
                const crsOrigen = matchEpsg ? `EPSG:${matchEpsg[1]}` : crsNormalizado;

                if (crsOrigen.toUpperCase() !== "EPSG:4326" && crsOrigen.toUpperCase() !== "OGC:CRS84") {
                    mostrarNotificacion(
                        "info",
                        "Preparando capa para el mapa",
                        `${file.name} · ${crsOrigen} → EPSG:4326`,
                        "Las coordenadas se transformarán para que Leaflet pueda ubicar la capa correctamente.",
                        5000
                    );

                    const reproyeccionResponse = await fetch(
                        "https://mini-visor-sig.onrender.com/reproject",
                        {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                source_crs: crsOrigen,
                                target_crs: "EPSG:4326",
                                geojson: geojson
                            })
                        }
                    );
                    const reproyeccionResultado = await reproyeccionResponse.json().catch(() => null);

                    if (!reproyeccionResponse.ok) {
                        throw new Error(
                            reproyeccionResultado?.detail ||
                            `No se pudo transformar ${crsOrigen} a EPSG:4326 para mostrar la capa.`
                        );
                    }
                    if (!reproyeccionResultado?.display_geojson?.features) {
                        throw new Error("El backend no devolvió una geometría válida para mostrar en el mapa.");
                    }
                    geojsonVisualizacion = reproyeccionResultado.display_geojson;
                }

                const nuevaCapa = crearCapaGeoJSON(geojsonVisualizacion);
                nuevaCapa.addTo(map);

                let seAjustoVista = false;
                try {
                    const bounds = nuevaCapa.getBounds();
                    if (bounds.isValid()) {
                        map.fitBounds(bounds, { padding: [30, 30], maxZoom: 14 });
                        seAjustoVista = true;
                    }
                } catch (error) {
                    console.warn("No fue posible ajustar el zoom a la capa:", error);
                }

                const cantidad = geojson.features.length;
                const tarjetaNueva = agregarCapaAlPanel(
                    file.name,
                    nuevaCapa,
                    cantidad,
                    crsOrigen,
                    geojson
                );
                if (tarjetaNueva) {
                    tarjetaNueva.displayGeojson = geojsonVisualizacion;
                    tarjetaNueva.leafletLayer = nuevaCapa;
                }

                mostrarNotificacion(
                    "success",
                    "Capa cargada correctamente",
                    `${file.name} · ${crsOrigen}`,
                    seAjustoVista
                        ? `${cantidad} entidades cargadas. La vista se ajustó a la extensión de la capa.`
                        : `${cantidad} entidades cargadas, pero no se encontró una extensión geográfica válida.`,
                    6500
                );

            }

            catch (error) {

                console.error(
                    "Error procesando el archivo:",
                    error
                );


                alert(
                    `No fue posible cargar el archivo.\n\n${error.message}`
                );

            }

            finally {

                layerInput.value =
                    "";
            }
        }
    );
}


// ============================================================
// CONVERSOR UNIVERSAL A GEOJSON
// ============================================================

async function convertirArchivoAGeoJSON(
    file,
    extension
) {

    // ---------------- GEOJSON / JSON ----------------

    if (
        extension === "geojson" ||
        extension === "json"
    ) {

        const texto =
            await file.text();


        return JSON.parse(
            texto
        );
    }


    // ---------------- KML ----------------

    if (
        extension === "kml"
    ) {

        const texto =
            await file.text();


        const parser =
            new DOMParser();


        const kmlDom =
            parser.parseFromString(
                texto,
                "text/xml"
            );


        return toGeoJSON.kml(
            kmlDom
        );
    }


    // ---------------- KMZ (zip que contiene un .kml) ----------------

    if (
        extension === "kmz"
    ) {

        const arrayBuffer =
            await file.arrayBuffer();


        const zip =
            await JSZip.loadAsync(
                arrayBuffer
            );


        const archivoKml =
            Object.keys(
                zip.files
            ).find(
                function (nombre) {

                    return nombre
                        .toLowerCase()
                        .endsWith(
                            ".kml"
                        );
                }
            );


        if (!archivoKml) {

            throw new Error(
                "El archivo KMZ no contiene ningún .kml."
            );
        }


        const textoKml =
            await zip.files[
                archivoKml
            ].async(
                "text"
            );


        const parser =
            new DOMParser();


        const kmlDom =
            parser.parseFromString(
                textoKml,
                "text/xml"
            );


        return toGeoJSON.kml(
            kmlDom
        );
    }


    // ---------------- SHAPEFILE (.zip con .shp/.dbf/.prj o .shp suelto) ----------------

    if (
        extension === "zip" ||
        extension === "shp"
    ) {

        const arrayBuffer =
            await file.arrayBuffer();


        // shpjs detecta automáticamente si es un zip completo
        // o solo un .shp (en cuyo caso no tendrá atributos, solo geometría)

        const resultado =
            await shp(
                arrayBuffer
            );


        // shpjs puede devolver un FeatureCollection único
        // o un arreglo si el zip trae varias capas

        if (
            Array.isArray(
                resultado
            )
        ) {

            const features =
                resultado.flatMap(
                    function (capa) {

                        return capa.features;
                    }
                );


            return {
                type:
                    "FeatureCollection",

                features:
                    features
            };
        }


        return resultado;
    }


    throw new Error(
        "Formato no soportado."
    );
}


// ============================================================
// RÍO MAGDALENA
// ============================================================

const rioMagdalenaUrl =
    "https://services1.arcgis.com/Ezk9fcjSUkeadg6u/ArcGIS/rest/services/Mapa_Campo_1_Gual%C3%AD_WFL1/FeatureServer/41/query" +
    "?where=1%3D1" +
    "&outFields=*" +
    "&returnGeometry=true" +
    "&outSR=4326" +
    "&f=geojson";


fetch(
    rioMagdalenaUrl
)

    .then(
        function (response) {

            if (!response.ok) {

                throw new Error(
                    "No se pudo cargar el Río Magdalena."
                );
            }


            return response.json();
        }
    )

    .then(
        function (data) {

            console.log(
                "Río Magdalena cargado:",
                data
            );


            const rioLayer =
                crearCapaGeoJSON(
                    data,
                    {
                        color:
                            "#2563eb",

                        weight:
                            3,

                        fillOpacity:
                            0.35
                    }
                );


            rioLayer.addTo(
                map
            );


            // ----------------------------------------
            // BUSCAR LA TARJETA EXISTENTE
            // ----------------------------------------

            const tarjetas =
                document.querySelectorAll(
                    ".layer-card"
                );


            let tarjetaRio =
                null;


            tarjetas.forEach(
                function (
                    tarjeta
                ) {

                    const titulo =
                        tarjeta.querySelector(
                            ".layer-title strong"
                        );


                    if (
                        titulo &&
                        titulo.textContent.trim() ===
                            "Río Magdalena"
                    ) {

                        tarjetaRio =
                            tarjeta;
                    }
                }
            );


            // ----------------------------------------
            // CONFIGURAR TARJETA
            // ----------------------------------------

            if (
                tarjetaRio
            ) {

                configurarTarjeta(
                    tarjetaRio,
                    "Río Magdalena",
                    rioLayer,
                    data,
                    "EPSG:4326"
                );


                tarjetaRio.classList.remove(
                    "disabled"
                );


                const visibility =
                    tarjetaRio.querySelector(
                        ".visibility"
                    );


                if (visibility) {

                    visibility.textContent =
                        "●";

                    visibility.classList.add(
                        "active"
                    );
                }


                const epsg =
                    tarjetaRio.querySelector(
                        ".epsg"
                    );


                if (epsg) {

                    epsg.textContent =
                        "EPSG:4326";
                }


                const info =
                    tarjetaRio.querySelector(
                        ".layer-info"
                    );


                if (info) {

                    const spans =
                        info.querySelectorAll(
                            "span"
                        );


                    if (
                        spans.length > 1
                    ) {

                        spans[1].textContent =
                            "MAGNA-SIRGAS · 1 entidad";
                    }
                }


                const entityCount =
                    tarjetaRio.querySelector(
                        ".entity-count"
                    );


                if (entityCount) {

                    entityCount.textContent =
                        "· 1 entidad";
                }
            }


            console.log(
                "✓ Río Magdalena visible."
            );
        }
    )

    .catch(
        function (error) {

            console.error(
                "Error cargando Río Magdalena:",
                error
            );
        }
    );


// ============================================================
// CAPTURA DE COORDENADAS
// ============================================================

const coordenadasCapturadas =
    [];


let modoCapturaCoordenadas =
    false;


const botonesHerramientas =
    document.querySelectorAll(
        ".tool-button"
    );


let botonCapturarCoordenadas =
    null;


let botonDesplazar =
    null;


botonesHerramientas.forEach(
    function (boton) {

        const texto =
            boton.textContent.trim();


        if (
            texto.includes(
                "Capturar Coordenadas"
            )
        ) {

            botonCapturarCoordenadas =
                boton;
        }


        if (
            texto.includes(
                "Desplazar"
            )
        ) {

            botonDesplazar =
                boton;
        }
    }
);


// ============================================================
// ACTIVAR CAPTURA
// ============================================================

function activarCapturaCoordenadas() {

    modoCapturaCoordenadas =
        true;


    map.getContainer().style.cursor =
        "crosshair";


    if (
        botonCapturarCoordenadas
    ) {

        botonCapturarCoordenadas.classList.add(
            "active"
        );


        botonCapturarCoordenadas.style.background =
            "#087f72";


        botonCapturarCoordenadas.style.color =
            "#ffffff";
    }


    if (
        botonDesplazar
    ) {

        botonDesplazar.classList.remove(
            "active"
        );
    }


    console.log(
        "📍 Captura de coordenadas ACTIVADA"
    );
}


// ============================================================
// DESACTIVAR CAPTURA
// ============================================================

function desactivarCapturaCoordenadas() {

    modoCapturaCoordenadas =
        false;


    map.getContainer().style.cursor =
        "";


    if (
        botonCapturarCoordenadas
    ) {

        botonCapturarCoordenadas.classList.remove(
            "active"
        );


        botonCapturarCoordenadas.style.background =
            "";


        botonCapturarCoordenadas.style.color =
            "";
    }


    if (
        botonDesplazar
    ) {

        botonDesplazar.classList.add(
            "active"
        );
    }


    console.log(
        "📍 Captura de coordenadas DESACTIVADA"
    );
}


// ============================================================
// BOTÓN CAPTURAR
// ============================================================

if (
    botonCapturarCoordenadas
) {

    botonCapturarCoordenadas.addEventListener(
        "click",
        function (event) {

            event.preventDefault();

            event.stopPropagation();


            if (
                modoCapturaCoordenadas
            ) {

                desactivarCapturaCoordenadas();

            }

            else {

                activarCapturaCoordenadas();
            }
        }
    );
}


// ============================================================
// BOTÓN DESPLAZAR
// ============================================================

if (
    botonDesplazar
) {

    botonDesplazar.addEventListener(
        "click",
        function (event) {

            event.preventDefault();

            event.stopPropagation();


            desactivarCapturaCoordenadas();
        }
    );
}

/* =========================================================
   BOTONES VISIBLES DEL MAPA
   ========================================================= */

const mapExploreButton =
    document.getElementById("mapExploreButton");

const mapCaptureButton =
    document.getElementById("mapCaptureButton");

if (mapExploreButton && botonDesplazar) {
    mapExploreButton.addEventListener("click", function () {
        botonDesplazar.click();

        mapExploreButton.classList.add("active");
        mapCaptureButton?.classList.remove("active");
    });
}

if (mapCaptureButton && botonCapturarCoordenadas) {
    mapCaptureButton.addEventListener("click", function () {
        botonCapturarCoordenadas.click();

        mapCaptureButton.classList.toggle(
            "active",
            modoCapturaCoordenadas
        );

        mapExploreButton?.classList.toggle(
            "active",
            !modoCapturaCoordenadas
        );
    });
}


// ============================================================
// CLICK PARA CAPTURAR COORDENADA
// ============================================================

map.on(
    "click",
    function (event) {

        if (
            !modoCapturaCoordenadas
        ) {

            return;
        }


        const longitud =
            event.latlng.lng;


        const latitud =
            event.latlng.lat;


        const numero =
            coordenadasCapturadas.length +
            1;


        const marcador =
            L.marker(
                event.latlng
            ).addTo(
                map
            );


        marcador.bindPopup(`

            <div style="
                min-width:260px;
                font-family:Arial,sans-serif;
            ">

                <h3 style="
                    margin-top:0;
                    color:#087f72;
                ">
                    📍 Coordenada ${numero}
                </h3>


                <p>
                    <strong>
                        Coordenadas originales
                    </strong>
                </p>


                <p>

                    <strong>CRS:</strong>
                    EPSG:4326

                    <br>

                    <strong>X / Longitud:</strong>
                    ${longitud.toFixed(6)}

                    <br>

                    <strong>Y / Latitud:</strong>
                    ${latitud.toFixed(6)}

                </p>


                <button
                    class="boton-reproyectar-coordenada"
                    type="button"
                    style="
                        width:100%;
                        margin-top:10px;
                        padding:9px;
                        border:none;
                        border-radius:7px;
                        background:#087f72;
                        color:white;
                        cursor:pointer;
                        font-weight:600;
                    "
                >
                    ↗ Reproyectar coordenada
                </button>

            </div>
        `);


        coordenadasCapturadas.push(
            {
                numero:
                    numero,

                x:
                    longitud,

                y:
                    latitud,

                crs:
                    "EPSG:4326",

                marcador:
                    marcador
            }
        );


        marcador.on(
            "popupopen",
            function () {

                const popupElement =
                    marcador
                        .getPopup()
                        .getElement();


                if (
                    !popupElement
                ) {

                    return;
                }


                const botonReproyectar =
                    popupElement.querySelector(
                        ".boton-reproyectar-coordenada"
                    );


                if (
                    !botonReproyectar
                ) {

                    return;
                }


                botonReproyectar.addEventListener(
                    "click",
                    async function () {

                        const destino =
                            prompt(
                                "Ingrese el CRS de destino:",
                                "EPSG:3116"
                            );


                        if (
                            !destino
                        ) {

                            return;
                        }


                        const crsDestino =
                            destino
                                .trim()
                                .toUpperCase();


                        try {

                            botonReproyectar.disabled =
                                true;


                            botonReproyectar.textContent =
                                "Reproyectando...";


                            const response =
                                await fetch(
                                    "https://mini-visor-sig.onrender.com/reproject",
                                    {

                                        method:
                                            "POST",

                                        headers:
                                            {
                                                "Content-Type":
                                                    "application/json"
                                            },

                                        body:
                                            JSON.stringify(
                                                {

                                                    source_crs:
                                                        "EPSG:4326",

                                                    target_crs:
                                                        crsDestino,

                                                    geojson:
                                                        {
                                                            type:
                                                                "FeatureCollection",

                                                            features:
                                                                [
                                                                    {

                                                                        type:
                                                                            "Feature",

                                                                        properties:
                                                                            {},

                                                                        geometry:
                                                                            {
                                                                                type:
                                                                                    "Point",

                                                                                coordinates:
                                                                                    [
                                                                                        longitud,
                                                                                        latitud
                                                                                    ]
                                                                            }
                                                                    }
                                                                ]
                                                        }
                                                }
                                            )
                                    }
                                );


                            const resultado =
                                await response.json();


                            if (
                                !response.ok
                            ) {

                                throw new Error(
                                    resultado.detail ||
                                    "Error en la reproyección."
                                );
                            }


                            if (
                                !resultado.geojson ||
                                !resultado.geojson.features ||
                                !resultado.geojson.features[0]
                            ) {

                                throw new Error(
                                    "El backend no devolvió una coordenada reproyectada válida."
                                );
                            }


                            const geometria =
                                resultado
                                    .geojson
                                    .features[0]
                                    .geometry;


                            const resultadoX =
                                geometria.coordinates[0];


                            const resultadoY =
                                geometria.coordinates[1];


                            marcador.bindPopup(`

                                <div style="
                                    min-width:280px;
                                    font-family:Arial,sans-serif;
                                ">

                                    <h3 style="
                                        margin-top:0;
                                        color:#087f72;
                                    ">
                                        📍 Coordenada ${numero}
                                    </h3>


                                    <div style="
                                        padding:10px;
                                        background:#f8fafc;
                                        border-radius:8px;
                                    ">

                                        <strong>
                                            Coordenadas originales
                                        </strong>

                                        <br><br>

                                        CRS:
                                        EPSG:4326

                                        <br>

                                        X:
                                        ${longitud.toFixed(6)}

                                        <br>

                                        Y:
                                        ${latitud.toFixed(6)}

                                    </div>


                                    <hr>


                                    <div style="
                                        padding:10px;
                                        background:#ecfdf5;
                                        border-radius:8px;
                                        border:1px solid #a7f3d0;
                                    ">

                                        <strong>
                                            ✓ Reproyección realizada correctamente
                                        </strong>

                                    </div>


                                    <p>

                                        <strong>
                                            CRS destino:
                                        </strong>

                                        ${crsDestino}

                                    </p>


                                    <p>

                                        <strong>
                                            X:
                                        </strong>

                                        ${Number(
                                            resultadoX
                                        ).toFixed(3)}

                                        <br>

                                        <strong>
                                            Y:
                                        </strong>

                                        ${Number(
                                            resultadoY
                                        ).toFixed(3)}

                                    </p>


                                    <p style="
                                        font-size:12px;
                                        color:#6b7280;
                                    ">

                                        Transformación realizada
                                        mediante Python + PyProj.

                                    </p>

                                </div>
                            `);


                            marcador.openPopup();


                            botonReproyectar.textContent =
                                "✓ Reproyectada correctamente";


                            console.log(
                                "✓ Coordenada reproyectada:",
                                {
                                    origen:
                                        "EPSG:4326",

                                    destino:
                                        crsDestino,

                                    x_original:
                                        longitud,

                                    y_original:
                                        latitud,

                                    x_reproyectado:
                                        resultadoX,

                                    y_reproyectado:
                                        resultadoY
                                }
                            );

                        }

                        catch (error) {

                            console.error(
                                "Error reproyectando coordenada:",
                                error
                            );


                            alert(
                                `No fue posible reproyectar la coordenada.\n\n${error.message}`
                            );


                            botonReproyectar.disabled =
                                false;


                            botonReproyectar.textContent =
                                "↗ Reproyectar coordenada";
                        }
                    }
                );
            }
        );


        marcador.openPopup();


        document
            .querySelectorAll(
                ".info-badge"
            )
            .forEach(
                function (elemento) {

                    if (
                        elemento.textContent.includes(
                            "Coordenadas"
                        )
                    ) {

                        elemento.textContent =
                            `◎ Coordenadas (${coordenadasCapturadas.length})`;
                    }
                }
            );


        mostrarCoordenadasCapturadas();
    }
);


// ============================================================
// PANEL DE COORDENADAS CAPTURADAS
// ============================================================

function mostrarCoordenadasCapturadas() {

    const anterior =
        document.getElementById(
            "coordenadasCapturadasPanel"
        );


    if (anterior) {

        anterior.remove();
    }


    if (
        coordenadasCapturadas.length ===
        0
    ) {

        return;
    }


    const panel =
        document.createElement(
            "div"
        );


    panel.id =
        "coordenadasCapturadasPanel";


    panel.style.cssText = `

        position:absolute;

        top:20px;

        right:20px;

        width:300px;

        max-height:430px;

        overflow-y:auto;

        background:white;

        border-radius:12px;

        box-shadow:
            0 8px 30px rgba(0,0,0,.25);

        z-index:1000;

        padding:15px;

        font-family:Arial,sans-serif;

    `;


    let contenido = `

        <div style="
            display:flex;
            align-items:center;
            justify-content:space-between;
        ">

            <strong>
                📍 Coordenadas capturadas
            </strong>


            <button
                id="cerrarPanelCoordenadas"
                type="button"
                style="
                    border:none;
                    background:transparent;
                    font-size:22px;
                    cursor:pointer;
                "
            >
                ×
            </button>

        </div>


        <hr>
    `;


    coordenadasCapturadas.forEach(
        function (
            item,
            index
        ) {

            contenido += `

                <div style="
                    padding:12px;
                    margin-bottom:10px;
                    background:#f8fafc;
                    border:1px solid #e5e7eb;
                    border-radius:8px;
                ">

                    <strong>
                        📍 Punto ${index + 1}
                    </strong>


                    <div style="
                        margin-top:8px;
                        font-size:13px;
                    ">

                        <strong>
                            X:
                        </strong>

                        ${item.x.toFixed(6)}

                        <br>

                        <strong>
                            Y:
                        </strong>

                        ${item.y.toFixed(6)}

                        <br>

                        <strong>
                            CRS:
                        </strong>

                        ${item.crs}

                    </div>


                    <button
                        class="eliminarCoordenada"
                        data-index="${index}"
                        type="button"
                        style="
                            margin-top:10px;
                            border:none;
                            background:#fee2e2;
                            color:#991b1b;
                            padding:6px 10px;
                            border-radius:6px;
                            cursor:pointer;
                        "
                    >
                        Eliminar
                    </button>

                </div>
            `;
        }
    );


    contenido += `

        <button
            id="limpiarCoordenadas"
            type="button"
            style="
                width:100%;
                padding:10px;
                border:none;
                border-radius:7px;
                background:#ef4444;
                color:white;
                cursor:pointer;
                font-weight:600;
            "
        >
            🗑 Limpiar todas
        </button>
    `;


    panel.innerHTML =
        contenido;


    const mapContainer =
        document.querySelector(
            ".map-container"
        );


    if (mapContainer) {

        mapContainer.appendChild(
            panel
        );

    }

    else {

        document.body.appendChild(
            panel
        );
    }


    const cerrarPanel =
        document.getElementById(
            "cerrarPanelCoordenadas"
        );


    if (
        cerrarPanel
    ) {

        cerrarPanel.addEventListener(
            "click",
            function () {

                panel.remove();
            }
        );
    }


    const limpiar =
        document.getElementById(
            "limpiarCoordenadas"
        );


    if (
        limpiar
    ) {

        limpiar.addEventListener(
            "click",
            function () {

                coordenadasCapturadas.forEach(
                    function (
                        item
                    ) {

                        if (
                            item.marcador &&
                            map.hasLayer(
                                item.marcador
                            )
                        ) {

                            map.removeLayer(
                                item.marcador
                            );
                        }
                    }
                );


                coordenadasCapturadas.length =
                    0;


                actualizarContadorCoordenadas();


                panel.remove();
            }
        );
    }


    document
        .querySelectorAll(
            ".eliminarCoordenada"
        )
        .forEach(
            function (
                boton
            ) {

                boton.addEventListener(
                    "click",
                    function () {

                        const index =
                            Number(
                                boton.dataset.index
                            );


                        const item =
                            coordenadasCapturadas[
                                index
                            ];


                        if (
                            item &&
                            item.marcador &&
                            map.hasLayer(
                                item.marcador
                            )
                        ) {

                            map.removeLayer(
                                item.marcador
                            );
                        }


                        coordenadasCapturadas.splice(
                            index,
                            1
                        );


                        actualizarContadorCoordenadas();


                        mostrarCoordenadasCapturadas();
                    }
                );
            }
        );
}


// ============================================================
// ACTUALIZAR CONTADOR
// ============================================================

function actualizarContadorCoordenadas() {

    document
        .querySelectorAll(
            ".info-badge"
        )
        .forEach(
            function (
                elemento
            ) {

                if (
                    elemento.textContent.includes(
                        "Coordenadas"
                    )
                ) {

                    elemento.textContent =
                        `◎ Coordenadas (${coordenadasCapturadas.length})`;
                }
            }
        );
}


// ============================================================
// DEPARTAMENTOS DE COLOMBIA
// ============================================================

const departamentosColombia = {

    "05":
        "Antioquia",

    "08":
        "Atlántico",

    "11":
        "Bogotá D.C.",

    "13":
        "Bolívar",

    "15":
        "Boyacá",

    "17":
        "Caldas",

    "18":
        "Caquetá",

    "19":
        "Cauca",

    "20":
        "Cesar",

    "23":
        "Córdoba",

    "25":
        "Cundinamarca",

    "27":
        "Chocó",

    "41":
        "Huila",

    "44":
        "La Guajira",

    "47":
        "Magdalena",

    "50":
        "Meta",

    "52":
        "Nariño",

    "54":
        "Norte de Santander",

    "63":
        "Quindío",

    "66":
        "Risaralda",

    "68":
        "Santander",

    "70":
        "Sucre",

    "73":
        "Tolima",

    "76":
        "Valle del Cauca",

    "81":
        "Arauca",

    "85":
        "Casanare",

    "86":
        "Putumayo",

    "88":
        "Archipiélago de San Andrés, Providencia y Santa Catalina",

    "91":
        "Amazonas",

    "94":
        "Guainía",

    "95":
        "Guaviare",

    "97":
        "Vaupés",

    "99":
        "Vichada"
};


function obtenerDepartamento(
    codigo
) {

    if (!codigo) {

        return "—";
    }


    const codigoTexto =
        String(codigo)
            .padStart(
                5,
                "0"
            );


    const codigoDepartamento =
        codigoTexto.substring(
            0,
            2
        );


    return (
        departamentosColombia[
            codigoDepartamento
        ] ||
        "—"
    );
}


// ============================================================
// MUNICIPIOS DESDE SUPABASE / POSTGIS
// ============================================================

function escaparHtmlMunicipio(valor) {
    return String(valor ?? "").replace(/[&<>"']/g, function (caracter) {
        return {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        }[caracter];
    });
}

const municipalityDialog = document.getElementById("municipalityDialog");
const municipalityDialogTitle = document.getElementById("municipalityDialogTitle");
const municipalityDialogCode = document.getElementById("municipalityDialogCode");
const municipalityDialogContent = document.getElementById("municipalityDialogContent");
let municipalityData = {
    loading: { profile: false, normativa: false, igac: false },
    errors: {}
};
let municipalityRequestId = 0;
let activeMunicipality = null;
let municipalityControllers = [];

function municipalityNode(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
}

function municipalityNotice(container, message, isError = false) {
    const notice = municipalityNode(
        "p",
        isError ? "municipality-notice error" : "municipality-notice",
        message
    );
    container.append(notice);
}

function municipalitySection(container, title) {
    const section = municipalityNode("section", "municipality-detail-section");
    section.append(municipalityNode("h3", "", title));
    container.append(section);
    return section;
}

function municipalityField(container, label, value) {
    const row = municipalityNode("div", "municipality-detail-row");
    row.append(
        municipalityNode("span", "", label),
        municipalityNode(
            "strong",
            "",
            value === null || value === undefined || value === ""
                ? "No disponible"
                : String(value)
        )
    );
    container.append(row);
}

function municipalityMetric(container, label, value, source) {
    const metric = municipalityNode("article", "municipality-metric");
    metric.append(
        municipalityNode("span", "", label),
        municipalityNode("strong", "", value),
        municipalityNode("small", "", source)
    );
    container.append(metric);
}

function municipalityNumber(value) {
    if (value === null || value === undefined || value === "") return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
}

function municipalityFormatNumber(value, maximumFractionDigits = 0) {
    return value.toLocaleString("es-CO", { maximumFractionDigits });
}

function municipalityDocument(container, title, details, url) {
    const card = municipalityNode("article", "municipality-document");
    card.append(municipalityNode("h4", "", title || "Instrumento sin título"));
    details.filter(Boolean).forEach(function (detail) {
        card.append(municipalityNode("p", "", detail));
    });

    if (url) {
        try {
            const parsedUrl = new URL(url, window.location.href);
            if (parsedUrl.protocol === "https:" || parsedUrl.protocol === "http:") {
                const link = municipalityNode("a", "", "Abrir fuente oficial");
                link.href = parsedUrl.href;
                link.target = "_blank";
                link.rel = "noopener noreferrer";
                card.append(link);
            }
        } catch (error) {
            console.warn("URL de normativa inválida:", error);
        }
    }

    container.append(card);
}

function renderMunicipalityTab(tab) {
    municipalityDialogContent.replaceChildren();

    const loading = municipalityData.loading || {};
    if (tab === "normativa" && loading.normativa && loading.igac) {
        municipalityNotice(municipalityDialogContent, "Consultando documentos e instrumentos normativos...");
        return;
    }
    if (tab === "analisis" && loading.profile && loading.normativa && loading.igac) {
        municipalityNotice(municipalityDialogContent, "Cargando información del municipio...");
        return;
    }

    const feature = activeMunicipality || {};
    const ficha = municipalityData.profile || {};
    const poblacion = municipalityNumber(ficha.poblacion_2018 ?? feature.poblacion_2018);
    const area = municipalityNumber(ficha.area_km2);
    const densidad = poblacion !== null && area !== null && area > 0
        ? poblacion / area
        : null;
    const documentos = municipalityData.normativa?.documentos || [];
    const instrumentos = municipalityData.igac?.instrumentos || [];
    const resumenVias = municipalityData.vias;

    if (tab === "informacion") {
        if (loading.profile) {
            municipalityNotice(
                municipalityDialogContent,
                "Cargando datos complementarios de la ficha. Se muestran mientras tanto los datos disponibles en la capa municipal."
            );
        }
        if (municipalityData.errors?.profile) {
            municipalityNotice(
                municipalityDialogContent,
                `No se pudo cargar la ficha completa (${municipalityData.errors.profile}). Se muestran los datos que acompañaban la geometría cuando están disponibles.`,
                true
            );
        }

        const section = municipalitySection(municipalityDialogContent, "Identificación");
        municipalityField(section, "Municipio", ficha.nombre || feature.nombre);
        municipalityField(section, "Departamento", ficha.departamento || feature.departamento);
        municipalityField(section, "Código DANE", ficha.codigo || feature.codigo);

        const dataSection = municipalitySection(municipalityDialogContent, "Datos disponibles");
        municipalityField(
            dataSection,
            "Población CNPV",
            poblacion === null ? null : `${municipalityFormatNumber(poblacion)} habitantes`
        );
        municipalityField(
            dataSection,
            "Área",
            area === null ? null : `${municipalityFormatNumber(area, 2)} km²`
        );
        municipalityField(dataSection, "Año censal", ficha.ano_censo);
        municipalityField(dataSection, "Fuente", ficha.fuente);
        municipalityField(
            dataSection,
            "Actualización",
            ficha.fecha_actualizacion || (
                ficha.fuente_respaldo
                    ? "No incluida en el GeoPackage local"
                    : null
            )
        );
        return;
    }

    if (tab === "indicadores") {
        if (loading.profile) {
            municipalityNotice(
                municipalityDialogContent,
                "Los indicadores disponibles se muestran mientras se consulta el área municipal."
            );
        }
        const grid = municipalityNode("div", "municipality-metric-grid");
        municipalityMetric(
            grid,
            "Población",
            poblacion === null ? "No disponible" : `${municipalityFormatNumber(poblacion)} hab.`,
            "CNPV 2018"
        );
        municipalityMetric(
            grid,
            "Área municipal",
            area === null ? "No disponible" : `${municipalityFormatNumber(area, 2)} km²`,
            ficha.fuente || "Fuente no informada"
        );
        municipalityMetric(
            grid,
            "Densidad poblacional",
            densidad === null ? "No disponible" : `${municipalityFormatNumber(densidad, 2)} hab./km²`,
            "Cálculo: población CNPV 2018 / área municipal"
        );
        municipalityDialogContent.append(grid);
        municipalityNotice(
            municipalityDialogContent,
            "La densidad es un cálculo derivado, no un indicador publicado por una entidad. Solo se presenta cuando la población y el área están disponibles."
        );
        return;
    }

    if (tab === "normativa") {
        if (municipalityData.errors?.normativa) {
            municipalityNotice(
                municipalityDialogContent,
                `No fue posible consultar los documentos normativos (${municipalityData.errors.normativa}).`,
                true
            );
        }
        if (municipalityData.errors?.igac) {
            municipalityNotice(
                municipalityDialogContent,
                `No fue posible consultar los instrumentos reportados por IGAC (${municipalityData.errors.igac}).`,
                true
            );
        }
        if (loading.normativa) {
            municipalityNotice(municipalityDialogContent, "Consultando documentos normativos...");
        }
        if (loading.igac) {
            municipalityNotice(municipalityDialogContent, "Consultando instrumentos reportados por IGAC...");
        }

        const documentsSection = municipalitySection(
            municipalityDialogContent,
            `Documentos registrados (${municipalityData.errors?.normativa ? "No disponible" : documentos.length})`
        );
        if (!documentos.length && !loading.normativa && !municipalityData.errors?.normativa) {
            municipalityNotice(documentsSection, "No hay documentos registrados para este municipio.");
        }
        documentos.forEach(function (documento) {
            municipalityDocument(
                documentsSection,
                documento.titulo || documento.tipo_instrumento,
                [
                    documento.tipo_instrumento,
                    documento.acto_administrativo,
                    documento.fecha_adopcion ? `Adopción: ${documento.fecha_adopcion}` : null,
                    documento.fecha_vigencia ? `Vigencia: ${documento.fecha_vigencia}` : null,
                    documento.estado_verificacion
                        ? `Verificación documental: ${documento.estado_verificacion}`
                        : null,
                    documento.observaciones
                ],
                documento.url_oficial
            );
        });

        const igacSection = municipalitySection(
            municipalityDialogContent,
            `Instrumentos reportados por IGAC (${municipalityData.errors?.igac ? "No disponible" : instrumentos.length})`
        );
        if (!instrumentos.length && !loading.igac && !municipalityData.errors?.igac) {
            municipalityNotice(igacSection, "No hay instrumentos IGAC reportados para este municipio.");
        }
        instrumentos.forEach(function (instrumento) {
            municipalityDocument(
                igacSection,
                instrumento.tipo_instrumento || "Instrumento IGAC",
                [
                    instrumento.acto_administrativo,
                    instrumento.fecha_adopcion ? `Adopción: ${instrumento.fecha_adopcion}` : null,
                    instrumento.estado_instrumento_codigo
                        ? `Estado reportado: ${instrumento.estado_instrumento_codigo}`
                        : null,
                    instrumento.vigencia_instrumento_codigo
                        ? `Vigencia reportada: ${instrumento.vigencia_instrumento_codigo}`
                        : null,
                    instrumento.fuente_igac
                ],
                null
            );
        });
        municipalityNotice(
            municipalityDialogContent,
            "Los códigos y estados de IGAC se muestran como datos reportados; no constituyen por sí solos una verificación jurídica o documental."
        );
        return;
    }

    if (tab === "vias") {
        if (!String(feature.departamento || "").toLowerCase().includes("antioquia")) {
            municipalityNotice(
                municipalityDialogContent,
                "El resumen de conectividad vial está disponible únicamente para municipios de Antioquia."
            );
            return;
        }
        if (loading.vias) {
            municipalityNotice(municipalityDialogContent, "Calculando tramos y conexiones municipales...");
            return;
        }
        if (municipalityData.errors?.vias) {
            municipalityNotice(
                municipalityDialogContent,
                `No fue posible calcular el resumen vial (${municipalityData.errors.vias}).`,
                true
            );
            return;
        }
        if (!resumenVias) {
            municipalityNotice(municipalityDialogContent, "No hay resumen vial disponible para este municipio.");
            return;
        }

        municipalityNotice(
            municipalityDialogContent,
            "Las vías no se dibujan como capa en el mapa. Aquí se presentan únicamente sus datos e indicadores disponibles de OpenStreetMap."
        );
        const grid = municipalityNode("div", "municipality-metric-grid");
        municipalityMetric(
            grid,
            "Tramos OSM en el municipio",
            municipalityFormatNumber(resumenVias.total_tramos || 0),
            "Tramos únicos que intersectan su polígono"
        );
        municipalityMetric(
            grid,
            "Municipios conectados",
            municipalityFormatNumber(resumenVias.municipios_conectados?.length || 0),
            "Antioquia"
        );
        municipalityDialogContent.append(grid);

        const classesSection = municipalitySection(municipalityDialogContent, "Tramos por clase vial");
        if (!resumenVias.desglose_clases?.length) {
            municipalityNotice(classesSection, "No se encontraron tramos para clasificar.");
        }
        (resumenVias.desglose_clases || []).forEach(function (item) {
            municipalityField(
                classesSection,
                item.clase,
                municipalityFormatNumber(item.total_tramos)
            );
        });

        const connectionsSection = municipalitySection(
            municipalityDialogContent,
            "Conexiones con otros municipios"
        );
        if (!resumenVias.municipios_conectados?.length) {
            municipalityNotice(connectionsSection, "No se encontraron tramos OSM compartidos con otros municipios.");
        }
        (resumenVias.municipios_conectados || []).forEach(function (connection) {
            const card = municipalityNode("article", "municipality-document");
            card.append(
                municipalityNode(
                    "h4",
                    "",
                    `${connection.municipio} (${connection.codigo})`
                ),
                municipalityNode(
                    "p",
                    "",
                    `${municipalityFormatNumber(connection.tramos_compartidos)} tramos OSM compartidos`
                )
            );
            connectionsSection.append(card);
        });
        municipalityNotice(municipalityDialogContent, resumenVias.metodo);
        return;
    }

    if (tab === "analisis") {
        const section = municipalitySection(municipalityDialogContent, "Resumen territorial descriptivo");
        municipalityField(
            section,
            "Densidad calculada",
            loading.profile
                ? "Consultando ficha municipal..."
                : densidad === null
                    ? "No disponible por falta de población o área"
                    : `${municipalityFormatNumber(densidad, 2)} hab./km²`
        );
        municipalityField(
            section,
            "Documentos normativos registrados",
            loading.normativa
                ? "Consultando..."
                : municipalityData.errors?.normativa
                    ? "No disponible"
                    : String(documentos.length)
        );
        municipalityField(
            section,
            "Instrumentos reportados por IGAC",
            loading.igac
                ? "Consultando..."
                : municipalityData.errors?.igac
                    ? "No disponible"
                    : String(instrumentos.length)
        );
        municipalityField(
            section,
            "Tramos viales OSM",
            loading.vias
                ? "Consultando..."
                : municipalityData.errors?.vias
                    ? "Fuente temporalmente no disponible"
                    : resumenVias
                        ? municipalityFormatNumber(resumenVias.total_tramos)
                        : "Sin resumen vial"
        );
        municipalityField(
            section,
            "Municipios conectados por vías",
            loading.vias
                ? "Consultando..."
                : resumenVias
                    ? String(resumenVias.municipios_conectados?.length || 0)
                    : "No disponible"
        );
        municipalityNotice(
            municipalityDialogContent,
            "La densidad se calcula con población CNPV 2018 y área del polígono. Los conteos viales provienen de OpenStreetMap. No hay datos conectados de mercado ni usos detallados del suelo, por lo que no se calcula un índice de potencial."
        );
        if (municipalityData.errors?.profile || municipalityData.errors?.normativa || municipalityData.errors?.igac || municipalityData.errors?.vias) {
            municipalityNotice(
                municipalityDialogContent,
                "El análisis es parcial porque una o más fuentes no respondieron. Cambia de pestaña para ver el detalle del error.",
                true
            );
        }
    }
}

function activarPestanaMunicipio(tab) {
    document.querySelectorAll("[data-municipality-tab]").forEach(function (button) {
        button.setAttribute("aria-selected", String(button.dataset.municipalityTab === tab));
    });
    renderMunicipalityTab(tab);
}

async function abrirFichaMunicipal(municipio) {
    const codigo = String(municipio.codigo || "").trim();
    if (!codigo) return;
    const necesitaPerfil = municipio.poblacion_2018 == null
        || municipio.area_km2 == null
        || municipio.fuente == null;
    const esAntioquia = String(municipio.departamento || "")
        .toLowerCase()
        .includes("antioquia");

    municipalityControllers.forEach(function (controller) {
        controller.abort();
    });
    municipalityControllers = [];

    const requestId = ++municipalityRequestId;
    activeMunicipality = municipio;
    municipalityData = {
        loading: { profile: necesitaPerfil, normativa: true, igac: true, vias: esAntioquia },
        errors: {},
        profile: municipio,
        normativa: null,
        igac: null,
        vias: null
    };
    municipalityDialogTitle.textContent = municipio.nombre || "Municipio";
    municipalityDialogCode.textContent = `Código DANE ${codigo}`;
    municipalityDialog.hidden = false;
    municipalityDialog.querySelector("[data-close-municipality]").focus();
    activarPestanaMunicipio("informacion");

    const cargarJson = async function (ruta) {
        const controller = new AbortController();
        municipalityControllers.push(controller);
        const timeout = window.setTimeout(function () {
            controller.abort();
        }, 8000);

        try {
            const response = await fetch(`https://mini-visor-sig.onrender.com${ruta}`, {
                signal: controller.signal
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data?.detail || `HTTP ${response.status}`);
            }
            if (data?.error) throw new Error(data.error);
            return data;
        } finally {
            window.clearTimeout(timeout);
            municipalityControllers = municipalityControllers.filter(function (item) {
                return item !== controller;
            });
        }
    };

    const cargarRecurso = async function (clave, ruta) {
        try {
            municipalityData[clave] = await cargarJson(ruta);
        } catch (error) {
            if (requestId !== municipalityRequestId) return;
            municipalityData.errors[clave] = error.name === "AbortError"
                ? "tiempo de espera agotado (8 s)"
                : error.message;
        } finally {
            if (requestId === municipalityRequestId) {
                municipalityData.loading[clave] = false;
                const tab = document.querySelector(
                    '[data-municipality-tab][aria-selected="true"]'
                )?.dataset.municipalityTab || "informacion";
                renderMunicipalityTab(tab);
            }
        }
    };

    const recursos = [
        cargarRecurso("normativa", `/municipios/${encodeURIComponent(codigo)}/normativa`),
        cargarRecurso("igac", `/municipios/${encodeURIComponent(codigo)}/normativa/igac`)
    ];
    if (necesitaPerfil) {
        recursos.push(
            cargarRecurso("profile", `/municipios/${encodeURIComponent(codigo)}`)
        );
    }
    if (esAntioquia) {
        recursos.push(
            cargarRecurso("vias", `/municipios/${encodeURIComponent(codigo)}/vias-resumen`)
        );
    }
    await Promise.all(recursos);
}

function cerrarFichaMunicipal() {
    municipalityRequestId += 1;
    municipalityControllers.forEach(function (controller) {
        controller.abort();
    });
    municipalityControllers = [];
    municipalityDialog.hidden = true;
}

document.querySelectorAll("[data-close-municipality]").forEach(function (button) {
    button.addEventListener("click", cerrarFichaMunicipal);
});

document.querySelectorAll("[data-municipality-tab]").forEach(function (button) {
    button.addEventListener("click", function () {
        activarPestanaMunicipio(button.dataset.municipalityTab);
    });
});

document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && !municipalityDialog.hidden) {
        cerrarFichaMunicipal();
    }
});

document.addEventListener("click", function (event) {
    const button = event.target.closest?.(".municipality-detail-button");
    if (!button) return;

    abrirFichaMunicipal({
        codigo: button.dataset.municipalityCode,
        nombre: button.dataset.municipalityName,
        departamento: button.dataset.municipalityDepartment,
        poblacion_2018: button.dataset.municipalityPopulation,
        area_km2: button.dataset.municipalityArea,
        ano_censo: button.dataset.municipalityYear,
        fuente: button.dataset.municipalitySource,
        fecha_actualizacion: button.dataset.municipalityUpdated
    });
});

fetch(
    "https://mini-visor-sig.onrender.com/municipios"
)

    .then(
        function (response) {

            if (!response.ok) {

                throw new Error(
                    "No se pudieron cargar los municipios."
                );
            }


            return response.json();
        }
    )

    .then(
        function (resultado) {

            // Acepta tanto una lista directa como un objeto con municipios.
            const listaMunicipios = Array.isArray(resultado)
                ? resultado
                : resultado.municipios;

            console.log(
                "Municipios recibidos desde Supabase/PostGIS:",
                listaMunicipios ? listaMunicipios.length : 0
            );


            if (
                !listaMunicipios ||
                listaMunicipios.length === 0
            ) {

                throw new Error(
                    "No hay municipios disponibles."
                );
            }


            const geojsonMunicipios = {

                type:
                    "FeatureCollection",

                features:
                    listaMunicipios

                        .filter(
                            function (
                                municipio
                            ) {

                                return (
                                    municipio.geometry
                                );
                            }
                        )

                        .map(
                            function (
                                municipio
                            ) {

                                return {

                                    type:
                                        "Feature",

                                    properties:
                                        {

                                            codigo:
                                                municipio.codigo,

                                            nombre:
                                                municipio.nombre,

                                            departamento:
                                                obtenerDepartamento(municipio.codigo),

                                            poblacion_2018:
                                                municipio.poblacion_2018,

                                            area_km2:
                                                municipio.area_km2,

                                            ano_censo:
                                                municipio.ano_censo,

                                            fuente:
                                                municipio.fuente,

                                            fecha_actualizacion:
                                                municipio.fecha_actualizacion
                                        },

                                    geometry:
                                        municipio.geometry
                                };
                            }
                        )
            };

            console.log(
                "GeoJSON de municipios:",
                geojsonMunicipios
            );


            const municipiosLayer =
                L.geoJSON(
                    geojsonMunicipios,
                    {

                        style:
                            {

                                color:
                                    "#087f72",

                                weight:
                                    1,

                                fillOpacity:
                                    0.10
                            },


                        onEachFeature:
                            function (
                                feature,
                                layer
                            ) {

                                const datos =
                                    feature.properties ||
                                    {};

                                layer.on(
                                    "click",
                                    function () {
                                        abrirFichaMunicipal(datos);
                                    }
                                );


                                layer.bindPopup(`

                                    <div style="
                                        min-width:260px;
                                        font-family:Arial,sans-serif;
                                    ">

                                        <h3 style="
                                            margin-top:0;
                                            color:#087f72;
                                        ">

                                            ${
                                                datos.nombre ||
                                                "Municipio"
                                            }

                                        </h3>


                                        <p>

                                            <strong>
                                                Departamento:
                                            </strong>

                                            ${
                                                datos.departamento ||
                                                "—"
                                            }

                                        </p>


                                        <p>

                                            <strong>
                                                Código:
                                            </strong>

                                            ${
                                                datos.codigo ||
                                                "—"
                                            }

                                        </p>


                                        <p>

                                            <strong>
                                                Población CNPV 2018:
                                            </strong>

                                            ${
                                                datos.poblacion_2018 !=
                                                null

                                                    ? Number(
                                                        datos.poblacion_2018
                                                    ).toLocaleString(
                                                        "es-CO"
                                                    )

                                                    : "—"
                                            }

                                        </p>


                                        <button
                                            type="button"
                                            class="municipality-detail-button"
                                            data-municipality-code="${escaparHtmlMunicipio(datos.codigo)}"
                                            data-municipality-name="${escaparHtmlMunicipio(datos.nombre)}"
                                            data-municipality-department="${escaparHtmlMunicipio(datos.departamento)}"
                                            data-municipality-population="${escaparHtmlMunicipio(datos.poblacion_2018)}"
                                            data-municipality-area="${escaparHtmlMunicipio(datos.area_km2)}"
                                            data-municipality-year="${escaparHtmlMunicipio(datos.ano_censo)}"
                                            data-municipality-source="${escaparHtmlMunicipio(datos.fuente)}"
                                            data-municipality-updated="${escaparHtmlMunicipio(datos.fecha_actualizacion)}"
                                        >
                                            Abrir ficha municipal
                                        </button>


                                        <hr>


                                        <p style="
                                            font-size:12px;
                                            color:#6b7280;
                                        ">

                                            Fuente:
                                            DANE – CNPV 2018

                                        </p>

                                    </div>
                                `);


                                if (
                                    datos.nombre
                                ) {

                                    layer.bindTooltip(
                                        datos.nombre,
                                        {
                                            sticky:
                                                true
                                        }
                                    );
                                }
                            }
                    }
                );


            // =================================================
            // IMPORTANTE:
            // MOSTRAR MUNICIPIOS EN EL MAPA
            // =================================================

            municipiosLayer.addTo(
                map
            );


            const cantidadMunicipios =
                geojsonMunicipios
                    .features
                    .length;


            // =================================================
            // CREAR TARJETA MUNICIPIOS
            // =================================================

            agregarCapaAlPanel(
                "Municipios",
                municipiosLayer,
                cantidadMunicipios,
                "EPSG:4326",
                geojsonMunicipios
            );


            console.log(
                `✓ Municipios cargados en el mapa: ${
                    cantidadMunicipios
                }`
            );
        }
    )

    .catch(
        function (error) {

            console.error(
                "Error cargando municipios:",
                error
            );
        }
    );


// ============================================================
// INICIO
// ============================================================

console.log(
    "✓ Mini Visor SIG iniciado correctamente"
);

console.log(
    "✓ Capitales Departamentales disponible"
);

console.log(
    "✓ Ciudades disponible"
);

console.log(
    "✓ Río Magdalena disponible"
);

console.log(
    "✓ Municipios disponible"
);


console.log(
    "✓ Reproyección disponible"
);

console.log(
    "✓ Captura de coordenadas disponible"
);

console.log(
    "✓ Carga de capas GeoJSON / KML / KMZ / SHP disponible"
);