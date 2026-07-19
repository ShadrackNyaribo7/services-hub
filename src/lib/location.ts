export const KENYA_COUNTIES = [
  "Baringo",
  "Bomet",
  "Bungoma",
  "Busia",
  "Elgeyo-Marakwet",
  "Embu",
  "Garissa",
  "Homa Bay",
  "Isiolo",
  "Kajiado",
  "Kakamega",
  "Kericho",
  "Kiambu",
  "Kilifi",
  "Kirinyaga",
  "Kisii",
  "Kisumu",
  "Kitui",
  "Kwale",
  "Laikipia",
  "Lamu",
  "Machakos",
  "Makueni",
  "Mandera",
  "Marsabit",
  "Meru",
  "Migori",
  "Mombasa",
  "Murang'a",
  "Nairobi",
  "Nakuru",
  "Nandi",
  "Narok",
  "Nyamira",
  "Nyandarua",
  "Nyeri",
  "Samburu",
  "Siaya",
  "Taita-Taveta",
  "Tana River",
  "Tharaka-Nithi",
  "Trans Nzoia",
  "Turkana",
  "Uasin Gishu",
  "Vihiga",
  "Wajir",
  "West Pokot",
] as const;

const EXTRA_COUNTY_ALIASES: Record<string, string> = {
  "Elgeyo Marakwet": "Elgeyo-Marakwet",
  Marakwet: "Elgeyo-Marakwet",
  "Homa-Bay": "Homa Bay",
  Muranga: "Murang'a",
  "Nairobi City": "Nairobi",
  "Nairobi City County": "Nairobi",
  "Taita Taveta": "Taita-Taveta",
  "Tharaka Nithi": "Tharaka-Nithi",
  "Trans-Nzoia": "Trans Nzoia",
};

const COUNTY_LOOKUP = new Map<string, string>();

for (const county of KENYA_COUNTIES) {
  COUNTY_LOOKUP.set(normalizeLocationValue(county), county);
  COUNTY_LOOKUP.set(normalizeLocationValue(`${county} County`), county);
}

for (const [alias, county] of Object.entries(EXTRA_COUNTY_ALIASES)) {
  COUNTY_LOOKUP.set(normalizeLocationValue(alias), county);
  COUNTY_LOOKUP.set(normalizeLocationValue(`${alias} County`), county);
}

const COUNTY_MATCHERS = Array.from(COUNTY_LOOKUP.entries()).sort(
  ([left], [right]) => right.length - left.length,
);

export function normalizeLocationValue(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['\u2019]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .replace(/\bcounty\b/gi, " ")
    .replace(/\bkenya\b/gi, " ")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

export function cleanLocationLabel(value: string | null | undefined): string {
  return (value ?? "").trim().replace(/\s+/g, " ").slice(0, 80);
}

export function resolveKenyaCounty(
  value: string | null | undefined,
): string | null {
  const normalizedValue = normalizeLocationValue(value ?? "");

  if (!normalizedValue) {
    return null;
  }

  const exactCounty = COUNTY_LOOKUP.get(normalizedValue);

  if (exactCounty) {
    return exactCounty;
  }

  const paddedValue = ` ${normalizedValue} `;

  for (const [normalizedCounty, county] of COUNTY_MATCHERS) {
    if (paddedValue.includes(` ${normalizedCounty} `)) {
      return county;
    }
  }

  return null;
}

export function getCountySearchTerms(
  value: string | null | undefined,
): string[] {
  const cleanedValue = cleanLocationLabel(value);

  if (!cleanedValue) {
    return [];
  }

  const county = resolveKenyaCounty(cleanedValue) ?? cleanedValue;
  const terms = new Set<string>([
    county,
    `${county} County`,
    county.replace(/-/g, " "),
    county.replace(/\s+/g, "-"),
    county.replace(/'/g, ""),
  ]);

  return Array.from(terms).map(cleanLocationLabel).filter(Boolean);
}
