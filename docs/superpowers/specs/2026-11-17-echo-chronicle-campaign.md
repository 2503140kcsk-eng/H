# Echo Chronicle — 3惑星・因果分岐キャンペーン

## Intent

Campaign choices must change the world that is played, not only the text shown after a decision. Each chapter contributes to a shared world-state vector, and the battle adapter deterministically converts that vector into environment, encounter, boss and support-event parameters.

The main operation of each chapter converges to the next chapter. Branch-specific side operations, rewards, dialogue and final outcomes preserve the consequences of the earlier decision. The campaign is local-first and does not require accounts, paid cloud storage, analytics or third-party assets.

## Chapters

| Chapter | Core dilemma | Choice A | Choice B | Battle consequence |
|---|---|---|---|---|
| Aurora Prime — 星の異常信号 | Trust an impossible signal or cut it off | Attune: resonance, signal echo and archive access | Sever: intelligence and exposed relay | Guardian-heavy or precision-hunter-biased roster; signal pulse or boss relay exposure |
| Pyra Reach — 生存と真実 | Save the transport group or pursue the cipher | Rescue: survivors, trust and support drones | Pursue: intelligence and tactical prediction | Interceptor/swarm support route or sniper/missile pursuit route; rescue supply or exposed defense |
| Noctis Archive — 星環の真相 | Integrate the memories or seal the loop | Merge: resonance and memory reversal | Seal: coherence and stasis lock | Homing memory pattern or slowed/stopped volley window; secret route is possible |

## Causal model

`deriveCampaignWorld` maps chapter decisions and side-mission completions to six auditable integer dimensions:

- `resonance`: ability to synchronize with the star-ring archive;
- `survivors`: number of lives brought into the new route;
- `intel`: enemy and archive tactical information recovered;
- `trust`: confidence retained among pilots and rescued allies;
- `anomaly`: instability introduced by interacting with the stored timelines;
- `coherence`: stability gained by sealing or reconciling memory fragments.

Those dimensions are not shown as a morality score. The player sees the recorded decision and its consequences; the battle profile uses bounded coefficients to avoid unbounded difficulty growth.

## Mission and ending rules

- Each chapter has one main operation; completing it unlocks the next chapter, so the broad story rejoins.
- The side operation within Aurora or Pyra is determined by that chapter's decision.
- The secret Noctis memory vault requires Aurora attune + Pyra rescue + Noctis merge and the associated chapter progression.
- The four ending classes are Starborn, Liberation, Quiet Orbit and Fractured Ring.
- The endings are determined from the full recorded route and side-mission completions; ending history is retained when a player starts an alternate route.
- Mission rewards are granted only on a clear; failed missions remain active for retry.

## Battle adapter

`createCampaignCombatProfile` produces a plain immutable profile. `Game.ts` consumes it only as an adapter:

- choice-reactive scene background, fog and starfield palette (the same planet changes its sky according to the route);
- weighted enemy kind selection constrained by the existing elapsed-time unlock schedule plus six authored formation layouts;
- bounded enemy health, speed and fire interval changes; 3-enemy formations use an approximately 2.8× wave interval (bounded 2.4–3.5×) to keep per-enemy arrival density close to the original single-enemy waves;
- seven route-specific procedural boss silhouettes (prism / spear / armored polyhedra / knotwork), using cloned materials with explicit disposal on boss removal; boss title, health, shot pattern, projectile count/speed/spread, fire interval and shield damage changes;
- pilot-specific value-based dialogue reactions, six route-specific formations, and one-shot campaign event at 18 seconds for Aurora / Pyra and a once-per-boss phase transition event in Noctis.

The adapter preserves Vector Echo's locked attack forecasts and the existing named body-part integrity model. It does not auto-steer the player's ship.

## Persistence and failure handling

- Campaign state is nested under the existing save object and backup payload.
- Save format version remains 1. Older version-1 saves and backups without `campaign` are migrated to an empty chronicle through `sanitizeCampaignState`.
- Choice, mission and ending identifiers are allowlisted; unknown IDs and unbounded counters are dropped or clamped.
- Invalid imports are rejected by the existing checksum/schema flow before persistence is touched.
- If IndexedDB is unavailable, the existing memory-only warning remains authoritative.

## Tests and non-goals

Vitest covers progression order, choice-to-world mapping, side mission lock rules, secret route, combat profile divergence, replay history and hostile save-value sanitization. Playwright checks the menu choice round-trip and mission launch alongside existing browser regressions.

This is a playable campaign framework slice, not a claim that all cinematic content is authored. Pilot-specific full dialogue trees, voice acting, lip-sync, bespoke cutscenes, unique mesh models and fully handcrafted boss attack state machines remain later content milestones.
