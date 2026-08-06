import PDFDocument from 'pdfkit';
import { PayrollGenerateInput, SalaryStructureInput } from '@hrms/shared';
import { prisma } from '../lib/prisma';
import { ApiError } from '../lib/errors';
import { PaginationParams, paginated } from '../utils/pagination';
import { serializeDecimal, serializeDecimalMap } from '../utils/serializers';
import { endOfMonth, startOfMonth, monthName, toDateOnly, currentYear } from '../utils/dates';
import { logActivity } from './activity.service';
import { getSettingsMap } from './settings.service';
import { calculateNet, serializeStructure } from './employee.service';

const employeePick = {
  select: {
    id: true,
    firstName: true,
    lastName: true,
    employeeCode: true,
    profileImageUrl: true,
    designation: true,
    department: { select: { name: true } },
  },
} as const;

function serializeRecord(record: Record<string, unknown>) {
  const employee = record.employee as Record<string, unknown> | null | undefined;
  return {
    id: record.id as number,
    employeeId: record.employeeId as number,
    month: record.month as number,
    year: record.year as number,
    structureSnapshot: serializeDecimalMap(record.structureSnapshot),
    earnings: serializeDecimalMap(record.earnings),
    deductions: serializeDecimalMap(record.deductions),
    netSalary: serializeDecimal(record.netSalary),
    status: record.status as string,
    paidAt: record.paidAt ? (record.paidAt as Date).toISOString() : null,
    createdAt: (record.createdAt as Date).toISOString(),
    employee: employee
      ? {
          id: employee.id as number,
          firstName: employee.firstName as string,
          lastName: employee.lastName as string,
          employeeCode: employee.employeeCode as string,
          profileImageUrl: (employee.profileImageUrl as string | null) ?? null,
          designation: employee.designation as string,
          department: employee.department as Record<string, unknown> | null ?? null,
        }
      : null,
  };
}

export async function getStructure(employeeId: number) {
  const structure = await prisma.salaryStructure.findUnique({ where: { employeeId } });
  if (!structure) throw ApiError.notFound('Salary structure not found');
  return serializeStructure(structure);
}

export async function upsertStructure(employeeId: number, data: SalaryStructureInput, actor: { id: number; email: string }) {
  const netSalary = calculateNet(data);
  const structure = await prisma.salaryStructure.upsert({
    where: { employeeId },
    update: { ...data, netSalary },
    create: { employeeId, ...data, netSalary },
  });
  await logActivity({
    userId: actor.id,
    actorName: actor.email,
    type: 'PAYROLL',
    message: 'Updated salary structure',
  });
  return serializeStructure(structure);
}

export async function generateMonthly(data: PayrollGenerateInput, actor: { id: number; email: string }) {
  const employees = await prisma.employee.findMany({
    where: { status: { in: ['ACTIVE', 'ON_LEAVE'] } },
    include: { salaryStructure: true },
  });

  const existing = await prisma.payrollRecord.count({
    where: { month: data.month, year: data.year },
  });
  if (existing > 0) {
    throw ApiError.conflict(
      `Payroll for ${monthName(data.year, data.month)} ${data.year} already exists. Delete existing records first to regenerate.`,
    );
  }

  let created = 0;
  for (const employee of employees) {
    if (!employee.salaryStructure) continue;
    const earnings = {
      basic: serializeDecimal(employee.salaryStructure.basic),
      housing: serializeDecimal(employee.salaryStructure.housing),
      transport: serializeDecimal(employee.salaryStructure.transport),
      medical: serializeDecimal(employee.salaryStructure.medical),
      otherAllowances: serializeDecimal(employee.salaryStructure.otherAllowances),
    };
    const deductions = { deductions: serializeDecimal(employee.salaryStructure.deductions) };
    const netSalary =
      earnings.basic + earnings.housing + earnings.transport + earnings.medical + earnings.otherAllowances -
      deductions.deductions;

    await prisma.payrollRecord.create({
      data: {
        employeeId: employee.id,
        month: data.month,
        year: data.year,
        structureSnapshot: earnings,
        earnings,
        deductions,
        netSalary,
      },
    });
    created++;
  }

  await logActivity({
    userId: actor.id,
    actorName: actor.email,
    type: 'PAYROLL',
    message: `Generated payroll for ${monthName(data.year, data.month)} ${data.year} (${created} records)`,
  });

  return { created };
}

