import React, { useState, useEffect, useRef } from 'react';
import { AppSettings } from '@/entities/AppSettings';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Lock, Shield } from "lucide-react";
import { motion } from "framer-motion";

export default function PinProtection({ isOpen, onClose, onAuthenticated, actionName = "perform this action" }) {
    const [pin, setPin] = useState(['', '', '', '']);
    const [storedPin, setStoredPin] = useState(null);
    const [error, setError] = useState('');
    const [isVerifying, setIsVerifying] = useState(false);
    const [isSettingFirstPin, setIsSettingFirstPin] = useState(false);
    const inputRefs = useRef([]);

    useEffect(() => {
        const loadStoredPin = async () => {
            try {
                const settings = await AppSettings.list();
                if (settings.length > 0 && settings[0].pin_code) {
                    setStoredPin(settings[0].pin_code);
                    setIsSettingFirstPin(false);
                } else {
                    setIsSettingFirstPin(true);
                }
            } catch (error) {
                console.error("Error loading PIN:", error);
                setIsSettingFirstPin(true);
            }
        };

        if (isOpen) {
            loadStoredPin();
            // Reset state and focus on the first input when the dialog opens
            setPin(['', '', '', '']);
            setError('');
            setTimeout(() => inputRefs.current[0]?.focus(), 200);
        }
    }, [isOpen]);

    const handlePinSubmit = async (e) => {
        e.preventDefault();
        const enteredPin = pin.join('');
        if (enteredPin.length !== 4) {
            setError('PIN must be 4 digits');
            return;
        }

        setIsVerifying(true);
        setError('');

        try {
            if (isSettingFirstPin) {
                const settings = await AppSettings.list();
                const settingsData = {
                    pin_code: enteredPin,
                    dashboard_title: settings[0]?.dashboard_title || 'Brewery Dashboard',
                    dashboard_subtitle: settings[0]?.dashboard_subtitle || 'Track your homemade beer collection and consumption',
                    background_color: settings[0]?.background_color || 'amber',
                    logo_url: settings[0]?.logo_url || ''
                };

                if (settings.length > 0) {
                    await AppSettings.update(settings[0].id, { ...settings[0], pin_code: enteredPin });
                } else {
                    await AppSettings.create(settingsData);
                }
        
                onAuthenticated();
                onClose();
            } else {
                if (enteredPin === storedPin) {
                    onAuthenticated();
                    onClose();
                } else {
                    setError('Incorrect PIN');
                    setPin(['', '', '', '']);
                    setTimeout(() => inputRefs.current[0]?.focus(), 100);
                }
            }
        } catch (error) {
            console.error("Error with PIN:", error);
            setError('Error processing PIN');
        } finally {
            setIsVerifying(false);
        }
    };
  
    const handlePinChange = (e, index) => {
        const { value } = e.target;
        const newPin = [...pin];
    
        if (!/^\d*$/.test(value)) return;

        newPin[index] = value.slice(-1);
        setPin(newPin);

        if (value && index < 3) {
            inputRefs.current[index + 1]?.focus();
        }
    };
  
    const handleKeyDown = (e, index) => {
        if (e.key === 'Backspace' && !pin[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };
    
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Shield className="w-5 h-5 text-blue-600" />
                        {isSettingFirstPin ? 'Set Security PIN' : 'Enter Security PIN'}
                    </DialogTitle>
                    <DialogDescription>
                        {isSettingFirstPin 
                            ? 'Create a 4-digit PIN to protect sensitive actions.'
                            : `Enter your 4-digit PIN to ${actionName}.`
                        }
                    </DialogDescription>
                </DialogHeader>
      
                <motion.form 
                    onSubmit={handlePinSubmit} 
                    className="space-y-6"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <div className="flex justify-center gap-3">
                        {pin.map((digit, index) => (
                            <input
                                key={index}
                                ref={(el) => (inputRefs.current[index] = el)}
                                type="password"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                maxLength="1"
                                value={digit}
                                onChange={(e) => handlePinChange(e, index)}
                                onKeyDown={(e) => handleKeyDown(e, index)}
                                disabled={isVerifying}
                                className={`w-12 h-14 text-center text-2xl font-bold border-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${
                                    isVerifying 
                                        ? 'bg-gray-100 border-gray-300 text-gray-400 cursor-not-allowed' 
                                        : 'bg-white border-gray-300 text-gray-900 hover:border-gray-400'
                                } ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
                            />
                        ))}
                    </div>
        
                    {error && (
                        <motion.p 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="text-red-600 text-sm text-center font-medium"
                        >
                            {error}
                        </motion.p>
                    )}
        
                    <div className="flex gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                            className="w-full"
                            disabled={isVerifying}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={isVerifying || pin.join('').length !== 4}
                            className="w-full bg-gray-700 hover:bg-gray-800 text-white"
                        >
                            {isVerifying ? (
                                'Verifying...'
                            ) : isSettingFirstPin ? (
                                'Set PIN'
                            ) : (
                                <>
                                    <Lock className="w-4 h-4 mr-2" />
                                    Unlock
                                </>
                            )}
                        </Button>
                    </div>
                </motion.form>
            </DialogContent>
        </Dialog>
    );
}