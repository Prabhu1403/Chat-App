"use client";

import React, { useEffect, useState } from "react";
import { socket } from "@/utils/socket";
import { motion, AnimatePresence } from "framer-motion";

export default function JoinRequestToast() {
  const [incomingRequests, setIncomingRequests] = useState<any[]>([]);

  useEffect(() => {
    const handleNewJoinRequest = (data: any) => {
      console.log("new join request", data);
      setIncomingRequests((prev) => [...prev, data]);
    };

    socket.on("new-join-request", handleNewJoinRequest);

    return () => {
      socket.off("new-join-request", handleNewJoinRequest);
    };
  }, []);

  if (incomingRequests.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 w-80 max-h-[80vh] overflow-y-auto pr-2">
      <AnimatePresence>
        {incomingRequests.map((req, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, x: 50, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 50, scale: 0.9 }}
            className="bg-white border border-blue-200 shadow-xl p-4 rounded-xl flex items-start justify-between gap-3 relative overflow-hidden"
          >
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500"></div>
            <div className="flex items-start gap-3">
              <div className="bg-blue-100 text-blue-600 p-2 rounded-lg text-lg flex-shrink-0">
                🔔
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800 leading-snug">{req.message}</p>
                <p className="text-xs text-slate-500 mt-1">Group ID: {req.groupId} • User ID: {req.userId}</p>
              </div>
            </div>
            <button 
              onClick={() => setIncomingRequests(prev => prev.filter((_, i) => i !== idx))}
              className="text-slate-400 hover:text-slate-600 transition-colors p-1"
            >
              ✕
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
