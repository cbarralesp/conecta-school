const NORMALIZATION_MAP: Array<[string, string]> = [
  ['Ãƒâ€šÃ‚Â°', '\u00b0'],
  ['Ã‚Â°', '\u00b0'],
  ['ÃƒÆ’Ã‚Â¡', '\u00e1'],
  ['ÃƒÂ¡', '\u00e1'],
  ['ÃƒÆ’Ã‚Â©', '\u00e9'],
  ['ÃƒÂ©', '\u00e9'],
  ['ÃƒÆ’Ã‚Â­', '\u00ed'],
  ['ÃƒÂ­', '\u00ed'],
  ['ÃƒÆ’Ã‚Â³', '\u00f3'],
  ['ÃƒÂ³', '\u00f3'],
  ['ÃƒÆ’Ã‚Âº', '\u00fa'],
  ['ÃƒÂº', '\u00fa'],
  ['ÃƒÆ’Ã‚Â', '\u00c1'],
  ['ÃƒÂ', '\u00c1'],
  ['ÃƒÆ’Ã¢â‚¬Â°', '\u00c9'],
  ['Ãƒâ€°', '\u00c9'],
  ['ÃƒÆ’Ã‚Â', '\u00cd'],
  ['ÃƒÂ', '\u00cd'],
  ['ÃƒÆ’Ã¢â‚¬Å“', '\u00d3'],
  ['Ãƒâ€œ', '\u00d3'],
  ['ÃƒÆ’Ã…Â¡', '\u00da'],
  ['ÃƒÅ¡', '\u00da'],
  ['ÃƒÆ’Ã‚Â±', '\u00f1'],
  ['ÃƒÂ±', '\u00f1'],
  ['ÃƒÆ’Ã¢â‚¬Ëœ', '\u00d1'],
  ['Ãƒâ€˜', '\u00d1'],
  ['ÃƒÂ¼', '\u00fc'],
  ['ÃƒÂ¢Ã‚â‚¬Ã‚â€œ', '\u2013'],
  ['Ã¢â‚¬â€œ', '\u2013'],
  ['ÃƒÂ¢Ã‚â‚¬Ã‚â€', '\u2014'],
  ['Ã¢â‚¬â€', '\u2014'],
  ['ÃƒÂ¢Ã‚â‚¬Ã‚Â¢', '\u2022'],
  ['Ã¢â‚¬Â¢', '\u2022']
];

const BROKEN_LITERAL_MAP: Array<[string, string]> = [
  ['Regi\u00f3n de \uFFFDuble', 'Regi\u00f3n de \u00d1uble'],
  ['Regi\u00f3n de \uFFFD\'uble', 'Regi\u00f3n de \u00d1uble'],
  ['\uFFFDiqu\u00e9n', '\u00d1iqu\u00e9n'],
  ['\uFFFD\'iqu\u00e9n', '\u00d1iqu\u00e9n'],
  ['\uFFFDu\u00f1oa', '\u00d1u\u00f1oa'],
  ['\uFFFD\'u\u00f1oa', '\u00d1u\u00f1oa']
];

export function normalizeDashboardText(value: string | null | undefined): string {
  if (!value) {
    return '';
  }

  let normalized = value;
  for (const [source, target] of NORMALIZATION_MAP) {
    normalized = normalized.replaceAll(source, target);
  }
  for (const [source, target] of BROKEN_LITERAL_MAP) {
    normalized = normalized.replaceAll(source, target);
  }
  return normalized;
}
