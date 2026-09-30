import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { S3_REGION } from "../config/env.ts";

const s3Client = new S3Client({ region: S3_REGION });

type S3ObjectParams = {
  Bucket: string;
  Key: string;
};

export async function putObject(s3Params: S3ObjectParams) {
  const command = new PutObjectCommand(s3Params);
  await s3Client.send(command);
}

export function createUploadUrl(s3Params: S3ObjectParams, fileType: string) {
  return getSignedUrl(
    s3Client,
    new PutObjectCommand({
      ...s3Params,
      ContentType: fileType,
    }),
    { expiresIn: 3600 },
  );
}

export function createImageUrl(s3Params: S3ObjectParams) {
  return getSignedUrl(s3Client, new GetObjectCommand(s3Params), {
    // expiresIn: 3600,
  });
}
