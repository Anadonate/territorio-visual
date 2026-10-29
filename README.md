# Territorio Visual

Experiencia web estática de exploración de identidad visual, desarrollada con HTML, CSS y JavaScript nativo. No utiliza backend, servicios externos ni API de IA; es compatible con GitHub Pages.

## Análisis cromático actual

- El punto de partida son hasta tres logotipos subidos por el usuario en PNG, JPEG o SVG restringido.
- Las imágenes se procesan localmente con Canvas; cada marca admite un archivo. Los archivos no se suben a un servidor. Las respuestas solo viven en la memoria de la página y se pierden al recargar.
- Se rasteriza a un máximo de 320 px por lado. Los píxeles visibles se ponderan por su alfa; los píxeles completamente transparentes no se cuentan. Los valores RGB se agrupan por distancia euclídea OKLab < 0,055; las variantes neutras muy oscuras pueden agruparse hasta 0,11 para evitar duplicados casi negros.
- El estimador de fondo toma una muestra de las bandas exteriores (6 % del lado menor) y calcula la concentración del color dominante. Se considera confianza alta desde 68 % de esa banda, media desde 38 % y baja por debajo de ese nivel. Con confianza alta se excluye por defecto; en los demás casos se pide confirmar si es fondo o parte del identificador.
- Al excluir un fondo confirmado, se retiran píxeles conectados al borde con cercanía OKLab < 0,075 y tonos globalmente casi iguales al fondo (< 0,055). Esto permite quitar el fondo incluso en huecos tipográficos cerrados, pero puede excluir detalles del símbolo que coincidan con el fondo; se pueden reintroducir mediante «Incluir el fondo» o añadirlos manualmente.
- Se priorizan grupos con píxeles interiores sólidos: para ello se valora la vecindad de 5 × 5 píxeles y la repetición tonal. Si no hay un núcleo sólido distinguible y todos los grupos son neutros sobre un fondo también neutro, se conserva el extremo con mayor contraste como una única estimación monocromática. Así los grises de suavizado no se presentan como colores de marca. El umbral de presencia del 2 % reduce motas, pero puede omitir detalles, trazos finos o acentos pequeños.
- Los colores seleccionados son estimaciones de un archivo concreto, no una paleta corporativa certificada. Ningún color extraído se selecciona como principal automáticamente. Cada sugerencia se puede editar, eliminar o descartar; el usuario puede crear la paleta manualmente. Se recomiendan dos colores principales y se admiten tres como máximo en la comparación. Secundarios y neutros se guardan por separado.
- Los colores manuales se registran como tales. La fuente oficial puede anotarse por el usuario, pero la aplicación no la consulta ni verifica. Los colores de campaña se distinguen y no entran en la comparación estable.
- Los colores identificados como campaña/temporada se muestran aparte y no intervienen en la comparación estable. Solo se comparan paletas confirmadas.
- La visualización posiciona los colores cromáticos por ángulo de matiz y radio de luminosidad (blanco L=1 en el centro, negro L=0 en el borde). Cada punto conserva su HEX y su color real; el croma se muestra en los valores OKLCH. Blancos, negros y grises se ubican en una escala neutral independiente por luminosidad, sin asignarles un matiz.
- Se calcula ΔE_OK como distancia euclídea en OKLab entre pares HEX confirmados. El umbral operativo ≤ 0,055 describe cercanía matemática dentro de la muestra; no prueba posicionamiento, reconocimiento ni oportunidad de mercado.

## Alcance y cautelas

La extracción es una aproximación a áreas de color sólido de una imagen: puede omitir acentos pequeños, trazos muy finos o degradados; confundir una textura de borde con el fondo; o excluir un detalle del logo que coincida con el fondo detectado. Los SVG con estilos, filtros, imágenes embebidas, scripts o referencias externas se rechazan; exporta esos logotipos a PNG/JPEG. El nombre del archivo y el origen introducido son datos declarados, no verificaciones de titularidad. Revisa las sugerencias y corrígelas antes de confirmar.

Las similitudes son cálculos; su lectura de marca sigue siendo una hipótesis estratégica. Una muestra de hasta tres competidores no representa el mercado completo. La web general de una marca no se lee ni se usa para atribuirle colores.

## Vista local

Abre `index.html` en un navegador moderno o sirve la carpeta con cualquier servidor estático local. No es necesario instalar paquetes.

