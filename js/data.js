/* Lee el Excel (SheetJS) y lo convierte en proyectos. Respaldo: data/catalogo.js */
const SI = v => /^s[ií]$/i.test(String(v == null ? "" : v).trim());
const num = v => { const n = parseFloat(v); return isFinite(n) ? n : undefined; };
function drive(u, w) {
    const m = String(u || "").match(/\/d\/([\w-]+)|[?&]id=([\w-]+)/);
    return m ? "https://lh3.googleusercontent.com/d/" + (m[1] || m[2]) + (w ? "=w" + w : "") : String(u || "").trim();
}
const conTimeout = (p, ms) => Promise.race([p, new Promise((_, no) => setTimeout(() => no(new Error("tiempo agotado")), ms))]);
function leerHojas(buf) {
    const wb = XLSX.read(buf, { type: "array" }), h = {};
    wb.SheetNames.forEach(n => h[n] = XLSX.utils.sheet_to_json(wb.Sheets[n], { header: 1, defval: "", raw: false }));
    return h;
}
function b64url(t) { return btoa(unescape(encodeURIComponent(t))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); }
// Formas de descargar EL MISMO enlace compartido (sin modificar tu URL)
function urlsOnline(u) {
    const g = u.match(/docs\.google\.com\/spreadsheets\/d\/([\w-]+)/) || u.match(/drive\.google\.com\/file\/d\/([\w-]+)/);
    if (g) return [
        "https://docs.google.com/spreadsheets/d/" + g[1] + "/export?format=xlsx",
        "https://drive.usercontent.google.com/download?id=" + g[1] + "&export=download&confirm=t",
        "https://drive.google.com/uc?export=download&id=" + g[1]
    ];
    return ["https://api.onedrive.com/v1.0/shares/u!" + b64url(u) + "/root/content"];
}
async function bajarXlsx(url, ms) {
    const r = await conTimeout(fetch(url), ms);
    if (!r.ok) throw new Error("HTTP " + r.status);
    const buf = await r.arrayBuffer(), h = new Uint8Array(buf.slice(0, 2));
    if (!(h[0] === 0x50 && h[1] === 0x4B)) throw new Error("no devolvió el archivo Excel (revisa que el enlace sea público: \"Cualquier persona con el enlace\")");
    return buf;
}
async function leerLibro(bust) {
    const ms = CONFIG.TIMEOUT_MS || 12000, motivos = [];
    // 1) Excel en línea (Google Drive u OneDrive) - la fuente principal
    if (CONFIG.XLSX_ONLINE_URL) {
        for (const url of urlsOnline(CONFIG.XLSX_ONLINE_URL.trim())) {
            try {
                const h = leerHojas(await bajarXlsx(url, ms));
                if (!h.Proyectos || h.Proyectos.length < 3) throw new Error("el Excel en línea no tiene la hoja Proyectos");
                window.FUENTE_DATOS =" "; return h;
            } catch (e) {
                const m = (e && e.message) || String(e);
                motivos.push(m === "Failed to fetch" ? "el navegador bloqueó la descarga (CORS o sin conexión)" : m);
                console.warn("Excel en línea falló:", e);
            }
        }
    }
    // 2) Respaldo: solo si lo activas en config.js (USAR_RESPALDO: true)
    if (CONFIG.USAR_RESPALDO) {
        try {
            const r = await fetch(CONFIG.XLSX_URL + (bust ? "?t=" + Date.now() : ""), { cache: "no-store" });
            if (!r.ok) throw new Error(r.status);
            const h = leerHojas(await r.arrayBuffer());
            window.FUENTE_DATOS = "respaldo (data/catalogo.xlsx)"; return h;
        } catch (e) {
            if (window.CATALOGO_HOJAS) { window.FUENTE_DATOS = "respaldo (data/catalogo.js)"; return window.CATALOGO_HOJAS; }
        }
    }
    throw new Error(motivos.join(" | ") || "no hay Excel en línea configurado");
}
function tabla(filas) {
    const h = (filas[0] || []).map(x => String(x).trim());
    return filas.slice(1).map(f => { const o = {}; h.forEach((k, i) => { if (k) o[k] = String(f[i] == null ? "" : f[i]).trim(); }); return o; });
}
function bloques(filas) {            // hojas con formato Campo | Valor repetido por proyecto
    const out = []; let b = null;
    filas.forEach(f => {
        const k = String(f[0]).trim(), v = String(f[1] == null ? "" : f[1]).trim();
        if (k.toLowerCase() === "idproyecto") { b = {}; out.push(b); }
        if (b && k && k !== "Campo") b[k] = v;
    });
    return out;
}
async function cargarCatalogo(bust) {
    const h = await leerLibro(bust);
    const cli = {}; (h.Proyecto || []).forEach(f => { const k = String(f[0]).trim(); if (k) cli[k] = String(f[1] == null ? "" : f[1]).trim(); });
    const por = n => tabla(h[n] || []).filter(x => SI(x.activo));
    const esc = por("Escenas").filter(x => x.imagen360), lot = por("Lotes").filter(x => x.escena),
          nav = por("Navegacion").filter(x => x.escenaOrigen && x.escenaDestino), est = por("Estructuras").filter(x => x.escena),
          age = por("Agentes").filter(x => x.nombre && x.whatsapp);
    const tex = tabla(h.TEXTOS || []).filter(x => x.texto && x.escena_id);
    const ext = por("LinksExternos").filter(x => x.escena && (x.link || x.escenaDestino)), med = por("Media").filter(x => x.escena && x.link);
    const tpr = por("Productos"), tic = por("TiendaIconos").filter(x => x.escena), pol = por("PoligonosLotes"), pvx = por("PoligonosVertices"), m3d = por("Modelos3D").filter(x => x.escena && x.modelo);
    const tcf = {}; bloques(h.TiendaConfig || []).forEach(b => tcf[b.idProyecto] = b);
    const uic = tabla(h.UIConfig || []).filter(x => x.idProyecto && SI(x.activo));
    const brj = {}; bloques(h.BrujulaConfig || []).forEach(b => brj[b.idProyecto] = b);
    const mine = (a, id) => a.filter(x => x.idProyecto === id);
    const proyectos = bloques(h.Proyectos || []).filter(p => p.idProyecto && SI(p.activo))
        .sort((a, b) => (num(a.orden) || 99) - (num(b.orden) || 99))
        .map(p => Object.assign(p, {
            escenas: mine(esc, p.idProyecto), lotes: mine(lot, p.idProyecto), nav: mine(nav, p.idProyecto),
            estructuras: mine(est, p.idProyecto), textos: mine(tex, p.idProyecto), agentes: mine(age, p.idProyecto), brujula: brj[p.idProyecto] || {}, ui: mine(uic, p.idProyecto)[0] || {}, externos: mine(ext, p.idProyecto), media: mine(med, p.idProyecto),
            tienda: { cfg: tcf[p.idProyecto] || {}, productos: mine(tpr, p.idProyecto), iconos: mine(tic, p.idProyecto) },
            poligonos: mine(pol, p.idProyecto), vertices: mine(pvx, p.idProyecto), modelos: mine(m3d, p.idProyecto)
        }));
    return { cli, proyectos };
}
