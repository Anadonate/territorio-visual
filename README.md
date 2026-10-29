# Territorio Visual

Experiencia web estática de exploración de identidad visual, desarrollada con HTML, CSS y JavaScript nativo. No utiliza backend, servicios externos ni API de IA; es compatible con GitHub Pages.

## Análisis cromático actual

- El punto de partida son hasta tres logotipos subidos por el usuario en PNG, JPEG o SVG restringido.
- Las imágenes se procesan localmente con Canvas; cada marca admite un archivo. Los archivos no se suben a un servidor. Las respuestas solo viven en la memoria de la página y se pierden al recargar.
- Se rasteriza a un máximo de 144 px por lado. Se excluyen píxeles con alfa < 220/255, se cuantizan canales RGB a 4 bits y se agrupan colores por distancia euclídea OKLab < 0,055. Se muestran hasta cuatro grupos con presencia ≥ 2 % de los píxeles considerados.
- Un fondo sólido se sugiere si las cuatro esquinas opacas son similares en OKLab (< 0,035); se excluyen por defecto píxeles a distancia < 0,045 de ese tono. El usuario puede incluir el fondo o añadir tonos omitidos manualmente.
- En JPEG, grupos pequeños situados en la línea de mezcla RGB entre el fondo detectado y el color más frecuente se descartan como posibles halos de compresión; los degradados reales pueden necesitar corrección manual.
- La selección extraída es una estimación de un archivo concreto, no una paleta corporativa certificada. Cada tono se puede editar o eliminar. Los colores manuales requieren código HEX y procedencia; las fuentes oficiales se declaran por el usuario, sin verificación automática.
- Los colores identificados como campaña/temporada se muestran aparte y no intervienen en la comparación estable. Solo se comparan paletas confirmadas.
- La visualización posiciona los colores cromáticos por ángulo de matiz y radio de luminosidad (blanco L=1 en el centro, negro L=0 en el borde). Cada punto conserva su HEX y su color real; el croma se muestra en los valores OKLCH. Blancos, negros y grises se ubican en una escala neutral independiente por luminosidad, sin asignarles un matiz.
- Se calcula ΔE_OK como distancia euclídea en OKLab entre pares HEX confirmados. El umbral operativo ≤ 0,055 describe cercanía matemática dentro de la muestra; no prueba posicionamiento, reconocimiento ni oportunidad de mercado.

## Alcance y cautelas

La extracción es una aproximación a píxeles dominantes: puede omitir acentos pequeños, confundirse si el fondo no es uniforme o combinar matices visualmente cercanos. Los SVG con estilos, filtros, imágenes embebidas, scripts o referencias externas se rechazan; exporta esos logotipos a PNG/JPEG. El nombre del archivo y el origen introducido son datos declarados, no verificaciones de titularidad.

Las similitudes son cálculos; su lectura de marca sigue siendo una hipótesis estratégica. Una muestra de hasta tres competidores no representa el mercado completo. La web general de una marca no se lee ni se usa para atribuirle colores.

## Vista local

Abre `index.html` en un navegador moderno o sirve la carpeta con cualquier servidor estático local. No es necesario instalar paquetes.

