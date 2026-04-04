import { Storage } from "@google-cloud/storage";
import { randomUUID } from "crypto";

const REPLIT_SIDECAR_ENDPOINT = "http://127.0.0.1:1106";

const storageClient = new Storage({
  credentials: {
    audience: "replit",
    subject_token_type: "access_token",
    token_url: `${REPLIT_SIDECAR_ENDPOINT}/token`,
    type: "external_account",
    credential_source: {
      url: `${REPLIT_SIDECAR_ENDPOINT}/credential`,
      format: {
        type: "json",
        subject_token_field_name: "access_token",
      },
    },
    universe_domain: "googleapis.com",
  },
  projectId: "",
});

function parseObjectPath(path: string) {
  if (!path.startsWith("/")) path = `/${path}`;
  const parts = path.split("/");
  if (parts.length < 3) throw new Error("Invalid path");
  return { bucketName: parts[1], objectName: parts.slice(2).join("/") };
}

export async function uploadVideoBuffer(
  buffer: Buffer,
  originalName: string,
  contentType: string
): Promise<string> {
  const privateDir = process.env.PRIVATE_OBJECT_DIR;
  if (!privateDir) throw new Error("PRIVATE_OBJECT_DIR not set");

  const ext = originalName.split(".").pop() || "mp4";
  const objectId = `${randomUUID()}.${ext}`;
  const fullPath = `${privateDir}/videos/${objectId}`;

  const { bucketName, objectName } = parseObjectPath(fullPath);
  const bucket = storageClient.bucket(bucketName);
  const file = bucket.file(objectName);

  await file.save(buffer, { contentType });

  return `/videos/${objectId}`;
}
