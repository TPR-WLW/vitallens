import { describe, it, expect } from 'vitest';

/**
 * Accessibility contract tests.
 * These validate that key ARIA attributes and roles are present
 * in the component JSX source code, acting as a lightweight
 * static analysis layer without requiring a full DOM renderer.
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

const componentsDir = resolve(import.meta.dirname, '../../components');

function readComponent(name) {
  return readFileSync(resolve(componentsDir, name), 'utf-8');
}

describe('accessibility attributes', () => {
  describe('OnboardingOverlay', () => {
    const src = readComponent('OnboardingOverlay.jsx');

    it('has role="dialog" and aria-modal', () => {
      expect(src).toContain('role="dialog"');
      expect(src).toContain('aria-modal="true"');
    });

    it('has aria-label on overlay', () => {
      expect(src).toContain('aria-label={');
    });

    it('supports Escape key to skip', () => {
      expect(src).toContain("e.key === 'Escape'");
    });

    it('has aria-label on skip and next buttons', () => {
      expect(src).toContain('aria-label="ガイドをスキップ"');
      expect(src).toMatch(/aria-label=\{isLastStep/);
    });
  });

  describe('StartScreen', () => {
    const src = readComponent('StartScreen.jsx');

    it('has role="main"', () => {
      expect(src).toContain('role="main"');
    });

    it('has role="radiogroup" on mode selector', () => {
      expect(src).toContain('role="radiogroup"');
    });

    it('has role="radio" and aria-checked on mode buttons', () => {
      expect(src).toContain('role="radio"');
      expect(src).toContain('aria-checked=');
    });

    it('has role="checkbox" and aria-checked on checklist items', () => {
      expect(src).toContain('role="checkbox"');
      expect(src).toContain('aria-checked=');
    });

    it('has role="alert" on error message', () => {
      expect(src).toContain('role="alert"');
    });

    it('supports keyboard toggle on checklist items', () => {
      expect(src).toContain("e.key === 'Enter'");
      expect(src).toContain("e.key === ' '");
    });

    it('supports Escape key to go back', () => {
      expect(src).toContain("e.key === 'Escape'");
    });
  });

  describe('MeasureScreen', () => {
    const src = readComponent('MeasureScreen.jsx');

    it('has role="main"', () => {
      expect(src).toContain('role="main"');
    });

    it('has aria-live on status text', () => {
      expect(src).toContain('aria-live="polite"');
    });

    it('has role="progressbar" on progress bar', () => {
      expect(src).toContain('role="progressbar"');
    });

    it('has aria-valuenow on progress bar', () => {
      expect(src).toContain('aria-valuenow=');
    });

    it('has role="meter" on SQI bar', () => {
      expect(src).toContain('role="meter"');
    });

    it('has aria-label on cancel button', () => {
      expect(src).toContain('aria-label="計測を中止"');
    });

    it('supports Escape key to cancel', () => {
      expect(src).toContain("e.key === 'Escape'");
    });

    it('has auto-pause feature constants', () => {
      expect(src).toContain('FACE_LOST_PAUSE_DELAY');
    });
  });

  describe('CameraView', () => {
    const src = readComponent('CameraView.jsx');

    it('has role="img" on camera container', () => {
      expect(src).toContain('role="img"');
    });

    it('has aria-hidden on video element', () => {
      expect(src).toContain('aria-hidden="true"');
    });

    it('has aria-live on face guide text', () => {
      expect(src).toContain('aria-live="polite"');
    });

    it('has paused overlay with role="alert"', () => {
      expect(src).toContain('measure-paused-overlay');
      expect(src).toContain('role="alert"');
    });
  });

  describe('ResultScreen', () => {
    const src = readComponent('ResultScreen.jsx');

    it('has role="main"', () => {
      expect(src).toContain('role="main"');
    });

    it('has aria-expanded on detail toggle', () => {
      expect(src).toContain('aria-expanded=');
    });

    it('has aria-controls on detail toggle', () => {
      expect(src).toContain('aria-controls="detail-section"');
    });
  });
});

describe('CSS accessibility features', () => {
  const css = readFileSync(resolve(import.meta.dirname, '../../styles/app.css'), 'utf-8');

  it('has focus-visible styles', () => {
    expect(css).toContain(':focus-visible');
  });

  it('has sr-only utility class', () => {
    expect(css).toContain('.sr-only');
  });

  it('has auto-pause overlay styles', () => {
    expect(css).toContain('.measure-paused-overlay');
  });

  it('has calibration-done animation', () => {
    expect(css).toContain('.calibration-done');
    expect(css).toContain('@keyframes calibration-flash');
  });

  it('has tablet breakpoint (768px-1023px)', () => {
    expect(css).toContain('(min-width: 768px) and (max-width: 1023px)');
  });

  it('has desktop breakpoint (1024px+)', () => {
    expect(css).toContain('(min-width: 1024px)');
  });
});
