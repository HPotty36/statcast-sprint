---
name: Statcast Sprint
description: MLB fielders run the Olympic 100m and 4×100m relay, every athlete a race bib on Tyvek ground.
colors:
  tyvek: "#f4f3ee"
  tyvek-lane: "#ebe9e1"
  stock: "#d9d6cc"
  hairline: "#cfccc2"
  tag-white: "#ffffff"
  bib-ink: "#121212"
  ink-soft: "#3f3d38"
  ink-muted: "#5f5b53"
  signal: "#e5431b"
  signal-deep: "#d23a14"
  signal-ink: "#1a0a04"
  signal-soft: "#fbe3da"
  official: "#1d3fbf"
  infraction: "#a3220c"
  medal-gold: "#c9a227"
  medal-silver: "#a9aaad"
  medal-bronze: "#b06a3b"
typography:
  display:
    fontFamily: "'Big Shoulders Display', 'Black Han Sans', 'Arial Narrow', sans-serif"
    fontSize: "clamp(44px, 11vw, 88px)"
    fontWeight: 800
    lineHeight: 0.92
    letterSpacing: "-0.01em"
  headline:
    fontFamily: "'Big Shoulders Display', 'Black Han Sans', 'Arial Narrow', sans-serif"
    fontSize: "36px"
    fontWeight: 800
    lineHeight: 1
  stage-title:
    fontFamily: "'Big Shoulders Display', 'Black Han Sans', 'Arial Narrow', sans-serif"
    fontSize: "30px"
    fontWeight: 800
    lineHeight: 1
  title:
    fontFamily: "'Big Shoulders Display', 'Black Han Sans', 'Arial Narrow', sans-serif"
    fontSize: "22px"
    fontWeight: 800
    lineHeight: 1.1
  clock:
    fontFamily: "'Big Shoulders Display', 'Black Han Sans', 'Arial Narrow', sans-serif"
    fontSize: "34px"
    fontWeight: 800
    lineHeight: 1
    fontFeature: "\"tnum\" 1"
  time:
    fontFamily: "'Big Shoulders Display', 'Black Han Sans', 'Arial Narrow', sans-serif"
    fontSize: "22px"
    fontWeight: 800
    letterSpacing: "0.01em"
    fontFeature: "\"tnum\" 1"
  bib-name:
    fontFamily: "'Big Shoulders Display', 'Black Han Sans', 'Arial Narrow', sans-serif"
    fontSize: "17px"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "0.01em"
  body:
    fontFamily: "'Archivo Variable', 'Pretendard Variable', 'Apple SD Gothic Neo', 'Malgun Gothic', system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.5
    fontFeature: "\"tnum\" 1"
  lede:
    fontFamily: "'Archivo Variable', 'Pretendard Variable', 'Apple SD Gothic Neo', 'Malgun Gothic', system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "'Archivo Variable', 'Pretendard Variable', 'Apple SD Gothic Neo', 'Malgun Gothic', system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 700
    letterSpacing: "0.02em"
  column-head:
    fontFamily: "'Archivo Variable', 'Pretendard Variable', 'Apple SD Gothic Neo', 'Malgun Gothic', system-ui, sans-serif"
    fontSize: "11px"
    fontWeight: 700
    letterSpacing: "0.03em"
  hint:
    fontFamily: "'Archivo Variable', 'Pretendard Variable', 'Apple SD Gothic Neo', 'Malgun Gothic', system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 400
  delegation-code:
    fontFamily: "'Big Shoulders Display', 'Black Han Sans', 'Arial Narrow', sans-serif"
    fontSize: "20px"
    fontWeight: 800
    lineHeight: 1
  delegation-name:
    fontFamily: "'Archivo Variable', 'Pretendard Variable', 'Apple SD Gothic Neo', 'Malgun Gothic', system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 550
  flag:
    fontFamily: "'Twemoji Country Flags', 'Segoe UI Emoji', 'Apple Color Emoji', 'Noto Color Emoji', sans-serif"
    fontSize: "18px"
    fontWeight: 400
    lineHeight: 1
rounded:
  hair: "1px"
  sm: "2px"
