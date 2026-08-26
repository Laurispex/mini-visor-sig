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
// 6. CARGAR ARCHIVO GEOJSON
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


        // Verificar que sea GeoJSON
        const extension =
            file.name.split(".").pop().toLowerCase();


        if (
            extension !== "geojson" &&
            extension !== "json"
        ) {

            alert(
                "Por ahora solo se pueden cargar archivos GeoJSON."
            );

            return;
        }


        // Leer archivo
        const reader =
            new FileReader();


        reader.onload =
            function(e) {

                try {

                    const geojson =
                        JSON.parse(
                            e.target.result
                        );


                    // Crear capa
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


                    // Agregar al mapa
                    nuevaCapa.addTo(map);


                    // Ajustar mapa a la nueva capa
                    try {

                        map.fitBounds(
                            nuevaCapa.getBounds(),
                            {
                                padding: [30, 30]
                            }
                        );

                    } catch (error) {

                        console.log(
                            "No fue posible ajustar el zoom."
                        );

                    }


                    console.log(
                        `Capa "${file.name}" cargada correctamente.`
                    );


                    alert(
                        `Capa "${file.name}" cargada correctamente.`
                    );


                } catch (error) {

                    console.error(
                        "Error leyendo GeoJSON:",
                        error
                    );


                    alert(
                        "El archivo no es un GeoJSON válido."
                    );

                }

            };


        reader.readAsText(file);

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

        console.log(
            "Archivo seleccionado:",
            file.name
        );

        alert(
            `Archivo seleccionado: ${file.name}`
        );

    }
);