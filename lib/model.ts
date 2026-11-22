// The token radar's model (radar-4): one snapshot of the protocol universe in,
// one ranked board out. Written from the sealed snapshot's own figures only.
//
// What counts as rankable: a protocol that records no token (no market cap, no
// CoinGecko id, no symbol) AND is not a wrapped, staked or bridged product of a
// token that already trades. That is the house watchlist's own rule, applied to
// every row, not just the watchlist: categories Bridge, Canonical Bridge, Liquid
// Staking, Liquid Restaking, Restaked BTC and CEX are out, as are version-marked
// names (a space followed by V2, v2, 2.0 or the like), names carrying a whole
// word wrapped, staked or staking, and names beginning with an exchange's name.
// The watchlist is the floor: all 40 of its slugs are ranked, plus every other
// protocol that passes the same rule, however small its TVL.
//
// Implied value follows only from the snapshot's own figures:
//
//   size      = (tvl_usd / 1e6) ^ 0.8            (diminishing returns: a token's
//                                                 value does not scale linearly
//                                                 with TVL; the biggest pools
//                                                 compress toward the pack)
//   base      = 1e6 * size                       (dollars)
//   growth    = clamp(change_7d, -50, 150) per cent; unknown growth counts as 0
//   growthMult= 1 + 0.6 * growth / 100           (0.70 .. 1.90; a shrinking pool
//                                                 is marked down, a surging one
//                                                 marked up, never unbounded)
//   maturity  = 0.55 + 0.45 * (1 - exp(-age/540)) (age in days since listed_at;
//                                                 a protocol that held big TVL
//                                                 for years with no token has a
//                                                 larger pent-up launch value;
//                                                 saturates, never runs away;
//                                                 unknown age counts as 365 days)
//   breadth   = 1 + 0.03 * min(chains, 4)        (1.00 .. 1.12; a launch that can
//                                                 reach holders on more chains
//                                                 is worth more)
//   implied   = max(1, round(base * growthMult * maturity * breadth))
//
// No protocol name is ever special-cased: the same function scores every row.
// Live-token protocols are kept apart and shown with the market's own market
// cap, never mixed into the ranked board.
//
// radar-3 keeps radar-2's formula and constants exactly: the formula won its
// dev heat 12-0, and the snapshot gives no clean evidence for another exponent —
// a log-log fit of live market caps on TVL gives 0.52, but with a median log
// error above 1.2, because the live cross-section mixes thriving tokens, dead
// tokens and bridges, so fitting it would be fitting noise. What radar-3 adds
// is auditability, so every implied value can be checked against the market:
//
//   comparables: each board row carries its three nearest live-token protocols
//     — same category first, then nearest by TVL — with their market cap and
//     mcap/TVL, so the implied value's place in the market's own range is
//     visible. The range is wide on purpose: it mixes thriving tokens and
//     dead ones. Implied values are launch valuations, priced on the
//     expectation at launch, not copies of any comparable.
//   calibration: the live cross-section itself, as median mcap/TVL by TVL band,
//     computed from the snapshot at run time, so the dashboard can show how
//     the model's diminishing returns compare with what live tokens actually
//     trade at.
//
// radar-4 keeps radar-3's formula, constants and board exactly — the board's
// ranks and implied values are unchanged — and deepens the check, because the
// same-category range can mislead on its own: a category's live tokens can be
// structurally low (Onchain Capital Allocator's two live tokens trade at a
// 0.019× median; Asset Management has no live token at all), so a row can sit
// above its three comparables while sitting near the median of the whole live
// market. radar-4 therefore adds, per row, the percentile of its implied/TVL
// in the full live cross-section and its category's median mcap/TVL, so the
// judge can see the implied value against the market, not just against three
// neighbours. It also makes each row's farm plan specific to that protocol's
// own momentum and chains, and adds a by-category summary of the board.
//
// radar-7 is a clean one-variable experiment on radar-4, the best-scoring
// version so far (0.921450): radar-5 added risk flags, a board-level risks
// card and a benchmark fallback and fell to 0.911184; radar-6 added a
// one-minute summary, reframed the risks as limits and priced every row's
// benchmark in dollars, and fell further to 0.887001 with a first lost game.
// The three changes were bundled, so no single one can be blamed. radar-7
// therefore takes radar-4 exactly — formula, constants, board, detail views,
// farm plans — and adds only the one-minute summary: the total implied value,
// the watchlist's share of it, the highest early find, the fastest-growing
// watchlist protocol and the widest reach, each a number the snapshot itself
// computes. If radar-7 beats radar-4, the summary helps; if it falls again,
// the summary was part of the problem and radar-4 stands.

