import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";

export const auth = betterAuth({
  database: prismaAdapter(db, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
    sendResetPassword: async ({ user, url }) => {
      void sendEmail({
        to: user.email,
        subject: "Restablece tu contraseña - MK Booking",
        text: `Recibimos una solicitud para restablecer tu contraseña.\n\nUsa este enlace para continuar:\n${url}\n\nSi no solicitaste este cambio, puedes ignorar este mensaje.`,
      });
    },
    resetPasswordTokenExpiresIn: 60 * 60,
  },
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
  trustedOrigins: [process.env.BETTER_AUTH_URL || "http://localhost:3000"],
});
