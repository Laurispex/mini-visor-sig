// ==========================================
// MINI VISOR SIG
// Archivo: frontend/app.js
// ==========================================


// ==========================================
// 1. CREAR MAPA
// ==========================================

const map = L.map("map").setView(
    [4.5709, -74.2973],
    6
);


// ==========================================
// 2. MAPA BASE
// ==========================================

L.tileLayer(
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    {
        maxZoom: 19,
        attribution:
            "&copy; OpenStreetMap contributors"
    }
).addTo(map);


// ==========================================
// 3. COORDENADAS DEL CURSOR
// ==========================================

map.on("mousemove", function (event) {

    const lat =
        event.latlng.lat.toFixed(6);

    const lng =
        event.latlng.lng.toFixed(6);


    const coordinates =
        document.getElementById("coordinates");

    const cursorInfo =
        document.getElementById("cursor-info");


    if (coordinates) {

        coordinates.textContent =
            `${lng}, ${lat}`;

    }


    if (cursorInfo) {

        cursorInfo.textContent =
            `CURSOR: ${lng}, ${lat}`;

    }

});


// ==========================================
// 4. CREAR CAPA GEOJSON
// ==========================================

function crearCapaGeoJSON(geojson) {

    return L.geoJSON(
        geojson,
        {

            // ------------------------------------------
            // Estilo para polígonos y líneas
            // ------------------------------------------

            style: {

                color: "#087f72",

                weight: 2,

                fillOpacity: 0.25

            },


            // ------------------------------------------
            // Estilo para puntos
            // ------------------------------------------

            pointToLayer:
                function (feature, latlng) {

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


            // ------------------------------------------
            // Información de cada elemento
            // ------------------------------------------

            onEachFeature:
                function (feature, layer) {

                    const datos =
                        feature.properties || {};


                    let contenido =
                        "<strong>Información geográfica</strong><br><br>";


                    Object.entries(datos)
                        .forEach(
                            ([clave, valor]) => {

                                contenido +=
                                    `<strong>${clave}:</strong> ${valor}<br>`;

                            }
                        );


                    layer.bindPopup(
                        contenido
                    );


                    // ------------------------------------------
                    // Tooltip
                    // ------------------------------------------

                    if (datos.nombre) {

                        layer.bindTooltip(
                            datos.nombre,
                            {
                                direction: "top"
                            }
                        );

                    }

                }

        }
    );

}


// ==========================================
// 5. CARGAR GEOJSON DE PRUEBA
// ==========================================

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


// ==========================================
// 6. PANEL DE CAPAS
// ==========================================

const layersContainer =
    document.getElementById(
        "layersContainer"
    );


// ==========================================
// 7. AGREGAR CAPA AL PANEL
// ==========================================

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


        <button
            class="reproject-button"
            type="button"
            data-layer-name="${nombre}"
            data-layer-crs="${crs}"
        >
            ↗ Reproyectar
        </button>

    `;


    layersContainer.appendChild(
        layerCard
    );


    // ==========================================
    // GUARDAR INFORMACIÓN DE LA CAPA
    // ==========================================

    layerCard.geojson =
        geojson;


    layerCard.leafletLayer =
        capa;


    layerCard.displayGeojson =
        geojson;


    // ==========================================
    // BOTÓN MOSTRAR / OCULTAR
    // ==========================================

    const visibilityButton =
        layerCard.querySelector(
            ".visibility"
        );


    visibilityButton.addEventListener(
        "click",
        function (event) {

            event.stopPropagation();


            if (map.hasLayer(capa)) {

                map.removeLayer(capa);


                visibilityButton.textContent =
                    "○";


                visibilityButton.classList.remove(
                    "active"
                );

            }

            else {

                map.addLayer(capa);


                visibilityButton.textContent =
                    "●";


                visibilityButton.classList.add(
                    "active"
                );

            }

        }
    );

}


// ==========================================
// 8. BOTÓN REPROYECTAR
// ==========================================

document.addEventListener(
    "click",
    function (event) {

        const boton =
            event.target.closest(
                ".reproject-button"
            );


        if (!boton) {

            return;

        }


        event.preventDefault();

        event.stopPropagation();


        const nombre =
            boton.dataset.layerName;


        const crs =
            boton.dataset.layerCrs;


        const layerCard =
            boton.closest(
                ".layer-card"
            );


        abrirVentanaReproyeccion(
            nombre,
            crs,
            layerCard
        );

    }
);


// ==========================================
// 9. VENTANA DE REPROYECCIÓN
// ==========================================

function abrirVentanaReproyeccion(
    nombre,
    crsActual,
    layerCard
) {

    // ------------------------------------------
    // Eliminar ventana anterior
    // ------------------------------------------

    const anterior =
        document.getElementById(
            "reprojectModal"
        );


    if (anterior) {

        anterior.remove();

    }


    // ==========================================
    // FONDO
    // ==========================================

    const modal =
        document.createElement("div");


    modal.id =
        "reprojectModal";


    modal.style.position =
        "fixed";

    modal.style.top =
        "0";

    modal.style.left =
        "0";

    modal.style.right =
        "0";

    modal.style.bottom =
        "0";

    modal.style.width =
        "100vw";

    modal.style.height =
        "100vh";

    modal.style.background =
        "rgba(0, 0, 0, 0.45)";

    modal.style.display =
        "flex";

    modal.style.alignItems =
        "center";

    modal.style.justifyContent =
        "center";

    modal.style.zIndex =
        "999999";


    // ==========================================
    // VENTANA
    // ==========================================

    const ventana =
        document.createElement("div");


    ventana.style.width =
        "430px";

    ventana.style.maxWidth =
        "90%";

    ventana.style.background =
        "#ffffff";

    ventana.style.borderRadius =
        "14px";

    ventana.style.boxShadow =
        "0 20px 60px rgba(0,0,0,0.30)";

    ventana.style.overflow =
        "hidden";

    ventana.style.fontFamily =
        "Arial, sans-serif";


    ventana.innerHTML = `

        <div style="
            padding: 20px 22px;
            border-bottom: 1px solid #e5e7eb;
            display: flex;
            align-items: center;
            justify-content: space-between;
        ">

            <h2 style="
                margin: 0;
                font-size: 20px;
                color: #1f2937;
            ">
                Reproyectar capa
            </h2>


            <button
                id="cerrarReproyeccion"
                type="button"
                style="
                    border: none;
                    background: transparent;
                    font-size: 28px;
                    cursor: pointer;
                    color: #6b7280;
                "
            >
                ×
            </button>

        </div>


        <div style="
            padding: 22px;
        ">

            <p style="
                margin-top: 0;
                margin-bottom: 22px;
                color: #374151;
            ">

                <strong>
                    Capa:
                </strong>

                ${nombre}

            </p>


            <div style="
                margin-bottom: 20px;
            ">

                <label style="
                    display: block;
                    margin-bottom: 8px;
                    font-weight: 600;
                    color: #374151;
                ">
                    Sistema de referencia actual
                </label>


                <div style="
                    padding: 11px 12px;
                    border: 1px solid #d1d5db;
                    border-radius: 8px;
                    background: #f3f4f6;
                    color: #374151;
                ">

                    ${crsActual}

                </div>

            </div>


            <div style="
                margin-bottom: 20px;
            ">

                <label
                    for="selectCrsDestino"
                    style="
                        display: block;
                        margin-bottom: 8px;
                        font-weight: 600;
                        color: #374151;
                    "
                >
                    Reproyectar a
                </label>


                <select
                    id="selectCrsDestino"
                    style="
                        width: 100%;
                        box-sizing: border-box;
                        padding: 11px 12px;
                        border: 1px solid #d1d5db;
                        border-radius: 8px;
                        background: #ffffff;
                        font-size: 14px;
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

            </div>


            <div style="
                padding: 12px;
                border-radius: 8px;
                background: #f1f5f9;
                color: #475569;
                font-size: 13px;
                line-height: 1.5;
            ">

                <strong>
                    Nota:
                </strong>

                El CRS de destino debe ser
                diferente al CRS actual.

            </div>

        </div>


        <div style="
            padding: 16px 22px;
            border-top: 1px solid #e5e7eb;
            display: flex;
            justify-content: flex-end;
            gap: 10px;
        ">

            <button
                id="cancelarReproyeccion"
                type="button"
                style="
                    padding: 10px 16px;
                    border: none;
                    border-radius: 8px;
                    background: #e5e7eb;
                    color: #374151;
                    cursor: pointer;
                    font-weight: 600;
                "
            >
                Cancelar
            </button>


            <button
                id="confirmarReproyeccion"
                type="button"
                style="
                    padding: 10px 16px;
                    border: none;
                    border-radius: 8px;
                    background: #087f72;
                    color: white;
                    cursor: pointer;
                    font-weight: 600;
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


    // ==========================================
    // CERRAR
    // ==========================================

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


    // ==========================================
    // CONFIRMAR REPROYECCIÓN
    // ==========================================

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


                // ==========================================
                // VALIDAR CRS
                // ==========================================

                if (!destino) {

                    alert(
                        "Seleccione un sistema de referencia de destino."
                    );

                    return;

                }


                if (
                    destino === crsActual
                ) {

                    alert(
                        "El CRS de destino debe ser diferente al CRS actual."
                    );

                    return;

                }


                // ==========================================
                // OBTENER GEOJSON REAL
                // ==========================================

                const geojson =
                    layerCard.geojson;


                if (!geojson) {

                    alert(
                        "No se encontró el GeoJSON de la capa."
                    );

                    return;

                }


                // ==========================================
                // BOTÓN PROCESANDO
                // ==========================================

                const botonConfirmar =
                    document.getElementById(
                        "confirmarReproyeccion"
                    );


                botonConfirmar.disabled =
                    true;


                botonConfirmar.textContent =
                    "Procesando...";


                try {

                    console.log(
                        "Enviando capa al backend..."
                    );


                    console.log(
                        `Origen: ${crsActual}`
                    );


                    console.log(
                        `Destino: ${destino}`
                    );


                    // ==========================================
                    // LLAMAR API PYTHON
                    // ==========================================

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
                                            crsActual,

                                        target_crs:
                                            destino,

                                        geojson:
                                            geojson

                                    })

                            }
                        );


                    // ==========================================
                    // LEER RESPUESTA
                    // ==========================================

                    const resultado =
                        await response.json();


                    if (!response.ok) {

                        throw new Error(
                            resultado.detail ||
                            "El backend devolvió un error."
                        );

                    }


                    console.log(
                        "Respuesta del backend:",
                        resultado
                    );


                    // ==========================================
                    // GEOJSON REPROYECTADO REAL
                    // ==========================================

                    const geojsonReproyectado =
                        resultado.geojson;


                    // ==========================================
                    // GEOJSON PARA LEAFLET
                    // ==========================================
                    //
                    // El backend devuelve una copia
                    // transformada nuevamente a EPSG:4326
                    // únicamente para visualizarla.
                    //
                    // La capa REAL sigue siendo el CRS
                    // seleccionado por el usuario.
                    // ==========================================

                    const geojsonVisualizacion =
                        resultado.display_geojson;


                    if (!geojsonVisualizacion) {

                        throw new Error(
                            "El backend no devolvió la capa para visualización."
                        );

                    }


                    // ==========================================
                    // CREAR NUEVA CAPA
                    // ==========================================

                    const nuevaCapa =
                        crearCapaGeoJSON(
                            geojsonVisualizacion
                        );


                    // ==========================================
                    // QUITAR CAPA ANTERIOR
                    // ==========================================

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


                    // ==========================================
                    // AGREGAR CAPA REPROYECTADA
                    // ==========================================

                    nuevaCapa.addTo(
                        map
                    );


                    // ==========================================
                    // ACTUALIZAR INFORMACIÓN
                    // ==========================================

                    layerCard.leafletLayer =
                        nuevaCapa;


                    // Guardar el CRS real

                    layerCard.geojson =
                        geojsonReproyectado;


                    // Guardar versión visual

                    layerCard.displayGeojson =
                        geojsonVisualizacion;


                    // ==========================================
                    // ACTUALIZAR CRS DEL PANEL
                    // ==========================================

                    const epsgElement =
                        layerCard.querySelector(
                            ".epsg"
                        );


                    if (epsgElement) {

                        epsgElement.textContent =
                            destino;

                    }


                    // ==========================================
                    // ACTUALIZAR BOTÓN
                    // ==========================================

                    const botonReproyectar =
                        layerCard.querySelector(
                            ".reproject-button"
                        );


                    if (botonReproyectar) {

                        botonReproyectar.dataset.layerCrs =
                            destino;

                    }


                    // ==========================================
                    // AJUSTAR MAPA
                    // ==========================================

                    try {

                        const bounds =
                            nuevaCapa.getBounds();


                        if (
                            bounds.isValid()
                        ) {

                            map.fitBounds(
                                bounds,
                                {
                                    padding: [30, 30]
                                }
                            );

                        }

                    }
                    catch (error) {

                        console.log(
                            "No fue posible ajustar el mapa:",
                            error
                        );

                    }


                    // ==========================================
                    // CERRAR MODAL
                    // ==========================================

                    modal.remove();


                    // ==========================================
                    // CONFIRMACIÓN
                    // ==========================================

                    alert(
                        `Reproyección realizada correctamente:

${crsActual} → ${destino}`
                    );

                }

                catch (error) {

                    console.error(
                        "Error durante la reproyección:",
                        error
                    );


                    alert(
                        `No fue posible reproyectar la capa.

${error.message}`
                    );

                }

                finally {

                    botonConfirmar.disabled =
                        false;


                    botonConfirmar.textContent =
                        "Reproyectar";

                }

            }
        );

}


