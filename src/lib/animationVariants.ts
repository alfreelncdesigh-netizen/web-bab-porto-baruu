import { type Variants } from 'framer-motion';

/**
 * Minimalist Staggered Animation System for Main Sections
 * Uses smooth, physics-informed deceleration curves for an editorial, minimalist feel.
 */

// Deceleration cubic-bezier curve for smooth, elegant entrance
export const EASE_SMOOTH = [0.16, 1, 0.3, 1] as const;

// Main section container variant: orchestrates the staggered cascade when scrolled into view
export const sectionStaggerContainer: Variants = {
  hidden: { 
    opacity: 0 
  },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.04,
    },
  },
};

// Section header variant (kicker / badge, main title, subtitle / description)
export const sectionHeaderItem: Variants = {
  hidden: { 
    opacity: 0, 
    y: 22 
  },
  visible: { 
    opacity: 1, 
    y: 0, 
    transition: { 
      duration: 0.65, 
      ease: EASE_SMOOTH 
    } 
  },
};

// Content block or interactive card item
export const sectionContentItem: Variants = {
  hidden: { 
    opacity: 0, 
    y: 24 
  },
  visible: { 
    opacity: 1, 
    y: 0, 
    transition: { 
      duration: 0.65, 
      ease: EASE_SMOOTH 
    } 
  },
};

// Child grid container: staggers cards (Portfolio cards, Blog posts, Stats metrics, Experience timeline)
export const childGridContainer: Variants = {
  hidden: { 
    opacity: 0 
  },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.05,
    },
  },
};

// Individual card item inside a grid with a subtle scale and y-displacement
export const childGridCardItem: Variants = {
  hidden: { 
    opacity: 0, 
    y: 24, 
    scale: 0.985 
  },
  visible: { 
    opacity: 1, 
    y: 0, 
    scale: 1, 
    transition: { 
      duration: 0.55, 
      ease: EASE_SMOOTH 
    } 
  },
};

// Lateral entrance from the right (e.g. Profile photo or graphic elements)
export const slideInRightItem: Variants = {
  hidden: { 
    opacity: 0, 
    x: 28 
  },
  visible: { 
    opacity: 1, 
    x: 0, 
    transition: { 
      duration: 0.7, 
      ease: EASE_SMOOTH 
    } 
  },
};

// Lateral entrance from the left
export const slideInLeftItem: Variants = {
  hidden: { 
    opacity: 0, 
    x: -28 
  },
  visible: { 
    opacity: 1, 
    x: 0, 
    transition: { 
      duration: 0.7, 
      ease: EASE_SMOOTH 
    } 
  },
};

// Subtle scale fade-in (e.g. for badges, chips, or modal triggers)
export const scaleFadeItem: Variants = {
  hidden: { 
    opacity: 0, 
    scale: 0.94 
  },
  visible: { 
    opacity: 1, 
    scale: 1, 
    transition: { 
      duration: 0.5, 
      ease: EASE_SMOOTH 
    } 
  },
};
