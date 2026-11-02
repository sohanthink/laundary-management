import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

const DEFAULT_EXPENSE_CATEGORIES = [
  "Detergent and chemicals",
  "Salary",
  "Transport",
  "Utilities",
  "Rent",
  "New linen purchase",
  "Other",
];

async function main() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME?.trim() || "Admin";

  if (!email || !password) {
    throw new Error("Set ADMIN_EMAIL and ADMIN_PASSWORD in .env before seeding.");
  }
  if (password.length < 8) {
    throw new Error("ADMIN_PASSWORD must be at least 8 characters.");
  }

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`Admin ${email} already exists, skipping.`);
  } else {
    await db.user.create({
      data: {
        email,
        name,
        role: "ADMIN",
        passwordHash: await bcrypt.hash(password, 12),
      },
    });
    console.log(`Created admin ${email}.`);
  }

  for (const categoryName of DEFAULT_EXPENSE_CATEGORIES) {
    await db.expenseCategory.upsert({
      where: { name: categoryName },
      update: {},
      create: { name: categoryName },
    });
  }
  console.log("Expense categories ready.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
