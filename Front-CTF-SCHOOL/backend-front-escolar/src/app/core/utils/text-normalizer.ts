const NORMALIZATION_MAP: Array<[string, string]> = [
  ['Ã‚Â°', '°'],
  ['Â°', '°'],
  ['ÃƒÂ¡', 'á'],
  ['Ã¡', 'á'],
  ['ÃƒÂ©', 'é'],
  ['Ã©', 'é'],
  ['ÃƒÂ­', 'í'],
  ['Ã­', 'í'],
  ['ÃƒÂ³', 'ó'],
  ['Ã³', 'ó'],
  ['ÃƒÂº', 'ú'],
  ['Ãº', 'ú'],
  ['ÃƒÂ', 'Á'],
  ['Ã', 'Á'],
  ['Ãƒâ€°', 'É'],
  ['Ã‰', 'É'],
  ['ÃƒÂ', 'Í'],
  ['Ã', 'Í'],
  ['Ãƒâ€œ', 'Ó'],
  ['Ã“', 'Ó'],
  ['ÃƒÅ¡', 'Ú'],
  ['Ãš', 'Ú'],
  ['ÃƒÂ±', 'ñ'],
  ['Ã±', 'ñ'],
  ['Ãƒâ€˜', 'Ñ'],
  ['Ã‘', 'Ñ'],
  ['Ã¼', 'ü'],
  ['Ã¢Â€Â“', '–'],
  ['â€“', '–'],
  ['Ã¢Â€Â”', '—'],
  ['â€”', '—'],
  ['Ã¢Â€Â¢', '•'],
  ['â€¢', '•']
];

export function normalizeDashboardText(value: string | null | undefined): string {
  if (!value) {
    return '';
  }

  let normalized = value;
  for (const [source, target] of NORMALIZATION_MAP) {
    normalized = normalized.replaceAll(source, target);
  }
  return normalized;
}
