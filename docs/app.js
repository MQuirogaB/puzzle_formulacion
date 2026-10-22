import opentype from "opentype.js";

import { CATIONES, ANIONES, FAMILIAS_CATION, FAMILIAS_ANION, compuesto, ionBonito } from "./iones.js?v=1";
import { DEFAULTS, sanear, construirPieza, colocar } from "./pieza.js?v=1";
import { construirSVG, envolverSVG } from "./svg.js?v=1";
import { construirSTL, aBinario, zip } from "./stl.js?v=1";

const el = (id) => document.getElementById(id);

window.addEventListener("error", (e) => {
  const s = el("status");
  if (s) { s.textContent = "Error: " + (e.message || "no se pudo iniciar") + ". Prueba a recargar con Ctrl+Shift+R."; s.classList.add("error"); }
});

const statusEl = el("status");
const holder = el("svg-holder");

// ---------------------------------------------------------------------
// Tipografías
// ---------------------------------------------------------------------

const FONTS = [
  { id: "lexend", nombre: "Lexend", archivo: "lexend-700" },
  { id: "atkinson", nombre: "Atkinson Hyperlegible", archivo: "atkinson-hyperlegible-700" },
  { id: "nunito", nombre: "Nunito", archivo: "nunito-700" },
  { id: "montserrat", nombre: "Montserrat", archivo: "montserrat-700" },
];
const cacheFuentes = {};
async function cargarFuente(archivo) {
  if (!cacheFuentes[archivo]) {
    const res = await fetch(`./fonts/${archivo}.woff`);
    if (!res.ok) throw new Error("no se pudo cargar la letra");
    cacheFuentes[archivo] = opentype.parse(await res.arrayBuffer());
  }
  return cacheFuentes[archivo];
}
const fuenteElegida = () => FONTS.find((f) => f.id === el("fontFamily").value) || FONTS[0];

// ---------------------------------------------------------------------
// Estado: iones marcados y compuestos del puzle
// ---------------------------------------------------------------------

const marcados = new Set();              // ids de iones marcados
let compuestos = [];                     // [{ cat, an, copias }]

const NUM_FIELDS = ["unidad", "ancho", "tolerancia", "tamanoTexto", "anchoHoja", "separacion", "grosor", "altoTexto"];

function leerParametros() {
  const p = {};
  for (const k of NUM_FIELDS) { const v = Number(el(k).value); p[k] = el(k).value !== "" && Number.isFinite(v) ? v : DEFAULTS[k]; }
  p.modoTexto = el("modoTexto").value;
  return sanear(p);
}

function aplicarDefectos() {
  for (const k of NUM_FIELDS) el(k).value = DEFAULTS[k];
  el("modoTexto").value = DEFAULTS.modoTexto;
  el("fontFamily").value = FONTS[0].id;
  el("separar").checked = false;
}

// ---------------------------------------------------------------------
// Selector de iones
// ---------------------------------------------------------------------

function pintarIones(cont, lista, familias) {
  cont.replaceChildren();
  for (const fam of familias) {
    const ions = lista.filter((i) => i.binario && i.familia === fam);
    if (!ions.length) continue;
    const d = document.createElement("details");
    d.open = true;
    const s = document.createElement("summary");
    s.textContent = fam;
    const chips = document.createElement("div");
    chips.className = "chips";
    for (const ion of ions) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "chip";
      b.dataset.id = ion.id;
      b.dataset.buscar = `${ion.f} ${ion.elem || ion.nombre} ${ion.trad || ""}`.toLowerCase();
      b.setAttribute("aria-pressed", "false");
      b.title = ion.elem ? `${ion.elem}${ion.trad ? " (" + ion.trad + ")" : ""}` : ion.nombre;
      b.innerHTML = `${ionBonito(ion)}<span class="nom">${ion.elem || ion.nombre}</span>`;
      b.addEventListener("click", () => {
        if (marcados.has(ion.id)) marcados.delete(ion.id); else marcados.add(ion.id);
        b.setAttribute("aria-pressed", String(marcados.has(ion.id)));
        actualizarSeleccion();
      });
      chips.append(b);
    }
    d.append(s, chips);
    cont.append(d);
  }
}

const porId = (id) => [...CATIONES, ...ANIONES].find((i) => i.id === id);

function actualizarSeleccion() {
  const cs = [...marcados].map(porId).filter((i) => i.carga > 0), as = [...marcados].map(porId).filter((i) => i.carga < 0);
  el("add-btn").disabled = !(cs.length && as.length);
  el("add-btn").textContent = cs.length && as.length ? `Añadir ${cs.length * as.length} compuesto${cs.length * as.length === 1 ? "" : "s"}` : "Añadir compuestos";
  el("sel-nota").textContent = cs.length && as.length
    ? `${cs.length} catión${cs.length === 1 ? "" : "es"} × ${as.length} anion${as.length === 1 ? "" : "es"}.`
    : "Marca uno o varios cationes y aniones; se añadirán todas las combinaciones.";
}

