import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import crypto from "crypto";
import { hashPassword } from "better-auth/crypto";

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL environment variable is not set");
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl:
    process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : false,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

async function upsertCredentialAccount(
  userId: string,
  password: string
): Promise<void> {
  const passwordHash = await hashPassword(password);
  const credentialAccount = await prisma.account.findFirst({
    where: {
      userId,
      providerId: "credential",
    },
  });

  if (credentialAccount) {
    await prisma.account.update({
      where: { id: credentialAccount.id },
      data: {
        password: passwordHash,
        updatedAt: new Date(),
      },
    });
    return;
  }

  await prisma.account.create({
    data: {
      id: crypto.randomUUID(),
      accountId: userId,
      providerId: "credential",
      userId,
      password: passwordHash,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });
}

async function createSuperAdmin() {
  const email = normalizeEmail(
    process.env.ADMIN_EMAIL || "admin@mkbooking.com"
  );
  const password = process.env.ADMIN_PASSWORD || "Admin123!";
  const name = process.env.ADMIN_NAME || "Super Admin";

  console.log(`Creating superadmin user: ${email}`);

  try {
    // Verificar si el usuario ya existe
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    let userId: string;

    if (existingUser) {
      console.log("User already exists, updating credentials and role...");
      userId = existingUser.id;
    } else {
      // Crear nuevo usuario
      const newUser = await prisma.user.create({
        data: {
          id: crypto.randomUUID(),
          email,
          name,
          emailVerified: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      userId = newUser.id;
    }

    await upsertCredentialAccount(userId, password);

    await prisma.userProfile.upsert({
      where: { userId },
      update: { systemRole: "SUPERADMIN" },
      create: {
        userId,
        systemRole: "SUPERADMIN",
      },
    });

    console.log("✅ Superadmin user is ready.");
    console.log("\n📧 Email:", email);
    console.log("🔑 Password:", password);
    console.log("👤 User ID:", userId);
    console.log("\nYou can now login with these credentials.");
  } catch (error) {
    console.error("❌ Error creating superadmin:", error);
    throw error;
  }
}

createSuperAdmin()
  .then(async () => {
    await prisma.$disconnect();
    await pool.end();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    await pool.end();
    process.exit(1);
  });
