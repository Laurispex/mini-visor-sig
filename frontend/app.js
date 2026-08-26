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
// 3. CIUDADES DE PRUEBA
// ==========================================

const ciudades = [

    {
        nombre: "Bogotá",
        departamento: "Bogotá D.C.",
        poblacion: "Dato de prueba",
        lat: 4.7110,
        lng: -74.0721
    },

    {
        nombre: "Medellín",
        departamento: "Antioquia",
        poblacion: "Dato de prueba",
        lat: 6.2442,
        lng: -75.5812
    },

    {
        nombre: "Cali",
        departamento: "Valle del Cauca",
        poblacion: "Dato de prueba",
        lat: 3.4516,
        lng: -76.5320
    },

    {
        nombre: "Cartagena",
        departamento: "Bolívar",
        poblacion: "Dato de prueba",
        lat: 10.3910,
        lng: -75.4794
    },

    {
        nombre: "Santa Marta",
        departamento: "Magdalena",
        poblacion: "Dato de prueba",
        lat: 11.2408,
        lng: -74.1990
    }

];


// ==========================================
// 4. CREAR PUNTOS
// ==========================================

ciudades.forEach(ciudad => {

    const marker = L.circleMarker(
        [ciudad.lat, ciudad.lng],
        {
            radius: 7,

            fillColor: "#e58b2a",

            color: "#ffffff",

            weight: 2,

            fillOpacity: 0.95
        }
    ).addTo(map);


    // Información al pasar el cursor
    marker.bindTooltip(
        `
        <strong>${ciudad.nombre}</strong><br>
        Departamento: ${ciudad.departamento}<br>
        Población: ${ciudad.poblacion}
        `,
        {
            direction: "top"
        }
    );


    // Información al hacer clic
    marker.bindPopup(
        `
        <div style="min-width: 190px">

            <h3 style="margin-bottom: 8px;">
                ${ciudad.nombre}
            </h3>

            <p>
                <strong>Departamento:</strong>
                ${ciudad.departamento}
            </p>

            <p>
                <strong>Población:</strong>
                ${ciudad.poblacion}
            </p>

            <p>
                <strong>Latitud:</strong>
                ${ciudad.lat}
            </p>

            <p>
                <strong>Longitud:</strong>
                ${ciudad.lng}
            </p>

        </div>
        `
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
// 6. CARGAR ARCHIVO
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

        console.log(
            "Archivo seleccionado:",
            file.name
        );

        alert(
            `Archivo seleccionado: ${file.name}`
        );

    }
);