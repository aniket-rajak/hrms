import PDFDocument from 'pdfkit';
import { Employee } from '../models';
import { ApiError } from '../lib/errors';
import { oid } from '../lib/db';
import { getSettingsMap } from './settings.service';
import { toDateOnly } from '../utils/dates';

const BRAND = '#1d4ed8';
const DARK = '#111827';
const MUTED = '#6b7280';

const CARD_W = 243;
const CARD_H = 154;

async function fetchImage(url: string): Promise<Buffer | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    const buffer = Buffer.from(await res.arrayBuffer());
    return buffer.length > 0 ? buffer : null;
  } catch {
    return null;
  }
}

export async function generateIdCardPdf(employeeId: string): Promise<{ buffer: Buffer; filename: string }> {
  const employee = await Employee.findById(oid(employeeId)).populate([
    { path: 'department', select: 'name' },
    { path: 'user', select: 'email' },
  ]);
  if (!employee) throw ApiError.notFound('Employee not found');

  const settings = await getSettingsMap();
  const companyName = settings.companyName || 'My Company';
  const companyLogo = (settings.companyLogo as string | null) ?? null;

  let photo: Buffer | null = null;
  if (employee.profileImageUrl) {
    photo = await fetchImage(employee.profileImageUrl);
  }

  const buffer = await new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({ size: [CARD_W, CARD_H], margin: 0 });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.rect(0, 0, CARD_W, CARD_H).fill('#ffffff');

    doc.rect(0, 0, CARD_W, 24).fill(BRAND);
    doc.fontSize(10).fillColor('#ffffff').text('EMPLOYEE ID CARD', 12, 8, { characterSpacing: 1.5 });

    if (companyLogo) {
      doc.image(companyLogo, 12, 30, { width: 34 });
      doc.fontSize(9).fillColor(DARK).text(companyName, 52, 32, { width: 120 });
    } else {
      doc.fontSize(9).fillColor(DARK).text(companyName, 12, 32, { width: 160 });
    }

    if (photo) {
      try {
        doc.roundedRect(177, 28, 54, 56, 4);
        doc.image(photo, 179, 30, { width: 50, height: 52, fit: [50, 52] });
      } catch {
        doc.roundedRect(177, 28, 54, 56, 4).fill('#f3f4f6');
        doc.fontSize(7).fillColor(MUTED).text('NO PHOTO', 177, 48, { width: 54, align: 'center' });
      }
    } else {
      doc.roundedRect(177, 28, 54, 56, 4).fill('#f3f4f6');
      doc.fontSize(7).fillColor(MUTED).text('NO PHOTO', 177, 48, { width: 54, align: 'center' });
    }

    doc
      .fontSize(10)
      .fillColor(DARK)
      .text(`${employee.firstName} ${employee.lastName}`.toUpperCase(), 12, 58, { width: 160, characterSpacing: 0.3 });

    doc.fontSize(7.5).fillColor(MUTED);
    doc.text('Employee Code', 12, 70);
    doc.fillColor(DARK).font('Helvetica-Bold').text(employee.employeeCode, 12, 76.5, { width: 160 });
    doc.font('Helvetica');

    const rows: [string, string][] = [
      ['Designation', employee.designation],
      ['Department', (employee.department as { name?: string } | null)?.name ?? '—'],
      ['Date of joining', toDateOnly(employee.joiningDate)],
    ];
    let y = 88;
    for (const [label, value] of rows) {
      doc.fontSize(7).fillColor(MUTED).text(label, 12, y, { width: 52 });
      doc.fillColor(DARK).text(value, 66, y, { width: 100 });
      y += 12.5;
    }

    doc.fontSize(6.5).fillColor(MUTED).text(
      `Valid while employed · ${companyName}`,
      12,
      CARD_H - 14,
      { width: CARD_W - 24 },
    );

    doc.end();
  });

  return { buffer, filename: `id-card-${employee.employeeCode}.pdf` };
}
