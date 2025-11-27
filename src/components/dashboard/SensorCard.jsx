import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import { WifiOff } from "lucide-react";

export default function SensorCard({ sensors }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card className="relative overflow-hidden bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300 h-full">
        <CardContent className="p-3 md:p-6 flex flex-col justify-center h-full">
          {sensors.length > 0 ? (
            <div className="space-y-2">
              {sensors.map((sensor) => (
                <div
                  key={sensor.id}
                  onClick={sensor.onChartClick}
                  className={`flex items-center justify-between ${
                    sensor.onChartClick ? 'cursor-pointer hover:bg-white/50 -m-1 p-1 rounded-md transition-colors' : ''
                  }`}
                >
                  {/* Left side: Icon and Label */}
                  <div className="flex items-center gap-2">
                    <div className="flex-shrink-0">
                      <sensor.icon className={`w-4 h-4 ${sensor.statusColor}`} />
                    </div>
                    <p className="text-xs font-medium text-[--secondary-text] truncate">{sensor.label}</p>
                  </div>
                  
                  {/* Right side: Value */}
                  <p className={`text-sm font-bold ${sensor.statusColor}`}>{sensor.value}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-[--secondary-text] space-y-1">
              <WifiOff className="w-6 h-6 mx-auto opacity-40" />
              <p className="text-xs font-medium">No Active Sensors</p>
              <p className="text-xs">Enable in Settings</p>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}