import https from "https";
import http from "http";
import prisma from "../lib/prisma";
import config from "../config";
import { uploadPrivateObject } from "../lib/r2";

interface DriveFile {
  id: string;
  name: string;
}

// Helper: Download a URL following redirects (301, 302, 303, 307)
function downloadBuffer(targetUrl: string, maxRedirects = 5): Promise<{ buffer: Buffer; contentType: string }> {
  return new Promise((resolve, reject) => {
    if (maxRedirects < 0) {
      return reject(new Error("Too many redirects"));
    }

    const client = targetUrl.startsWith("https") ? https : http;
    const req = client.get(
      targetUrl,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
      },
      (res) => {
        if (
          res.statusCode &&
          [301, 302, 303, 307, 308].includes(res.statusCode) &&
          res.headers.location
        ) {
          let redirectUrl = res.headers.location;
          if (!redirectUrl.startsWith("http")) {
            const parsed = new URL(targetUrl);
            redirectUrl = `${parsed.protocol}//${parsed.host}${redirectUrl}`;
          }
          return resolve(downloadBuffer(redirectUrl, maxRedirects - 1));
        }

        if (res.statusCode !== 200) {
          return reject(new Error(`HTTP status ${res.statusCode} from ${targetUrl}`));
        }

        const chunks: Buffer[] = [];
        res.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
        res.on("end", () => {
          const buffer = Buffer.concat(chunks);
          const contentType = res.headers["content-type"] || "application/octet-stream";
          resolve({ buffer, contentType });
        });
      }
    );

    req.on("error", (err) => reject(err));
    req.setTimeout(30000, () => {
      req.destroy();
      reject(new Error("Request timed out"));
    });
  });
}

// Fetch HTML content from URL
function fetchHtml(targetUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const client = targetUrl.startsWith("https") ? https : http;
    client.get(
      targetUrl,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
      },
      (res) => {
        if (
          res.statusCode &&
          [301, 302, 303, 307, 308].includes(res.statusCode) &&
          res.headers.location
        ) {
          return resolve(fetchHtml(res.headers.location));
        }
        let html = "";
        res.on("data", (d) => (html += d));
        res.on("end", () => resolve(html));
      }
    ).on("error", reject);
  });
}

