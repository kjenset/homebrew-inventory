
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import {
  Calendar,
  Droplets,
  Minus,
  Plus,
  Pencil,
  ClipboardList,
  Percent,
  Box,
  Cylinder,
  ExternalLink,
  Container,
  Package, // New icon for container type
  Rss, // New icon for MQTT
  RadioTower, // New icon for RFID
  Move, // Import Move icon
} from "lucide-react";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import PinProtection from "../auth/PinProtection";
import MoveBeerDialog from "./MoveBeerDialog"; // Import the new component

const styleColors = {
  "IPA": "bg-orange-100 text-orange-800",
  "Pale Ale": "bg-yellow-100 text-yellow-800",
  "Lager": "bg-blue-100 text-blue-800",
  "Stout": "bg-gray-100 text-gray-800",
  "Porter": "bg-purple-100 text-purple-800",
  "Wheat Beer": "bg-amber-100 text-amber-800",
  "Saison": "bg-green-100 text-green-800",
  "Pilsner": "bg-lime-100 text-lime-800",
  "Amber Ale": "bg-orange-100 text-orange-800",
  "Brown Ale": "bg-yellow-100 text-yellow-800",
  "Belgian Ale": "bg-red-100 text-red-800",
  "Sour Beer": "bg-pink-100 text-pink-800",
  "Other": "bg-gray-100 text-gray-800"
};

