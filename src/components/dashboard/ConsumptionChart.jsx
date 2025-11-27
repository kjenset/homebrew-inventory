import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Calendar, Droplets, Loader2 } from "lucide-react";
import { format, subDays, startOfDay, parseISO } from "date-fns";
import { ConsumptionLog } from "@/entities/all";
import _ from 'lodash';

export default function ConsumptionChart({ isOpen, onClose }) {
    const [chartData, setChartData] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [timePeriod, setTimePeriod] = useState('30');

    const loadChartData = useCallback(async () => {
        setIsLoading(true);
        try {
            const days = parseInt(timePeriod);
            const cutoffDate = subDays(new Date(), days);
            
            const logs = await ConsumptionLog.filter({
                consumption_date: { $gte: cutoffDate.toISOString() }
            }, '-consumption_date', 500);

            const groupedByDay = _.groupBy(logs, (log) => format(startOfDay(parseISO(log.consumption_date)), 'yyyy-MM-dd'));
            
            const dailyTotals = _.map(groupedByDay, (dayLogs, date) => ({
                date: date,
                displayDate: format(parseISO(date), 'MMM dd'),
                consumed: _.sumBy(dayLogs, 'quantity_consumed')
            })).sort((a,b) => new Date(a.date) - new Date(b.date));
            
            setChartData(dailyTotals);
        } catch (error) {
            console.error('Error loading consumption data:', error);
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
        { value: '90', label: 'Last 3 months' }
    ];

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[80vh]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Droplets className="w-5 h-5 text-yellow-600" />
                        Daily Consumption
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
                                <Loader2 className="w-8 h-8 animate-spin text-yellow-500" />
                            </div>
                        ) : chartData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                    <XAxis dataKey="displayDate" stroke="#666" fontSize={12} />
                                    <YAxis stroke="#666" fontSize={12} label={{ value: 'Liters Consumed', angle: -90, position: 'insideLeft' }} />
                                    <Tooltip formatter={(value) => [`${value.toFixed(1)}L`, 'Consumed']} />
                                    <Bar dataKey="consumed" fill="#facc15" />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-gray-500">
                                <Calendar className="w-12 h-12 mb-4 opacity-50" />
                                <p>No consumption logged for this period</p>
                            </div>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}