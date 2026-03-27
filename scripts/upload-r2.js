const {
  S3Client,
  PutObjectCommand,
  HeadObjectCommand,
} = require("@aws-sdk/client-s3");
const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const client = new S3Client({
  region: "auto",
  endpoint: process.env.R2_S3_API,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

const BUCKET = process.env.R2_BUCKET;
const CONCURRENCY = 20;

const MIME = {
  ".webp": "image/webp",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
};

async function exists(key) {
  try {
    await client.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }));
    return true;
  } catch {
    return false;
  }
}

async function upload(filePath, key) {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME[ext] || "application/octet-stream";
  const body = fs.readFileSync(filePath);
  await client.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
      CacheControl: "public, max-age=31536000, immutable",
    }),
  );
}

function collectFiles(dir, prefix) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    const key = prefix + "/" + entry.name;
    if (entry.isDirectory()) {
      results.push(...collectFiles(full, key));
    } else {
      results.push({ filePath: full, key });
    }
  }
  return results;
}

async function run() {
  const base = path.join(__dirname, "..", "assets", "portfolio");
  const files = [
    ...collectFiles(path.join(base, "thumbnails"), "portfolio/thumbnails"),
    ...collectFiles(path.join(base, "detail"), "portfolio/detail"),
  ];

  console.log(`Total files: ${files.length}`);
  let uploaded = 0,
    skipped = 0,
    failed = 0;

  // Process in batches
  for (let i = 0; i < files.length; i += CONCURRENCY) {
    const batch = files.slice(i, i + CONCURRENCY);
    const results = await Promise.allSettled(
      batch.map(async ({ filePath, key }) => {
        if (await exists(key)) {
          skipped++;
          return;
        }
        await upload(filePath, key);
        uploaded++;
      }),
    );
    for (const r of results) {
      if (r.status === "rejected") {
        failed++;
        console.error(r.reason?.message);
      }
    }
    const total = uploaded + skipped + failed;
    if (total % 100 < CONCURRENCY) {
      console.log(
        `Progress: ${total}/${files.length} (uploaded: ${uploaded}, skipped: ${skipped}, failed: ${failed})`,
      );
    }
  }

  console.log(
    `\nDone! uploaded: ${uploaded}, skipped: ${skipped}, failed: ${failed}`,
  );
}

run().catch(console.error);
