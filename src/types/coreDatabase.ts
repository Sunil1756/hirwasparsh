/**
 * HIRWA SPARSH — PHASE 2 CORE DATABASE SCHEMA TYPES
 * 11 Core Entities:
 *   1. UserProfile (profiles)
 *   2. Organization (organizations)
 *   3. OrganizationMember (organization_members)
 *   4. Project (projects)
 *   5. ProjectBoundary (project_boundaries)
 *   6. Tree (trees)
 *   7. TreePhoto (tree_photos)
 *   8. TreeObservation (tree_observations)
 *   9. MonitoringTask (monitoring_tasks)
 *  10. Notification (notifications)
 *  11. AuditLog (audit_logs)
 */

export type AppUserRole =
  | 'admin'
  | 'government'
  | 'field_worker'
  | 'ngo'
  | 'corporate_csr'
  | 'individual_adopter';

export type OrganizationType =
  | 'ngo'
  | 'corporate'
  | 'government'
  | 'community'
  | 'educational';

export type OrganizationMemberRole =
  | 'owner'
  | 'admin'
  | 'manager'
  | 'field_worker'
  | 'viewer'
  | 'member';

export type OrganizationMemberStatus = 'invited' | 'active' | 'suspended';

export type ProjectType =
  | 'reforestation'
  | 'agroforestry'
  | 'urban_greenery'
  | 'community'
  | 'corporate_csr'
  | 'government_reserve';

export type ProjectStatus =
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'active'
  | 'completed'
  | 'suspended';

export type BoundaryType =
  | 'planting_zone'
  | 'buffer_zone'
  | 'exclusion_zone'
  | 'waterbody';

export type TreeStatus =
  | 'alive'
  | 'thriving'
  | 'stressed'
  | 'diseased'
  | 'dead'
  | 'replaced';

export type VerificationStatus = 'pending' | 'verified' | 'flagged' | 'rejected';
export type AdminStatus = 'pending' | 'approved' | 'rejected';
export type PlantingType = 'individual' | 'institutional' | 'community' | 'drive';

export type EvidenceType =
  | 'planting_photo'
  | 'growth_photo'
  | 'before_photo'
  | 'after_photo'
  | 'drone_orthomosaic'
  | 'selfie'
  | 'health_inspection'
  | 'soil_sample'
  | 'kml_document';

export type TreeHealthStatus =
  | 'healthy'
  | 'moderate'
  | 'critical'
  | 'dead'
  | 'recovering';

export type TaskType =
  | 'growth_audit'
  | 'health_check'
  | 'watering'
  | 'pruning'
  | 'weed_removal'
  | 'anomaly_ground_truth'
  | 'replanting';

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

export type NotificationType =
  | 'info'
  | 'alert'
  | 'task_assignment'
  | 'risk_warning'
  | 'badge_unlocked'
  | 'system';

// 1. User Profile
export interface UserProfile {
  id: string;
  full_name: string;
  avatar_url?: string | null;
  phone_number?: string | null;
  organization_name?: string | null;
  role: AppUserRole;
  trees_planted: number;
  green_points: number;
  created_at: string;
  updated_at: string;
}

// 2. Organization
export interface Organization {
  id: string;
  name: string;
  type: OrganizationType;
  registration_number?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  website?: string | null;
  logo_url?: string | null;
  created_by?: string | null;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}

// 3. Organization Member
export interface OrganizationMember {
  id: string;
  organization_id: string;
  user_id: string;
  member_role: OrganizationMemberRole;
  status: OrganizationMemberStatus;
  joined_at: string;
  created_at: string;
  updated_at: string;
}

