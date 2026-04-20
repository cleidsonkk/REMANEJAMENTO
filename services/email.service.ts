import nodemailer from "nodemailer";

import { logInfo, logWarn, reportServerError } from "@/lib/observability";
import { getAppBaseUrl } from "@/lib/utils";
import { getEmailDeliveryConfig } from "@/services/operational-readiness.service";

type Recipient = {
  email: string;
  name?: string | null;
};

type EmailSection = {
  label: string;
  value: string;
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatTimestamp(value: Date) {
  return value.toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
  });
}

function buildEmailHtml(args: {
  greeting: string;
  title: string;
  lead: string;
  sections: EmailSection[];
  ctaLabel: string;
  ctaUrl: string;
  footer: string;
}) {
  const sections = args.sections
    .map(
      (item) =>
        `<tr><td style="padding:10px 0;border-bottom:1px solid #e2e8f0;font:600 13px/1.5 Arial,sans-serif;color:#475569;vertical-align:top;">${escapeHtml(item.label)}</td><td style="padding:10px 0;border-bottom:1px solid #e2e8f0;font:400 14px/1.6 Arial,sans-serif;color:#0f172a;vertical-align:top;">${escapeHtml(item.value)}</td></tr>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="pt-BR">
  <body style="margin:0;padding:24px;background:#f4f1ea;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:680px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:24px;overflow:hidden;">
      <tr>
        <td style="padding:28px 32px;background:linear-gradient(135deg,#0f766e,#134e4a);color:#ffffff;">
          <div style="font:700 12px/1.4 Arial,sans-serif;letter-spacing:0.18em;text-transform:uppercase;opacity:0.82;">Prefeitura de Umbauba</div>
          <div style="margin-top:10px;font:700 28px/1.1 Arial,sans-serif;">Remanejamento Orcamentario</div>
          <div style="margin-top:8px;font:400 14px/1.6 Arial,sans-serif;opacity:0.92;">Notificacao institucional automatizada</div>
        </td>
      </tr>
      <tr>
        <td style="padding:28px 32px 18px;">
          <p style="margin:0;font:400 15px/1.7 Arial,sans-serif;color:#334155;">${escapeHtml(args.greeting)}</p>
          <h1 style="margin:14px 0 0;font:700 26px/1.2 Arial,sans-serif;color:#0f172a;">${escapeHtml(args.title)}</h1>
          <p style="margin:12px 0 0;font:400 15px/1.8 Arial,sans-serif;color:#475569;">${escapeHtml(args.lead)}</p>
        </td>
      </tr>
      <tr>
        <td style="padding:0 32px 12px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
            ${sections}
          </table>
        </td>
      </tr>
      <tr>
        <td style="padding:10px 32px 12px;">
          <a href="${escapeHtml(args.ctaUrl)}" style="display:inline-block;padding:14px 22px;border-radius:999px;background:#0f172a;color:#ffffff;text-decoration:none;font:700 13px/1 Arial,sans-serif;letter-spacing:0.04em;">
            ${escapeHtml(args.ctaLabel)}
          </a>
        </td>
      </tr>
      <tr>
        <td style="padding:0 32px 30px;">
          <p style="margin:14px 0 0;font:400 13px/1.8 Arial,sans-serif;color:#64748b;">
            ${escapeHtml(args.footer)}
          </p>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function buildEmailText(args: {
  greeting: string;
  title: string;
  lead: string;
  sections: EmailSection[];
  ctaLabel: string;
  ctaUrl: string;
  footer: string;
}) {
  const lines = [
    "Prefeitura de Umbauba",
    "Remanejamento Orcamentario",
    "",
    args.greeting,
    args.title,
    "",
    args.lead,
    "",
    ...args.sections.map((item) => `${item.label}: ${item.value}`),
    "",
    `${args.ctaLabel}: ${args.ctaUrl}`,
    "",
    args.footer,
  ];

  return lines.join("\n");
}

function dedupeRecipients(recipients: Recipient[]) {
  const seen = new Set<string>();

  return recipients.filter((recipient) => {
    const normalizedEmail = recipient.email.trim().toLowerCase();
    if (!normalizedEmail || seen.has(normalizedEmail)) {
      return false;
    }

    seen.add(normalizedEmail);
    return true;
  });
}

async function sendMailBatch(args: {
  event: string;
  recipients: Recipient[];
  subject: string;
  greetingBuilder: (recipient: Recipient) => string;
  title: string;
  lead: string;
  sections: EmailSection[];
  ctaLabel: string;
  ctaUrl: string;
  footer: string;
}) {
  const config = getEmailDeliveryConfig();
  const recipients = dedupeRecipients(args.recipients);

  if (!recipients.length) {
    logInfo(`${args.event}.skip`, {
      reason: "no_recipients",
    });
    return;
  }

  if (!config.enabled || !config.host || !config.port || !config.fromAddress) {
    logWarn(`${args.event}.skip`, {
      reason: "email_disabled",
      detail: config.detail,
      recipients: recipients.length,
    });
    return;
  }

  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: config.user && config.password ? { user: config.user, pass: config.password } : undefined,
  });

  const settled = await Promise.allSettled(
    recipients.map((recipient) => {
      const greeting = args.greetingBuilder(recipient);

      return transporter.sendMail({
        from: `"${config.fromName}" <${config.fromAddress}>`,
        to: recipient.email.trim().toLowerCase(),
        replyTo: config.replyTo ?? undefined,
        subject: args.subject,
        text: buildEmailText({
          greeting,
          title: args.title,
          lead: args.lead,
          sections: args.sections,
          ctaLabel: args.ctaLabel,
          ctaUrl: args.ctaUrl,
          footer: args.footer,
        }),
        html: buildEmailHtml({
          greeting,
          title: args.title,
          lead: args.lead,
          sections: args.sections,
          ctaLabel: args.ctaLabel,
          ctaUrl: args.ctaUrl,
          footer: args.footer,
        }),
      });
    }),
  );

  transporter.close();

  const delivered = settled.filter((item) => item.status === "fulfilled").length;
  const failed = settled.length - delivered;

  logInfo(`${args.event}.done`, {
    delivered,
    failed,
    provider: config.provider,
  });

  settled.forEach((result, index) => {
    if (result.status === "rejected") {
      reportServerError(`${args.event}.failed`, result.reason, {
        recipient: recipients[index]?.email,
        provider: config.provider,
      });
    }
  });
}

export async function sendCreatedBatchEmailToAdmins(args: {
  recipients: Recipient[];
  loteProtocolo: string;
  secretariaNome: string;
  solicitanteNome: string;
  totalItens: number;
  createdAt?: Date;
}) {
  const ctaUrl = `${getAppBaseUrl()}/dashboard/remanejamentos?q=${encodeURIComponent(args.loteProtocolo)}`;
  const createdAt = args.createdAt ?? new Date();

  await sendMailBatch({
    event: "email.remanejamento_created",
    recipients: args.recipients,
    subject: `Nova solicitacao de remanejamento - ${args.loteProtocolo}`,
    greetingBuilder: (recipient) =>
      recipient.name ? `Ola, ${recipient.name}.` : "Ola, equipe de planejamento.",
    title: "Nova solicitacao aguardando conferencia",
    lead: `${args.solicitanteNome} enviou um novo lote para avaliacao administrativa.`,
    sections: [
      { label: "Protocolo do lote", value: args.loteProtocolo },
      { label: "Secretaria solicitante", value: args.secretariaNome },
      { label: "Solicitante", value: args.solicitanteNome },
      { label: "Itens no lote", value: String(args.totalItens) },
      { label: "Registrado em", value: formatTimestamp(createdAt) },
    ],
    ctaLabel: "Abrir lote no painel",
    ctaUrl,
    footer: "Mensagem automatica do sistema institucional de remanejamento. Em caso de divergencia, registre a analise diretamente no painel.",
  });
}

export async function sendExecutedBatchEmailToRequester(args: {
  recipient: Recipient | null;
  loteProtocolo: string;
  secretariaNome: string;
  totalItens: number;
  executorName: string;
  executedAt?: Date;
}) {
  if (!args.recipient?.email) {
    logWarn("email.remanejamento_executed.skip", {
      reason: "missing_requester_email",
      loteProtocolo: args.loteProtocolo,
    });
    return;
  }

  const ctaUrl = `${getAppBaseUrl()}/dashboard/remanejamentos?q=${encodeURIComponent(args.loteProtocolo)}`;
  const executedAt = args.executedAt ?? new Date();

  await sendMailBatch({
    event: "email.remanejamento_executed",
    recipients: [args.recipient],
    subject: `Solicitacao confirmada - ${args.loteProtocolo}`,
    greetingBuilder: (recipient) => (recipient.name ? `Ola, ${recipient.name}.` : "Ola."),
    title: "Solicitacao confirmada no sistema",
    lead: `${args.executorName} confirmou a execucao do lote enviado pela ${args.secretariaNome}.`,
    sections: [
      { label: "Protocolo do lote", value: args.loteProtocolo },
      { label: "Secretaria", value: args.secretariaNome },
      { label: "Itens confirmados", value: String(args.totalItens) },
      { label: "Responsavel pela confirmacao", value: args.executorName },
      { label: "Confirmado em", value: formatTimestamp(executedAt) },
    ],
    ctaLabel: "Consultar historico",
    ctaUrl,
    footer: "Mensagem automatica do sistema institucional de remanejamento. Guarde este aviso como referencia operacional.",
  });
}
