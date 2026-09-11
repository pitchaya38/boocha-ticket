import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { getUserFromRequest, jsonResponse } from '../../../_utils/auth.js';

export async function onRequestGet({ request, env, params }) {
  const user = await getUserFromRequest(request, env);
  if (!user) return jsonResponse({ error: 'กรุณา login' }, 401);

  const txn = await env.DB
    .prepare(
      `SELECT t.*, l.lot_no, l.expiry_date, p.name AS product_name, p.sku, p.unit, b.name AS branch_name
       FROM transactions t
       JOIN lots l ON l.id = t.lot_id
       JOIN products p ON p.id = l.product_id
       JOIN branches b ON b.id = t.branch_id
       WHERE t.id = ?`
    )
    .bind(params.id)
    .first();
  if (!txn) return jsonResponse({ error: 'ไม่พบรายการ' }, 404);

  // หมายเหตุ: เช่นเดียวกับ PO PDF ต้อง embed ฟอนต์ไทย (Sarabun) เพิ่มเองถ้าต้องการภาษาไทยในไฟล์จริง
  const doc = await PDFDocument.create();
  const page = doc.addPage([595, 400]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  let y = 350;
  page.drawText(`${txn.type === 'จ่ายออก' ? 'Outbound' : 'Return'} #${txn.id}`, { x: 50, y, size: 16, font: bold });
  y -= 26;
  const rows = [
    ['Branch', txn.branch_name],
    ['Product', `${txn.product_name} (${txn.sku})`],
    ['Lot', txn.lot_no],
    ['Qty', `${txn.qty} ${txn.unit}`],
    ['Date', txn.txn_date],
    ['Expiry', txn.expiry_date || '-'],
    ['Contact name', txn.contact_name || '-'],
    ['Contact phone', txn.contact_phone || '-'],
  ];
  for (const [label, value] of rows) {
    page.drawText(`${label}:`, { x: 50, y, size: 11, font: bold });
    page.drawText(String(value), { x: 180, y, size: 11, font });
    y -= 20;
  }

  const pdfBytes = await doc.save();
  return new Response(pdfBytes, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="txn-${txn.id}.pdf"`,
    },
  });
}
