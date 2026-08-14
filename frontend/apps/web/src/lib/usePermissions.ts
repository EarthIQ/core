import { useAuth } from "./auth";

export type PermissionAction = "view" | "add" | "edit" | "delete";

export function usePermissions() {
  const { user } = useAuth();

  const hasPermission = (component: string, action: PermissionAction): boolean => {
    if (!user) return false;
    if (user.is_superuser) return true;

    const perms = user.effective_permissions || [];
    if (perms.includes("*")) return true;

    const targetPerm = `${component}:${action}`;
    return perms.includes(targetPerm);
  };

  return {
    hasPermission,
    canView: (component: string) => hasPermission(component, "view"),
    canAdd: (component: string) => hasPermission(component, "add"),
    canEdit: (component: string) => hasPermission(component, "edit"),
    canDelete: (component: string) => hasPermission(component, "delete"),
    isSuperuser: Boolean(user?.is_superuser),
  };
}
