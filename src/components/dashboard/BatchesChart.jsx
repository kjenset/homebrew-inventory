import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Calendar, Beer, Loader2 } from "lucide-react";
import { format, subDays, parseISO } from "date-fns";
import { InventorySnapshot } from "@/entities/InventorySnapshot";

export default function BatchesChart({ isOpen, onClose }) {
    const [chartData, setChartData] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [timePeriod, setTimePeriod] = useState('30');

    const loadChartData = useCallback(async () => {
        setIsLoading(true);
        try {
            const days = parseInt(timePeriod);
            const cutoffDate = subDays(new Date(), days);
            
            const snapshots = await InventorySnapshot.list('-snapshot_date', days * 2);
            
            const formattedData = snapshots
                .filter(s => parseISO(s.snapshot_date) >= cutoffDate)
                .slice(0, days)
                .reverse()
                .map(s => ({
                    date: s.snapshot_date,
                    displayDate: format(parseISO(s.snapshot_date), 'MMM dd'),
                    batches: s.total_beers,
                }));

            setChartData(formattedData);
        } catch (error) {
            console.error('Error loading chart data:', error);
            setChartData([]);
        }
        setIsLoading(false);
    }, [timePeriod]);

    useEffect(() => {
        if (isOpen) {
            loadChartData();
        }
    }, [isOpen, loadChartData]);

    const timePeriodOptions = [
        { value: '7', label: 'Last 7 days' },
        { value: '30', label: 'Last 30 days' },
        { value: '90', label: 'Last 3 months' },
        { value: '180', label: 'Last 6 months' }
    ];

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[80vh]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Beer className="w-5 h-5 text-amber-600" />
                        Total Batches Over Time
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    <Select value={timePeriod} onValueChange={setTimePeriod}>
                        <SelectTrigger className="w-48">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {timePeriodOptions.map(option => (
                                <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <div className="h-80 w-full">
                        {isLoading ? (
                            <div className="flex items-center justify-center h-full">
                                <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
                            </div>
                        ) : chartData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                    <XAxis dataKey="displayDate" stroke="#666" fontSize={12} />
                                    <YAxis allowDecimals={false} stroke="#666" fontSize={12} label={{ value: 'Batches', angle: -90, position: 'insideLeft' }} />
                                    <Tooltip formatter={(value) => [`${value} Batches`, 'Total']} />
                                    <Line type="monotone" dataKey="batches" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-gray-500">
                                <Calendar className="w-12 h-12 mb-4 opacity-50" />
                                <p>No data available for the selected time period</p>
                            </div>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}