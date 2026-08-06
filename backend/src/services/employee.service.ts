import bcrypt from 'bcryptjs';
import { Prisma } from '@prisma/client';
import {
  DEFAULT_PASSWORD,
  EmployeeCreateInput,
  EmployeeUpdateInput,
  EmployeeDocumentInput,
  SalaryStructureInput,
} from '@hrms/shared';
import { prisma } from '../lib/prisma';
import { ApiError } from '../lib/errors';
import { PaginationParams, paginated } from '../utils/pagination';
import { serializeDecimal } from '../utils/serializers';
import { currentYear } from '../utils/dates';
import { ensureLeaveBalances } from './auth.service';
import { mailer } from './mailer.service';
import { logActivity } from './activity.service';

const employeeInclude = {
  department: true,
  salaryStructure: true,
  user: { select: { id: true, email: true, role: true, status: true } },
} as const;

function serializeEmployee(employee: Record<string, unknown> & { salaryStructure?: unknown }): Record<string, unknown> {
  return {
    ...employee,
    dateOfBirth: employee.dateOfBirth ? (employee.dateOfBirth as Date).toISOString() : null,
    joiningDate: (employee.joiningDate as Date).toISOString(),
    createdAt: (employee.createdAt as Date).toISOString(),
    updatedAt: (employee.updatedAt as Date).toISOString(),
    salaryStructure: employee.salaryStructure ? serializeStructure(employee.salaryStructure) : null,
  };
}

export function serializeStructure(structure: unknown): SalaryStructureDto | null {
  if (!structure) return null;
  const s = structure as Record<string, unknown>;
  return {
    id: s.id as number,
    employeeId: s.employeeId as number,
    basic: serializeDecimal(s.basic),
    housing: serializeDecimal(s.housing),
    transport: serializeDecimal(s.transport),
    medical: serializeDecimal(s.medical),
    otherAllowances: serializeDecimal(s.otherAllowances),
    deductions: serializeDecimal(s.deductions),
    netSalary: serializeDecimal(s.netSalary),
    updatedAt: (s.updatedAt as Date).toISOString(),
  };
}

export interface SalaryStructureDto {
  id: number;
  employeeId: number;
  basic: number;
  housing: number;
  transport: number;
  medical: number;
  otherAllowances: number;
  deductions: number;
  netSalary: number;
  updatedAt: string;
}

export interface EmployeeListParams extends PaginationParams {
  search?: string;
  departmentId?: number | null;
  status?: string;
}

export async function listEmployees(params: EmployeeListParams) {
  const where: Record<string, unknown> = {};
  if (params.search) {
    const term = params.search.trim();
    where.OR = [
      { firstName: { contains: term } },
      { lastName: { contains: term } },
      { email: { contains: term } },
      { employeeCode: { contains: term } },
      { designation: { contains: term } },
    ];
  }
  if (params.departmentId) where.departmentId = params.departmentId;
  if (params.status) where.status = params.status;

  const [employees, total] = await Promise.all([
    prisma.employee.findMany({
      where,
      include: employeeInclude,
      orderBy: { createdAt: 'desc' },
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
    }),
    prisma.employee.count({ where }),
  ]);

  return paginated(employees.map((e) => serializeEmployee(e as never)), total, params);
}

export async function getEmployee(id: number) {
  const employee = await prisma.employee.findUnique({
    where: { id },
    include: { ...employeeInclude, documents: true },
  });
  if (!employee) throw ApiError.notFound('Employee not found');
  return {
    ...serializeEmployee(employee as never),
    documents: (employee.documents ?? []).map((d) => ({
      ...d,
      createdAt: d.createdAt.toISOString(),
    })),
  };
}

async function generateEmployeeCode(): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const count = await prisma.employee.count();
    const code = `EMP-${String(count + 1 + attempt * 37).padStart(4, '0')}`;
    const exists = await prisma.employee.findUnique({ where: { employeeCode: code } });
    if (!exists) return code;
  }
  return `EMP-${Date.now()}`;
}

export async function createEmployee(data: EmployeeCreateInput, actor: { id: number; email: string }) {
  const email = data.email.toLowerCase().trim();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw ApiError.conflict('An account with this email already exists');

  const password = DEFAULT_PASSWORD;
  const passwordHash = await bcrypt.hash(password, 10);
  const employeeCode = await generateEmployeeCode();

  const structureInput = {
    basic: data.basic ?? 0,
    housing: data.housing ?? 0,
    transport: data.transport ?? 0,
    medical: data.medical ?? 0,
    otherAllowances: data.otherAllowances ?? 0,
    deductions: data.deductions ?? 0,
  };

  const employee = await prisma.$transaction(async (tx) => {
    const created = await tx.employee.create({
      data: {
        employeeCode,
        firstName: data.firstName,
        lastName: data.lastName,
        email,
        phone: data.phone || null,
        gender: data.gender,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
        address: data.address || null,
        city: data.city || null,
        state: data.state || null,
        postalCode: data.postalCode || null,
        country: data.country || null,
        designation: data.designation,
        joiningDate: new Date(data.joiningDate),
        status: data.status,
        department: data.departmentId ? { connect: { id: data.departmentId } } : undefined,
        user: {
          create: {
            email,
            passwordHash,
            role: 'EMPLOYEE',
            status: 'ACTIVE',
          },
        },
        salaryStructure: {
          create: {
            ...structureInput,
            netSalary: calculateNet(structureInput),
          },
        },
      } satisfies Prisma.EmployeeCreateInput,
      include: employeeInclude,
    });
    await ensureLeaveBalances(created.id, currentYear());
    return created;
  });

  await mailer.sendCredentials(email, email, password);
  await logActivity({
    userId: actor.id,
    actorName: actor.email,
    type: 'EMPLOYEE',
    message: `Added employee ${data.firstName} ${data.lastName} (${employeeCode})`,
  });

  return serializeEmployee(employee as never);
}

