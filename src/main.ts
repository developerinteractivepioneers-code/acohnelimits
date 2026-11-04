import { DrivingStatsTeaser } from './teaser';

const root = document.querySelector<HTMLElement>('[data-teaser]');
if (!root) {
  throw new Error('Teaser root not found');
}

const teaser = new DrivingStatsTeaser(root);

document.querySelector<HTMLButtonElement>('[data-reset]')?.addEventListener('click', () => teaser.reset());
