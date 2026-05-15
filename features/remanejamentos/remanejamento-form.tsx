"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, Landmark, Plus, ReceiptText, Save, Trash2 } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray, useForm } from "react-hook-form";

import { createRemanejamentoAction } from "@/app/actions/remanejamento-actions";
import { SectionNote } from "@/components/shared/section-note";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { FormError } from "@/components/ui/form-error";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  buildRemanejamentoDraftKey,
  createEmptyRemanejamentoEntry,
  parseRemanejamentoDraft,
  serializeRemanejamentoDraft,
} from "@/features/remanejamentos/remanejamento-draft";
import { formatCurrency, formatGovernmentCode, parseBrazilianCurrencyInput } from "@/lib/utils";
import {
  remanejamentoSchema,
  type RemanejamentoSchema,
} from "@/lib/validations/remanejamento";

type CatalogItem = {
  id: string;
  acao: string;
  fonte: string;
  elemento: string;
};

type SecretariaOperacional = {
  id: string;
  nomeSecretaria: string;
  unidadeOrcamentaria: string;
  nomeSecretario: string;
  isDefault: boolean;
  catalog: CatalogItem[];
};

type CorrectionPreset = {
  sourceId: string;
  loteProtocolo: string;
  secretariaId: string;
  justificativa: string;
  reason: string;
  entries: Array<{
    destinoAcao: string;
    destinoFonte: string;
    destinoElemento: string;
    destinoValor: string;
    origemAcao: string;
    origemFonte: string;
    origemElemento: string;
    origemValor: string;
  }>;
};

function uniqueValues(items: CatalogItem[], field: keyof CatalogItem) {
  return Array.from(new Set(items.map((item) => String(item[field]).trim()).filter(Boolean)));
}

function formatCurrencyTypingValue(value: string) {
  const digitsAndComma = value.replace(/[^\d,]/g, "");
  const hadComma = digitsAndComma.includes(",");
  const [integerRaw = "", decimalRaw = ""] = digitsAndComma.split(",");
  const integerDigits = integerRaw.replace(/\D/g, "");
  const decimalDigits = decimalRaw.replace(/\D/g, "").slice(0, 2);

  const formattedInteger = integerDigits ? integerDigits.replace(/\B(?=(\d{3})+(?!\d))/g, ".") : "";

  if (hadComma) {
    return `${formattedInteger || "0"},${decimalDigits}`;
  }

  return formattedInteger;
}

function SuggestionField({
  name,
  label,
  placeholder,
  error,
  register,
  suggestions,
}: {
  name: `entries.${number}.${"destinoAcao" | "destinoFonte" | "destinoElemento" | "origemAcao" | "origemFonte" | "origemElemento"}`;
  label: string;
  placeholder: string;
  error?: string;
  register: ReturnType<typeof useForm<RemanejamentoSchema>>["register"];
  suggestions: string[];
}) {
  const listId = `${name.replace(/\./g, "-")}-suggestions`;
  const inputId = `${name.replace(/\./g, "-")}-input`;

  return (
    <div>
      <Label htmlFor={inputId}>{label}</Label>
      <Input id={inputId} list={listId} placeholder={placeholder} type="text" {...register(name)} />
      <datalist id={listId}>
        {suggestions.map((value) => (
          <option key={value} value={value} />
        ))}
      </datalist>
      <p className="mt-2 text-xs leading-5 text-slate-600">
        {suggestions.length
          ? "Você pode selecionar uma sugestão do catálogo ou digitar manualmente."
          : "Nenhuma sugestão disponível para esta unidade. Digite manualmente."}
      </p>
      <FormError message={error} />
    </div>
  );
}

