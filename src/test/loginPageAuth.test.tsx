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

    expect(screen.getByText(/Green Enlightenment/i)).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Log In/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Sign Up/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/you@gmail\.com/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/••••••••/i)).toBeInTheDocument();
  });

  it("switches to Sign Up tab and renders registration form with persona options", async () => {
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

  it("attempts email sign-in with valid credentials and invokes Supabase auth", async () => {
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

    const emailInput = screen.getByPlaceholderText(/you@gmail\.com/i);
    const passwordInput = screen.getByPlaceholderText(/••••••••/i);

    fireEvent.change(emailInput, { target: { value: "adopter@greenenlightenment.org" } });
    fireEvent.change(passwordInput, { target: { value: "SecurePass123!" } });

    const submitBtn = screen.getByRole("button", { name: /Log In with Email/i });
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

    const emailInput = screen.getByPlaceholderText(/you@gmail\.com/i);
    const passwordInput = screen.getByPlaceholderText(/••••••••/i);

    fireEvent.change(emailInput, { target: { value: "unknown@gmail.com" } });
    fireEvent.change(passwordInput, { target: { value: "WrongPass123!" } });

    const submitBtn = screen.getByRole("button", { name: /Log In with Email/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: expect.stringContaining("Invalid Email or Password"),
          variant: "destructive",
        })
      );
    });
  });

  it("performs email signup with strong password and profile upsert", async () => {
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
    const passwordInput = screen.getByPlaceholderText(/Min 8\+ characters/i);

    fireEvent.change(nameInput, { target: { value: "Rohit Patil" } });
    fireEvent.change(emailInput, { target: { value: "rohit.patil@gmail.com" } });
    fireEvent.change(passwordInput, { target: { value: "Str0ngP@ssw0rd!" } });

    const createAccountBtn = screen.getByRole("button", { name: /Create Account with Email/i });
    expect(createAccountBtn).not.toBeDisabled();
    fireEvent.click(createAccountBtn);

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
          role: "individual",
        })
      );
    });
  });

  it("supports switching to Phone authentication and mobile login", async () => {
    mockSignInWithPassword.mockResolvedValueOnce({
      data: { user: { id: "phone-user-456" }, session: {} },
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

    const phoneBtn = screen.getByRole("button", { name: /Phone Number/i });
    fireEvent.click(phoneBtn);

    const phoneInputs = screen.getAllByPlaceholderText(/9876543210/i);
    const phoneInput = phoneInputs[0];
    const passwordInput = screen.getByPlaceholderText(/••••••••/i);

    // Use a valid 10-digit mobile number not in the test blacklist
    fireEvent.change(phoneInput, { target: { value: "9820123456" } });
    fireEvent.change(passwordInput, { target: { value: "SecurePass123!" } });

    const submitBtn = screen.getByRole("button", { name: /Log In with Mobile & Password/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockSignInWithPassword).toHaveBeenCalledWith({
        email: "phone_9820123456@greenenlightenment.org",
        password: "SecurePass123!",
      });
    });
  });

  it("opens Google Connect modal and initiates Google OAuth redirect", async () => {
    mockSignInWithOAuth.mockResolvedValueOnce({ error: null });

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

    const googleBtn = screen.getByRole("button", { name: /Continue with Google/i });
    fireEvent.click(googleBtn);

    expect(screen.getByText(/Connect with Google Account/i)).toBeInTheDocument();

    const guideToggle = screen.getByRole("button", { name: /Supabase OAuth Setup Guide/i });
    fireEvent.click(guideToggle);

    const directOAuthBtn = screen.getByRole("button", { name: /Launch Supabase Google OAuth/i });
    fireEvent.click(directOAuthBtn);

    await waitFor(() => {
      expect(mockSignInWithOAuth).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: "google",
        })
      );
    });
  });
});
