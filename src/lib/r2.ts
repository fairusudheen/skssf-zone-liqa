import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

let cached: S3Client | null = null;

export function isR2Configured(): boolean {
  return Boolean(
    process.env.R2_ACCOUNT_ID &&
      process.env.R2_ACCESS_KEY_ID &&
      process.env.R2_SECRET_ACCESS_KEY &&
      process.env.R2_BUCKET_NAME,
  );
}

function getClient(): S3Client {
  if (cached) return cached;

  const accountId = process.env.R2_ACCOUNT_ID;
  if (!accountId) throw new Error("R2_NOT_CONFIGURED");

  cached = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
    },
  });

  return cached;
}

function bucket(): string {
  const name = process.env.R2_BUCKET_NAME;
  if (!name) throw new Error("R2_NOT_CONFIGURED");
  return name;
}

export async function uploadPhoto(
  key: string,
  body: Buffer,
  contentType: string,
): Promise<void> {
  await getClient().send(
    new PutObjectCommand({
      Bucket: bucket(),
      Key: key,
      Body: body,
      ContentType: contentType,
      CacheControl: "private, max-age=31536000, immutable",
    }),
  );
}

export async function deletePhoto(key: string): Promise<void> {
  try {
    await getClient().send(
      new DeleteObjectCommand({ Bucket: bucket(), Key: key }),
    );
  } catch {
    // Best-effort cleanup; a failed delete must not block registration.
  }
}

export async function getPhoto(key: string): Promise<Buffer | null> {
  try {
    const response = await getClient().send(
      new GetObjectCommand({ Bucket: bucket(), Key: key }),
    );
    if (!response.Body) return null;
    const bytes = await response.Body.transformToByteArray();
    return Buffer.from(bytes);
  } catch {
    return null;
  }
}

export async function photoDataUrl(key: string | null): Promise<string | null> {
  if (!key || !isR2Configured()) return null;
  const bytes = await getPhoto(key);
  if (!bytes) return null;
  return `data:image/webp;base64,${bytes.toString("base64")}`;
}
