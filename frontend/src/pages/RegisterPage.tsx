import { useState, type FormEvent as ReactFormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/auth-hook";
import { register } from "@/api/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShieldCheck } from "lucide-react";

const ERROR_KEY_MAP: Record<string, string> = {
  "Invalid credentials": "errors.invalidCredentials",
  "Email already registered": "errors.emailRegistered",
  "Invalid refresh token": "errors.invalidRefreshToken",
  "User not found": "errors.userNotFound",
  "Subscription not found": "errors.subscriptionNotFound",
};

export default function RegisterPage() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const { setTokens } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: ReactFormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError(t("auth.passwordMismatch"));
      return;
    }
    if (password.length < 8) {
      setError(t("auth.passwordTooShort"));
      return;
    }

    try {
      const tokens = await register(email, password);
      setTokens(tokens.access_token, tokens.refresh_token);
      navigate("/");
    } catch (err: unknown) {
      const detail =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail ?? "Registration failed";
      const key = ERROR_KEY_MAP[detail];
      setError(key ? t(key) : t("auth.registrationFailed"));
    }
  };

  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
      {/* Brand panel — same as Login, mirrored identity. */}
      <aside className="relative hidden flex-col justify-between bg-primary p-10 text-primary-foreground lg:flex">
        <div className="flex items-center gap-2">
          <ShieldCheck className="size-6 text-pending" aria-hidden="true" />
          <span className="font-heading text-lg font-semibold">
            {t("layout.appName")}
          </span>
        </div>
        <div className="max-w-sm">
          <h2 className="font-heading text-3xl font-bold leading-tight tracking-[-0.01em]">
            {t("auth.brandHeadline")}
          </h2>
          <p className="mt-3 text-sm text-primary-foreground/70">
            {t("auth.brandBody")}
          </p>
        </div>
        <p className="text-xs text-primary-foreground/50">
          {t("auth.brandFooter")}
        </p>
      </aside>

      {/* Form panel */}
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <h1 className="font-heading text-2xl font-bold leading-tight tracking-[-0.01em]">
            {t("auth.createAccount")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("auth.createAccountSubtitle")}
          </p>
          <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">{t("auth.email")}</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="password">{t("auth.password")}</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="confirm-password">{t("auth.confirmPassword")}</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit">{t("auth.createAccountButton")}</Button>
            <p className="text-center text-sm text-muted-foreground">
              {t("auth.hasAccount")}{" "}
              <Link to="/login" className="text-pending underline underline-offset-4">
                {t("auth.signInButton")}
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}