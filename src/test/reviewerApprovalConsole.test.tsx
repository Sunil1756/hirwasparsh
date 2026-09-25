import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ReviewerApprovalConsole } from '../components/verification/ReviewerApprovalConsole';
import { MultiTierApprovalModal } from '../components/verification/MultiTierApprovalModal';
import { BatchApprovalSafetyModal } from '../components/verification/BatchApprovalSafetyModal';
import {
  reviewerApprovalService,
  ApprovalClaim,
} from '../services/reviewerApprovalService';

const mockClaim: ApprovalClaim = {
  id: 'APPR-CLM-TEST',
  treeId: 'TREE-TEST-8801',
  planterId: 'USR-PLANTER-01',
  planterName: 'Ramesh Patel',
  species: 'Azadirachta Indica (Neem)',
  locationName: 'Sector 4, Pune',
  coords: { latitude: 18.52, longitude: 73.85 },
  photoUrl: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=600&auto=format&fit=crop',
  submittedAt: '2026-09-24T10:00:00.000Z',
  trustTier: 'high_trust',
  stage: 'pending_l1_review',
  requiresDualControl: false,
  auditLogs: [],
};

beforeEach(() => {
  vi.restoreAllMocks();
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.clear();
  }
  reviewerApprovalService.resetToDefaults();
});

describe('ReviewerApprovalConsole Component (Task 43)', () => {
  it('renders approval console header, stage counters, and claims list', () => {
    render(<ReviewerApprovalConsole />);

    expect(screen.getByText('Reviewer & Admin Approval Console')).toBeInTheDocument();
    expect(screen.getByText('Total Claims')).toBeInTheDocument();
    expect(screen.getAllByText(/Pending L1 Audit/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Pending Lead Endorsement/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Certified & Sealed/i).length).toBeGreaterThan(0);

    // Check seed claim rendered
    expect(screen.getByText('TREE-BANYAN-7701')).toBeInTheDocument();
  });

  it('switches simulated reviewer roles across L1, L2, and L3', () => {
    render(<ReviewerApprovalConsole />);

    const leadRoleBtn = screen.getByRole('button', { name: 'Lead Verifier (L2)' });
    fireEvent.click(leadRoleBtn);

    expect(leadRoleBtn).toHaveClass('bg-emerald-600');

    const adminRoleBtn = screen.getByRole('button', { name: 'Admin Certifier (L3)' });
    fireEvent.click(adminRoleBtn);

    expect(adminRoleBtn).toHaveClass('bg-emerald-600');
  });

  it('filters claims by stage buttons and search query', () => {
    render(<ReviewerApprovalConsole />);

    // Filter by Pending Lead
    const leadTab = screen.getByRole('button', { name: 'Pending Lead' });
    fireEvent.click(leadTab);

    expect(screen.getByText('TREE-TEAK-2104')).toBeInTheDocument();

    // Search query
    const searchInput = screen.getByPlaceholderText(/Search tree ID, planter name, species.../i);
    fireEvent.change(searchInput, { target: { value: 'NON_EXISTENT_SEARCH_999' } });

    expect(screen.getByText(/No claims match your current filter/i)).toBeInTheDocument();
  });

  it('opens MultiTierApprovalModal when clicking Review & Adjudicate', async () => {
    render(<ReviewerApprovalConsole />);

    const reviewButtons = screen.getAllByText('Review & Adjudicate');
    expect(reviewButtons.length).toBeGreaterThan(0);

    fireEvent.click(reviewButtons[0]);

    // Modal should now be open
    expect(screen.getByText('Multi-Tier Approval & Certification Drawer')).toBeInTheDocument();

    // Close modal
    const closeBtn = screen.getByRole('button', { name: 'Close approval drawer' });
    fireEvent.click(closeBtn);

    await waitFor(() => {
      expect(screen.queryByText('Multi-Tier Approval & Certification Drawer')).not.toBeInTheDocument();
    });
  });

  it('opens BatchApprovalSafetyModal and executes safe batch approval', async () => {
    render(<ReviewerApprovalConsole />);

    const batchBtn = screen.getByText('Safe Batch Approve');
    fireEvent.click(batchBtn);

    // Preview modal should be open
    expect(screen.getByText('Safe Batch Approval & Certification Preview')).toBeInTheDocument();

    const confirmBtn = screen.getByRole('button', { name: /Confirm & Seal/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(screen.getByText(/successfully sealed/i)).toBeInTheDocument();
    }, { timeout: 1500 });
  });
});

describe('MultiTierApprovalModal Component (Task 43)', () => {
  it('renders modal with checklist, dual-control progress, and L1 approve button', async () => {
    const onClose = vi.fn();
    const onClaimUpdated = vi.fn();

    render(
      <MultiTierApprovalModal
        claim={mockClaim}
        currentRole="field_auditor"
        currentReviewerId="REV-AUDITOR-TEST"
        currentReviewerName="Test Auditor"
        onClose={onClose}
        onClaimUpdated={onClaimUpdated}
      />
    );

    expect(screen.getByText('Multi-Tier Approval & Certification Drawer')).toBeInTheDocument();
    expect(screen.getByText(/Four-Eyes Dual-Signatory Progress/i)).toBeInTheDocument();
    expect(screen.getByText(/Reviewer Verification Checklist/i)).toBeInTheDocument();

    // L1 action button
    const approveBtn = screen.getByText('L1 Approve & Sign');
    fireEvent.click(approveBtn);

    await waitFor(() => {
      expect(onClaimUpdated).toHaveBeenCalledWith(
        expect.objectContaining({
          stage: 'approved_certified',
        })
      );
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('allows reviewer to reject claim with category and detailed grounds', async () => {
    const onClose = vi.fn();
    const onClaimUpdated = vi.fn();

    render(
      <MultiTierApprovalModal
        claim={mockClaim}
        currentRole="field_auditor"
        currentReviewerId="REV-AUDITOR-TEST"
        currentReviewerName="Test Auditor"
        onClose={onClose}
        onClaimUpdated={onClaimUpdated}
      />
    );

    const openRejectBtn = screen.getByText('Reject Claim...');
    fireEvent.click(openRejectBtn);

    const reasonTextarea = screen.getByPlaceholderText(/Specify detailed grounds for rejection/i);
    fireEvent.change(reasonTextarea, { target: { value: 'Dead sapling photographed.' } });

    const submitRejectBtn = screen.getByText('Submit Formal Rejection');
    fireEvent.click(submitRejectBtn);

    await waitFor(() => {
      expect(onClaimUpdated).toHaveBeenCalledWith(
        expect.objectContaining({
          stage: 'rejected',
        })
      );
    });
  });
});
