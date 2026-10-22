/* Grupo OSES · efectos visuales y microinteracciones (acompaña a css/efectos.css).
   No cambia datos ni lógica: solo agrega comportamiento visual. Si falla, el sitio sigue funcionando igual. */
(function () {
    "use strict";
    var d = document, root = d.documentElement;
    var $ = function (s) { return d.querySelector(s); };
    var reduce = !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
    var esTour = d.body.classList.contains("tour");

    /* 1. Onda al tocar un botón */
    d.addEventListener("pointerdown", function (e) {
        var b = e.target.closest && e.target.closest(".btn");
        if (!b || reduce || b.disabled) return;
        var r = b.getBoundingClientRect(), s = Math.max(r.width, r.height) * 2, i = d.createElement("span");
        i.className = "e-ripple";
        i.style.cssText = "width:" + s + "px;height:" + s + "px;left:" + (e.clientX - r.left - s / 2) + "px;top:" + (e.clientY - r.top - s / 2) + "px";
        b.appendChild(i); setTimeout(function () { i.remove(); }, 650);
    }, { passive: true });

    if (!esTour) {
        /* 2. Barra de progreso del scroll */
        var bar = d.createElement("div"); bar.id = "eProgreso"; d.body.appendChild(bar);
        var pend = false;
        var act = function () { pend = false; var h = root.scrollHeight - innerHeight; bar.style.transform = "scaleX(" + (h > 0 ? Math.min(1, scrollY / h) : 0) + ")"; };
        addEventListener("scroll", function () { if (!pend) { pend = true; requestAnimationFrame(act); } }, { passive: true });
        act();

        /* 3. Aparecer al desplazarse (también las tarjetas que se cargan después desde el Excel) */
        if (!reduce && "IntersectionObserver" in window) {
            var SEL = "#catalogo > *, .cab, .hero, header h1, header h2, main > h1, main > h2, section > h1, section > h2, section > p, .pie, footer";
            root.classList.add("js-reveal");
            var io = new IntersectionObserver(function (es) {
                var n = 0;
                es.forEach(function (en) {
                    if (!en.isIntersecting) return;
                    en.target.style.setProperty("--i", n++);
                    en.target.classList.add("visible"); io.unobserve(en.target);
                });
            }, { threshold: 0, rootMargin: "0px 0px -6% 0px" });
            var marcar = function () {
                d.querySelectorAll(SEL).forEach(function (el) {
                    if (el.dataset.er) return; el.dataset.er = "1"; el.classList.add("reveal"); io.observe(el);
                });
            };
            marcar(); new MutationObserver(marcar).observe(d.body, { childList: true, subtree: true });
        }

        /* 4. Inclinación suave y brillo en las tarjetas (solo con mouse) */
        if (!reduce && matchMedia("(hover:hover) and (pointer:fine)").matches) {
            var ult = null;
            var limpiar = function (c) { if (c) { c.style.removeProperty("--rx"); c.style.removeProperty("--ry"); } };
            d.addEventListener("pointermove", function (e) {
                var c = e.target.closest && e.target.closest("#catalogo > :not(p), .card");
                if (c !== ult) { limpiar(ult); ult = c; }
                if (!c) return;
                var r = c.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
                c.style.setProperty("--ry", ((x - .5) * 4).toFixed(2) + "deg");
                c.style.setProperty("--rx", ((.5 - y) * 4).toFixed(2) + "deg");
                c.style.setProperty("--mx", (x * 100).toFixed(1) + "%");
                c.style.setProperty("--my", (y * 100).toFixed(1) + "%");
            }, { passive: true });
            d.addEventListener("pointerleave", function () { limpiar(ult); ult = null; }, true);
        }

        /* 5. Pantalla de carga del catálogo: «GRUPO OSES · en proceso» */
        var cat = $("#catalogo");
        if (cat && !$("#estadoCarga")) {
            var ov = d.createElement("div"); ov.id = "estadoCarga"; ov.setAttribute("role", "status"); ov.setAttribute("aria-live", "polite");
            ov.innerHTML = '<div class="carga-card"><img class="carga-logo" src="img/logos/logo-carga.png" alt="Grupo OSES"><p>EN PROCESO</p>' +
                '<span class="carga-barra"><i></i></span><small>Cargando nuestras propiedades…</small></div>';
            d.body.appendChild(ov);
            var t0 = Date.now(), cerrado = false;
            var cerrar = function () {
                if (cerrado) return; cerrado = true;
                setTimeout(function () { ov.classList.add("fuera"); setTimeout(function () { ov.remove(); }, 600); }, Math.max(0, 900 - (Date.now() - t0)));
            };
            var listo = function () { return cat.firstElementChild && !/^\s*Cargando/i.test(cat.textContent); };
            if (listo()) cerrar(); else {
                var mo = new MutationObserver(function () { if (listo()) { mo.disconnect(); cerrar(); } });
                mo.observe(cat, { childList: true, subtree: true, characterData: true });
                setTimeout(cerrar, 10000);
            }
        }
    }

    /* 6. Recorrido 360: aviso de ayuda al entrar */
    if (esTour && $("#visor")) {
        var vistaAntes = false; try { vistaAntes = sessionStorage.getItem("eHint") === "1"; } catch (x) {}
        var ec = $("#estadoCarga");
        if (!vistaAntes && ec) {
            var h = d.createElement("div"); h.id = "eHint"; h.setAttribute("role", "note");
            h.innerHTML = "<i>👆</i><span>Arrastra para mirar alrededor · toca los puntos para moverte</span>";
            d.body.appendChild(h);
            var mostrado = false, ocultarH = function () { h.classList.remove("ver"); };
            var mostrar = function () {
                if (mostrado || ec.classList.contains("error")) return; mostrado = true;
                try { sessionStorage.setItem("eHint", "1"); } catch (x) {}
                setTimeout(function () { h.classList.add("ver"); setTimeout(ocultarH, 7000); }, 700);
            };
            ["pointerdown", "wheel", "touchstart"].forEach(function (ev) { $("#visor").addEventListener(ev, ocultarH, { passive: true }); });
            if (ec.classList.contains("fuera")) mostrar();
            else new MutationObserver(function (_, o) { if (ec.classList.contains("fuera")) { o.disconnect(); mostrar(); } }).observe(ec, { attributes: true, attributeFilter: ["class"] });
        }
    }
    /* 7. Recorrido 360: zoom gradual con la rueda del mouse o el pellizco (en vez de saltos) */
    window.EFECTOS = window.EFECTOS || {};
    window.EFECTOS.suavizarVisor = function (v, cfg) {
        if (v.__suave || cfg.ZOOM_SUAVE === false || reduce) return; v.__suave = true;
        var vis = d.getElementById("visor"), meta = null, raf = 0;
        var paso = function () {
            var h = v.getHfov(), dif = meta - h;
            if (Math.abs(dif) < 0.05) { v.setHfov(meta, false); meta = null; raf = 0; return; }
            v.setHfov(h + dif * 0.13, false); raf = requestAnimationFrame(paso);
        };
        var rueda = function (e) {
            e.preventDefault(); e.stopImmediatePropagation();
            if (e.type !== "wheel") return;   // los eventos antiguos (mousewheel) solo se bloquean
            var c = v.getConfig(), dy = e.deltaY * (e.deltaMode === 1 ? 16 : 1);
            meta = Math.max(c.minHfov, Math.min(c.maxHfov, (meta === null ? v.getHfov() : meta) + dy * 0.045));
            if (!raf) raf = requestAnimationFrame(paso);
        };
        ["wheel", "mousewheel", "DOMMouseScroll"].forEach(function (n) { vis.addEventListener(n, rueda, { capture: true, passive: false }); });
    };
})();