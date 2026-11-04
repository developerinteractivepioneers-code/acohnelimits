# Driving Statistics Teaser

Animated teaser card: a terrain map, an odometer-style number and rising red bars,
waiting for the user to hit **Generate Driving Statistics**.

## Behaviour

- **Idle** – every digit is a reel driven by an underdamped spring that keeps
  re-targeting a random position around its final digit. Leading digits wander
  little and slowly, trailing digits a lot and fast, so the number visibly
  "searches" without settling. Neighbouring digits are shown as faded ghosts.
- **Bars** – five thin bars grow upwards with a fading tail, each on its own
  duration and phase (pure CSS keyframes).
- **Generate** – reels spin to the final value from left to right with a small
  overshoot, ghosts are clipped away, bars do one last rise and stay.
- **Reduced motion** – with `prefers-reduced-motion: reduce` the final number is
  rendered statically and the bars are drawn once.
- The animation loop pauses while the card is off-screen.

## Usage

```html
<section class="teaser" data-teaser data-value="2168" data-unit="km">…</section>
```

`data-value` is the final number (digits only, thousands separator is added),
`data-unit` the unit label. See `index.html` for the full markup and
`src/teaser.ts` for the component.

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