function filtrar() {
  const q = el("filtro").value.trim().toLowerCase();
  for (const b of document.querySelectorAll(".chip")) b.classList.toggle("oculto", !!q && !b.dataset.buscar.includes(q));
  for (const d of document.querySelectorAll(".iones details")) d.hidden = !!q && ![...d.querySelectorAll(".chip")].some((b) => !b.classList.contains("oculto"));
}

function anadirCompuestos() {
  const cs = [...marcados].map(porId).filter((i) => i.carga > 0), as = [...marcados].map(porId).filter((i) => i.carga < 0);
  for (const c of cs) for (const a of as) {
    const k = compuesto(c, a);
    if (!compuestos.some((x) => x.k.clave === k.clave)) compuestos.push({ k, copias: 1 });
  }
  pintarLista();
  scheduleGenerate();
}

// ---------------------------------------------------------------------
// Lista de compuestos
// ---------------------------------------------------------------------

function formulaHTML(f) { return f.replace(/(\d+)/g, "<sub>$1</sub>"); }

function pintarLista() {
  const lista = el("lista");
  lista.replaceChildren();
  if (!compuestos.length) {
    lista.innerHTML = `<p class="vacio-msg">Todavía no hay compuestos. Marca iones arriba y pulsa «Añadir compuestos».</p>`;
  }
  compuestos.forEach((x, i) => {
    const k = x.k;
    const fila = document.createElement("div");
    fila.className = "comp";
    fila.innerHTML = `<div><div class="f">${formulaHTML(k.formula)} <span class="n">· ${ionBonito(k.cat)} + ${ionBonito(k.an)}</span></div>
      <div class="n">${k.especial ? `<strong>${k.especial}</strong><br>` : ""}Stock: ${k.stock}${k.trad && k.trad !== k.stock ? `<br>Tradicional: ${k.trad}` : ""}<br>Sistemática: ${k.sistematica}</div></div>
      <label class="n" title="Cuántos juegos de este compuesto">× <input type="number" min="1" max="20" step="1" value="${x.copias}" aria-label="Copias de ${k.formula}"></label>
      <button class="quitar" type="button" aria-label="Quitar ${k.formula}">✕</button>`;
    fila.querySelector("input").addEventListener("input", (e) => { x.copias = Math.max(1, Math.min(20, Number(e.target.value) || 1)); resumen(); scheduleGenerate(); });
    fila.querySelector(".quitar").addEventListener("click", () => { compuestos.splice(i, 1); pintarLista(); scheduleGenerate(); });
    lista.append(fila);
  });
  resumen();
}

function listaIones() {
  // cada compuesto aporta sus cationes y sus aniones, tantas veces como copias
  const out = [];
  for (const x of compuestos) for (let c = 0; c < x.copias; c++) {
    for (let i = 0; i < x.k.nCat; i++) out.push(x.k.cat);
    for (let i = 0; i < x.k.nAn; i++) out.push(x.k.an);
  }
  return out;
}

function resumen() {
  const n = listaIones().length;
  el("resumen").textContent = n ? `${n} pieza${n === 1 ? "" : "s"} en total (${compuestos.length} compuesto${compuestos.length === 1 ? "" : "s"}).` : "";
}

// ---------------------------------------------------------------------
// Vista previa y descargas
// ---------------------------------------------------------------------

function saveBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

function setStatus(msg, isError = false) { statusEl.textContent = msg; statusEl.classList.toggle("error", isError); }

let estado = null; // { hoja, q, ctx }
let busy = false, pending = false;

