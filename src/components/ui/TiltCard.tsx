import React, { useRef, useState, useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils';

export interface TiltCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  containerClassName?: string;
  maxTilt?: number; // Maximum rotation in degrees (3-5deg recommended)
  glowColor?: string; // RGB values for cursor lighting: '16, 185, 129' (emerald), '244, 63, 94' (rose), etc.
  showGlow?: boolean;
}

/**
 * Helper to split layout/grid positioning classes from card presentation classes.
 * Ensures grid positioning (e.g. col-span-2) attaches to the outer perspective wrapper,
 * while borders, backgrounds, padding, and spacing stay on the tilt surface.
 */
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

/**
 * TiltCard: Premium 3D perspective card with:
 * 1. Damped physics loop via requestAnimationFrame (completely eliminates initial entry startle/jolt).
 * 2. Dedicated ambient under-glow and elevation shadow (eliminates sudden black shadow pop-in).
 * 3. Cursor-following radial lighting via CSS custom properties (zero React re-renders while moving).
 * 4. Separate responsibilities: Outer perspective wrapper, ambient shadow layer, 3D tilt surface, content.
 * 5. Automatic touch device and reduced-motion fallback.
 */
export const TiltCard = React.forwardRef<HTMLDivElement, TiltCardProps>(
  (
    {
      children,
      className,
      containerClassName,
      maxTilt = 3.5,
      glowColor = '16, 185, 129',
      showGlow = true,
      onMouseMove,
      onMouseEnter,
      onMouseLeave,
      style,
      ...props
    },
    forwardedRef
  ) => {
    const wrapperRef = useRef<HTMLDivElement | null>(null);
    const surfaceRef = useRef<HTMLDivElement | null>(null);

    const [isHovered, setIsHovered] = useState(false);
    const [canHover, setCanHover] = useState(true);

    // Physics state ref (avoids React re-renders on mouse movement)
    const anim = useRef({
      currentX: 0,
      currentY: 0,
      currentScale: 1,
      targetX: 0,
      targetY: 0,
      targetScale: 1,
      rafId: 0,
      isHovered: false,
    });

    // Check device capabilities and reduced motion
    useEffect(() => {
      const isTouch = !window.matchMedia('(hover: hover)').matches;
      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      setCanHover(!isTouch && !reducedMotion);
    }, []);

    // Clean up any running animation frame on unmount
    useEffect(() => {
      return () => {
        if (anim.current.rafId) {
          cancelAnimationFrame(anim.current.rafId);
        }
      };
    }, []);

    // Physics tick loop
    const tick = useCallback(() => {
      const a = anim.current;
      const surface = surfaceRef.current;
      if (!surface) return;

      // Damping constants:
      // 0.11 provides smooth, cushioned ease-in on entry (eliminates the startle jolt)
      // while feeling crisp and responsive during fast mouse movement.
      // 0.08 on exit provides a luxurious, organic deceleration back to resting state.
      const ease = a.isHovered ? 0.11 : 0.08;

      a.currentX += (a.targetX - a.currentX) * ease;
      a.currentY += (a.targetY - a.currentY) * ease;
      a.currentScale += (a.targetScale - a.currentScale) * ease;

      // Apply 3D transform directly to the tilt surface (No React re-renders)
      surface.style.transform = `rotateX(${a.currentX.toFixed(3)}deg) rotateY(${a.currentY.toFixed(3)}deg) scale3d(${a.currentScale.toFixed(4)}, ${a.currentScale.toFixed(4)}, ${a.currentScale.toFixed(4)})`;

      // Check whether movement has settled
      const deltaX = Math.abs(a.targetX - a.currentX);
      const deltaY = Math.abs(a.targetY - a.currentY);
      const deltaScale = Math.abs(a.targetScale - a.currentScale);

      const isMoving = deltaX > 0.005 || deltaY > 0.005 || deltaScale > 0.0005;

      if (isMoving || a.isHovered) {
        a.rafId = requestAnimationFrame(tick);
      } else {
        // Settle cleanly to exact resting coordinates
        a.currentX = 0;
        a.currentY = 0;
        a.currentScale = 1;
        surface.style.transform = 'rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
        a.rafId = 0;
      }
    }, []);

    const startAnimLoop = useCallback(() => {
      if (!anim.current.rafId) {
        anim.current.rafId = requestAnimationFrame(tick);
      }
    }, [tick]);

    const handlePointerEnter = useCallback(
      (e: React.PointerEvent<HTMLDivElement>) => {
        if (!canHover) return;

        const wrapper = wrapperRef.current;
        if (!wrapper) return;

        anim.current.isHovered = true;
        setIsHovered(true);

        const rect = wrapper.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const clampedX = Math.max(0, Math.min(rect.width, x));
        const clampedY = Math.max(0, Math.min(rect.height, y));

        const normalizedX = (clampedX / rect.width) * 2 - 1;
        const normalizedY = (clampedY / rect.height) * 2 - 1;

        // Set target coordinates (current starts from 0 or its current position, easing in smoothly)
        anim.current.targetX = -(normalizedY * maxTilt);
        anim.current.targetY = normalizedX * maxTilt;
        anim.current.targetScale = 1.012; // subtle premium elevation

        // Update spotlight position
        const pctX = (clampedX / rect.width) * 100;
        const pctY = (clampedY / rect.height) * 100;
        if (surfaceRef.current) {
          surfaceRef.current.style.setProperty('--mouse-x', `${pctX.toFixed(1)}%`);
          surfaceRef.current.style.setProperty('--mouse-y', `${pctY.toFixed(1)}%`);
        }

        startAnimLoop();

        if (onMouseEnter) {
          onMouseEnter(e as any);
        }
      },
      [canHover, maxTilt, onMouseEnter, startAnimLoop]
    );

    const handlePointerMove = useCallback(
      (e: React.PointerEvent<HTMLDivElement>) => {
        if (!canHover) return;

        const wrapper = wrapperRef.current;
        if (!wrapper) return;

        const rect = wrapper.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const clampedX = Math.max(0, Math.min(rect.width, x));
        const clampedY = Math.max(0, Math.min(rect.height, y));

        const normalizedX = (clampedX / rect.width) * 2 - 1;
        const normalizedY = (clampedY / rect.height) * 2 - 1;

        anim.current.targetX = -(normalizedY * maxTilt);
        anim.current.targetY = normalizedX * maxTilt;
        anim.current.targetScale = 1.012;

        const pctX = (clampedX / rect.width) * 100;
        const pctY = (clampedY / rect.height) * 100;
        if (surfaceRef.current) {
          surfaceRef.current.style.setProperty('--mouse-x', `${pctX.toFixed(1)}%`);
          surfaceRef.current.style.setProperty('--mouse-y', `${pctY.toFixed(1)}%`);
        }

        startAnimLoop();

        if (onMouseMove) {
          onMouseMove(e as any);
        }
      },
      [canHover, maxTilt, onMouseMove, startAnimLoop]
    );

    const handlePointerLeave = useCallback(
      (e: React.PointerEvent<HTMLDivElement>) => {
        anim.current.isHovered = false;
        anim.current.targetX = 0;
        anim.current.targetY = 0;
        anim.current.targetScale = 1;
        setIsHovered(false);

        // Keep loop running so it smoothly glides back to resting position
        startAnimLoop();

        if (onMouseLeave) {
          onMouseLeave(e as any);
        }
      },
      [onMouseLeave, startAnimLoop]
    );

    // Merge forwarded ref with wrapperRef
    const setRefs = useCallback(
      (node: HTMLDivElement | null) => {
        wrapperRef.current = node;
        if (typeof forwardedRef === 'function') {
          forwardedRef(node);
        } else if (forwardedRef) {
          (forwardedRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
        }
      },
      [forwardedRef]
    );

    const { outerClasses, innerClasses } = partitionClasses(className);

    return (
      <div
        ref={setRefs}
        onPointerEnter={handlePointerEnter}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        className={cn(
          'relative isolate',
          outerClasses,
          containerClassName
        )}
        style={{
          perspective: '1000px',
          ...style,
        }}
        {...props}
      >
        {/*
          1. Ambient Hover Shadow & Soft Elevation Aura:
          Separated from the 3D surface so rotating does not skew the shadow or invalidate raster layers.
          Uses GPU-accelerated opacity transition (500ms ease-out) to completely eliminate sudden black shadow pop-in.
        */}
        <div
          className="pointer-events-none absolute inset-0 rounded-2xl transition-opacity duration-500 ease-out z-0"
          style={{
            opacity: isHovered && canHover ? 1 : 0,
            boxShadow: `0 20px 40px -12px rgba(0, 0, 0, 0.45), 0 0 24px -4px rgba(${glowColor}, 0.12)`,
          }}
          aria-hidden="true"
        />

        {/*
          2. Tilt Surface:
          Carries the 3D rotation, background, border, and backdrop-blur.
          Starts at stable neutral 0° and smoothly eases in via the requestAnimationFrame damping loop.
        */}
        <div
          ref={surfaceRef}
          className={cn(
            'relative z-10 w-full h-full rounded-2xl border border-border/70 bg-card/90 text-card-foreground',
            'shadow-[0_2px_10px_-2px_rgba(0,0,0,0.25)]',
            'backdrop-blur-md overflow-hidden will-change-transform',
            !canHover && 'active:scale-[0.99] transition-transform duration-150',
            innerClasses
          )}
          style={{
            transform: 'rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)',
            transformStyle: 'preserve-3d',
          }}
        >
          {/* 2a. Cursor-reactive radial surface spotlight */}
          {showGlow && canHover && (
            <div
              className="pointer-events-none absolute inset-0 z-0 transition-opacity duration-300 rounded-[inherit]"
              style={{
                opacity: isHovered ? 1 : 0,
                background: `radial-gradient(circle 300px at var(--mouse-x, 50%) var(--mouse-y, 50%), rgba(${glowColor}, 0.10), transparent 75%)`,
              }}
              aria-hidden="true"
            />
          )}

          {/* 2b. Cursor-reactive border highlight */}
          {showGlow && canHover && (
            <div
              className="pointer-events-none absolute -inset-[1px] rounded-[inherit] z-0 transition-opacity duration-300"
              style={{
                opacity: isHovered ? 1 : 0,
                background: `radial-gradient(circle 220px at var(--mouse-x, 50%) var(--mouse-y, 50%), rgba(${glowColor}, 0.30), transparent 70%)`,
                mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                maskComposite: 'exclude',
                WebkitMaskComposite: 'xor',
                padding: '1px',
              }}
              aria-hidden="true"
            />
          )}

          {/* 3. Card Content: Elevated above lighting layers */}
          <div className="relative z-10 w-full h-full">{children}</div>
        </div>
      </div>
    );
  }
);

TiltCard.displayName = 'TiltCard';
