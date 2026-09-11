import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { getUserFromRequest, jsonResponse } from '../../../_utils/auth.js';

// GET /api/po/:id/pdf -> stream PDF ใบสั่งซื้อกลับไป
export async function onRequestGet({ request, env, params }) {
  const user = await getUserFromRequest(request, env);
  if (!user) return jsonResponse({ error: 'กรุณา login' }, 401);

  const po = await env.DB
    .prepare(
      `SELECT po.*, s.name AS supplier_name, s.contact_name, s.phone AS supplier_phone
       FROM purchase_orders po JOIN suppliers s ON s.id = po.supplier_id WHERE po.id = ?`
    )
    .bind(params.id)
    .first();
  if (!po) return jsonResponse({ error: 'ไม่พบใบ PO' }, 404);

  const { results: items } = await env.DB
    .prepare(
      `SELECT pi.*, p.name AS product_name, p.sku, p.unit
       FROM po_items pi JOIN products p ON p.id = pi.product_id WHERE pi.po_id = ?`
    )
    .bind(params.id)
    .all();

  // หมายเหตุ: pdf-lib ไม่มีฟอนต์ไทยในตัว ต้อง embed ฟอนต์ไทย (เช่น Sarabun .ttf) เพิ่มเอง
  // ตรงนี้ยกตัวอย่างด้วย StandardFonts (อังกฤษ/ตัวเลขล้วน) ไว้ก่อน โครงพร้อมใส่ฟอนต์ไทยได้เลย
  const doc = await PDFDocument.create();
  const page = doc.addPage([595, 842]); // A4
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  let y = 800;
  page.drawText(`Purchase Order: ${po.po_number}`, { x: 50, y, size: 16, font: bold });
  y -= 24;
  page.drawText(`Supplier: ${po.supplier_name}`, { x: 50, y, size: 11, font });
  y -= 16;
  page.drawText(`Contact: ${po.contact_name || '-'}  Phone: ${po.supplier_phone || '-'}`, { x: 50, y, size: 11, font });
  y -= 16;
  page.drawText(`Status: ${po.status}`, { x: 50, y, size: 11, font });
  y -= 16;
  page.drawText(`Created at: ${po.created_at}`, { x: 50, y, size: 11, font });
  y -= 30;

  page.drawText('SKU', { x: 50, y, size: 10, font: bold });
  page.drawText('Product', { x: 130, y, size: 10, font: bold });
  page.drawText('Qty', { x: 330, y, size: 10, font: bold });
  page.drawText('Unit price', { x: 400, y, size: 10, font: bold });
  page.drawText('Amount', { x: 490, y, size: 10, font: bold });
  y -= 6;
  page.drawLine({ start: { x: 50, y }, end: { x: 545, y }, thickness: 0.5, color: rgb(0.7, 0.7, 0.7) });
  y -= 16;

  for (const it of items) {
    page.drawText(String(it.sku), { x: 50, y, size: 10, font });
    page.drawText(String(it.product_name).slice(0, 30), { x: 130, y, size: 10, font });
    page.drawText(`${it.qty_ordered} ${it.unit}`, { x: 330, y, size: 10, font });
    page.drawText(it.unit_price.toFixed(2), { x: 400, y, size: 10, font });
    page.drawText((it.qty_ordered * it.unit_price).toFixed(2), { x: 490, y, size: 10, font });
    y -= 18;
  }

  y -= 10;
  page.drawLine({ start: { x: 50, y }, end: { x: 545, y }, thickness: 0.5, color: rgb(0.7, 0.7, 0.7) });
  y -= 20;
  page.drawText(`Total: ${po.total_amount.toFixed(2)}`, { x: 400, y, size: 12, font: bold });

  const pdfBytes = await doc.save();
  return new Response(pdfBytes, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${po.po_number}.pdf"`,
    },
  });
}
