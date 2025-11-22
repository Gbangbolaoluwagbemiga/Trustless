"use client";

import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, RefreshCw } from "lucide-react";

interface JobsHeaderProps {
  onRefresh?: () => void;
  refreshing?: boolean;
}

export function JobsHeader({ onRefresh, refreshing }: JobsHeaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-4xl md:text-5xl font-bold mb-2">Browse Jobs</h1>
          <p className="text-xl text-muted-foreground">
            Find and apply to open freelance opportunities
          </p>
        </div>
        {onRefresh && (
          <Button
            onClick={onRefresh}
            disabled={refreshing}
            variant="outline"
            size="sm"
            className="shrink-0"
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`}
            />
            {refreshing ? "Refreshing..." : "Refresh"}
          </Button>
        )}
      </div>
    </motion.div>
  );
}
