import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from "framer-motion";
import { Clock, Wine } from "lucide-react";
import { format } from "date-fns";

export default function RecentActivity({ consumptionLogs }) {
  if (!consumptionLogs?.length) {
    return (
      <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="text-amber-900 flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-amber-700 text-center py-8">No consumption logged yet</p>
        </CardContent>
      </Card>
    );
  }

  const formatConsumedCans = (log) => {
    const parts = [];
    if (log.small_cans_consumed > 0) {
      parts.push(`${log.small_cans_consumed}x 0.33L`);
    }
    if (log.large_cans_consumed > 0) {
      parts.push(`${log.large_cans_consumed}x 0.5L`);
    }
    if (parts.length > 0) {
      return parts.join(' & ');
    }
    return `${log.quantity_consumed.toFixed(2)}L`;
  };

  return (
    <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
      <CardHeader>
        <CardTitle className="text-amber-900 flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {consumptionLogs.slice(0, 5).map((log, index) => (
            <motion.div
              key={log.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex items-center justify-between p-3 rounded-lg bg-amber-50 border border-amber-100"
            >
              <div className="flex items-center gap-3">
                <Wine className="w-4 h-4 text-amber-600" />
                <div>
                  <p className="font-medium text-amber-900">{log.beer_name}</p>
                  <p className="text-sm text-amber-700">
                    {formatConsumedCans(log)} • {format(new Date(log.consumption_date), 'MMM dd, HH:mm')}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}