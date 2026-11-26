import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

// Load .env.local manually so no extra dependency is required
const envPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    const val = trimmed.slice(eqIndex + 1).trim();
    if (!process.env[key]) {
      process.env[key] = val;
    }
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Error: Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const TEST_USERS = [
  {
    email: "customer@aurashop.com",
    password: "Password123!",
    full_name: "Ayesha Rahman (Customer)",
    phone: "01711000001",
    role: "customer",
  },
  {
    email: "staff@aurashop.com",
    password: "Password123!",
    full_name: "Tariq Hasan (Staff)",
    phone: "01711000002",
    role: "staff",
  },
  {
    email: "manager@aurashop.com",
    password: "Password123!",
    full_name: "Farhana Kabir (Manager)",
    phone: "01711000003",
    role: "manager",
  },
  {
    email: "admin@aurashop.com",
    password: "Password123!",
    full_name: "Fahim Ruddro (Admin)",
    phone: "01711000004",
    role: "admin",
  },
];

async function seedTestUsers() {
  console.log("Seeding 4 Aura Shop test role accounts...\n");

  const { data: existingList, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) {
    console.error("Failed to list existing users:", listError.message);
    process.exit(1);
  }

  for (const user of TEST_USERS) {
    const existing = existingList.users.find(
      (u) => u.email?.toLowerCase() === user.email.toLowerCase()
    );

    let userId;

    if (existing) {
      const { data: updated, error: updateError } = await supabase.auth.admin.updateUserById(
        existing.id,
        {
          password: user.password,
          email_confirm: true,
          user_metadata: {
            full_name: user.full_name,
            phone: user.phone,
            role: user.role,
          },
        }
      );
      if (updateError) {
        console.error(`Failed updating ${user.email}:`, updateError.message);
        continue;
      }
      userId = updated.user.id;
    } else {
      const { data: created, error: createError } = await supabase.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true,
        user_metadata: {
          full_name: user.full_name,
          phone: user.phone,
          role: user.role,
        },
      });
      if (createError) {
        console.error(`Failed creating ${user.email}:`, createError.message);
        continue;
      }
      userId = created.user.id;
    }

    const { error: profileError } = await supabase.from("profiles").upsert({
      id: userId,
      email: user.email,
      full_name: user.full_name,
      phone: user.phone,
      role: user.role,
      is_blocked: false,
    });

    if (profileError) {
      console.error(`Profile upsert error for ${user.email}:`, profileError.message);
    } else {
      console.log(`✔ ${user.role.toUpperCase().padEnd(8)} | ${user.email} | ${user.password}`);
    }
  }

  console.log("\nDone! All 4 test accounts are ready.");
}

seedTestUsers();