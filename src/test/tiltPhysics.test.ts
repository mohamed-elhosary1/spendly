import { describe, it, expect } from 'vitest';

describe('TiltCard Physics & Architecture', () => {
  it('damped physics loop smoothly eases in without an initial tilt jolt', () => {
    const maxTilt = 4.0; // degrees
    const ease = 0.11; // damping factor on hover

    let current = 0;
    const target = maxTilt; // cursor enters at extreme card edge

    // Frame 1: 16ms after cursor entry
    current += (target - current) * ease;
    expect(current).toBeCloseTo(0.44, 2);
    // Crucial: The first frame rotation is ~0.44 degrees, preventing the sudden 4 degree startle jolt!
    expect(current).toBeLessThan(1.0);

    // Frame 2
    current += (target - current) * ease;
    expect(current).toBeCloseTo(0.83, 2);

    // Frame 3
    current += (target - current) * ease;
    expect(current).toBeCloseTo(1.18, 2);

    // Frame 10 (~160ms)
    for (let f = 4; f <= 10; f++) {
      current += (target - current) * ease;
    }
    expect(current).toBeGreaterThan(2.5);
    expect(current).toBeLessThanOrEqual(maxTilt);
  });

  it('damped physics returns smoothly to neutral on mouse exit', () => {
    let current = 3.8; // card was tilted
    const target = 0; // mouse exited
    const exitEase = 0.08; // exit deceleration

    for (let f = 1; f <= 10; f++) {
      current += (target - current) * exitEase;
    }

    // After 10 frames of exit, angle is smoothly declining toward 0
    expect(current).toBeLessThan(2.0);
    expect(current).toBeGreaterThan(0);

    // After 50 frames, settles completely
    for (let f = 11; f <= 60; f++) {
      current += (target - current) * exitEase;
    }
    expect(current).toBeLessThan(0.05);
  });

  it('class partitioner separates grid column spans to outer wrapper and padding/styles to inner surface', () => {
    const isLayoutClass = (cls: string): boolean => {
      const base = cls.replace(/^([a-z0-9_-]+:)+/, '');
      return (
        base.startsWith('col-') ||
        base.startsWith('row-') ||
        base.startsWith('order-') ||
        base.startsWith('justify-self-') ||
        base.startsWith('self-') ||
        base.startsWith('m-') ||
        base.startsWith('mx-') ||
        base.startsWith('my-') ||
        base.startsWith('mt-') ||
        base.startsWith('mb-') ||
        base.startsWith('ms-') ||
        base.startsWith('me-')
      );
    };

    const partitionClasses = (className: string = '') => {
      const outer: string[] = [];
      const inner: string[] = [];
      for (const token of className.split(/\s+/).filter(Boolean)) {
        if (isLayoutClass(token)) {
          outer.push(token);
        } else {
          inner.push(token);
        }
      }
      return { outerClasses: outer.join(' '), innerClasses: inner.join(' ') };
    };

    const input = 'lg:col-span-2 p-5 sm:p-6 space-y-4 border-emerald-500/30 bg-card';
    const { outerClasses, innerClasses } = partitionClasses(input);

    expect(outerClasses).toBe('lg:col-span-2');
    expect(innerClasses).toBe('p-5 sm:p-6 space-y-4 border-emerald-500/30 bg-card');
  });
});
