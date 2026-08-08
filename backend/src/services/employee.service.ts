import bcrypt from 'bcryptjs';
import {
  DEFAULT_PASSWORD,
  EmployeeCreateInput,
  EmployeeUpdateInput,
  EmployeeDocumentInput,
  SalaryStructureInput,
} from '@hrms/shared';
import { Department, Employee, EmployeeDocument, SalaryStructure, User } from '../models';
import { ApiError } from '../lib/errors';
import { PaginationParams, paginated } from '../utils/pagination';
import { serializeDecimal } from '../utils/serializers';
import { currentYear } from '../utils/dates';
import { ensureLeaveBalances } from './auth.service';
import { mailer } from './mailer.service';
import { logActivity } from './activity.service';
import { oid, toPlain, withTransaction } from '../lib/db';
import { ciRegex } from '../utils/query';
import { encryptPassword, recoverPassword } from '../lib/password-cipher';

const employeePopulatePaths = [
  { path: 'department' },
  { path: 'salaryStructure' },
  { path: 'user', select: 'email role status passwordCipher' },
];

function serializeEmployee(employee: unknown): Record<string, unknown> {
  const rec = toPlain<Record<string, unknown>>(employee);
  return {
    ...rec,
    dateOfBirth: rec.dateOfBirth ? new Date(rec.dateOfBirth as Date).toISOString() : null,
    joiningDate: new Date(rec.joiningDate as Date).toISOString(),
    createdAt: new Date(rec.createdAt as Date).toISOString(),
    updatedAt: new Date(rec.updatedAt as Date).toISOString(),
    salaryStructure: rec.salaryStructure ? serializeStructure(rec.salaryStructure) : null,
    credentialPassword:
      recoverPassword((rec.user as Record<string, unknown> | null | undefined)?.passwordCipher as string | undefined) ??
      DEFAULT_PASSWORD,
  };
}

export function serializeStructure(structure: unknown): SalaryStructureDto | null {
  if (!structure) return null;
  const s = structure as Record<string, unknown>;
  return {
    id: s.id as string,
    employeeId: s.employeeId as string,
    basic: serializeDecimal(s.basic),
    housing: serializeDecimal(s.housing),
    transport: serializeDecimal(s.transport),
    medical: serializeDecimal(s.medical),
    otherAllowances: serializeDecimal(s.otherAllowances),
    deductions: serializeDecimal(s.deductions),
    netSalary: serializeDecimal(s.netSalary),
    updatedAt: new Date(s.updatedAt as Date).toISOString(),
  };
}

export interface SalaryStructureDto {
  id: string;
  employeeId: string;
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
  departmentId?: string | null;
  status?: string;
}

export async function listEmployees(params: EmployeeListParams) {
  const where: Record<string, unknown> = {};
  if (params.search) {
    const term = params.search.trim();
    where.$or = [
      { firstName: ciRegex(term) },
      { lastName: ciRegex(term) },
      { email: ciRegex(term) },
      { employeeCode: ciRegex(term) },
      { designation: ciRegex(term) },
    ];
  }
  if (params.departmentId) where.departmentId = oid(params.departmentId);
  if (params.status) where.status = params.status;

  const [employees, total] = await Promise.all([
    Employee.find(where)
      .populate(employeePopulatePaths)
      .sort({ createdAt: -1 })
      .skip((params.page - 1) * params.pageSize)
      .limit(params.pageSize),
    Employee.countDocuments(where),
  ]);

  return paginated(employees.map((e) => serializeEmployee(e)), total, params);
}

export async function getEmployee(id: string) {
  const employee = await Employee.findById(oid(id)).populate(employeePopulatePaths);
  if (!employee) throw ApiError.notFound('Employee not found');
  const documents = await EmployeeDocument.find({ employeeId: oid(id) }).sort({ createdAt: 1 });
  return {
    ...serializeEmployee(employee),
    documents: documents.map((d) => ({
      ...(toPlain(d) as Record<string, unknown>),
      createdAt: new Date(d.createdAt).toISOString(),
    })),
  };
}

async function generateEmployeeCode(): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const count = await Employee.countDocuments();
    const code = `EMP-${String(count + 1 + attempt * 37).padStart(4, '0')}`;
    const exists = await Employee.findOne({ employeeCode: code });
    if (!exists) return code;
  }
  return `EMP-${Date.now()}`;
}

