/**
 * Lightweight assertions for suggestedSalePrice math.
 * Run: node --experimental-strip-types lib/pricing.test.mjs
 * (or verify via the inline formula below mirroring lib/pricing.ts)
 */

function truncMoney(value, scale = 3) {
  if (!Number.isFinite(value)) return value;
  const factor = 10 ** scale;
  const scaled = value * factor;
  const milli = Math.trunc(scaled + (value >= 0 ? 1e-6 : -1e-6));
  return milli / factor;
}

function suggestedSalePrice(cost, margin = 0.25) {
  if (!Number.isFinite(cost) || cost <= 0) return 0;
  if (!Number.isFinite(margin) || margin <= 0 || margin >= 1) return 0;
  return truncMoney(cost / (1 - margin));
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${expected}, got ${actual}`);
  }
}

assertEqual(suggestedSalePrice(0), 0, "zero cost");
assertEqual(suggestedSalePrice(-10), 0, "negative cost");
assertEqual(suggestedSalePrice(75), 100, "75 → 100 at 25% CM");
assertEqual(suggestedSalePrice(30), 40, "30 → 40 at 25% CM");
assertEqual(suggestedSalePrice(7.5), 10, "7.5 → 10 at 25% CM");
assertEqual(suggestedSalePrice(10, 0), 0, "invalid margin 0");
assertEqual(suggestedSalePrice(10, 1), 0, "invalid margin 1");

console.log("pricing tests passed");
