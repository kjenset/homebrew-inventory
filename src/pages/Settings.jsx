
import React, { useState, useEffect } from 'react';
import { AppSettings, StorageLocation, Beer } from '@/entities/all';
import { UploadFile } from '@/integrations/Core';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Save, Loader2, Settings as SettingsIcon, Upload, Image, Plus, Trash2, MapPin, Edit2, X, KeyRound, Rss, Thermometer, Calendar, AlertTriangle, Grid3X3, Home, Lock, Droplet, ExternalLink, Globe, DoorOpen } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion } from "framer-motion";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { testMqttConnection } from "@/functions/testMqttConnection";
import { updateMqttData } from "@/functions/updateMqttData";
import { eraseAllData } from "@/functions/eraseAllData";
import { testHomeAssistantConnection } from "@/functions/testHomeAssistantConnection";
import { updateHomeAssistantData } from "@/functions/updateHomeAssistantData";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";


const iconOptions = [
    { value: 'TrendingUp', label: 'Trending Up', icon: <></> }, // No longer used, but keeping the array structure for safety if it's referenced elsewhere.
    { value: 'Wifi', label: 'Wi-Fi', icon: <></> },
    { value: 'Package', label: 'Package', icon: <></> },
    { value: 'BarChart', label: 'Bar Chart', icon: <></> },
];

export default function SettingsPage() {
    const navigate = useNavigate();
    const [settings, setSettings] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isUploadingLogo, setIsUploadingLogo] = useState(false);

    // State for locations management
    const [locations, setLocations] = useState([]);
    const [newLocationName, setNewLocationName] = useState("");
    const [isSubmittingLocation, setIsSubmittingLocation] = useState(false);
    const [isDeleting, setIsDeleting] = useState(null);
    const [beersByLocation, setBeersByLocation] = useState({});
    const [editingLocation, setEditingLocation] = useState(null);
    const [editingName, setEditingName] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    // New state for MQTT testing and updating
    const [testResult, setTestResult] = useState(null);
    const [isUpdatingMqtt, setIsUpdatingMqtt] = useState(false);
    const [mqttTestStatus, setMqttTestStatus] = useState('untested'); // 'untested', 'testing', 'success', 'error'

    // New state for Home Assistant testing and updating
    const [haTestResult, setHaTestResult] = useState(null);
    const [isUpdatingHa, setIsUpdatingHa] = useState(false);
    const [haTestStatus, setHaTestStatus] = useState('untested');

    // State for Danger Zone
    const [isErasing, setIsErasing] = useState(false);
    const [eraseConfirmation, setEraseConfirmation] = useState("");

    // New constants for disabling toggles
    const isMqttTempDisabled = settings?.ha_temp_enabled;
    const isHaTempDisabled = settings?.mqtt_temp_enabled;

    const isMqttDoorDisabled = settings?.ha_door_enabled;
    const isHaDoorDisabled = settings?.mqtt_door_enabled;
    
    const isMqttLeakDisabled = settings?.ha_leak_enabled;
    const isHaLeakDisabled = settings?.mqtt_leak_enabled;

    useEffect(() => {
        loadAllData();
    }, []);

    const loadAllData = async () => {
        setIsLoading(true);
        try {
            const [settingsData, locationsData, beersData] = await Promise.all([
                AppSettings.list(),
                StorageLocation.list(),
                Beer.list()
            ]);

            // Handle settings with proper null checks
            if (settingsData && settingsData.length > 0) {
                setSettings({
                    ...settingsData[0],
                    pin_protection_enabled: settingsData[0].pin_protection_enabled ?? true,
                    grid_layout: settingsData[0].grid_layout || 'standard',
                    brewfather_user_id: settingsData[0].brewfather_user_id || '',
                    brewfather_api_key: settingsData[0].brewfather_api_key || '',
                    mqtt_enabled: settingsData[0].mqtt_enabled ?? false,
                    mqtt_broker_url: settingsData[0].mqtt_broker_url || '',
                    mqtt_port: settingsData[0].mqtt_port || '',
                    mqtt_username: settingsData[0].mqtt_username || '',
                    mqtt_password: settingsData[0].mqtt_password || '',
                    mqtt_temp_enabled: settingsData[0].mqtt_temp_enabled ?? false,
                    mqtt_temp_topic: settingsData[0].mqtt_temp_topic || '',
                    mqtt_temp_location: settingsData[0].mqtt_temp_location || 'Main Fridge',
                    mqtt_door_enabled: settingsData[0].mqtt_door_enabled ?? false,
                    mqtt_door_topic: settingsData[0].mqtt_door_topic || '',
                    mqtt_door_location: settingsData[0].mqtt_door_location || 'Fermentation Chamber',
                    mqtt_leak_enabled: settingsData[0].mqtt_leak_enabled ?? false,
                    mqtt_leak_topic: settingsData[0].mqtt_leak_topic || '',
                    mqtt_leak_location: settingsData[0].mqtt_leak_location || 'Basement',
                    public_menu_enabled: settingsData[0].public_menu_enabled ?? false,
                    public_menu_title: settingsData[0].public_menu_title || "What's On Tap",
                    temp_alert_enabled: settingsData[0].temp_alert_enabled ?? false,
                    temp_alert_threshold: settingsData[0].temp_alert_threshold || '',
                    temp_alert_email: settingsData[0].temp_alert_email || '',
                    ha_enabled: settingsData[0].ha_enabled ?? false,
                    ha_url: settingsData[0].ha_url || '',
                    ha_token: settingsData[0].ha_token || '',
                    ha_temp_enabled: settingsData[0].ha_temp_enabled ?? false,
                    ha_temp_entity: settingsData[0].ha_temp_entity || '',
                    ha_temp_location: settingsData[0].ha_temp_location || '',
                    ha_door_enabled: settingsData[0].ha_door_enabled ?? false,
                    ha_door_entity: settingsData[0].ha_door_entity || '',
                    ha_door_location: settingsData[0].ha_door_location || '',
                    ha_leak_enabled: settingsData[0].ha_leak_enabled ?? false,
                    ha_leak_entity: settingsData[0].ha_leak_entity || '',
                    ha_leak_location: settingsData[0].ha_leak_location || '',
                });
            } else {
                setSettings({
                    dashboard_title: 'Brewery Dashboard',
                    dashboard_subtitle: 'Track your homemade beer collection and consumption',
                    background_color: 'amber',
                    grid_layout: 'standard',
                    logo_url: '',
                    pin_code: '',
                    pin_protection_enabled: true,
                    brewfather_user_id: '',
                    brewfather_api_key: '',
                    mqtt_enabled: false,
                    mqtt_broker_url: '',
                    mqtt_port: '',
                    mqtt_username: '',
                    mqtt_password: '',
                    mqtt_temp_enabled: false,
                    mqtt_temp_topic: '',
                    mqtt_temp_location: 'Main Fridge',
                    mqtt_door_enabled: false,
                    mqtt_door_topic: '',
                    mqtt_door_location: 'Fermentation Chamber',
                    mqtt_leak_enabled: false,
                    mqtt_leak_topic: '',
                    mqtt_leak_location: 'Basement',
                    public_menu_enabled: false,
                    public_menu_title: "What's On Tap",
                    temp_alert_enabled: false,
                    temp_alert_threshold: '',
                    temp_alert_email: '',
                    ha_enabled: false,
                    ha_url: '',
                    ha_token: '',
                    ha_temp_enabled: false,
                    ha_temp_entity: '',
                    ha_temp_location: '',
                    ha_door_enabled: false,
                    ha_door_entity: '',
                    ha_door_location: '',
                    ha_leak_enabled: false,
                    ha_leak_entity: '',
                    ha_leak_location: '',
                });
            }

            // Handle locations with proper null checks
            const safeLocationsData = locationsData || [];
            const safeBeersData = beersData || [];
            
            const beersCount = safeBeersData.reduce((acc, beer) => {
              if (beer && beer.location_id) {
                acc[beer.location_id] = (acc[beer.location_id] || 0) + 1;
              }
              return acc;
            }, {});
            
            setBeersByLocation(beersCount);
            setLocations(safeLocationsData);

        } catch (error) {
            console.error("Error loading settings and locations:", error);
            // Initialize with defaults on error
            setSettings({
                dashboard_title: 'Brewery Dashboard',
                dashboard_subtitle: 'Track your homemade beer collection and consumption',
                background_color: 'amber',
                grid_layout: 'standard',
                logo_url: '',
                pin_code: '',
                pin_protection_enabled: true,
                brewfather_user_id: '',
                brewfather_api_key: '',
                mqtt_enabled: false,
                mqtt_broker_url: '',
                mqtt_port: '',
                mqtt_username: '',
                mqtt_password: '',
                mqtt_temp_enabled: false,
                mqtt_temp_topic: '',
                mqtt_temp_location: 'Main Fridge',
                mqtt_door_enabled: false,
                mqtt_door_topic: '',
                mqtt_door_location: 'Fermentation Chamber',
                mqtt_leak_enabled: false,
                mqtt_leak_topic: '',
                mqtt_leak_location: 'Basement',
                public_menu_enabled: false,
                public_menu_title: "What's On Tap",
                temp_alert_enabled: false,
                temp_alert_threshold: '',
                temp_alert_email: '',
                ha_enabled: false,
                ha_url: '',
                ha_token: '',
                ha_temp_enabled: false,
                ha_temp_entity: '',
                ha_temp_location: '',
                ha_door_enabled: false,
                ha_door_entity: '',
                ha_door_location: '',
                ha_leak_enabled: false,
                ha_leak_entity: '',
                ha_leak_location: '',
            });
            setLocations([]);
            setBeersByLocation({});
        }
        setIsLoading(false);
    };

    const handleInputChange = (field, value) => {
        // Prevent enabling a sensor if its counterpart is already active
        if (value === true) {
            const conflictMap = {
                ha_temp_enabled: { other: 'mqtt_temp_enabled', name: 'Home Assistant Temperature', otherName: 'MQTT Temperature' },
                mqtt_temp_enabled: { other: 'ha_temp_enabled', name: 'MQTT Temperature', otherName: 'Home Assistant Temperature' },
                ha_door_enabled: { other: 'mqtt_door_enabled', name: 'Home Assistant Door', otherName: 'MQTT Door' },
                mqtt_door_enabled: { other: 'ha_door_enabled', name: 'MQTT Door', otherName: 'Home Assistant Door' },
                ha_leak_enabled: { other: 'mqtt_leak_enabled', name: 'Home Assistant Leak', otherName: 'MQTT Leak' },
                mqtt_leak_enabled: { other: 'ha_leak_enabled', name: 'MQTT Leak', otherName: 'Home Assistant Leak' },
            };

            const conflict = conflictMap[field];
            if (conflict && settings[conflict.other]) {
                alert(`Cannot enable ${conflict.name} sensor while ${conflict.otherName} sensor is active. Please disable the other sensor first.`);
                return; // Exit without changing state
            }
        }

        // Existing logic for resetting test status
        if (field.startsWith('mqtt_')) {
            setMqttTestStatus('untested');
            setTestResult(null);
        }
        if (field.startsWith('ha_')) {
            setHaTestStatus('untested');
            setHaTestResult(null);
        }
        setSettings(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleLogoUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setIsUploadingLogo(true);
        try {
            const { file_url } = await UploadFile({ file });
            handleInputChange('logo_url', file_url);
        } catch (error) {
            console.error("Error uploading logo:", error);
        } finally {
            setIsUploadingLogo(false);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const payload = {
                dashboard_title: settings.dashboard_title,
                dashboard_subtitle: settings.dashboard_subtitle,
                background_color: settings.background_color,
                logo_url: settings.logo_url || null,
                pin_code: settings.pin_code || null,
                pin_protection_enabled: settings.pin_protection_enabled ?? true,
                grid_layout: settings.grid_layout || 'standard',
                brewfather_user_id: settings.brewfather_user_id || null,
                brewfather_api_key: settings.brewfather_api_key || null,
                mqtt_enabled: settings.mqtt_enabled ?? false,
                mqtt_broker_url: settings.mqtt_broker_url || null,
                mqtt_port: settings.mqtt_port ? parseInt(settings.mqtt_port, 10) : null,
                mqtt_username: settings.mqtt_username || null,
                mqtt_password: settings.mqtt_password || null,
                mqtt_temp_enabled: settings.mqtt_temp_enabled ?? false,
                mqtt_temp_topic: settings.mqtt_temp_topic || null,
                mqtt_temp_location: settings.mqtt_temp_location || 'Main Fridge',
                mqtt_door_enabled: settings.mqtt_door_enabled ?? false,
                mqtt_door_topic: settings.mqtt_door_topic || null,
                mqtt_door_location: settings.mqtt_door_location || 'Fermentation Chamber',
                mqtt_leak_enabled: settings.mqtt_leak_enabled ?? false,
                mqtt_leak_topic: settings.mqtt_leak_topic || null,
                mqtt_leak_location: settings.mqtt_leak_location || 'Basement',
                public_menu_enabled: settings.public_menu_enabled ?? false,
                public_menu_title: settings.public_menu_title || "What's On Tap",
                temp_alert_enabled: settings.temp_alert_enabled ?? false,
                temp_alert_threshold: settings.temp_alert_threshold ? parseFloat(settings.temp_alert_threshold) : null,
                temp_alert_email: settings.temp_alert_email || null,
                ha_enabled: settings.ha_enabled ?? false,
                ha_url: settings.ha_url || null,
                ha_token: settings.ha_token || null,
                ha_temp_enabled: settings.ha_temp_enabled ?? false,
                ha_temp_entity: settings.ha_temp_entity || null,
                ha_temp_location: settings.ha_temp_location || null,
                ha_door_enabled: settings.ha_door_enabled ?? false,
                ha_door_entity: settings.ha_door_entity || null,
                ha_door_location: settings.ha_door_location || null,
                ha_leak_enabled: settings.ha_leak_enabled ?? false,
                ha_leak_entity: settings.ha_leak_entity || null,
                ha_leak_location: settings.ha_leak_location || null,
            };

            if (settings.id) {
                await AppSettings.update(settings.id, payload);
            } else {
                const newSettings = await AppSettings.create(payload);
                setSettings(prev => ({ ...prev, id: newSettings.id }));
            }
            window.location.href = createPageUrl("dashboard");
        } catch (error) {
            console.error("Error saving settings:", error);
            setIsSubmitting(false);
        }
    };

    // Location management handlers
    const handleAddLocation = async (e) => {
        e.preventDefault();
        if (!newLocationName.trim()) return;

        setIsSubmittingLocation(true);
        try {
            await StorageLocation.create({ name: newLocationName });
            setNewLocationName("");
            await loadAllData();
        } catch (error) {
            console.error("Error adding location:", error);
        } finally {
            setIsSubmittingLocation(false);
        }
    };

    const handleDeleteLocation = async (locationId) => {
        setIsDeleting(locationId);
        try {
            await StorageLocation.delete(locationId);
            await loadAllData();
        } catch (error) {
            console.error("Error deleting location:", error);
        } finally {
            setIsDeleting(null);
        }
    };

    const startEditing = (location) => {
        setEditingLocation(location.id);
        setEditingName(location.name);
    };

    const cancelEditing = () => {
        setEditingLocation(null);
        setEditingName("");
    };

    const saveLocationName = async (locationId) => {
        if (!editingName.trim()) return;

        setIsSaving(true);
        try {
            await StorageLocation.update(locationId, { name: editingName });
            setEditingLocation(null);
            setEditingName("");
            await loadAllData();
        } catch (error) {
            console.error("Error updating location:", error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleTestMqttConnection = async () => {
        setMqttTestStatus('testing');
        setTestResult(null);
        try {
            const { data } = await testMqttConnection();
            setTestResult(data);
            if (data.success) {
                setMqttTestStatus('success');
            } else {
                setMqttTestStatus('error');
            }
        } catch (error) {
            const errorData = {
                success: false,
                error: error.response?.data?.error || 'Test failed'
            };
            setTestResult(errorData);
            setMqttTestStatus('error');
        }
    };

    const handleUpdateMqttData = async () => {
        setIsUpdatingMqtt(true);
        try {
            const { data } = await updateMqttData();
            alert(`MQTT Update Complete: ${data.message}`);
        } catch (error) {
            alert(`MQTT Update Failed: ${error.response?.data?.error || 'Unknown error'}`);
        } finally {
            setIsUpdatingMqtt(false);
        }
    };

    const handleTestHaConnection = async () => {
        setHaTestStatus('testing');
        setHaTestResult(null);

        try {
            const { data } = await testHomeAssistantConnection();
            setHaTestResult(data);
            setHaTestStatus(data.success ? 'success' : 'error');
        } catch (error) {
            setHaTestResult({ success: false, error: error.response?.data?.error || error.message });
            setHaTestStatus('error');
        }
    };

    const handleUpdateHaData = async () => {
        setIsUpdatingHa(true);
        try {
            const { data } = await updateHomeAssistantData();
            alert(`Home Assistant data updated successfully!\n\nDetails: ${data.message}`);
        } catch (error) {
            alert(`Failed to update Home Assistant data: ${error.response?.data?.error || error.message}`);
        } finally {
            setIsUpdatingHa(false);
        }
    };

    const MqttStatusIndicator = ({ status }) => {
        const statusConfig = {
            untested: { color: 'text-gray-500', bg: 'bg-gray-100', text: 'Untested' },
            testing: { color: 'text-blue-600', bg: 'bg-blue-100', text: 'Testing...' },
            success: { color: 'text-green-600', bg: 'bg-green-100', text: 'Connected' },
            error: { color: 'text-red-600', bg: 'bg-red-100', text: 'Error' },
        };
        
        const currentStatus = statusConfig[status] || statusConfig.untested;
        
        return (
          <div className={`px-2 py-1 rounded-full text-xs ${currentStatus.bg} ${currentStatus.color} flex items-center gap-1.5`}>
            <div className={`w-2 h-2 rounded-full ${status === 'testing' ? 'animate-pulse' : ''} ${
                status === 'success' ? 'bg-green-500' :
                status === 'error' ? 'bg-red-500' :
                status === 'testing' ? 'bg-blue-500' :
                'bg-gray-400'
            }`}></div>
            {currentStatus.text}
          </div>
        );
    };

    const copyPublicMenuLink = () => {
        const publicUrl = `${window.location.origin}${createPageUrl("PublicMenu")}`;
        navigator.clipboard.writeText(publicUrl);
        alert("Public menu link copied to clipboard!");
    };

    const handleEraseAllData = async () => {
        setIsErasing(true);
        try {
            await eraseAllData();
            alert("All your private data has been successfully deleted. Your settings are preserved.");
            window.location.href = createPageUrl("dashboard");
        } catch (error) {
            console.error("Error erasing data:", error);
            alert(`An error occurred: ${error.response?.data?.error || "Could not erase data."}`);
            setIsErasing(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="w-8 h-8 animate-spin text-[--accent-text]" />
            </div>
        );
    }

    return (
        <TooltipProvider>
            <div className="p-6 md:p-8 min-h-screen">
                <div className="max-w-4xl mx-auto">
                    <motion.div 
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-4 mb-8"
                    >
                        <Link to={createPageUrl("Dashboard")} className="p-2 bg-white/50 rounded-full shadow-inner hover:bg-white/70 transition-colors">
                            <ArrowLeft className="w-6 h-6 text-[--accent-text]" />
                        </Link>
                        <div>
                            <h1 className="text-4xl font-bold text-[--primary-text]">Settings</h1>
                            <p className="text-[--secondary-text]">Configure your brewery inventory app</p>
                        </div>
                    </motion.div>

                    <div className="space-y-8">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.2 }}
                        >
                            <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl">
                                <CardHeader>
                                    <CardTitle className="text-2xl text-[--primary-text] flex items-center gap-2">
                                        <SettingsIcon className="w-6 h-6" />
                                        App Customization
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <form onSubmit={handleSave} className="space-y-8">
                                        <div className="space-y-4">
                                            <Label className="text-[--primary-text] font-medium">
                                                App Logo
                                            </Label>
                                            <div className="flex items-center gap-4">
                                                {settings?.logo_url ? (
                                                    <div className="flex items-center gap-4">
                                                        <img
                                                            src={settings.logo_url}
                                                            alt="Current logo"
                                                            className="w-16 h-16 rounded-full object-cover border-2 border-[--border-color]"
                                                        />
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            onClick={() => handleInputChange('logo_url', '')}
                                                            className="text-red-600 hover:text-red-700"
                                                        >
                                                            Remove Logo
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    <div className="w-16 h-16 border-2 border-dashed border-[--border-color] rounded-full flex items-center justify-center">
                                                        <Image className="w-6 h-6 text-[--accent-text]" />
                                                    </div>
                                                )}
                                                <div className="flex-1">
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        onChange={handleLogoUpload}
                                                        disabled={isUploadingLogo}
                                                        className="hidden"
                                                        id="logo-upload"
                                                    />
                                                    <Label htmlFor="logo-upload" className="cursor-pointer">
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            disabled={isUploadingLogo}
                                                            className="border-[--border-color] hover:bg-[--outline-hover-bg]"
                                                            onClick={() => document.getElementById('logo-upload').click()}
                                                        >
                                                            {isUploadingLogo ? (
                                                                <>
                                                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                                    Uploading...
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <Upload className="w-4 h-4 mr-2" />
                                                                    {settings?.logo_url ? 'Change Logo' : 'Upload Logo'}
                                                                </>
                                                            )}
                                                        </Button>
                                                    </Label>
                                                </div>
                                            </div>
                                            <p className="text-sm text-[--secondary-text]">
                                                Upload a logo that will appear in the top-left corner. Recommended size: 100x100px or larger.
                                            </p>
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="dashboard_title" className="text-[--primary-text] font-medium">
                                                Main Title
                                            </Label>
                                            <Input
                                                id="dashboard_title"
                                                value={settings?.dashboard_title || ''}
                                                onChange={(e) => handleInputChange('dashboard_title', e.target.value)}
                                                className="border-[--border-color] focus:border-[--border-focus-color]"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="dashboard_subtitle" className="text-[--primary-text] font-medium">
                                                Subtitle
                                            </Label>
                                            <Textarea
                                                id="dashboard_subtitle"
                                                value={settings?.dashboard_subtitle || ''}
                                                onChange={(e) => handleInputChange('dashboard_subtitle', e.target.value)}
                                                rows={3}
                                                className="border-[--border-color] focus:border-[--border-focus-color]"
                                            />
                                        </div>

                                        {/* Public Menu Section */}
                                        <div className="space-y-6 p-4 bg-[--outline-hover-bg] rounded-lg border border-[--border-color]">
                                            <h3 className="text-lg font-medium text-[--primary-text] flex items-center gap-2">
                                                <Globe className="w-5 h-5" />
                                                Public Menu
                                            </h3>
                                            <p className="text-sm text-[--secondary-text]">
                                                Create a public, read-only page showing your beers in stock. Perfect for sharing what you have available with friends.
                                            </p>
                                            
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <Label className="text-[--primary-text] font-medium">Enable Public Menu</Label>
                                                    <p className="text-sm text-[--secondary-text]">
                                                        Allow others to view your beer collection (read-only)
                                                    </p>
                                                </div>
                                                <label className="relative inline-flex items-center cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={settings?.public_menu_enabled ?? false}
                                                        onChange={(e) => handleInputChange('public_menu_enabled', e.target.checked)}
                                                        className="sr-only peer"
                                                    />
                                                    <div className="w-11 h-6 bg-gray-400 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                                </label>
                                            </div>

                                            {settings?.public_menu_enabled && (
                                                <div className="space-y-4 pt-4 border-t border-[--border-color]">
                                                    <div className="space-y-2">
                                                        <Label htmlFor="public_menu_title" className="text-[--primary-text] font-medium">
                                                            Public Menu Title
                                                        </Label>
                                                        <Input
                                                            id="public_menu_title"
                                                            value={settings?.public_menu_title || ''}
                                                            onChange={(e) => handleInputChange('public_menu_title', e.target.value)}
                                                            placeholder="What's On Tap"
                                                            className="border-[--border-color] focus:border-[--border-focus-color]"
                                                        />
                                                    </div>
                                                    
                                                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                                        <div className="flex items-center justify-between">
                                                            <div>
                                                                <p className="text-sm font-medium text-blue-900">Public Menu Link</p>
                                                                <p className="text-xs text-blue-700 break-all">
                                                                    {window.location.origin}{createPageUrl("PublicMenu")}
                                                                </p>
                                                            </div>
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={copyPublicMenuLink}
                                                                className="ml-2 flex items-center gap-1"
                                                            >
                                                                <ExternalLink className="w-3 h-3" />
                                                                Copy Link
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        {/* End of Public Menu Section */}

                                        {/* Security Section */}
                                        <div className="space-y-6 p-4 bg-[--outline-hover-bg] rounded-lg border border-[--border-color]">
                                            <h3 className="text-lg font-medium text-[--primary-text]">Security Settings</h3>

                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <Label className="text-[--primary-text] font-medium">PIN Protection</Label>
                                                    <p className="text-sm text-[--secondary-text]">
                                                        Require PIN to add/edit beers and access settings
                                                    </p>
                                                </div>
                                                <label className="relative inline-flex items-center cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={settings?.pin_protection_enabled ?? true} // Default to true if undefined
                                                        onChange={(e) => handleInputChange('pin_protection_enabled', e.target.checked)}
                                                        className="sr-only peer"
                                                    />
                                                    <div className="w-11 h-6 bg-gray-400 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                                </label>
                                            </div>

                                            {(settings?.pin_protection_enabled ?? true) && ( // Conditionally render PIN input
                                                <div className="space-y-2">
                                                    <Label htmlFor="pin_code" className="text-[--primary-text] font-medium">
                                                        Security PIN (4 digits)
                                                    </Label>
                                                    <Input
                                                        id="pin_code"
                                                        type="password"
                                                        maxLength={4}
                                                        value={settings?.pin_code || ''}
                                                        onChange={(e) => {
                                                            const numericValue = e.target.value.replace(/\D/g, '');
                                                            handleInputChange('pin_code', numericValue);
                                                        }}
                                                        placeholder="****"
                                                        className="border-[--border-color] focus:border-[--border-focus-color] text-center font-mono tracking-widest"
                                                    />
                                                    <p className="text-sm text-[--secondary-text]">
                                                        This PIN protects sensitive actions like adding/editing beers and managing locations.
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                        {/* End of Security Section */}

                                        {/* Appearance & Layout Section */}
                                        <div className="space-y-6 p-4 bg-[--outline-hover-bg] rounded-lg border border-[--border-color]">
                                            <h3 className="text-lg font-medium text-[--primary-text] flex items-center gap-2">
                                                <Grid3X3 className="w-5 h-5" />
                                                Appearance & Layout
                                            </h3>
                                            <p className="text-sm text-[--secondary-text]">
                                                Customize the visual theme and how beer cards are displayed on the dashboard.
                                            </p>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div className="space-y-2">
                                                    <Label htmlFor="background_color" className="text-[--primary-text] font-medium">
                                                        Background Color Theme
                                                    </Label>
                                                    <Select
                                                        value={settings?.background_color || 'amber'}
                                                        onValueChange={(value) => handleInputChange('background_color', value)}
                                                    >
                                                        <SelectTrigger className="border-[--border-color] focus:border-[--border-focus-color]">
                                                            <SelectValue placeholder="Select a color" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="amber">Amber (Default)</SelectItem>
                                                            <SelectItem value="blue">Ocean Blue</SelectItem>
                                                            <SelectItem value="green">Forest Green</SelectItem>
                                                            <SelectItem value="purple">Royal Purple</SelectItem>
                                                            <SelectItem value="gray">Clean Gray</SelectItem>
                                                            <SelectItem value="orange">Sunset Orange</SelectItem>
                                                            <SelectItem value="red">Cherry Red</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="grid_layout" className="text-[--primary-text] font-medium">
                                                        Beer Cards Layout
                                                    </Label>
                                                    <Select
                                                        value={settings?.grid_layout || 'standard'}
                                                        onValueChange={(value) => handleInputChange('grid_layout', value)}
                                                    >
                                                        <SelectTrigger className="border-[--border-color] focus:border-[--border-focus-color]">
                                                            <SelectValue placeholder="Select a layout" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="compact">Compact (4 columns)</SelectItem>
                                                            <SelectItem value="standard">Standard (3 columns)</SelectItem>
                                                            <SelectItem value="comfortable">Comfortable (2 columns)</SelectItem>
                                                            <SelectItem value="list">List View (1 column)</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                    <p className="text-xs text-[--secondary-text]">
                                                        Choose how beer cards are arranged on the dashboard.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                        {/* End of Appearance & Layout Section */}

                                        {/* Brewfather Integration Section */}
                                        <div className="space-y-6 p-4 bg-[--outline-hover-bg] rounded-lg border border-[--border-color]">
                                            <h3 className="text-lg font-medium text-[--primary-text] flex items-center gap-2">
                                                <KeyRound className="w-5 h-5" />
                                                Brewfather API Integration
                                            </h3>
                                            <p className="text-sm text-[--secondary-text]">
                                                Enter your Brewfather API credentials to enable batch importing. You can find these in your Brewfather account settings.
                                            </p>
                                            <div className="space-y-2">
                                                <Label htmlFor="brewfather_user_id" className="text-[--primary-text] font-medium">
                                                    Brewfather User ID
                                                </Label>
                                                <Input
                                                    id="brewfather_user_id"
                                                    value={settings?.brewfather_user_id || ''}
                                                    onChange={(e) => handleInputChange('brewfather_user_id', e.target.value)}
                                                    placeholder="Your User ID"
                                                    className="border-[--border-color] focus:border-[--border-focus-color]"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="brewfather_api_key" className="text-[--primary-text] font-medium">
                                                    Brewfather API Key
                                                </Label>
                                                <Input
                                                    id="brewfather_api_key"
                                                    type="password"
                                                    value={settings?.brewfather_api_key || ''}
                                                    onChange={(e) => handleInputChange('brewfather_api_key', e.target.value)}
                                                    placeholder="Your API Key"
                                                    className="border-[--border-color] focus:border-[--border-focus-color]"
                                                />
                                            </div>
                                        </div>
                                        {/* End of Brewfather Integration Section */}

                                        {/* MQTT Integration Section */}
                                        <div className="space-y-6 p-4 bg-white/80 backdrop-blur-sm border-0 shadow-lg">
                                            <div className="flex items-center justify-between">
                                              <h3 className="text-lg font-medium text-[--primary-text] flex items-center gap-2">
                                                  <Rss className="w-5 h-5" />
                                                  MQTT Broker Integration
                                              </h3>
                                              <MqttStatusIndicator status={mqttTestStatus} />
                                            </div>
                                            <p className="text-sm text-[--secondary-text]">
                                                Configure your MQTT broker to enable live data tracking for your beers and temperature monitoring.
                                            </p>
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <Label className="text-[--primary-text] font-medium">Activate MQTT</Label>
                                                    <p className="text-sm text-[--secondary-text]">
                                                        Enable publishing data to an MQTT broker.
                                                    </p>
                                                </div>
                                                <label className="relative inline-flex items-center cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={settings?.mqtt_enabled ?? false}
                                                        onChange={(e) => handleInputChange('mqtt_enabled', e.target.checked)}
                                                        className="sr-only peer"
                                                    />
                                                    <div className="w-11 h-6 bg-gray-400 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                                </label>
                                            </div>

                                            {(settings?.mqtt_enabled) && (
                                                <div className="space-y-4 pt-4 border-t border-[--border-color]">
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        <div className="space-y-2">
                                                            <Label htmlFor="mqtt_broker_url" className="text-[--primary-text] font-medium">
                                                                Broker URL
                                                            </Label>
                                                            <Input
                                                                id="mqtt_broker_url"
                                                                value={settings?.mqtt_broker_url || ''}
                                                                onChange={(e) => handleInputChange('mqtt_broker_url', e.target.value)}
                                                                placeholder="e.g., broker.hivemq.com or mqtt://broker.example.com"
                                                                className="border-[--border-color] focus:border-[--border-focus-color]"
                                                            />
                                                            <p className="text-xs text-[--secondary-text]">
                                                                You can include the protocol (mqtt:// or mqtts://) or just the hostname
                                                            </p>
                                                        </div>
                                                        <div className="space-y-2">
                                                            <Label htmlFor="mqtt_port" className="text-[--primary-text] font-medium">
                                                                Port
                                                            </Label>
                                                            <Input
                                                                id="mqtt_port"
                                                                type="number"
                                                                value={settings?.mqtt_port || ''}
                                                                onChange={(e) => handleInputChange('mqtt_port', e.target.value)}
                                                                placeholder="e.g., 1883 or 8883 for TLS"
                                                                className="border-[--border-color] focus:border-[--border-focus-color]"
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        <div className="space-y-2">
                                                            <Label htmlFor="mqtt_username" className="text-[--primary-text] font-medium">
                                                                Username
                                                            </Label>
                                                            <Input
                                                                id="mqtt_username"
                                                                value={settings?.mqtt_username || ''}
                                                                onChange={(e) => handleInputChange('mqtt_username', e.target.value)}
                                                                placeholder="Optional username"
                                                                className="border-[--border-color] focus:border-[--border-focus-color]"
                                                            />
                                                        </div>
                                                        <div className="space-y-2">
                                                            <Label htmlFor="mqtt_password" className="text-[--primary-text] font-medium">
                                                                Password
                                                            </Label>
                                                            <Input
                                                                id="mqtt_password"
                                                                type="password"
                                                                value={settings?.mqtt_password || ''}
                                                                onChange={(e) => handleInputChange('mqtt_password', e.target.value)}
                                                                placeholder="Optional password"
                                                                className="border-[--border-color] focus:border-[--border-focus-color]"
                                                            />
                                                        </div>
                                                    </div>

                                                    {/* Sensor Configuration */}
                                                    <div className="pt-4 border-t border-[--border-color]">
                                                        <h4 className="text-md font-medium text-[--primary-text] mb-4 flex items-center gap-2">
                                                            Sensor Configuration
                                                        </h4>
                                                        
                                                        {/* Temperature Sensor */}
                                                        <div className="space-y-4 p-4 bg-orange-50 rounded-lg mb-4">
                                                            <div className="flex items-center justify-between">
                                                                <h5 className="font-medium text-[--primary-text] flex items-center gap-2">
                                                                    <Thermometer className="w-4 h-4" />
                                                                    Temperature Monitoring
                                                                </h5>
                                                                <Tooltip>
                                                                    <TooltipTrigger asChild>
                                                                        <div className={`relative inline-flex items-center ${isMqttTempDisabled ? 'cursor-not-allowed' : ''}`}>
                                                                            <label className={`relative inline-flex items-center ${isMqttTempDisabled ? 'opacity-50' : 'cursor-pointer'}`}>
                                                                                <input
                                                                                    type="checkbox"
                                                                                    checked={settings?.mqtt_temp_enabled ?? false}
                                                                                    onChange={(e) => handleInputChange('mqtt_temp_enabled', e.target.checked)}
                                                                                    className="sr-only peer"
                                                                                    disabled={isMqttTempDisabled}
                                                                                />
                                                                                <div className="w-11 h-6 bg-gray-400 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
                                                                            </label>
                                                                        </div>
                                                                    </TooltipTrigger>
                                                                    {isMqttTempDisabled && (
                                                                        <TooltipContent>
                                                                            <p>Disable Home Assistant temperature sensor first</p>
                                                                        </TooltipContent>
                                                                    )}
                                                                </Tooltip>
                                                            </div>
                                                            {settings?.mqtt_temp_enabled && (
                                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                    <div className="space-y-2">
                                                                        <Label htmlFor="mqtt_temp_topic" className="text-[--primary-text] font-medium">
                                                                            Temperature Topic
                                                                        </Label>
                                                                        <Input
                                                                            id="mqtt_temp_topic"
                                                                            value={settings?.mqtt_temp_topic || ''}
                                                                            onChange={(e) => handleInputChange('mqtt_temp_topic', e.target.value)}
                                                                            placeholder="e.g., brewery/fridge/temperature"
                                                                            className="border-[--border-color] focus:border-[--border-focus-color]"
                                                                        />
                                                                    </div>
                                                                    <div className="space-y-2">
                                                                        <Label htmlFor="mqtt_temp_location" className="text-[--primary-text] font-medium">
                                                                            Location Name
                                                                        </Label>
                                                                        <Input
                                                                            id="mqtt_temp_location"
                                                                            value={settings?.mqtt_temp_location || ''}
                                                                            onChange={(e) => handleInputChange('mqtt_temp_location', e.target.value)}
                                                                            placeholder="e.g., Main Fridge"
                                                                            className="border-[--border-color] focus:border-[--border-focus-color]"
                                                                        />
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Door Sensor */}
                                                        <div className="space-y-4 p-4 bg-orange-50 rounded-lg mb-4">
                                                            <div className="flex items-center justify-between">
                                                                <h5 className="font-medium text-[--primary-text] flex items-center gap-2">
                                                                    <DoorOpen className="w-4 h-4" />
                                                                    Door Sensor Monitoring
                                                                </h5>
                                                                <Tooltip>
                                                                    <TooltipTrigger asChild>
                                                                        <div className={`relative inline-flex items-center ${isMqttDoorDisabled ? 'cursor-not-allowed' : ''}`}>
                                                                            <label className={`relative inline-flex items-center ${isMqttDoorDisabled ? 'opacity-50' : 'cursor-pointer'}`}>
                                                                                <input
                                                                                    type="checkbox"
                                                                                    checked={settings?.mqtt_door_enabled ?? false}
                                                                                    onChange={(e) => handleInputChange('mqtt_door_enabled', e.target.checked)}
                                                                                    className="sr-only peer"
                                                                                    disabled={isMqttDoorDisabled}
                                                                                />
                                                                                <div className="w-11 h-6 bg-gray-400 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
                                                                            </label>
                                                                        </div>
                                                                    </TooltipTrigger>
                                                                    {isMqttDoorDisabled && (
                                                                        <TooltipContent>
                                                                            <p>Disable Home Assistant door sensor first</p>
                                                                        </TooltipContent>
                                                                    )}
                                                                </Tooltip>
                                                            </div>
                                                            {settings?.mqtt_door_enabled && (
                                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                    <div className="space-y-2">
                                                                        <Label htmlFor="mqtt_door_topic" className="text-[--primary-text] font-medium">
                                                                            Door Topic
                                                                        </Label>
                                                                        <Input
                                                                            id="mqtt_door_topic"
                                                                            value={settings?.mqtt_door_topic || ''}
                                                                            onChange={(e) => handleInputChange('mqtt_door_topic', e.target.value)}
                                                                            placeholder="e.g., brewery/door/status"
                                                                            className="border-[--border-color] focus:border-[--border-focus-color]"
                                                                        />
                                                                    </div>
                                                                    <div className="space-y-2">
                                                                        <Label htmlFor="mqtt_door_location" className="text-[--primary-text] font-medium">
                                                                            Location Name
                                                                        </Label>
                                                                        <Input
                                                                            id="mqtt_door_location"
                                                                            value={settings?.mqtt_door_location || ''}
                                                                            onChange={(e) => handleInputChange('mqtt_door_location', e.target.value)}
                                                                            placeholder="e.g., Fermentation Chamber"
                                                                            className="border-[--border-color] focus:border-[--border-focus-color]"
                                                                        />
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Leak Sensor */}
                                                        <div className="space-y-4 p-4 bg-orange-50 rounded-lg">
                                                            <div className="flex items-center justify-between">
                                                                <h5 className="font-medium text-[--primary-text] flex items-center gap-2">
                                                                    <Droplet className="w-4 h-4" />
                                                                    Leak Sensor Monitoring
                                                                </h5>
                                                                <Tooltip>
                                                                    <TooltipTrigger asChild>
                                                                        <div className={`relative inline-flex items-center ${isMqttLeakDisabled ? 'cursor-not-allowed' : ''}`}>
                                                                            <label className={`relative inline-flex items-center ${isMqttLeakDisabled ? 'opacity-50' : 'cursor-pointer'}`}>
                                                                                <input
                                                                                    type="checkbox"
                                                                                    checked={settings?.mqtt_leak_enabled ?? false}
                                                                                    onChange={(e) => handleInputChange('mqtt_leak_enabled', e.target.checked)}
                                                                                    className="sr-only peer"
                                                                                    disabled={isMqttLeakDisabled}
                                                                                />
                                                                                <div className="w-11 h-6 bg-gray-400 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
                                                                            </label>
                                                                        </div>
                                                                    </TooltipTrigger>
                                                                    {isMqttLeakDisabled && (
                                                                        <TooltipContent>
                                                                            <p>Disable Home Assistant leak sensor first</p>
                                                                        </TooltipContent>
                                                                    )}
                                                                </Tooltip>
                                                            </div>
                                                            {settings?.mqtt_leak_enabled && (
                                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                    <div className="space-y-2">
                                                                        <Label htmlFor="mqtt_leak_topic" className="text-[--primary-text] font-medium">
                                                                            Leak Topic
                                                                        </Label>
                                                                        <Input
                                                                            id="mqtt_leak_topic"
                                                                            value={settings?.mqtt_leak_topic || ''}
                                                                            onChange={(e) => handleInputChange('mqtt_leak_topic', e.target.value)}
                                                                            placeholder="e.g., brewery/leak/status"
                                                                            className="border-[--border-color] focus:border-[--border-focus-color]"
                                                                        />
                                                                    </div>
                                                                    <div className="space-y-2">
                                                                        <Label htmlFor="mqtt_leak_location" className="text-[--primary-text] font-medium">
                                                                            Location Name
                                                                        </Label>
                                                                        <Input
                                                                            id="mqtt_leak_location"
                                                                            value={settings?.mqtt_leak_location || ''}
                                                                            onChange={(e) => handleInputChange('mqtt_leak_location', e.target.value)}
                                                                            placeholder="e.g., Basement"
                                                                            className="border-[--border-color] focus:border-[--border-focus-color]"
                                                                        />
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Temperature Alerts */}
                                                    <div className="pt-4 border-t border-[--border-color]">
                                                        <h4 className="text-md font-medium text-[--primary-text] mb-2 flex items-center gap-2">
                                                            <AlertTriangle className="w-4 h-4" />
                                                            High Temperature Alerts
                                                        </h4>
                                                        <div className="flex items-center justify-between mb-4">
                                                            <div>
                                                                <Label className="text-[--primary-text] font-medium">Enable Email Alerts</Label>
                                                                <p className="text-sm text-[--secondary-text]">
                                                                    Get notified if the temperature is too high.
                                                                </p>
                                                            </div>
                                                            <label className="relative inline-flex items-center cursor-pointer">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={settings?.temp_alert_enabled ?? false}
                                                                    onChange={(e) => handleInputChange('temp_alert_enabled', e.target.checked)}
                                                                    className="sr-only peer"
                                                                />
                                                                <div className="w-11 h-6 bg-gray-400 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                                            </label>
                                                        </div>

                                                        {settings?.temp_alert_enabled && (
                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                <div className="space-y-2">
                                                                    <Label htmlFor="temp_alert_threshold" className="text-[--primary-text] font-medium">
                                                                        Alert Threshold (°C)
                                                                    </Label>
                                                                    <Input
                                                                        id="temp_alert_threshold"
                                                                        type="number"
                                                                        value={settings?.temp_alert_threshold || ''}
                                                                        onChange={(e) => handleInputChange('temp_alert_threshold', e.target.value)}
                                                                        placeholder="e.g., 8"
                                                                        className="border-[--border-color] focus:border-[--border-focus-color]"
                                                                    />
                                                                </div>
                                                                <div className="space-y-2">
                                                                    <Label htmlFor="temp_alert_email" className="text-[--primary-text] font-medium">
                                                                        Notification Email
                                                                    </Label>
                                                                    <Input
                                                                        id="temp_alert_email"
                                                                        type="email"
                                                                        value={settings?.temp_alert_email || ''}
                                                                        onChange={(e) => handleInputChange('temp_alert_email', e.target.value)}
                                                                        placeholder="your.email@example.com"
                                                                        className="border-[--border-color] focus:border-[--border-focus-color]"
                                                                    />
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>


                                                    {/* Test and Update Controls */}
                                                    <div className="flex flex-wrap gap-3 pt-4 border-t border-[--border-color]">
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            onClick={handleTestMqttConnection}
                                                            disabled={mqttTestStatus === 'testing' || !settings?.mqtt_broker_url}
                                                            className="flex items-center gap-2"
                                                        >
                                                            {mqttTestStatus === 'testing' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Rss className="w-4 h-4" />}
                                                            Test Connection
                                                        </Button>

                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            onClick={handleUpdateMqttData}
                                                            disabled={isUpdatingMqtt || !settings?.mqtt_broker_url}
                                                            className="flex items-center gap-2"
                                                        >
                                                            {isUpdatingMqtt ? <Loader2 className="w-4 h-4 animate-spin" /> : <Thermometer className="w-4 h-4" />}
                                                            Update Temperature
                                                        </Button>
                                                    </div>

                                                    {testResult && (
                                                        <div className={`p-3 rounded-lg ${testResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                                                            <div className={`text-sm font-medium ${testResult.success ? 'text-green-800' : 'text-red-800'}`}>
                                                                {testResult.success ? '✓ Connection Successful' : '✗ Connection Failed'}
                                                            </div>
                                                            <div className={`text-xs mt-1 ${testResult.success ? 'text-green-700' : 'text-red-700'}`}>
                                                                {testResult.message || testResult.error}
                                                            </div>
                                                            {testResult.broker_url && (
                                                                <div className={`text-xs mt-1 ${testResult.success ? 'text-green-600' : 'text-red-600'}`}>
                                                                    {testResult.broker_url}:{testResult.port}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                        {/* End of MQTT Integration Section */}

                                        {/* Home Assistant Integration */}
                                        <div className="space-y-6 p-4 bg-white/80 backdrop-blur-sm border-0 shadow-lg">
                                            <div className="flex items-center gap-2">
                                                <Home className="w-5 h-5" />
                                                <h3 className="text-lg font-medium text-[--primary-text]">Home Assistant Integration</h3>
                                            </div>
                                            <p className="text-sm text-[--secondary-text]">
                                                Connect to your Home Assistant instance to pull sensor data.
                                            </p>

                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <Label className="text-[--primary-text] font-medium">Enable Home Assistant</Label>
                                                    <p className="text-sm text-[--secondary-text]">
                                                        Connect to your Home Assistant instance to pull sensor data
                                                    </p>
                                                </div>
                                                <label className="relative inline-flex items-center cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={settings?.ha_enabled ?? false}
                                                        onChange={(e) => handleInputChange('ha_enabled', e.target.checked)}
                                                        className="sr-only peer"
                                                    />
                                                    <div className="w-11 h-6 bg-gray-400 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                                </label>
                                            </div>

                                            {settings?.ha_enabled && (
                                                <div className="space-y-4 pt-4 border-t border-[--border-color]">
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        <div className="space-y-2">
                                                            <Label htmlFor="ha_url" className="text-[--primary-text] font-medium">
                                                                Home Assistant URL *
                                                            </Label>
                                                            <Input
                                                                id="ha_url"
                                                                type="url"
                                                                value={settings.ha_url || ''}
                                                                onChange={(e) => handleInputChange('ha_url', e.target.value)}
                                                                placeholder="myhome.duckdns.org:8123 or 192.168.1.100:8123"
                                                                className="border-[--border-color] focus:border-[--border-focus-color]"
                                                            />
                                                            <p className="text-xs text-[--secondary-text]">
                                                                Will default to HTTP. Add https:// manually if you have SSL configured
                                                            </p>
                                                        </div>
                                                        <div className="space-y-2">
                                                            <Label htmlFor="ha_token" className="text-[--primary-text] font-medium">
                                                                Access Token *
                                                            </Label>
                                                            <Input
                                                                id="ha_token"
                                                                type="password"
                                                                value={settings.ha_token || ''}
                                                                onChange={(e) => handleInputChange('ha_token', e.target.value)}
                                                                placeholder="Long-lived access token"
                                                                className="border-[--border-color] focus:border-[--border-focus-color]"
                                                            />
                                                        </div>
                                                    </div>

                                                    {/* Sensor Configuration */}
                                                    <div className="space-y-6 p-4 bg-blue-50 rounded-lg">
                                                        <h4 className="font-semibold text-[--primary-text] flex items-center gap-2">
                                                            Sensor Configuration
                                                        </h4>
                                                        
                                                        {/* Temperature Sensor */}
                                                        <div className="space-y-4">
                                                            <div className="flex items-center justify-between">
                                                                <h5 className="font-medium text-[--primary-text] flex items-center gap-2">
                                                                    <Thermometer className="w-4 h-4" />
                                                                    Temperature Monitoring
                                                                </h5>
                                                                <Tooltip>
                                                                    <TooltipTrigger asChild>
                                                                        <div className={`relative inline-flex items-center ${isHaTempDisabled ? 'cursor-not-allowed' : ''}`}>
                                                                            <label className={`relative inline-flex items-center ${isHaTempDisabled ? 'opacity-50' : 'cursor-pointer'}`}>
                                                                                <input
                                                                                    type="checkbox"
                                                                                    checked={settings?.ha_temp_enabled ?? false}
                                                                                    onChange={(e) => handleInputChange('ha_temp_enabled', e.target.checked)}
                                                                                    className="sr-only peer"
                                                                                    disabled={isHaTempDisabled}
                                                                                />
                                                                                <div className="w-11 h-6 bg-gray-400 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                                                            </label>
                                                                        </div>
                                                                    </TooltipTrigger>
                                                                    {isHaTempDisabled && (
                                                                        <TooltipContent>
                                                                            <p>Disable MQTT temperature sensor first</p>
                                                                        </TooltipContent>
                                                                    )}
                                                                </Tooltip>
                                                            </div>
                                                            {settings?.ha_temp_enabled && (
                                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                    <div className="space-y-2">
                                                                        <Label htmlFor="ha_temp_entity" className="text-[--primary-text] font-medium">
                                                                            Temperature Entity ID
                                                                        </Label>
                                                                        <Input
                                                                            id="ha_temp_entity"
                                                                            value={settings.ha_temp_entity || ''}
                                                                            onChange={(e) => handleInputChange('ha_temp_entity', e.target.value)}
                                                                            placeholder="sensor.fermentation_chamber_temperature"
                                                                            className="border-[--border-color] focus:border-[--border-focus-color]"
                                                                        />
                                                                    </div>
                                                                    <div className="space-y-2">
                                                                        <Label htmlFor="ha_temp_location" className="text-[--primary-text] font-medium">
                                                                            Display Name
                                                                        </Label>
                                                                        <Input
                                                                            id="ha_temp_location"
                                                                            value={settings.ha_temp_location || ''}
                                                                            onChange={(e) => handleInputChange('ha_temp_location', e.target.value)}
                                                                            placeholder="Fermentation Chamber"
                                                                            className="border-[--border-color] focus:border-[--border-focus-color]"
                                                                        />
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Door Sensor */}
                                                        <div className="space-y-4 pt-4 border-t border-blue-200">
                                                            <div className="flex items-center justify-between">
                                                                <h5 className="font-medium text-[--primary-text] flex items-center gap-2">
                                                                    <DoorOpen className="w-4 h-4" />
                                                                    Door Sensor Monitoring
                                                                </h5>
                                                                <Tooltip>
                                                                    <TooltipTrigger asChild>
                                                                        <div className={`relative inline-flex items-center ${isHaDoorDisabled ? 'cursor-not-allowed' : ''}`}>
                                                                            <label className={`relative inline-flex items-center ${isHaDoorDisabled ? 'opacity-50' : 'cursor-pointer'}`}>
                                                                                <input
                                                                                    type="checkbox"
                                                                                    checked={settings?.ha_door_enabled ?? false}
                                                                                    onChange={(e) => handleInputChange('ha_door_enabled', e.target.checked)}
                                                                                    className="sr-only peer"
                                                                                    disabled={isHaDoorDisabled}
                                                                                />
                                                                                <div className="w-11 h-6 bg-gray-400 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                                                            </label>
                                                                        </div>
                                                                    </TooltipTrigger>
                                                                    {isHaDoorDisabled && (
                                                                        <TooltipContent>
                                                                            <p>Disable MQTT door sensor first</p>
                                                                        </TooltipContent>
                                                                    )}
                                                                </Tooltip>
                                                            </div>
                                                            {settings?.ha_door_enabled && (
                                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                    <div className="space-y-2">
                                                                        <Label htmlFor="ha_door_entity" className="text-[--primary-text] font-medium">
                                                                            Door Entity ID
                                                                        </Label>
                                                                        <Input
                                                                            id="ha_door_entity"
                                                                            value={settings.ha_door_entity || ''}
                                                                            onChange={(e) => handleInputChange('ha_door_entity', e.target.value)}
                                                                            placeholder="binary_sensor.fermentation_door"
                                                                            className="border-[--border-color] focus:border-[--border-focus-color]"
                                                                        />
                                                                    </div>
                                                                    <div className="space-y-2">
                                                                        <Label htmlFor="ha_door_location" className="text-[--primary-text] font-medium">
                                                                            Display Name
                                                                        </Label>
                                                                        <Input
                                                                            id="ha_door_location"
                                                                            value={settings.ha_door_location || ''}
                                                                            onChange={(e) => handleInputChange('ha_door_location', e.target.value)}
                                                                            placeholder="Chamber Door"
                                                                            className="border-[--border-color] focus:border-[--border-focus-color]"
                                                                        />
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Leak Sensor */}
                                                        <div className="space-y-4 pt-4 border-t border-blue-200">
                                                            <div className="flex items-center justify-between">
                                                                <h5 className="font-medium text-[--primary-text] flex items-center gap-2">
                                                                    <Droplet className="w-4 h-4" />
                                                                    Leak Sensor Monitoring
                                                                </h5>
                                                                <Tooltip>
                                                                    <TooltipTrigger asChild>
                                                                        <div className={`relative inline-flex items-center ${isHaLeakDisabled ? 'cursor-not-allowed' : ''}`}>
                                                                            <label className={`relative inline-flex items-center ${isHaLeakDisabled ? 'opacity-50' : 'cursor-pointer'}`}>
                                                                                <input
                                                                                    type="checkbox"
                                                                                    checked={settings?.ha_leak_enabled ?? false}
                                                                                    onChange={(e) => handleInputChange('ha_leak_enabled', e.target.checked)}
                                                                                    className="sr-only peer"
                                                                                    disabled={isHaLeakDisabled}
                                                                                />
                                                                                <div className="w-11 h-6 bg-gray-400 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                                                            </label>
                                                                        </div>
                                                                    </TooltipTrigger>
                                                                    {isHaLeakDisabled && (
                                                                        <TooltipContent>
                                                                            <p>Disable MQTT leak sensor first</p>
                                                                        </TooltipContent>
                                                                    )}
                                                                </Tooltip>
                                                            </div>
                                                            {settings?.ha_leak_enabled && (
                                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                    <div className="space-y-2">
                                                                        <Label htmlFor="ha_leak_entity" className="text-[--primary-text] font-medium">
                                                                            Leak Entity ID
                                                                        </Label>
                                                                        <Input
                                                                            id="ha_leak_entity"
                                                                            value={settings.ha_leak_entity || ''}
                                                                            onChange={(e) => handleInputChange('ha_leak_entity', e.target.value)}
                                                                            placeholder="binary_sensor.basement_leak"
                                                                            className="border-[--border-color] focus:border-[--border-focus-color]"
                                                                        />
                                                                    </div>
                                                                    <div className="space-y-2">
                                                                        <Label htmlFor="ha_leak_location" className="text-[--primary-text] font-medium">
                                                                            Display Name
                                                                        </Label>
                                                                        <Input
                                                                            id="ha_leak_location"
                                                                            value={settings.ha_leak_location || ''}
                                                                            onChange={(e) => handleInputChange('ha_leak_location', e.target.value)}
                                                                            placeholder="Basement Leak Sensor"
                                                                            className="border-[--border-color] focus:border-[--border-focus-color]"
                                                                        />
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Test Connection */}
                                                    <div className="space-y-3">
                                                        <div className="flex gap-3">
                                                            <Button 
                                                                type="button"
                                                                variant="outline" 
                                                                onClick={handleTestHaConnection}
                                                                disabled={haTestStatus === 'testing' || !settings.ha_url || !settings.ha_token}
                                                                className="border-[--border-color] hover:bg-[--outline-hover-bg]"
                                                            >
                                                                {haTestStatus === 'testing' ? (
                                                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                                ) : (
                                                                    <Home className="w-4 h-4 mr-2" />
                                                                )}
                                                                Test Connection
                                                            </Button>
                                                            
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                onClick={handleUpdateHaData}
                                                                disabled={isUpdatingHa || haTestStatus !== 'success'}
                                                                className="border-[--border-color] hover:bg-[--outline-hover-bg]"
                                                            >
                                                                {isUpdatingHa ? (
                                                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                                ) : (
                                                                    <Calendar className="w-4 h-4 mr-2" />
                                                                )}
                                                                Update Data Now
                                                            </Button>
                                                        </div>

                                                        {/* Test Results */}
                                                        {haTestResult && (
                                                            <div className={`p-3 rounded-lg ${
                                                                haTestResult.success 
                                                                    ? 'bg-green-50 border border-green-200' 
                                                                    : 'bg-red-50 border border-red-200'
                                                            }`}>
                                                                <p className={`text-sm font-medium ${
                                                                    haTestResult.success ? 'text-green-800' : 'text-red-800'
                                                                }`}>
                                                                    {haTestResult.success ? '✅ Connection successful!' : '❌ Connection failed'}
                                                                </p>
                                                                {haTestResult.success && (
                                                                    <div className="mt-2 text-xs text-green-700">
                                                                        <p>• Connected to: {haTestResult.location_name} (v{haTestResult.ha_version})</p>
                                                                        {haTestResult.entity_test && (
                                                                            <p>• Temperature entity: {haTestResult.entity_test.success 
                                                                                ? `✅ ${haTestResult.entity_test.friendly_name} (${haTestResult.entity_test.state}${haTestResult.entity_test.unit})`
                                                                                : `❌ ${haTestResult.entity_test.error}`}
                                                                            </p>
                                                                        )}
                                                                    </div>
                                                                )}
                                                                {!haTestResult.success && (
                                                                    <p className="mt-1 text-xs text-red-700">
                                                                        Error: {haTestResult.error}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="text-xs text-[--secondary-text] bg-blue-50 p-3 rounded-lg">
                                                        <p className="font-medium mb-2">Setup Instructions:</p>
                                                        <div className="space-y-2">
                                                            <div>
                                                                <p className="font-medium">For Dynamic DNS (Remote Access):</p>
                                                                <ul className="list-disc list-inside ml-2 space-y-1">
                                                                    <li>Use format: yourdomain.duckdns.org:8123 (HTTP by default)</li>
                                                                    <li>Add https:// only if you have SSL configured in HA</li>
                                                                    <li>Ensure port 8123 is forwarded in your router</li>
                                                                </ul>
                                                            </div>
                                                            <div>
                                                                <p className="font-medium">For Local Network:</p>
                                                                <ul className="list-disc list-inside ml-2 space-y-1">
                                                                    <li>Use format: 192.168.1.100:8123 (HTTP by default)</li>
                                                                    <li>Find your HA IP in your router's device list</li>
                                                                    <li>Ensure port 8123 isn't blocked by firewall</li>
                                                                </ul>
                                                            </div>
                                                            <div>
                                                                <p className="font-medium">Access Token:</p>
                                                                <ul className="list-disc list-inside ml-2 space-y-1">
                                                                    <li>Go to your Home Assistant → Profile → Long-Lived Access Tokens</li>
                                                                    <li>Click "Create Token" and give it a name like "Brewery App"</li>
                                                                    <li>Copy the token and paste it above</li>
                                                                </ul>
                                                            </div>
                                                            <div>
                                                                <p className="font-medium text-red-600">Troubleshooting Connection Issues:</p>
                                                                <ul className="list-disc list-inside ml-2 space-y-1">
                                                                    <li>Make sure Home Assistant is running and accessible</li>
                                                                    <li>Check if you can access HA in your browser at the same URL</li>
                                                                    <li>Try both HTTP and HTTPS (some setups require HTTPS only)</li>
                                                                    <li>Verify the IP address is correct (check router admin panel)</li>
                                                                    <li>For Supervisor installations, try port 4357 instead of 8123</li>
                                                                </ul>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* End of Home Assistant Integration */}

                                        {/* Inventory Snapshots Section */}
                                        <div className="space-y-6 p-4 bg-[--outline-hover-bg] rounded-lg border border-[--border-color]">
                                            <h3 className="text-lg font-medium text-[--primary-text] flex items-center gap-2">
                                                <Calendar className="w-5 h-5" />
                                                Inventory Tracking
                                            </h3>
                                            <p className="text-sm text-[--secondary-text]">
                                                Create daily snapshots of your inventory to enable historical charts and trend analysis.
                                            </p>
                                            
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={async () => {
                                                    try {
                                                        const { createInventorySnapshot } = await import("@/functions/createInventorySnapshot");
                                                        await createInventorySnapshot();
                                                        alert("Inventory snapshot created! Your charts should now show data.");
                                                    } catch (error) {
                                                        alert("Error creating snapshot: " + error.message);
                                                    }
                                                }}
                                                className="flex items-center gap-2"
                                            >
                                                <Calendar className="w-4 h-4" />
                                                Create Current Snapshot
                                            </Button>
                                            <p className="text-xs text-[--secondary-text]">
                                                Click this button to create a snapshot of your current inventory. This enables the historical charts to display data.
                                            </p>
                                        </div>
                                        {/* End of Inventory Snapshots Section */}

                                        <div className="flex justify-end pt-4">
                                            <Button
                                                type="submit"
                                                disabled={isSubmitting}
                                                style={{ backgroundColor: 'var(--button-bg)' }} onMouseOver={e => e.currentTarget.style.backgroundColor = 'var(--button-bg-hover)'} onMouseOut={e => e.currentTarget.style.backgroundColor = 'var(--button-bg)'}
                                                className="text-white px-8"
                                            >
                                                {isSubmitting ? (
                                                    <>
                                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                        Saving...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Save className="w-4 h-4 mr-2" />
                                                        Save Settings
                                                    </>
                                                )}
                                            </Button>
                                        </div>
                                    </form>
                                </CardContent>
                            </Card>
                        </motion.div>

                        {/* Location Management Section */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 }}
                            className="mt-8"
                        >
                            <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl">
                                <CardHeader>
                                    <CardTitle className="text-2xl text-[--primary-text] flex items-center gap-2">
                                        <MapPin className="w-6 h-6" />
                                        Manage Storage Locations
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <div>
                                        <h3 className="text-lg font-medium text-[--primary-text] mb-2">Add New Location</h3>
                                        <form onSubmit={handleAddLocation} className="flex gap-4">
                                            <Input
                                                value={newLocationName}
                                                onChange={(e) => setNewLocationName(e.target.value)}
                                                placeholder="e.g. Garage Fridge"
                                                className="border-[--border-color] focus:border-[--border-focus-color]"
                                            />
                                            <Button type="submit" disabled={isSubmittingLocation || !newLocationName.trim()} style={{ backgroundColor: 'var(--button-bg)' }} onMouseOver={e => e.currentTarget.style.backgroundColor = 'var(--button-bg-hover)'} onMouseOut={e => e.currentTarget.style.backgroundColor = 'var(--button-bg)'} className="text-white">
                                                {isSubmittingLocation ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                                                <span className="ml-2 hidden sm:inline">Add</span>
                                            </Button>
                                        </form>
                                    </div>

                                    <div>
                                        <h3 className="text-lg font-medium text-[--primary-text] mb-4">Your Locations</h3>
                                        <div className="space-y-3">
                                            {(locations || []).map((location) => {
                                                const beerCount = beersByLocation[location.id] || 0;
                                                const isEditing = editingLocation === location.id;
                                                return (
                                                    <div key={location.id} className="p-3 bg-[--outline-hover-bg] rounded-lg flex justify-between items-center">
                                                        <div className="flex-1">
                                                            {isEditing ? (
                                                                <div className="flex items-center gap-2">
                                                                    <Input
                                                                        value={editingName}
                                                                        onChange={(e) => setEditingName(e.target.value)}
                                                                        className="text-lg font-semibold"
                                                                        autoFocus
                                                                    />
                                                                </div>
                                                            ) : (
                                                                <div>
                                                                    <p className="font-semibold text-lg text-[--primary-text]">{location.name}</p>
                                                                    <p className="text-sm text-[--secondary-text]">{beerCount} batch(es) stored here</p>
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-2 ml-4">
                                                            {isEditing ? (
                                                                <>
                                                                    <Button size="icon" onClick={() => saveLocationName(location.id)} disabled={isSaving || !editingName.trim()} className="bg-green-600 hover:bg-green-700 h-9 w-9">
                                                                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                                                    </Button>
                                                                    <Button size="icon" variant="ghost" onClick={cancelEditing} disabled={isSaving} className="h-9 w-9">
                                                                        <X className="w-4 h-4" />
                                                                    </Button>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <Button variant="ghost" size="icon" onClick={() => startEditing(location)} className="text-[--accent-text] h-9 w-9">
                                                                        <Edit2 className="w-4 h-4" />
                                                                    </Button>
                                                                    <AlertDialog>
                                                                        <AlertDialogTrigger asChild>
                                                                            <Button variant="ghost" size="icon" disabled={beerCount > 0} className="text-red-600 hover:text-red-700 h-9 w-9">
                                                                                <Trash2 className="w-4 h-4" />
                                                                            </Button>
                                                                        </AlertDialogTrigger>
                                                                        <AlertDialogContent>
                                                                            <AlertDialogHeader>
                                                                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                                                <AlertDialogDescription>This will permanently delete the "{location.name}" location. You can only delete locations with no beers in them.</AlertDialogDescription>
                                                                            </AlertDialogHeader>
                                                                            <AlertDialogFooter>
                                                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                                <AlertDialogAction onClick={() => handleDeleteLocation(location.id)} className="bg-red-600 hover:bg-red-700" disabled={isDeleting === location.id}>{isDeleting === location.id ? <Loader2 className="w-4 h-4 animate-spin" /> : "Delete"}</AlertDialogAction>
                                                                            </AlertDialogFooter>
                                                                        </AlertDialogContent>
                                                                    </AlertDialog>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                            {(!locations || locations.length === 0) && (
                                                <p className="text-center text-[--secondary-text] py-4">You haven't added any locations yet.</p>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>

                        {/* Danger Zone */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.6 }}
                            className="mt-8"
                        >
                            <Card className="bg-red-50/90 backdrop-blur-sm border-2 border-red-200 shadow-xl">
                                <CardHeader>
                                    <CardTitle className="text-2xl text-red-800 flex items-center gap-2">
                                        <AlertTriangle className="w-6 h-6" />
                                        Danger Zone
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div>
                                        <h3 className="text-lg font-medium text-red-700">Erase All Private Data</h3>
                                        <p className="text-sm text-red-600 mt-1">
                                            This action is irreversible. It will permanently delete all your beers, consumption logs, locations, temperature data, and inventory history. Your app settings will be preserved.
                                        </p>
                                    </div>
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="destructive">
                                                <Trash2 className="w-4 h-4 mr-2" />
                                                Erase All Private Data
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    This action cannot be undone. This will permanently delete all your data.
                                                    <br/><br/>
                                                    Please type <strong>DELETE</strong> to confirm.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <Input
                                                value={eraseConfirmation}
                                                onChange={(e) => setEraseConfirmation(e.target.value)}
                                                placeholder='Type "DELETE" here'
                                                className="mt-2"
                                            />
                                            <AlertDialogFooter>
                                                <AlertDialogCancel onClick={() => setEraseConfirmation("")}>Cancel</AlertDialogCancel>
                                                <AlertDialogAction
                                                    onClick={handleEraseAllData}
                                                    disabled={eraseConfirmation !== 'DELETE' || isErasing}
                                                    className="bg-red-600 hover:bg-red-700"
                                                >
                                                    {isErasing ? (
                                                        <>
                                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                            Erasing...
                                                        </>
                                                    ) : (
                                                        "I understand, delete my data"
                                                    )}
                                                </AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </CardContent>
                            </Card>
                        </motion.div>
                    </div>
                </div>
            </div>
        </TooltipProvider>
    );
}
