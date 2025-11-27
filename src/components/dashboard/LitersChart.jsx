import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Calendar, TrendingDown, Loader2 } from "lucide-react";
import { format, subDays, parseISO } from "date-fns";
import { InventorySnapshot } from "@/entities/InventorySnapshot";

export default function LitersChart({ isOpen, onClose }) {
    const [chartData, setChartData] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [timePeriod, setTimePeriod] = useState('30');

    const loadChartData = useCallback(async () => {
        setIsLoading(true);
        try {
            const days = parseInt(timePeriod);
            const cutoffDate = subDays(new Date(), days);
            
            const snapshots = await InventorySnapshot.list('-snapshot_date', days * 2); // Get more records to ensure we have enough
            
            // Filter snapshots within the selected time period
            const filteredSnapshots = snapshots
                .filter(snapshot => parseISO(snapshot.snapshot_date) >= cutoffDate)
                .slice(0, days) // Limit to requested number of days
                .reverse(); // Show chronologically

            const formattedData = filteredSnapshots.map(snapshot => ({
                date: snapshot.snapshot_date,
                displayDate: format(parseISO(snapshot.snapshot_date), 'MMM dd'),
                liters: snapshot.total_liters,
                beers: snapshot.total_beers
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
                        <TrendingDown className="w-5 h-5 text-orange-600" />
                        Liters Remaining Over Time
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    <div className="flex items-center gap-4">
                        <label className="text-sm font-medium">Time Period:</label>
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
                    </div>

                    <div className="h-80 w-full">
                        {isLoading ? (
                            <div className="flex items-center justify-center h-full">
                                <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
                            </div>
                        ) : chartData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                    <XAxis 
                                        dataKey="displayDate" 
                                        stroke="#666"
                                        fontSize={12}
                                    />
                                    <YAxis 
                                        stroke="#666"
                                        fontSize={12}
                                        label={{ value: 'Liters', angle: -90, position: 'insideLeft' }}
                                    />
                                    <Tooltip 
                                        formatter={(value, name) => [
                                            `${value.toFixed(1)}L`, 
                                            name === 'liters' ? 'Total Liters' : name
                                        ]}
                                        labelFormatter={(label) => `Date: ${label}`}
                                        contentStyle={{
                                            backgroundColor: 'white',
                                            border: '1px solid #ccc',
                                            borderRadius: '8px'
                                        }}
                                    />
                                    <Line 
                                        type="monotone" 
                                        dataKey="liters" 
                                        stroke="#f97316" 
                                        strokeWidth={3}
                                        dot={{ fill: '#f97316', strokeWidth: 2, r: 4 }}
                                        activeDot={{ r: 6, fill: '#ea580c' }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-gray-500">
                                <Calendar className="w-12 h-12 mb-4 opacity-50" />
                                <p>No data available for the selected time period</p>
                                <p className="text-sm mt-2">Data snapshots are created daily</p>
                            </div>
                        )}
                    </div>

                    {chartData.length > 0 && (
                        <div className="bg-orange-50 p-4 rounded-lg">
                            <h4 className="font-medium text-orange-900 mb-2">Summary</h4>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                <div>
                                    <span className="text-orange-700">Current:</span>
                                    <div className="font-bold text-orange-900">
                                        {chartData[chartData.length - 1]?.liters.toFixed(1)}L
                                    </div>
                                </div>
                                <div>
                                    <span className="text-orange-700">Peak:</span>
                                    <div className="font-bold text-orange-900">
                                        {Math.max(...chartData.map(d => d.liters)).toFixed(1)}L
                                    </div>
                                </div>
                                <div>
                                    <span className="text-orange-700">Lowest:</span>
                                    <div className="font-bold text-orange-900">
                                        {Math.min(...chartData.map(d => d.liters)).toFixed(1)}L
                                    </div>
                                </div>
                                <div>
                                    <span className="text-orange-700">Data Points:</span>
                                    <div className="font-bold text-orange-900">
                                        {chartData.length} days
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}