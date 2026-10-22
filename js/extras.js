/* Funciones avanzadas. Se activan solas cuando su hoja del Excel tiene filas con activo = SI:
   PoligonosLotes + PoligonosVertices, Modelos3D, y TiendaConfig + Productos (+ TiendaIconos). */
window.EXTRAS = { init(c) { poligonos(c); modelos(c); tienda(c); } };

/* ---------- Polígonos de lotes (SVG sobre la imagen 360) ---------- */
function proy(pp, yy, cp, cy) {            // punto (pitch, yaw) -> coordenadas de cámara
    const r = Math.PI / 180, a = pp * r, b = yy * r, p0 = cp * r, y0 = cy * r;
    const x = Math.cos(a) * Math.sin(b), y = Math.sin(a), z = Math.cos(a) * Math.cos(b);
    const x1 = x * Math.cos(y0) - z * Math.sin(y0), z1 = x * Math.sin(y0) + z * Math.cos(y0);
    return { x: x1, y: y * Math.cos(p0) - z1 * Math.sin(p0), z: y * Math.sin(p0) + z1 * Math.cos(p0) };
}
function poligonos(c) {
    const { p, v, verLote } = c, lotes = p.poligonos || [], verts = p.vertices || [], svg = document.getElementById("poligonosSvg");
    if (!lotes.length || !verts.length || !svg) return;
    const NS = "http://www.w3.org/2000/svg", grupos = [];
    lotes.forEach(l => {
        const pts = verts.filter(x => x.idEscena === l.idEscena && x.idLote === l.idLote)
            .sort((a, b) => num(a.orden) - num(b.orden)).map(x => [num(x.pitch), num(x.yaw)]).filter(q => q[0] !== undefined && q[1] !== undefined);
        if (pts.length < 3) return;
        const po = document.createElementNS(NS, "polygon");
        po.setAttribute("fill", l.fill || "#18c964"); po.setAttribute("fill-opacity", num(l.opacity) !== undefined ? num(l.opacity) : 0.3);
        po.setAttribute("stroke", l.stroke || "#fff"); po.setAttribute("stroke-width", num(l.grosor) || 2);
        po.style.cssText = "pointer-events:all;cursor:pointer"; po.onclick = () => verLote(l);
        svg.appendChild(po); grupos.push({ e: l.idEscena, pts, po });
    });
    if (!grupos.length) return;
    let ultimo = "";
    (function ciclo() {
        const W = svg.clientWidth || innerWidth, H = svg.clientHeight || innerHeight, cp = v.getPitch(), cy = v.getYaw(), hf = v.getHfov(), esc = v.getScene();
        const k = [cp, cy, hf, W, H, esc].join();
        if (k !== ultimo) {
            ultimo = k; const f = (W / 2) / Math.tan(hf * Math.PI / 360);
            grupos.forEach(g => {
                const out = []; let ok = g.e === esc;
                for (let i = 0; ok && i < g.pts.length; i++) {
                    const r = proy(g.pts[i][0], g.pts[i][1], cp, cy);
                    if (r.z <= 0.01) ok = false; else out.push((W / 2 + f * r.x / r.z).toFixed(1) + "," + (H / 2 - f * r.y / r.z).toFixed(1));
                }
                g.po.style.display = ok ? "" : "none"; if (ok) g.po.setAttribute("points", out.join(" "));
            });
        }
        requestAnimationFrame(ciclo);
    })();
}

