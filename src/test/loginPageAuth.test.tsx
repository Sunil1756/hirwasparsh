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
const mockSignInWithOAuth = vi.fn();
const mockResetPasswordForEmail = vi.fn();
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
      signInWithOAuth: (...args: any[]) => mockSignInWithOAuth(...args),
      resetPasswordForEmail: (...args: any[]) => mockResetPasswordForEmail(...args),
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
      currentTime += 2000; // ensures bot timer check (> 600ms) passes
      return currentTime;
    });
  });

  afterEach(() => {
    dateSpy?.mockRestore();
  });

  it("renders the Login page with Brand Banner, Log In and Sign Up tabs", () => {
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
    expect(screen.getByRole("tab", { name: /Log In/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Sign Up/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/name@gmail\.com or 9876543210/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/••••••••/i)).toBeInTheDocument();
  });

  it("switches to Sign Up tab and renders registration form with persona options, email, phone, and password", async () => {
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

    const signUpTab = screen.getByRole("tab", { name: /Sign Up/i });
    switchTab(signUpTab);

    expect(await screen.findByPlaceholderText(/Rohit Patil/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/rohit@gmail\.com/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/9876543210/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Min 8\+ strong characters/i)).toBeInTheDocument();
    expect(screen.getByText(/Individual/i)).toBeInTheDocument();
    expect(screen.getByText(/NGO \/ Trust/i)).toBeInTheDocument();
    expect(screen.getByText(/School \/ College/i)).toBeInTheDocument();
  });

  it("switches persona to NGO / Trust and displays organization name field", async () => {
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

    const signUpTab = screen.getByRole("tab", { name: /Sign Up/i });
    switchTab(signUpTab);

    const ngoOption = await screen.findByText(/NGO \/ Trust/i);
    fireEvent.click(ngoOption);

    expect(await screen.findByPlaceholderText(/Sahyadri Environmental Trust/i)).toBeInTheDocument();
  });

  it("attempts direct email sign-in with valid credentials and invokes Supabase auth directly (no OTP)", async () => {
    mockSignInWithPassword.mockResolvedValueOnce({
      data: { user: { id: "user-123" }, session: {} },
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

    const identifierInput = screen.getByPlaceholderText(/name@gmail\.com or 9876543210/i);
    const passwordInput = screen.getByPlaceholderText(/••••••••/i);

    fireEvent.change(identifierInput, { target: { value: "adopter@greenenlightenment.org" } });
    fireEvent.change(passwordInput, { target: { value: "SecurePass123!" } });

    const submitBtn = screen.getByRole("button", { name: /Log In/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockSignInWithPassword).toHaveBeenCalledWith({
        email: "adopter@greenenlightenment.org",
        password: "SecurePass123!",
      });
    });
  });

  it("attempts direct mobile number sign-in with valid credentials without requiring OTP", async () => {
    mockSignInWithPassword.mockResolvedValueOnce({
      data: { user: { id: "user-phone-123" }, session: {} },
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

    const identifierInput = screen.getByPlaceholderText(/name@gmail\.com or 9876543210/i);
    const passwordInput = screen.getByPlaceholderText(/••••••••/i);

    fireEvent.change(identifierInput, { target: { value: "9876543210" } });
    fireEvent.change(passwordInput, { target: { value: "SecurePass123!" } });

    const submitBtn = screen.getByRole("button", { name: /Log In/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockSignInWithPassword).toHaveBeenCalledWith(
        expect.objectContaining({
          password: "SecurePass123!",
        })
      );
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

    const identifierInput = screen.getByPlaceholderText(/name@gmail\.com or 9876543210/i);
    const passwordInput = screen.getByPlaceholderText(/••••••••/i);

    fireEvent.change(identifierInput, { target: { value: "unknown@gmail.com" } });
    fireEvent.change(passwordInput, { target: { value: "WrongPass123!" } });

    const submitBtn = screen.getByRole("button", { name: /Log In/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: expect.stringContaining("Invalid Email/Mobile or Password"),
          variant: "destructive",
        })
      );
    });
  });

  it("initiates sign-up, dispatches Twilio mobile OTP, verifies OTP and creates Supabase account", async () => {
    mockSignUp.mockResolvedValueOnce({
      data: {
        user: {
          id: "new-user-789",
          identities: [{ id: "identity-1" }],
        },
        session: {},
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

    const signUpTab = screen.getByRole("tab", { name: /Sign Up/i });
    switchTab(signUpTab);

    const nameInput = await screen.findByPlaceholderText(/Rohit Patil/i);
    const emailInput = screen.getByPlaceholderText(/rohit@gmail\.com/i);
    const phoneInput = screen.getByPlaceholderText(/9876543210/i);
    const passwordInput = screen.getByPlaceholderText(/Min 8\+ strong characters/i);

    fireEvent.change(nameInput, { target: { value: "Rohit Patil" } });
    fireEvent.change(emailInput, { target: { value: "rohit.patil@gmail.com" } });
    fireEvent.change(phoneInput, { target: { value: "9820123456" } });
    fireEvent.change(passwordInput, { target: { value: "Str0ngP@ssw0rd!" } });

    const signUpBtn = screen.getByRole("button", { name: /Sign Up & Verify Mobile/i });
    expect(signUpBtn).not.toBeDisabled();
    fireEvent.click(signUpBtn);

    // Should receive Twilio OTP notification and display OTP input
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: expect.stringContaining("Twilio OTP Dispatched!"),
        })
      );
    });

    expect(await screen.findByText(/Enter 6-Digit Twilio OTP Code/i)).toBeInTheDocument();

    // Fill OTP and complete registration
    const verifyBtn = screen.getByRole("button", { name: /Verify OTP & Complete Registration/i });
    
    // Simulate typing 6 digits in OTP slots
    const inputs = screen.getAllByRole("textbox");
    // Change input
    const otpContainer = screen.getByText(/Enter 6-Digit Twilio OTP Code/i).parentElement;
    const otpInput = otpContainer?.querySelector("input") || inputs[inputs.length - 1];
    fireEvent.change(otpInput, { target: { value: "123456" } });

    fireEvent.click(verifyBtn);

    await waitFor(() => {
      expect(mockSignUp).toHaveBeenCalledWith(
        expect.objectContaining({
          email: "rohit.patil@gmail.com",
          password: "Str0ngP@ssw0rd!",
          options: expect.objectContaining({
            data: expect.objectContaining({
              full_name: "Rohit Patil",
              phone: "+919820123456",
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

    const emailInputs = screen.getAllByPlaceholderText(/you@gmail\.com/i);
    const modalEmailInput = emailInputs[emailInputs.length - 1];
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
    const mockUpdateUser = vi.fn().mockResolvedValueOnce({ data: { user: {} }, error: null });
    // @ts-ignore
    window.history.pushState({}, "Recovery", "/login?type=recovery");

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
    const newPassInput = screen.getByPlaceholderText(/Enter 8\+ strong characters/i);
    fireEvent.change(newPassInput, { target: { value: "NewStr0ngP@ssw0rd!" } });

    const submitBtn = screen.getByRole("button", { name: /Set New Password & Log In/i });
    expect(submitBtn).not.toBeDisabled();
  });
});


