import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile, UserRole } from "@/types/database";
import {
  type AdminSection,
  canAccessSection,
  canWriteSection,
  isAdminPanelRole,
} from "@/lib/auth/permissions";

export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return null;
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    return null;
  }

  return profile as Profile;
}

/**
 * Page-level guard for /admin routes. Redirects unauthorized users cleanly.
 */
export async function requireAdminPageAccess(section?: AdminSection): Promise<Profile> {
  const profile = await getCurrentProfile();

  if (!profile) {
    redirect("/login?next=/admin");
  }

  if (profile.is_blocked || !isAdminPanelRole(profile.role)) {
    redirect("/?error=unauthorized");
  }

  if (section && !canAccessSection(profile.role, section)) {
    redirect("/admin?error=forbidden");
  }

  return profile;
}

/**
 * Server Action guard: throws an Error on unauthorized direct invocations.
 */
export async function requireActionRole(allowedRoles: UserRole[]): Promise<Profile> {
  const profile = await getCurrentProfile();

  if (!profile) {
    throw new Error("Authentication required. Please log in.");
  }

  if (profile.is_blocked) {
    throw new Error("Your account has been suspended.");
  }

  if (!allowedRoles.includes(profile.role)) {
    throw new Error("Forbidden: insufficient permissions for this action.");
  }

  return profile;
}

/**
 * Server Action guard tied to a specific admin section's write permissions.
 */
export async function requireSectionWriteAccess(section: AdminSection): Promise<Profile> {
  const profile = await getCurrentProfile();

  if (!profile) {
    throw new Error("Authentication required. Please log in.");
  }

  if (profile.is_blocked || !isAdminPanelRole(profile.role)) {
    throw new Error("Forbidden: admin panel access required.");
  }

  if (!canWriteSection(profile.role, section)) {
    throw new Error(`Forbidden: role '${profile.role}' cannot modify ${section}.`);
  }

  return profile;
}