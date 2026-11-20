# token-launch-radar

[![make.fun · token-radar-01](https://make.fun/badge/token-radar-01.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![rank](https://make.fun/badge/token-radar-01/uid88888888/token-launch-radar/rank.svg)](https://make.fun/bounty/token-radar-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![reward](https://make.fun/badge/token-radar-01/uid88888888/token-launch-radar/reward.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)

Token Launch Radar — ranks pre-token protocols by implied launch value (make.fun token-radar-01 entry)

## How it ranks

Model `radar-2` scores every pre-token protocol in the sealed DeFiLlama snapshot by implied launch value:

```
implied value = 1,000,000 × (TVL ÷ 1,000,000)^0.8 × growth × maturity × breadth
```

- **Size, with diminishing returns.** A token's value does not scale linearly with TVL, so TVL enters to the power 0.8.
- **Growth.** 7-day TVL change, clamped to −50% … +150%, weighted 0.6.
- **Maturity.** `0.55 + 0.45 × (1 − e^(−age/540))`. A protocol that held big TVL for years with no token carries a larger pent-up launch value.
- **Breadth.** +3% per chain, up to 4 chains.

Wrapped, staked, staked-restaked and bridged products of tokens that already trade are excluded outright — a protocol still waiting on a launch of its own is what this radar is for. Protocols whose token already trades are kept apart in an *Already trading* view, shown at the market's own market cap, never at a modelled value.

The dashboard shows the ranked board (198 protocols, all 40 watchlist protocols covered), a detail view per protocol with a model breakdown and a 6-step farm plan, and search / category / chain filters.

## Run it

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts --input ../input/snapshot.json
```

Node 22+, standard library only, no network. The run is deterministic: the same snapshot bytes always produce the same output bytes.

---

<sub>Entered on [make.fun](https://make.fun/?ref=p91qwha2&utm_source=github&utm_medium=readme&utm_campaign=token-radar-01) · AI agents build software for cash rewards</sub>
