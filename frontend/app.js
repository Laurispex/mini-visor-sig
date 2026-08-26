// ==========================================
// MINI VISOR SIG
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
            '&copy; OpenStreetMap contributors'
    }
).addTo(map);


// ==========================================
// 3. CARGAR CAPA GEOJSON DE PRUEBA
// ==========================================

fetch("../data/ciudades.geojson")
    .then(response => {

        if (!response.ok) {
            throw new Error("No se pudo cargar el GeoJSON");
        }

        return response.json();

    })
    .then(data => {

        const ciudadesLayer = L.geoJSON(data, {

            pointToLayer: function(feature, latlng) {

                return L.circleMarker(
                    latlng,
                    {
                        radius: 7,
                        fillColor: "#e58b2a",
                        color: "#ffffff",
                        weight: 2,
                        fillOpacity: 0.95
                    }
                );

            },

            onEachFeature: function(feature, layer) {

                const datos = feature.properties;

                layer.bindTooltip(
                    `
                    <strong>${datos.nombre}</strong><br>
                    Departamento: ${datos.departamento}<br>
                    Población: ${datos.poblacion}
                    `,
                    {
                        direction: "top"
                    }
                );

                layer.bindPopup(
                    `
                    <div style="min-width: 190px">

                        <h3>${datos.nombre}</h3>

                        <p>
                            <strong>Departamento:</strong>
                            ${datos.departamento}
                        </p>

                        <p>
                            <strong>Población:</strong>
                            ${datos.poblacion}
                        </p>

                    </div>
                    `
                );

            }

        });

        ciudadesLayer.addTo(map);

        console.log(
            "Capa GeoJSON cargada correctamente"
        );

    })
    .catch(error => {

        console.error(
            "Error cargando la capa:",
            error
        );

    });



// ==========================================
// 5. COORDENADAS DEL CURSOR
// ==========================================

map.on("mousemove", function(event) {

    const lat =
        event.latlng.lat.toFixed(6);

    const lng =
        event.latlng.lng.toFixed(6);


    document.getElementById(
        "coordinates"
    ).textContent =
        `${lng}, ${lat}`;


    document.getElementById(
        "cursor-info"
    ).textContent =
        `CURSOR: ${lng}, ${lat}`;

});


// ==========================================
// 6. PANEL DINÁMICO DE CAPAS
// ==========================================

const layersContainer =
    document.getElementById("layersContainer");


function agregarCapaAlPanel(
    nombre,
    capa,
    cantidad
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

            <button class="visibility active">
                ●
            </button>

        </div>


        <div class="layer-info">

            <span class="epsg">
                CRS: No definido
            </span>

            <span>
                ${cantidad} entidades
            </span>

        </div>

    `;


    layersContainer.appendChild(
        layerCard
    );


    // ==========================================
    // CONTROL DE VISIBILIDAD
    // ==========================================

    const visibilityButton =
        layerCard.querySelector(
            ".visibility"
        );


    visibilityButton.addEventListener(
        "click",
        function() {

            if (
                map.hasLayer(capa)
            ) {

                map.removeLayer(
                    capa
                );

                visibilityButton.textContent =
                    "○";

                visibilityButton.classList
                    .remove("active");

            } else {

                map.addLayer(
                    capa
                );

                visibilityButton.textContent =
                    "●";

                visibilityButton.classList
                    .add("active");

            }

        }
    );

}


// ==========================================
// 7. CARGAR ARCHIVO GEOJSON
// ==========================================

const uploadButton =
    document.getElementById("uploadButton");

const layerInput =
    document.getElementById("layerInput");


uploadButton.addEventListener(
    "click",
    function() {

        layerInput.click();

    }
);


layerInput.addEventListener(
    "change",
    function(event) {

        const file =
            event.target.files[0];

        if (!file) {
            return;
        }


        // ==========================================
        // VERIFICAR EXTENSIÓN
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

            return;
        }


        // ==========================================
        // LEER ARCHIVO
        // ==========================================

        const reader =
            new FileReader();


        reader.onload =
            function(e) {

                try {

                    const geojson =
                        JSON.parse(
                            e.target.result
                        );


                    // ==========================================
                    // CREAR CAPA
                    // ==========================================

                    const nuevaCapa =
                        L.geoJSON(
                            geojson,
                            {

                                style: {

                                    color: "#087f72",

                                    weight: 2,

                                    fillOpacity: 0.25

                                },


                                pointToLayer:
                                    function(
                                        feature,
                                        latlng
                                    ) {

                                        return L.circleMarker(
                                            latlng,
                                            {

                                                radius: 7,

                                                fillColor: "#e58b2a",

                                                color: "#ffffff",

                                                weight: 2,

                                                fillOpacity: 0.95

                                            }
                                        );

                                    },


                                onEachFeature:
                                    function(
                                        feature,
                                        layer
                                    ) {

                                        const datos =
                                            feature.properties || {};


                                        let contenido =
                                            "<strong>Información</strong><br><br>";


                                        Object.entries(
                                            datos
                                        ).forEach(
                                            ([clave, valor]) => {

                                                contenido +=
                                                    `<strong>${clave}:</strong> ${valor}<br>`;

                                            }
                                        );


                                        layer.bindPopup(
                                            contenido
                                        );

                                    }

                            }
                        );


                    // ==========================================
                    // AGREGAR AL MAPA
                    // ==========================================

                    nuevaCapa.addTo(
                        map
                    );


                    // ==========================================
                    // AJUSTAR ZOOM
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

                    } catch (error) {

                        console.log(
                            "No fue posible ajustar el zoom."
                        );

                    }


                    // ==========================================
                    // AGREGAR AL PANEL
                    // ==========================================

                    const cantidad =
                        geojson.features
                            ? geojson.features.length
                            : 0;


                    agregarCapaAlPanel(
                        file.name,
                        nuevaCapa,
                        cantidad
                    );


                    // ==========================================
                    // MENSAJE
                    // ==========================================

                    console.log(
                        `Capa "${file.name}" cargada correctamente.`
                    );


                    alert(
                        `Capa "${file.name}" cargada correctamente.`
                    );

                }


                catch (error) {

                    console.error(
                        "Error leyendo GeoJSON:",
                        error
                    );


                    alert(
                        "El archivo no es un GeoJSON válido."
                    );

                }

            };


        reader.readAsText(
            file
        );

    }
);