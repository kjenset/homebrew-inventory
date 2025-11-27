import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Move, X } from 'lucide-react';

export default function MoveBeerDialog({ isOpen, onClose, beer, locations, onMoveConfirm }) {
    const [quantity, setQuantity] = useState(1);
    const [destinationId, setDestinationId] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    // Filter out the current location from the destination options
    const destinationLocations = locations.filter(loc => loc.id !== beer.location_id);

    useEffect(() => {
        if (!isOpen) {
            setQuantity(1);
            setDestinationId('');
            setIsProcessing(false);
        }
    }, [isOpen]);

    const handleMove = async () => {
        if (!destinationId || quantity <= 0) return;
        setIsProcessing(true);
        try {
            await onMoveConfirm(beer, quantity, destinationId);
            onClose();
        } catch (error) {
            console.error("Error moving beer:", error);
            alert("Failed to move beer. Please try again.");
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Move className="w-5 h-5" />
                        Move Beer Stock
                    </DialogTitle>
                    <DialogDescription>
                        Move a portion of <strong>{beer.name}</strong> to a different location.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="move-quantity">Quantity to Move</Label>
                        <Input
                            id="move-quantity"
                            type="number"
                            min="1"
                            max={beer.current_quantity}
                            value={quantity}
                            onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value, 10)))}
                            className="text-center"
                        />
                        <p className="text-xs text-center text-gray-500">
                            Available at current location: {beer.current_quantity}
                        </p>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="destination-location">Destination</Label>
                        <Select value={destinationId} onValueChange={setDestinationId}>
                            <SelectTrigger id="destination-location">
                                <SelectValue placeholder="Select a new location" />
                            </SelectTrigger>
                            <SelectContent>
                                {destinationLocations.length > 0 ? (
                                    destinationLocations.map(loc => (
                                        <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                                    ))
                                ) : (
                                    <div className="px-2 py-1.5 text-sm text-gray-500">No other locations available.</div>
                                )}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>
                        <X className="w-4 h-4 mr-2" />
                        Cancel
                    </Button>
                    <Button
                        onClick={handleMove}
                        disabled={
                            isProcessing || 
                            !destinationId || 
                            quantity <= 0 || 
                            quantity > beer.current_quantity
                        }
                    >
                        <Move className="w-4 h-4 mr-2" />
                        {isProcessing ? 'Moving...' : `Move ${quantity} Container(s)`}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}