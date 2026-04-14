import { google } from 'googleapis';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SPREADSHEET_ID = '1nVVm4tclo_hzmG9KhAMXZPwDToll8smS2LC7MVsx-2g';
const SHEET_NAME     = 'Control de Viáticos - Argenteo Mining SA';

function getAuth() {
  const keyFile = path.join(__dirname, 'service-account.json');
  return new google.auth.GoogleAuth({
    keyFile,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
}

/**
 * Append one viático row (columns A–L).
 * @param {Object} data
 * @param {string} data.fecha        — A
 * @param {string} data.factura      — B
 * @param {string} data.proveedor    — C
 * @param {string} data.idFiscal     — D
 * @param {string} data.descripcion  — E
 * @param {number} data.subtotal     — F
 * @param {number} data.impuestos    — G
 * @param {number} data.total        — H
 * @param {string} data.pago         — I
 * @param {string} data.categoria    — J
 * @param {string} data.motivo       — K
 * @param {string} data.zona         — L
 */
export async function appendViatico(data) {
  const auth    = getAuth();
  const sheets  = google.sheets({ version: 'v4', auth });

  const row = [
    data.fecha,
    data.factura,
    data.proveedor,
    data.idFiscal,
    data.descripcion,
    data.subtotal,
    data.impuestos,
    data.total,
    data.pago,
    data.categoria,
    data.motivo,
    data.zona,
  ];

  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range:         `'${SHEET_NAME}'!A:L`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [row] },
  });
}
