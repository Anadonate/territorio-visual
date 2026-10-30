# Integración de IA · Arquitectura y puesta en marcha

## Decisión de arquitectura

- **Frontend:** GitHub Pages conserva el HTML, CSS y JavaScript actual.
- **Procesamiento cromático:** permanece en el navegador. El usuario valida los colores antes de enviarlos.
- **Backend:** Cloudflare Worker en `worker/`, como intermediario seguro.
- **Modelo:** API de OpenAI mediante Responses API.
- **Formato:** Structured Outputs con JSON Schema estricto.
- **Investigación externa:** fuera de alcance en la primera versión.

No se debe introducir una clave de OpenAI en HTML, CSS, JavaScript del navegador, repositorio público ni variables de compilación públicas.

## Flujo

1. El navegador valida briefing y referencias.
2. El navegador prepara un JSON con briefing, competidores, colores validados y estadísticas descriptivas disponibles.
3. El navegador envía el JSON al Worker por HTTPS.
4. El Worker valida origen, tamaño y estructura.
5. El Worker llama a `POST https://api.openai.com/v1/responses` usando el secreto `OPENAI_API_KEY`.
6. El modelo devuelve un JSON ajustado al esquema.
7. El Worker comprueba que existen exactamente tres territorios y devuelve el objeto.
8. El navegador renderiza el resultado usando componentes DOM existentes.

## Contrato de petición

```json
{
  "briefing": {
    "brandName": "Nombre",
    "description": "Qué ofrece y qué necesidad resuelve",
    "sector": "Sector",
    "audience": "Público",
    "values": "Valores",
    "personality": "Personalidad deseada"
  },
  "competitors": [
    {
      "name": "Marca de referencia",
      "colors": [
        { "hex": "#336699", "slot": "a" },
        { "hex": "#DDAA55", "slot": "b" }
      ]
    }
  ],
  "sampleContext": {
    "competitorCount": 2,
    "validatedColorCount": 4,
    "familyCounts": { "azul": 2, "naranja": 2 }
  }
}
```

Cada competidor debe tener al menos un color y como máximo tres. Los slots permitidos son `a`, `b` y `fondo`. Los colores de fondo solo se incluyen si el usuario los ha validado expresamente.

## Contrato de respuesta

El esquema canónico está en `ai/response-schema.json`. La respuesta contiene:
- resumen ejecutivo;
- diagnóstico competitivo (observaciones, interpretación, códigos recurrentes, convenciones posibles y limitaciones);
- ajuste al briefing y tensiones;
- exactamente tres territorios, cada uno con concepto, dirección cromática, ajuste, oportunidades, riesgos y pruebas;
- recomendación, alternativa a conservar y pruebas de validación.

El esquema es la fuente de verdad. Si cambia, actualizarlo también en `worker/src/index.js` y las funciones de renderizado del frontend.

## Despliegue inicial del Worker

1. Crear una cuenta de Cloudflare.
2. Instalar Wrangler en un entorno local y autenticarlo.
3. Desde la carpeta `worker`, configurar el secreto:
   `wrangler secret put OPENAI_API_KEY`
4. Definir la variable `ALLOWED_ORIGINS` con el origen real de GitHub Pages (sin rutas). En esta web, el origen esperado es `https://anadonate.github.io`; comprobarlo antes de habilitar producción.
5. Configurar `OPENAI_MODEL` con un modelo disponible y habilitado en el proyecto API. No asumir que la suscripción de ChatGPT incluye saldo API.
6. Ejecutar `wrangler deploy`.
7. Probar OPTIONS, origen permitido/no permitido, petición válida, petición incompleta, errores 429 y ausencia de secreto.
8. Configurar controles de abuso y límites de consumo en Cloudflare antes de anunciar el endpoint públicamente.

## Privacidad y abuso

- El navegador enviará briefing y datos cromáticos a OpenAI para procesar el análisis. Debe actualizarse el aviso de privacidad antes de activar esta función.
- El Worker envía `store: false` en la solicitud de Responses API.
- No guardar los briefings ni las respuestas en una base de datos en esta fase.
- Añadir límites de frecuencia por IP en Cloudflare antes de producción. La validación de origen/CORS no autentica usuarios y no evita llamadas automatizadas.
- Añadir un límite de presupuesto y alertas de gasto en el proyecto API.
- No registrar en logs el cuerpo de las peticiones ni la clave API.
- El Worker limita el cuerpo a 24 KB y valida longitud y estructura.

## Pendiente antes de activar IA en la web

- Confirmar modelo API disponible y coste.
- Desplegar Worker y fijar su URL.
- Integrar llamada desde `app.js` con estado de carga, errores y alternativa local.
- Renderizar el nuevo esquema sin romper la versión actual.
- Actualizar aviso de privacidad y texto de la interfaz.
- Probar con briefings contradictorios, muestras mínimas, colores neutros y datos malformados.

## Documentación oficial

- Responses API: https://developers.openai.com/api/reference/resources/responses
- Structured Outputs: https://developers.openai.com/api/docs/guides/structured-outputs
- Cloudflare Workers: https://developers.cloudflare.com/workers/
