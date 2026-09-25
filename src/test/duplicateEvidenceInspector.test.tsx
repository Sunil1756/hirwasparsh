import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DuplicateEvidenceInspectorModal } from '../components/verification/DuplicateEvidenceInspectorModal';
import { DuplicatePhotoScanner } from '../components/verification/DuplicatePhotoScanner';
import {
  duplicateEvidenceService,
  EvidenceCollision,
  EvidenceRecord,
} from '../services/duplicateEvidenceService';

const mockOriginalRecord: EvidenceRecord = {
  id: 'EV-REC-001',
  treeId: 'TREE-BANYAN-7701',
  claimId: 'CLM-2026-001',
  planterId: 'USR-PUNE-101',
  planterName: 'Ramesh Shinde',
  photoUrl: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=600&auto=format&fit=crop',
  sha256: '9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b',
  dhash: 'a4f8c2e19b0d3e5f',
  gps: { latitude: 18.52048, longitude: 73.85679 },
  timestamp: '2026-09-20T08:30:00.000Z',
  exif: {
    cameraModel: 'Sony Alpha A7 IV',
    dateTimeOriginal: '2026-09-20T08:30:00.000Z',
    serialNumber: 'SN-SNY-992144',
  },
};

const mockCollision: EvidenceCollision = {
  id: 'COL-TEST-001',
  candidateId: 'CAND-001',
  candidateTreeId: 'TREE-NEEM-1029',
  candidatePlanterId: 'USR-PUNE-909',
  candidatePhotoUrl: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=600&auto=format&fit=crop',
  candidateGps: { latitude: 18.53512, longitude: 73.87211 },
  candidateTimestamp: '2026-09-23T11:00:00.000Z',
  matchingRecord: mockOriginalRecord,
  primaryVector: 'exact_sha256',
  vectors: ['exact_sha256', 'perceptual_dhash', 'geospatial_mismatch', 'exif_sensor'],
  hammingDistance: 0,
  visualSimilarityPct: 100,
  spatialDistanceMeters: 2280,
  timeDeltaDays: 3.1,
  riskLevel: 'critical_fraud',
  reason: 'Exact SHA-256 byte collision and geodetic displacement mismatch detected (> 2.2km away).',
  detectedAt: '2026-09-25T10:00:00.000Z',
  resolutionStatus: 'pending',
};

beforeEach(() => {
  vi.restoreAllMocks();
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.clear();
  }
  duplicateEvidenceService.resetToDefaults();

  Object.assign(navigator, {
    clipboard: {
      writeText: vi.fn().mockImplementation(() => Promise.resolve()),
    },
  });
});