export function calculateNet(structure: {
  basic: number;
  housing?: number;
  transport?: number;
  medical?: number;
  otherAllowances?: number;
  deductions?: number;
}): number {
  const total = structure.basic + (structure.housing ?? 0) + (structure.transport ?? 0) +
    (structure.medical ?? 0) + (structure.otherAllowances ?? 0);
  return Math.round((total - (structure.deductions ?? 0)) * 100) / 100;
}

export async function updateEmployee(id: number, data: EmployeeUpdateInput, actor: { id: number; email: string }) {
  const employee = await prisma.employee.findUnique({ where: { id } });
  if (!employee) throw ApiError.notFound('Employee not found');

  const updated = await prisma.$transaction(async (tx) => {
    const updatedEmployee = await tx.employee.update({
      where: { id },
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone === undefined ? undefined : data.phone || null,
        gender: data.gender,
        dateOfBirth: data.dateOfBirth === undefined ? undefined : data.dateOfBirth ? new Date(data.dateOfBirth) : null,
        address: data.address === undefined ? undefined : data.address || null,
        city: data.city === undefined ? undefined : data.city || null,
        state: data.state === undefined ? undefined : data.state || null,
        postalCode: data.postalCode === undefined ? undefined : data.postalCode || null,
        country: data.country === undefined ? undefined : data.country || null,
        designation: data.designation,
        joiningDate: data.joiningDate ? new Date(data.joiningDate) : undefined,
        status: data.status,
        departmentId: data.departmentId === undefined ? undefined : data.departmentId ?? null,
        profileImageUrl: data.profileImageUrl === undefined ? undefined : data.profileImageUrl ?? null,
      },
      include: employeeInclude,
    });
    if (data.email && data.email.toLowerCase().trim() !== employee.email) {
      const email = data.email.toLowerCase().trim();
      const exists = await tx.user.findUnique({ where: { email } });
      if (exists && exists.id !== employee.userId) throw ApiError.conflict('Email is already in use');
      await tx.user.update({ where: { id: employee.userId }, data: { email } });
      await tx.employee.update({ where: { id }, data: { email } });
    }
    return updatedEmployee;
  });

  await logActivity({
    userId: actor.id,
    actorName: actor.email,
    type: 'EMPLOYEE',
    message: `Updated employee ${updated.firstName} ${updated.lastName}`,
  });

  return serializeEmployee(updated as never);
}

export async function deleteEmployee(id: number, actor: { id: number; email: string }) {
  const employee = await prisma.employee.findUnique({ where: { id } });
  if (!employee) throw ApiError.notFound('Employee not found');

  await prisma.$transaction([
    prisma.department.updateMany({ where: { headEmployeeId: id }, data: { headEmployeeId: null } }),
    prisma.employee.delete({ where: { id } }),
  ]);

  await logActivity({
    userId: actor.id,
    actorName: actor.email,
    type: 'EMPLOYEE',
    message: `Deleted employee ${employee.firstName} ${employee.lastName} (${employee.employeeCode})`,
  });
}

export async function updateProfileImage(id: number, url: string, actor: { id: number; email: string }) {
  const employee = await prisma.employee.update({
    where: { id },
    data: { profileImageUrl: url },
  });
  await logActivity({
    userId: actor.id,
    actorName: actor.email,
    type: 'EMPLOYEE',
    message: `Updated profile picture for ${employee.firstName} ${employee.lastName}`,
  });
  return employee;
}

export async function addDocument(employeeId: number, data: EmployeeDocumentInput, actor: { id: number; email: string }) {
  const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
  if (!employee) throw ApiError.notFound('Employee not found');

  const doc = await prisma.employeeDocument.create({
    data: {
      employeeId,
      title: data.title,
      type: data.type,
      fileUrl: data.fileUrl,
      size: data.size ?? 0,
    },
  });
  await logActivity({
    userId: actor.id,
    actorName: actor.email,
    type: 'DOCUMENT',
    message: `Uploaded "${data.title}" for ${employee.firstName} ${employee.lastName}`,
  });
  return { ...doc, createdAt: doc.createdAt.toISOString() };
}

export async function removeDocument(id: number, actor: { id: number; email: string }) {
  const doc = await prisma.employeeDocument.findUnique({ where: { id } });
  if (!doc) throw ApiError.notFound('Document not found');
  await prisma.employeeDocument.delete({ where: { id } });
  await logActivity({
    userId: actor.id,
    actorName: actor.email,
    type: 'DOCUMENT',
    message: `Removed document "${doc.title}"`,
  });
}

export async function upsertSalaryStructure(employeeId: number, data: SalaryStructureInput, actor: { id: number; email: string }) {
  const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
  if (!employee) throw ApiError.notFound('Employee not found');

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
    message: `Updated salary structure for ${employee.firstName} ${employee.lastName}`,
  });

  return serializeStructure(structure);
}