export function RemanejamentoForm({
  draftScopeKey,
  secretarias,
  correctionPreset,
}: {
  draftScopeKey: string;
  secretarias: SecretariaOperacional[];
  correctionPreset?: CorrectionPreset | null;
}) {
  const router = useRouter();
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [draftLoaded, setDraftLoaded] = useState(false);

  const defaultSecretariaId = secretarias.find((item) => item.isDefault)?.id ?? secretarias[0]?.id ?? "";
  const draftKey = useMemo(() => buildRemanejamentoDraftKey(draftScopeKey), [draftScopeKey]);
  const validSecretariaIds = useMemo(() => secretarias.map((item) => item.id), [secretarias]);

  const {
    register,
    control,
    formState: { errors, isSubmitting },
    handleSubmit,
    watch,
    reset,
    setValue,
  } = useForm<RemanejamentoSchema>({
    resolver: zodResolver(remanejamentoSchema),
    defaultValues: {
      secretariaId: defaultSecretariaId,
      justificativa: "",
      entries: [createEmptyRemanejamentoEntry()],
    },
    mode: "onChange",
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "entries",
  });

  const values = watch();
  const deferredValues = useDeferredValue(values);
  const selectedSecretaria =
    secretarias.find((item) => item.id === values.secretariaId) ??
    secretarias.find((item) => item.id === defaultSecretariaId) ??
    null;
  const catalog = selectedSecretaria?.catalog ?? [];

  useEffect(() => {
    localStorage.removeItem("remanejamento-draft-v3");

    if (correctionPreset) {
      reset({
        secretariaId: correctionPreset.secretariaId,
        justificativa: correctionPreset.justificativa,
        entries: (correctionPreset.entries.length ? correctionPreset.entries : [createEmptyRemanejamentoEntry()]) as never,
      });
      setDraftLoaded(true);
      return;
    }

    const raw = localStorage.getItem(draftKey);
    if (!raw) {
      setDraftLoaded(true);
      return;
    }

    const parsed = parseRemanejamentoDraft(raw, {
      fallbackSecretariaId: defaultSecretariaId,
      validSecretariaIds,
    });

    if (!parsed) {
      localStorage.removeItem(draftKey);
      setDraftLoaded(true);
      return;
    }

    reset({
      secretariaId: parsed.secretariaId ?? defaultSecretariaId,
      justificativa: parsed.justificativa ?? "",
      entries: parsed.entries?.length ? parsed.entries : [createEmptyRemanejamentoEntry()],
    });
    setDraftLoaded(true);
  }, [correctionPreset, defaultSecretariaId, draftKey, reset, validSecretariaIds]);

  useEffect(() => {
    if (!draftLoaded) {
      return;
    }

    localStorage.setItem(draftKey, serializeRemanejamentoDraft(deferredValues));
  }, [deferredValues, draftKey, draftLoaded]);

  const acaoSuggestions = useMemo(() => uniqueValues(catalog, "acao"), [catalog]);
  const fonteSuggestions = useMemo(() => uniqueValues(catalog, "fonte"), [catalog]);
  const elementoSuggestions = useMemo(() => uniqueValues(catalog, "elemento"), [catalog]);

  const itemStats =
    values.entries?.map((entry) => {
      const destinationComplete = !!(
        entry?.destinoAcao &&
        entry?.destinoFonte &&
        entry?.destinoElemento &&
        entry?.destinoValor
      );
      const originComplete = !!(entry?.origemAcao && entry?.origemFonte && entry?.origemElemento && entry?.origemValor);
      const parsedValue = parseBrazilianCurrencyInput(String(entry?.destinoValor ?? ""));
      const valuesMatch =
        entry?.destinoValor &&
        entry?.origemValor &&
        String(entry.destinoValor).trim() !== "" &&
        String(entry.origemValor).trim() !== "" &&
        parseBrazilianCurrencyInput(String(entry.destinoValor)) === parseBrazilianCurrencyInput(String(entry.origemValor));

      return {
        destinationComplete,
        originComplete,
        valuesMatch,
        parsedValue,
      };
    }) ?? [];

  const completedItems = itemStats.filter((item) => item.destinationComplete && item.originComplete && item.valuesMatch).length;
  const totalLote = itemStats.reduce((sum, item) => sum + (Number.isFinite(item.parsedValue) ? item.parsedValue : 0), 0);

  const handleCurrencyChange = (index: number, field: "destinoValor" | "origemValor", rawValue: string) => {
    setValue(`entries.${index}.${field}`, formatCurrencyTypingValue(rawValue) as never, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
  };

  const onSubmit = handleSubmit(async (data) => {
    const form = new FormData();
    form.append("secretariaId", data.secretariaId);
    form.append("justificativa", data.justificativa);
    form.append("entriesJson", JSON.stringify(data.entries));
    if (correctionPreset) {
      form.append("correctionSourceId", correctionPreset.sourceId);
      form.append("correctionSourceLoteProtocolo", correctionPreset.loteProtocolo);
    }

    const result = await createRemanejamentoAction(form);
    if (result?.error) {
      setFeedback({ type: "error", message: result.error });
      return;
    }

    localStorage.removeItem(draftKey);
    reset({
      secretariaId: defaultSecretariaId,
      justificativa: "",
      entries: [createEmptyRemanejamentoEntry()],
    });
    setFeedback({
      type: "success",
      message: correctionPreset
        ? `Correcao reenviada no lote ${result?.protocolo ?? ""} com ${result?.totalItens ?? 0} ${
            result?.totalItens === 1 ? "item" : "itens"
          } e encaminhada para conferencia do administrador.`
        : `Lote ${result?.protocolo ?? ""} registrado com ${result?.totalItens ?? 0} ${
            result?.totalItens === 1 ? "item" : "itens"
          } e enviado para conferencia do administrador.`,
    });
    router.refresh();
  });

  if (!secretarias.length) {
    return (
      <Card className="overflow-hidden border-white/70 bg-white/92">
        <div className="rounded-[1.75rem] border border-amber-200 bg-amber-50 p-6 text-amber-950">
          <CardTitle className="text-2xl">Vínculo institucional pendente</CardTitle>
          <CardDescription className="mt-2 max-w-3xl text-amber-900/80">
            Seu usuário não possui secretaria ativa autorizada para operar remanejamentos. Solicite ao Planejamento a vinculação
            institucional correta.
          </CardDescription>
        </div>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden border-white/70 bg-white/92">
      <div className="rounded-[1.75rem] border border-slate-900/10 bg-[linear-gradient(135deg,rgba(15,23,42,0.98),rgba(15,118,110,0.92)_58%,rgba(194,120,3,0.82))] p-6 text-white">
        <CardTitle className="text-2xl">Nova solicitação em lote</CardTitle>
        <CardDescription className="mt-2 max-w-3xl text-white/80">
          Escolha a secretaria que está operando no momento, carregue o catálogo correto da unidade orçamentária vinculada e monte um ou vários remanejamentos no mesmo envio.
        </CardDescription>

        <div className="mt-6 space-y-4">
          <div className="rounded-2xl border border-white/12 bg-white/10 p-4 backdrop-blur">
            <Label className="text-white" htmlFor="secretariaId">
              Secretaria em operação nesta solicitação
            </Label>
            <Select
              className="mt-3 border-white/15 bg-slate-950/30 text-white"
              id="secretariaId"
              options={secretarias.map((item) => ({
                value: item.id,
                label: `${item.nomeSecretaria} • ${formatGovernmentCode(item.unidadeOrcamentaria)}`,
              }))}
              {...register("secretariaId")}
            />
            <FormError message={errors.secretariaId?.message} />
            <p className="mt-2 text-xs leading-5 text-white/70">
              Toda auditoria e todo o catálogo desta solicitação serão gravados com base na secretaria selecionada.
            </p>
          </div>

          {selectedSecretaria ? (
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-white/12 bg-white/10 p-4 backdrop-blur">
                <Landmark className="h-5 w-5 text-amber-200" />
                <p className="mt-3 text-xs uppercase tracking-[0.22em] text-white/65">Secretaria</p>
                <p className="mt-2 font-medium">{selectedSecretaria.nomeSecretaria}</p>
              </div>
              <div className="rounded-2xl border border-white/12 bg-white/10 p-4 backdrop-blur">
                <ReceiptText className="h-5 w-5 text-amber-200" />
                <p className="mt-3 text-xs uppercase tracking-[0.22em] text-white/65">Unidade orçamentária</p>
                <p className="mt-2 font-medium">{formatGovernmentCode(selectedSecretaria.unidadeOrcamentaria)}</p>
              </div>
              <div className="rounded-2xl border border-white/12 bg-white/10 p-4 backdrop-blur">
                <CalendarDays className="h-5 w-5 text-amber-200" />
                <p className="mt-3 text-xs uppercase tracking-[0.22em] text-white/65">Catálogo disponível</p>
                <p className="mt-2 font-medium">
                  {catalog.length ? `${catalog.length} combinações carregadas` : "Sem combinações cadastradas"}
                </p>
                <p className="mt-1 text-sm text-white/70">{selectedSecretaria.nomeSecretario}</p>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-[0.82fr,1.18fr]">
        <div className="space-y-4">
          <div className="rounded-[1.5rem] border bg-muted/35 p-4">
            <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Painel do lote</p>
            <div className="mt-4 grid gap-3">
              <div className="flex items-center justify-between rounded-2xl border bg-white px-4 py-3 text-sm">
                <span>Itens no lote</span>
                <span className="font-semibold text-slate-900">{fields.length}</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl border bg-white px-4 py-3 text-sm">
                <span>Itens prontos para envio</span>
                <span className="font-semibold text-emerald-700">{completedItems}</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl border bg-white px-4 py-3 text-sm">
                <span>Volume do lote</span>
                <span className="font-semibold text-slate-900">{formatCurrency(totalLote)}</span>
              </div>
            </div>
          </div>

          <div className="rounded-[1.5rem] border bg-muted/35 p-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Save className="h-4 w-4 text-primary" />
              Rascunho automático protegido
            </div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              O formulário preserva o lote apenas neste usuário, com chave segregada e expiração automática de segurança.
            </p>
          </div>

          {correctionPreset ? (
            <div className="rounded-[1.5rem] border border-amber-200 bg-amber-50/80 p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-amber-900/70">Correcao solicitada</p>
              <p className="mt-2 text-sm font-semibold text-amber-950">Lote original {correctionPreset.loteProtocolo}</p>
              <p className="mt-3 text-sm leading-6 text-amber-900/85">{correctionPreset.reason}</p>
            </div>
          ) : null}

          <SectionNote>
            O sistema usa o catálogo da secretaria selecionada para sugerir ação, fonte e elemento. Se necessário, o operador
            também pode digitar manualmente os campos orçamentários.
          </SectionNote>
        </div>

        <form className="space-y-6" onSubmit={onSubmit}>
          {correctionPreset ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
              Revise os dados abaixo e reenvie a correcao como um novo lote. O historico anterior sera preservado.
            </div>
          ) : null}

          {feedback ? (
            <div
              className={`rounded-2xl border px-4 py-3 text-sm ${
                feedback.type === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                  : "border-rose-200 bg-rose-50 text-rose-900"
              }`}
            >
              {feedback.message}
            </div>
          ) : null}

          <div>
            <Label htmlFor="justificativa">1. Justificativa institucional do lote</Label>
            <Textarea
              id="justificativa"
              placeholder="Descreva o contexto técnico que fundamenta os remanejamentos deste lote."
              {...register("justificativa")}
            />
            <FormError message={errors.justificativa?.message} />
          </div>

          <div className="space-y-4">
            {fields.map((field, index) => {
              const itemErrors = errors.entries?.[index];

              return (
                <div key={field.id} className="rounded-[1.75rem] border bg-muted/20 p-4 shadow-sm">
                  <div className="flex flex-col gap-3 border-b pb-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Item do lote</p>
                      <h4 className="mt-2 text-lg font-semibold text-slate-950">{`Remanejamento ${String(index + 1).padStart(2, "0")}`}</h4>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        className="gap-2"
                        onClick={() => append(createEmptyRemanejamentoEntry())}
                        type="button"
                        variant="outline"
                      >
                        <Plus className="h-4 w-4" />
                        Adicionar item
                      </Button>
                      <Button disabled={fields.length === 1} onClick={() => remove(index)} type="button" variant="outline">
                        <Trash2 className="mr-2 h-4 w-4" />
                        Remover
                      </Button>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-6 xl:grid-cols-2">
                    <div className="rounded-[1.75rem] border border-emerald-200/70 bg-emerald-50/55 p-5">
                      <h5 className="text-lg font-semibold text-emerald-950">Destino / Adição</h5>
                      <p className="mt-1 text-sm leading-6 text-emerald-900/80">Dotação que receberá o valor do item {index + 1}.</p>
                      <div className="mt-5 space-y-4">
                        <SuggestionField
                          error={itemErrors?.destinoAcao?.message}
                          label="Ação"
                          name={`entries.${index}.destinoAcao`}
                          placeholder="Selecione uma sugestão ou digite"
                          register={register}
                          suggestions={acaoSuggestions}
                        />
                        <SuggestionField
                          error={itemErrors?.destinoFonte?.message}
                          label="Fonte"
                          name={`entries.${index}.destinoFonte`}
                          placeholder="Selecione uma sugestão ou digite"
                          register={register}
                          suggestions={fonteSuggestions}
                        />
                        <SuggestionField
                          error={itemErrors?.destinoElemento?.message}
                          label="Elemento"
                          name={`entries.${index}.destinoElemento`}
                          placeholder="Selecione uma sugestão ou digite"
                          register={register}
                          suggestions={elementoSuggestions}
                        />
                        <div>
                          <Label htmlFor={`entries-${index}-destinoValor`}>Valor</Label>
                          <Input
                            id={`entries-${index}-destinoValor`}
                            inputMode="decimal"
                            placeholder="Ex.: 15.000,00"
                            type="text"
                            value={String(values.entries?.[index]?.destinoValor ?? "")}
                            onChange={(event) => handleCurrencyChange(index, "destinoValor", event.target.value)}
                          />
                          <p className="mt-2 text-xs leading-5 text-emerald-950/75">
                            O campo organiza ponto e vírgula automaticamente no padrão brasileiro.
                          </p>
                          <FormError message={itemErrors?.destinoValor?.message} />
                        </div>
                      </div>
                    </div>

                    <div className="rounded-[1.75rem] border border-amber-200/70 bg-amber-50/55 p-5">
                      <h5 className="text-lg font-semibold text-amber-950">Origem / Anulação</h5>
                      <p className="mt-1 text-sm leading-6 text-amber-900/80">Dotação que suportará a anulação do item {index + 1}.</p>
                      <div className="mt-5 space-y-4">
                        <SuggestionField
                          error={itemErrors?.origemAcao?.message}
                          label="Ação"
                          name={`entries.${index}.origemAcao`}
                          placeholder="Selecione uma sugestão ou digite"
                          register={register}
                          suggestions={acaoSuggestions}
                        />
                        <SuggestionField
                          error={itemErrors?.origemFonte?.message}
                          label="Fonte"
                          name={`entries.${index}.origemFonte`}
                          placeholder="Selecione uma sugestão ou digite"
                          register={register}
                          suggestions={fonteSuggestions}
                        />
                        <SuggestionField
                          error={itemErrors?.origemElemento?.message}
                          label="Elemento"
                          name={`entries.${index}.origemElemento`}
                          placeholder="Selecione uma sugestão ou digite"
                          register={register}
                          suggestions={elementoSuggestions}
                        />
                        <div>
                          <Label htmlFor={`entries-${index}-origemValor`}>Valor</Label>
                          <Input
                            id={`entries-${index}-origemValor`}
                            inputMode="decimal"
                            placeholder="Ex.: 15.000,00"
                            type="text"
                            value={String(values.entries?.[index]?.origemValor ?? "")}
                            onChange={(event) => handleCurrencyChange(index, "origemValor", event.target.value)}
                          />
                          <p className="mt-2 text-xs leading-5 text-amber-950/75">
                            O valor deve ser idêntico ao da adição e o campo é formatado automaticamente.
                          </p>
                          <FormError message={itemErrors?.origemValor?.message} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex flex-col gap-3 rounded-[1.5rem] border bg-muted/35 p-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <p className="text-sm font-medium">
                {completedItems === fields.length
                  ? `Lote pronto para envio com ${fields.length} ${fields.length === 1 ? "item" : "itens"}.`
                  : "Revise os itens do lote antes do envio."}
              </p>
              <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                Após a conferência administrativa, todos os itens do lote serão consolidados juntos no histórico executivo.
              </p>
            </div>
            <Button className="md:min-w-[240px]" disabled={isSubmitting} type="submit">
              {isSubmitting ? "Enviando lote..." : "Registrar lote"}
            </Button>
          </div>
        </form>
      </div>
    </Card>
  );
}
