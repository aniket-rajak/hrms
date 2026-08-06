import { v2 as cloudinaryV2 } from 'cloudinary';
import { env } from '../config/env';

cloudinaryV2.config({
  cloud_name: env.cloudinary.cloudName || undefined,
  api_key: env.cloudinary.apiKey || undefined,
  api_secret: env.cloudinary.apiSecret || undefined,
});

export const cloudinary = cloudinaryV2;
