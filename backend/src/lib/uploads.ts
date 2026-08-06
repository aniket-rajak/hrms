import { cloudinary } from '../config/cloudinary';
import { ApiError } from './errors';

export function getUploadSignature(): {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  folder: string;
} {
  const { cloudName, apiKey, apiSecret, folder } = cloudinary.config();
  if (!cloudName || !apiKey || !apiSecret) {
    throw ApiError.badRequest('Cloudinary is not configured. Add CLOUDINARY_* env variables.');
  }
  const timestamp = Math.round(Date.now() / 1000);
  const paramsToSign: Record<string, string | number> = { timestamp, folder };
  const signature = cloudinary.utils.api_sign_request(paramsToSign, apiSecret);
  return { cloudName, apiKey, timestamp, signature, folder };
}
