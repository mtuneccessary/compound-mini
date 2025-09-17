"use client"

import { motion, AnimatePresence } from "framer-motion"
import { usePathname } from "next/navigation"
import { ReactNode } from "react"

interface PageTransitionProps {
  children: ReactNode
}

const pageVariants = {
  initial: {
    opacity: 0,
    y: 20,
    scale: 0.98,
  },
  in: {
    opacity: 1,
    y: 0,
    scale: 1,
  },
  out: {
    opacity: 0,
    y: -20,
    scale: 0.98,
  },
}

const pageTransition = {
  type: "tween",
  ease: "anticipate",
  duration: 0.4,
}

const containerVariants = {
  initial: {
    opacity: 0,
  },
  in: {
    opacity: 1,
    transition: {
      duration: 0.3,
      staggerChildren: 0.1,
    },
  },
  out: {
    opacity: 0,
    transition: {
      duration: 0.2,
    },
  },
}

export function PageTransition({ children }: PageTransitionProps) {
  const pathname = usePathname()

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        initial="initial"
        animate="in"
        exit="out"
        variants={pageVariants}
        transition={pageTransition}
        className="w-full"
      >
        <motion.div
          variants={containerVariants}
          initial="initial"
          animate="in"
          exit="out"
        >
          {children}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

// Alternative slide transition for more dramatic effect
export function SlidePageTransition({ children }: PageTransitionProps) {
  const pathname = usePathname()

  const slideVariants = {
    initial: {
      x: "100%",
      opacity: 0,
    },
    in: {
      x: 0,
      opacity: 1,
    },
    out: {
      x: "-100%",
      opacity: 0,
    },
  }

  const slideTransition = {
    type: "tween",
    ease: "easeInOut",
    duration: 0.5,
  }

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        initial="initial"
        animate="in"
        exit="out"
        variants={slideVariants}
        transition={slideTransition}
        className="w-full"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}

// Fade transition for subtle effect
export function FadePageTransition({ children }: PageTransitionProps) {
  const pathname = usePathname()

  const fadeVariants = {
    initial: {
      opacity: 0,
    },
    in: {
      opacity: 1,
    },
    out: {
      opacity: 0,
    },
  }

  const fadeTransition = {
    type: "tween",
    ease: "easeInOut",
    duration: 0.3,
  }

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        initial="initial"
        animate="in"
        exit="out"
        variants={fadeVariants}
        transition={fadeTransition}
        className="w-full"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}
