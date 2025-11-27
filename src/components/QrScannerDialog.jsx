
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, CameraOff, RefreshCw, Focus } from "lucide-react";

export default function QrScannerDialog({ isOpen, onClose, onScan }) {
    const videoRef = useRef(null);
    const [error, setError] = useState('');
    const [devices, setDevices] = useState([]);
    const [selectedDeviceId, setSelectedDeviceId] = useState(null);
    const [currentCameraLabel, setCurrentCameraLabel] = useState('');
    
    // Effect to initialize and manage the camera stream and scanning process
    useEffect(() => {
        if (!isOpen) {
            return;
        }
        
        // Capture the current ref value to use in the cleanup function, preventing a race condition.
        const videoElement = videoRef.current;

        if (!("BarcodeDetector" in window)) {
            setError("QR code scanning is not supported by your browser. Please try using a recent version of Google Chrome.");
            return;
        }

        const barcodeDetector = new window.BarcodeDetector({ formats: ['qr_code'] });
        let stream = null;
        let animationFrameId;

        const startScan = async (deviceId) => {
            setError('');
            
            // Stop any existing stream before starting a new one
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }

            try {
                // Get device list if we don't have it yet
                if (devices.length === 0) {
                    await navigator.mediaDevices.getUserMedia({ video: true }); // Request permission
                    const allDevices = await navigator.mediaDevices.enumerateDevices();
                    const videoDevices = allDevices.filter(d => d.kind === 'videoinput');
                    setDevices(videoDevices);
                    
                    // If no deviceId was passed, find a default (prefer back camera)
                    if (!deviceId && videoDevices.length > 0) {
                        const backCamera = videoDevices.find(d => d.label.toLowerCase().includes('back'));
                        deviceId = backCamera ? backCamera.deviceId : videoDevices[0].deviceId;
                        setSelectedDeviceId(deviceId);
                    }
                }

                if (!deviceId) {
                    setError("No camera found.");
                    return;
                }

                // Get camera info for display
                const selectedDevice = devices.find(d => d.deviceId === deviceId);
                if (selectedDevice) {
                    setCurrentCameraLabel(selectedDevice.label || 'Camera');
                }

                // Enhanced constraints for better QR code scanning
                const constraints = {
                    video: {
                        deviceId: { exact: deviceId },
                        width: { ideal: 1280, min: 640 },
                        height: { ideal: 720, min: 480 },
                        focusMode: 'continuous',
                        // These settings help with QR code scanning
                        focusDistance: { ideal: 0.1 }, // Close focus for QR codes
                        zoom: { ideal: 1.0 },
                        torch: false,
                    }
                };

                stream = await navigator.mediaDevices.getUserMedia(constraints);
                
                if (videoElement) {
                    videoElement.srcObject = stream;
                    await videoElement.play();

                    // Apply additional settings to the video track for better scanning
                    const videoTrack = stream.getVideoTracks()[0];
                    if (videoTrack) {
                        const capabilities = videoTrack.getCapabilities();
                        const settings = {};

                        // Enable auto-focus if available
                        if (capabilities.focusMode && capabilities.focusMode.includes('continuous')) {
                            settings.focusMode = 'continuous';
                        }

                        // Set focus distance for close-up scanning if supported
                        if (capabilities.focusDistance) {
                            settings.focusDistance = 0.1; // Close focus
                        }

                        // Apply enhanced settings
                        if (Object.keys(settings).length > 0) {
                            try {
                                await videoTrack.applyConstraints({ advanced: [settings] });
                            } catch (constraintError) {
                                console.log('Some camera constraints not supported:', constraintError);
                                // Continue without advanced constraints
                            }
                        }
                    }

                    const detect = () => {
                        if (!videoElement || videoElement.readyState < 2) {
                            animationFrameId = requestAnimationFrame(detect);
                            return;
                        }
                        barcodeDetector.detect(videoElement)
                            .then(barcodes => {
                                if (barcodes.length > 0) {
                                    onScan(barcodes[0].rawValue);
                                    onClose(); // This will trigger the cleanup
                                } else {
                                    animationFrameId = requestAnimationFrame(detect);
                                }
                            })
                            .catch(err => {
                                console.error("Barcode detection failed:", err);
                                setError("An error occurred during scanning.");
                            });
                    };
                    detect();
                }
            } catch (err) {
                console.error("Camera access error:", err);
                if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
                    setError("Camera access was denied. Please enable camera permissions in your browser settings.");
                } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
                    setError("No camera was found on your device.");
                } else {
                    setError("Could not access the camera. It might be in use by another app.");
                }
            }
        };

        startScan(selectedDeviceId);

        return () => {
            cancelAnimationFrame(animationFrameId);
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
            if (videoElement) {
                videoElement.srcObject = null;
            }
        };
    }, [isOpen, selectedDeviceId, onClose, onScan, devices]);

    const handleSwitchCamera = () => {
        if (devices.length < 2) return;
        const currentIndex = devices.findIndex(device => device.deviceId === selectedDeviceId);
        const nextIndex = (currentIndex + 1) % devices.length;
        setSelectedDeviceId(devices[nextIndex].deviceId);
    };

    const handleTapToFocus = async (e) => {
        if (!videoRef.current || !videoRef.current.srcObject) return;
        
        const videoTrack = videoRef.current.srcObject.getVideoTracks()[0];
        if (!videoTrack) return;

        const capabilities = videoTrack.getCapabilities();
        if (capabilities.focusMode && capabilities.focusMode.includes('manual')) {
            try {
                // Try to trigger manual focus
                await videoTrack.applyConstraints({
                    advanced: [{ focusMode: 'manual', focusDistance: 0.1 }]
                });
                
                // Switch back to continuous after a moment
                setTimeout(async () => {
                    try {
                        await videoTrack.applyConstraints({
                            advanced: [{ focusMode: 'continuous' }]
                        });
                    } catch (e) {
                        console.log('Focus reset failed:', e);
                    }
                }, 500);
            } catch (error) {
                console.log('Manual focus not supported:', error);
            }
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Scan QR Code</DialogTitle>
                    <DialogDescription>
                        Point your camera at a QR code to scan the link.
                        {currentCameraLabel && ` Using: ${currentCameraLabel}`}
                    </DialogDescription>
                </DialogHeader>
                <div className="relative aspect-square bg-gray-900 rounded-lg overflow-hidden">
                    <video 
                        ref={videoRef} 
                        className="w-full h-full object-cover cursor-crosshair" 
                        playsInline 
                        onClick={handleTapToFocus}
                    />
                    
                    {/* Scanning overlay to help with positioning */}
                    <div className="absolute inset-0 pointer-events-none">
                        <div className="absolute inset-1/4 border-2 border-white/50 rounded-lg">
                            <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-blue-400 rounded-tl-lg"></div>
                            <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-blue-400 rounded-tr-lg"></div>
                            <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-blue-400 rounded-bl-lg"></div>
                            <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-blue-400 rounded-br-lg"></div>
                        </div>
                    </div>
                    
                    {error && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 text-white p-4 text-center">
                            <CameraOff className="w-12 h-12 mb-4" />
                            <p className="font-semibold">Scan Failed</p>
                            <p className="text-sm">{error}</p>
                        </div>
                    )}
                    
                    {/* Camera controls */}
                    <div className="absolute bottom-4 left-4 right-4 flex justify-between">
                        {/* Tap to focus hint */}
                        <div className="flex items-center gap-2 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
                            <Focus className="w-3 h-3" />
                            <span>Tap to focus</span>
                        </div>
                        
                        {/* Switch camera button */}
                        {devices.length > 1 && (
                            <Button
                                variant="secondary"
                                size="icon"
                                onClick={handleSwitchCamera}
                                className="rounded-full h-12 w-12 shadow-lg"
                            >
                                <RefreshCw className="w-6 h-6" />
                            </Button>
                        )}
                    </div>
                </div>
                
                <div className="text-center text-sm text-gray-600 space-y-1">
                    <p>💡 <strong>Tips for better scanning:</strong></p>
                    <p>• Hold steady and keep QR code within the frame</p>
                    <p>• Tap the video to focus if QR code looks blurry</p>
                    <p>• Use back camera when possible for better focus</p>
                </div>
                
                <Button variant="outline" onClick={onClose} className="w-full">
                    <X className="w-4 h-4 mr-2" /> Cancel
                </Button>
            </DialogContent>
        </Dialog>
    );
}
