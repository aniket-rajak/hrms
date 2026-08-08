import { SettingsUpdateInput, ProfileUpdateInput } from '@hrms/shared';
import { DEFAULT_SETTINGS } from '@hrms/shared';
import { Employee, Holiday, SystemSetting, User } from '../models';
import { ApiError } from '../lib/errors';
import { logActivity } from './activity.service';
import { oid, toPlain, withTransaction } from '../lib/db';

export async function getSettingsMap(): Promise<Record<string, string>> {
  const settings = await SystemSetting.find();
  const map: Record<string, string> = { ...DEFAULT_SETTINGS };
  for (const setting of settings) {
    map[setting.key] = setting.value ?? '';
  }
  return map;
}

export async function getPublicSettings() {
  const [map, holidays] = await Promise.all([
    getSettingsMap(),
    Holiday.find({}).sort({ date: 1 }).limit(100),
  ]);

  return {
    companyName: map.companyName,
    companyLogo: map.companyLogo || null,
    companyEmail: map.companyEmail,
    companyPhone: map.companyPhone,
    companyAddress: map.companyAddress,
    currency: map.currency,
    currencySymbol: map.currencySymbol,
    annualLeaveQuota: parseInt(map.annualLeaveQuota, 10) || 15,
    sickLeaveQuota: parseInt(map.sickLeaveQuota, 10) || 10,
    casualLeaveQuota: parseInt(map.casualLeaveQuota, 10) || 5,
    holidays: holidays.map((h) => ({ id: h.id, name: h.name, date: h.date.toISOString() })),
  };
}

export async function updateSettings(data: SettingsUpdateInput, actor: { id: string; email: string }) {
  const entries = Object.entries(data).filter(([, v]) => v !== undefined) as [string, string | number][];
  if (entries.length === 0) throw ApiError.badRequest('No settings provided');

  await withTransaction(async (session) => {
    for (const [key, value] of entries) {
      await SystemSetting.updateOne(
        { key },
        { $set: { value: String(value) } },
        { upsert: true, session },
      );
    }
  });

  await logActivity({
    userId: actor.id,
    actorName: actor.email,
    type: 'SETTINGS',
    message: 'Updated company settings',
  });

  return getPublicSettings();
}

export async function updateCompanyLogo(url: string, actor: { id: string; email: string }) {
  await SystemSetting.updateOne(
    { key: 'companyLogo' },
    { $set: { value: url } },
    { upsert: true },
  );
  await logActivity({
    userId: actor.id,
    actorName: actor.email,
    type: 'SETTINGS',
    message: 'Updated company logo',
  });
  return getPublicSettings();
}

export async function updateProfile(userId: string, data: ProfileUpdateInput) {
  const user = await User.findById(oid(userId));
  if (!user) throw ApiError.notFound('User not found');

  const employee = await Employee.findOne({ userId: user._id });
  if (!employee) throw ApiError.badRequest('Profile update is only available for employees');

  const updated = await Employee.findByIdAndUpdate(
    employee._id,
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
      profileImageUrl: data.profileImageUrl === undefined ? undefined : data.profileImageUrl ?? null,
    },
    { new: true },
  ).populate([{ path: 'department' }, { path: 'salaryStructure' }]);

  const plain = toPlain<Record<string, unknown>>(updated);
  return {
    ...plain,
    dateOfBirth: updated!.dateOfBirth ? updated!.dateOfBirth.toISOString() : null,
    joiningDate: updated!.joiningDate.toISOString(),
    createdAt: updated!.createdAt.toISOString(),
    updatedAt: updated!.updatedAt.toISOString(),
  };
}

export async function listHolidays() {
  const holidays = await Holiday.find().sort({ date: 1 });
  return holidays.map((h) => ({ id: h.id, name: h.name, date: h.date.toISOString() }));
}

export async function createHoliday(name: string, date: string, actor: { id: string; email: string }) {
  const holidayDate = new Date(date);
  holidayDate.setHours(0, 0, 0, 0);
  const holiday = await Holiday.create({ name: name.trim(), date: holidayDate });
  await logActivity({
    userId: actor.id,
    actorName: actor.email,
    type: 'HOLIDAY',
    message: `Added holiday "${holiday.name}"`,
  });
  return { id: holiday.id, name: holiday.name, date: holiday.date.toISOString() };
}

export async function deleteHoliday(id: string, actor: { id: string; email: string }) {
  const holiday = await Holiday.findById(oid(id));
  if (!holiday) throw ApiError.notFound('Holiday not found');
  await Holiday.deleteOne({ _id: holiday._id });
  await logActivity({
    userId: actor.id,
    actorName: actor.email,
    type: 'HOLIDAY',
    message: `Removed holiday "${holiday.name}"`,
  });
}