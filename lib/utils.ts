import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number | string) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value));
}

export function formatCpf(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
}

export function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

export function buildProtocol(date = new Date()) {
  const stamp = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("");
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `REM-${stamp}-${random}`;
}

export function parseBrazilianCurrencyInput(value: string | number) {
  if (typeof value === "number") {
    return value;
  }

  const raw = value.trim().replace(/\s+/g, "");
  if (!raw) {
    return Number.NaN;
  }

  const hasComma = raw.includes(",");
  const hasDot = raw.includes(".");

  if (hasComma) {
    const normalized = raw.replace(/\./g, "").replace(",", ".");
    return Number(normalized);
  }

  if (hasDot) {
    const parts = raw.split(".");
    const looksLikeThousands = parts.length > 1 && parts.slice(1).every((part) => part.length === 3);
    const looksLikeMixedBrazilian = parts.length > 2 && parts[parts.length - 1].length <= 2;

    if (looksLikeThousands) {
      return Number(parts.join(""));
    }

    if (looksLikeMixedBrazilian) {
      const decimalPart = parts.pop() ?? "";
      const integerPart = parts.join("");
      return Number(`${integerPart}.${decimalPart}`);
    }

    return Number(raw);
  }

  return Number(raw);
}

export function formatGovernmentCode(value: string | number) {
  return String(value).replace(/\D/g, "").padStart(5, "0");
}

export function formatSequentialCode(value: string | number) {
  return String(value).replace(/\D/g, "").padStart(3, "0");
}

export function getAppBaseUrl() {
  const rawUrl = process.env.NEXTAUTH_URL ?? process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;

  if (!rawUrl) {
    return "http://localhost:3000";
  }

  return rawUrl.startsWith("http") ? rawUrl : `https://${rawUrl}`;
}

export function getPasswordPolicyMessage() {
  return "A senha deve ter pelo menos 6 caracteres, com letras maiúsculas, minúsculas e números. Caracteres especiais também são aceitos.";
}
