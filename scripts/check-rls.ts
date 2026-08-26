import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkRls() {
  const tables: any[] = await prisma.$queryRaw`
    SELECT tablename, rowsecurity 
    FROM pg_tables 
    WHERE schemaname = 'public'
  `;
  console.log("=== Current RLS Status on Public Schema Tables ===");
  console.table(tables);
}

checkRls()
  .catch((err) => {
    console.error("Error checking RLS:", err);
  })
  .finally(() => {
    prisma.$disconnect();
  });
