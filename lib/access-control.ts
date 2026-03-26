import type { UserRole } from "@prisma/client";

export function hasRequiredRole(currentRole: UserRole | undefined, expectedRole: UserRole) {
  return currentRole === expectedRole;
}

export function canViewRemanejamento(args: {
  currentRole: UserRole;
  currentUserId: string;
  ownerUserId: string;
}) {
  if (args.currentRole === "ADMIN_PLANEJAMENTO") {
    return true;
  }

  return args.currentUserId === args.ownerUserId;
}
