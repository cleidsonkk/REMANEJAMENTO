import { UserRole, UserStatus } from "@prisma/client";
import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    role: UserRole;
    secretariaId: string | null;
    secretariaIds: string[];
    status: UserStatus;
  }

  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      role: UserRole;
      secretariaId: string | null;
      secretariaIds: string[];
      status: UserStatus;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: UserRole;
    secretariaId?: string | null;
    secretariaIds?: string[];
    status?: UserStatus;
  }
}