describe('DuplicateEvidenceInspectorModal Component (Task 41)', () => {
  it('renders modal with side-by-side evidence details and collision vectors', () => {
    const onClose = vi.fn();
    const onResolved = vi.fn();

    render(
      <DuplicateEvidenceInspectorModal
        collision={mockCollision}
        onClose={onClose}
        onResolved={onResolved}
      />
    );

    expect(screen.getByText('Duplicate Evidence Collision Inspector')).toBeInTheDocument();
    expect(screen.getByText('critical fraud')).toBeInTheDocument();
    expect(screen.getByText(/Exact SHA-256 byte collision and geodetic displacement/i)).toBeInTheDocument();

    // Side-by-side tree cards
    expect(screen.getByText('TREE-NEEM-1029')).toBeInTheDocument();
    expect(screen.getByText('TREE-BANYAN-7701')).toBeInTheDocument();
    expect(screen.getByText('USR-PUNE-909')).toBeInTheDocument();
    expect(screen.getByText(/Ramesh Shinde/i)).toBeInTheDocument();

    // Forensic Metrics
    expect(screen.getByText('100%')).toBeInTheDocument();
    expect(screen.getByText('0 bits')).toBeInTheDocument();
    expect(screen.getByText('2.28 km')).toBeInTheDocument();

    // Active vectors
    expect(screen.getByText(/Exact SHA-256 Byte Hash Collision/i)).toBeInTheDocument();
    expect(screen.getByText(/Perceptual dHash Match/i)).toBeInTheDocument();
    expect(screen.getByText(/Geodetic Distance Mismatch/i)).toBeInTheDocument();
  });

  it('allows auditor to confirm fraud and reject candidate', async () => {
    const onClose = vi.fn();
    const onResolved = vi.fn();

    render(
      <DuplicateEvidenceInspectorModal
        collision={mockCollision}
        onClose={onClose}
        onResolved={onResolved}
      />
    );

    const textarea = screen.getByPlaceholderText(/Enter auditor adjudication rationale/i);
    fireEvent.change(textarea, { target: { value: 'Confirmed photographic forgery from old banyan tree.' } });

    const rejectBtn = screen.getByText('Confirm Fraud & Reject');
    fireEvent.click(rejectBtn);

    await waitFor(() => {
      expect(onResolved).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'COL-TEST-001',
          resolutionStatus: 'confirmed_fraud_rejected',
          resolutionNotes: 'Confirmed photographic forgery from old banyan tree.',
        })
      );
    });
  });

  it('allows auditor to grant a legitimate exception with notes', async () => {
    const onClose = vi.fn();
    const onResolved = vi.fn();

    render(
      <DuplicateEvidenceInspectorModal
        collision={mockCollision}
        onClose={onClose}
        onResolved={onResolved}
      />
    );

    const textarea = screen.getByPlaceholderText(/Enter auditor adjudication rationale/i);
    fireEvent.change(textarea, { target: { value: 'Field officer verified twin sapling re-planting.' } });

    const exceptionBtn = screen.getByText('Grant Legitimate Exception');
    fireEvent.click(exceptionBtn);

    await waitFor(() => {
      expect(onResolved).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'COL-TEST-001',
          resolutionStatus: 'legitimate_exception_granted',
          resolutionNotes: 'Field officer verified twin sapling re-planting.',
        })
      );
    });
  });

  it('allows auditor to dismiss false positive', async () => {
    const onClose = vi.fn();
    const onResolved = vi.fn();

    render(
      <DuplicateEvidenceInspectorModal
        collision={mockCollision}
        onClose={onClose}
        onResolved={onResolved}
      />
    );

    const dismissBtn = screen.getByText('Dismiss False Positive');
    fireEvent.click(dismissBtn);

    await waitFor(() => {
      expect(onResolved).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'COL-TEST-001',
          resolutionStatus: 'dismissed_false_positive',
        })
      );
    });
  });

  it('triggers onClose when close button is clicked', () => {
    const onClose = vi.fn();

    render(
      <DuplicateEvidenceInspectorModal
        collision={mockCollision}
        onClose={onClose}
      />
    );

    const closeBtn = screen.getByRole('button', { name: 'Close duplicate inspector' });
    fireEvent.click(closeBtn);

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe('DuplicatePhotoScanner Component (Task 41)', () => {
  it('renders repository stats overview and collision cards', () => {
    render(<DuplicatePhotoScanner />);

    expect(screen.getByText('Repository Duplicate Evidence Scanner')).toBeInTheDocument();
    expect(screen.getByText('Total Collisions')).toBeInTheDocument();
    expect(screen.getAllByText(/Critical Fraud/i).length).toBeGreaterThan(0);
    expect(screen.getByText('High Risk Similarity')).toBeInTheDocument();
    expect(screen.getByText('Pending Adjudication')).toBeInTheDocument();
    expect(screen.getByText('Resolved')).toBeInTheDocument();

    // Check collision card elements with regex
    expect(screen.getAllByText(/TREE-NEEM-1029/i).length).toBeGreaterThan(0);
  });

  it('filters collisions by severity buttons and search query', async () => {
    render(<DuplicatePhotoScanner />);

    // Filter by Critical Fraud
    const criticalBtn = screen.getByRole('button', { name: /critical fraud/i });
    fireEvent.click(criticalBtn);

    expect(screen.getAllByText(/TREE-NEEM-1029/i).length).toBeGreaterThan(0);

    // Search query
    const searchInput = screen.getByPlaceholderText(/Search colliding tree, planter, reason.../i);
    fireEvent.change(searchInput, { target: { value: 'NON_EXISTENT_QUERY_999' } });

    expect(screen.getByText(/No duplicate evidence collisions match your filter/i)).toBeInTheDocument();
  });

  it('triggers a fresh duplicate scan on button click', async () => {
    render(<DuplicatePhotoScanner />);

    const scanBtn = screen.getByText('Run Duplicate Evidence Scan');
    fireEvent.click(scanBtn);

    expect(screen.getByText(/Scanning Entire Repository/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Run Duplicate Evidence Scan')).toBeInTheDocument();
    }, { timeout: 1500 });
  });

  it('opens inspector modal when clicking Inspect Forensics', async () => {
    render(<DuplicatePhotoScanner />);

    const inspectButtons = screen.getAllByText('Inspect Forensics');
    expect(inspectButtons.length).toBeGreaterThan(0);

    fireEvent.click(inspectButtons[0]);

    // Modal should now be visible
    expect(screen.getByText('Duplicate Evidence Collision Inspector')).toBeInTheDocument();

    // Close modal
    const closeBtn = screen.getByRole('button', { name: 'Close duplicate inspector' });
    fireEvent.click(closeBtn);

    await waitFor(() => {
      expect(screen.queryByText('Duplicate Evidence Collision Inspector')).not.toBeInTheDocument();
    });
  });
});
