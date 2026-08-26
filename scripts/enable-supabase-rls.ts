import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function enableRls() {
  console.log("🔒 Enabling Row-Level Security (RLS) on all public schema tables...");

  const tables: { tablename: string; rowsecurity: boolean }[] = await prisma.$queryRaw`
    SELECT tablename, rowsecurity 
    FROM pg_tables 
    WHERE schemaname = 'public'
  `;

  for (const table of tables) {
    const tableName = table.tablename;
    console.log(`Enabling RLS for table: "${tableName}"...`);
    // Safe SQL table identifier escaping
    await prisma.$executeRawUnsafe(`ALTER TABLE "public"."${tableName}" ENABLE ROW LEVEL SECURITY;`);
  }

  console.log("\n✅ RLS successfully enabled for all public schema tables!\n");

  const updatedTables: { tablename: string; rowsecurity: boolean }[] = await prisma.$queryRaw`
    SELECT tablename, rowsecurity 
    FROM pg_tables 
    WHERE schemaname = 'public'
  `;
  console.table(updatedTables);
}

enableRls()
  .catch((err) => {
    console.error("❌ Failed to enable RLS:", err);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });
