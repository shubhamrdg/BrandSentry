/**
 * BrandSentry Detection Engine
 */

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function hexToRgb(hex) {
  if (!hex || typeof hex !== 'string') return null;
  let cleanHex = hex.trim().replace(/^#/, '');
  if (cleanHex.length === 3) cleanHex = cleanHex.split('').map(c => c + c).join('');
  if (cleanHex.length !== 6) return null;
  const num = parseInt(cleanHex, 16);
  if (isNaN(num)) return null;
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}

function colorDistance(c1, c2) {
  return Math.sqrt(
    Math.pow(c1.r - c2.r, 2) +
    Math.pow(c1.g - c2.g, 2) +
    Math.pow(c1.b - c2.b, 2)
  );
}

function checkVisualConsistency(hexValue, palette = []) {
  if (!hexValue || typeof hexValue !== 'string' || !hexValue.trim()) return null;
  const cleanHex = (hexValue.trim().startsWith('#') ? hexValue.trim() : `#${hexValue.trim()}`).toUpperCase();
  const inputRgb = hexToRgb(cleanHex);
  if (!inputRgb) return null;
  if ((palette || []).some(p => p.hex.toUpperCase() === cleanHex)) return null;

  let closest = palette && palette.length > 0 ? palette[0] : { hex: '#1F2A44', name: 'Brand Navy' };
  let minDistance = Infinity;
  for (const item of (palette || [])) {
    const palRgb = hexToRgb(item.hex);
    if (!palRgb) continue;
    const dist = colorDistance(inputRgb, palRgb);
    if (dist < minDistance) {
      minDistance = dist;
      closest = item;
    }
  }

  return {
    id: `issue-visual-${Date.now()}-1`,
    type: 'Visual consistency',
    severity: 'Medium',
    snippet: cleanHex,
    reason: `Unapproved brand color "${cleanHex}" detected. Closest approved match is ${closest.name} (${closest.hex}).`,
    sourceRef: `Palette: ${closest.name} (${closest.hex})`,
    suggestedRewrite: closest.hex,
    status: 'open'
  };
}

function relativeLuminance(rgb) {
  const channel = value => {
    const normalized = value / 255;
    return normalized <= 0.03928
      ? normalized / 12.92
      : Math.pow((normalized + 0.055) / 1.055, 2.4);
  };
  return (0.2126 * channel(rgb.r)) + (0.7152 * channel(rgb.g)) + (0.0722 * channel(rgb.b));
}

function contrastRatio(textColor, backgroundColor) {
  const textRgb = hexToRgb(textColor);
  const backgroundRgb = hexToRgb(backgroundColor);
  if (!textRgb || !backgroundRgb) return null;
  const textLuminance = relativeLuminance(textRgb);
  const backgroundLuminance = relativeLuminance(backgroundRgb);
  const lighter = Math.max(textLuminance, backgroundLuminance);
  const darker = Math.min(textLuminance, backgroundLuminance);
  return (lighter + 0.05) / (darker + 0.05);
}

function findNearestPassingPaletteColor(textColor, backgroundColor, palette = []) {
  const inputRgb = hexToRgb(textColor);
  if (!inputRgb) return null;
  return (palette || [])
    .map(color => ({ ...color, ratio: contrastRatio(color.hex, backgroundColor) }))
    .filter(color => color.ratio !== null && color.ratio >= 4.5)
    .sort((a, b) => colorDistance(inputRgb, hexToRgb(a.hex)) - colorDistance(inputRgb, hexToRgb(b.hex)))[0] || null;
}

function reviewContent(text, glossary = [], claims = [], voiceRules = [], brandColor = null, palette = [], accessibility = {}) {
  const issues = [];
  if (!text || typeof text !== 'string') return issues;

  const claimMatch = text.match(/\b\d{1,3}x\b|\b100%\b|#1\b|\bguaranteed\b/i);
  if (claimMatch) {
    const claimRef = claims[0] || {
      text: 'Up to 35% faster in batch-processing tests',
      source: 'Claims Sheet v2.3, section 4'
    };
    issues.push({
      id: `issue-claim-${Date.now()}-1`,
      type: 'Unsupported claim',
      severity: 'High',
      snippet: claimMatch[0],
      reason: `Unsupported performance claim detected: "${claimMatch[0]}". Cites: "${claimRef.text}" (${claimRef.source}).`,
      sourceRef: claimRef.source,
      suggestedRewrite: `${claimRef.text} based on our internal benchmark.`,
      status: 'open'
    });
  }

  const slangWords = ['yo', 'dope', 'gonna', 'lol', 'omg', 'lit'];
  const slangRegex = new RegExp(`\\b(${slangWords.join('|')})\\b`, 'i');
  if (slangRegex.test(text) || /!{2,}/.test(text)) {
    const voiceRule = voiceRules[0] || { text: 'Confident and friendly, never slang-heavy' };
    const matchedSnippets = [];
    const slangMatches = text.match(new RegExp(`\\b(${slangWords.join('|')})\\b`, 'gi'));
    if (slangMatches) matchedSnippets.push(...slangMatches);
    const exclMatches = text.match(/!{2,}/g);
    if (exclMatches) matchedSnippets.push(...exclMatches);

    let neutralizedText = text.replace(/!{2,}/g, '.');
    const slangMap = { yo: '', dope: 'great', gonna: 'going to', lol: '', omg: '', lit: 'impressive' };
    for (const slang of slangWords) {
      const reg = new RegExp(`\\b${slang}\\b[!,]?\\s*`, 'gi');
      neutralizedText = neutralizedText.replace(reg, match => {
        const rep = slangMap[slang.toLowerCase()];
        return rep ? rep + ' ' : '';
      });
    }
    neutralizedText = neutralizedText.trim();
    if (neutralizedText.length > 0) neutralizedText = neutralizedText.charAt(0).toUpperCase() + neutralizedText.slice(1);

    issues.push({
      id: `issue-tone-${Date.now()}-2`,
      type: 'Tone mismatch',
      severity: 'Medium',
      snippet: matchedSnippets.join(', '),
      reason: `Tone violates voice rule: "${voiceRule.text}"`,
      sourceRef: voiceRule.text,
      suggestedRewrite: neutralizedText,
      status: 'open'
    });
  }

  if (Array.isArray(glossary)) {
    let termIdx = 0;
    for (const item of glossary) {
      if (!item.avoidTerm) continue;
      const termMatch = text.match(new RegExp(`\\b${escapeRegExp(item.avoidTerm)}\\b`, 'i'));
      if (termMatch) {
        issues.push({
          id: `issue-term-${Date.now()}-${termIdx++}`,
          type: 'Terminology inconsistency',
          severity: 'Low',
          snippet: termMatch[0],
          reason: `Found unapproved term "${item.avoidTerm}". Use approved term "${item.approvedTerm}".`,
          sourceRef: `Glossary: ${item.avoidTerm} -> ${item.approvedTerm}`,
          suggestedRewrite: item.approvedTerm,
          status: 'open'
        });
      }
    }
  }

  if (brandColor && typeof brandColor === 'string' && brandColor.trim()) {
    const visualIssue = checkVisualConsistency(brandColor, palette);
    if (visualIssue) issues.push(visualIssue);
  }

  const accessibilityContentType = accessibility.contentType;
  const requiresAltText = accessibilityContentType === 'Social Post' || accessibilityContentType === 'Web Page';
  if (requiresAltText && !String(accessibility.altText || '').trim()) {
    issues.push({
      id: `issue-accessibility-alt-${Date.now()}`,
      type: 'Accessibility: Missing alt text',
      severity: 'Medium',
      snippet: '[missing alt text]',
      reason: 'WCAG requires descriptive alt text for non-decorative images.',
      sourceRef: 'WCAG requires descriptive alt text for non-decorative images',
      suggestedRewrite: 'A descriptive image of the content or subject.'
    });
  }

  const textColor = accessibility.textColor;
  const backgroundColor = accessibility.backgroundColor;
  if (textColor && backgroundColor) {
    const ratio = contrastRatio(textColor, backgroundColor);
    if (ratio !== null && ratio < 4.5) {
      const nearestPassingColor = findNearestPassingPaletteColor(textColor, backgroundColor, palette);
      if (nearestPassingColor) {
        issues.push({
          id: `issue-accessibility-contrast-${Date.now()}`,
          type: 'Accessibility: Low contrast',
          severity: 'High',
          snippet: textColor.toUpperCase(),
          reason: `Text and background contrast is ${ratio.toFixed(2)}:1, below the WCAG minimum of 4.5:1.`,
          sourceRef: 'WCAG 1.4.3 Contrast (Minimum)',
          suggestedRewrite: nearestPassingColor.hex
        });
      } else {
        issues.push({
          id: `issue-accessibility-contrast-${Date.now()}`,
          type: 'Accessibility: Low contrast',
          severity: 'High',
          snippet: textColor.toUpperCase(),
          reason: `Text and background contrast is ${ratio.toFixed(2)}:1, below the WCAG minimum of 4.5:1.`,
          sourceRef: 'WCAG 1.4.3 Contrast (Minimum)',
          suggestedRewrite: palette[0] ? palette[0].hex : '#FFFFFF'
        });
      }
    }
  }
  return issues;
}

if (typeof window !== 'undefined') {
  window.escapeRegExp = escapeRegExp;
  window.hexToRgb = hexToRgb;
  window.colorDistance = colorDistance;
  window.checkVisualConsistency = checkVisualConsistency;
  window.contrastRatio = contrastRatio;
  window.reviewContent = reviewContent;
}
