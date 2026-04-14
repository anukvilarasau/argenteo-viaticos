import Anthropic from '@anthropic-ai/sdk';
import { appendViatico } from './sheets.js';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `Eres el asistente de gestión de viáticos de **Argenteo Mining SA**.
Tu rol es ayudar a los empleados a registrar sus gastos de viaje y estadía de manera rápida y precisa.

## Flujo operativo

1. **El empleado sube una foto o PDF de su factura/comprobante.**
2. Usás visión para extraer TODOS los campos contables:
   - Fecha (formato DD/MM/YYYY)
   - Número de factura (ej: "0001-00012345" o como aparezca)
   - Nombre del proveedor
   - CUIT/ID Fiscal del proveedor
   - Descripción del servicio o producto
   - Subtotal (sin impuestos), Impuestos (IVA u otros), Total
   - Medio de pago (Efectivo / Tarjeta corporativa / Transferencia / A rendir)
   - Categoría (Hospedaje / Alimentación / Transporte / Combustible / Herramientas / Otros)
3. **Preguntás al empleado** los dos datos que NO están en la factura:
   - **Motivo del viaje** (ej: "Inspección de planta Norte", "Reunión con proveedores")
   - **Zona** — debe ser exactamente una de: ZN (Zona Norte), ZCE (Zona Centro-Este), ZCO (Zona Centro-Oeste), ZS (Zona Sur)
4. Con toda la información completa, **confirmás el registro** mostrando un resumen y usás la herramienta \`register_viatico\` para guardarlo en Google Sheets.
5. Confirmás al empleado que el registro fue exitoso con el número de fila.

## Reglas importantes
- Si la imagen no es legible o está recortada, pedís que la vuelvan a subir.
- Si falta algún campo contable extraíble de la factura, indicalo claramente.
- Nunca inventés datos — si no podés leerlos, preguntás.
- Usá siempre el formato de fecha DD/MM/YYYY.
- Los montos son en pesos argentinos (ARS) salvo que se indique otra moneda.
- Respondé siempre en español.`;

/* Tool definition for Claude */
const TOOLS = [
  {
    name: 'register_viatico',
    description: 'Registra un viático en la planilla de Google Sheets de Argenteo Mining SA. Usá esta herramienta SOLO cuando tenés todos los campos completos y el empleado confirmó el registro.',
    input_schema: {
      type: 'object',
      properties: {
        fecha:       { type: 'string',  description: 'Fecha de la factura en formato DD/MM/YYYY' },
        factura:     { type: 'string',  description: 'Número de factura' },
        proveedor:   { type: 'string',  description: 'Nombre del proveedor o emisor' },
        idFiscal:    { type: 'string',  description: 'CUIT o ID fiscal del proveedor' },
        descripcion: { type: 'string',  description: 'Descripción del servicio o producto' },
        subtotal:    { type: 'number',  description: 'Monto sin impuestos en ARS' },
        impuestos:   { type: 'number',  description: 'IVA u otros impuestos en ARS' },
        total:       { type: 'number',  description: 'Monto total en ARS' },
        pago:        { type: 'string',  description: 'Medio de pago', enum: ['Efectivo','Tarjeta corporativa','Transferencia','A rendir'] },
        categoria:   { type: 'string',  description: 'Categoría del gasto', enum: ['Hospedaje','Alimentación','Transporte','Combustible','Herramientas','Otros'] },
        motivo:      { type: 'string',  description: 'Motivo del viaje o gasto (provisto por el empleado)' },
        zona:        { type: 'string',  description: 'Zona geográfica', enum: ['ZN','ZCE','ZCO','ZS'] },
      },
      required: ['fecha','factura','proveedor','idFiscal','descripcion','subtotal','impuestos','total','pago','categoria','motivo','zona'],
    },
  },
];

/**
 * Run an agentic turn (handles one tool call round-trip).
 * @param {Array}  history  — previous messages (mutated in-place and returned)
 * @param {string|null} text — new text from user (can be null if only file)
 * @param {Array}  files    — [{ base64, mediaType }] from multer
 * @returns {{ reply: string, history: Array }}
 */
export async function chat(history, text, files = []) {
  /* Build user content */
  const userContent = [];

  for (const f of files) {
    if (f.mediaType === 'application/pdf') {
      userContent.push({
        type: 'document',
        source: { type: 'base64', media_type: 'application/pdf', data: f.base64 },
      });
    } else {
      userContent.push({
        type: 'image',
        source: { type: 'base64', media_type: f.mediaType, data: f.base64 },
      });
    }
  }

  if (text) {
    userContent.push({ type: 'text', text });
  }

  history.push({ role: 'user', content: userContent });

  /* Agentic loop — handles tool use */
  let reply = '';
  while (true) {
    const response = await client.messages.create({
      model:      'claude-opus-4-6',
      max_tokens: 2048,
      system:     SYSTEM_PROMPT,
      tools:      TOOLS,
      messages:   history,
      thinking:   { type: 'adaptive' },
    });

    history.push({ role: 'assistant', content: response.content });

    if (response.stop_reason === 'end_turn') {
      /* Extract visible text blocks */
      reply = response.content
        .filter(b => b.type === 'text')
        .map(b => b.text)
        .join('\n')
        .trim();
      break;
    }

    if (response.stop_reason === 'tool_use') {
      const toolResults = [];

      for (const block of response.content) {
        if (block.type !== 'tool_use') continue;

        if (block.name === 'register_viatico') {
          let result;
          try {
            await appendViatico(block.input);
            result = { success: true, message: 'Viático registrado exitosamente en Google Sheets.' };
          } catch (err) {
            result = { success: false, message: `Error al registrar: ${err.message}` };
          }
          toolResults.push({
            type:        'tool_result',
            tool_use_id: block.id,
            content:     JSON.stringify(result),
          });
        }
      }

      history.push({ role: 'user', content: toolResults });
      continue;
    }

    /* Unexpected stop reason — break to avoid infinite loop */
    break;
  }

  return { reply, history };
}
