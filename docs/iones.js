// Cationes y aniones para puzles de formulación y nomenclatura (por ahora, compuestos binarios).
//
// Cada ion: id, f (fórmula; los dígitos son subíndices), carga (entero con signo), elem/nombre, familia y,
// si el elemento tiene varias valencias, `trad` (adjetivo -oso/-ico de la nomenclatura tradicional).
// `binario: false` = poliatómico (ternarios): ya están en la lista para la siguiente fase, pero no se ofrecen todavía.

export const SUP = { 0: "⁰", 1: "¹", 2: "²", 3: "³", 4: "⁴", 5: "⁵", 6: "⁶", 7: "⁷" };

const C = (f, carga, elem, familia, trad = null, extra = {}) => ({ id: `${f}${carga}+`, f, carga, tipo: "cation", elem, familia, trad, binario: true, ...extra });
const A = (f, carga, nombre, familia, extra = {}) => ({ id: `${f}${Math.abs(carga)}-`, f, carga, tipo: "anion", nombre, familia, binario: true, ...extra });

export const FAMILIAS_CATION = [
  "Hidrógeno", "Alcalinos", "Alcalinotérreos", "Metales de transición", "Metales del bloque p", "Poliatómicos",
];
export const FAMILIAS_ANION = ["Halogenuros", "Calcogenuros", "Nitrogenoideos", "Otros", "Poliatómicos"];

export const CATIONES = [
  C("H", 1, "hidrógeno", "Hidrógeno"),
  // Alcalinos
  C("Li", 1, "litio", "Alcalinos"), C("Na", 1, "sodio", "Alcalinos"), C("K", 1, "potasio", "Alcalinos"),
  C("Rb", 1, "rubidio", "Alcalinos"), C("Cs", 1, "cesio", "Alcalinos"),
  // Alcalinotérreos
  C("Be", 2, "berilio", "Alcalinotérreos"), C("Mg", 2, "magnesio", "Alcalinotérreos"), C("Ca", 2, "calcio", "Alcalinotérreos"),
  C("Sr", 2, "estroncio", "Alcalinotérreos"), C("Ba", 2, "bario", "Alcalinotérreos"),
  // Metales de transición
  C("Ag", 1, "plata", "Metales de transición"),
  C("Cu", 1, "cobre", "Metales de transición", "cuproso"), C("Cu", 2, "cobre", "Metales de transición", "cúprico"),
  C("Au", 1, "oro", "Metales de transición", "auroso"), C("Au", 3, "oro", "Metales de transición", "áurico"),
  C("Zn", 2, "cinc", "Metales de transición"), C("Cd", 2, "cadmio", "Metales de transición"),
  C("Hg", 1, "mercurio", "Metales de transición", "mercurioso"), C("Hg", 2, "mercurio", "Metales de transición", "mercúrico"),
  C("Fe", 2, "hierro", "Metales de transición", "ferroso"), C("Fe", 3, "hierro", "Metales de transición", "férrico"),
  C("Co", 2, "cobalto", "Metales de transición", "cobaltoso"), C("Co", 3, "cobalto", "Metales de transición", "cobáltico"),
  C("Ni", 2, "níquel", "Metales de transición", "niqueloso"), C("Ni", 3, "níquel", "Metales de transición", "niquélico"),
  C("Cr", 2, "cromo", "Metales de transición", "cromoso"), C("Cr", 3, "cromo", "Metales de transición", "crómico"),
  C("Mn", 2, "manganeso", "Metales de transición", "manganoso"), C("Mn", 3, "manganeso", "Metales de transición", "mangánico"),
  C("Mn", 4, "manganeso", "Metales de transición"),
  C("Ti", 3, "titanio", "Metales de transición", "titanoso"), C("Ti", 4, "titanio", "Metales de transición", "titánico"),
  C("Pt", 2, "platino", "Metales de transición", "platinoso"), C("Pt", 4, "platino", "Metales de transición", "platínico"),
  C("Pd", 2, "paladio", "Metales de transición", "paladioso"), C("Pd", 4, "paladio", "Metales de transición", "paládico"),
  // Bloque p
  C("Al", 3, "aluminio", "Metales del bloque p"), C("Ga", 3, "galio", "Metales del bloque p"),
  C("Sn", 2, "estaño", "Metales del bloque p", "estannoso"), C("Sn", 4, "estaño", "Metales del bloque p", "estánnico"),
  C("Pb", 2, "plomo", "Metales del bloque p", "plumboso"), C("Pb", 4, "plomo", "Metales del bloque p", "plúmbico"),
  C("Bi", 3, "bismuto", "Metales del bloque p"),
  C("Sb", 3, "antimonio", "Metales del bloque p", "antimonioso"), C("Sb", 5, "antimonio", "Metales del bloque p", "antimónico"),
  // Poliatómicos (próxima fase)
  { ...C("NH4", 1, "amonio", "Poliatómicos"), binario: false, poli: true },
];

