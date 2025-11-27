import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Calendar, Thermometer, Loader2 } from "lucide-react";
import { format, subDays, parseISO } from "date-fns";
import { FridgeTemp } from "@/entities/all";

export default function TemperatureChart({ isOpen, onClose }) {
    const [chartData, setChartData] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [timePeriod, setTimePeriod] = useState('7');

    const loadChartData = useCallback(async () => {
        setIsLoading(true);
        try {
            const days = parseInt(timePeriod);
            const cutoffDate = subDays(new Date(), days);

            const tempData = await FridgeTemp.filter({
                timestamp: { $gte: cutoffDate.toISOString() }
            }, '-timestamp', 1000); // Fetch up to 1000 points

            const formattedData = tempData
                .reverse()
                .map(t => ({
                    timestamp: t.timestamp,
                    displayTime: format(parseISO(t.timestamp), 'MMM dd, HH:mm'),
                    temperature: t.temperature,
                }));
            
            setChartData(formattedData);
        } catch (error) {
            console.error('Error loading temperature data:', error);
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
        { value: '1', label: 'Last 24 hours' },
        { value: '3', label: 'Last 3 days' },
        { value: '7', label: 'Last 7 days' },
        { value: '30', label: 'Last 30 days' },
    ];

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[80vh]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Thermometer className="w-5 h-5 text-sky-600" />
                        Fridge Temperature
                    </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                    <Select value={timePeriod} onValueChange={setTimePeriod}>
                        <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            {timePeriodOptions.map(option => (
                                <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <div className="h-80 w-full">
                        {isLoading ? (
                            <div className="flex items-center justify-center h-full">
                                <Loader2 className="w-8 h-8 animate-spin text-sky-500" />
                            </div>
                        ) : chartData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                    <XAxis 
                                        dataKey="displayTime"
                                        tickFormatter={(tick) => format(parseISO(chartData.find(d => d.displayTime === tick)?.timestamp), 'MMM dd')}
                                        stroke="#666" 
                                        fontSize={12} 
                                    />
                                    <YAxis domain={['dataMin - 1', 'dataMax + 1']} stroke="#666" fontSize={12} label={{ value: 'Temp (°C)', angle: -90, position: 'insideLeft' }} />
                                    <Tooltip 
                                        labelFormatter={(label) => label}
                                        formatter={(value) => [`${value.toFixed(1)}°C`, 'Temperature']} 
                                    />
                                    <Line type="monotone" dataKey="temperature" stroke="#38bdf8" strokeWidth={2} dot={false} />
                                </LineChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-gray-500">
                                <Calendar className="w-12 h-12 mb-4 opacity-50" />
                                <p>No temperature data for this period</p>
                            </div>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}