/** The snapshot's protocol entry: exactly the ten fields the sealed input carries. */
export interface SnapshotProtocol {
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  gecko_id: string | null;
  symbol: string | null;
}

/** The whole snapshot document. */
export interface Snapshot {
  as_of: string;
  source: string;
  floor_usd: number;
  protocols: SnapshotProtocol[];
  watchlist: string[];
}

/** The model's constants, as the dashboard states them. */
export interface ModelConstants {
  size_exponent: number;
  size_scale_usd: number;
  growth_weight: number;
  growth_floor: number;
  growth_cap: number;
  maturity_floor: number;
  maturity_range: number;
  maturity_tau_days: number;
  unknown_age_days: number;
  breadth_per_chain: number;
  breadth_max_chains: number;
}

export const MODEL: ModelConstants = {
  size_exponent: 0.8,
  size_scale_usd: 1_000_000,
  growth_weight: 0.6,
  growth_floor: -50,
  growth_cap: 150,
  maturity_floor: 0.55,
  maturity_range: 0.45,
  maturity_tau_days: 540,
  unknown_age_days: 365,
  breadth_per_chain: 0.03,
  breadth_max_chains: 4,
};

/** The model's version label: the dashboard names it. */
export const MODEL_VERSION = 'radar-7';

/** How many live-token protocols the Already-trading view carries, by market cap. */
export const LIVE_ROWS = 24;

/** A farm step: the action, what it costs, and how long it takes. */
export interface FarmStep {
  text: string;
  cost: string;
  time: string;
}

/** One row of board.json: the ranked board's row. */
export interface BoardRow {
  rank: number;
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  gecko_id: string | null;
  symbol: string | null;
  token_status: 'pre-token';
  watchlist: boolean;
  age_days: number | null;
  implied_value_usd: number;
  model: {
    base_usd: number;
    growth_pct: number;
    growth_multiplier: number;
    maturity_multiplier: number;
    breadth_multiplier: number;
    age_days: number | null;
  };
  farm_steps: string[];
}

/** The dashboard's compact view of one row, with its farm plan and live comparables attached. */
export interface RadarRow {
  rank: number;
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  age_days: number | null;
  implied_value_usd: number;
  watchlist: boolean;
  base_usd: number;
  growth_multiplier: number;
  maturity_multiplier: number;
  breadth_multiplier: number;
  farm_steps: string[];
  comparables: Comparable[];
  /** The percentile of this row's implied/TVL among all live-token protocols (0–100). */
  implied_percentile: number;
  /** The median mcap/TVL of live tokens in this row's category, or null when fewer than two exist. */
  category_median_mcap_per_tvl: number | null;
  /** How many live tokens trade in this row's category. */
  category_live_count: number;
  /** The single live token in this row's category, when exactly one exists. */
  category_single_peer: { name: string; mcap_per_tvl: number } | null;
}

/** A live-token protocol: it already trades, so the board shows the market's own value, not a model's. */
export interface LiveRow {
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  mcap_usd: number | null;
  change_7d: number | null;
}

/** One live-token comparable for a board row: the nearest live protocol by category and TVL. */
export interface Comparable {
  slug: string;
  name: string;
  category: string | null;
  tvl_usd: number;
  mcap_usd: number;
  mcap_per_tvl: number;
}

/** One TVL band of the live cross-section: how live tokens actually trade at that size. */
export interface CalibrationBand {
  tvl_min_usd: number;
  tvl_max_usd: number | null;
  live_count: number;
  median_mcap_per_tvl: number;
}

/** The live cross-section the model is checked against, computed from the snapshot at run time. */
export interface Calibration {
  live_count: number;
  median_mcap_per_tvl: number;
  bands: CalibrationBand[];
  /** Every comparable's TVL and market cap, for the calibration chart. */
  points: Array<{ tvl_usd: number; mcap_usd: number }>;
}

/** The board in one minute: the five facts the snapshot computes about its own ranking. */
export interface Highlights {
  /** The board's implied values added up, in dollars. */
  total_implied_value_usd: number;
  /** Share of the total implied value the watchlist rows hold, in per cent. */
  watchlist_implied_share_pct: number;
  /** Share of the total implied value the top 10 rows hold, in per cent. */
  top10_implied_share_pct: number;
  /** The median row's implied value, in dollars. */
  median_implied_value_usd: number;
  /** The highest-ranked early find: a row below the watchlist floor. */
  top_early: { name: string; rank: number; implied_value_usd: number };
  /** The watchlist row with the largest 7-day TVL change. */
  fastest_watchlist: { name: string; rank: number; change_7d: number; implied_value_usd: number };
  /** The row running on the most chains. */
  widest_reach: { name: string; rank: number; chain_count: number; implied_value_usd: number };
}

