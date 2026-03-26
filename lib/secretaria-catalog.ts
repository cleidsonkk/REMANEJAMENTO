export type SheetRow = Array<string | number | null | undefined>;

export type ImportedCatalogItem = {
  acao: string;
  fonte: string;
  elemento: string;
  funcao?: string;
  subFuncao?: string;
  programa?: string;
};

export type ImportedSecretaria = {
  codigoInstitucional: number;
  nomeSecretaria: string;
  unidadeOrcamentaria: string;
  nomeSecretario: string;
  catalogItems: ImportedCatalogItem[];
};

function toText(value: unknown) {
  return String(value ?? "")
    .replace(/\u00a0/g, " ")
    .trim();
}

function toDigits(value: unknown) {
  return String(value ?? "").replace(/\D/g, "");
}

function formatGovernmentCode(value: string | number) {
  return String(value).replace(/\D/g, "").padStart(5, "0");
}

function parseMetaCodeAndName(rawCode: unknown, rawName: unknown) {
  const codeText = toText(rawCode);
  const nameText = toText(rawName);

  if (nameText) {
    const digits = toDigits(codeText);
    if (!digits) {
      return null;
    }

    return {
      codigoInstitucional: Number(digits),
      nomeSecretaria: nameText,
    };
  }

  const combinedMatch = codeText.match(/(\d{4,5})\s*-\s*(.+)/);
  if (!combinedMatch) {
    return null;
  }

  return {
    codigoInstitucional: Number(combinedMatch[1]),
    nomeSecretaria: combinedMatch[2].trim(),
  };
}

export function parseSecretariasFromSheetRows(rows: SheetRow[]) {
  const secretarias = new Map<number, ImportedSecretaria>();

  for (const row of rows) {
    const secretario = toText(row[10]);
    const parsedMeta = parseMetaCodeAndName(row[11], row[12]);

    if (!parsedMeta) {
      continue;
    }

    const existing = secretarias.get(parsedMeta.codigoInstitucional);
    if (existing) {
      if (secretario) {
        existing.nomeSecretario = secretario;
      }
      continue;
    }

    secretarias.set(parsedMeta.codigoInstitucional, {
      codigoInstitucional: parsedMeta.codigoInstitucional,
      nomeSecretaria: parsedMeta.nomeSecretaria,
      unidadeOrcamentaria: formatGovernmentCode(parsedMeta.codigoInstitucional),
      nomeSecretario: secretario || "Não informado",
      catalogItems: [],
    });
  }

  for (const row of rows) {
    const unidade = toDigits(row[0]);
    const elemento = toText(row[1]);
    const fonte = toText(row[2]);
    const funcao = toText(row[3]);
    const subFuncao = toText(row[4]);
    const programa = toText(row[5]);
    const acao = toText(row[6]);

    if (!unidade || !elemento || !fonte || !acao) {
      continue;
    }

    const secretaria = secretarias.get(Number(unidade));
    if (!secretaria) {
      continue;
    }

    secretaria.catalogItems.push({
      acao,
      fonte,
      elemento,
      funcao: funcao || undefined,
      subFuncao: subFuncao || undefined,
      programa: programa || undefined,
    });
  }

  return Array.from(secretarias.values())
    .map((secretaria) => {
      const seen = new Set<string>();
      const uniqueItems = secretaria.catalogItems.filter((item) => {
        const key = `${item.acao}|${item.fonte}|${item.elemento}`;
        if (seen.has(key)) {
          return false;
        }
        seen.add(key);
        return true;
      });

      return {
        ...secretaria,
        catalogItems: uniqueItems,
      };
    })
    .sort((a, b) => a.codigoInstitucional - b.codigoInstitucional);
}
