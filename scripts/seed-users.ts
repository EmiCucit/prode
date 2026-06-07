import { config } from "dotenv";
// Cargar .env.local antes de importar módulos que leen env vars
config({ path: ".env.local" });

import bcrypt from "bcryptjs";
import { createServerClient } from "@/lib/supabase/server";

const USERS = [
  { username: "santi",  displayName: "Santi",  avatarKey: "santi"  },
  { username: "marian", displayName: "Marian", avatarKey: "marian" },
  { username: "tuto",   displayName: "Tuto",   avatarKey: "tuto"   },
  { username: "chispa", displayName: "Chispa", avatarKey: "chispa" },
  { username: "maria",  displayName: "Maria",  avatarKey: "maria"  },
  { username: "vicky",  displayName: "Vicky",  avatarKey: "vicky"  },
  { username: "marti",  displayName: "Marti",  avatarKey: "marti"  },
  { username: "guada",  displayName: "Guada",  avatarKey: "guada"  },
  { username: "jime",   displayName: "Jime",   avatarKey: "jime"   },
  { username: "juli",   displayName: "Juli",   avatarKey: "juli"   },
] as const;

const BCRYPT_ROUNDS = 12;

async function main() {
  const rawPasswords = process.env["SEED_PASSWORDS"];
  if (!rawPasswords) {
    throw new Error(
      "SEED_PASSWORDS no está definida.\n" +
      "Agregala a .env.local con el formato:\n" +
      "SEED_PASSWORDS=pass_santi,pass_marian,pass_tuto,...\n" +
      "(mismo orden que la lista de usuarios)"
    );
  }

  const passwords = rawPasswords.split(",").map((p) => p.trim());
  if (passwords.length !== USERS.length) {
    throw new Error(
      `Se esperaban ${USERS.length} contraseñas, se recibieron ${passwords.length}`
    );
  }

  const db = createServerClient();

  for (const [i, user] of USERS.entries()) {
    const password = passwords[i];
    if (!password) throw new Error(`Contraseña vacía para ${user.username}`);

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    const { error } = await db.from("users").upsert(
      {
        username: user.username,
        password_hash: passwordHash,
        display_name: user.displayName,
        avatar_key: user.avatarKey,
      },
      { onConflict: "username" },
    );

    if (error) throw new Error(`Error seeding ${user.username}: ${error.message}`);
    console.log(`✓ ${user.username}`);
  }

  console.log("\n✅ Seed completo — 10 usuarios insertados/actualizados.");
}

main().catch((err) => {
  console.error("\n❌", err instanceof Error ? err.message : err);
  process.exit(1);
});
