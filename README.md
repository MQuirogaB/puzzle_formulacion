# Puzle de formulación · STL y SVG

Generador de puzles para aprender **formulación y nomenclatura** (por ahora, compuestos binarios). Pulsas los cationes y aniones que quieras (cada pulsación añade una pieza a la vista previa) y descargas:

- **STL** para imprimir en 3D (letras en relieve, o incrustadas para imprimirlas de otro color).
- **SVG** para cortar con láser (contorno en rojo para cortar y letras en negro para grabar).

Todo ocurre en el navegador; no se sube nada a ningún servidor.

## Cómo encajan las piezas
Un catión de carga *n* es una pieza de alto *n* × «unidad» con *n* pestañas redondas; un anión de carga −*n*, una pieza del mismo alto con *n* huecos. Mg²⁺ (2 pestañas) encaja con dos Cl⁻; Fe³⁺ con tres Cl⁻; dos H⁺ con O²⁻… Solo se completa el rectángulo cuando las cargas se compensan.

## Qué incluye
- Lista larga de iones en `docs/iones.js`: ~45 cationes (alcalinos, alcalinotérreos, transición con varias valencias, bloque p…) y ~17 aniones monoatómicos (halogenuros, calcogenuros, nitrogenoideos, hidruro, carburo…). Los **poliatómicos** (OH⁻, NO₃⁻, SO₄²⁻, PO₄³⁻, NH₄⁺…) ya están en la lista con `binario: false`, listos para la siguiente fase.
- Cada pulsación añade una pieza (puedes repetir iones); para quitar una, púlsala en la vista previa. `iones.js` también calcula fórmulas y nombres (Stock, tradicional, sistemática) de los compuestos binarios, para usarlos más adelante.
- Medidas ajustables: alto por unidad de carga, ancho, holgura, grosor, tamaño y tipografía de las letras, ancho de la hoja.
- STL: relieve (1 archivo) o incrustado (placas + textos), con cationes y aniones juntos o por separado; si hay varios archivos se entregan en un ZIP.

## Estructura
```
docs/
  index.html, app.js, style.css   interfaz
  iones.js                        iones, proporciones y nombres
  pieza.js                        contorno de las piezas, texto y colocación en la hoja
  svg.js                          hoja SVG para láser
  stl.js                          mallas STL (binario) y ZIP
  geo.js                          polígonos (ClipperLib) y utilidades
  vendor/                         clipper.js, earcut.js
  fonts/                          Lexend, Atkinson Hyperlegible, Nunito, Montserrat
tests/run.mjs                     datos, nombres, encaje de piezas, mallas cerradas, ZIP
```

## Desarrollo
```
npm ci
npm test
```
Publicación: GitHub Pages → rama `main`, carpeta `/docs`.

## Siguientes pasos
- Iones poliatómicos y compuestos ternarios (hidróxidos, oxisales…).
- Piezas de ácidos y sales ácidas.

Tipografías: SIL OFL. Bordes: ClipperLib 6.4.2 de Angus Johnson (licencia Boost). Triangulación: earcut 2.2.4 (Mapbox, ISC).
