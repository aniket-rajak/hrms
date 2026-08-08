import { DepartmentCreateInput, DepartmentUpdateInput } from '@hrms/shared';
import { Department, Employee } from '../models';
import { ApiError } from '../lib/errors';
import { logActivity } from './activity.service';
import { oid, toPlain, withTransaction } from '../lib/db';

const headEmployeePopulate = { path: 'headEmployee', select: 'firstName lastName employeeCode profileImageUrl' };

function serializeDepartment(department: unknown) {
  const d = toPlain<Record<string, unknown> & { createdAt: Date; updatedAt: Date }>(department);
  return {
    ...d,
    id: d.id as string,
    createdAt: new Date(d.createdAt).toISOString(),
    updatedAt: new Date(d.updatedAt).toISOString(),
  };
}

async function serializeDepartmentWithCount(department: unknown) {
  const d = serializeDepartment(department);
  const count = await Employee.countDocuments({ departmentId: oid(d.id) });
  return { ...d, _count: { employees: count } };
}

export async function listDepartments() {
  const departments = await Department.find().populate(headEmployeePopulate).sort({ createdAt: 1 });
  const counts = await Employee.aggregate<{ _id: unknown; count: number }>([
    { $group: { _id: '$departmentId', count: { $sum: 1 } } },
  ]);
  const countMap = new Map(counts.map((c) => [String(c._id), c.count]));
  return departments.map((d) => {
    const plain = serializeDepartment(d);
    return { ...plain, _count: { employees: countMap.get(String(plain.id)) ?? 0 } };
  });
}

export async function getDepartment(id: string) {
  const department = await Department.findById(oid(id)).populate(headEmployeePopulate);
  if (!department) throw ApiError.notFound('Department not found');
  return serializeDepartmentWithCount(department);
}

export async function createDepartment(data: DepartmentCreateInput, actor: { id: string; email: string }) {
  const existing = await Department.findOne({
    $or: [{ name: data.name.trim() }, { code: data.code.trim().toUpperCase() }],
  });
  if (existing) throw ApiError.conflict('A department with this name or code already exists');

  const department = await Department.create({
    name: data.name.trim(),
    code: data.code.trim().toUpperCase(),
    description: data.description || null,
    headEmployeeId: data.headEmployeeId ? oid(data.headEmployeeId) : null,
  });

  await logActivity({
    userId: actor.id,
    actorName: actor.email,
    type: 'DEPARTMENT',
    message: `Created department "${department.name}"`,
  });

  const populated = await Department.findById(department._id).populate(headEmployeePopulate);
  return serializeDepartmentWithCount(populated!);
}

export async function updateDepartment(id: string, data: DepartmentUpdateInput, actor: { id: string; email: string }) {
  const department = await Department.findById(oid(id));
  if (!department) throw ApiError.notFound('Department not found');

  if (data.name) {
    const duplicate = await Department.findOne({ name: data.name.trim(), _id: { $ne: oid(id) } });
    if (duplicate) throw ApiError.conflict('Another department already uses this name');
  }
  if (data.code) {
    const duplicate = await Department.findOne({ code: data.code.trim().toUpperCase(), _id: { $ne: oid(id) } });
    if (duplicate) throw ApiError.conflict('Another department already uses this code');
  }

  const updated = await Department.findByIdAndUpdate(
    oid(id),
    {
      name: data.name?.trim(),
      code: data.code ? data.code.trim().toUpperCase() : undefined,
      description: data.description === undefined ? undefined : data.description || null,
      headEmployeeId: data.headEmployeeId === undefined ? undefined : data.headEmployeeId ? oid(data.headEmployeeId) : null,
    },
    { new: true },
  ).populate(headEmployeePopulate);

  await logActivity({
    userId: actor.id,
    actorName: actor.email,
    type: 'DEPARTMENT',
    message: `Updated department "${updated!.name}"`,
  });

  return serializeDepartmentWithCount(updated!);
}

export async function deleteDepartment(id: string, actor: { id: string; email: string }) {
  const department = await Department.findById(oid(id));
  if (!department) throw ApiError.notFound('Department not found');

  await withTransaction(async (session) => {
    await Employee.updateMany({ departmentId: oid(id) }, { departmentId: null }, { session });
    await Department.deleteOne({ _id: oid(id) }, { session });
  });

  await logActivity({
    userId: actor.id,
    actorName: actor.email,
    type: 'DEPARTMENT',
    message: `Deleted department "${department.name}"`,
  });
}