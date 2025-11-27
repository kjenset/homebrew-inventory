
import React, { useState, useEffect } from "react";
import { Beer, StorageLocation } from "@/entities/all";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Plus, Beer as BeerIcon, MapPin, Rss, QrCode } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion } from "framer-motion";
import MqttConfigDialog from "../components/MqttConfigDialog";
import QrScannerDialog from "../components/QrScannerDialog";

const beerStyles = [
  "IPA", "Pale Ale", "Lager", "Stout", "Porter", 
  "Wheat Beer", "Saison", "Pilsner", "Amber Ale", 
  "Brown Ale", "Belgian Ale", "Sour Beer", "Other"
];

const beerColors = [
  "Clear", "Pale Gold", "Golden", "Amber", "Copper", 
  "Brown", "Dark Brown", "Black"
];

export default function AddBeer() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [locations, setLocations] = useState([]);
  const [isCustomVolume, setIsCustomVolume] = useState(false);
  const [isMqttTracked, setIsMqttTracked] = useState(false); // Fixed typo here
  const [isMqttDialogOpen, setIsMqttDialogOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    style: '',
    location_id: '',
    alcohol_percentage: '',
    container_type: '',
    container_volume: '',
    original_quantity: '',
    brew_date: '',
    description: '',
    color: 'Golden',
    bitterness_ibu: '',
    url: '',
    is_mqtt_tracked: false,
    mqtt_topic: '',
    mqtt_unit: 'L',
  });

  useEffect(() => {
    async function fetchLocations() {
      try {
        const locationsData = await StorageLocation.list();
        setLocations(locationsData);
        if (locationsData.length > 0) {
          setFormData(prev => ({...prev, location_id: locationsData[0].id}));
        }
      } catch (error) {
        console.error("Error fetching storage locations:", error);
      }
    }
    fetchLocations();
  }, []);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleVolumeChange = (value) => {
    if (value === 'mqtt') {
      setIsMqttTracked(true);
      setIsCustomVolume(false);
      setIsMqttDialogOpen(true); // Open dialog to configure
      setFormData(prev => ({ ...prev, container_volume: '', original_quantity: '', container_type: '', is_mqtt_tracked: true }));
    } else if (value === 'other') {
      setIsCustomVolume(true);
      setIsMqttTracked(false);
      setFormData(prev => ({ ...prev, container_volume: '', is_mqtt_tracked: false })); // Clear volume when switching to custom
    } else {
      setIsCustomVolume(false);
      setIsMqttTracked(false);
      setFormData(prev => ({ ...prev, container_volume: value, is_mqtt_tracked: false }));
    }
  };

  const handleMqttConfigSave = ({ topic, unit }) => {
    setFormData(prev => ({ ...prev, mqtt_topic: topic, mqtt_unit: unit }));
    setIsMqttDialogOpen(false); // Close dialog after saving
  };

  const handleScanSuccess = (url) => {
    handleInputChange('url', url);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.location_id) {
      alert("Please select a storage location.");
      return;
    }
    if (isMqttTracked) {
        if (!formData.mqtt_topic) {
            alert("Please configure the MQTT topic.");
            return;
        }
    } else { // Not MQTT tracked, traditional quantity/volume
        if (!formData.original_quantity) {
            alert("Please enter a quantity.");
            return;
        }
        if (!formData.container_volume) { // Ensure container volume is not empty
            alert("Please enter a container volume.");
            return;
        }
        if (!formData.container_type) {
            alert("Please select a container type.");
            return;
        }
    }
    
    if (!formData.name || !formData.style || !formData.alcohol_percentage || !formData.brew_date) {
        alert("Please fill in all required fields (marked with *).");
        return;
    }

    setIsSubmitting(true);

    try {
      const quantity = parseInt(formData.original_quantity, 10);
      const isMqtt = formData.is_mqtt_tracked;

      await Beer.create({
        ...formData,
        original_quantity: isMqtt ? 0 : quantity,
        current_quantity: isMqtt ? 0 : quantity,
        container_volume: isMqtt ? 0 : parseFloat(formData.container_volume),
        alcohol_percentage: parseFloat(formData.alcohol_percentage),
        bitterness_ibu: formData.bitterness_ibu ? parseFloat(formData.bitterness_ibu) : undefined,
        location_id: formData.location_id
      });

      navigate(createPageUrl("Dashboard"));
    } catch (error) {
      console.error('Error creating beer:', error);
      alert("Failed to add beer. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalLiters = isMqttTracked ? 'MQTT' : ((parseFloat(formData.original_quantity) || 0) * (parseFloat(formData.container_volume) || 0));

  return (
    <div className="p-6 md:p-8 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4 mb-8"
        >
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate(createPageUrl("Dashboard"))}
            className="border-[--border-color] hover:bg-[--outline-hover-bg]"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-4xl font-bold text-[--primary-text] mb-2">Add New Beer Batch</h1>
            <p className="text-[--secondary-text]">Register your latest homemade brew</p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl">
            <CardHeader className="pb-6">
              <CardTitle className="text-2xl text-[--primary-text] flex items-center gap-2">
                <BeerIcon className="w-6 h-6" />
                Beer Details
              </CardTitle>
            </CardHeader>
            
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-[--primary-text] font-medium">
                      Beer Name *
                    </Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      placeholder="e.g. Humle's Golden Ale"
                      required
                      className="border-[--border-color] focus:border-[--border-focus-color]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="style" className="text-[--primary-text] font-medium">
                      Beer Style *
                    </Label>
                    <Select value={formData.style} onValueChange={(value) => handleInputChange('style', value)}>
                      <SelectTrigger className="border-[--border-color] focus:border-[--border-focus-color]">
                        <SelectValue placeholder="Select beer style" />
                      </SelectTrigger>
                      <SelectContent>
                        {beerStyles.map((style) => (
                          <SelectItem key={style} value={style}>{style}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="location_id" className="text-[--primary-text] font-medium">
                      Storage Location *
                    </Label>
                    <Select value={formData.location_id} onValueChange={(value) => handleInputChange('location_id', value)}>
                      <SelectTrigger className="border-[--border-color] focus:border-[--border-focus-color]">
                        <SelectValue placeholder="Select a location" />
                      </SelectTrigger>
                      <SelectContent>
                        {locations.map((location) => (
                          <SelectItem key={location.id} value={location.id}>{location.name}</SelectItem>
                        ))}
                        <div className="border-t border-gray-200 mt-1 pt-1">
                          <Link 
                            to={createPageUrl("Settings")} 
                            className="flex items-center gap-2 px-2 py-1.5 text-sm text-[--accent-text] hover:text-[--primary-text] hover:bg-[--outline-hover-bg] rounded-sm"
                          >
                            <MapPin className="w-4 h-4" />
                            Manage Locations
                          </Link>
                        </div>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="alcohol_percentage" className="text-[--primary-text] font-medium">
                      Alcohol Content (ABV %) *
                    </Label>
                    <Input
                      id="alcohol_percentage"
                      type="number"
                      step="0.1"
                      min="0"
                      max="20"
                      value={formData.alcohol_percentage}
                      onChange={(e) => handleInputChange('alcohol_percentage', e.target.value)}
                      placeholder="e.g. 5.2"
                      required
                      className="border-[--border-color] focus:border-[--border-focus-color]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="brew_date" className="text-[--primary-text] font-medium">
                      Brew Date *
                    </Label>
                    <Input
                      id="brew_date"
                      type="date"
                      value={formData.brew_date}
                      onChange={(e) => handleInputChange('brew_date', e.target.value)}
                      required
                      className="border-[--border-color] focus:border-[--border-focus-color]"
                    />
                  </div>
                  {!isMqttTracked && (
                    <div className="space-y-2">
                      <Label htmlFor="container_type" className="text-[--primary-text] font-medium">
                        Container Type *
                      </Label>
                      <Select value={formData.container_type} onValueChange={(value) => handleInputChange('container_type', value)}>
                        <SelectTrigger className="border-[--border-color] focus:border-[--border-focus-color]">
                          <SelectValue placeholder="Select container type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Can">Can</SelectItem>
                          <SelectItem value="Bottle">Bottle</SelectItem>
                          <SelectItem value="Keg">Keg</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="container_volume" className="text-[--primary-text] font-medium">
                      Container Volume (Liters) *
                    </Label>
                    <Select value={isMqttTracked ? 'mqtt' : (isCustomVolume ? 'other' : formData.container_volume)} onValueChange={handleVolumeChange}>
                      <SelectTrigger className="border-[--border-color] focus:border-[--border-focus-color]">
                        <SelectValue placeholder="Select volume" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0.33">0.33L</SelectItem>
                        <SelectItem value="0.4">0.4L</SelectItem>
                        <SelectItem value="0.5">0.5L</SelectItem>
                        <SelectItem value="other">Other (Custom)</SelectItem>
                        <SelectItem value="mqtt">
                            <div className="flex items-center gap-2">
                                <Rss className="w-4 h-4" /> Track with MQTT
                            </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    {isCustomVolume && (
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.container_volume}
                        onChange={(e) => handleInputChange('container_volume', e.target.value)}
                        placeholder="Enter custom volume"
                        required 
                        className="border-[--border-color] focus:border-[--border-focus-color] mt-2"
                      />
                    )}
                    {isMqttTracked && (
                        <div className="mt-2">
                            <Button type="button" variant="outline" onClick={() => setIsMqttDialogOpen(true)} className="w-full">
                                <Rss className="w-4 h-4 mr-2" />
                                Configure MQTT
                            </Button>
                            {formData.mqtt_topic && <p className="text-xs text-center mt-2 text-green-600">Topic: {formData.mqtt_topic}</p>}
                        </div>
                    )}
                  </div>
                  {!isMqttTracked && (
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="original_quantity" className="text-[--primary-text] font-medium">
                        Quantity of Containers *
                      </Label>
                      <Input
                        id="original_quantity"
                        type="number"
                        step="1"
                        min="1"
                        value={formData.original_quantity}
                        onChange={(e) => handleInputChange('original_quantity', e.target.value)}
                        placeholder="e.g. 24"
                        required
                        className="border-[--border-color] focus:border-[--border-focus-color]"
                      />
                    </div>
                  )}
                  
                  <div className="md:col-span-2 p-4 bg-[--outline-hover-bg] rounded-lg text-center">
                    <p className="text-[--primary-text] font-medium">Total Batch Volume</p>
                    <p className="text-2xl font-bold text-[--primary-text]">
                        {isMqttTracked ? `Live via MQTT` : `${totalLiters.toFixed(2)} Liters`}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="color" className="text-[--primary-text] font-medium">
                      Beer Color
                    </Label>
                    <Select value={formData.color} onValueChange={(value) => handleInputChange('color', value)}>
                      <SelectTrigger className="border-[--border-color] focus:border-[--border-focus-color]">
                        <SelectValue placeholder="Select beer color" />
                      </SelectTrigger>
                      <SelectContent>
                        {beerColors.map((color) => (
                          <SelectItem key={color} value={color}>{color}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bitterness_ibu" className="text-[--primary-text] font-medium">
                      Bitterness (IBU) - Optional
                    </Label>
                    <Input
                      id="bitterness_ibu"
                      type="number"
                      step="1"
                      min="0"
                      max="120"
                      value={formData.bitterness_ibu}
                      onChange={(e) => handleInputChange('bitterness_ibu', e.target.value)}
                      placeholder="e.g. 35"
                      className="border-[--border-color] focus:border-[--border-focus-color]"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="url" className="text-[--primary-text] font-medium">
                      Link (Recipe, Photos, etc.) - Optional
                    </Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="url"
                        type="url"
                        value={formData.url}
                        onChange={(e) => handleInputChange('url', e.target.value)}
                        placeholder="https://example.com/my-recipe"
                        className="border-[--border-color] focus:border-[--border-focus-color]"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => setIsScannerOpen(true)}
                        className="border-[--border-color] hover:bg-[--outline-hover-bg]"
                        title="Scan QR Code"
                      >
                        <QrCode className="w-5 h-5" />
                      </Button>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description" className="text-[--primary-text] font-medium">
                    Description & Notes
                  </Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    placeholder="Describe your beer... taste notes, brewing process, special ingredients..."
                    rows={4}
                    className="border-[--border-color] focus:border-[--border-focus-color]"
                  />
                </div>
                <div className="flex justify-end gap-4 pt-6">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate(createPageUrl("Dashboard"))}
                    className="border-[--border-color] hover:bg-[--outline-hover-bg]"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={
                        isSubmitting || 
                        !formData.name || 
                        !formData.style || 
                        !formData.alcohol_percentage || 
                        !formData.brew_date || 
                        !formData.location_id ||
                        (isMqttTracked && !formData.mqtt_topic) || // If MQTT tracked, topic is required
                        (!isMqttTracked && (!formData.original_quantity || !formData.container_type || !formData.container_volume)) // If not MQTT, these are required
                    }
                    style={{ backgroundColor: 'var(--button-bg)' }} onMouseOver={e => e.currentTarget.style.backgroundColor = 'var(--button-bg-hover)'} onMouseOut={e => e.currentTarget.style.backgroundColor = 'var(--button-bg)'}
                    className="text-white px-8"
                  >
                    {isSubmitting ? (
                      'Adding Beer...'
                    ) : (
                      <>
                        <Plus className="w-4 h-4 mr-2" />
                        Add Beer Batch
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </div>
      <MqttConfigDialog
        isOpen={isMqttDialogOpen}
        onClose={() => setIsMqttDialogOpen(false)}
        onSave={handleMqttConfigSave}
        initialData={{ topic: formData.mqtt_topic, unit: formData.mqtt_unit }}
      />
      <QrScannerDialog
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScan={handleScanSuccess}
      />
    </div>
  );
}
