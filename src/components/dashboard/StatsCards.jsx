
import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { BarChart3 } from "lucide-react";

export default function StatsCards({ 
    title, 
    value, 
    icon: Icon, 
    textColor, 
    subtitle, 
    onChartClick = null,
    showChartButton = false 
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card className="relative overflow-hidden bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300">
        <Icon className={`absolute -top-2 -right-2 w-12 md:w-20 h-12 md:h-20 ${textColor} opacity-15`} />
        {showChartButton && onChartClick && (
          <Button 
            variant="ghost" 
            className="absolute top-2 right-2 h-10 w-10 z-10 opacity-70 hover:opacity-100 hover:bg-white/50 rounded-lg p-0 flex items-center justify-center"
            onClick={onChartClick}
          >
            <BarChart3 className="w-5 h-5" />
          </Button>
        )}
        <CardContent className="p-3 md:p-6">
          <div className="space-y-1 md:space-y-2">
            <p className="text-xs md:text-sm font-medium text-[--secondary-text] opacity-80">{title}</p>
            <p className={`text-xl md:text-3xl font-bold ${textColor}`}>
              {value}
            </p>
            {subtitle && (
              <p className="text-xs md:text-sm text-[--accent-text]">{subtitle}</p>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