export interface PayrollListParams extends PaginationParams {
  month?: number;
  year?: number;
  status?: string;
  search?: string;
  employeeId?: number;
}

export async function listRecords(params: PayrollListParams) {
  const where: Record<string, unknown> = {};
  if (params.employeeId) where.employeeId = params.employeeId;
  if (params.month) where.month = params.month;
  if (params.year) where.year = params.year;
  if (params.status) where.status = params.status;
  if (params.search) {
    const term = params.search.trim();
    where.employee = {
      OR: [
        { firstName: { contains: term } },
        { lastName: { contains: term } },
        { employeeCode: { contains: term } },
      ],
    };
  }

  const [records, total] = await Promise.all([
    prisma.payrollRecord.findMany({
      where,
      include: { employee: employeePick },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
    }),
    prisma.payrollRecord.count({ where }),
  ]);

  return paginated(records.map((r) => serializeRecord(r as never)), total, params);
}

export async function getRecord(id: number) {
  const record = await prisma.payrollRecord.findUnique({
    where: { id },
    include: { employee: { include: { department: true } } },
  });
  if (!record) throw ApiError.notFound('Payroll record not found');
  return serializeRecord(record as never);
}

export async function markPaid(id: number, actor: { id: number; email: string }) {
  const record = await prisma.payrollRecord.findUnique({ where: { id } });
  if (!record) throw ApiError.notFound('Payroll record not found');

  const updated = await prisma.payrollRecord.update({
    where: { id },
    data: { status: 'PAID', paidAt: new Date() },
  });
  await logActivity({
    userId: actor.id,
    actorName: actor.email,
    type: 'PAYROLL',
    message: `Marked ${monthName(record.year, record.month)} ${record.year} salary as paid`,
  });
  return serializeRecord(updated as never);
}

export async function deleteRecord(id: number, actor: { id: number; email: string }) {
  const record = await prisma.payrollRecord.findUnique({ where: { id } });
  if (!record) throw ApiError.notFound('Payroll record not found');

  await prisma.payrollRecord.delete({ where: { id } });
  await logActivity({
    userId: actor.id,
    actorName: actor.email,
    type: 'PAYROLL',
    message: `Deleted ${monthName(record.year, record.month)} ${record.year} payroll record`,
  });
}

const BRAND = '#1d4ed8';
const MUTED = '#6b7280';