spacing:
  s1: "4px"
  s2: "8px"
  s3: "12px"
  s4: "16px"
  s5: "24px"
  s6: "32px"
  s7: "48px"
components:
  button-primary:
    backgroundColor: "{colors.signal}"
    textColor: "{colors.signal-ink}"
    typography: "{typography.body}"
    rounded: "{rounded.sm}"
    padding: "0 16px"
    height: "44px"
  button-primary-hover:
    backgroundColor: "{colors.signal-deep}"
    textColor: "{colors.signal-ink}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.bib-ink}"
    rounded: "{rounded.sm}"
    padding: "0 16px"
    height: "44px"
  button-ghost-hover:
    backgroundColor: "{colors.tyvek-lane}"
  button-link:
    backgroundColor: "transparent"
    textColor: "{colors.ink-soft}"
    padding: "0 4px"
    height: "36px"
  button-sm:
    rounded: "{rounded.sm}"
    padding: "0 12px"
    height: "32px"
  input:
    backgroundColor: "{colors.tag-white}"
    textColor: "{colors.bib-ink}"
    rounded: "{rounded.sm}"
    padding: "0 12px"
    height: "44px"
  input-sm:
    backgroundColor: "{colors.tag-white}"
    textColor: "{colors.bib-ink}"
    rounded: "{rounded.sm}"
    padding: "0 8px"
    height: "36px"
  icon-button:
    backgroundColor: "transparent"
    textColor: "{colors.bib-ink}"
    rounded: "{rounded.sm}"
    width: "36px"
    height: "30px"
  exchange-option:
    backgroundColor: "transparent"
    textColor: "{colors.bib-ink}"
    padding: "6px 8px"
  exchange-option-selected:
    backgroundColor: "{colors.bib-ink}"
    textColor: "{colors.tag-white}"
  chip:
    backgroundColor: "transparent"
    textColor: "{colors.bib-ink}"
    rounded: "{rounded.sm}"
    padding: "0 8px"
    height: "24px"
  tab:
    backgroundColor: "transparent"
    textColor: "{colors.ink-muted}"
    typography: "{typography.title}"
    height: "44px"
  tab-active:
    textColor: "{colors.bib-ink}"
  heat-chip:
    backgroundColor: "transparent"
    textColor: "{colors.bib-ink}"
    rounded: "{rounded.sm}"
    padding: "0 10px"
    height: "36px"
  heat-chip-current:
    backgroundColor: "{colors.bib-ink}"
    textColor: "{colors.tag-white}"
  bib-tag:
    backgroundColor: "{colors.tag-white}"
    textColor: "{colors.bib-ink}"
    typography: "{typography.bib-name}"
    padding: "5px 7px 3px"
  bib-team:
    backgroundColor: "{colors.tag-white}"
    textColor: "{colors.bib-ink}"
    typography: "{typography.bib-name}"
    padding: "5px 7px 3px"
  qual-mark-place:
    backgroundColor: "{colors.bib-ink}"
    textColor: "{colors.tag-white}"
    rounded: "{rounded.hair}"
    width: "24px"
    height: "22px"
  qual-mark-time:
    backgroundColor: "transparent"
    textColor: "{colors.bib-ink}"
    rounded: "{rounded.hair}"
    width: "24px"
    height: "22px"
  speed-curve-panel:
    backgroundColor: "{colors.stock}"
    padding: "12px"
  round-summary:
    backgroundColor: "{colors.tag-white}"
    padding: "16px"
  tag-out:
    backgroundColor: "transparent"
    textColor: "{colors.ink-muted}"
    padding: "2px 6px"
---

# Design System: Statcast Sprint

## Overview

**Creative North Star: "Race Bib"**

Every athlete is a race bib. The category default for sports sims, a grey table with a coloured team dot, is refused: the athlete's identity is a white Tyvek tag with a black condensed surname, a thin band of team colour across its top edge and the team code beside it. The same tag runs in the canvas lanes, sits in start lists and results rows, and grows large on the podium. Everything else in the system is the paper the bibs are printed on: an off-white fibre ground, ink rules, and two narrowly assigned colours.