/* ---------- Modelos 3D (.glb) con <model-viewer> ---------- */
function modelos(c) {
    const { p, v, el, pin } = c, $ = id => document.getElementById(id);
    async function abrir(m) {
        const cont = $("mediaCont"); cont.replaceChildren(el("p", "", "Cargando modelo 3D…")); $("mediaTit").textContent = m.titulo || ""; $("visorMedia").classList.remove("oculto");
        try { await import("https://cdn.jsdelivr.net/npm/@google/model-viewer@3.5.0/dist/model-viewer.min.js"); }
        catch (e) { cont.replaceChildren(el("p", "", "No se pudo cargar el visor 3D (revisa tu conexión).")); return; }
        const mv = document.createElement("model-viewer"), at = (k, val) => { if (val) mv.setAttribute(k, val); };
        mv.setAttribute("src", m.modelo.trim()); mv.setAttribute("alt", m.titulo || "Modelo 3D"); mv.setAttribute("camera-controls", ""); mv.setAttribute("touch-action", "pan-y");
        at("poster", m.poster); at("camera-orbit", m.cameraOrbit); at("camera-target", m.cameraTarget); at("field-of-view", m.fieldOfView);
        at("exposure", m.exposure); at("shadow-intensity", m.shadowIntensity);
        if (SI(m.autoRotate)) mv.setAttribute("auto-rotate", ""); if (SI(m.ar)) mv.setAttribute("ar", "");
        mv.style.cssText = "width:" + (num(m.anchoModal) || 88) + "vw;height:" + (num(m.altoModal) || 82) + "vh;background:" + (m.background || "#111") + ";border-radius:12px";
        mv.addEventListener("error", () => cont.replaceChildren(el("p", "", "No se encontró el archivo 3D: " + m.modelo)));
        cont.replaceChildren(mv);
    }
    (p.modelos || []).forEach(m => {
        if (num(m.pitch) === undefined) return;
        const h = pin(m, "🧊", () => abrir(m)), t = num(m["tamañoIcono"]), f0 = h.createTooltipFunc;
        h.createTooltipFunc = d => { f0(d); if (t) { d.style.width = d.style.height = t + "px"; d.style.margin = (-t / 2) + "px 0 0 " + (-t / 2) + "px"; } };
        v.addHotSpot(h, m.escena);
    });
}