// ==========================================
// 10. BOTÓN CARGAR CAPA
// ==========================================

const uploadButton =
    document.getElementById(
        "uploadButton"
    );


const layerInput =
    document.getElementById(
        "layerInput"
    );


uploadButton.addEventListener(
    "click",
    function () {

        layerInput.click();

    }
);


// ==========================================
// 11. PROCESAR ARCHIVO
// ==========================================

layerInput.addEventListener(
    "change",
    function (event) {

        const file =
            event.target.files[0];


        if (!file) {

            return;

        }


        // ==========================================
        // EXTENSIÓN
        // ==========================================

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


        // ==========================================
        // LEER ARCHIVO
        // ==========================================

        const reader =
            new FileReader();


        reader.onload =
            function (e) {

                try {

                    const geojson =
                        JSON.parse(
                            e.target.result
                        );


                    // ==========================================
                    // VALIDAR GEOJSON
                    // ==========================================

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


                    // ==========================================
                    // DETECTAR CRS
                    // ==========================================

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


                    // ==========================================
                    // CREAR CAPA
                    // ==========================================

                    const nuevaCapa =
                        crearCapaGeoJSON(
                            geojson
                        );


                    // ==========================================
                    // AGREGAR AL MAPA
                    // ==========================================

                    nuevaCapa.addTo(
                        map
                    );


                    // ==========================================
                    // AJUSTAR MAPA
                    // ==========================================

                    try {

                        const bounds =
                            nuevaCapa.getBounds();


                        if (
                            bounds.isValid()
                        ) {

                            map.fitBounds(
                                bounds,
                                {
                                    padding: [30, 30]
                                }
                            );

                        }

                    }
                    catch (error) {

                        console.log(
                            "No fue posible ajustar el zoom."
                        );

                    }


                    // ==========================================
                    // CANTIDAD DE ENTIDADES
                    // ==========================================

                    const cantidad =
                        geojson.features.length;


                    // ==========================================
                    // AGREGAR AL PANEL
                    // ==========================================

                    agregarCapaAlPanel(
                        file.name,
                        nuevaCapa,
                        cantidad,
                        crs,
                        geojson
                    );


                    // ==========================================
                    // CONFIRMACIÓN
                    // ==========================================

                    alert(
                        `Capa "${file.name}" cargada correctamente.`
                    );


                    // ==========================================
                    // LIMPIAR INPUT
                    // ==========================================

                    layerInput.value =
                        "";

                }

                catch (error) {

                    console.error(
                        "Error procesando GeoJSON:",
                        error
                    );


                    alert(
                        `No fue posible cargar el archivo.

${error.message}`
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