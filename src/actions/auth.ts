"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isAdminPanelRole } from "@/lib/auth/permissions";

const loginSchema = z.object({
  email: z.string().trim().email("Please enter a valid email address."),
  password: z.string().min(6, "Password must be at least 6 characters."),
  next: z.string().optional(),
});

const signupSchema = z.object({
  full_name: z.string().trim().min(2, "Full name must be at least 2 characters."),
  phone: z.string().trim().min(6, "Please enter a valid phone number."),
  email: z.string().trim().email("Please enter a valid email address."),
  password: z.string().min(6, "Password must be at least 6 characters."),
});

export interface AuthActionResult {
  error?: string;
}

export async function loginAction(formData: FormData): Promise<AuthActionResult> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    next: formData.get("next") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid login details." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error || !data.user) {
    return { error: error?.message ?? "Invalid email or password." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_blocked")
    .eq("id", data.user.id)
    .single();

  if (profile?.is_blocked) {
    await supabase.auth.signOut();
    return { error: "Your account has been suspended. Please contact Aura Shop support." };
  }

  revalidatePath("/", "layout");

  const nextPath = parsed.data.next;
  if (nextPath && nextPath.startsWith("/") && !nextPath.startsWith("//")) {
    if (nextPath.startsWith("/admin") && !isAdminPanelRole(profile?.role)) {
      redirect("/?error=unauthorized");
    }
    redirect(nextPath);
  }

  if (isAdminPanelRole(profile?.role)) {
    redirect("/admin");
  }

  redirect("/");
}

export async function signupAction(formData: FormData): Promise<AuthActionResult> {
  const parsed = signupSchema.safeParse({
    full_name: formData.get("full_name"),
    phone: formData.get("phone"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid registration details." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: {
        full_name: parsed.data.full_name,
        phone: parsed.data.phone,
        role: "customer",
      },
    },
  });

  if (error) {
    return { error: error.message };
  }

  if (!data.session) {
    return {
      error:
        "Account created! Please check your email to confirm your address before logging in.",
    };
  }

  revalidatePath("/", "layout");
  redirect("/");
}

export async function logoutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}