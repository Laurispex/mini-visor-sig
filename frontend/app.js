const map = L.map("map").setView([4.5709, -74.2973], 6);

L.tileLayer(
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap contributors"
    }
).addTo(map);

map.on("mousemove", function (event) {
    const lat = event.latlng.lat.toFixed(6);
    const lng = event.latlng.lng.toFixed(6);

    const coordinates = document.getElementById("coordinates");
    const cursorInfo = document.getElementById("cursor-info");

    if (coordinates) {
        coordinates.textContent = `${lng}, ${lat}`;
    }

    if (cursorInfo) {
        cursorInfo.textContent = `CURSOR: ${lng}, ${lat}`;
    }
});

function crearCapaGeoJSON(geojson, opciones = {}) {
    return L.geoJSON(geojson, {
        style: {
            color: opciones.color || "#087f72",
            weight: opciones.weight || 2,
            fillOpacity: opciones.fillOpacity ?? 0.25
        },

        pointToLayer: function (feature, latlng) {
            return L.circleMarker(latlng, {
                radius: 7,
                fillColor: "#e58b2a",
                color: "#ffffff",
                weight: 2,
                fillOpacity: 0.95
            });
        },

        onEachFeature: function (feature, layer) {
            const datos = feature.properties || {};

            if (
                opciones.reproyectada &&
                feature._coordenadasReproyectadas
            ) {
                const coord = feature._coordenadasReproyectadas;
                const originales = feature._coordenadasOriginales;

                const contenido = `
                    <div style="min-width:250px;font-family:Arial,sans-serif;">
                        <h3 style="margin:0 0 12px 0;color:#087f72;">
                            ${datos.nombre || "Elemento geográfico"}
                        </h3>

                        <div style="padding:10px;background:#ecfdf5;border-radius:8px;margin-bottom:12px;">
                            <strong>✓ Capa reproyectada</strong>
                        </div>

                        <p><strong>CRS:</strong> ${opciones.crs}</p>

                        <p><strong>X:</strong> ${
                            coord && coord[0] !== undefined
                                ? Number(coord[0]).toFixed(3)
                                : "—"
                        }</p>

                        <p><strong>Y:</strong> ${
                            coord && coord[1] !== undefined
                                ? Number(coord[1]).toFixed(3)
                                : "—"
                        }</p>

                        <hr>

                        <p style="font-size:12px;color:#6b7280;">
                            <strong>Coordenadas originales</strong>
                        </p>

                        <p style="font-size:12px;">
                            ${opciones.sourceCrs}
                        </p>

                        <p style="font-size:12px;">
                            ${
                                originales && originales[0] !== undefined
                                    ? Number(originales[0]).toFixed(6)
                                    : "—"
                            },
                            ${
                                originales && originales[1] !== undefined
                                    ? Number(originales[1]).toFixed(6)
                                    : "—"
                            }
                        </p>
                    </div>
                `;

                layer.bindPopup(contenido);
            } else {
                let contenido =
                    "<strong>Información geográfica</strong><br><br>";

                Object.entries(datos).forEach(([clave, valor]) => {
                    contenido += `<strong>${clave}:</strong> ${valor}<br>`;
                });

                layer.bindPopup(contenido);
            }

            if (datos.nombre) {
                layer.bindTooltip(datos.nombre, {
                    direction: "top"
                });
            }
        }
    });
}

const layersContainer =
    document.getElementById("layersContainer");

function agregarBotonReproyeccion(layerCard) {
    if (layerCard.querySelector(".reproject-button")) {
        return;
    }

    const boton = document.createElement("button");

    boton.className = "reproject-button";
    boton.type = "button";
    boton.textContent = "↗ Reproyectar";

    boton.style.width = "100%";
    boton.style.marginTop = "10px";
    boton.style.padding = "8px";
    boton.style.border = "none";
    boton.style.borderRadius = "7px";
    boton.style.cursor = "pointer";
    boton.style.background = "#087f72";
    boton.style.color = "#ffffff";
    boton.style.fontWeight = "600";

    layerCard.appendChild(boton);

    boton.addEventListener("click", function (event) {
        event.preventDefault();
        event.stopPropagation();

        abrirVentanaReproyeccion(
            layerCard.dataset.layerName,
            layerCard.dataset.layerCrs,
            layerCard
        );
    });
}

