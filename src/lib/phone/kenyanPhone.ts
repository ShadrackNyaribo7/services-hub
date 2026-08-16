export function normalizeKenyanPhone(value: string) {
  const compact = value.normalize("NFKC").replace(/[\s()-]/g, "");

  if (/^0[17]\d{8}$/.test(compact)) return `+254${compact.slice(1)}`;
  if (/^254[17]\d{8}$/.test(compact)) return `+${compact}`;
  if (/^\+254[17]\d{8}$/.test(compact)) return compact;

  return null;
}

export function maskKenyanPhone(value: string) {
  const phone = normalizeKenyanPhone(value);
  return phone ? `${phone.slice(0, 7)}***${phone.slice(-3)}` : "the number";
}
