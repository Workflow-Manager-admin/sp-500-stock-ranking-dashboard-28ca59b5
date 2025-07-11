/**
 * Utility to compute Buy/Sell/Hold disposition from stock metrics.
 * A simple scoring algorithm: additive scoring + threshold
 */
// PUBLIC_INTERFACE
export function getDisposition(metrics) {
  // Score: P/E: prefer lower; ROE, EPS, PM, DivY: higher is better; Debt: lower; Beta: closer to 1 is safer.
  let score = 0;
  metrics.forEach(m => {
    if (["ROE", "PM", "P/S", "CR", "EPS", "DivY"].includes(m.short)) {
      score += Math.min(m.value, 30);
    }
    if (["D/E"].includes(m.short)) {
      score += 10 - Math.min(m.value, 10); // lower better
    }
    if (["PE"].includes(m.short)) {
      score += 40 - Math.min(m.value, 40); // lower better
    }
    if (["Beta"].includes(m.short)) {
      score += (1.3-Math.abs(1-m.value))*12; // closer to 1, higher score.
    }
    if (["QR"].includes(m.short)) {
      score += Math.min(m.value, 6);
    }
  });
  score = Math.round(score);
  let disposition = "Hold";
  if (score >= 110) disposition = "Buy";
  else if (score <= 80) disposition = "Sell";
  // Else Hold
  return { disposition, score };
}

// PUBLIC_INTERFACE
export function getDispositionColor(disposition) {
  if (disposition === "Buy") return "#1ebd60";
  if (disposition === "Sell") return "#fb2b38";
  return "#ffb300";
}
