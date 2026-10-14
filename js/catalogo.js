const cont = document.getElementById("catalogo");
const el = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x !== undefined) e.textContent = x; return e; };
let CAT = null;

function cabecera() {
    const c = CAT.cli;
    document.getElementById("cliente").textContent = c.nombreCliente || "Catálogo 360";
    document.getElementById("subcliente").textContent = c.subtituloCliente || "";
    const lg = document.getElementById("logo");
    if (c.logoCliente) { lg.src = drive(c.logoCliente); lg.classList.remove("oculto"); }
    document.getElementById("wa").href = "https://wa.me/" + (c.whatsappGeneral || "") + "?text=" + encodeURIComponent(c.mensajeWhatsAppGeneral || "");
}
function tarjeta(p) {
    const c = el("article", "card"), th = el("div", "thumb");
    const portada = p.portadaProyecto || (p.escenas[0] && p.escenas[0].imagen360);
    if (portada) { const i = el("img"); i.src = drive(portada); i.alt = p.nombreProyecto; i.loading = "lazy"; i.onerror = () => { i.remove(); th.textContent = "360"; }; th.appendChild(i); }
    else th.textContent = "360";
    const b = el("div", "cuerpo");
    b.append(el("h3", "", p.nombreProyecto || p.idProyecto), el("div", "sub", p.subtituloProyecto || "Recorrido 360"));
    const t = el("div", "tags");
    [p.idProyecto, "Tour 360", SI(p.tiendaActiva) ? "Tienda" : ""].filter(Boolean).forEach(x => t.appendChild(el("span", "tag", x)));
    b.append(t, el("p", "desc", p.descripcionProyecto || "Explora este proyecto en recorrido interactivo 360."));
    const bt = el("div", "btns"), a = el("a", "btn ok", "Entrar");
    a.href = "tour.html?id=" + encodeURIComponent(p.idProyecto);
    const u = el("button", "btn", "Actualizar"); u.type = "button"; u.onclick = () => render(true, u);
    bt.append(a, u); b.appendChild(bt); c.append(th, b);
    return c;
}
async function render(bust, btn) {
    if (btn) { btn.disabled = true; btn.textContent = "Actualizando…"; }
    try {
        CAT = await cargarCatalogo(bust); cabecera(); document.getElementById("fuente").textContent = "Datos: " + (window.FUENTE_DATOS || "");
        cont.replaceChildren(...(CAT.proyectos.length ? CAT.proyectos.map(tarjeta) : [el("p", "vacio", "No hay proyectos con activo = SI en la hoja Proyectos.")]));
    } catch (e) {
        cont.replaceChildren(el("p", "vacio", "No se pudo leer tu Excel en línea. Motivo: " + e.message));
        console.error(e);
    }
}
document.getElementById("recargar").onclick = () => render(true);
render();