// 4. Project
export interface Project {
  id: string;
  organization_id?: string | null;
  name: string;
  description?: string | null;
  project_type: ProjectType;
  status: ProjectStatus;
  target_trees: number;
  planted_trees: number;
  target_area_hectares?: number | null;
  location_name?: string | null;
  centroid_latitude?: number | null;
  centroid_longitude?: number | null;
  species_list?: string[] | null;
  start_date?: string | null;
  end_date?: string | null;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  verification_notes?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

// 5. Project Boundary / GIS Polygon / Compartment
export interface ProjectBoundary {
  id: string;
  project_id: string;
  boundary_name: string;
  compartment_code?: string | null;
  target_species?: string[] | null;
  geometry_geojson: {
    type: 'Polygon' | 'MultiPolygon' | 'Feature' | 'FeatureCollection';
    coordinates?: any;
    [key: string]: any;
  };
  area_sqm?: number | null;
  area_hectares?: number | null;
  area_acres?: number | null;
  kml_raw_content?: string | null;
  boundary_type: BoundaryType;
  created_at: string;
  updated_at: string;
}

// 6. Tree
export interface Tree {
  id: string;
  project_id?: string | null;
  boundary_id?: string | null;
  organization_id?: string | null;
  user_id?: string | null;
  tree_name: string;
  species: string;
  botanical_name?: string | null;
  plantation_date: string;
  height_cm: number;
  dbh_cm?: number | null;
  canopy_radius_cm?: number | null;
  location: string;
  latitude: number;
  longitude: number;
  elevation_m?: number | null;
  photo_url?: string | null;
  before_photo_url?: string | null;
  selfie_photo_url?: string | null;
  status: TreeStatus;
  verification_status: VerificationStatus;
  admin_status: AdminStatus;
  ai_confidence?: number | null;
  ai_detected_species?: string | null;
  ai_scientific_name?: string | null;
  ai_analysis?: string | null;
  health_score?: number | null;
  planting_type: PlantingType;
  points_awarded: number;
  device_fingerprint?: string | null;
  photo_hash?: string | null;
  exif_timestamp?: string | null;
  created_at: string;
  updated_at: string;
}

// 7. Tree Photo / Evidence
export interface TreePhoto {
  id: string;
  tree_id?: string | null;
  project_id?: string | null;
  uploader_id?: string | null;
  photo_url: string;
  evidence_type: EvidenceType;
  caption?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  altitude_m?: number | null;
  exif_timestamp?: string | null;
  sha256_hash?: string | null;
  storage_bucket: string;
  storage_path: string;
  created_at: string;
}

// 8. Tree Observation / Biometrics
export interface TreeObservation {
  id: string;
  tree_id: string;
  observer_id?: string | null;
  task_id?: string | null;
  observation_date: string;
  height_cm?: number | null;
  canopy_width_cm?: number | null;
  dbh_cm?: number | null;
  health_status: TreeHealthStatus;
  condition_notes?: string | null;
  pest_disease_detected?: boolean | null;
  disease_description?: string | null;
  photo_url?: string | null;
  ai_health_score?: number | null;
  ai_diagnosis_json?: Record<string, any> | null;
  co2_sequestered_kg?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  created_at: string;
}

// 9. Monitoring Task
export interface MonitoringTask {
  id: string;
  project_id: string;
  boundary_id?: string | null;
  tree_id?: string | null;
  assigned_to?: string | null;
  created_by?: string | null;
  task_type: TaskType;
  title: string;
  description?: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  due_date?: string | null;
  completed_at?: string | null;
  completion_notes?: string | null;
  created_at: string;
  updated_at: string;
}

// 10. Notification
export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: NotificationType;
  link_url?: string | null;
  is_read: boolean;
  metadata?: Record<string, any> | null;
  created_at: string;
}

// 11. Audit Log
export interface AuditLog {
  id: string;
  actor_id?: string | null;
  actor_email?: string | null;
  action: string;
  entity_type: string;
  entity_id?: string | null;
  previous_state?: Record<string, any> | null;
  new_state?: Record<string, any> | null;
  previous_status?: string | null;
  new_status?: string | null;
  ip_address?: string | null;
  user_agent?: string | null;
  created_at: string;
}
