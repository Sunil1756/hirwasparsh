import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { EnterpriseAiCheckoutModal } from "../components/ai/EnterpriseAiCheckoutModal";

describe("PHASE 11 — Enterprise AI Checkout Modal UI Component", () => {
  it("1. Renders Enterprise Checkout Modal with tiers, gateway options, and order summary", () => {
    render(<EnterpriseAiCheckoutModal isOpen={true} onClose={() => {}} />);

    expect(screen.getByTestId("enterprise-checkout-modal")).toBeInTheDocument();
    expect(
      screen.getByText(/Upgrade to Advanced Enterprise AI Model/i)
    ).toBeInTheDocument();

    // Check payment gateway buttons
    expect(screen.getByTestId("gateway-cc-btn")).toBeInTheDocument();
    expect(screen.getByTestId("gateway-upi-btn")).toBeInTheDocument();
    expect(screen.getByTestId("gateway-netbanking-btn")).toBeInTheDocument();
    expect(screen.getByTestId("gateway-po-btn")).toBeInTheDocument();

    // Check submit button
    expect(screen.getByTestId("submit-payment-btn")).toBeInTheDocument();
  });

  it("2. Switches between USD and INR currency modes", () => {
    render(<EnterpriseAiCheckoutModal isOpen={true} onClose={() => {}} />);

    const inrBtn = screen.getByText(/INR \(₹\)/i);
    fireEvent.click(inrBtn);

    const totalDisplay = screen.getByTestId("order-total-display");
    expect(totalDisplay.textContent).toContain("INR");

    const usdBtn = screen.getByText(/USD \(\$\)/i);
    fireEvent.click(usdBtn);

    expect(totalDisplay.textContent).toContain("USD");
  });

  it("3. Switches payment gateways and updates input forms", () => {
    render(<EnterpriseAiCheckoutModal isOpen={true} onClose={() => {}} />);

    // Switch to UPI
    const upiBtn = screen.getByTestId("gateway-upi-btn");
    fireEvent.click(upiBtn);
    expect(screen.getByTestId("input-upi-id")).toBeInTheDocument();

    // Switch to Corporate PO
    const poBtn = screen.getByTestId("gateway-po-btn");
    fireEvent.click(poBtn);
    expect(screen.getByTestId("input-po-number")).toBeInTheDocument();

    // Switch back to Credit Card
    const ccBtn = screen.getByTestId("gateway-cc-btn");
    fireEvent.click(ccBtn);
    expect(screen.getByTestId("input-card-number")).toBeInTheDocument();
  });

  it("4. Submits payment, simulates provisioning, and displays Enterprise Activation Certificate", async () => {
    const handleSuccess = vi.fn();
    render(<EnterpriseAiCheckoutModal isOpen={true} onClose={() => {}} onSuccess={handleSuccess} />);

    const submitBtn = screen.getByTestId("submit-payment-btn");
    fireEvent.click(submitBtn);

    await waitFor(
      () => {
        expect(screen.getByTestId("activation-success-view")).toBeInTheDocument();
      },
      { timeout: 3500 }
    );

    expect(
      screen.getByText(/Enterprise AI Model Activated Successfully!/i)
    ).toBeInTheDocument();
    expect(screen.getByTestId("license-key-display")).toBeInTheDocument();
    expect(screen.getByTestId("copy-license-btn")).toBeInTheDocument();
    expect(screen.getByTestId("launch-studio-btn")).toBeInTheDocument();

    expect(handleSuccess).toHaveBeenCalled();
  });
});
