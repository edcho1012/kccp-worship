import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const client = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

/**
 * 콘티 원본(PDF/이미지)을 R2에 올리고 공개 URL을 반환.
 * 파일명은 겹치지 않게 타임스탬프 + 원본 이름으로 저장.
 */
export async function uploadToR2(buffer: Buffer, originalName: string, contentType: string): Promise<string> {
  const key = `setlists/${Date.now()}-${originalName.replace(/\s+/g, "_")}`;

  await client.send(
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    })
  );

  // R2_PUBLIC_URL은 버킷의 Public Development URL이나 연결해둔 커스텀 도메인
  return `${process.env.R2_PUBLIC_URL}/${key}`;
}
