import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("Database RLS & Schema Grants Security Audit", () => {
  const migrationsDir = path.resolve(__dirname, "../../supabase/migrations");
  const fixScriptPath = path.resolve(__dirname, "../../supabase/fix_permissions_and_tables.sql");

  it("verifies fix_permissions_and_tables.sql does NOT grant ALL to anon", () => {
    const content = fs.readFileSync(fixScriptPath, "utf8");

    // Must revoke destructive privileges from anon
    expect(content).toContain("REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;");
    // Must NOT have blanket GRANT ALL to anon
    expect(content).not.toMatch(/GRANT\s+ALL\s+ON\s+ALL\s+TABLES\s+IN\s+SCHEMA\s+public\s+TO\s+anon/i);
    // Must protect phone_number on profiles
    expect(content).toContain("REVOKE SELECT (phone_number) ON public.profiles FROM anon;");
  });

  it("verifies latest hardening migration exists with strict least-privilege policies", () => {
    const migrationPath = path.join(migrationsDir, "20261104200000_harden_database_security_and_rls.sql");
    expect(fs.existsSync(migrationPath)).toBe(true);

    const content = fs.readFileSync(migrationPath, "utf8");

    // Section 1: Schema grants
    expect(content).toContain("REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;");
    expect(content).toContain("GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;");

    // Section 2: Profiles PII protection
    expect(content).toContain("REVOKE SELECT (phone_number) ON public.profiles FROM anon;");
    expect(content).toContain("CREATE OR REPLACE VIEW public.user_public_profiles");

    // Section 3: check_ins hardening
    expect(content).toContain('CREATE POLICY "Allow authenticated insert on check_ins"');
    expect(content).not.toMatch(/CREATE\s+POLICY.*ON\s+public\.check_ins\s+FOR\s+INSERT\s+WITH\s+CHECK\s*\(true\)/i);

    // Section 4: field_tasks hardening
    expect(content).toContain('CREATE POLICY "Allow assigned or creator read on field_tasks"');
    expect(content).not.toMatch(/CREATE\s+POLICY.*ON\s+public\.field_tasks\s+FOR\s+INSERT\s+WITH\s+CHECK\s*\(true\)/i);
    expect(content).not.toMatch(/CREATE\s+POLICY.*ON\s+public\.field_tasks\s+FOR\s+UPDATE\s+USING\s*\(true\)/i);

    // Section 5: notifications strict privacy
    expect(content).toContain('CREATE POLICY "Users can only read own notifications"');
    expect(content).toContain("auth.uid() = user_id");
    expect(content).not.toMatch(/CREATE\s+POLICY.*ON\s+public\.notifications\s+FOR\s+SELECT\s+USING\s*\(true\)/i);

    // Section 6: payment_orders, payment_transactions, subscriptions
    expect(content).not.toMatch(/ON\s+public\.payment_orders.*USING.*auth\.role\(\)\s*=\s*'authenticated'/i);
    expect(content).not.toMatch(/ON\s+public\.payment_transactions.*USING.*auth\.role\(\)\s*=\s*'authenticated'/i);
    expect(content).not.toMatch(/ON\s+public\.subscriptions.*USING.*auth\.role\(\)\s*=\s*'authenticated'/i);
  });

  it("verifies payments migration does not allow arbitrary authenticated users to read other tenants' payments", () => {
    const paymentsMigPath = path.join(migrationsDir, "20260927150000_real_payments_and_subscriptions.sql");
    const content = fs.readFileSync(paymentsMigPath, "utf8");

    // Ensure the dangerous OR auth.role() = 'authenticated' was removed from payment policies
    expect(content).not.toContain("OR auth.role() = 'authenticated'");
  });

  it("verifies survival tracking migration does not allow public write on check_ins, field_tasks, and notifications", () => {
    const survivalMigPath = path.join(migrationsDir, "20260907214500_survival_tracking_feature.sql");
    const content = fs.readFileSync(survivalMigPath, "utf8");

    expect(content).not.toMatch(/ON\s+public\.check_ins\s+FOR\s+INSERT\s+WITH\s+CHECK\s*\(true\)/i);
    expect(content).not.toMatch(/ON\s+public\.field_tasks\s+FOR\s+UPDATE\s+USING\s*\(true\)/i);
    expect(content).not.toMatch(/ON\s+public\.notifications\s+FOR\s+UPDATE\s+USING\s*\(true\)/i);
    expect(content).not.toMatch(/ON\s+public\.notifications\s+FOR\s+SELECT\s+USING\s*\(true\)/i);
  });
});
