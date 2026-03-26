import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      role: string;
      /** Pendiente de completar TOTP tras login (solo admins con 2FA) */
      twoFAPending?: boolean;
      /** false solo en el paso intermedio de login 2FA */
      twoFAVerified?: boolean;
    };
  }

  interface User {
    role: string;
    twoFAPending?: boolean;
    twoFactorEnabled?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: string;
    id: string;
    twoFAPending?: boolean;
    twoFAVerified?: boolean;
    pendingRole?: string;
  }
}
