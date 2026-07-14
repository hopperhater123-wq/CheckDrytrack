// Zentrale Motion-Bausteine — eine Quelle für Timing, Easing und wiederkehrende
// Muster (Dialoge, Stagger-Listen). Kurz (150–250 ms), easeOut-artig, dezent.
// Reduced-Motion wird global über <MotionConfig reducedMotion="user"> respektiert.
import { motion, AnimatePresence, MotionConfig, type Variants } from "motion/react";
import type { ReactNode } from "react";

export { motion, AnimatePresence, MotionConfig };

// Deckt sich mit der CSS-Variable --ease (cubic-bezier(0.16, 1, 0.3, 1)).
export const EASE = [0.16, 1, 0.3, 1] as const;
export const DUR = 0.2;

// Container + Item für gestaffelte Listen/Karten.
export const staggerContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.04, delayChildren: 0.02 } },
};
export const fadeUpItem: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: DUR, ease: EASE } },
};

type Tag = "div" | "section" | "ul" | "li";

/** Stagger-Container: rendert Kinder mit fadeUpItem nacheinander ein. */
export function Stagger({ as = "div", className, style, children }: {
  as?: Tag; className?: string; style?: React.CSSProperties; children: ReactNode;
}) {
  const M = motion[as];
  return (
    <M className={className} style={style} variants={staggerContainer} initial="hidden" animate="show">
      {children}
    </M>
  );
}

/** Einzelnes Element innerhalb eines <Stagger>. Erbt den Trigger vom Container. */
export function Item({ as = "div", className, style, children, onClick }: {
  as?: Tag; className?: string; style?: React.CSSProperties; children: ReactNode; onClick?: () => void;
}) {
  const M = motion[as];
  return (
    <M className={className} style={style} variants={fadeUpItem} onClick={onClick}>
      {children}
    </M>
  );
}

/**
 * Dialog mit Ein-/Ausblend-Animation. In <AnimatePresence> rendern:
 *   <AnimatePresence>{offen && <Modal onClose={…}>…</Modal>}</AnimatePresence>
 * dismissable=false unterdrückt das Schließen per Backdrop-Klick.
 */
export function Modal({ onClose, dismissable = true, children }: {
  onClose: () => void; dismissable?: boolean; children: ReactNode;
}) {
  return (
    <motion.div
      className="modal-backdrop"
      onClick={dismissable ? onClose : undefined}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.16, ease: "easeOut" }}
    >
      <motion.div
        className="modal"
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, y: 14, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.985 }}
        transition={{ duration: 0.22, ease: EASE }}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}
