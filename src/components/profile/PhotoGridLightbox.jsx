import React from "react";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import PhotoFeedCard from "@/components/explore/PhotoFeedCard";

export default function PhotoGridLightbox({ photo, owner, currentUser, onClose }) {
  return (
    <AnimatePresence>
      {photo && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/90 flex flex-col"
          onClick={onClose}
        >
          {/* Close button */}
          <div className="flex justify-end p-4 flex-shrink-0">
            <button
              onClick={onClose}
              className="h-10 w-10 rounded-full bg-white/10 backdrop-blur flex items-center justify-center text-white hover:bg-white/20 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Card — stop propagation so taps inside don't close */}
          <div
            className="flex-1 overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="bg-card rounded-t-2xl min-h-full">
              <PhotoFeedCard
                photo={photo}
                owner={owner}
                currentUser={currentUser}
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}