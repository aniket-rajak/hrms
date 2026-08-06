import { SettingsUpdateInput, ProfileUpdateInput, DEFAULT_SETTINGS } from '@hrms/shared';
import { prisma } from '../lib/prisma';
import { ApiError } from '../lib/errors';
import { logActivity } from './activity.service';

export async function getSettingsMap(): Promise<Record<string, string>> {
  const settings = await prisma.systemSetting.findMany();
  const map: Record<string, string> = { ...DEFAULT_SETTINGS };
  for (const setting of settings) {
    map[setting.key] = setting.value ?? '';
  }
  return map;
}

export async function getPublicSettings() {
  const [map, holidays] = await Promise.all([
    getSettingsMap(),
    prisma.holiday.findMany({
      orderBy: { date: 'asc' },
      take: 100,
    }),
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

export async function updateSettings(data: SettingsUpdateInput, actor: { id: number; email: string }) {
  const entries = Object.entries(data).filter(([, v]) => v !== undefined) as [string, string | number][];
  if (entries.length === 0) throw ApiError.badRequest('No settings provided');

  await prisma.$transaction(
    entries.map(([key, value]) =>
      prisma.systemSetting.upsert({
        where: { key },
        update: { value: String(value) },
        create: { key, value: String(value) },
      }),
    ),
  );

  await logActivity({
    userId: actor.id,
    actorName: actor.email,
    type: 'SETTINGS',
    message: 'Updated company settings',
  });

  return getPublicSettings();
}

export async function updateCompanyLogo(url: string, actor: { id: number; email: string }) {
  await prisma.systemSetting.upsert({
    where: { key: 'companyLogo' },
    update: { value: url },
    create: { key: 'companyLogo', value: url },
  });
  await logActivity({
    userId: actor.id,
    actorName: actor.email,
    type: 'SETTINGS',
    message: 'Updated company logo',
  });
  return getPublicSettings();
}

export async function updateProfile(userId: number, data: ProfileUpdateInput) {
  const user = await prisma.user.findUnique({ where: { id: userId }, include: { employee: true } });
  if (!user) throw ApiError.notFound('User not found');
  if (!user.employee) throw ApiError.badRequest('Profile update is only available for employees');

  const employee = await prisma.employee.update({
    where: { id: user.employee.id },
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
      profileImageUrl: data.profileImageUrl === undefined ? undefined : data.profileImageUrl ?? null,
    },
    include: { department: true, salaryStructure: true },
  });

  return {
    ...employee,
    dateOfBirth: employee.dateOfBirth ? employee.dateOfBirth.toISOString() : null,
    joiningDate: employee.joiningDate.toISOString(),
    createdAt: employee.createdAt.toISOString(),
    updatedAt: employee.updatedAt.toISOString(),
  };
}

export async function listHolidays() {
  const holidays = await prisma.holiday.findMany({ orderBy: { date: 'asc' } });
  return holidays.map((h) => ({ id: h.id, name: h.name, date: h.date.toISOString() }));
}

export async function createHoliday(name: string, date: string, actor: { id: number; email: string }) {
  const holidayDate = new Date(date);
  holidayDate.setHours(0, 0, 0, 0);
  const holiday = await prisma.holiday.create({ data: { name: name.trim(), date: holidayDate } });
  await logActivity({
    userId: actor.id,
    actorName: actor.email,
    type: 'HOLIDAY',
    message: `Added holiday "${holiday.name}"`,
  });
  return { id: holiday.id, name: holiday.name, date: holiday.date.toISOString() };
}

export async function deleteHoliday(id: number, actor: { id: number; email: string }) {
  const holiday = await prisma.holiday.findUnique({ where: { id } });
  if (!holiday) throw ApiError.notFound('Holiday not found');
  await prisma.holiday.delete({ where: { id } });
  await logActivity({
    userId: actor.id,
    actorName: actor.email,
    type: 'HOLIDAY',
    message: `Removed holiday "${holiday.name}"`,
  });
}
