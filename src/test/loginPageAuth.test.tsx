import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import Login from "@/pages/Login";

const mockSignInWithPassword = vi.fn();
const mockSignUp = vi.fn();
const mockSignInWithOtp = vi.fn();
const mockResetPasswordForEmail = vi.fn();
const mockUpdateUser = vi.fn();
const mockUpsert = vi.fn();
const mockFrom = vi.fn(() => ({
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
  upsert: mockUpsert.mockResolvedValue({ error: null }),
  insert: vi.fn().mockResolvedValue({ error: null }),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
      getSession: vi.fn(() => Promise.resolve({ data: { session: null } })),
      signInWithPassword: (...args: any[]) => mockSignInWithPassword(...args),
      signUp: (...args: any[]) => mockSignUp(...args),
      signInWithOtp: (...args: any[]) => mockSignInWithOtp(...args),
      resetPasswordForEmail: (...args: any[]) => mockResetPasswordForEmail(...args),
      updateUser: (...args: any[]) => mockUpdateUser(...args),
      signOut: vi.fn(),
    },
    from: (table: string) => mockFrom(table),
    functions: {
      invoke: vi.fn().mockResolvedValue({ data: { success: true }, error: null }),
    },
  },
}));

const mockToast = vi.fn();
vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({
    toast: mockToast,
  }),
}));

const createQueryClient = () =>
  new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });

const switchTab = (tabElement: HTMLElement) => {
  fireEvent.pointerDown(tabElement, { button: 0 });
  fireEvent.mouseDown(tabElement, { button: 0 });
  fireEvent.click(tabElement);
  fireEvent.keyDown(tabElement, { key: "Enter", code: "Enter" });
};

