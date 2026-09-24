/**
 * HIRWA SPARSH / GREEN ENLIGHTENMENT — PHASE 4 TASK 18
 * React Hook for 7-Stage Tree Registration Wizard
 * Flow: User → Project → GPS → Photo → Tree Data → Database → Tree ID
 */

import { useState, useCallback } from "react";
import {
  treeRegistrationService,
  UserRegistrationContext,
  ProjectRegistrationContext,
  GpsRegistrationContext,
  PhotoRegistrationContext,
  BiometricTreeData,
  TreeRegistrationResult,
  RegistrationPipelineStage,
} from "@/services/treeRegistrationService";
import { useAuth } from "@/contexts/AuthContext";

export type WizardStep = "project" | "gps" | "photo" | "tree_data" | "submitting" | "success";

export function useTreeRegistration() {
  const { user, profile } = useAuth();

  const [currentStep, setCurrentStep] = useState<WizardStep>("project");
  const [projectContext, setProjectContext] = useState<ProjectRegistrationContext>({
    projectId: null,
    projectName: null,
    isIndividualPlanting: true,
  });
  const [gpsContext, setGpsContext] = useState<GpsRegistrationContext | null>(null);
  const [photosContext, setPhotosContext] = useState<PhotoRegistrationContext | null>(null);
  const [treeData, setTreeData] = useState<BiometricTreeData>({
    species: "",
    treeName: "",
    plantationDate: new Date().toISOString().split("T")[0],
    heightCm: 30,
    status: "alive",
  });

  const [pipelineStage, setPipelineStage] = useState<RegistrationPipelineStage>("user_validation");
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [progressMessage, setProgressMessage] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [registrationResult, setRegistrationResult] = useState<TreeRegistrationResult | null>(null);

  // Set Project
  const setProject = useCallback((project: ProjectRegistrationContext) => {
    setProjectContext(project);
    setError(null);
  }, []);

  // Set GPS
  const setGps = useCallback((gps: GpsRegistrationContext) => {
    setGpsContext(gps);
    setError(null);
  }, []);

  // Set Photos
  const setPhotos = useCallback((photos: PhotoRegistrationContext) => {
    setPhotosContext(photos);
    setError(null);
  }, []);

  // Set Biometric Data
  const setBiometrics = useCallback((data: Partial<BiometricTreeData>) => {
    setTreeData((prev) => ({ ...prev, ...data }));
    setError(null);
  }, []);

  // Execute End-to-End Registration
  const submitRegistration = useCallback(async () => {
    if (!user) {
      const err = "Please log in to register a tree.";
      setError(err);
      return { success: false, error: err };
    }

    if (!gpsContext) {
      const err = "GPS location is required.";
      setError(err);
      return { success: false, error: err };
    }

    if (!photosContext || !photosContext.afterPhoto) {
      const err = "Photo evidence ('After' tree photo) is required.";
      setError(err);
      return { success: false, error: err };
    }

    if (!treeData.species || treeData.species.trim() === "") {
      const err = "Species name is required.";
      setError(err);
      return { success: false, error: err };
    }

    setIsSubmitting(true);
    setCurrentStep("submitting");
    setError(null);

    const userContext: UserRegistrationContext = {
      userId: user.id,
      email: user.email,
      fullName: (profile as any)?.full_name || null,
      role: (profile as any)?.role || "individual_adopter",
      organizationId: (profile as any)?.organization_id || null,
    };

    try {
      const result = await treeRegistrationService.registerTree({
        user: userContext,
        project: projectContext,
        gps: gpsContext,
        photos: photosContext,
        treeData,
        onProgress: (stage, percent, message) => {
          setPipelineStage(stage);
          setProgressPercent(percent);
          setProgressMessage(message);
        },
      });

      setRegistrationResult(result);

      if (result.success) {
        setCurrentStep("success");
      } else {
        setError(result.error || "Registration failed");
        setCurrentStep("tree_data");
      }

      return result;
    } catch (err: any) {
      const msg = err?.message || "An unexpected error occurred during submission.";
      setError(msg);
      setCurrentStep("tree_data");
      return { success: false, error: msg };
    } finally {
      setIsSubmitting(false);
    }
  }, [user, profile, projectContext, gpsContext, photosContext, treeData]);

  // Reset wizard
  const reset = useCallback(() => {
    setCurrentStep("project");
    setProjectContext({ projectId: null, projectName: null, isIndividualPlanting: true });
    setGpsContext(null);
    setPhotosContext(null);
    setTreeData({
      species: "",
      treeName: "",
      plantationDate: new Date().toISOString().split("T")[0],
      heightCm: 30,
      status: "alive",
    });
    setRegistrationResult(null);
    setError(null);
    setIsSubmitting(false);
    setProgressPercent(0);
    setProgressMessage("");
  }, []);

  return {
    currentStep,
    setCurrentStep,
    projectContext,
    gpsContext,
    photosContext,
    treeData,
    pipelineStage,
    progressPercent,
    progressMessage,
    isSubmitting,
    error,
    registrationResult,
    treeCode: registrationResult?.treeCode || null,
    setProject,
    setGps,
    setPhotos,
    setBiometrics,
    submitRegistration,
    reset,
  };
}
