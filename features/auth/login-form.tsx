"use client";

import { useEffect, useState } from "react";
import { Eye, EyeOff, LockKeyhole, UserRound } from "lucide-react";
import { motion } from "framer-motion";

import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { FormError } from "@/components/ui/form-error";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type LoginFormProps = {
  callbackUrl: string;
  error?: string;
};

export function LoginForm({ callbackUrl, error = "" }: LoginFormProps) {
  const [csrfToken, setCsrfToken] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadCsrfToken() {
      const response = await fetch("/api/auth/csrf", {
        cache: "no-store",
      });
      const data = (await response.json()) as { csrfToken?: string };

      if (active) {
        setCsrfToken(data.csrfToken ?? "");
      }
    }

    void loadCsrfToken();

    return () => {
      active = false;
    };
  }, []);

  const message =
    error === "CredentialsSignin" ? "CPF ou senha inválidos." : error ? "Não foi possível iniciar a sessão." : "";

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
      className="w-full max-w-[30rem]"
    >
      <Card className="rounded-[2.1rem] border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(246,244,239,0.95))] p-7 backdrop-blur md:p-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground">Acesso institucional</p>
            <CardTitle className="mt-3 text-[2rem]">Entrar no sistema</CardTitle>
            <CardDescription className="mt-2 leading-6">
              Informe suas credenciais para acessar o ambiente interno de remanejamento.
            </CardDescription>
          </div>
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white">
            <LockKeyhole className="h-5 w-5" />
          </span>
        </div>

        <form action="/api/auth/callback/credentials" className="mt-8 space-y-5" method="post">
          <input name="csrfToken" type="hidden" value={csrfToken} />
          <input name="callbackUrl" type="hidden" value={callbackUrl} />

          <div>
            <Label htmlFor="cpf">CPF</Label>
            <div className="relative mt-2">
              <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-10" id="cpf" name="cpf" placeholder="00000000000" required />
            </div>
          </div>
          <div>
            <Label htmlFor="password">Senha</Label>
            <div className="relative mt-2">
              <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-10 pr-11"
                id="password"
                name="password"
                placeholder="Sua senha"
                required
                type={showPassword ? "text" : "password"}
              />
              <button
                aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition hover:text-slate-900"
                type="button"
                onClick={() => setShowPassword((current) => !current)}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-[linear-gradient(180deg,rgba(248,250,252,0.9),rgba(243,244,246,0.92))] px-4 py-3 text-sm leading-6 text-slate-700">
            Utilize seu CPF institucional e mantenha o acesso restrito ao perfil autorizado.
          </div>
          <FormError message={message} />
          <Button className="h-11 w-full text-sm" disabled={!csrfToken} type="submit">
            {csrfToken ? "Acessar sistema" : "Preparando acesso..."}
          </Button>
        </form>
      </Card>
    </motion.div>
  );
}
