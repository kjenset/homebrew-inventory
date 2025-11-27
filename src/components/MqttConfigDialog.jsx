import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Rss, Save, X } from "lucide-react";

export default function MqttConfigDialog({ isOpen, onClose, onSave, initialData }) {
    const [topic, setTopic] = useState('');
    const [unit, setUnit] = useState('L');

    useEffect(() => {
        if (isOpen) {
            setTopic(initialData?.topic || '');
            setUnit(initialData?.unit || 'L');
        }
    }, [isOpen, initialData]);

    const handleSave = () => {
        onSave({ topic, unit });
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Rss className="w-5 h-5" />
                        Configure MQTT Tracking
                    </DialogTitle>
                </DialogHeader>
                <div className="py-4 space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="mqtt-topic">MQTT Topic</Label>
                        <Input
                            id="mqtt-topic"
                            value={topic}
                            onChange={(e) => setTopic(e.target.value)}
                            placeholder="e.g., brewery/tank1/level"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="mqtt-unit">Unit</Label>
                        <Input
                            id="mqtt-unit"
                            value={unit}
                            onChange={(e) => setUnit(e.target.value)}
                            placeholder="e.g., L, gal, %"
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>
                        <X className="w-4 h-4 mr-2" />
                        Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={!topic.trim()}>
                        <Save className="w-4 h-4 mr-2" />
                        Save Configuration
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}