function configurarTarjeta(
    layerCard,
    nombre,
    capa,
    geojson,
    crs
) {
    layerCard.dataset.layerName = nombre;
    layerCard.dataset.layerCrs = crs;
    layerCard.geojson = geojson;
    layerCard.leafletLayer = capa;
    layerCard.displayGeojson = geojson;

    const visibilityButton =
        layerCard.querySelector(".visibility");

    if (visibilityButton) {
        visibilityButton.addEventListener(
            "click",
            function (event) {
                event.preventDefault();
                event.stopPropagation();

                if (map.hasLayer(capa)) {
                    map.removeLayer(capa);

                    visibilityButton.textContent = "○";
                    visibilityButton.classList.remove("active");
                } else {
                    map.addLayer(capa);

                    visibilityButton.textContent = "●";
                    visibilityButton.classList.add("active");
                }
            }
        );
    }

    agregarBotonReproyeccion(layerCard);
}

fetch("../data/capitales_departamentales.geojson")
    .then(function (response) {
        if (!response.ok) {
            throw new Error(
                "No se pudo cargar capitales_departamentales.geojson"
            );
        }

        return response.json();
    })
    .then(function (data) {
        console.log("Capitales cargadas:", data);

        const capitalesLayer =
            crearCapaGeoJSON(data);

        capitalesLayer.addTo(map);

        const tarjetas =
            document.querySelectorAll(".layer-card");

        let tarjetaCapitales = null;

        tarjetas.forEach(function (tarjeta) {
            const texto =
                tarjeta.textContent.trim();

            if (
                texto.includes(
                    "Capitales Departamentales"
                )
            ) {
                tarjetaCapitales = tarjeta;
            }
        });

        if (tarjetaCapitales) {
            configurarTarjeta(
                tarjetaCapitales,
                "Capitales Departamentales",
                capitalesLayer,
                data,
                "EPSG:4326"
            );

            const epsg =
                tarjetaCapitales.querySelector(".epsg");

            if (epsg) {
                epsg.textContent = "EPSG:4326";
            }

            const entityCount =
                tarjetaCapitales.querySelector(
                    ".entity-count"
                );

            if (entityCount) {
                entityCount.textContent =
                    `· ${data.features.length} entidades`;
            }
        }

        console.log(
            `Capitales Departamentales cargadas: ${data.features.length} entidades.`
        );
    })
    .catch(function (error) {
        console.error(
            "Error cargando capitales:",
            error
        );
    });

fetch("../data/ciudades.geojson")
    .then(function (response) {
        if (!response.ok) {
            throw new Error(
                "No se pudo cargar ciudades.geojson"
            );
        }

        return response.json();
    })
    .then(function (data) {
        const ciudadesLayer =
            crearCapaGeoJSON(data);

        ciudadesLayer.addTo(map);

        console.log(
            "Capa GeoJSON de prueba cargada correctamente."
        );
    })
    .catch(function (error) {
        console.error(
            "Error cargando capa de prueba:",
            error
        );
    });

