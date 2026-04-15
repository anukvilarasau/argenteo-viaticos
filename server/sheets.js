import { ClientSecretCredential } from '@azure/identity';

const GRAPH_BASE   = 'https://graph.microsoft.com/v1.0';
const EXCEL_FILE_ID = process.env.EXCEL_FILE_ID;    /* ID del archivo en OneDrive */
const DRIVE_ID      = process.env.EXCEL_DRIVE_ID;   /* opcional: drive específico */
const TABLE_NAME    = process.env.EXCEL_TABLE_NAME || 'Tabla1'; /* nombre de la tabla en Excel */

function getCredential() {
  return new ClientSecretCredential(
    process.env.AZURE_TENANT_ID,
    process.env.AZURE_CLIENT_ID,
    process.env.AZURE_CLIENT_SECRET,
  );
}

async function getToken() {
  const cred  = getCredential();
  const token = await cred.getToken('https://graph.microsoft.com/.default');
  return token.token;
}

/**
 * Agrega una fila a la tabla de Excel Online.
 * Columnas: Fecha, Factura, Proveedor, ID Fiscal, Descripción,
 *           Subtotal, Impuestos, Total, Pago, Categoría, Motivo, Zona
 */
export async function appendViatico(data) {
  const token = await getToken();

  const values = [[
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
  ]];

  /* Construir URL según si se usa drive específico o el drive del usuario */
  const itemPath = DRIVE_ID
    ? `${GRAPH_BASE}/drives/${DRIVE_ID}/items/${EXCEL_FILE_ID}`
    : `${GRAPH_BASE}/me/drive/items/${EXCEL_FILE_ID}`;

  const url = `${itemPath}/workbook/tables/${TABLE_NAME}/rows/add`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify({ values }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Graph API error ${res.status}: ${err}`);
  }

  return await res.json();
}
