import { FormEvent, useEffect, useState } from "react";
import { KeyRound, LogIn, LogOut, UserPlus } from "lucide-react";
import {
  getCurrentUser,
  login,
  logout,
  signup,
  type AuthUser,
  type UserRole,
} from "../api/authApi";
import { StatusBadge } from "../components/StatusBadge";

type AuthMode = "login" | "signup";

const emptyForm = {
  name: "",
  email: "",
  phone: "",
  password: "",
  role: "citizen" as UserRole,
  preferredLanguage: "en",
  adminInviteCode: "",
  workerId: "",
};

interface AuthPageProps {
  onAuthChange?: (user: AuthUser | null) => void;
}

export function AuthPage({ onAuthChange }: AuthPageProps) {
  const [mode, setMode] = useState<AuthMode>("login");
  const [form, setForm] = useState(emptyForm);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    getCurrentUser()
      .then((currentUser) => {
        if (isMounted) {
          setUser(currentUser);
          onAuthChange?.(currentUser);
        }
      })
      .catch(() => {
        if (isMounted) onAuthChange?.(null);
      });

    return () => {
      isMounted = false;
    };
  }, [onAuthChange]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setError("");
    setMessage("");

    try {
      const response =
        mode === "login"
          ? await login({ email: form.email, password: form.password })
          : await signup(form);

      setUser(response.user);
      onAuthChange?.(response.user);
      setMessage(`${mode === "login" ? "Login" : "Signup"} successful.`);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Authentication failed. Check backend and MongoDB connection.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function handleLogout() {
    setIsLoading(true);
    setError("");

    try {
      await logout();
      setUser(null);
      onAuthChange?.(null);
      setMessage("Logged out successfully.");
    } catch (logoutError) {
      setError(
        logoutError instanceof Error
          ? logoutError.message
          : "Logout failed. Check backend connection.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="grid gap-6">
      <section className="glass-panel shine-sweep animate-rise rounded-2xl p-6 shadow-premium sm:p-8">
        <StatusBadge tone="neutral">
          <KeyRound size={14} />
          Authentication
        </StatusBadge>
        <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-end">
          <div>
            <h1 className="text-4xl font-black leading-tight text-ink sm:text-5xl">
              Login for citizens, workers, officers, and admins.
            </h1>
            <p className="mt-4 max-w-3xl text-base font-semibold leading-7 text-muted">
              Uses JWT access tokens, secure refresh cookies, bcrypt password
              hashing, and role-based backend authorization.
            </p>
          </div>
          <div className="rounded-xl border border-line bg-white/75 p-4">
            <span className="text-xs font-black uppercase text-teal-700">
              Current session
            </span>
            <strong className="mt-2 block text-2xl font-black text-ink">
              {user ? user.name : "Not logged in"}
            </strong>
            <p className="mt-2 text-sm font-semibold text-muted">
              {user ? `${user.email} - ${user.role}` : "Create or use an account to test protected APIs."}
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <form
          className="grid gap-4 rounded-xl border border-line bg-white p-5 shadow-sm"
          onSubmit={handleSubmit}
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <span className="text-xs font-black uppercase text-blue-700">
                {mode === "login" ? "Session login" : "Account signup"}
              </span>
              <h2 className="mt-2 text-2xl font-black text-ink">
                {mode === "login" ? "Sign in" : "Create account"}
              </h2>
            </div>
            <button
              className="rounded-lg border border-line bg-slate-50 px-3 py-2 text-sm font-black text-ink transition hover:bg-white"
              type="button"
              onClick={() => {
                setMode((current) => (current === "login" ? "signup" : "login"));
                setError("");
                setMessage("");
              }}
            >
              {mode === "login" ? "Signup" : "Login"}
            </button>
          </div>

          {mode === "signup" ? (
            <div className="grid gap-3 md:grid-cols-2">
              <Field
                label="Name"
                value={form.name}
                onChange={(value) => setForm((current) => ({ ...current, name: value }))}
                placeholder="Aarav Sharma"
              />
              <Field
                label="Phone"
                value={form.phone}
                onChange={(value) => setForm((current) => ({ ...current, phone: value }))}
                placeholder="9876543210"
              />
            </div>
          ) : null}

          <Field
            label="Email"
            type="email"
            value={form.email}
            onChange={(value) => setForm((current) => ({ ...current, email: value }))}
            placeholder="user@example.com"
          />
          <Field
            label="Password"
            type="password"
            value={form.password}
            onChange={(value) => setForm((current) => ({ ...current, password: value }))}
            placeholder="Minimum 8 characters"
          />

          {mode === "signup" ? (
            <div className="grid gap-3 md:grid-cols-2">
              <label className="grid gap-2">
                <span className="text-sm font-bold text-ink">Role</span>
                <select
                  className="min-h-12 rounded-lg border border-line bg-slate-50 px-4 text-sm font-semibold text-ink outline-none transition focus:border-teal-500 focus:bg-white"
                  value={form.role}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      role: event.target.value as UserRole,
                      adminInviteCode:
                        event.target.value === "admin" ? current.adminInviteCode : "",
                      workerId:
                        event.target.value === "worker" ? current.workerId : "",
                    }))
                  }
                >
                  <option value="citizen">Citizen/User</option>
                  <option value="worker">Worker</option>
                  <option value="officer">Municipal Officer</option>
                  <option value="admin">Admin</option>
                </select>
              </label>
              <label className="grid gap-2">
                <span className="text-sm font-bold text-ink">Language</span>
                <select
                  className="min-h-12 rounded-lg border border-line bg-slate-50 px-4 text-sm font-semibold text-ink outline-none transition focus:border-teal-500 focus:bg-white"
                  value={form.preferredLanguage}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      preferredLanguage: event.target.value,
                    }))
                  }
                >
                  <option value="en">English</option>
                  <option value="hi">Hindi</option>
                  <option value="hinglish">Hinglish</option>
                </select>
              </label>
            </div>
          ) : null}

          {mode === "signup" && form.role === "admin" ? (
            <Field
              label="Admin Invite Code"
              type="password"
              value={form.adminInviteCode}
              onChange={(value) =>
                setForm((current) => ({ ...current, adminInviteCode: value }))
              }
              placeholder="Required for admin signup"
            />
          ) : null}

          {mode === "signup" && form.role === "worker" ? (
            <Field
              label="Worker ID"
              value={form.workerId}
              onChange={(value) =>
                setForm((current) => ({ ...current, workerId: value.toLowerCase() }))
              }
              placeholder="worker@123"
            />
          ) : null}

          <button
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-teal-700 to-blue-600 px-5 text-sm font-black text-white shadow-lg shadow-blue-100 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
            type="submit"
            disabled={isLoading}
          >
            {mode === "login" ? <LogIn size={18} /> : <UserPlus size={18} />}
            {isLoading ? "Working..." : mode === "login" ? "Login" : "Create account"}
          </button>

          {message ? (
            <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
              {message}
            </p>
          ) : null}
          {error ? (
            <p className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800">
              {error}
            </p>
          ) : null}
        </form>

        {user ? (
          <aside className="grid content-start gap-4">
            <button
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-line bg-white px-5 text-sm font-black text-ink shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              type="button"
              onClick={handleLogout}
              disabled={isLoading}
            >
              <LogOut size={18} />
              Logout
            </button>
          </aside>
        ) : null}
      </section>
    </div>
  );
}

interface FieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: string;
}

function Field({ label, value, onChange, placeholder, type = "text" }: FieldProps) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-bold text-ink">{label}</span>
      <input
        className="min-h-12 rounded-lg border border-line bg-slate-50 px-4 text-sm font-semibold text-ink outline-none transition focus:border-teal-500 focus:bg-white"
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
      />
    </label>
  );
}
