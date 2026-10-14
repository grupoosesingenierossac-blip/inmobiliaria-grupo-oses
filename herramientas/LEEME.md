# Catálogo 360 · Cómo actualizar

Autor de la guía: Pariona Gonzales Harold James

## Datos
El sitio lee **directamente tu Excel en Google Drive** (enlace en `js/config.js`, línea `XLSX_ONLINE_URL`).
1. Edita el Excel en Drive (solo celdas amarillas). Drive guarda solo.
2. Abre el catálogo y pulsa **Actualizar** (si no cambia, espera 2-3 minutos y Ctrl + F5).
3. El pie de página debe decir **Datos: Excel en línea**.

Solo se muestra lo que tenga `activo = SI`.
El Excel debe estar compartido como **Cualquier persona con el enlace → Lector**.
Si Google no deja descargar el .xlsx, conviértelo (Archivo → Guardar como hoja de cálculo de Google), compártelo igual y pega el enlace nuevo en `js/config.js`.

## Respaldo (apagado por defecto)
`USAR_RESPALDO: false` en `js/config.js` = se usa solo el Excel en línea y, si falla, se muestra el motivo en pantalla.
Con `true`, si Drive falla se usa `data/catalogo.xlsx`. Para actualizarlo: Archivo → Descargar → Microsoft Excel y reemplaza `data/catalogo.xlsx`.
Solo si abres `index.html` con doble clic: usa `herramientas/actualizar-respaldo.html` para generar `data/catalogo.js` (y activa `USAR_RESPALDO: true`).

## GitHub Pages
- Sube **el contenido** de la carpeta `catalogo-360` a la raíz del repositorio (`index.html` en la raíz, no dentro de otra carpeta).
- Settings → Pages → Deploy from a branch → `main` / `/ (root)`.
- Los nombres de archivo distinguen mayúsculas: `img/logos/Logo.png` no es `img/logos/logo.png`.
- El sitio debe abrirse desde su dirección web; con doble clic el navegador bloquea la lectura del Excel en línea.

Las imágenes pueden ser enlaces de Google Drive compartidos como "Cualquier persona con el enlace".
