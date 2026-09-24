import zlib from "zlib";
import prisma from "../../lib/prisma";
import { uploadPrivateObject, getPrivateObjectSignedUrl } from "../../lib/r2";
import { UPLOAD_FOLDERS } from "../Upload/upload.constant";

export interface IBackupResult {
  success: boolean;
  key: string;
  bucket: string;
  originalSize: string;
  compressedSize: string;
  compressionRatio: string;
  totalTables: number;
  totalRows: number;
  signedDownloadUrl?: string;
  durationMs: number;
  createdAt: string;
}

const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export const generateBackupFileName = (d = new Date()): string => {
  const day = String(d.getDate()).padStart(2, "0");
  const month = MONTH_NAMES[d.getMonth()];
  const year = d.getFullYear();
  const time = `${String(d.getHours()).padStart(2, "0")}${String(d.getMinutes()).padStart(2, "0")}${String(d.getSeconds()).padStart(2, "0")}`;
  // Formats as: backup_25_Sep_2026_033000.sql.gz
  return `backup_${day}_${month}_${year}_${time}.sql.gz`;
};

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

const escapeSqlValue = (val: unknown): string => {
  if (val === null || val === undefined) return "NULL";
  if (typeof val === "boolean") return val ? "TRUE" : "FALSE";
  if (typeof val === "number") return String(val);
  if (val instanceof Date) return `'${val.toISOString()}'`;
  if (typeof val === "object") {
    return `'${JSON.stringify(val).replace(/'/g, "''")}'::jsonb`;
  }
  return `'${String(val).replace(/'/g, "''")}'`;
};

export const runDatabaseBackup = async (): Promise<IBackupResult> => {
  const startTime = Date.now();
  const now = new Date();

  // 1. Fetch all public tables from PostgreSQL
  const tables = await prisma.$queryRaw<Array<{ table_name: string }>>`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      AND table_name NOT LIKE '_prisma_%'
    ORDER BY table_name ASC;
  `;

  let totalRows = 0;
  const sqlChunks: string[] = [];

  // SQL Dump Header
  sqlChunks.push(
    `-- ============================================================`,
    `-- AdSkill PayTrack AI - PostgreSQL Database Backup`,
    `-- Generated At: ${now.toISOString()}`,
    `-- Target Folder: ${UPLOAD_FOLDERS.BACKUPS}`,
    `-- Total Tables Found: ${tables.length}`,
    `-- ============================================================`,
    `\nSET client_encoding = 'UTF8';`,
    `SET session_replication_role = 'replica'; -- Bypass FK constraints during restore`,
    `\nBEGIN;\n`,
  );

  for (const { table_name } of tables) {
    try {
      const rows = (await prisma.$queryRawUnsafe(
        `SELECT * FROM "public"."${table_name}"`,
      )) as Record<string, unknown>[];

      if (!rows || rows.length === 0) {
        sqlChunks.push(`-- Table: "${table_name}" (0 rows)\n`);
        continue;
      }

      totalRows += rows.length;
      sqlChunks.push(`-- Table: "${table_name}" (${rows.length} rows)`);

      const columns = Object.keys(rows[0]);
      const quotedCols = columns.map((col) => `"${col}"`).join(", ");

      const valueRows = rows.map((row) => {
        const values = columns.map((col) => escapeSqlValue(row[col]));
        return `  (${values.join(", ")})`;
      });

      sqlChunks.push(
        `INSERT INTO "public"."${table_name}" (${quotedCols}) VALUES\n${valueRows.join(",\n")};\n`,
      );
    } catch (tableErr) {
      console.warn(`[BackupService] Warning: Could not dump table ${table_name}:`, tableErr);
      sqlChunks.push(`-- Warning: Failed to dump table "${table_name}"\n`);
    }
  }

  sqlChunks.push(
    `\nCOMMIT;`,
    `SET session_replication_role = 'origin'; -- Re-enable FK constraints`,
    `\n-- ============================================================`,
    `-- End of Backup: Total Rows: ${totalRows}`,
    `-- ============================================================`,
  );

  const fullSql = sqlChunks.join("\n");
  const rawBuffer = Buffer.from(fullSql, "utf-8");
  const rawSize = rawBuffer.length;

  // 2. Compress with gzip
  const compressedBuffer = zlib.gzipSync(rawBuffer, { level: 9 });
  const compressedSize = compressedBuffer.length;
  const ratio = rawSize > 0 ? `${(((rawSize - compressedSize) / rawSize) * 100).toFixed(1)}%` : "0%";

  // 3. Upload to Cloudflare R2 under adskill-paytrack/backups/
  const fileName = generateBackupFileName(now);
  const key = `${UPLOAD_FOLDERS.BACKUPS}/${fileName}`;

  const uploadResult = await uploadPrivateObject({
    key,
    body: compressedBuffer,
    contentType: "application/gzip",
    metadata: {
      totalTables: String(tables.length),
      totalRows: String(totalRows),
      createdAt: now.toISOString(),
      backupType: "full-database",
    },
  });

  const durationMs = Date.now() - startTime;
  let signedDownloadUrl: string | undefined;
  try {
    signedDownloadUrl = await getPrivateObjectSignedUrl(key);
  } catch {
    // signed url is optional
  }

  console.log(
    `[BackupService] Successfully backed up ${tables.length} tables (${totalRows} rows) to R2: ${key} (${formatBytes(compressedSize)}) in ${durationMs}ms`,
  );

  return {
    success: true,
    key,
    bucket: uploadResult.bucket,
    originalSize: formatBytes(rawSize),
    compressedSize: formatBytes(compressedSize),
    compressionRatio: ratio,
    totalTables: tables.length,
    totalRows,
    signedDownloadUrl,
    durationMs,
    createdAt: now.toISOString(),
  };
};
