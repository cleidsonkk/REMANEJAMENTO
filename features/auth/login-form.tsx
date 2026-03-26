"use client";

import { useActionState } from "react";
import { LockKeyhole, UserRound } from "lucide-react";
import { motion } from "framer-motion";
import { useFormStatus } from "react-dom";

import { loginActionState } from "@/app/actions/auth-actions";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { FormError } from "@/components/ui/form-error";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button className="h-11 w-full text-sm" disabled={pending} type="submit">
      {pending ? "Entrando..." : "Acessar sistema"}
    </Button>
  );
}

const initialState = {
  error: "",
};

export function LoginForm() {
  const [state, formAction] = useActionState(loginActionState as never, initialState);

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
      className="w-full max-w-[30rem]"
    >
      <Card className="rounded-[2.1rem] border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(246,244,239,0.92))] p-7 backdrop-blur md:p-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground">Acesso institucional</p>
            <CardTitle className="mt-3 text-[2rem] tracking-[-0.04em]">Entrar no ambiente interno</CardTitle>
            <CardDescription className="mt-2 leading-6">
              Entre com CPF e senha para acessar o ambiente interno de remanejamento.
            </CardDescription>
          </div>
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white">
            <LockKeyhole className="h-5 w-5" />
          </span>
        </div>

        <form action={formAction} className="mt-8 space-y-5">
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
              <Input className="pl-10" id="password" name="password" placeholder="Sua senha" required type="password" />
            </div>
          </div>
          <div className="rounded-2xl border border-amber-200/80 bg-[linear-gradient(180deg,rgba(254,249,195,0.82),rgba(255,251,235,0.88))] px-4 py-3 text-sm leading-6 text-amber-950">
            Use seu CPF institucional e mantenha o acesso restrito ao perfil autorizado.
          </div>
          <FormError message={state?.error} />
          <SubmitButton />
        </form>
      </Card>
    </motion.div>
  );
}
