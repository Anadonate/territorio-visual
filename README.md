# Territorio Visual

Territorio Visual es una herramienta de apoyo estratégico para definir la identidad cromática de una marca que todavía se va a crear. Cruza el briefing de marca con una muestra de logotipos competidores para detectar códigos visuales y explorar posibles direcciones cromáticas.

## Cómo funciona

1. Completa el briefing: nombre, descripción, sector, público, valores e imagen que se quiere proyectar.
2. Añade entre dos y seis logotipos de marcas competidoras o referentes.
3. La herramienta estima dos tonos de identidad y un posible fondo por imagen en el navegador. Puedes validar, corregir o excluir cada muestra antes del análisis.
4. Consulta las familias cromáticas presentes en la muestra y una lectura estratégica contextualizada.
5. Explora tres territorios iniciales: afinidad con los códigos de la categoría, diferenciación matizada y posicionamiento alternativo. Se representan como direcciones de exploración, no como paletas cerradas.

## Criterio y límites

- La herramienta no necesita ni solicita el logotipo de la nueva marca: ayuda a definirlo antes de diseñarlo.
- Las rutas cromáticas son hipótesis orientativas construidas mediante reglas sencillas a partir del briefing y de los colores aportados. No son un estudio de mercado ni una recomendación generada por investigación externa.
- La extracción de color es una estimación visual, no una verificación de los colores corporativos oficiales.
- Una muestra pequeña no representa todo un mercado ni demuestra por sí sola que exista un hueco cromático.
- No se presupone que diferenciarse implique usar el color opuesto. Una variación de matiz, luminosidad o combinación puede ser más adecuada.
- Las asociaciones entre color y personalidad dependen del contexto, la cultura, el público y la aplicación. Conviene validar las propuestas con usuarios y en soportes reales.
- Los archivos se procesan en el navegador; no se envían a un servidor.
- El análisis puede guardarse mediante la opción de impresión del navegador, eligiendo «Guardar como PDF».

## Desarrollo

El frontend estático está hecho con HTML, CSS y JavaScript nativo y se publica con GitHub Pages desde la rama `fase-2-redisenada`. La extracción y validación cromática se realiza en el navegador. Se ha añadido una integración opcional con un Cloudflare Worker y la API de OpenAI; para activarla hay que desplegar el Worker, configurar sus secretos y definir su URL en `js/ai-config.js`. Sin esa configuración, la herramienta mantiene el análisis local actual.

La metodología, las instrucciones del consultor, el esquema de respuesta y la arquitectura se documentan en `docs/` y `ai/`. Consulta `docs/arquitectura-integracion-ia.md` antes de desplegar. La clave de OpenAI nunca debe incluirse en el frontend ni en este repositorio.