export const ANIONES = [
  // Halogenuros
  A("F", -1, "fluoruro", "Halogenuros"), A("Cl", -1, "cloruro", "Halogenuros"),
  A("Br", -1, "bromuro", "Halogenuros"), A("I", -1, "yoduro", "Halogenuros"),
  // Calcogenuros
  A("O", -2, "óxido", "Calcogenuros"), A("S", -2, "sulfuro", "Calcogenuros"),
  A("Se", -2, "seleniuro", "Calcogenuros"), A("Te", -2, "telururo", "Calcogenuros"),
  A("O2", -2, "peróxido", "Calcogenuros", { id: "O2-peroxido" }),
  // Nitrogenoideos
  A("N", -3, "nitruro", "Nitrogenoideos"), A("P", -3, "fosfuro", "Nitrogenoideos"),
  A("As", -3, "arseniuro", "Nitrogenoideos"), A("Sb", -3, "antimoniuro", "Nitrogenoideos", { id: "Sb3-anion" }),
  // Otros
  A("H", -1, "hidruro", "Otros"), A("C", -4, "carburo", "Otros"), A("Si", -4, "siliciuro", "Otros"), A("B", -3, "boruro", "Otros"),
  // Poliatómicos (próxima fase)
  ...[
    ["OH", -1, "hidróxido"], ["NO3", -1, "nitrato"], ["NO2", -1, "nitrito"], ["ClO3", -1, "clorato"], ["ClO4", -1, "perclorato"],
    ["CN", -1, "cianuro"], ["MnO4", -1, "permanganato"], ["HCO3", -1, "hidrogenocarbonato"],
    ["SO4", -2, "sulfato"], ["SO3", -2, "sulfito"], ["CO3", -2, "carbonato"], ["CrO4", -2, "cromato"], ["Cr2O7", -2, "dicromato"],
    ["PO4", -3, "fosfato"],
  ].map(([f, c, n]) => ({ ...A(f, c, n, "Poliatómicos"), binario: false, poli: true })),
];

export const TODOS = [...CATIONES, ...ANIONES];

// Elementos con más de una valencia en la lista → llevan número de oxidación en la nomenclatura de Stock.
const valencias = {};
for (const c of CATIONES) (valencias[c.elem] ||= new Set()).add(c.carga);
for (const c of CATIONES) c.variable = valencias[c.elem].size > 1;

// ---------------------------------------------------------------------
// Fórmulas y nombres
// ---------------------------------------------------------------------

const ROMANOS = ["", "I", "II", "III", "IV", "V", "VI", "VII"];
const PREFIJOS = ["", "mono", "di", "tri", "tetra", "penta", "hexa", "hepta", "octa"];
const gcd = (a, b) => (b ? gcd(b, a % b) : Math.abs(a));

/** Cuántos cationes y aniones hacen falta para que la carga total sea cero. */
export function proporcion(cat, an) {
  const a = Math.abs(cat.carga), b = Math.abs(an.carga), g = gcd(a, b);
  return { nCat: b / g, nAn: a / g };
}

const esSimple = (f) => /^[A-Z][a-z]?$/.test(f);
const grupo = (f, n) => (n === 1 ? f : esSimple(f) ? `${f}${n}` : `(${f})${n}`);

const ESPECIALES = {
  H2O: "agua", HCl: "ácido clorhídrico (en disolución acuosa)", HF: "ácido fluorhídrico (en disolución acuosa)",
  HBr: "ácido bromhídrico (en disolución acuosa)", HI: "ácido yodhídrico (en disolución acuosa)",
  H2S: "ácido sulfhídrico (en disolución acuosa)", H2Se: "ácido selenhídrico (en disolución acuosa)",
  H2Te: "ácido telurhídrico (en disolución acuosa)", NH3: "amoníaco", H2O2: "agua oxigenada (peróxido de hidrógeno)",
  CH4: "metano", H4Si: "silano", BH3: "borano", PH3: "fosfano", AsH3: "arsano",
};

function conPrefijo(pref, nombre) {
  if (pref === "mono" && nombre === "óxido") return "monóxido";
  if (pref === "tetra" && nombre === "óxido") return "tetraóxido";
  return pref + nombre;
}

/** Compuesto binario catión + anión: fórmula, proporción y nombres (Stock, tradicional, sistemática). */
export function compuesto(cat, an) {
  const { nCat, nAn } = proporcion(cat, an);
  // La fórmula se escribe como en clase: el hidrógeno delante, salvo en los hidruros (anión H-), y el resto catión + anión.
  const formula = grupo(cat.f, nCat) + grupo(an.f, nAn);
  const stock = `${an.nombre} de ${cat.elem}${cat.variable ? `(${ROMANOS[cat.carga]})` : ""}`;
  const trad = cat.variable ? (cat.trad ? `${an.nombre} ${cat.trad}` : null) : stock;
  const sistematica = `${conPrefijo(PREFIJOS[nAn], an.nombre)} de ${nCat > 1 ? PREFIJOS[nCat] : ""}${cat.elem}`;
  return {
    cat, an, nCat, nAn, formula, stock, trad, sistematica,
    especial: ESPECIALES[formula] || null,
    clave: `${cat.id}|${an.id}`,
  };
}

export const porId = (id) => TODOS.find((i) => i.id === id);

/** Formato de la carga para mostrarla: 2+, 3−, + … */
export function cargaTexto(ion, signo = "−") {
  const n = Math.abs(ion.carga);
  return (n > 1 ? String(n) : "") + (ion.carga > 0 ? "+" : signo);
}

/** Fórmula con superíndice de carga para la interfaz: Fe³⁺, Cl⁻ … (los subíndices numéricos se dejan como dígitos pequeños). */
export function ionBonito(ion) {
  const n = Math.abs(ion.carga);
  const sup = (n > 1 ? String(n).split("").map((d) => SUP[d]).join("") : "") + (ion.carga > 0 ? "⁺" : "⁻");
  const f = ion.f.replace(/\d/g, (d) => "₀₁₂₃₄₅₆₇₈₉"[d]);
  return f + sup;
}
