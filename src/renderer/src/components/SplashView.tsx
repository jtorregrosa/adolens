import appIcon from '@renderer/assets/icon.png'
import { motion } from 'framer-motion'

export function SplashView(): React.JSX.Element {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-8 bg-slate-950"
    >
      {/* App icon */}
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.05, duration: 0.35, ease: 'easeOut' }}
        className="relative flex items-center justify-center"
      >
        <img src={appIcon} alt="" className="h-28 w-28 select-none" draggable={false} />
      </motion.div>

      {/* App name */}
      <motion.h1
        initial={{ y: 8, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.15, duration: 0.3 }}
        className="text-2xl font-semibold tracking-tight text-slate-100"
      >
        ADOLens
      </motion.h1>

      {/* Loading indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="flex items-center gap-2"
      >
        <span
          className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-400"
          style={{ animationDelay: '0ms' }}
        />
        <span
          className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-400"
          style={{ animationDelay: '150ms' }}
        />
        <span
          className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-400"
          style={{ animationDelay: '300ms' }}
        />
      </motion.div>
    </motion.div>
  )
}
