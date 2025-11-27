
import React, { useState, useEffect } from 'react';
import { ConsumptionLog } from '@/entities/all';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, History, Wine, ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';

export default function ActivityPage() {
    const [logs, setLogs] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        loadLogs();
    }, []);

    const loadLogs = async () => {
        setIsLoading(true);
        try {
            const logsData = await ConsumptionLog.list('-consumption_date');
            setLogs(logsData);
        } catch (error) {
            console.error("Error loading consumption logs:", error);
        }
        setIsLoading(false);
    };

    const formatConsumedCans = (log) => {
        if (log.containers_consumed > 0) {
            return `${log.containers_consumed} container(s)`;
        }
        return log.quantity_consumed ? `${log.quantity_consumed.toFixed(2)}L` : 'N/A';
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
            </div>
        );
    }

    return (
        <div className="p-6 md:p-8 min-h-screen">
            <div className="max-w-4xl mx-auto">
                <motion.div 
                    initial={{ opacity: 0, y: -20 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    className="flex items-center gap-4 mb-8"
                >
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => navigate(createPageUrl("Dashboard"))}
                        className="border-amber-200 hover:bg-amber-50 flex-shrink-0"
                    >
                        <ArrowLeft className="w-4 h-4" />
                    </Button>
                    <div>
                        <h1 className="text-4xl font-bold text-amber-900 mb-2 flex items-center gap-3">
                            <History className="w-8 h-8" />
                            Consumption History
                        </h1>
                        <p className="text-amber-700">A complete log of all your consumed beers.</p>
                    </div>
                </motion.div>

                <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl">
                    <CardHeader>
                        <CardTitle className="text-2xl text-amber-900">All Activity</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {logs.length > 0 ? (
                            <div className="space-y-4">
                                {logs.map((log, index) => (
                                    <motion.div
                                        key={log.id}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: index * 0.05 }}
                                        className="p-4 rounded-lg bg-amber-50/50 border border-amber-100"
                                    >
                                        <div className="flex justify-between items-start">
                                            <div className="flex items-center gap-4">
                                                <div className="bg-amber-100 p-2 rounded-full">
                                                  <Wine className="w-5 h-5 text-amber-600" />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-amber-900 text-lg">{log.beer_name}</p>
                                                    <p className="text-sm text-amber-700 font-medium">{formatConsumedCans(log)} ({log.quantity_consumed.toFixed(2)}L)</p>
                                                    {log.notes && (
                                                      <p className="text-sm text-amber-600 italic mt-1">"{log.notes}"</p>
                                                    )}
                                                </div>
                                            </div>
                                            <p className="text-xs text-amber-600 flex-shrink-0 ml-4 text-right">{format(new Date(log.consumption_date), 'MMM dd, yyyy')}<br/>{format(new Date(log.consumption_date), 'HH:mm')}</p>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-center text-amber-700 py-12">No consumption has been logged yet.</p>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