async function generate() {
  if (busy) { pending = true; return; }
  busy = true;
  try {
    const q = leerParametros();
    const ions = listaIones();
    if (!ions.length) {
      holder.replaceChildren(); el("stats").textContent = ""; el("avisos").textContent = "";
      estado = null; el("svg-btn").disabled = true; el("stl-btn").disabled = true;
      setStatus("Añade algún compuesto para ver las piezas.");
      return;
    }
    const f = fuenteElegida();
    const fuente = await cargarFuente(f.archivo);
    if (!window.ClipperLib) throw new Error("no se cargó la librería de bordes");
    const ctx = { fuente, clipper: window.ClipperLib };
    // una pieza por ion (los iguales se calculan una vez y se repiten)
    const cache = new Map();
    const piezas = ions.map((ion) => {
      if (!cache.has(ion.id)) cache.set(ion.id, construirPieza(ctx, ion, q));
      return cache.get(ion.id);
    });
    const hoja = colocar(piezas, q);
    const vista = construirSVG(hoja, { vista: true });
    holder.innerHTML = envolverSVG(vista.w, vista.h, vista.inner);
    el("stats").textContent = `${piezas.length} piezas · hoja de ${vista.w.toFixed(0)} × ${vista.h.toFixed(0)} mm`;
    el("avisos").textContent = hoja.ancho > q.anchoHoja + 1e-6 ? "Alguna pieza es más ancha que la hoja: sube el ancho de la hoja." : "";
    estado = { hoja, q, ctx };
    el("svg-btn").disabled = false; el("stl-btn").disabled = false;
    setStatus("Listo. Puedes descargar el SVG o el STL.");
  } catch (err) {
    console.error(err);
    setStatus("Error al generar: " + (err?.message || err), true);
  } finally {
    busy = false;
    if (pending) { pending = false; generate(); }
  }
}

let debounce = null;
function scheduleGenerate() { clearTimeout(debounce); debounce = setTimeout(generate, 220); }

el("svg-btn").addEventListener("click", () => {
  if (!estado) return;
  const s = construirSVG(estado.hoja);
  saveBlob(new Blob([envolverSVG(s.w, s.h, s.inner, "Puzle de formulación")], { type: "image/svg+xml" }), "puzle-formulacion.svg");
});

el("stl-btn").addEventListener("click", () => {
  if (!estado) return;
  try {
    setStatus("Preparando el STL…");
    const archivos = construirSTL(estado.ctx.clipper, estado.hoja, estado.q, { separar: el("separar").checked });
    const datos = archivos.map((a) => ({ nombre: a.nombre, datos: aBinario(a.malla) }));
    if (datos.length === 1) saveBlob(new Blob([datos[0].datos], { type: "model/stl" }), `puzle-formulacion-${datos[0].nombre}`);
    else saveBlob(new Blob([zip(datos.map((d) => ({ nombre: `puzle-formulacion-${d.nombre}`, datos: d.datos })))], { type: "application/zip" }), "puzle-formulacion-stl.zip");
    setStatus(datos.length === 1 ? "STL descargado." : `ZIP con ${datos.length} STL descargado.`);
  } catch (err) {
    console.error(err);
    setStatus("Error al crear el STL: " + (err?.message || err), true);
  }
});

el("soluciones").addEventListener("click", () => {
  if (!compuestos.length) return;
  const esc = (t) => `"${String(t ?? "").replace(/"/g, '""')}"`;
  const filas = [["Fórmula", "Catión", "Anión", "Stock", "Tradicional", "Sistemática", "Nombre común"].map(esc).join(";")];
  for (const { k, copias } of compuestos) filas.push([k.formula, ionBonito(k.cat), ionBonito(k.an), k.stock, k.trad || "", k.sistematica, k.especial || ""].map(esc).join(";"));
  saveBlob(new Blob(["﻿" + filas.join("\r\n")], { type: "text/csv;charset=utf-8" }), "puzle-formulacion-soluciones.csv");
});

// ---------------------------------------------------------------------
// Eventos
// ---------------------------------------------------------------------

el("filtro").addEventListener("input", filtrar);
el("add-btn").addEventListener("click", anadirCompuestos);
el("clear-sel").addEventListener("click", () => { marcados.clear(); for (const b of document.querySelectorAll(".chip")) b.setAttribute("aria-pressed", "false"); actualizarSeleccion(); });
el("vaciar").addEventListener("click", () => { compuestos = []; pintarLista(); scheduleGenerate(); });
for (const k of [...NUM_FIELDS, "modoTexto", "fontFamily"]) { el(k).addEventListener("input", scheduleGenerate); el(k).addEventListener("change", scheduleGenerate); }
el("reset-btn").addEventListener("click", () => { aplicarDefectos(); scheduleGenerate(); });

// arranque
for (const f of FONTS) { const o = document.createElement("option"); o.value = f.id; o.textContent = f.nombre; el("fontFamily").append(o); }
aplicarDefectos();
pintarIones(el("cationes"), CATIONES, FAMILIAS_CATION);
pintarIones(el("aniones"), ANIONES, FAMILIAS_ANION);
// ejemplo inicial
for (const [c, a] of [["Na1+", "Cl1-"], ["Mg2+", "Cl1-"], ["Al3+", "O2-"], ["H1+", "O2-"]]) {
  const k = compuesto(porId(c), porId(a));
  compuestos.push({ k, copias: 1 });
}
pintarLista();
actualizarSeleccion();
generate();
