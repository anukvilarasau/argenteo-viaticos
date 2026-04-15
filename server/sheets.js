import { google } from 'googleapis';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SPREADSHEET_ID = '12wbKrHrHqV_UtToojXlRQHopBRo1nypriT9C4FQAbPY';
const SHEET_NAME     = 'Control de Viáticos - Argenteo Mining SA';

function getAuth() {
  const scopes = ['https://www.googleapis.com/auth/spreadsheets'];

  /* En Vercel las credenciales vienen como variable de entorno */
  if (process.env.GOOGLE_SERVICE_ACCOUNT) {
    const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT);
    return new google.auth.GoogleAuth({ credentials, scopes });
  }

  /* En local usa el archivo */
  const keyFile = path.join(__dirname, 'service-account.json');
  return new google.auth.GoogleAuth({ keyFile, scopes });
}

/**
 * Append one viático row inside the existing formatted table.
 * Copies the format from the row above so borders/colors se mantienen.
 */
export async function appendViatico(data) {
  const auth   = getAuth();
  const sheets = google.sheets({ version: 'v4', auth });

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

  /* ── 1. Obtener metadata para el sheetId numérico ── */
  const meta = await sheets.spreadsheets.get({
    spreadsheetId: SPREADSHEET_ID,
    fields: 'sheets(properties(sheetId,title))',
  });

  const sheetMeta = meta.data.sheets.find(
    s => s.properties.title === SHEET_NAME
  );
  if (!sheetMeta) throw new Error(`Hoja "${SHEET_NAME}" no encontrada.`);
  const sheetId = sheetMeta.properties.sheetId;

  /* ── 2. Encontrar la primera fila vacía ── */
  const existing = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${SHEET_NAME}'!A:A`,
  });
  const lastRow = (existing.data.values || []).length; // índice base-1 de la última fila con datos
  const newRowIndex = lastRow; // índice base-0 de la fila nueva (0-based para batchUpdate)

  /* ── 3. Copiar formato de la fila anterior a la nueva ── */
  if (lastRow > 1) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: {
        requests: [
          {
            copyPaste: {
              source: {
                sheetId,
                startRowIndex: newRowIndex - 1,  // fila anterior (0-based)
                endRowIndex:   newRowIndex,
                startColumnIndex: 0,
                endColumnIndex:   12,
              },
              destination: {
                sheetId,
                startRowIndex: newRowIndex,       // fila nueva (0-based)
                endRowIndex:   newRowIndex + 1,
                startColumnIndex: 0,
                endColumnIndex:   12,
              },
              pasteType: 'PASTE_FORMAT',
              pasteOrientation: 'NORMAL',
            },
          },
        ],
      },
    });
  }

  /* ── 4. Escribir los valores en la fila nueva ── */
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${SHEET_NAME}'!A${lastRow + 1}:L${lastRow + 1}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [row] },
  });
}
