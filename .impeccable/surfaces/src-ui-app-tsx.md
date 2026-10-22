---
version: 1
slug: "src-ui-app-tsx"
primary_target: "src/ui/App.tsx"
related_targets: []
---

## Scope

The game app shell and the 100m flow (team mode): home → entry → 100m rounds (heat list, Canvas race playback, results) → podium. Visitor mode: Operate. Mobile portrait first, PC dense second; KO/EN toggle.

## Audience and task

MLB fans, phone and desktop equally. Task: set mode/season/seed, check or swap each team's two 100m entrants, then follow every heat one by one through heats, semis and final, reading time, RT, wind, 30/60m splits and Q/q/DQ.

## Direction contract

THESIS: Every athlete is a race bib. The category default (grey table with a team-colour dot) is refused; the bib tag is the athlete's identity in lanes, rows and cards.

OWN-WORLD: Tyvek white ground (#f4f3ee) with faint fibre, bib ink near-black, one signal orange band (#e5431b) for the live/primary job, official blue (#1d3fbf) for data-side values, warm grey stock (#d9d6cc) for secondary panels. Heavy condensed numerals (Big Shoulders Display) for bib names and times; a workhorse grotesk (Archivo) for UI. Bib tags: white tag, black condensed surname, 3px top band in the team's generated colour, team code at right.

STORY: The visitor sees the heat as a start list of bibs, watches the bibs run, and reads why each time happened: data (vmax, τ) versus game (RT, wind, form).

FIRST VIEWPORT: Top bar (wordmark, KO/EN). Round tabs (예선/준결승/결승) with heat stepper and wind. Canvas race, lanes horizontal, bib tags as runners, 30m/60m ticks, fixed 100m scale for every heat. Playback bar: play, 1×/2×, show result. Below: results table with bib tags; Q solid tag, q outline tag, DQ struck through; tapping a row opens its data/game breakdown and the heat's speed-curve plot.

FORM: Race Bib, candidate 4 of 7 on my grounded list; seed key 59de4df7. Raises: line-form states (emission-line rail), record-with-proof pairing (monochrome canon), fixed-scale replay (botanical folio), stacked speed-curve plot (Saville sleeve).

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
