# MCAP — Pennsylvania county outlook

Live county map and dashboards for the MCAP 2028 model. Static site: plain
HTML, CSS and JavaScript, no build step, no server, no external libraries.
Hosts on GitHub Pages; also runs by double-clicking `index.html`.

## Deploy on GitHub Pages

1. Create a repository (say `mcap-pa`) and push this folder to `main`.
2. Repository → Settings → Pages → Source: *Deploy from a branch* → `main`, `/ (root)` → Save.
3. After about a minute the site is at `https://<username>.github.io/mcap-pa/`.

Every later data update is: run the build tool, commit, push.

## Using the site

- The timeline above the map steps through every completed cycle and then the
  projection year. Picking a past year recolors the map with that cycle's
  **actual result** and rebuilds the dashboard around it: the big numbers become
  that year's margin and its change from the previous cycle, the education chart
  marks that year, the historic-margin chart highlights it, and a county is
  classified red/blue/purple on that year's result — so the panel set follows the
  year too. The colour scale spans every year at once, so a shade means the same
  margin in 2012 as it does in the projection year.
- Only margins and education attainment exist per year. Density, elasticity,
  national mood, vulnerability, enthusiasm and registration are single
  projection-year model values: their tabs are disabled on a past year and the
  dashboard says so, rather than implying the numbers are historical.
- Tabs switch what the map is colored by: projected margin, red/blue/purple
  classification, swing (base → projected), density, elasticity, vulnerability.
- Under the map, a single scale bar reads the metric end to end — More
  Republican → More Democratic for the margin views, low → high for the
  score views — in place of the old swatch legend.
- Hover a county for its value; click it (or use the search box, or the
  "closest counties" list) to open its dashboard. Esc returns to the
  statewide view.
- The dashboard follows `MCAP__Dashboard_Variables.docx`. Red and blue
  counties show the top row and education; purple counties (projected margin
  inside 5 points) add enthusiasm, registration, vulnerability and historic
  margins.
- The URL tracks the state (`#view=swing&year=2016&county=Erie`), so a link
  opens the page on a specific county, view and year.
- *Download map* saves the current map as PNG. *Print dashboard* prints the
  dashboard alone (choose "Save as PDF" in the print dialog for a file).

## Brand font

The page asks for **Proxinovo** (Mercyhurst style guide) and falls back to
Barlow until it is present. Drop the licensed web fonts into `css/fonts/` as:

```
css/fonts/proxinovo-regular.woff2     400
css/fonts/proxinovo-medium.woff2      500
css/fonts/proxinovo-semibold.woff2    600
css/fonts/proxinovo-bold.woff2        700
```

No other change is needed — every heading, number and map label picks them up.
Until they are added the browser console logs a 404 for each missing file.

## Loading your data

Put the three tables in a folder (or three sheets in one workbook) and run:

```
pip install pandas openpyxl
python tools/build_data.py --input path/to/folder      # or path/to/workbook.xlsx
```

The tool checks every county is present, values are inside their scales and
years are complete, then writes `data/mcap_data.js`. Commit that file. If the
source uses positive = Republican, add `--flip-sign`.

Column names are matched loosely (case, spaces and underscores ignored). Any
of the aliases in `tools/build_data.py` work; the canonical names are:

**county_metrics** — one row per county

| column | meaning | scale |
| --- | --- | --- |
| county | county name, without "County" | matches the map |
| logpwd | Population Density Score | 0–10 |
| elasticity | Elasticity Score | 0–2 |
| macrotide | National Mood Impact | −5 to 5 |
| basemarg | Base Margin, points, labelled with `meta.base_year` | +D / −R |
| projmarg | Projected Margin 2028, points | +D / −R |
| vulcomposite | Economic Vulnerability composite | 0–100 |
| anxiety_tier | Local Anxiety Risk Tier | Low, Moderate, Elevated, High |
| turnout_d_2024, turnout_r_2024 | party turnout rate 2024 | % |
| turnout_d_2026, turnout_r_2026 | party turnout rate 2026 | % |
| reg_net_d, reg_net_r, reg_net_i | net registration change, D / R / I-other | registrants |

**education_series** — one row per county-year, 2012–2028

| column | meaning |
| --- | --- |
| county, year | |
| cnty_edu_pct | CNTYEDU%, county attainment |
| st_edu_pct | STEDU%, state attainment |

**historic_margins** — one row per county-cycle, 2012, 2014 … 2024. These
rows are what the timeline steps through, so every county needs every cycle.

| column | meaning |
| --- | --- |
| county, year | |
| margin | result, points, +D / −R |

`tools/demo_input/` holds fabricated sample tables in exactly this shape. The
page shows a "Demo data" chip while it is built from them; it disappears when
you build from your own input.

## Layout of the repo

```
index.html          page
css/style.css      page styles, brand font, animations
css/fonts/          Proxinovo web fonts (not in the repo, see above)
js/colors.js        palette, margin ramp, formatting
js/panels.js        dashboard panels (SVG) and statewide summary
js/map.js           choropleth, legend, PNG export
js/app.js           state, tabs, search, URL hash
data/mcap_data.js   generated: geometry + all three tables
tools/build_data.py data build and validation
tools/pa_counties.geojson   US Census county boundaries with FIPS / PennDOT codes
tools/demo_input/   sample tables
```

Boundaries are US Census county geography; the squares in
`MCAP__PA_County_GeoJSON.xlsx` are only centroid boxes and are not used.
Margins are percentage points, positive = Democratic, throughout.