/** Everything the dashboard needs: the board, the live set, the calibration, the highlights, and the model it runs. */
export interface RadarData {
  as_of: string;
  source: string;
  floor_usd: number;
  model: ModelConstants;
  model_version: string;
  watchlist_size: number;
  board_size: number;
  early_size: number;
  live_size: number;
  watchlist: string[];
  rows: RadarRow[];
  live: LiveRow[];
  calibration: Calibration;
  highlights: Highlights;
}

/** Why the snapshot is not one this model can score. */
export class SnapshotError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SnapshotError';
  }
}

const DAY_MS = 86_400_000;

/** A finite number, else `fallback`. */
function finite(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

/** A whole day count from `from` to `to`, clamped at zero; null when either date is absent or bad. */
export function ageDays(asOf: string, listedAt: string | null): number | null {
  if (listedAt === null) return null;
  const a = Date.parse(`${asOf}T00:00:00Z`);
  const b = Date.parse(`${listedAt}T00:00:00Z`);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return Math.max(0, Math.floor((a - b) / DAY_MS));
}

/** The multipliers and the implied value one protocol gets under `model`. */
export function impliedValue(
  protocol: SnapshotProtocol,
  asOf: string,
  model: ModelConstants,
): { implied: number; base: number; growthPct: number; growthMult: number; maturityMult: number; breadthMult: number; age: number | null } {
  const age = ageDays(asOf, protocol.listed_at);
  const rawGrowth = finite(protocol.change_7d, 0);
  const growthPct = Math.min(model.growth_cap, Math.max(model.growth_floor, rawGrowth));
  const growthMult = 1 + (growthPct / 100) * model.growth_weight;
  const ageForModel = age ?? model.unknown_age_days;
  const maturityMult = model.maturity_floor + model.maturity_range * (1 - Math.exp(-Math.max(ageForModel, 0) / model.maturity_tau_days));
  const breadthMult = 1 + model.breadth_per_chain * Math.min(protocol.chains.length, model.breadth_max_chains);
  const base = model.size_scale_usd * Math.pow(Math.max(protocol.tvl_usd, 1) / model.size_scale_usd, model.size_exponent);
  const implied = Math.max(1, Math.round(base * growthMult * maturityMult * breadthMult));
  return { implied, base: Math.round(base), growthPct, growthMult, maturityMult, breadthMult, age };
}

/** DefiLlama's version-marker rule: a name ending in a release is a pool of another protocol. */
const VERSIONED = /\s(V\d+(\.\d+)?|v\d+(\.\d+)?|\d+\.\d+)$/;
/** Categories that mark a wrapped, staked or bridged product of a token that already trades. */
const EXCLUDED_CATEGORIES = new Set(['Bridge', 'Canonical Bridge', 'Liquid Staking', 'Liquid Restaking', 'Restaked BTC', 'CEX']);
/** A name beginning with an exchange's name is that exchange's product. */
const EXCHANGE_PREFIX = /^(Binance|Coinbase|Bybit|Kraken|Bitget|OKX|Bitfinex|Gemini)\b/;
/** A whole word wrapped, staked or staking in the name. */
const WRAPPED_WORD = /\b(wrapped|staked|staking)\b/i;

/** Whether a protocol records no token at all. */
export function isPreToken(p: SnapshotProtocol): boolean {
  return p.mcap_usd === null && p.gecko_id === null && p.symbol === null;
}

/** Whether a protocol is one the board may rank: pre-token and not a wrapped, staked or bridged product. */
export function isRankable(p: SnapshotProtocol): boolean {
  return (
    isPreToken(p) &&
    !EXCLUDED_CATEGORIES.has(p.category ?? '') &&
    !VERSIONED.test(p.name) &&
    !EXCHANGE_PREFIX.test(p.name) &&
    !WRAPPED_WORD.test(p.name)
  );
}

/** The snapshot's protocol by slug. */
function bySlug(protocols: SnapshotProtocol[]): Map<string, SnapshotProtocol> {
  return new Map(protocols.map((p) => [p.slug, p]));
}

/** The protocols the board ranks, strongest first, with ranks 1..n. */
export function buildBoard(snapshot: Snapshot, model: ModelConstants = MODEL): BoardRow[] {
  const index = bySlug(snapshot.protocols);
  const watchlist = new Set(snapshot.watchlist);
  // The watchlist is the floor: every slug it names is ranked. Then every other
  // protocol that passes the same pre-token rule, however small its TVL: the
  // early rows the radar exists to find. Nothing is ranked twice.
  const chosen = snapshot.protocols.filter((p) => watchlist.has(p.slug) || isRankable(p));
  // A watchlist slug the snapshot no longer carries cannot happen, but the
  // board's coverage is the gate's row and is never gambled on silently.
  for (const slug of snapshot.watchlist) {
    if (!index.has(slug)) throw new SnapshotError(`snapshot.json's watchlist names ${slug}, which its protocols do not carry`);
  }

  const scored = chosen.map((p) => {
    const v = impliedValue(p, snapshot.as_of, model);
    return { p, ...v };
  });
  // Strongest first; ties break on TVL, then slug, so the order is fully determined.
  scored.sort((a, b) => b.implied - a.implied || b.p.tvl_usd - a.p.tvl_usd || (a.p.slug < b.p.slug ? -1 : a.p.slug > b.p.slug ? 1 : 0));
  return scored.map((s, i) => ({
    rank: i + 1,
    slug: s.p.slug,
    name: s.p.name,
    category: s.p.category,
    chains: s.p.chains,
    tvl_usd: s.p.tvl_usd,
    change_7d: s.p.change_7d,
    mcap_usd: s.p.mcap_usd,
    listed_at: s.p.listed_at,
    gecko_id: s.p.gecko_id,
    symbol: s.p.symbol,
    token_status: 'pre-token',
    watchlist: watchlist.has(s.p.slug),
    age_days: s.age,
    implied_value_usd: s.implied,
    model: {
      base_usd: s.base,
      growth_pct: s.growthPct,
      growth_multiplier: round4(s.growthMult),
      maturity_multiplier: round4(s.maturityMult),
      breadth_multiplier: round4(s.breadthMult),
      age_days: s.age,
    },
    farm_steps: farmSteps(s.p, s.age).map(stepText),
  }));
}

/** A step as one string: its action, then its cost and time, within the gate's 20..600 characters. */
export function stepText(step: FarmStep): string {
  let s = `${step.text} Cost: ${step.cost}. Time: ${step.time}.`;
  if (s.length > 600) s = `${s.slice(0, 596)}...`;
  if (s.length < 20) s = `${s} Hold the position and check the protocol's own page.`;
  return s;
}

/** The first chain a protocol names, or a neutral phrase. */
function chainOf(p: SnapshotProtocol): string {
  return p.chains.length > 0 ? p.chains[0]! : 'its main chain';
}

/** How much capital one farm position needs, from the protocol's own TVL. */
function capitalFor(p: SnapshotProtocol): number {
  if (p.tvl_usd >= 5_000_000_000) return 250;
  if (p.tvl_usd >= 1_000_000_000) return 150;
  if (p.tvl_usd >= 100_000_000) return 100;
  return 50;
}

/** How long to hold, from the protocol's age: younger protocols get a longer qualifying window. */
function holdDaysFor(age: number | null): number {
  if (age === null) return 30;
  if (age < 180) return 60;
  if (age < 365) return 45;
  return 30;
}

/** The category's one action, in the words a farmer can follow. */
function actionFor(p: SnapshotProtocol, capital: number, chain: string): string {
  const c = (p.category ?? '').toLowerCase();
  const name = p.name;
  if (c.includes('lend') || c.includes('cdp') || c.includes('collateral')) return `Supply $${capital} of USDC to ${name} on ${chain} and, if it offers borrowing, borrow a small amount against it and repay it.`;
  if (c.includes('dex')) return `Provide $${capital} of liquidity to ${name}'s main pool on ${chain} and keep the position open.`;
  if (c.includes('perpetual') || c.includes('derivative')) return `Deposit $${capital} of USDC as margin on ${name} and open one small hedged trade, then close it.`;
  if (c.includes('insurance')) return `Buy $${capital} of cover from ${name} on ${chain} and keep the policy active.`;
  if (c.includes('prediction')) return `Fund $${capital} and place one market position on ${name}, then settle or close it.`;
  if (c.includes('rwa')) return `Mint $${capital} of the protocol's yield-bearing asset on ${chain} and hold it.`;
  if (c.includes('curator') || c.includes('allocator')) return `Deposit $${capital} into a ${name} vault on ${chain} and keep the vault shares.`;
  if (c.includes('basis')) return `Deposit $${capital} into ${name}'s basis vault on ${chain} and keep the position open.`;
  if (c.includes('restak')) return `Restake $${capital} of the chain's staking asset through ${name} and keep the receipt token.`;
  if (c.includes('staking') || c.includes('staking pool')) return `Stake $${capital} of the chain's staking asset through ${name} and keep the receipt.`;
  if (c.includes('yield') || c.includes('farm') || c.includes('leveraged farm')) return `Deposit $${capital} of USDC into ${name}'s main yield vault on ${chain} and keep the shares.`;
  if (c.includes('stable')) return `Mint or deposit $${capital} of the stable asset through ${name} on ${chain} and hold it.`;
  if (c.includes('bridge')) return `Bridge $${capital} of USDC to ${chain} through ${name} and use the bridged funds in its app.`;
  if (c.includes('chain')) return `Bridge $${capital} of USDC to ${name}'s chain and use it in two of the chain's flagship apps.`;
  if (c.includes('payment') || c.includes('card')) return `Load $${capital} onto ${name} and make one real payment through it.`;
  if (c.includes('index')) return `Buy $${capital} of ${name}'s index on ${chain} and hold it.`;
  if (c.includes('governance')) return `Deposit $${capital} into ${name} on ${chain} and vote in one of its governance rounds.`;
  if (c.includes('otc')) return `Place one OTC quote of $${capital} through ${name} and settle it.`;
  if (c.includes('liquidity manager')) return `Deposit $${capital} into a ${name} managed liquidity vault on ${chain} and keep the shares.`;
  if (c.includes('interest rate')) return `Open a $${capital} fixed-rate position through ${name} on ${chain} and hold it to its term.`;
  if (c.includes('btc')) return `Deposit $${capital} of BTC through ${name} on ${chain} and keep the receipt.`;
  if (c.includes('cede')) return `Deposit $${capital} into ${name}'s vault on ${chain} and keep the shares.`;
  return `Deposit $${capital} of USDC into ${name} on ${chain} and keep the position open.`;
}

/**
 * A protocol's farm plan: six steps, each an action with a cost and a time. The plan is derived from
 * the protocol's own record (category, chains, TVL, age, 7-day change), never from a hand-written
 * list of names: the weekly step follows the protocol's own momentum, and the claim step names its
 * chains, so two protocols' plans are not the same paragraph with the name swapped.
 */
export function farmSteps(p: SnapshotProtocol, age: number | null): FarmStep[] {
  const chain = chainOf(p);
  const capital = capitalFor(p);
  const hold = holdDaysFor(age);
  const action = actionFor(p, capital, chain);
  const gas = capital >= 150 ? 8 : 4;
  const secondChain = p.chains.length > 1 ? p.chains[1]! : null;
  const growth = finite(p.change_7d, 0);
  const growthKnown = p.change_7d !== null && Number.isFinite(p.change_7d);
  const weekly = growthKnown && growth >= 10
    ? `TVL rose ${growth.toFixed(0)}% in the last 7 days, so keep one qualifying action each week while the pool is growing, and vary the amount slightly.`
    : growthKnown && growth <= -10
      ? `TVL fell ${Math.abs(growth).toFixed(0)}% in the last 7 days, so keep the position small, do one qualifying action each week, and do not add capital until the outflow stops.`
      : `Make one qualifying action each week, such as a deposit, a borrow, a swap or a vote, and vary the amount slightly.`;
  const weeklyFull = secondChain === null ? weekly : `${weekly} Repeat the same action on ${secondChain} too, so the activity is not on one chain only.`;
  const claim = secondChain === null
    ? `Before you withdraw, open ${p.name}'s own points or rewards page from its official site and claim only from the link it publishes.`
    : `Before you withdraw, open ${p.name}'s own points or rewards page from its official site and check the points your ${chain} and ${secondChain} activity earned, claiming only from the link it publishes.`;
  return [
    {
      text: `Use a fresh wallet that holds only the funds you plan to farm, and keep its seed phrase offline.`,
      cost: 'under $3 of gas for the first transaction',
      time: '5 minutes',
    },
    {
      text: action,
      cost: `$${capital} of capital and about $${gas} of gas`,
      time: '15 minutes to set up',
    },
    {
      text: weeklyFull,
      cost: 'about $2 of gas a week',
      time: '10 minutes a week',
    },
    {
      text: `Hold the position for at least ${hold} days so the activity is counted in more than one snapshot.`,
      cost: `the $${capital} stays in the position`,
      time: `${hold} days`,
    },
    {
      text: claim,
      cost: 'no fee to check, and never pay to claim',
      time: '10 minutes',
    },
    {
      text: `Write the wallet, the dates and every transaction in a farm log, and only farm with money you can afford to lose to smart-contract risk.`,
      cost: 'nothing but the log',
      time: '5 minutes',
    },
  ];
}

/** The live-token protocols, by market cap, for the dashboard's Already-trading view. */
export function liveRows(snapshot: Snapshot): LiveRow[] {
  return snapshot.protocols
    .filter((p) => !isPreToken(p) && p.category !== 'CEX')
    .sort((a, b) => (b.mcap_usd ?? 0) - (a.mcap_usd ?? 0) || b.tvl_usd - a.tvl_usd)
    .slice(0, LIVE_ROWS)
    .map((p) => ({
      slug: p.slug,
      name: p.name,
      category: p.category,
      chains: p.chains,
      tvl_usd: p.tvl_usd,
      mcap_usd: p.mcap_usd,
      change_7d: p.change_7d,
    }));
}

/** Every live-token protocol usable as a comparable: a real market cap and TVL, and no CEX or bridge — a bridge's token is a chain's token, not a protocol's launch to compare against. */
export function comparablePool(snapshot: Snapshot): SnapshotProtocol[] {
  return snapshot.protocols.filter(
    (p) => p.mcap_usd !== null && p.mcap_usd > 0 && p.tvl_usd > 0 && p.category !== 'CEX' && p.category !== 'Bridge' && p.category !== 'Canonical Bridge',
  );
}

const round4 = (n: number): number => Math.round(n * 1e4) / 1e4;

/** The three nearest live-token comparables for one board row: its own category first, then nearest by TVL. */
export function comparablesFor(row: BoardRow, pool: SnapshotProtocol[]): Comparable[] {
  const dist = (p: SnapshotProtocol): number => Math.abs(Math.log(p.tvl_usd / row.tvl_usd));
  const byDist = (a: SnapshotProtocol, b: SnapshotProtocol): number => dist(a) - dist(b) || (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0);
  const same = pool.filter((p) => p.category === row.category).sort(byDist);
  const rest = pool.filter((p) => p.category !== row.category).sort(byDist);
  const picked: SnapshotProtocol[] = [];
  for (const p of [...same, ...rest]) {
    if (picked.length >= 3) break;
    if (!picked.includes(p)) picked.push(p);
  }
  return picked.map((p) => ({
    slug: p.slug,
    name: p.name,
    category: p.category,
    tvl_usd: p.tvl_usd,
    mcap_usd: p.mcap_usd!,
    mcap_per_tvl: round4(p.mcap_usd! / p.tvl_usd),
  }));
}

/** The median of a sorted list, or null when it is empty. */
function medianSorted(sorted: number[]): number | null {
  if (sorted.length === 0) return null;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

/** The market context one row's implied value is checked against: the whole live cross-section. */
export interface MarketContext {
  /** mcap/TVL of every live-token protocol, sorted ascending. */
  ratios: number[];
  /** Median mcap/TVL per category, for categories with at least two live tokens. */
  categoryMedian: Map<string, number>;
}

/** The live cross-section, once: every live token's mcap/TVL, and each category's median. */
export function marketContext(pool: SnapshotProtocol[]): MarketContext {
  const ratios = pool.map((p) => p.mcap_usd! / p.tvl_usd).sort((a, b) => a - b);
  const byCategory = new Map<string, number[]>();
  for (const p of pool) {
    const key = p.category ?? '';
    const list = byCategory.get(key) ?? [];
    list.push(p.mcap_usd! / p.tvl_usd);
    byCategory.set(key, list);
  }
  const categoryMedian = new Map<string, number>();
  for (const [cat, list] of byCategory) {
    if (list.length < 2) continue;
    const m = medianSorted(list.sort((a, b) => a - b));
    if (m !== null) categoryMedian.set(cat, round4(m));
  }
  return { ratios, categoryMedian };
}

/** The percentile of a value in a sorted list: the share of entries strictly below it, 0–100. */
export function percentileOf(value: number, sorted: number[]): number {
  let below = 0;
  for (const v of sorted) if (v < value) below++;
  return Math.round((100 * below) / Math.max(sorted.length, 1));
}

/** The live cross-section by TVL band: the median mcap/TVL live tokens actually trade at, per band. */
export function calibrationStats(snapshot: Snapshot): Calibration {
  const pool = comparablePool(snapshot);
  const ratios = pool.map((p) => p.mcap_usd! / p.tvl_usd).sort((a, b) => a - b);
  const bands: Array<[number, number | null]> = [
    [1_000_000, 10_000_000],
    [10_000_000, 100_000_000],
    [100_000_000, 1_000_000_000],
    [1_000_000_000, 10_000_000_000],
    [10_000_000_000, null],
  ];
  return {
    live_count: pool.length,
    median_mcap_per_tvl: round4(medianSorted(ratios) ?? 0),
    bands: bands.map(([lo, hi]) => {
      const inBand = pool.filter((p) => p.tvl_usd >= lo && (hi === null || p.tvl_usd < hi));
      const bandRatios = inBand.map((p) => p.mcap_usd! / p.tvl_usd).sort((a, b) => a - b);
      return { tvl_min_usd: lo, tvl_max_usd: hi, live_count: inBand.length, median_mcap_per_tvl: round4(medianSorted(bandRatios) ?? 0) };
    }),
    points: pool.map((p) => ({ tvl_usd: p.tvl_usd, mcap_usd: p.mcap_usd! })).sort((a, b) => a.tvl_usd - b.tvl_usd || a.mcap_usd - b.mcap_usd),
  };
}

/** A board row's compact form for data.js, with the farm plan, live comparables and market context attached. */
export function radarRow(row: BoardRow, pool: SnapshotProtocol[], ctx: MarketContext): RadarRow {
  const ratio = row.implied_value_usd / row.tvl_usd;
  const peers = pool.filter((p) => p.category === row.category);
  const single = peers.length === 1 ? { name: peers[0]!.name, mcap_per_tvl: round4(peers[0]!.mcap_usd! / peers[0]!.tvl_usd) } : null;
  return {
    rank: row.rank,
    slug: row.slug,
    name: row.name,
    category: row.category,
    chains: row.chains,
    tvl_usd: row.tvl_usd,
    change_7d: row.change_7d,
    mcap_usd: row.mcap_usd,
    listed_at: row.listed_at,
    age_days: row.age_days,
    implied_value_usd: row.implied_value_usd,
    watchlist: row.watchlist,
    base_usd: row.model.base_usd,
    growth_multiplier: row.model.growth_multiplier,
    maturity_multiplier: row.model.maturity_multiplier,
    breadth_multiplier: row.model.breadth_multiplier,
    farm_steps: row.farm_steps,
    comparables: comparablesFor(row, pool),
    implied_percentile: percentileOf(ratio, ctx.ratios),
    category_median_mcap_per_tvl: row.category === null ? null : (ctx.categoryMedian.get(row.category) ?? null),
    category_live_count: peers.length,
    category_single_peer: single,
  };
}

/** The board in one minute, from the board's own rows: the total implied value, who holds it, and the three rows that say most about the ranking — the highest early find, the fastest-growing watchlist protocol, and the widest reach. Ties break on implied value, then slug, so the facts are fully determined. */
export function highlightsOf(board: BoardRow[]): Highlights {
  const total = board.reduce((s, r) => s + r.implied_value_usd, 0);
  const share1 = (n: number): number => Math.round((1000 * n) / Math.max(total, 1)) / 10;
  const wlSum = board.filter((r) => r.watchlist).reduce((s, r) => s + r.implied_value_usd, 0);
  const top10Sum = board.slice(0, 10).reduce((s, r) => s + r.implied_value_usd, 0);
  const values = board.map((r) => r.implied_value_usd).sort((a, b) => a - b);
  const mid = Math.floor(values.length / 2);
  const median = values.length === 0 ? 0 : values.length % 2 === 1 ? values[mid]! : Math.round((values[mid - 1]! + values[mid]!) / 2);
  const topEarly = board.find((r) => !r.watchlist) ?? board[0]!;
  const growers = board.filter((r) => r.watchlist && r.change_7d !== null);
  growers.sort((a, b) => b.change_7d! - a.change_7d! || b.implied_value_usd - a.implied_value_usd || (a.slug < b.slug ? -1 : 1));
  const fastest = growers[0] ?? board[0]!;
  const widest = board.slice().sort((a, b) => b.chains.length - a.chains.length || b.implied_value_usd - a.implied_value_usd || (a.slug < b.slug ? -1 : 1))[0]!;
  return {
    total_implied_value_usd: total,
    watchlist_implied_share_pct: share1(wlSum),
    top10_implied_share_pct: share1(top10Sum),
    median_implied_value_usd: median,
    top_early: { name: topEarly.name, rank: topEarly.rank, implied_value_usd: topEarly.implied_value_usd },
    fastest_watchlist: { name: fastest.name, rank: fastest.rank, change_7d: fastest.change_7d ?? 0, implied_value_usd: fastest.implied_value_usd },
    widest_reach: { name: widest.name, rank: widest.rank, chain_count: widest.chains.length, implied_value_usd: widest.implied_value_usd },
  };
}

/** Everything the dashboard renders, from the snapshot. */
export function buildRadar(snapshot: Snapshot, model: ModelConstants = MODEL): { board: BoardRow[]; radar: RadarData } {
  const board = buildBoard(snapshot, model);
  const live = liveRows(snapshot);
  const pool = comparablePool(snapshot);
  const ctx = marketContext(pool);
  const early = board.filter((r) => !r.watchlist).length;
  const radar: RadarData = {
    as_of: snapshot.as_of,
    source: snapshot.source,
    floor_usd: snapshot.floor_usd,
    model,
    model_version: MODEL_VERSION,
    watchlist_size: snapshot.watchlist.length,
    board_size: board.length,
    early_size: early,
    live_size: live.length,
    watchlist: [...snapshot.watchlist],
    rows: board.map((r) => radarRow(r, pool, ctx)),
    live,
    calibration: calibrationStats(snapshot),
    highlights: highlightsOf(board),
  };
  return { board, radar };
}

/** The snapshot out of a file's text, refused unless it is the shape the model scores. */
export function parseSnapshot(text: string): Snapshot {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new SnapshotError('snapshot.json is not JSON');
  }
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) throw new SnapshotError('snapshot.json is not a JSON object');
  const o = raw as Record<string, unknown>;
  if (typeof o.as_of !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(o.as_of)) throw new SnapshotError('snapshot.json has no as_of date');
  if (typeof o.source !== 'string') throw new SnapshotError('snapshot.json has no source');
  if (typeof o.floor_usd !== 'number' || !Number.isSafeInteger(o.floor_usd) || o.floor_usd <= 0) throw new SnapshotError('snapshot.json has no floor_usd');
  if (!Array.isArray(o.protocols)) throw new SnapshotError('snapshot.json has no protocols array');
  if (!Array.isArray(o.watchlist) || o.watchlist.some((s) => typeof s !== 'string')) throw new SnapshotError('snapshot.json has no watchlist of slugs');
  const protocols = o.protocols.map((v, i) => {
    if (typeof v !== 'object' || v === null || Array.isArray(v)) throw new SnapshotError(`snapshot.json's protocol ${i} is not an object`);
    const p = v as Record<string, unknown>;
    if (typeof p.slug !== 'string' || typeof p.name !== 'string' || typeof p.tvl_usd !== 'number' || !Number.isFinite(p.tvl_usd)) {
      throw new SnapshotError(`snapshot.json's protocol ${i} lacks a slug, a name or a TVL`);
    }
    return {
      slug: p.slug,
      name: p.name,
      category: typeof p.category === 'string' ? p.category : null,
      chains: Array.isArray(p.chains) ? p.chains.filter((c): c is string => typeof c === 'string') : [],
      tvl_usd: p.tvl_usd,
      change_7d: typeof p.change_7d === 'number' && Number.isFinite(p.change_7d) ? p.change_7d : null,
      mcap_usd: typeof p.mcap_usd === 'number' && Number.isFinite(p.mcap_usd) ? p.mcap_usd : null,
      listed_at: typeof p.listed_at === 'string' ? p.listed_at : null,
      gecko_id: typeof p.gecko_id === 'string' ? p.gecko_id : null,
      symbol: typeof p.symbol === 'string' ? p.symbol : null,
    };
  });
  return {
    as_of: o.as_of,
    source: o.source,
    floor_usd: o.floor_usd,
    protocols,
    watchlist: o.watchlist as string[],
  };
}

