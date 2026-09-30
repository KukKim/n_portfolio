import { S3_BUCKET } from "../../config/env.ts";
import { createImageUrl, createUploadUrl, putObject } from "../../infra/s3.ts";

export async function createUploadUrls(fileName: string, fileType: string) {
  const s3Params = {
    Bucket: S3_BUCKET,
    Key: fileName,
  };

  await putObject(s3Params);

  const [uploadUrl, imageUrl] = await Promise.all([
    createUploadUrl(s3Params, fileType),
    createImageUrl(s3Params),
  ]);

  return { uploadUrl, imageUrl };
}