export async function createEmployee(data: EmployeeCreateInput, actor: { id: string; email: string }) {
  const email = data.email.toLowerCase().trim();
  const existing = await User.findOne({ email });
  if (existing) throw ApiError.conflict('An account with this email already exists');

  const password = data.password ?? DEFAULT_PASSWORD;
  const passwordHash = await bcrypt.hash(password, 10);
  const passwordCipher = encryptPassword(password);
  const employeeCode = await generateEmployeeCode();

  const structureInput = {
    basic: data.basic ?? 0,
    housing: data.housing ?? 0,
    transport: data.transport ?? 0,
    medical: data.medical ?? 0,
    otherAllowances: data.otherAllowances ?? 0,
    deductions: data.deductions ?? 0,
  };

  const employee = await withTransaction(async (session) => {
    const [user] = await User.create(
      [{ email, passwordHash, passwordCipher, role: 'EMPLOYEE', status: 'ACTIVE' }],
      { session },
    );
    const [created] = await Employee.create(
      [
        {
          userId: user._id,
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
          departmentId: data.departmentId ? oid(data.departmentId) : null,
        },
      ],
      { session },
    );
    await SalaryStructure.create(
      [{ employeeId: created._id, ...structureInput, netSalary: calculateNet(structureInput) }],
      { session },
    );
    await ensureLeaveBalances(created.id, currentYear(), session);
    return created;
  });

  const populated = await Employee.findById(employee._id).populate(employeePopulatePaths);

  try {
    await mailer.sendCredentials(email, email, password);
  } catch (error) {
    console.error(`[mailer] Failed to send credentials to ${email}`, error);
  }
  await logActivity({
    userId: actor.id,
    actorName: actor.email,
    type: 'EMPLOYEE',
    message: `Added employee ${data.firstName} ${data.lastName} (${employeeCode})`,
  });

  return serializeEmployee(populated);
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

export async function updateEmployee(id: string, data: EmployeeUpdateInput, actor: { id: string; email: string }) {
  const employee = await Employee.findById(oid(id));
  if (!employee) throw ApiError.notFound('Employee not found');

  const updated = await withTransaction(async (session) => {
    const updatedEmployee = await Employee.findByIdAndUpdate(
      oid(id),
      {
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
        departmentId: data.departmentId === undefined ? undefined : data.departmentId ? oid(data.departmentId) : null,
        profileImageUrl: data.profileImageUrl === undefined ? undefined : data.profileImageUrl ?? null,
      },
      { new: true, session },
    ).populate(employeePopulatePaths);

    if (data.email && data.email.toLowerCase().trim() !== employee.email) {
      const email = data.email.toLowerCase().trim();
      const exists = await User.findOne({ email }).session(session);
      if (exists && String(exists._id) !== String(employee.userId)) {
        throw ApiError.conflict('Email is already in use');
      }
      await User.updateOne({ _id: employee.userId }, { email }, { session });
      await Employee.updateOne({ _id: oid(id) }, { email }, { session });
    }
    return updatedEmployee;
  });

  await logActivity({
    userId: actor.id,
    actorName: actor.email,
    type: 'EMPLOYEE',
    message: `Updated employee ${updated!.firstName} ${updated!.lastName}`,
  });

  return serializeEmployee(updated);
}

export async function deleteEmployee(id: string, actor: { id: string; email: string }) {
  const employee = await Employee.findById(oid(id));
  if (!employee) throw ApiError.notFound('Employee not found');

  await withTransaction(async (session) => {
    await Department.updateMany({ headEmployeeId: oid(id) }, { headEmployeeId: null }, { session });
    await Employee.deleteOne({ _id: oid(id) }, { session });
  });

  await logActivity({
    userId: actor.id,
    actorName: actor.email,
    type: 'EMPLOYEE',
    message: `Deleted employee ${employee.firstName} ${employee.lastName} (${employee.employeeCode})`,
  });
}

export async function updateProfileImage(id: string, url: string, actor: { id: string; email: string }) {
  const employee = await Employee.findByIdAndUpdate(oid(id), { profileImageUrl: url }, { new: true });
  if (!employee) throw ApiError.notFound('Employee not found');
  await logActivity({
    userId: actor.id,
    actorName: actor.email,
    type: 'EMPLOYEE',
    message: `Updated profile picture for ${employee.firstName} ${employee.lastName}`,
  });
  return employee;
}

export async function addDocument(employeeId: string, data: EmployeeDocumentInput, actor: { id: string; email: string }) {
  const employee = await Employee.findById(oid(employeeId));
  if (!employee) throw ApiError.notFound('Employee not found');

  const doc = await EmployeeDocument.create({
    employeeId: oid(employeeId),
    title: data.title,
    type: data.type,
    fileUrl: data.fileUrl,
    size: data.size ?? 0,
  });
  await logActivity({
    userId: actor.id,
    actorName: actor.email,
    type: 'DOCUMENT',
    message: `Uploaded "${data.title}" for ${employee.firstName} ${employee.lastName}`,
  });
  return { ...(toPlain(doc) as Record<string, unknown>), createdAt: new Date(doc.createdAt).toISOString() };
}

export async function removeDocument(id: string, actor: { id: string; email: string }) {
  const doc = await EmployeeDocument.findById(oid(id));
  if (!doc) throw ApiError.notFound('Document not found');
  await EmployeeDocument.deleteOne({ _id: oid(id) });
  await logActivity({
    userId: actor.id,
    actorName: actor.email,
    type: 'DOCUMENT',
    message: `Removed document "${doc.title}"`,
  });
}

export async function upsertSalaryStructure(employeeId: string, data: SalaryStructureInput, actor: { id: string; email: string }) {
  const employee = await Employee.findById(oid(employeeId));
  if (!employee) throw ApiError.notFound('Employee not found');

  const netSalary = calculateNet(data);
  const structure = await SalaryStructure.findOneAndUpdate(
    { employeeId: oid(employeeId) },
    { $set: { ...data, netSalary } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  await logActivity({
    userId: actor.id,
    actorName: actor.email,
    type: 'PAYROLL',
    message: `Updated salary structure for ${employee.firstName} ${employee.lastName}`,
  });

  return serializeStructure(structure);
}