describe("Authentication System & Login Page Verification", () => {
  let dateSpy: any;

  beforeEach(() => {
    vi.clearAllMocks();
    let currentTime = 1000000;
    dateSpy = vi.spyOn(Date, "now").mockImplementation(() => {
      currentTime += 2000; // ensures bot timer check passes
      return currentTime;
    });
  });

  afterEach(() => {
    dateSpy?.mockRestore();
  });

  it("renders the Login page with Brand Banner, Sign In and Create Account tabs", () => {
    const queryClient = createQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <LanguageProvider>
          <AuthProvider>
            <MemoryRouter>
              <Login />
            </MemoryRouter>
          </AuthProvider>
        </LanguageProvider>
      </QueryClientProvider>
    );

    expect(screen.getAllByText(/Green Enlightenment/i)[0]).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Sign In/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Create Account/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/name@gmail\.com/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/••••••••/i)).toBeInTheDocument();
  });

  it("switches to Create Account tab and renders registration form with persona options, email, phone, and password", async () => {
    const queryClient = createQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <LanguageProvider>
          <AuthProvider>
            <MemoryRouter>
              <Login />
            </MemoryRouter>
          </AuthProvider>
        </LanguageProvider>
      </QueryClientProvider>
    );

    const signUpTab = screen.getByRole("tab", { name: /Create Account/i });
    switchTab(signUpTab);

    expect(await screen.findByPlaceholderText(/Rohit Patil/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/rohit@gmail\.com/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/9876543210/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/At least 6 characters/i)).toBeInTheDocument();
    expect(screen.getByText(/Individual/i)).toBeInTheDocument();
    expect(screen.getByText(/NGO \/ CSR/i)).toBeInTheDocument();
    expect(screen.getByText(/School\/College/i)).toBeInTheDocument();
  });

  it("switches persona to NGO / CSR and displays organization name field", async () => {
    const queryClient = createQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <LanguageProvider>
          <AuthProvider>
            <MemoryRouter>
              <Login />
            </MemoryRouter>
          </AuthProvider>
        </LanguageProvider>
      </QueryClientProvider>
    );

    const signUpTab = screen.getByRole("tab", { name: /Create Account/i });
    switchTab(signUpTab);

    const ngoOption = await screen.findByText(/NGO \/ CSR/i);
    fireEvent.click(ngoOption);

    expect(await screen.findByPlaceholderText(/Sahyadri Environmental Trust/i)).toBeInTheDocument();
  });

  it("attempts direct email sign-in with valid credentials and invokes Supabase auth directly", async () => {
    mockSignInWithPassword.mockResolvedValueOnce({
      data: { user: { id: "user-123", email: "adopter@greenenlightenment.org" }, session: {} },
      error: null,
    });

    const queryClient = createQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <LanguageProvider>
          <AuthProvider>
            <MemoryRouter>
              <Login />
            </MemoryRouter>
          </AuthProvider>
        </LanguageProvider>
      </QueryClientProvider>
    );

    const emailInput = screen.getByPlaceholderText(/name@gmail\.com/i);
    const passwordInput = screen.getByPlaceholderText(/••••••••/i);

    fireEvent.change(emailInput, { target: { value: "adopter@greenenlightenment.org" } });
    fireEvent.change(passwordInput, { target: { value: "SecurePass123!" } });

    const submitBtn = screen.getByRole("button", { name: /^Sign In$/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockSignInWithPassword).toHaveBeenCalledWith({
        email: "adopter@greenenlightenment.org",
        password: "SecurePass123!",
      });
    });
  });

  it("handles login failure gracefully with user-friendly error notification", async () => {
    mockSignInWithPassword.mockResolvedValueOnce({
      data: { user: null, session: null },
      error: { message: "Invalid login credentials" },
    });

    const queryClient = createQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <LanguageProvider>
          <AuthProvider>
            <MemoryRouter>
              <Login />
            </MemoryRouter>
          </AuthProvider>
        </LanguageProvider>
      </QueryClientProvider>
    );

    const emailInput = screen.getByPlaceholderText(/name@gmail\.com/i);
    const passwordInput = screen.getByPlaceholderText(/••••••••/i);

    fireEvent.change(emailInput, { target: { value: "unknown@gmail.com" } });
    fireEvent.change(passwordInput, { target: { value: "WrongPass123!" } });

    const submitBtn = screen.getByRole("button", { name: /^Sign In$/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Sign-In Failed",
          variant: "destructive",
        })
      );
    });
  });

  it("creates a new account directly via Supabase Auth without fake SMS OTP", async () => {
    mockSignUp.mockResolvedValueOnce({
      data: {
        user: {
          id: "new-user-789",
          identities: [{ id: "identity-1" }],
        },
        session: { access_token: "token123" },
      },
      error: null,
    });

    const queryClient = createQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <LanguageProvider>
          <AuthProvider>
            <MemoryRouter>
              <Login />
            </MemoryRouter>
          </AuthProvider>
        </LanguageProvider>
      </QueryClientProvider>
    );

    const signUpTab = screen.getByRole("tab", { name: /Create Account/i });
    switchTab(signUpTab);

    const nameInput = await screen.findByPlaceholderText(/Rohit Patil/i);
    const emailInput = screen.getByPlaceholderText(/rohit@gmail\.com/i);
    const phoneInput = screen.getByPlaceholderText(/9876543210/i);
    const passwordInput = screen.getByPlaceholderText(/At least 6 characters/i);

    fireEvent.change(nameInput, { target: { value: "Rohit Patil" } });
    fireEvent.change(emailInput, { target: { value: "rohit.patil@gmail.com" } });
    fireEvent.change(phoneInput, { target: { value: "9820123456" } });
    fireEvent.change(passwordInput, { target: { value: "Str0ngP@ssw0rd!" } });

    const signUpBtn = screen.getByRole("button", { name: /Create Account & Get Started/i });
    expect(signUpBtn).not.toBeDisabled();
    fireEvent.click(signUpBtn);

    await waitFor(() => {
      expect(mockSignUp).toHaveBeenCalledWith(
        expect.objectContaining({
          email: "rohit.patil@gmail.com",
          password: "Str0ngP@ssw0rd!",
          options: expect.objectContaining({
            data: expect.objectContaining({
              full_name: "Rohit Patil",
              account_type: "individual",
            }),
          }),
        })
      );
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "new-user-789",
          full_name: "Rohit Patil",
          account_type: "individual",
        })
      );
    });
  });

  it("dispatches Magic Link for passwordless authentication", async () => {
    mockSignInWithOtp.mockResolvedValueOnce({ error: null });

    const queryClient = createQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <LanguageProvider>
          <AuthProvider>
            <MemoryRouter>
              <Login />
            </MemoryRouter>
          </AuthProvider>
        </LanguageProvider>
      </QueryClientProvider>
    );

    const emailInput = screen.getByPlaceholderText(/name@gmail\.com/i);
    fireEvent.change(emailInput, { target: { value: "citizen@greenenlightenment.org" } });

    const magicLinkBtn = screen.getByRole("button", { name: /Sign In with Magic Link/i });
    fireEvent.click(magicLinkBtn);

    await waitFor(() => {
      expect(mockSignInWithOtp).toHaveBeenCalledWith(
        expect.objectContaining({
          email: "citizen@greenenlightenment.org",
        })
      );
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: expect.stringContaining("Magic Link Sent!"),
        })
      );
    });
  });

  it("opens Forgot Password dialog and dispatches password reset email", async () => {
    mockResetPasswordForEmail.mockResolvedValueOnce({ error: null });

    const queryClient = createQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <LanguageProvider>
          <AuthProvider>
            <MemoryRouter>
              <Login />
            </MemoryRouter>
          </AuthProvider>
        </LanguageProvider>
      </QueryClientProvider>
    );

    const forgotBtn = screen.getByRole("button", { name: /Forgot Password\?/i });
    fireEvent.click(forgotBtn);

    expect(screen.getByText(/Reset Account Password/i)).toBeInTheDocument();

    const modalEmailInput = screen.getByPlaceholderText(/you@gmail\.com/i);
    fireEvent.change(modalEmailInput, { target: { value: "adopter@greenenlightenment.org" } });

    const sendLinkBtn = screen.getByRole("button", { name: /Send Reset Link/i });
    fireEvent.click(sendLinkBtn);

    await waitFor(() => {
      expect(mockResetPasswordForEmail).toHaveBeenCalledWith(
        "adopter@greenenlightenment.org",
        expect.objectContaining({
          redirectTo: expect.stringContaining("/login?type=recovery"),
        })
      );
    });
  });

  it("updates user password when in recovery mode (?type=recovery)", async () => {
    mockUpdateUser.mockResolvedValueOnce({ data: { user: {} }, error: null });

    const queryClient = createQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <LanguageProvider>
          <AuthProvider>
            <MemoryRouter initialEntries={["/login?type=recovery"]}>
              <Login />
            </MemoryRouter>
          </AuthProvider>
        </LanguageProvider>
      </QueryClientProvider>
    );

    expect(await screen.findByRole("heading", { name: /^Set New Password$/i })).toBeInTheDocument();
    const newPassInput = screen.getByPlaceholderText(/Enter at least 6 characters/i);
    fireEvent.change(newPassInput, { target: { value: "NewStr0ngP@ssw0rd!" } });

    const submitBtn = screen.getByRole("button", { name: /Save Password & Continue/i });
    expect(submitBtn).not.toBeDisabled();
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockUpdateUser).toHaveBeenCalledWith({
        password: "NewStr0ngP@ssw0rd!",
      });
    });
  });
});
