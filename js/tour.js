(async function () {
    const $ = id => document.getElementById(id);
    const el = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x !== undefined) e.textContent = x; return e; };
    const def = o => { Object.keys(o).forEach(k => o[k] === undefined && delete o[k]); return o; };
    const falla = m => { const c = $("estadoCarga"); c.classList.remove("oculto", "fuera"); c.classList.add("error"); $("cargaMsg").textContent = m; $("cargaSub").textContent = "Vuelve al catálogo e inténtalo de nuevo."; };
    const ocultarCarga = () => { const c = $("estadoCarga"); c.classList.add("fuera"); setTimeout(() => c.classList.add("oculto"), 500); };
    let cat;
    try { cat = await cargarCatalogo(true); } catch (e) { return falla("No se pudo leer el Excel en línea: " + e.message); }
    const p = cat.proyectos.find(x => x.idProyecto === new URLSearchParams(location.search).get("id"));
    if (!p) return falla("Este recorrido no existe o está desactivado (columna activo).");
    if (!p.escenas.length) return falla("Este proyecto no tiene escenas activas con imagen360 en la hoja Escenas.");
    const wa = (tel, msg) => "https://wa.me/" + tel + "?text=" + encodeURIComponent(msg || "");
    const telGen = p.whatsapp || cat.cli.whatsappGeneral || "";
    document.title = (p.nombreProyecto || p.idProyecto) + " | " + (cat.cli.nombreCliente || "Catálogo 360");

    $("nomP").textContent = p.nombreProyecto || ""; $("subP").textContent = p.subtituloProyecto || "";
    const lg = p.logoProyecto || cat.cli.logoCliente;   
    if (lg) { $("logoP").src = drive(lg); $("logoP").classList.remove("oculto"); }


    const paneles = ["panelMapa", "panelInfo", "menuWA"];
    const alternar = id => { const ya = !$(id).classList.contains("oculto"); paneles.forEach(x => $(x).classList.add("oculto")); if (!ya) $(id).classList.remove("oculto"); };

    function etiqueta(d, s) {
        const n = (k, dflt) => { const x = num(s[k]); return x === undefined ? dflt : x; };
        const g = el("div"); g.style.cssText = "position:absolute;left:0;top:0;transform-origin:0 0;transform:scale(" + (n("escala", (num(s.escalaPorcentaje) || 55) / 100)) + ")";
        const lc = s.lineaColor || "#fff", lt = n("lineaTop", -90), ll = n("lineaLeft", 0), gr = n("lineaGrosor", 2);
        const v1 = el("i"); v1.style.cssText = "position:absolute;background:" + lc + ";left:" + ll + "px;top:" + lt + "px;width:" + gr + "px;height:" + n("lineaAlto", 95) + "px";
        const h1 = el("i"); h1.style.cssText = "position:absolute;background:" + lc + ";left:" + ll + "px;top:" + lt + "px;height:" + gr + "px;width:" + n("lineaAncho", 95) + "px";
        const t = el("div"); t.style.cssText = "position:absolute;white-space:nowrap;left:" + n("textoLeft", 12) + "px;top:" + n("textoTop", -118) + "px;padding:" + n("padding", 0) + "px;border-radius:" + n("radio", 0) + "px;font-family:" + (s.textoFuente || "Montserrat") + ",sans-serif";
        if (s.fondo && s.fondo !== "transparent") t.style.background = s.fondo;
        if (SI(s.sombra)) t.style.textShadow = "0 1px 4px #000";
        const a = el("div", "", s.titulo); a.style.cssText = "color:" + (s.tituloColor || "#fff") + ";font-size:" + n("tituloTamano", 17) + "px;font-weight:" + (s.tituloPeso || 700);
        t.appendChild(a);
        if (s.subtitulo && s.subtitulo.trim()) { const b = el("div", "", s.subtitulo.trim()); b.style.cssText = "color:" + (s.subtituloColor || "#fff") + ";font-size:" + n("subtituloTamano", 15) + "px;font-weight:" + (s.subtituloPeso || 400) + ";margin-top:" + n("subtituloMarginTop", 0) + "px"; t.appendChild(b); }
        g.append(v1, h1, t); d.appendChild(g);
    }
    
    function pin(x, emoji, onClick) {
        return { pitch: num(x.pitch), yaw: num(x.yaw), type: "custom", cssClass: "pin", clickHandlerFunc: onClick,
            createTooltipFunc: d => {
                d.title = x.titulo || ""; d.setAttribute("role", "button"); d.setAttribute("aria-label", x.titulo || emoji);
                if (x.icono) { const i = el("img"); i.src = drive(x.icono); i.alt = ""; i.onerror = () => { i.remove(); d.textContent = emoji; }; d.appendChild(i); } else d.textContent = emoji;
            } };
    }
   
    function abrirMedia(x) {
        const c = $("mediaCont"), url = String(x.link).trim(); c.replaceChildren();
        if (/video/i.test(x.tipo)) {
            const yt = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{11})/), dr = url.match(/drive\.google\.com\/file\/d\/([\w-]+)/);
            if (yt || dr) { const f = el("iframe"); f.src = yt ? "https://www.youtube.com/embed/" + yt[1] : "https://drive.google.com/file/d/" + dr[1] + "/preview"; f.allow = "autoplay; fullscreen"; f.allowFullscreen = true; c.appendChild(f); }
            else { const vd = el("video"); vd.src = url; vd.controls = true; vd.autoplay = true; c.appendChild(vd); }
        } else { const im = el("img"); im.src = drive(url); im.alt = x.titulo || ""; c.appendChild(im); }
        $("mediaTit").textContent = x.titulo || ""; $("visorMedia").classList.remove("oculto");
    }
    function cerrarMedia() { $("visorMedia").classList.add("oculto"); $("mediaCont").replaceChildren(); }
    $("mediaCerrar").onclick = cerrarMedia;
    $("visorMedia").onclick = e => { if (e.target === $("visorMedia")) cerrarMedia(); };
    document.addEventListener("keydown", e => { if (e.key === "Escape") cerrarMedia(); });

   
    const scenes = {};
   
    const esExterna = e => { const u = String(e.imagen360 || "").trim(); return /^https?:\/\//i.test(u) && !/drive\.google\.com|googleusercontent\.com|\.(jpe?g|png|webp)(\?|#|$)/i.test(u); };
    const escenasExt = p.escenas.filter(esExterna), escenasPan = p.escenas.filter(e => !esExterna(e)), extPorId = {};
    escenasExt.forEach(e => extPorId[e.idEscena] = e);
    escenasPan.forEach(e => {
        const hs = [];
        p.lotes.filter(l => l.escena === e.idEscena && num(l.pitch) !== undefined && num(l.yaw) !== undefined).forEach(l => hs.push({
            pitch: num(l.pitch), yaw: num(l.yaw), type: "custom", cssClass: "lote",
            createTooltipFunc: d => { d.textContent = l.numero || ""; d.style.background = l.color || "#006400"; d.title = l.titulo || ""; },
            clickHandlerFunc: () => verLote(l)
        }));
        p.nav.filter(n => n.escenaOrigen === e.idEscena && scenesIds().includes(n.escenaDestino) && num(n.pitch) !== undefined).forEach(n => hs.push({
            pitch: num(n.pitch), yaw: num(n.yaw), type: "scene", sceneId: n.escenaDestino, text: n.texto || (p.escenas.find(z => z.idEscena === n.escenaDestino) || {}).nombreMenu || undefined
        }));
        p.nav.filter(n => n.escenaOrigen === e.idEscena && extPorId[n.escenaDestino] && num(n.pitch) !== undefined).forEach(n => hs.push({
            pitch: num(n.pitch), yaw: num(n.yaw), type: "custom", cssClass: "pnlm-hotspot pnlm-scene",
            createTooltipFunc: d => { d.title = n.texto || extPorId[n.escenaDestino].nombreMenu || ""; d.setAttribute("role", "button"); },
            clickHandlerFunc: () => abrirExterno(extPorId[n.escenaDestino])
        }));
        p.estructuras.filter(s => s.escena === e.idEscena && s.titulo && num(s.pitch) !== undefined).forEach(s => hs.push({
            pitch: num(s.pitch), yaw: num(s.yaw), type: "custom", cssClass: "etq", createTooltipFunc: d => etiqueta(d, s)
        }));
        p.externos.filter(x => x.escena === e.idEscena && num(x.pitch) !== undefined).forEach(x => hs.push(pin(x, "🔗", () => {
            if (x.escenaDestino && scenes[x.escenaDestino]) v.loadScene(x.escenaDestino);
            else if (x.escenaDestino && extPorId[x.escenaDestino]) abrirExterno(extPorId[x.escenaDestino]);
            else if (/^https?:\/\//i.test(x.link)) window.open(x.link, "_blank", "noopener");
        })));
        p.media.filter(x => x.escena === e.idEscena && num(x.pitch) !== undefined).forEach(x => hs.push(pin(x, /video/i.test(x.tipo) ? "▶" : "📷", () => abrirMedia(x))));
        (p.textos || []).filter(t => t.escena_id === e.idEscena && num(t.pitch) !== undefined).forEach(t => hs.push({
            pitch: num(t.pitch), yaw: num(t.yaw), type: "custom", cssClass: "etq",
            createTooltipFunc: d => {
                d.textContent = t.texto; d.style.color = t.color || "#fff"; d.style.fontSize = (num(t["tamaño"]) || 16) + "px"; d.style.fontFamily = t.fuente || "Arial";
                if (SI(t.negrita)) d.style.fontWeight = "700"; if (t.fondo && t.fondo !== "transparent") d.style.background = t.fondo;
            }
        }));
        scenes[e.idEscena] = def({ title: e.nombreMenu, type: "equirectangular", panorama: drive(e.imagen360, (window.CONFIG || {}).PANORAMA_ANCHO),
            pitch: num(e.pitchInicial), yaw: num(e.yawInicial), hfov: num(e.hfovInicial) || 100, hotSpots: hs });
    });
    function scenesIds() { return escenasPan.map(e => e.idEscena); }

    if (!escenasPan.length) {   
        const cv = document.createElement("canvas"); cv.width = 64; cv.height = 32; const cx = cv.getContext("2d"); cx.fillStyle = "#fff"; cx.fillRect(0, 0, 64, 32);
        scenes._vacio = { type: "equirectangular", panorama: cv.toDataURL("image/jpeg", .8), hfov: 100 };
    }
    const primera = scenes[p.escenaInicial] ? p.escenaInicial : (escenasPan[0] ? escenasPan[0].idEscena : "_vacio");
    const ui = p.ui || {};   
    const hfovMinFinal = x => { const s = (window.CONFIG || {}).HFOV_MIN_SEGURO || 0; return (x == null && !s) ? undefined : Math.max(x || 0, s); };
   
    const horizontal = () => innerWidth > innerHeight * 1.15;
    const hfovMaxEscritorio = (window.CONFIG || {}).HFOV_MAX_ESCRITORIO || 150;
    const maxFinal = () => { const m = num(ui.hfovMax); return horizontal() ? Math.max(m || 0, hfovMaxEscritorio) : m; };
    const ajustes = def({
        minHfov: hfovMinFinal(num(ui.hfovMin)), maxHfov: maxFinal(),
        friction: (window.CONFIG || {}).INERCIA, touchPanSpeedCoeffFactor: (window.CONFIG || {}).VELOCIDAD_ARRASTRE,
        showZoomCtrl: ui.zoomVisible ? SI(ui.zoomVisible) : undefined,
        showFullscreenCtrl: ui.fullscreenVisible ? SI(ui.fullscreenVisible) : undefined
    });
    const v = pannellum.viewer("visor", { default: Object.assign({ firstScene: primera, autoLoad: true, compass: false, sceneFadeDuration: (window.CONFIG || {}).TRANSICION_ESCENA_MS || 700 }, ajustes), scenes });
    
    function ajustarVistaAerea() {
        if (!horizontal() || (window.CONFIG || {}).AEREA_AJUSTE_ESCRITORIO === false || typeof proy !== "function") return;
        const id = v.getScene(), rad = Math.PI / 180;
        const ls = p.lotes.filter(l => l.escena === id && num(l.pitch) !== undefined && num(l.yaw) !== undefined);
        if (ls.length < 3) return;
        const pitProm = ls.reduce((t, l) => t + num(l.pitch), 0) / ls.length;
        if (pitProm > -45) return;                                         
        let sx = 0, sy = 0, sz = 0;
        ls.forEach(l => { const a = num(l.pitch) * rad, b = num(l.yaw) * rad; sx += Math.cos(a) * Math.sin(b); sy += Math.sin(a); sz += Math.cos(a) * Math.cos(b); });
        const n = Math.hypot(sx, sy, sz) || 1, cp = Math.asin(sy / n) / rad, cy = Math.atan2(sx, sz) / rad;
        let t = 0;                                                          
        const W = innerWidth, H = innerHeight, margen = 1.4;                
        for (const l of ls) {
            const r = proy(num(l.pitch), num(l.yaw), cp, cy);
            if (r.z <= 0.01) return;
            t = Math.max(t, Math.abs(r.x / r.z) * margen, Math.abs(r.y / r.z) * margen * (W / H));
        }
        const hf = 2 * Math.atan(t) / rad, c = v.getConfig();
        v.setPitch(cp, false); v.setYaw(cy, false);
        v.setHfov(Math.min(c.maxHfov, Math.max(c.minHfov, hf)), false);
    }
    
    let capaExt = null, extAbierta = null;
    function abrirExterno(e) {
        if (!e) return;
        const url = String(e.imagen360).trim();
        if (!capaExt) {
            capaExt = el("div"); capaExt.id = "visorExterno"; capaExt.style.cssText = "position:fixed;inset:0;z-index:4;background:#fff;display:grid;place-items:center";
            const msg = el("div", "", "Cargando recorrido…"); msg.style.cssText = "color:#66736b;font:600 .95rem Montserrat,sans-serif";
            const fr = el("iframe"); fr.title = "Recorrido"; fr.allowFullscreen = true; fr.setAttribute("allow", "fullscreen; accelerometer; gyroscope; autoplay; xr-spatial-tracking; web-share");
            fr.style.cssText = "position:absolute;inset:0;width:100%;height:100%;border:0;background:transparent";
            const ab = el("a", "btn mini", "Abrir en pantalla completa ↗"); ab.id = "extAbrir"; ab.target = "_blank"; ab.rel = "noopener noreferrer";
            ab.style.cssText = "position:fixed;right:16px;bottom:82px;z-index:6;opacity:.85";
            capaExt.append(msg, fr); capaExt.__fr = fr; capaExt.__ab = ab; document.body.append(capaExt, ab);
        }
        if (extAbierta !== e.idEscena) capaExt.__fr.src = url;
        capaExt.__ab.href = url; capaExt.style.display = "grid"; capaExt.__ab.style.display = "";
        extAbierta = e.idEscena; $("brujulaUI").style.visibility = "hidden";
        const h = $("eHint"); if (h) h.remove();
        marcarEscena(e.idEscena);
        if (!$("estadoCarga").classList.contains("error")) ocultarCarga();
    }
    function cerrarExterno() {
        if (!capaExt || extAbierta === null) return;
        capaExt.style.display = "none"; capaExt.__ab.style.display = "none"; capaExt.__fr.src = "about:blank";
        extAbierta = null; $("brujulaUI").style.visibility = "";
    }
    v.on("load", ocultarCarga);
    v.on("load", ajustarVistaAerea);
    v.on("load", () => { if (window.EFECTOS) EFECTOS.suavizarVisor(v, window.CONFIG || {}); });   
    v.on("error", m => falla("No se pudo cargar la imagen 360: " + m));

    if (window.EXTRAS) EXTRAS.init({ p, v, el, wa, telGen, pin, verLote });   

  
    if (new URLSearchParams(location.search).get("coords") === "1" || SI(ui.coordenadasActivo)) {
        const box = el("div", "coords", "Modo coordenadas: toca un punto de la imagen"); document.body.appendChild(box);
        let d0 = null; const vis = $("visor");
        vis.addEventListener("mousedown", e => { d0 = [e.clientX, e.clientY]; });
        vis.addEventListener("click", e => {
            if (d0 && Math.hypot(e.clientX - d0[0], e.clientY - d0[1]) > 6) return;  
            const c = v.mouseEventToCoords(e), p1 = c[0].toFixed(2), y1 = c[1].toFixed(2);
            box.textContent = "pitch: " + p1 + "   yaw: " + y1;
            try { navigator.clipboard.writeText(p1 + "\t" + y1).then(() => { box.textContent += "   (copiado)"; }, () => {}); } catch (x) {}
        });
    }

   
    const b = p.brujula || {};
    if (b.imagenBrujula && /\/d\/|[?&]id=|^https?:/i.test(b.imagenBrujula)) {
        const old = $("brujulaUI"), im = document.createElement("img");
        im.id = "brujulaUI"; im.alt = "Brújula"; im.src = drive(b.imagenBrujula);
        im.onerror = () => { old.setAttribute("width", im.getAttribute("width") || 100); old.style.cssText = im.style.cssText; im.replaceWith(old); };  
        old.replaceWith(im);
    }
    const bu = $("brujulaUI");
    if (b.visible && !SI(b.visible) || (b.activo && !SI(b.activo))) bu.style.display = "none";
    bu.setAttribute("width", num(b["tamaño"]) || 100);
    ["top", "right", "bottom", "left"].forEach(k => { if (num(b[k]) !== undefined) bu.style[k] = b[k] + "px"; });
    if (num(b.bottom) !== undefined && num(b.top) === undefined) bu.style.top = "auto";
    if (num(b.left) !== undefined && num(b.right) === undefined) bu.style.right = "auto";
    if (num(b.opacidad) !== undefined) bu.style.opacity = num(b.opacidad) > 1 ? num(b.opacidad) / 100 : num(b.opacidad);
    const rot0 = num(b.rotacionInicial) || 0;
    (function girar() { $("brujulaUI").style.transform = "rotate(" + (rot0 - v.getYaw()) + "deg)"; requestAnimationFrame(girar); })();

 
    function verLote(l) {
        const pi = $("panelInfo"), x = el("button", "cerrar", "×"); x.type = "button"; x.setAttribute("aria-label", "Cerrar");
        x.onclick = () => pi.classList.add("oculto");
        pi.replaceChildren(x, el("h3", "", l.titulo || "Lote " + l.numero));
        [["Estado", l.estado], ["Superficie", l.superficie], ["Dimensiones", l.dimensiones], ["Precio", l.precio], ["Detalle", l.descripcion]]
            .filter(f => f[1]).forEach(f => pi.appendChild(el("div", "fila", f[0] + ": " + f[1])));
        const a = el("a", "btn ok mini", "Consultar por WhatsApp");
        a.href = wa(l.whatsapp || telGen, (l.mensajeWhatsApp || "Hola, quiero información") + " - " + (l.titulo || "")); a.target = "_blank"; a.rel = "noopener noreferrer";
        pi.appendChild(a); paneles.forEach(q => $(q).classList.add("oculto")); pi.classList.remove("oculto");
    }


    const botonesEscena = {};
    if (p.escenas.length > 1) p.escenas.forEach(e => { const bt = el("button", "btn mini", e.nombreMenu || e.idEscena); bt.type = "button"; bt.onclick = () => { if (extPorId[e.idEscena]) abrirExterno(e); else { cerrarExterno(); v.loadScene(e.idEscena); } }; botonesEscena[e.idEscena] = bt; $("menuEscenas").appendChild(bt); });
    const marcarEscena = id => Object.keys(botonesEscena).forEach(k => botonesEscena[k].classList.toggle("on", k === id));
    marcarEscena(primera); v.on("scenechange", marcarEscena);
    { const extInicial = extPorId[p.escenaInicial] || (!escenasPan.length ? escenasExt[0] : null); if (extInicial) abrirExterno(extInicial); }

  
    if (SI(p.mapaActivo) && num(p.mapaLat) !== undefined && num(p.mapaLng) !== undefined) {
        const f = el("iframe"); f.loading = "lazy"; f.title = "Ubicación"; f.style.cssText = "width:100%;height:260px;border:0;border-radius:12px";
        f.src = "https://www.google.com/maps?q=" + p.mapaLat + "," + p.mapaLng + "&output=embed";
        $("panelMapa").appendChild(f); $("btnAbrirMapa").classList.remove("oculto"); $("btnAbrirMapa").onclick = () => alternar("panelMapa");
    }


    const mw = $("menuWA"); mw.appendChild(el("h3", "", "Habla con un asesor"));
    const ag = p.agentes.map(a => ({ n: a.nombre + (a.cargo ? " · " + a.cargo : ""), t: a.whatsapp, m: a.mensajeWhatsApp, f: a.foto }));
    if (!ag.length && telGen) ag.push({ n: "WhatsApp", t: telGen, m: p.mensajeWhatsApp });
    ag.forEach(a => { const l = el("a", "btn mini", a.n); if (a.f) { const i = el("img", "avatar"); i.src = drive(a.f); i.alt = ""; i.loading = "lazy"; i.onerror = () => i.remove(); l.prepend(i); }
        l.href = wa(a.t, a.m || p.mensajeWhatsApp); l.target = "_blank"; l.rel = "noopener noreferrer"; mw.appendChild(l); });
    $("btnWA").onclick = () => alternar("menuWA");
})();
