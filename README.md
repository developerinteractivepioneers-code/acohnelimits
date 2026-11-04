# Driving Statistics Teaser

Animated teaser card: a terrain map, an odometer-style number and rising red bars,
waiting for the user to hit **Generate Driving Statistics**.

## Behaviour

- **Idle** – the card cycles through a list of metrics (distance, routes,
  curves, driving time, lateral G, elevation gain). For each one a random
  value, its unit and its claim ("Ready to explore your curves?") cross-fade
  in together: the old text drifts up and blurs out while the new one rises
  into place. Values are drawn log-uniformly from each metric's range, so
  small and large numbers appear about equally often.
- **Fit to value** – the right column is only as wide as the current number
  and unit. The map keeps a fixed size and is clipped at the divider, so for
  short values the divider wipes right and reveals more terrain, animated in
  step with the cross-fade.
- **Shooting stars** – thin red streaks appear low over the digits, rise
  slowly, decelerate and burn out (pure CSS keyframes). They are positioned
  inside the number box, so they follow its width; over short numbers every
  other streak is hidden.
- **Generate** – fades to the final value from `data-value` on the first
  metric and stops.
- **Reduced motion** – with `prefers-reduced-motion: reduce` the final number
  is rendered statically and the streaks are drawn once.
- Cycling pauses while the card is off-screen.

## Usage

```html
<section class="teaser" data-teaser data-value="2168">
  …
  <p class="teaser__claim" data-claim>Ready to drive to your numbers?</p>
  <script type="application/json" data-metrics>
    [
      { "claim": "Ready to explore your kilometres?", "unit": "km", "min": 100, "max": 50000 },
      { "claim": "Ready to explore your lateral G?", "unit": "g", "min": 0.3, "max": 1.2, "decimals": 1 }
    ]
  </script>
  …
</section>
```

Each metric has a `claim`, a `unit` (empty for plain counts), the `min`/`max`
range idle values are drawn from and optional `decimals`. Numbers are
formatted with a thousands dot and a decimal comma. `data-value` is the final
number shown after the click. See `index.html` for the full markup,
`src/teaser.ts` for the component, `src/fade-text.ts` for the cross-fade and
`src/metrics.ts` for parsing and formatting.

## Development

```bash
npm install
npm run dev
npm run build
```

## Notes

- `public/assets/map.png` is shown at 247 px width (`--map-width` in
  `src/style.css`); supply it at least at 2× that size, and wider on the
  right if more terrain should be revealed.
- The font stack falls back to Helvetica/Arial; swap `--font-sans` in
  `src/style.css` for the brand font.
