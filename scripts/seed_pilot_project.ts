import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "https://qvikwdginymvjbrrlvkk.supabase.co";
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || "sb_publishable_zDCDVzaA22bafAOeXhjIJw_mPI7Xr1b";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const ORG_UUID = "a1111111-2222-3333-4444-555555555555";
const PROJECT_UUID = "b1111111-2222-3333-4444-555555555555";

async function seedPilotProject() {
  console.log("Seeding Phase 18 Pilot Project in live Supabase...");

  // 1. Create Organization in public.organizations
  const { data: org, error: orgErr } = await supabase
    .from("organizations")
    .upsert(
      {
        id: ORG_UUID,
        name: "Green Enlightenment Ecological Foundation",
        slug: "green-enlightenment-foundation",
        org_type: "ngo",
        type: "ngo",
        is_verified: true,
        verification_status: "verified",
      } as any,
      { onConflict: "id" }
    )
    .select()
    .single();

  if (orgErr) {
    console.warn("Org upsert notice:", orgErr.message);
  } else {
    console.log("✓ Organization Created:", org.name, `(${org.id})`);
  }

  // 2. Create Pilot Project in public.projects
  const { data: project, error: projErr } = await supabase
    .from("projects")
    .upsert(
      {
        id: PROJECT_UUID,
        organization_id: ORG_UUID,
        name: "Sahyadri Bio-Reserve Agroforestry & Carbon Pilot",
        description: "Phase 18 Inaugural Ecological MRV Corridor integrating native keystone trees, Sentinel-2 10m NDVI tracking, and community adoptions.",
        location_name: "Pune Eco Research Corridor, Maharashtra",
        centroid_latitude: 18.5284,
        centroid_longitude: 73.8512,
        target_trees: 500,
        planted_trees: 7,
        target_area_hectares: 2.5,
        status: "active",
        species_list: [
          "Azadirachta indica (Neem)",
          "Ficus benghalensis (Banyan)",
          "Tectona grandis (Teak)",
          "Madhuca longifolia (Mahua)",
          "Dalbergia sissoo (Shisham)"
        ],
      } as any,
      { onConflict: "id" }
    )
    .select()
    .single();

  if (projErr) {
    console.error("Failed to insert project:", projErr.message);
  } else {
    console.log("✓ Pilot Project Created:", project.name, `(${project.id})`);
  }

  // 3. Link existing trees in public.trees to this project
  const { error: updateErr } = await supabase
    .from("trees")
    .update({
      project_id: PROJECT_UUID,
      org_id: ORG_UUID,
    } as any)
    .neq("id", "00000000-0000-0000-0000-000000000000");

  if (updateErr) {
    console.warn("Tree link notice:", updateErr.message);
  } else {
    console.log("✓ Successfully linked all pilot trees to Project UUID:", PROJECT_UUID);
  }

  // 4. Verify Project with Count
  const { data: verifiedList } = await supabase
    .from("projects")
    .select("id, name, planted_trees, target_trees, organizations(name)")
    .eq("id", PROJECT_UUID)
    .single();

  console.log("✓ Live Project Verification:", JSON.stringify(verifiedList, null, 2));
}

seedPilotProject().catch(console.error);