function agregarCapaAlPanel(
    nombre,
    capa,
    cantidad,
    crs,
    geojson
) {
    const layerCard =
        document.createElement("div");

    layerCard.className =
        "layer-card";

    layerCard.innerHTML = `
        <div class="layer-title">
            <span class="layer-symbol">⬡</span>
            <strong>${nombre}</strong>
            <button
                class="visibility active"
                type="button"
            >
                ●
            </button>
        </div>

        <div class="layer-info">
            <span class="epsg">${crs}</span>
            <span>${cantidad} entidades</span>
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
}

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
        document.createElement("div");

    modal.id =
        "reprojectModal";

    Object.assign(
        modal.style,
        {
            position: "fixed",
            inset: "0",
            width: "100vw",
            height: "100vh",
            background: "rgba(0,0,0,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: "999999"
        }
    );

    const ventana =
        document.createElement("div");

    Object.assign(
        ventana.style,
        {
            width: "430px",
            maxWidth: "90%",
            background: "#ffffff",
            borderRadius: "14px",
            boxShadow:
                "0 20px 60px rgba(0,0,0,0.30)",
            overflow: "hidden",
            fontFamily: "Arial, sans-serif"
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

        <div style="padding:22px;">

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
                <strong>Reproyección real</strong>
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
                    document.getElementById(
                        "selectCrsDestino"
                    ).value;

                if (!destino) {
                    alert(
                        "Seleccione un CRS de destino."
                    );

                    return;
                }

                if (destino === crsActual) {
                    alert(
                        "El CRS de destino debe ser diferente al CRS actual."
                    );

                    return;
                }

                const geojson =
                    layerCard.geojson;

                if (!geojson) {
                    alert(
                        "No se encontró el GeoJSON."
                    );

                    return;
                }

                const boton =
                    document.getElementById(
                        "confirmarReproyeccion"
                    );

                boton.disabled = true;
                boton.textContent =
                    "Procesando...";

                try {

                    const response =
                        await fetch(
                            "http://127.0.0.1:8000/reproject",
                            {
                                method: "POST",

                                headers: {
                                    "Content-Type":
                                        "application/json"
                                },

                                body: JSON.stringify({
                                    source_crs:
                                        crsActual,

                                    target_crs:
                                        destino,

                                    geojson:
                                        geojson
                                })
                            }
                        );

                    const resultado =
                        await response.json();

                    if (!response.ok) {
                        throw new Error(
                            resultado.detail ||
                            "Error en el backend."
                        );
                    }

                    console.log(
                        "Resultado de reproyección:",
                        resultado
                    );

                    const geojsonReproyectado =
                        resultado.geojson;

                    const geojsonVisualizacion =
                        resultado.display_geojson;

                    if (!geojsonVisualizacion) {
                        throw new Error(
                            "El backend no devolvió la capa para visualización."
                        );
                    }

                    geojsonVisualizacion.features.forEach(
                        function (
                            featureVisual,
                            index
                        ) {
                            const featureReal =
                                geojsonReproyectado
                                    .features[index];

                            const featureOriginal =
                                geojson.features[index];

                            if (
                                featureReal &&
                                featureReal.geometry &&
                                featureReal.geometry.coordinates
                            ) {
                                const coordReal =
                                    obtenerPrimerPunto(
                                        featureReal.geometry
                                    );

                                const coordOriginal =
                                    obtenerPrimerPunto(
                                        featureOriginal.geometry
                                    );

                                featureVisual
                                    ._coordenadasReproyectadas =
                                    coordReal;

                                featureVisual
                                    ._coordenadasOriginales =
                                    coordOriginal;
                            }
                        }
                    );

                    const nuevaCapa =
                        crearCapaGeoJSON(
                            geojsonVisualizacion,
                            {
                                reproyectada: true,
                                crs: destino,
                                sourceCrs: crsActual
                            }
                        );

                    if (
                        layerCard.leafletLayer &&
                        map.hasLayer(
                            layerCard.leafletLayer
                        )
                    ) {
                        map.removeLayer(
                            layerCard.leafletLayer
                        );
                    }

                    nuevaCapa.addTo(
                        map
                    );

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
                            destino;
                    }

                    layerCard.dataset.layerCrs =
                        destino;

                    try {

                        const bounds =
                            nuevaCapa.getBounds();

                        if (
                            bounds.isValid()
                        ) {
                            map.fitBounds(
                                bounds,
                                {
                                    padding: [
                                        30,
                                        30
                                    ]
                                }
                            );
                        }

                    } catch (error) {
                        console.log(
                            "No fue posible ajustar el zoom."
                        );
                    }

                    modal.remove();

                    alert(
                        `✓ Reproyección realizada correctamente\n\n${crsActual} → ${destino}\n\nLas coordenadas fueron transformadas\nrealmente mediante Python + PyProj.`
                    );

                } catch (error) {

                    console.error(
                        "Error durante la reproyección:",
                        error
                    );

                    alert(
                        `No fue posible reproyectar la capa.\n\n${error.message}`
                    );

                } finally {

                    boton.disabled = false;
                    boton.textContent =
                        "Reproyectar";
                }
            }
        );
}

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

    if (tipo === "Point") {
        return coordenadas;
    }

    if (tipo === "LineString") {
        return coordenadas[0];
    }

    if (tipo === "Polygon") {
        return coordenadas[0][0];
    }

    if (tipo === "MultiPoint") {
        return coordenadas[0];
    }

    if (tipo === "MultiLineString") {
        return coordenadas[0][0];
    }

    if (tipo === "MultiPolygon") {
        return coordenadas[0][0][0];
    }

    return null;
}

const uploadButton =
    document.getElementById(
        "uploadButton"
    );

const layerInput =
    document.getElementById(
        "layerInput"
    );

if (uploadButton && layerInput) {

    uploadButton.addEventListener(
        "click",
        function () {
            layerInput.click();
        }
    );

    layerInput.addEventListener(
        "change",
        function (event) {

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

            if (
                extension !== "geojson" &&
                extension !== "json"
            ) {
                alert(
                    "Por ahora solo se pueden cargar archivos GeoJSON."
                );

                layerInput.value = "";

                return;
            }

            const reader =
                new FileReader();

            reader.onload =
                function (e) {

                    try {

                        const geojson =
                            JSON.parse(
                                e.target.result
                            );

                        if (
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

                        const nuevaCapa =
                            crearCapaGeoJSON(
                                geojson
                            );

                        nuevaCapa.addTo(
                            map
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
                                        padding: [
                                            30,
                                            30
                                        ]
                                    }
                                );
                            }

                        } catch (error) {
                            console.log(
                                "No fue posible ajustar el zoom."
                            );
                        }

                        const cantidad =
                            geojson.features.length;

                        agregarCapaAlPanel(
                            file.name,
                            nuevaCapa,
                            cantidad,
                            crs,
                            geojson
                        );

                        alert(
                            `Capa "${file.name}" cargada correctamente.`
                        );

                        layerInput.value =
                            "";

                    } catch (error) {

                        console.error(
                            "Error procesando GeoJSON:",
                            error
                        );

                        alert(
                            `No fue posible cargar el archivo.\n\n${error.message}`
                        );

                        layerInput.value =
                            "";
                    }
                };

            reader.readAsText(
                file
            );
        }
    );
}


// ==========================================
// RÍO MAGDALENA
// ==========================================

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
                        color: "#2563eb",
                        weight: 3,
                        fillOpacity: 0.35
                    }
                );

            rioLayer.addTo(
                map
            );

            const tarjetas =
                document.querySelectorAll(
                    ".layer-card"
                );

            let tarjetaRio =
                null;

            tarjetas.forEach(
                function (tarjeta) {

                    if (
                        tarjeta.textContent.includes(
                            "Río Magdalena"
                        )
                    ) {
                        tarjetaRio =
                            tarjeta;
                    }
                }
            );

            if (tarjetaRio) {

                configurarTarjeta(
                    tarjetaRio,
                    "Río Magdalena",
                    rioLayer,
                    data,
                    "EPSG:4326"
                );

                const epsg =
                    tarjetaRio.querySelector(
                        ".epsg"
                    );

                if (epsg) {
                    epsg.textContent =
                        "EPSG:4326";
                }
            }

            console.log(
                "✓ Río Magdalena visible en el mapa."
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


// ==========================================
// CAPTURAR COORDENADAS
// ==========================================

const coordenadasCapturadas = [];

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
            } else {
                activarCapturaCoordenadas();
            }
        }
    );
}

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
            coordenadasCapturadas.length + 1;

        const marcador =
            L.marker(
                event.latlng
            ).addTo(map);

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

        coordenadasCapturadas.push({
            numero: numero,
            x: longitud,
            y: latitud,
            crs: "EPSG:4326",
            marcador: marcador
        });

        marcador.on(
            "popupopen",
            function () {

                const popupElement =
                    marcador.getPopup().getElement();

                if (!popupElement) {
                    return;
                }

                const botonReproyectar =
                    popupElement.querySelector(
                        ".boton-reproyectar-coordenada"
                    );

                if (!botonReproyectar) {
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

                        if (!destino) {
                            return;
                        }

                        if (
                            destino.trim().toUpperCase() ===
                            "EPSG:4326"
                        ) {
                            alert(
                                "El CRS de destino debe ser diferente de EPSG:4326."
                            );

                            return;
                        }

                        try {

                            botonReproyectar.disabled =
                                true;

                            botonReproyectar.textContent =
                                "Reproyectando...";

                            const response =
                                await fetch(
                                    "http://127.0.0.1:8000/reproject",
                                    {
                                        method: "POST",

                                        headers: {
                                            "Content-Type":
                                                "application/json"
                                        },

                                        body:
                                            JSON.stringify({
                                                source_crs:
                                                    "EPSG:4326",

                                                target_crs:
                                                    destino
                                                        .trim()
                                                        .toUpperCase(),

                                                geojson: {
                                                    type:
                                                        "FeatureCollection",

                                                    features: [
                                                        {
                                                            type:
                                                                "Feature",

                                                            properties: {},

                                                            geometry: {
                                                                type:
                                                                    "Point",

                                                                coordinates: [
                                                                    longitud,
                                                                    latitud
                                                                ]
                                                            }
                                                        }
                                                    ]
                                                }
                                            })
                                    }
                                );

                            const resultado =
                                await response.json();

                            if (!response.ok) {

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

                            const crsDestino =
                                destino
                                    .trim()
                                    .toUpperCase();

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

        console.log(
            "✓ Coordenada capturada:",
            {
                x: longitud,
                y: latitud,
                crs: "EPSG:4326"
            }
        );

        mostrarCoordenadasCapturadas();
    }
);

function mostrarCoordenadasCapturadas() {

    const anterior =
        document.getElementById(
            "coordenadasCapturadasPanel"
        );

    if (anterior) {
        anterior.remove();
    }

    if (
        coordenadasCapturadas.length === 0
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
        box-shadow:0 8px 30px rgba(0,0,0,.25);
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
        function (item, index) {

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

                        <strong>X:</strong>
                        ${item.x.toFixed(6)}

                        <br>

                        <strong>Y:</strong>
                        ${item.y.toFixed(6)}

                        <br>

                        <strong>CRS:</strong>
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

    } else {

        document.body.appendChild(
            panel
        );
    }

    const cerrarPanel =
        document.getElementById(
            "cerrarPanelCoordenadas"
        );

    if (cerrarPanel) {

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

    if (limpiar) {

        limpiar.addEventListener(
            "click",
            function () {

                coordenadasCapturadas.forEach(
                    function (item) {

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
            function (boton) {

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

function actualizarContadorCoordenadas() {

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
}

console.log(
    "✓ Mini Visor SIG iniciado correctamente"
);

console.log(
    "✓ Reproyección disponible"
);

console.log(
    "✓ Capturar Coordenadas disponible"
);

