import React from "react";
import { motion } from "framer-motion";

export default function PulseRadar({ isScanning }) {
  if (!isScanning) return null;

  return (
    <div className="relative flex items-center justify-center w-48 h-48 mx-auto my-8">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="absolute inset-0 rounded-full border-2 border-primary/30"
          initial={{ scale: 0.3, opacity: 0.8 }}
          animate={{ scale: 1.2, opacity: 0 }}
          transition={{
            duration: 2,
            repeat: Infinity,
            delay: i * 0.6,
            ease: "easeOut",
          }}
        />
      ))}
      <motion.div
        className="relative z-10 w-16 h-16 rounded-full bg-primary/10 border-2 border-primary flex items-center justify-center"
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      >
        <div className="w-3 h-3 rounded-full bg-primary" />
      </motion.div>
    </div>
  );
}