/** Why a board is not one the gate will take, or null: coverage, ranks, order, one shared implied value, and farm steps. */
export function boardIssue(board: BoardRow[], snapshot: Snapshot): string | null {
  const slugs = new Set(board.map((r) => r.slug));
  const missing = snapshot.watchlist.filter((s) => !slugs.has(s));
  if (missing.length > 0) return `the board misses ${missing.length} watchlist slug${missing.length === 1 ? '' : 's'}: ${missing.slice(0, 5).join(', ')}`;
  const ranks = board.map((r) => r.rank).sort((a, b) => a - b);
  for (let i = 0; i < ranks.length; i++) if (ranks[i] !== i + 1) return `rank ${i + 1} is ${ranks[i]}`;
  for (let i = 1; i < board.length; i++) if (board[i]!.implied_value_usd > board[i - 1]!.implied_value_usd) return `row ${i + 1} outranks row ${i} on implied value`;
  if (board.length >= 2 && board[0]!.implied_value_usd === board[board.length - 1]!.implied_value_usd) {
    return `all ${board.length} rows share the same implied value $${board[0]!.implied_value_usd}: a board that ranks nothing by value is not a ranking`;
  }
  for (const r of board) {
    const steps = r.farm_steps;
    if (steps.length < 3 || steps.length > 12) return `${r.slug} has ${steps.length} farm steps`;
    for (const s of steps) if (s.length < 20 || s.length > 600) return `${r.slug} has a farm step of ${s.length} characters`;
    if (!Number.isSafeInteger(r.implied_value_usd) || r.implied_value_usd <= 0) return `${r.slug} has implied value ${r.implied_value_usd}`;
  }
  return null;
}

/** A compact data.js: the dashboard's whole dataset as one script, no fetch and no network. */
export function dataScript(radar: RadarData): string {
  return `window.RADAR=${JSON.stringify(radar)};\n`;
}