export default function BeerCard({ beer, onStockChange, isInitiallyOpen = false, onDialogClose, appSettings, locations, onMoveBeer }) {
  const [consumedQuantity, setConsumedQuantity] = useState(0);
  const [notes, setNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(isInitiallyOpen);
  const [isMoveDialogOpen, setIsMoveDialogOpen] = useState(false);
  const [showPinDialog, setShowPinDialog] = useState(false);

  const isRfidTracked = beer.rfid_enabled === true; // Explicitly check for true

  const isMqttTracked = beer.is_mqtt_tracked;

  const totalCurrentLiters = isMqttTracked
    ? (() => {
        if (!beer.mqtt_last_value) return 0;
        try {
          // Try to parse as JSON first
          const jsonData = JSON.parse(beer.mqtt_last_value);
          // Assuming the value is under a key named 'value' within the JSON object
          return parseFloat(jsonData.value) || 0;
        } catch (e) {
          // If JSON parsing fails (e.g., not a valid JSON string), try as plain number
          return parseFloat(beer.mqtt_last_value) || 0;
        }
      })()
    : (beer.current_quantity || 0) * (beer.container_volume || 0);

  const totalLitersUnit = isMqttTracked ? beer.mqtt_unit : 'L';

  // Debug logging - remove this later
  console.log('BeerCard Debug:', {
    beerName: beer.name,
    isMqttTracked: isMqttTracked,
    mqtt_last_value: beer.mqtt_last_value,
    mqtt_topic: beer.mqtt_topic,
    totalCurrentLiters: totalCurrentLiters
  });

  const handleStockChange = async (direction) => {
    if (isProcessing) return; // Prevent multiple submissions

    setIsProcessing(true);
    try {
      await onStockChange(beer, consumedQuantity, notes, direction);
      setConsumedQuantity(0);
      setNotes('');
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Error changing stock:', error);
      alert('Failed to update stock. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDialogChange = (open) => {
    setIsDialogOpen(open);
    if (!open) {
      if (onDialogClose) {
        onDialogClose();
      }
    }
  };

  const handleQuantityChange = (value) => {
    // Only allow numeric input
    const numValue = value.replace(/[^0-9]/g, '');
    setConsumedQuantity(parseInt(numValue, 10) || 0);
  };

  const increment = () => {
    setConsumedQuantity(prev => prev + 1);
  };

  const decrement = () => {
    setConsumedQuantity(prev => Math.max(0, prev - 1));
  };

  const handleEditClick = () => {
    // Check if PIN protection is enabled
    if (appSettings?.pin_protection_enabled === false) {
      // If PIN protection is disabled, go directly to edit page
      window.location.href = createPageUrl(`EditBeer?id=${beer.id}`);
      return;
    }

    // If PIN protection is enabled or not explicitly disabled, show the PIN dialog
    setShowPinDialog(true);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
    >
      <Card className="relative bg-white/90 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-start">
            <div className="flex-1 min-w-0 text-center">
              <h3 className="text-xl font-bold text-[--primary-text] truncate mb-2">{beer.name}</h3>
              <div className="flex items-center justify-center gap-2">
                <Badge className={`text-xs ${styleColors[beer.style] || styleColors['Other']}`}>
                  {beer.style}
                </Badge>
                {isRfidTracked && (
                    <RadioTower className="w-3 h-3 text-blue-600" title="RFID Tracked"/>
                )}
              </div>
            </div>
            <div className="flex flex-col">
              <Button variant="ghost" size="icon" className="w-8 h-8" onClick={handleEditClick}>
                <Pencil className="w-4 h-4" />
              </Button>
              {!isMqttTracked && !isRfidTracked && (
                <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => setIsMoveDialogOpen(true)}>
                    <Move className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 pt-0 pb-2">
          <div className="space-y-3">
            {/* 2x3 Grid for beer information */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-1.5" title="Alcohol by Volume">
                <Percent className="w-3 h-3 text-[--accent-text]" />
                <span>{beer.alcohol_percentage}% ABV</span>
              </div>
              <div className="flex items-center gap-1.5" title="Brew Date">
                <Calendar className="w-3 h-3 text-[--accent-text]" />
                <span>{format(new Date(beer.brew_date), 'd.M.y')}</span>
              </div>
              {beer.bitterness_ibu ? (
                <div className="flex items-center gap-1.5" title="Bitterness">
                  <Droplets className="w-3 h-3 text-[--accent-text]" />
                  <span>{beer.bitterness_ibu} IBU</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <Box className="w-3 h-3 text-[--accent-text]" />
                  <span>{beer.color}</span>
                </div>
              )}
              {isMqttTracked ? (
                <div className="flex items-center gap-1.5" title="Live Volume Tracking">
                    <Rss className="w-3 h-3 text-[--accent-text]" />
                    <span className="truncate">{beer.mqtt_topic}</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5" title="Container Type & Volume">
                    <Package className="w-3 h-3 text-[--accent-text]" />
                    <span>{beer.container_type} ({beer.container_volume}L)</span>
                </div>
              )}
              <div className="flex items-center gap-1.5" title="Total Volume Remaining">
                <Container className="w-3 h-3 text-[--accent-text]" />
                <span>{totalCurrentLiters.toFixed(isMqttTracked ? 2 : 1)}{totalLitersUnit}</span>
                {isMqttTracked && !beer.mqtt_last_value && (
                    <span className="text-red-500 text-xs ml-1">(No data)</span>
                )}
              </div>
              {beer.url ? (
                <a
                  href={beer.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-[--accent-text] hover:text-[--primary-text] hover:underline"
                  title="Recipe/Link"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span className="font-medium truncate">Recipe</span>
                </a>
              ) : (
                <div className="flex items-center gap-1.5">
                  <span className="text-gray-400 text-xs">No link</span>
                </div>
              )}
            </div>

            {/* Container quantity under the line */}
            {(!isMqttTracked && beer.current_quantity > 0) && (
              <div className="pt-2 border-t border-[--border-color]">
                <div className="flex justify-center items-center gap-4 text-xs">
                  <div className="flex items-center gap-1">
                      <Cylinder className="w-3 h-3 text-[--accent-text]" />
                      <span className="font-bold">{beer.current_quantity} remaining</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>

        <CardFooter className="p-4 pt-2">
          {isRfidTracked ? (
            <div className="w-full text-center text-xs py-2 text-[--secondary-text] bg-[--outline-hover-bg] rounded-md">
                Automatic stock tracked via RFID
            </div>
          ) : isMqttTracked ? (
            <div className="w-full text-center text-xs py-2 text-[--secondary-text] bg-[--outline-hover-bg] rounded-md">
                Live volume tracked via MQTT
            </div>
          ) : (
            <Dialog open={isDialogOpen} onOpenChange={handleDialogChange}>
              <DialogTrigger asChild>
                <Button
                  size="sm"
                  className="w-full text-white"
                  style={{ backgroundColor: 'var(--button-bg)' }} onMouseOver={e => e.currentTarget.style.backgroundColor = 'var(--button-bg-hover)'} onMouseOut={e => e.currentTarget.style.backgroundColor = 'var(--button-bg)'}
                >
                  <ClipboardList className="w-4 h-4 mr-2" />
                  Change Stock
                </Button>
              </DialogTrigger>
              <DialogContent>
                {/* Hidden dummy input to capture initial focus and prevent keyboard */}
                <input 
                  type="text" 
                  style={{ 
                    position: 'absolute', 
                    left: '-9999px', 
                    width: '1px', 
                    height: '1px',
                    opacity: 0,
                    pointerEvents: 'none'
                  }} 
                  autoFocus 
                  readOnly 
                />
                
                <DialogHeader>
                  <DialogTitle>Register Stock Change - {beer.name}</DialogTitle>
                  <DialogDescription>
                    Register containers removed from or added to your stock.
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-4">
                  <div className="space-y-2">
                    <Label className="text-center block">Quantity (Available: {beer.current_quantity})</Label>
                    <div className="flex items-center justify-center gap-2">
                      <Button variant="outline" size="icon" className="h-12 w-12 flex-shrink-0" onClick={decrement} disabled={consumedQuantity <= 0}>
                        <Minus className="h-6 w-6" />
                      </Button>
                      <Input
                        type="tel" // Changed from "number" to "tel"
                        pattern="[0-9]*" // Added pattern for numeric keyboard on mobile
                        min="0"
                        value={consumedQuantity}
                        onChange={(e) => handleQuantityChange(e.target.value)}
                        className="text-center w-24 text-2xl font-bold h-12"
                        placeholder="0"
                        // autoFocus removed as per change outline
                      />
                      <Button variant="outline" size="icon" className="h-12 w-12 flex-shrink-0" onClick={increment}>
                        <Plus className="h-6 w-6" />
                      </Button>
                    </div>
                  </div>
                  <div>
                    <Label>Notes (optional)</Label>
                    <Textarea
                      placeholder="Any tasting notes or comments..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={3}
                    />
                  </div>
                </div>
                <DialogFooter className="grid grid-cols-2 gap-2 sm:gap-4">
                  <Button
                    variant="destructive"
                    onClick={() => handleStockChange('out')}
                    disabled={
                      isProcessing ||
                      (consumedQuantity === 0) ||
                      consumedQuantity > beer.current_quantity
                    }
                  >
                    <Minus className="w-4 h-4 mr-2" />
                    Remove from Stock
                  </Button>
                  <Button
                    className="bg-green-600 hover:bg-green-700"
                    onClick={() => handleStockChange('in')}
                    disabled={isProcessing || (consumedQuantity === 0)}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add to Stock
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </CardFooter>
      </Card>

      {showPinDialog && (
        <PinProtection
          isOpen={showPinDialog}
          onClose={() => setShowPinDialog(false)}
          actionName="edit this beer"
          onAuthenticated={() => window.location.href = createPageUrl(`EditBeer?id=${beer.id}`)}
        />
      )}

      <MoveBeerDialog
        isOpen={isMoveDialogOpen}
        onClose={() => setIsMoveDialogOpen(false)}
        beer={beer}
        locations={locations}
        onMoveConfirm={onMoveBeer}
      />
    </motion.div>
  );
}
