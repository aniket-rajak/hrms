import { DepartmentCreateInput, DepartmentUpdateInput } from '@hrms/shared';
import { prisma } from '../lib/prisma';
import { ApiError } from '../lib/errors';
import { logActivity } from './activity.service';

const departmentInclude = {
  headEmployee: {
    select: { id: true, firstName: true, lastName: true, employeeCode: true, profileImageUrl: true },
  },
  _count: { select: { employees: true } },
} as const;

function serializeDepartment(department: unknown) {
  const d = department as Record<string, unknown> & {
    createdAt: Date;
    updatedAt: Date;
    headEmployee: Record<string, unknown> | null;
  };
  return {
    ...d,
    createdAt: d.createdAt.toISOString(),
    updatedAt: d.updatedAt.toISOString(),
  };
}

export async function listDepartments() {
  const departments = await prisma.department.findMany({
    include: departmentInclude,
    orderBy: { createdAt: 'asc' },
  });
  return departments.map(serializeDepartment);
}

export async function getDepartment(id: number) {
  const department = await prisma.department.findUnique({ where: { id }, include: departmentInclude });
  if (!department) throw ApiError.notFound('Department not found');
  return serializeDepartment(department);
}

export async function createDepartment(data: DepartmentCreateInput, actor: { id: number; email: string }) {
  const existing = await prisma.department.findFirst({
    where: { OR: [{ name: data.name.trim() }, { code: data.code.trim().toUpperCase() }] },
  });
  if (existing) throw ApiError.conflict('A department with this name or code already exists');

  const department = await prisma.department.create({
    data: {
      name: data.name.trim(),
      code: data.code.trim().toUpperCase(),
      description: data.description || null,
      headEmployeeId: data.headEmployeeId ?? null,
    },
    include: departmentInclude,
  });

  await logActivity({
    userId: actor.id,
    actorName: actor.email,
    type: 'DEPARTMENT',
    message: `Created department "${department.name}"`,
  });

  return serializeDepartment(department);
}

export async function updateDepartment(id: number, data: DepartmentUpdateInput, actor: { id: number; email: string }) {
  const department = await prisma.department.findUnique({ where: { id } });
  if (!department) throw ApiError.notFound('Department not found');

  if (data.name) {
    const duplicate = await prisma.department.findFirst({
      where: { name: data.name.trim(), id: { not: id } },
    });
    if (duplicate) throw ApiError.conflict('Another department already uses this name');
  }
  if (data.code) {
    const duplicate = await prisma.department.findFirst({
      where: { code: data.code.trim().toUpperCase(), id: { not: id } },
    });
    if (duplicate) throw ApiError.conflict('Another department already uses this code');
  }

  const updated = await prisma.department.update({
    where: { id },
    data: {
      name: data.name?.trim(),
      code: data.code ? data.code.trim().toUpperCase() : undefined,
      description: data.description === undefined ? undefined : data.description || null,
      headEmployeeId: data.headEmployeeId === undefined ? undefined : data.headEmployeeId ?? null,
    },
    include: departmentInclude,
  });

  await logActivity({
    userId: actor.id,
    actorName: actor.email,
    type: 'DEPARTMENT',
    message: `Updated department "${updated.name}"`,
  });

  return serializeDepartment(updated);
}

export async function deleteDepartment(id: number, actor: { id: number; email: string }) {
  const department = await prisma.department.findUnique({ where: { id } });
  if (!department) throw ApiError.notFound('Department not found');

  await prisma.$transaction([
    prisma.employee.updateMany({ where: { departmentId: id }, data: { departmentId: null } }),
    prisma.department.delete({ where: { id } }),
  ]);

  await logActivity({
    userId: actor.id,
    actorName: actor.email,
    type: 'DEPARTMENT',
    message: `Deleted department "${department.name}"`,
  });
}