/* ---------- Tienda: catálogo, pedido y envío por WhatsApp ---------- */
function tienda(c) {
    const { p, v, el, wa, telGen, pin } = c, T = p.tienda || {}, cfg = T.cfg || {}, prods = T.productos || [];
    if (!SI(cfg.tiendaActiva) || !prods.length) return;
    const mon = cfg.moneda || "", cart = {}, fmt = (n, m) => ((m || mon) ? (m || mon) + " " : "") + (n === undefined ? "" : n.toLocaleString("es", { maximumFractionDigits: 2 }));
    const ov = el("div", "tienda oculto"); ov.style.setProperty("--tp", cfg.colorPrimario || "#1bd459"); ov.style.setProperty("--ts", cfg.colorSecundario || "#f6f9f7");
    const cab = el("div", "t-cab"), x = el("button", "t-x", "×"); x.type = "button"; x.setAttribute("aria-label", "Cerrar tienda"); x.onclick = () => ov.classList.add("oculto");
    if (cfg.logoTienda) { const i = el("img"); i.src = drive(cfg.logoTienda); i.alt = ""; i.onerror = () => i.remove(); cab.appendChild(i); }
    cab.append(el("h2", "", cfg.nombreTienda || p.nombreProyecto || "Tienda"), x);
    const q = el("input"); q.type = "search"; q.placeholder = "Buscar producto"; q.oninput = () => filtrar();
    const chips = el("div", "t-chips"), grid = el("div", "t-grid"), bar = el("button", "btn ok t-bar"), pan = el("div", "t-pan oculto");
    bar.type = "button"; bar.onclick = () => pan.classList.toggle("oculto");
    let cat = "", entrega = "", pago = "";

    function tarjeta(pr) {
        const a = el("article", "t-card"), fotos = [1, 2, 3, 4, 5].map(k => pr["foto" + k]).filter(f => f && !/^PEGA_/i.test(f));
        if (fotos.length) {
            const i = el("img"); let k = 0; i.src = drive(fotos[0]); i.alt = pr.nombre; i.loading = "lazy"; i.onerror = () => i.remove();
            if (fotos.length > 1) { i.title = "Toca para ver más fotos"; i.onclick = () => { k = (k + 1) % fotos.length; i.src = drive(fotos[k]); }; }
            a.appendChild(i);
        }
        const ago = /agotad/i.test(pr.estado), b = el("button", "btn ok mini", ago ? "Agotado" : "Agregar"); b.type = "button"; b.disabled = ago;
        b.onclick = () => { cart[pr.id] = cart[pr.id] || { pr, n: 0 }; cart[pr.id].n++; resumen(); };
        a.append(el("h4", "", pr.nombre), el("small", "", pr.categoria || ""), el("p", "", pr.descripcion || ""), el("strong", "", fmt(num(pr.precioNumero), pr.moneda)), b);
        return a;
    }
    function filtrar() {
        const t = q.value.trim().toLowerCase();
        grid.replaceChildren(...prods.filter(pr => (!cat || pr.categoria === cat) && (!t || [pr.nombre, pr.categoria, pr.etiquetas, pr.descripcion].join(" ").toLowerCase().includes(t))).map(tarjeta));
        if (!grid.children.length) grid.appendChild(el("p", "", "No hay productos con ese filtro."));
    }
    function pintaChips() {
        chips.replaceChildren(...["", ...new Set(prods.map(pr => pr.categoria).filter(Boolean))].map(k => {
            const b = el("button", "t-chip" + (k === cat ? " on" : ""), k || "Todas"); b.type = "button"; b.onclick = () => { cat = k; pintaChips(); filtrar(); }; return b;
        }));
    }
    function opciones(lista, titulo, set) {
        if (!lista.length) return null; const w = el("label", "t-op", titulo), s = el("select"); s.appendChild(new Option("Elige…", ""));
        lista.forEach(o => s.appendChild(new Option(o, o))); s.onchange = () => set(s.value); w.appendChild(s); return w;
    }
    function resumen() {
        const items = Object.values(cart).filter(i => i.n > 0), n = items.reduce((s, i) => s + i.n, 0), tot = items.reduce((s, i) => s + i.n * (num(i.pr.precioNumero) || 0), 0);
        bar.textContent = n ? "Ver pedido (" + n + ")" + (SI(cfg.mostrarTotal) ? " · " + fmt(tot) : "") : "Tu pedido está vacío"; bar.disabled = !n;
        pan.replaceChildren(el("h3", "", "Tu pedido"));
        if (!n) { pan.classList.add("oculto"); return; }
        items.forEach(i => {
            const r = el("div", "t-fila"), mn = el("button", "btn mini", "−"), mas = el("button", "btn mini", "+"); mn.type = mas.type = "button";
            mn.onclick = () => { i.n--; resumen(); }; mas.onclick = () => { i.n++; resumen(); };
            r.append(el("span", "", i.pr.nombre), mn, el("b", "", String(i.n)), mas); pan.appendChild(r);
        });
        if (SI(cfg.mostrarTotal)) pan.appendChild(el("p", "t-tot", "Total: " + fmt(tot)));
        const ent = [SI(cfg.aceptaRecogerSucursal) && "Recoger en sucursal", SI(cfg.aceptaEnvioDomicilio) && "Envío a domicilio"].filter(Boolean);
        const pag = [SI(cfg.aceptaTransferencia) && "Transferencia", SI(cfg.aceptaEfectivo) && "Efectivo"].filter(Boolean);
        [opciones(ent, "Entrega", s => { entrega = s; }), opciones(pag, "Pago", s => { pago = s; })].filter(Boolean).forEach(o => pan.appendChild(o));
        [cfg.textoRecogerSucursal && SI(cfg.aceptaRecogerSucursal) && cfg.textoRecogerSucursal, cfg.textoEnvioDomicilio && SI(cfg.aceptaEnvioDomicilio) && cfg.textoEnvioDomicilio,
         cfg.cuentaPago && "Cuenta: " + cfg.cuentaPago, cfg.instruccionesPago, cfg.instruccionesEntrega].filter(Boolean).forEach(t => pan.appendChild(el("small", "", t)));
        const env = el("button", "btn ok", cfg.textoBotonWhatsApp || "Enviar pedido por WhatsApp"); env.type = "button";
        env.onclick = () => {
            let msg = (cfg.mensajeWhatsAppPedido || "Hola, quiero hacer este pedido:") + "\n" + items.map(i => "- " + i.n + " x " + i.pr.nombre + " (" + fmt(num(i.pr.precioNumero), i.pr.moneda) + ")").join("\n");
            if (SI(cfg.mostrarTotal)) msg += "\nTotal: " + fmt(tot); if (entrega) msg += "\nEntrega: " + entrega; if (pago) msg += "\nPago: " + pago;
            window.open(wa(cfg.whatsappPedidos || telGen, msg), "_blank", "noopener");
        };
        pan.appendChild(env);
    }
    ov.append(cab, q, chips, grid, pan, bar); document.body.appendChild(ov); pintaChips(); filtrar(); resumen();
    const abrir = () => ov.classList.remove("oculto");
    const fab = el("button", "fab", "🛒"); fab.id = "btnTienda"; fab.type = "button"; fab.setAttribute("aria-label", "Abrir tienda"); fab.onclick = abrir; document.body.appendChild(fab);
    (T.iconos || []).forEach(i => { if (num(i.pitch) === undefined) return; i.titulo = i.texto || "Abrir tienda"; v.addHotSpot(pin(i, "🛒", abrir), i.escena); });
}