function buildSlipPdf(
  record: {
    id: number;
    month: number;
    year: number;
    earnings: Record<string, number>;
    deductions: Record<string, number>;
    netSalary: number;
    status: string;
  },
  employee: {
    employeeCode: string;
    firstName: string;
    lastName: string;
    designation: string;
  },
  company: {
    name: string;
    address: string | null;
    email: string | null;
    phone: string | null;
    logo: string | null;
  },
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 48 });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    if (company.logo) {
      doc.image(company.logo, 48, 40, { width: 56 });
      doc.fontSize(18).fillColor('#111827').text(company.name, 118, 48);
      doc.fontSize(9).fillColor(MUTED).text(
        [company.address, [company.email, company.phone].filter(Boolean).join(' | ')].filter(Boolean).join('\n'),
        118,
        66,
        { width: 420 },
      );
    } else {
      doc.fontSize(18).fillColor('#111827').text(company.name, 48, 48);
      doc.fontSize(9).fillColor(MUTED).text(
        [company.address, [company.email, company.phone].filter(Boolean).join(' | ')].filter(Boolean).join('\n'),
        48,
        66,
      );
    }

    doc.rect(48, 108, 500, 1).fill('#e5e7eb');
    doc
      .fontSize(14)
      .fillColor('#111827')
      .text('Salary Slip', 48, 122);
    doc
      .fontSize(9)
      .fillColor(MUTED)
      .text(`Period: ${monthName(record.year, record.month)} ${record.year}`, 48, 140);

    const tableTop = 168;
    doc
      .rect(48, tableTop, 240, 26)
      .fill('#f3f4f6');
    doc
      .rect(308, tableTop, 240, 26)
      .fill('#f3f4f6');
    doc.fontSize(10).fillColor('#111827');
    doc.text('Employee', 58, tableTop + 8);
    doc.text('Details', 318, tableTop + 8);

    doc.fontSize(9).fillColor('#374151');
    const rows: [string, string][] = [
      ['Name', `${employee.firstName} ${employee.lastName}`],
      ['Employee Code', employee.employeeCode],
      ['Designation', employee.designation],
    ];
    let y = tableTop + 32;
    doc.rect(48, tableTop + 26, 500, 1).fill('#e5e7eb');
    for (const [label, value] of rows) {
      doc.fillColor(MUTED).text(label, 58, y);
      doc.fillColor('#111827').text(value, 318, y);
      y += 18;
    }

    y += 14;
    doc.rect(48, y, 240, 26).fill('#f3f4f6');
    doc.rect(308, y, 240, 26).fill('#f3f4f6');
    doc.fontSize(10).fillColor('#111827');
    doc.text('Earnings', 58, y + 8);
    doc.text('Amount', 318, y + 8);
    y += 32;
    doc.rect(48, y - 6, 500, 1).fill('#e5e7eb');

    const earningRows: [string, number][] = [
      ['Basic Salary', record.earnings.basic ?? 0],
      ['Housing Allowance', record.earnings.housing ?? 0],
      ['Transport Allowance', record.earnings.transport ?? 0],
      ['Medical Allowance', record.earnings.medical ?? 0],
      ['Other Allowances', record.earnings.otherAllowances ?? 0],
    ];
    for (const [label, value] of earningRows) {
      doc.fontSize(9);
      doc.fillColor('#374151').text(label, 58, y);
      doc.fillColor('#111827').text(value.toLocaleString(undefined, { minimumFractionDigits: 2 }), 318, y);
      y += 18;
    }

    y += 14;
    doc.rect(48, y, 240, 26).fill('#fef2f2');
    doc.rect(308, y, 240, 26).fill('#fef2f2');
    doc.fontSize(10).fillColor('#111827');
    doc.text('Deductions', 58, y + 8);
    doc.text('Amount', 318, y + 8);
    y += 32;
    doc.rect(48, y - 6, 500, 1).fill('#e5e7eb');
    doc.fontSize(9).fillColor('#374151').text('Total Deductions', 58, y);
    doc.fillColor('#111827').text((record.deductions.deductions ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 }), 318, y);
    y += 18;

    y += 10;
    doc
      .rect(48, y, 500, 34)
      .fill('#1d4ed8');
    doc.fontSize(11).fillColor('#ffffff').text('NET SALARY', 58, y + 11);
    doc.text(
      record.netSalary.toLocaleString(undefined, { minimumFractionDigits: 2 }),
      520,
      y + 11,
      { align: 'right' },
    );

    y += 60;
    doc.fontSize(8).fillColor(MUTED).text(
      `Generated by ${company.name} on ${new Date().toLocaleDateString()}`,
      48,
      y,
    );
    doc.fontSize(8).fillColor(MUTED).text(
      `Status: ${record.status === 'PAID' ? 'Paid' : 'Draft'}`,
      48,
      y + 12,
    );

    doc.end();
  });
}

export async function generateSlipPdf(recordId: number): Promise<{ buffer: Buffer; filename: string }> {
  const record = await prisma.payrollRecord.findUnique({
    where: { id: recordId },
    include: { employee: true },
  });
  if (!record) throw ApiError.notFound('Payroll record not found');

  const settings = await getSettingsMap();
  const company = {
    name: settings.companyName ?? 'My Company',
    address: (settings.companyAddress as string | null) ?? null,
    email: (settings.companyEmail as string | null) ?? null,
    phone: (settings.companyPhone as string | null) ?? null,
    logo: (settings.companyLogo as string | null) ?? null,
  };

  const buffer = await buildSlipPdf(
    {
      id: record.id,
      month: record.month,
      year: record.year,
      earnings: serializeDecimalMap(record.earnings),
      deductions: serializeDecimalMap(record.deductions),
      netSalary: serializeDecimal(record.netSalary),
      status: record.status,
    },
    {
      employeeCode: record.employee.employeeCode,
      firstName: record.employee.firstName,
      lastName: record.employee.lastName,
      designation: record.employee.designation,
    },
    company,
  );

  const filename = `salary-slip-${record.employee.employeeCode}-${record.year}-${String(record.month).padStart(2, '0')}.pdf`;
  return { buffer, filename };
}
