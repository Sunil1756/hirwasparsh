import { describe, it, expect } from "vitest";
import {
  UserProfile,
  Organization,
  OrganizationMember,
  Project,
  ProjectBoundary,
  Tree,
  TreePhoto,
  TreeObservation,
  MonitoringTask,
  Notification,
  AuditLog,
  AppUserRole,
  OrganizationType,
  OrganizationMemberRole,
  ProjectType,
  ProjectStatus,
  BoundaryType,
  TreeStatus,
  VerificationStatus,
  AdminStatus,
  PlantingType,
  EvidenceType,
  TreeHealthStatus,
  TaskType,
  TaskPriority,
  TaskStatus,
  NotificationType,
} from "../types/coreDatabase";

describe("Phase 2 — Core Database Architecture & Entity Specifications (Task 7)", () => {
  describe("1. UserProfile Entity (profiles)", () => {
    it("instantiates a complete user profile with role and biometrics stats", () => {
      const profile: UserProfile = {
        id: "00000000-0000-0000-0000-000000000001",
        full_name: "Aarav Sharma",
        avatar_url: "https://treebank.hirwasparsh.internal/avatars/aarav.jpg",
        phone_number: "+919876543210",
        organization_name: "Maharashtra Forest Conservation",
        role: "field_worker",
        trees_planted: 42,
        green_points: 840,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      expect(profile.id).toBeDefined();
      expect(profile.role).toBe("field_worker");
      expect(profile.trees_planted).toBe(42);
      expect(profile.green_points).toBe(840);
    });

    it("validates permissible user roles", () => {
      const validRoles: AppUserRole[] = [
        "admin",
        "government",
        "field_worker",
        "ngo",
        "corporate_csr",
        "individual_adopter",
      ];
      expect(validRoles).toHaveLength(6);
    });
  });

  describe("2. Organization & OrganizationMember Entities", () => {
    it("constructs an organization and its member with proper roles", () => {
      const org: Organization = {
        id: "org-100",
        name: "Sahyadri Bio-Reserve Trust",
        type: "ngo",
        registration_number: "NGO-MH-2024-8891",
        contact_email: "contact@sahyadri.org",
        contact_phone: "+919876500000",
        website: "https://sahyadri.org",
        logo_url: "https://treebank.hirwasparsh.internal/logos/sahyadri.png",
        created_by: "00000000-0000-0000-0000-000000000001",
        is_verified: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const member: OrganizationMember = {
        id: "member-001",
        organization_id: org.id,
        user_id: "00000000-0000-0000-0000-000000000001",
        member_role: "admin",
        status: "active",
        joined_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      expect(org.is_verified).toBe(true);
      expect(org.type).toBe("ngo");
      expect(member.organization_id).toBe(org.id);
      expect(member.member_role).toBe("admin");
    });
  });

  describe("3. Project & ProjectBoundary Entities", () => {
    it("defines a project and links spatial GeoJSON boundaries", () => {
      const project: Project = {
        id: "proj-western-ghats-01",
        organization_id: "org-100",
        name: "Western Ghats Afforestation Initiative",
        description: "Restoring native endemic tree species across Sahyadri ridges.",
        project_type: "reforestation",
        status: "active",
        target_trees: 5000,
        planted_trees: 1250,
        target_area_hectares: 25.5,
        location_name: "Mahabaleshwar Buffer Zone",
        centroid_latitude: 17.9237,
        centroid_longitude: 73.6586,
        start_date: "2026-06-01",
        created_by: "00000000-0000-0000-0000-000000000001",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const boundary: ProjectBoundary = {
        id: "bound-plot-a",
        project_id: project.id,
        boundary_name: "Compartment A - Riparian Zone",
        geometry_geojson: {
          type: "Polygon",
          coordinates: [
            [
              [73.658, 17.923],
              [73.660, 17.923],
              [73.660, 17.925],
              [73.658, 17.925],
              [73.658, 17.923],
            ],
          ],
        },
        area_sqm: 45000,
        area_hectares: 4.5,
        boundary_type: "planting_zone",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      expect(project.planted_trees).toBeLessThanOrEqual(project.target_trees);
      expect(boundary.project_id).toBe(project.id);
      expect(boundary.geometry_geojson.type).toBe("Polygon");
      expect(boundary.geometry_geojson.coordinates[0]).toHaveLength(5);
    });
  });

  describe("4. Tree & TreePhoto (Evidence) Entities", () => {
    it("models a biological tree asset and its audit evidence photo", () => {
      const tree: Tree = {
        id: "tree-teak-001",
        project_id: "proj-western-ghats-01",
        boundary_id: "bound-plot-a",
        organization_id: "org-100",
        user_id: "00000000-0000-0000-0000-000000000001",
        tree_name: "Grand Teak #1",
        species: "Tectona grandis (Teak)",
        botanical_name: "Tectona grandis",
        plantation_date: "2026-06-15",
        height_cm: 185,
        dbh_cm: 8.5,
        canopy_radius_cm: 65,
        location: "Plot A, Western Ghats",
        latitude: 17.9235,
        longitude: 73.6588,
        elevation_m: 1220,
        photo_url: "https://treebank.hirwasparsh.internal/trees/tree-teak-001.jpg",
        status: "thriving",
        verification_status: "verified",
        admin_status: "approved",
        ai_confidence: 0.96,
        ai_detected_species: "Tectona grandis",
        health_score: 98,
        planting_type: "institutional",
        points_awarded: 50,
        device_fingerprint: "fp_sensor_990",
        photo_hash: "sha256_hash_abc123",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const photo: TreePhoto = {
        id: "photo-ev-001",
        tree_id: tree.id,
        project_id: tree.project_id,
        uploader_id: tree.user_id,
        photo_url: tree.photo_url!,
        evidence_type: "planting_photo",
        caption: "Sapling root collar geotagged at planting time",
        latitude: tree.latitude,
        longitude: tree.longitude,
        altitude_m: tree.elevation_m,
        storage_bucket: "treebank",
        storage_path: "trees/2026/06/teak-001.jpg",
        sha256_hash: tree.photo_hash,
        created_at: new Date().toISOString(),
      };

      expect(tree.height_cm).toBe(185);
      expect(photo.tree_id).toBe(tree.id);
      expect(photo.evidence_type).toBe("planting_photo");
      expect(photo.storage_bucket).toBe("treebank");
    });
  });

  describe("5. TreeObservation & MonitoringTask Entities", () => {
    it("tracks temporal biometric monitoring and ground work orders", () => {
      const task: MonitoringTask = {
        id: "task-quarterly-audit",
        project_id: "proj-western-ghats-01",
        boundary_id: "bound-plot-a",
        tree_id: "tree-teak-001",
        assigned_to: "00000000-0000-0000-0000-000000000001",
        created_by: "00000000-0000-0000-0000-000000000001",
        task_type: "growth_audit",
        title: "Q3 Canopy & DBH Biometric Inspection",
        description: "Measure girth at breast height and verify soil moisture levels.",
        priority: "medium",
        status: "completed",
        due_date: "2026-09-30T18:00:00Z",
        completed_at: "2026-09-24T10:30:00Z",
        completion_notes: "Vigorous foliage growth observed; no signs of borer infestation.",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const observation: TreeObservation = {
        id: "obs-2026-09",
        tree_id: "tree-teak-001",
        observer_id: "00000000-0000-0000-0000-000000000001",
        task_id: task.id,
        observation_date: "2026-09-24T10:30:00Z",
        height_cm: 210,
        canopy_width_cm: 80,
        dbh_cm: 9.8,
        health_status: "healthy",
        condition_notes: "Healthy growth, 25cm incremental height since June.",
        pest_disease_detected: false,
        ai_health_score: 95,
        ai_diagnosis_json: { chlorophyll_index: 0.82, moisture_retention: "optimal" },
        co2_sequestered_kg: 4.8,
        latitude: 17.9235,
        longitude: 73.6588,
        created_at: new Date().toISOString(),
      };

      expect(task.status).toBe("completed");
      expect(observation.task_id).toBe(task.id);
      expect(observation.height_cm).toBe(210);
      expect(observation.pest_disease_detected).toBe(false);
    });
  });

  describe("6. Notification & AuditLog Entities", () => {
    it("creates user notifications and immutable audit log entries", () => {
      const notification: Notification = {
        id: "notif-100",
        user_id: "00000000-0000-0000-0000-000000000001",
        title: "Biometric Inspection Verified",
        message: "Your Q3 Growth Audit for Grand Teak #1 has been verified by the AI validator.",
        type: "task_assignment",
        link_url: "/tree/tree-teak-001",
        is_read: false,
        metadata: { tree_id: "tree-teak-001", score: 98 },
        created_at: new Date().toISOString(),
      };

      const audit: AuditLog = {
        id: "audit-999",
        actor_id: "00000000-0000-0000-0000-000000000001",
        actor_email: "auditor@forest.gov.in",
        action: "APPROVE_TREE_VERIFICATION",
        entity_type: "tree",
        entity_id: "tree-teak-001",
        previous_status: "pending",
        new_status: "approved",
        previous_state: { admin_status: "pending" },
        new_state: { admin_status: "approved", points_awarded: 50 },
        ip_address: "192.168.1.100",
        user_agent: "Mozilla/5.0 Chrome/120.0",
        created_at: new Date().toISOString(),
      };

      expect(notification.is_read).toBe(false);
      expect(audit.action).toBe("APPROVE_TREE_VERIFICATION");
      expect(audit.entity_type).toBe("tree");
      expect(audit.new_status).toBe("approved");
    });
  });
});
