# Driving Statistics Teaser

Animated teaser card: a terrain map, an odometer-style number and rising red bars,
waiting for the user to hit **Generate Driving Statistics**.

## Behaviour

- **Idle** – the number softly cross-fades to a new random distance every few
  seconds: the old value drifts up and blurs out while the new one rises into
  place. Values are drawn log-uniformly from `data-min`…`data-max`, so three-,
  four- and five-digit distances appear about equally often.
- **Shooting stars** – thin red streaks appear low, rise slowly, decelerate
  and burn out (pure CSS keyframes).
- **Generate** – the counter fades to the final value from `data-value`.
- **Reduced motion** – with `prefers-reduced-motion: reduce` the final number
  is rendered statically and the streaks are drawn once.
- Cycling pauses while the card is off-screen.

## Usage

```html
<section class="teaser" data-teaser data-value="2168" data-min="100" data-max="50000" data-unit="km">…</section>
```

`data-value` is the final number, `data-min`/`data-max` the range the idle
values are drawn from (digits only, thousands separator is added), `data-unit`
the unit label. See `index.html` for the full markup, `src/teaser.ts` for the
component and `src/counter.ts` for the cross-fade logic.

## Development

```bash
npm install
npm run dev
npm run build
```

## Notes

- `public/assets/map-placeholder.png` is cropped from the design screenshot and
  should be replaced by the real map asset.
- The font stack falls back to Helvetica/Arial; swap `--font-sans` in
  `src/style.css` for the brand font.