// Parse Google Drive Folder HTML to find files
function extractFilesFromFolderHtml(html: string): DriveFile[] {
  const files: DriveFile[] = [];
  const seenIds = new Set<string>();

  // Look for Drive dataset: key: 'ds:3'
  const ds3Idx = html.indexOf("key: 'ds:3'");
  if (ds3Idx !== -1) {
    const chunk = html.slice(ds3Idx, ds3Idx + 150000);
    // Find pattern: [[null, "1gjWPYRIWoT5f8bFSNpiLMQVgaD0b3UZ5"] ... "filename.pdf"]
    // Matches ID (28-40 alphanumeric chars) and filename (.pdf, .docx, .doc, .jpg, etc.)
    const idMatches = [...chunk.matchAll(/\[\[null,\"([a-zA-Z0-9_-]{28,40})\"\]/g)];
    const nameMatches = [...chunk.matchAll(/\[\[\"([^\"]+\.(?:pdf|docx?|jpe?g|png))\",null/gi)];

    for (let i = 0; i < idMatches.length; i++) {
      const fileId = idMatches[i][1];
      if (seenIds.has(fileId)) continue;
      seenIds.add(fileId);

      const fileName = nameMatches[i] ? nameMatches[i][1] : `document_${fileId}.pdf`;
      files.push({ id: fileId, name: fileName });
    }
  }

  // Fallback: search for generic file id patterns in folder
  if (files.length === 0) {
    const fileMatches = [...html.matchAll(/\/file\/d\/([a-zA-Z0-9_-]{25,})/g)];
    for (const m of fileMatches) {
      const id = m[1];
      if (!seenIds.has(id)) {
        seenIds.add(id);
        files.push({ id, name: `file_${id}.pdf` });
      }
    }
  }

  return files;
}

// Extract file ID from a direct Google Drive / Docs link
function extractDirectFileId(url: string): { fileId?: string; isDocs?: boolean } {
  // /file/d/FILE_ID
  const fileMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (fileMatch) return { fileId: fileMatch[1], isDocs: false };

  // docs.google.com/document/d/FILE_ID
  const docsMatch = url.match(/\/document\/d\/([a-zA-Z0-9_-]+)/);
  if (docsMatch) return { fileId: docsMatch[1], isDocs: true };

  // id=FILE_ID
  const queryMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (queryMatch) return { fileId: queryMatch[1], isDocs: false };

  return {};
}

// Guess clean filename for direct links
function guessFilenameFromUrl(url: string, defaultName: string): string {
  if (url.includes("/document/d/")) {
    return `${defaultName.replace(/[^a-zA-Z0-9_-]/g, "_")}_Resume.pdf`;
  }
  return defaultName;
}

export async function migrateLeadDocuments() {
  console.log("==================================================");
  console.log("🚀 STARTING LEAD DOCUMENT MIGRATION TO S3 / R2");
  console.log("==================================================");

  const bucket = config.r2.bucket || "paytrackai";
  console.log(`Using Bucket: ${bucket}`);

  // 1. Read seed leads data with drive links
  const fs = require("fs");
  const path = require("path");
  const seedFile = fs.readFileSync(path.join(__dirname, "seed-leads.ts"), "utf8");

  const leadBlocks = seedFile.split(/{\s*entryNumber:\s*/).slice(1);
  const leadsToMigrate: Array<{
    clientCode: string;
    clientName: string;
    resumeUrl: string;
  }> = [];

  for (const block of leadBlocks) {
    const codeMatch = block.match(/clientCode:\s*\"([^\"]+)\"/);
    const nameMatch = block.match(/clientName:\s*\"([^\"]+)\"/);
    const urlMatch = block.match(/resumeUrl:\s*\"([^\"]+)\"/);

    if (codeMatch && urlMatch && urlMatch[1] && urlMatch[1].trim()) {
      leadsToMigrate.push({
        clientCode: codeMatch[1],
        clientName: nameMatch ? nameMatch[1] : "",
        resumeUrl: urlMatch[1].trim(),
      });
    }
  }

  console.log(`Found ${leadsToMigrate.length} leads with documents to migrate.\n`);

  // Cache existing lead IDs by clientCode
  const dbLeads = await prisma.lead.findMany({
    select: { id: true, clientCode: true, fullName: true },
  });
  const leadMap = new Map<string, string>();
  for (const l of dbLeads) {
    if (l.clientCode) leadMap.set(l.clientCode, l.id);
  }

  let totalMigratedFiles = 0;
  let totalErrors = 0;

  for (let i = 0; i < leadsToMigrate.length; i++) {
    const lead = leadsToMigrate[i];
    const leadId = leadMap.get(lead.clientCode);

    console.log(
      `[${i + 1}/${leadsToMigrate.length}] Processing ${lead.clientCode} - ${lead.clientName}...`
    );

    if (!leadId) {
      console.warn(`  ⚠️ Lead ${lead.clientCode} not found in database. Skipping.`);
      totalErrors++;
      continue;
    }

    const isFolder = lead.resumeUrl.includes("/folders/");
    const filesToDownload: Array<{ downloadUrl: string; fileName: string; originalUrl: string }> = [];

    if (isFolder) {
      try {
        const folderHtml = await fetchHtml(lead.resumeUrl);
        const folderFiles = extractFilesFromFolderHtml(folderHtml);

        if (folderFiles.length > 0) {
          for (const f of folderFiles) {
            filesToDownload.push({
              downloadUrl: `https://drive.usercontent.google.com/download?id=${f.id}&export=download`,
              fileName: f.name,
              originalUrl: lead.resumeUrl,
            });
          }
        } else {
          console.warn(`  ⚠️ No files extracted from folder: ${lead.resumeUrl}`);
        }
      } catch (err: any) {
        console.error(`  ❌ Error reading folder for ${lead.clientCode}:`, err.message);
      }
    } else {
      // Direct file or Google Doc
      const { fileId, isDocs } = extractDirectFileId(lead.resumeUrl);
      if (fileId) {
        const downloadUrl = isDocs
          ? `https://docs.google.com/document/d/${fileId}/export?format=pdf`
          : `https://drive.usercontent.google.com/download?id=${fileId}&export=download`;

        filesToDownload.push({
          downloadUrl,
          fileName: guessFilenameFromUrl(lead.resumeUrl, `${lead.clientName}_CV.pdf`),
          originalUrl: lead.resumeUrl,
        });
      } else {
        console.warn(`  ⚠️ Unknown link format: ${lead.resumeUrl}`);
      }
    }

    if (filesToDownload.length === 0) {
      console.warn(`  ⚠️ Could not parse download links for ${lead.clientCode}`);
      totalErrors++;
      continue;
    }

    // Download and upload each file
    for (const f of filesToDownload) {
      try {
        console.log(`  ⬇️ Downloading: "${f.fileName}"...`);
        const { buffer, contentType } = await downloadBuffer(f.downloadUrl);

        if (buffer.length === 0) {
          throw new Error("Downloaded empty buffer");
        }

        const sanitizedFileName = f.fileName
          .trim()
          .replace(/[^a-zA-Z0-9._-]/g, "_")
          .replace(/_+/g, "_");

        const objectKey = `adskill-paytrack/leads/${lead.clientCode}/documents/${sanitizedFileName}`;

        console.log(`  ⬆️ Uploading to S3: "${objectKey}" (${Math.round(buffer.length / 1024)} KB)...`);
        await uploadPrivateObject({
          key: objectKey,
          body: buffer,
          contentType: contentType || "application/pdf",
          metadata: {
            leadId,
            clientCode: lead.clientCode,
            clientName: lead.clientName,
            originalUrl: f.originalUrl,
          },
        });

        // Upsert into lead_documents table
        const existingDoc = await prisma.leadDocument.findUnique({
          where: { objectKey },
        });

        if (existingDoc) {
          await prisma.leadDocument.update({
            where: { id: existingDoc.id },
            data: {
              fileName: f.fileName,
              fileSize: buffer.length,
              mimeType: contentType,
              originalUrl: f.originalUrl,
              bucket,
            },
          });
        } else {
          await prisma.leadDocument.create({
            data: {
              leadId,
              fileName: f.fileName,
              fileSize: buffer.length,
              mimeType: contentType,
              objectKey,
              bucket,
              documentType: "RESUME",
              originalUrl: f.originalUrl,
            },
          });
        }

        console.log(`  ✅ Successfully migrated: ${f.fileName}`);
        totalMigratedFiles++;
      } catch (err: any) {
        console.error(`  ❌ Failed to migrate "${f.fileName}":`, err.message);
        totalErrors++;
      }
    }
  }

  console.log("\n==================================================");
  console.log(`🎉 MIGRATION COMPLETED!`);
  console.log(`Total Files Migrated: ${totalMigratedFiles}`);
  console.log(`Total Errors/Skipped: ${totalErrors}`);
  console.log("==================================================");
}

if (require.main === module) {
  migrateLeadDocuments()
    .catch((err) => {
      console.error("Migration Fatal Error:", err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
