import { api } from "./api";
import type { UploadSignatureResponse } from "@hrms/shared";

export async function uploadToCloudinary(file: File): Promise<string> {
  const signatureRes = await api.post<{ data: UploadSignatureResponse }>("/uploads/signature");
  const { cloudName, apiKey, timestamp, signature, folder } = signatureRes.data.data;

  const formData = new FormData();
  formData.append("file", file);
  formData.append("api_key", apiKey);
  formData.append("timestamp", String(timestamp));
  formData.append("signature", signature);
  formData.append("folder", folder);

  const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: "POST",
    body: formData,
  });

  if (!uploadRes.ok) {
    const body = (await uploadRes.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new Error(body?.error?.message ?? "Upload failed");
  }

  const data = (await uploadRes.json()) as { secure_url?: string; url?: string };
  return data.secure_url ?? data.url ?? "";
}

export async function uploadDocument(file: File): Promise<string> {
  const isImage = file.type.startsWith("image/");
  const endpoint = isImage ? "image" : "raw";
  const signatureRes = await api.post<{ data: UploadSignatureResponse }>("/uploads/signature");
  const { cloudName, apiKey, timestamp, signature, folder } = signatureRes.data.data;

  const formData = new FormData();
  formData.append("file", file);
  formData.append("api_key", apiKey);
  formData.append("timestamp", String(timestamp));
  formData.append("signature", signature);
  formData.append("folder", `${folder}/documents`);

  const uploadRes = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/${endpoint}/upload`,
    { method: "POST", body: formData },
  );

  if (!uploadRes.ok) {
    throw new Error("Upload failed");
  }

  const data = (await uploadRes.json()) as { secure_url?: string; url?: string };
  return data.secure_url ?? data.url ?? "";
}
