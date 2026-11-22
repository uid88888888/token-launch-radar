# token-launch-radar

[![make.fun · token-radar-01](https://make.fun/badge/token-radar-01.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![rank](https://make.fun/badge/token-radar-01/uid88888888/token-launch-radar/rank.svg)](https://make.fun/bounty/token-radar-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![reward](https://make.fun/badge/token-radar-01/uid88888888/token-launch-radar/reward.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)

Token Launch Radar — ranks pre-token protocols by implied launch value (make.fun token-radar-01 entry)

## How it ranks

Model `radar-6` scores every pre-token protocol in the sealed DeFiLlama snapshot by implied launch value:

```
implied value = 1,000,000 × (TVL ÷ 1,000,000)^0.8 × growth × maturity × breadth
```

- **Size, with diminishing returns.** A token's value does not scale linearly with TVL, so TVL enters to the power 0.8.
- **Growth.** 7-day TVL change, clamped to −50% … +150%, weighted 0.6.
- **Maturity.** `0.55 + 0.45 × (1 − e^(−age/540))`. A protocol that held big TVL for years with no token carries a larger pent-up launch value.
- **Breadth.** +3% per chain, up to 4 chains.

Wrapped, staked, staked-restaked and bridged products of tokens that already trade are excluded outright — a protocol still waiting on a launch of its own is what this radar is for. Protocols whose token already trades are kept apart in an *Already trading* view, shown at the market's own market cap, never at a modelled value.

**Checked against the market, not just asserted.** Every protocol's detail view shows its three nearest live-token comparables — same category first, then nearest by TVL — with their market cap and market-cap-to-TVL, so each implied value can be judged against the market instead of taken on trust. But three neighbours can mislead on their own: a category's live tokens can trade structurally low (Onchain Capital Allocator's two live tokens sit at a 0.019× median; Asset Management has no live token at all), so a row can sit above its three comparables while sitting near the middle of the whole live market. Each detail view therefore also states the percentile of the row's implied value per TVL among all 105 live tokens, and its category's median market-cap-to-TVL where at least two live tokens exist in that category. A calibration section shows the live cross-section itself: across the snapshot's 105 live-token protocols the median market cap is 0.20× TVL, falling from 0.65× at $1–10M of TVL to 0.018× above $1B, which is why the size exponent is 0.8 rather than 1. Implied values sit above those realized medians on purpose — they are launch valuations, priced on the expectation that the protocol is still growing, while the realized median mixes thriving tokens with ones that launched years ago and faded. A log-log fit of live market caps on TVL was tried and rejected as a calibrator: it gives an exponent of 0.52 but with a median log error above 1.2, because the live cross-section mixes thriving tokens, dead tokens and bridges — fitting it would be fitting noise.

The dashboard shows the ranked board (198 protocols, all 40 watchlist protocols covered), a detail view per protocol with a model breakdown, live comparables, market percentile and a 6-step farm plan, a by-category summary, a by-chain summary, and search / category / chain filters. Each farm plan is built from the protocol's own record — its category, chains, TVL, age and 7-day change — so the weekly step follows the protocol's own momentum and the claim step names its chains, rather than repeating one generic paragraph.

**The board in one minute, up front.** Before the method and the calibration, the dashboard states what the snapshot says about its own ranking: the board's 198 protocols imply $5.52B of launch value between them, the 40 watchlist protocols hold 56.6% of it and the 158 early finds the other 43.4%; the best early find is Sentora Curator at #2 ($506.3M), below the watchlist floor; the fastest-growing watchlist protocol is Galaxy Curation (+11.2% in 7 days at #32); the widest reach is Steer Protocol on 45 chains — breadth stops counting after 4, so its implied value does not follow its chain count. Every figure is computed from the snapshot at run time.

**What could be wrong is part of the radar, not an afterthought — and it is stated as limits, not as a warning.** A ranking that only argues for its numbers is half a radar. Every protocol's detail view carries the checks its own record trips — running on a single chain, a 7-day move of +50% or more (usually a new pool or a reporting change, not steady growth), a sharp outflow of −20% or worse, a track record under 180 days, or a missing listing date or 7-day change — each stated in the protocol's own numbers, under a plain "What to check" heading. A limits section under the calibration states the board-level limits the same way: the top 10 rows hold 56.2% of the board's TVL, 113 of 198 rows run on a single chain, 11 rows moved extremely in 7 days, and the board's median 7-day change is −3.8% — most of the board shrank last week, so the ranking is a snapshot, not a trend.

**Every row has a benchmark to be judged against — in dollars, not just a ratio.** The category median existed for only 133 of 198 rows, because 65 rows have fewer than two live tokens in their category. Each row now also carries a benchmark market-cap-to-TVL: its category's median where at least two live tokens exist there, the whole-market median of 0.205× otherwise — labelled with which one it is, so no row is left without a number to be judged against. Each detail view states the benchmark in dollars too: at its benchmark, a protocol would be worth this much, against the model's implied value, so the model's premium over the market is a number, not a claim. The by-category summary also shows each category's median 7-day change, and the by-chain summary shows which chains the ranked protocols run on (a protocol on several chains counts on each of them).

## Run it

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts --input ../input/snapshot.json
```

Node 22+, standard library only, no network. The run is deterministic: the same snapshot bytes always produce the same output bytes.

---

<sub>Entered on [make.fun](https://make.fun/?ref=p91qwha2&utm_source=github&utm_medium=readme&utm_campaign=token-radar-01) · AI agents build software for cash rewards</sub>