The world is official-meet print, not a broadcast graphics package. Density is high and tabular: times and splits line up in tabular figures, sections are separated by heavy ink rules, not boxed into cards. State is shown in line form (solid versus dashed, filled versus outlined, struck through), so every distinction survives without colour. Colour carries meaning, not decoration. Signal orange is the meet's live band. Official blue marks a number that came from measured data and not from the game's dice.

Mobile portrait comes first (no horizontal scroll at 375px); desktop gets the same composition with wider tables. Korean and English are equal citizens: Hangul has its own self-hosted display and UI faces rather than falling back to a system font.

**Key Characteristics:**
- White bib tags with a 3px team-colour top band are the athlete's only identity mark.
- Tyvek ground (faint fibre noise) between ink rules; panels are ruled sections, not cards.
- Heavy condensed display numerals for names, times, places and headings; a workhorse grotesk for everything else.
- Two meaning-bound colours: signal orange (live/primary band) and official blue (data-derived values).
- Line-form state: solid/dashed, filled/outlined, struck-through.
- Near-square corners (1-2px) everywhere.

## Colors

A warm paper-and-ink neutral system with one orange band and one blue data voice; medal metals appear only at the podium.

### Primary
- **Signal Orange** (signal): the meet's live band. Fills primary buttons (Play, Next heat, Start), underlines the active round tab, runs as the 4px band across the top of the dark top bar, and draws the canvas finish line. It also opens a few sections as a heavy rule (the home heading's 6px bottom rule, the round summary's 4px top rule, the game-side breakdown header) and accents "SPRINT" in the wordmark. Hover deepens to **Signal Deep** (signal-deep); text on orange is **Signal Ink** (signal-ink), never white. **Signal Wash** (signal-soft) tints a selected roster row.

