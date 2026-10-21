'use client';

import { motion, Variants } from 'framer-motion';

const variants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: 'easeOut' as const },
  },
  exit: {
    opacity: 0,
    y: -20,
    transition: { duration: 0.2, ease: 'easeIn' as const },
  },
};

export default function AnimatedWrapper({ children }: { children: React.ReactNode }) {
  return (
    <motion.div initial="hidden" animate="visible" exit="exit" variants={variants}>
      {children}
    </motion.div>
  );
}