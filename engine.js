/**
 * BrandSentry Detection Engine (Pure Function)
 * Team DviCoders - Hackathon Project
 */

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Reviews content against brand governance rules.
 * Pure function with no UI code or side effects.
 *
 * @param {string} text - The input copy to review
 * @param {Array} glossary - Array of { avoidTerm, approvedTerm }
 * @param {Array} claims - Array of { text, source }
 * @param {Array} voiceRules - Array of { text }
 * @returns {Array} Array of Issue objects:
 *   { id, type, severity, snippet, reason, sourceRef, suggestedRewrite, status: 'open' }
 */
function reviewContent(text, glossary = [], claims = [], voiceRules = []) {
  const issues = [];
  if (!text || typeof text !== 'string') return issues;

  // 1. Unsupported claim (High)
  // Matches: /\b\d{1,3}x\b/i, /\b100%\b/, /#1\b/, or /\bguaranteed\b/i
  const claimRegex = /\b\d{1,3}x\b|\b100%\b|#1\b|\bguaranteed\b/i;
  const claimMatch = text.match(claimRegex);
  if (claimMatch) {
    const claimRef = claims[0] || {
      text: "Up to 35% faster in batch-processing tests",
      source: "Claims Sheet v2.3, section 4"
    };

    const suggestedRewrite = `${claimRef.text} based on our internal benchmark.`;

    issues.push({
      id: `issue-claim-${Date.now()}-1`,
      type: 'Unsupported claim',
      severity: 'High',
      snippet: claimMatch[0],
      reason: `Unsupported performance claim detected: "${claimMatch[0]}". Cites: "${claimRef.text}" (${claimRef.source}).`,
      sourceRef: claimRef.source,
      suggestedRewrite: suggestedRewrite,
      status: 'open'
    });
  }

  // 2. Tone mismatch (Medium)
  // Text contains any of ["yo","dope","gonna","lol","omg","lit"] (case-insensitive) or 2+ exclamation marks in a row.
  const slangWords = ["yo", "dope", "gonna", "lol", "omg", "lit"];
  const slangRegex = new RegExp(`\\b(${slangWords.join('|')})\\b`, 'i');
  const exclRegex = /!{2,}/;

  const hasSlang = slangRegex.test(text);
  const hasExcl = exclRegex.test(text);

  if (hasSlang || hasExcl) {
    const voiceRule = voiceRules[0] || {
      text: "Confident and friendly, never slang-heavy"
    };

    const matchedSnippets = [];
    const slangMatches = text.match(new RegExp(`\\b(${slangWords.join('|')})\\b`, 'gi'));
    if (slangMatches) matchedSnippets.push(...slangMatches);
    const exclMatches = text.match(/!{2,}/g);
    if (exclMatches) matchedSnippets.push(...exclMatches);

    let neutralizedText = text;
    neutralizedText = neutralizedText.replace(/!{2,}/g, '.');

    const slangMap = {
      yo: '',
      dope: 'great',
      gonna: 'going to',
      lol: '',
      omg: '',
      lit: 'impressive'
    };

    for (const slang of slangWords) {
      const reg = new RegExp(`\\b${slang}\\b[!,]?\\s*`, 'gi');
      neutralizedText = neutralizedText.replace(reg, (match) => {
        const rep = slangMap[slang.toLowerCase()];
        return rep ? rep + ' ' : '';
      });
    }

    neutralizedText = neutralizedText.trim();
    if (neutralizedText.length > 0) {
      neutralizedText = neutralizedText.charAt(0).toUpperCase() + neutralizedText.slice(1);
    }

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

  // 3. Terminology inconsistency (Low)
  // Text contains any glossary avoidTerm (case-insensitive).
  if (Array.isArray(glossary)) {
    let termIdx = 0;
    for (const item of glossary) {
      if (!item.avoidTerm) continue;
      const termRegex = new RegExp(`\\b${escapeRegExp(item.avoidTerm)}\\b`, 'i');
      const termMatch = text.match(termRegex);
      if (termMatch) {
        const swapRegex = new RegExp(`\\b${escapeRegExp(item.avoidTerm)}\\b`, 'gi');
        const termRewrite = text.replace(swapRegex, item.approvedTerm);

        issues.push({
          id: `issue-term-${Date.now()}-${termIdx++}`,
          type: 'Terminology inconsistency',
          severity: 'Low',
          snippet: termMatch[0],
          reason: `Found unapproved term "${item.avoidTerm}". Use approved term "${item.approvedTerm}".`,
          sourceRef: `Glossary: ${item.avoidTerm} -> ${item.approvedTerm}`,
          suggestedRewrite: termRewrite,
          status: 'open'
        });
      }
    }
  }

  return issues;
}

// Attach to window for global access
if (typeof window !== 'undefined') {
  window.reviewContent = reviewContent;
  window.escapeRegExp = escapeRegExp;
}

// Export for node/module environments if needed
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { reviewContent, escapeRegExp };
}