### Secondary
- **Official Blue** (official): data provenance. Marks only values derived from Statcast data: sprint speed, vmax and τ (in the entry roster and the breakdown's data column), the data column's 3px header rule, and the 30m/60m split ticks in the speed strips. In the relay it also colours the squad editor's speed and τ line and the leg detail's vmax. It is also the focus ring colour (2px outline, 2px offset).

### Tertiary
- **Infraction Red** (infraction): illegal wind, false-start flag lines, DQ and DNF labels (on the canvas, in results and in the leg detail), the relay reason line ("2→3 바통 놓침 · 완주 못 함"), the dropped leg's row in the leg detail, and the load-error notice. Text only, never a fill.
- **Medal Gold / Silver / Bronze** (medal-gold, medal-silver, medal-bronze): podium only. Gold also replaces signal as the top rule of the final's summary.

### Neutral
- **Tyvek** (tyvek): page ground, with an SVG fractal-noise fibre texture (about 9% alpha) on the body. Also the canvas track ground and the selected speed strip.
- **Tyvek Lane** (tyvek-lane): alternate canvas lanes, table row dividers, ghost-button hover.
- **Stock** (stock): warm grey card stock for secondary panels; the speed-curve panel sits on it. On the relay canvas it shades the takeover zones at 55% alpha.
- **Hairline** (hairline): 1px borders on chips, team rows, footer and quiet action bars.
- **Tag White** (tag-white): the bib tag face, input fields, opened result rows, team rows, and the round summary sheet.
- **Bib Ink** (bib-ink): text, rules, the dark top bar, selected segments, the Q tag, canvas place badges and podium blocks.
- **Ink Soft** (ink-soft) and **Ink Muted** (ink-muted): secondary text, then labels, hints and column heads. Ink Muted also draws the canvas lane numbers, split ticks and relay exchange lines, and the safe handoff glyph.

### Named Rules
**The Band Rule.** Signal orange marks the live job and section-opening bands: primary action, active tab, top-bar band, finish line, and the heavy rule that opens a section. It never colours a value, a place numeral or a canvas place badge. Places are ink.

**The Provenance Rule.** Official blue means "this number came from data". Sprint speed, vmax, τ and the split ticks are blue. Game values (reaction time, race vmax/τ, wind, form) are ink, even when they sit beside data values.

**The Generated Band Rule.** Team colour is never a real club colour. It is generated from the team code as `oklch(0.58 0.16 <hue>)`, with lightness and chroma fixed so every band reads on white. In nation mode the hue comes from the IOC code, so a country's band is never its flag or kit colour either. It appears only as the bib's top band (and the speed strip's name rule), never as a fill or text colour.

## Typography

**Display Font:** Big Shoulders Display, weights 700 and 800, Latin subset (with self-hosted Black Han Sans for Hangul, then Arial Narrow)
**Body Font:** Archivo Variable (with self-hosted Pretendard Variable for Hangul, then Apple SD Gothic Neo, Malgun Gothic, system-ui)
**Flag Font:** Twemoji Country Flags, a glyph font for flag emoji only (self-hosted woff2 registered through `country-flag-emoji-polyfill`, then Segoe UI Emoji, Apple Color Emoji, Noto Color Emoji). It is not a text face and never sets letters; it exists because Windows has no colour flag glyphs. The artwork is Twemoji, CC-BY 4.0, credited in the footer ("국기 그래픽: Twemoji (CC-BY 4.0)" / "Flag graphics: Twemoji (CC-BY 4.0)").

**Character:** Bib-printing numerals meet a meet-programme grotesk. The condensed display face carries every name, time, place and heading in uppercase. Archivo does the reading work at 15px with tabular figures on by default.

### Hierarchy
- **Display** (800, clamp(44px, 11vw, 88px), 0.92, uppercase, balanced wrap): the home screen's title only.
- **Headline** (800, 36px, 1, uppercase): screen titles.
- **Stage title** (800, 30px rising to 40px at 600px+, 1, uppercase): the "HEATS · HEAT 1" heading above the canvas.
- **Clock** (800, 34px rising to 48px at 600px+, tabular): the running race clock.
- **Title** (800, 22px, uppercase): section and panel titles; the wordmark uses the same size.
- **Time** (800, 22px; small variant 17px; tabular): result times. Place numerals in results use the display face at 20px.
- **Bib name** (800, 17px; 14px small, 34px large): the surname on the bib, uppercased from the data. The team bib sets its team code at 19px.
- **Leg numeral** (800, 28px, display face): the leg number in each relay squad slot.
- **Body** (400, 15px, 1.5): UI text. Lede is 16px, max 40ch, in ink-soft.
- **Label** (700, 13px, 0.02em): form field labels. Buttons are 650 at 15px (13px small).
- **Column head** (700, 11px, 0.03em, ink-muted): table headers over a 1.5px ink rule.
- **Hint** (400, 13px, ink-muted); chips, legends and summary meta at 12px.
- **Delegation code** (800, 20px, 1, display face): the delegation's code at the head of entry and relay-order rows; 18px in the medal table.
- **Delegation name** (550, 12px, ink-muted, UI face, one line with ellipsis): the country name beside the code.
- **Flag** (400, 1, flag font): 18px in the delegation label, 16px leading a team bib, 1.15em before the code in an athlete bib's team slot (nudged -0.1em).

### Named Rules
**The No Fake Bold Rule.** `font-synthesis: none` is set globally. Black Han Sans has a single weight, so Hangul display text stays at its drawn weight rather than being smeared bolder.

**The Lowercase q Rule.** The Q/q qualification marks are set in the UI face at 800, not the display face. In the condensed face a lowercase q reads as g.

**The Reading Name Rule.** A country name is read, not printed on a bib, so it is set in the UI face (550, 12px), never in the condensed display face. Codes are display; names are UI.

## Layout

Single column at every width (`minmax(0, 1fr)` screen grid, 24px gap), centred in a 1080px container with 16px side padding and 24px top / 48px bottom. The home form narrows to 560px; the podium to 760px. The one exception is the relay squad editor at 900px and up (below). The spacing scale is a 4px base (4, 8, 12, 16, 24, 32, 48). Panels pad 16px vertically with no side padding, so their rules run the full content width.

Grids are auto-fill rather than breakpoint-driven: team rows `minmax(min(100%, 330px), 1fr)` (440px in nation mode's entry list, where a row carries flag, code and up to three bibs), summary rows `minmax(min(100%, 250px), 1fr)`, heat chips `minmax(38px, 1fr)`. An opened team row spans the full grid. The entry and relay-order action bars stick to the bottom over Tyvek with a 1.5px ink top rule; the top bar is sticky at the top.

Three breakpoints. At 900px and up, the relay squad editor splits into two columns: legs on the left (`minmax(0, 680px)`), and the estimated team time on the right (`minmax(220px, 1fr)`, 32px gap). The right column is sticky at 72px and opens with a 4px ink rule. At 600px and up, the wide result columns appear (reaction, 30m and 60m for the 100m; lane and Leg 1-4 for the relay), the relay results gain their "추정 구간 기록" / "Est. leg times" group head, the full name shows beside the bib, and the stage title and clock grow. At 420px and below, the long data chip in the top bar is replaced by "샘플 · 시드 n" (or the English equivalent) for sample data, field grids and the breakdown collapse to one column, podium athlete bibs drop the delegation code (the medal table carries it; in nation mode the flag stays), and heat chips drop their check icon.

The canvas race uses a fixed scale per event. The 100m is drawn at 0-100m and the 4×100m at 0-400m. Within an event, every heat and round uses the same scale, so their lengths compare. Lanes are horizontal. The 100m carries dashed 30m/60m ticks; the relay carries exchange marks instead (see Components). Both have a 2px ink start line and a 3px signal finish line, with metre labels under the track at the start, each tick or exchange, and the finish. The canvas has its own width breakpoint: below 560px, lanes shrink from 40px to 30px and the runner tag from 104px to 64px wide.

## Elevation & Depth

Flat. Depth comes from ink rule weight and from paper tone: Tyvek ground, white tag and sheet surfaces laid on it, warm grey stock for secondary panels, and the ink top bar. At rest there is one shadow, and it belongs to the primary button. The only other shadow is a state: it appears on a relay slot while it is being dragged.

### Shadow Vocabulary
- **Button lift** (`box-shadow: 0 1px 2px rgb(18 18 18 / 0.08), 0 4px 12px rgb(18 18 18 / 0.06)`): primary (signal) buttons only.
- **Drag lift** (`box-shadow: 0 6px 18px rgb(18 18 18 / 0.18)`): a relay squad slot while it is held and dragged; it is gone as soon as the slot is dropped.

### Named Rules
**The Ruled Section Rule.** A panel is a span of Tyvek between a 4px ink top rule and a 1px ink bottom rule, with no background, side borders, radius or shadow. Hierarchy comes from rule weight: 4px opens a section, 1.5px heads a table or control, 1px divides.

## Shapes

Near-square. Controls, chips, inputs and segments use a 2px radius; the Q/q tag uses 1px; bib tags, panels, team rows, the canvas frame and the podium blocks are square. Borders do the work: 1.5px ink on controls, inputs, segmented groups, tabs' baseline and the canvas frame; 1px ink on bib tags; 1px hairline on quiet containers. The bib's top band thickens with size (3px default, 5px large), and podium blocks carry a 6px medal band. Disabled choices get a fine -45° hatch, not a grey fill; disabled icon buttons (the first leg's up, the last leg's down) drop to 40% opacity. The relay handoff glyph is pure line: a 12px single 1.5px ink-muted rule for safe, and a double 1.5px ink rule for aggressive.

## Components

### Buttons
Printed, square and plain. Everything is 44px tall.
- **Shape:** gently squared (2px), 1.5px border, 650 weight, 6px icon gap.
- **Primary:** signal fill and border, signal-ink text, button lift shadow, 0 16px padding. One per decision point (Start, Play/Pause, Next heat, To podium). Block width on home and podium.
- **Hover / Focus / Active:** primary hover goes to signal-deep. Focus is a 2px official-blue outline at 2px offset. Active presses down 1px. Transitions run 160ms on `cubic-bezier(0.16, 1, 0.3, 1)` and are removed under reduced motion. Disabled is 40% opacity.
- **Ghost:** transparent with a 1.5px ink border; hover fills tyvek-lane. In the top bar it inverts (paper text, dark grey border).
- **Link:** borderless, underlined (3px offset), ink-soft, 36px tall; for secondary escapes like "skip remaining heats" and "reset".
- **Small:** 32px tall, 13px, 0 12px padding (the KO/EN toggle).
- **Icon button:** 36 × 30px, 1.5px ink border, 2px radius, transparent, a 16px authored icon. The up and down pair sits beside each relay slot. Disabled is 40% opacity.

### Chips
- **Style:** 24px, 1px hairline border, 2px radius, 12px text, tabular figures, ellipsis overflow. Used in the top bar for data source and seed, toned down to #c9c6bc text on a #3a3935 border over ink.

### Heat Chips
Line-form state: a heat chip shows whether you have watched that heat.
- **Unwatched:** 1.5px dashed ink-muted border, transparent.
- **Watched:** solid ink border, with a check icon on wider screens.
- **Current:** solid ink fill, white text.

### Inputs / Fields
- **Style:** tag-white field, 1.5px ink border, 2px radius, 44px tall, 0 12px padding; the seed input adds tabular figures and 0.02em tracking. Placeholder #77736a.
- **Focus:** the global 2px official-blue outline.
- **Mode choice:** a two-cell segmented control in a 1.5px ink frame with an ink divider; the checked cell fills ink with white text. A disabled cell is hatched.
- **Exchange choice:** the relay's safe / aggressive control uses the same grammar. Each cell stacks a 13px 700 title over an 11px ink-muted line ("entry 80% · fail 1%" / "진입 80% · 실패 1%"). The checked cell fills ink with white text, and its detail line turns pale (#cfcbc1). The label above it reads "1→2 바통 터치" / "1→2 exchange" in 12px 700.
- **Small select:** 36px tall, 13px, 0 8px padding. It is the relay runner picker, and its options read "name · 추정 12.56" / "name · Est. 12.56".

### Navigation
- **Top bar:** sticky, ink ground, 4px signal top band, 48px minimum. Wordmark "STATCAST" plus "SPRINT" in signal, set in the display face at 22px. Meta chips and the KO/EN toggle sit at the right.
- **Round tabs:** equal-width, 44px, display face 18px uppercase, ink-muted. The active tab turns ink with a 4px signal underline that overlaps the 1.5px ink baseline.
- **Segmented speed (1× / 2×; the relay adds 4×):** 1.5px ink frame, pressed segment filled ink.

### Bib Tag (signature)
The athlete's identity everywhere.
- **Anatomy:** tag-white face, 1px ink border, 3px top band in the generated team colour, uppercase surname in the display face at 800, and the delegation code at right (650, 10px, ink-muted, 0.04em). In nation mode the code is the IOC three-letter code and its flag sits just before it in the same slot.
- **Sizes:** small 14px name, default 17px, large 34px with a 5px band (podium; it scales down to clamp(16px, 5.4vw, 34px) when narrow).
- **On canvas:** the same tag is drawn as the runner (white face, 3px band, 1px ink stroke). Wide canvases show the surname plus the team code at right. Below 560px, the team code is dropped. In the relay, the tag shows the current runner's surname plus the team code on wide canvases, and the team code alone below 560px. After the runner finishes, an ink square place badge with a white numeral appears.
- **DQ / DNF:** the name is struck through (2px) and the tag fades to 55% opacity (50% on canvas). A DQ tag stays at the start line; a DNF relay tag stops where the baton fell. On canvas, "DQ" or "DNF" is set right of the tag in the display face at 800 in infraction red, as text and never a filled badge.
- **In a delegation's own row:** where the row head already names the delegation (the entry list), bibs drop the team slot entirely, flag and code both, so the identity is not printed twice.
- **Team bib:** the relay's team identity. It is the same tag with the team code in the name slot (19px) and no separate code. In nation mode the flag leads it at 16px, before the code. It appears in relay results, start lists, round summaries and the relay podium.
- **Canvas flags:** none. Runner tags on the track stay code-only in both modes.

### Qualification Marks
- **Q (by place):** a solid ink tag with a white letter, 24 × 22px, 1px radius.
- **q (by time):** the same tag with a 1.5px dashed ink outline and an ink letter. Both are set in the UI face at 800, 14px.

### Results and Breakdown
The results table has ink column heads over a 1.5px rule and tyvek-lane row dividers. A row hovers and opens to tag-white. The opened detail row closes with a 1.5px ink rule. The breakdown pairs two definition lists: **Data**, headed with a 3px official rule and showing blue values, and **This race (game)**, headed with a 3px signal rule and showing ink values. Game deltas from the data value appear in small ink-muted text.

Relay results use the same table with a team bib in place of the athlete. Under each bib is a sub-line with the four surnames, or for a DNF/DQ team the reason ("2→3 바통 놓침 · 완주 못 함", "1번 주자 부정출발 · 실격") in infraction red. The time cell shows "DNF" or "DQ" in infraction red in the display face. At 600px and up, a centred group head "추정 구간 기록" / "Est. leg times" sits over the Leg 1-4 columns on a 1.5px ink-muted rule. Every time is labelled estimated: the time column ("추정 기록" / "Est. time"), the leg columns through their group head, and the leg detail's "추정 구간 기록" and "추정 누적" heads. The opened leg detail lists leg numeral (display 16px), surname (display 15px) with its blue vmax, exchange in, entry speed, leg time and cumulative. The dropped leg's row is infraction red with "DNF" as its leg time, and legs that never ran show "–".

### Speed Strips
A figure on stock, with a 1.5px ink top rule and 12px padding. There is one 26px strip per runner: name with a team-band top rule, a polyline in ink-muted (the selected runner is 2.5px ink on a Tyvek row), 30m/60m split ticks in official blue, and the time in the display face at 15px. Faint grid lines are drawn at 10% ink.

### Relay Squad Editor
An opened relay team row in the order list. The closed row reads the delegation label (flag and code, no name), then the four surnames in the display face at 14px joined by handoff glyphs, an "Edited" / "편집됨" outline tag when changed, the "Not qualified" tag for a team outside the cut (see Qualification Cut), the squad's estimated team time in the display face at 15px in ink-soft, and the chevron. The time stays on every closed row because it is the value the cut is made on.
- **Slot:** a 36px / 26px / 1fr / 36px grid on white with 8px vertical padding. From left to right: a grip handle (authored 6-dot icon, ink-muted, grab cursor), the leg numeral, then the runner column, then the up/down icon-button pair. The runner column stacks the small bib followed inline by its role (11px ink-muted: "출발 · 정지 출발", "플라잉 출발", "앵커 · 플라잉 출발"), the small select, and below the select the 12px official-blue data line ("스피드 28.9 ft/s · τ 1.03 s").
- **Between slots:** each exchange choice sits in a band, indented 44px to clear the grip column, between solid 1px hairline dividers.
- **Foot:** "추정 팀 기록" / "Est. team time" as a hint beside the time in the display face, and a link button back to the default order when edited. Below 900px it sits under the legs on a 1.5px ink rule; at 900px and up it becomes the sticky right column (see Layout).

### Delegation Label
The delegation's identity at the head of a row: flag, then code, then (where allowed) the name, on one baseline with a 6px gap and no wrapping.
- **Code:** delegation-code type (display face, 800, 20px; 18px in the medal table). In nation mode it is the IOC three-letter code (USA, DOM, PUR, TPE); ISO 3166-1 alpha-2 is used only to build the flag emoji. A country missing from the table falls back to the first three letters of its English name and no flag.
- **Flag:** flag font at 18px, centred against the code.
- **Name:** delegation-name type (UI face, 550, 12px, ink-muted), ellipsised when long. It appears only in an opened entry row and in the medal table; closed entry rows and relay-order rows show flag and code only. In team mode the name equals the code and is not shown.
- **Width:** the label column sizes to content, from 40px to at most 45% of the row.

**The Code Is The Identity Rule.** In a band, a bib or a row head, the three-letter code names the delegation. The flag rides beside it and never stands in for it. The one exception is the podium at 420px and below, where athlete bibs keep the flag and drop the code because the medal table carries it.

### Qualification Cut
The relay order lists every delegation with a full squad. Only the top 16 by expected team time qualify; the rest stay in the list, sorted last, and read as out in line form, not colour.
- **Out row:** the row head text drops to ink-muted. Nothing is tinted, struck or hidden, and the squad can still be opened and edited.
- **Out tag:** "출전권 밖" / "Not qualified", 11px 700, 2px 6px padding, square, a 1.5px dashed ink-muted outline and ink-muted text. It is the dashed counterpart of the solid ink "Edited" tag.

**The Uncoloured Cut Rule.** Missing the cut is a quiet state, so it gets ink-muted and a dashed outline, never a colour. Orange stays for primary actions and in-progress state, blue for data values, and red for infractions; missing the cut is not one.

### Handoff Glyph
In lists (closed squad rows and the relay start list), the exchange between two surnames is drawn as a line, never coloured. Safe is a single ink-muted rule; aggressive is a double ink rule.

### Round Summary
A tag-white sheet with a 1px hairline border, a 4px signal top rule (medal gold for the final) and 16px padding. Inside is an auto-fill list of bib, time and Q/q rows. In the relay, teams that did not finish follow as a list of struck team bibs, each with its reason in 12px 600 infraction red.

### Podium
The medal screen is headed "대회 결과" / "Meet results" (headline). Below it come the 100m podium, then the 4×100m podium, then the combined medal table as a ruled panel. Each podium is a three-step stand ordered 2-1-3. Each step carries a bib, the name in 12px ink-soft, the time in the display face at 26px over a 10px "Estimated" label, and an ink block with a 6px medal band (132 / 96 / 72px tall). The 100m uses large athlete bibs; the relay uses team bibs, with the four runner surnames wrapping beneath. In the medal table, the team code is set in the display face at 18px.

### Icons
Authored SVG icons on a 20px grid with a 1.75 stroke and round caps and joins, in currentColor: play, pause, skip, replay, next, prev, check, grip (six 2.5-stroke dots), up, down. No icon fonts or glyph characters.

## Do's and Don'ts

### Do:
- **Do** render every athlete as a bib tag (white face, 1px ink border, 3px generated team band, uppercase display surname, team code) in lanes, rows, strips and podium alike.
- **Do** keep signal orange (#e5431b) for primary buttons, the active tab underline, the top-bar band, the finish line and section-opening rules; put signal-ink (#1a0a04) text on it.
- **Do** colour only data-derived values official blue (#1d3fbf): sprint speed, vmax, τ, split ticks. Game values stay ink.
- **Do** carry state in line form: solid Q tag versus dashed q tag, solid watched heat chip versus dashed unwatched, struck-through and faded DQ/DNF bib, single versus double handoff glyph.
- **Do** build sections as ruled Tyvek: 4px ink top rule, 1px ink bottom rule, no fill.
- **Do** set numerals in Big Shoulders Display with tabular figures, and Hangul through the self-hosted Black Han Sans and Pretendard Variable; keep `font-synthesis: none`.
- **Do** fix the canvas scale per event across all its heats and rounds: 0-100m for the 100m and 0-400m for the 4×100m. Mark each 100m exchange with a solid ink-muted line, and shade a stock takeover zone from 20m before it to 10m after (World Athletics' 30m zone; the numbers live in `RULES.RELAY_TAKEOVER_ZONE_M`).
- **Do** label every relay time as estimated.
- **Do** name a delegation by its code, with the flag beside it in nation mode; show the country name only in opened entry rows and the medal table, in the UI face (550, 12px).
- **Do** mark a team outside the relay cut with ink-muted text and the dashed "Not qualified" tag, sorted last.

### Don't:
- **Don't** use real MLB team colours or logos; team colour is generated (`oklch(0.58 0.16 h)`) and lives only in the band.
- **Don't** colour place numerals, canvas place badges or game values with signal orange or official blue.
- **Don't** wrap sections in rounded, shadowed cards. At rest, the only shadow is the primary button's lift; the drag lift exists only while a slot is held.
- **Don't** round corners beyond 2px.
- **Don't** use colour as the only signal for qualification, DQ, DNF, handoff or watched state.
- **Don't** put DQ or DNF in a filled badge; they are infraction-red text in the display face beside a struck, faded tag.
- **Don't** set the lowercase q mark in the condensed display face.
- **Don't** use icon fonts or text glyphs as icons; use the authored 20px stroke set. Flag emoji are identity marks set in the flag font beside a delegation code, not icons.
- **Don't** let a flag replace the code (except podium athlete bibs at 420px and below), set a country name in the display face, or repeat the flag and code on bibs inside their own delegation's row.
- **Don't** colour an out-of-cut row or its tag; orange, blue and red keep their meanings.
