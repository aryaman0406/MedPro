import { prisma } from "../src/lib/prisma";

async function main() {
  console.log("DATABASE_URL present:", Boolean(process.env.DATABASE_URL));
  try {
    const users = await prisma.user.findMany({ take: 1 });
    console.log("SUCCESS! Retrieved users:", users.length);
  } catch (err: any) {
    console.error("PRISMA ERROR:", err.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
