import dotenv from "dotenv";
dotenv.config();

import { runDatabaseBackup } from "../modules/Backup/backup.service";

async function main() {
  console.log("==================================================");
  console.log("🚀 Starting AdSkill PayTrack Database Backup to R2");
  console.log("==================================================");

  try {
    const result = await runDatabaseBackup();
    console.log("\n✅ BACKUP COMPLETED SUCCESSFULLY!");
    console.log("--------------------------------------------------");
    console.log(`📁 Target File : ${result.key}`);
    console.log(`📦 Bucket      : ${result.bucket}`);
    console.log(`📊 Tables      : ${result.totalTables}`);
    console.log(`🔢 Total Rows  : ${result.totalRows}`);
    console.log(`💾 Raw Size    : ${result.originalSize}`);
    console.log(`🗜️  Compressed  : ${result.compressedSize} (Saved ${result.compressionRatio})`);
    console.log(`⏱️  Duration    : ${result.durationMs}ms`);
    console.log(`🕒 Timestamp   : ${result.createdAt}`);
    if (result.signedDownloadUrl) {
      console.log(`🔗 Signed URL  : ${result.signedDownloadUrl}`);
    }
    console.log("--------------------------------------------------");
    process.exit(0);
  } catch (error) {
    console.error("\n❌ BACKUP FAILED:", error);
    process.exit(1);
  }
}

main();
