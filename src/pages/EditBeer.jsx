
import React, { useState, useEffect } from "react";
import { Beer, StorageLocation } from "@/entities/all";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle }
from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue }
from "@/components/ui/select";
import { ArrowLeft, Save, Beer as BeerIcon, Loader2, Trash2, MapPin, Rss, QrCode } from "lucide-react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
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

const standardVolumes = ["0.33", "0.4", "0.5"];

export default function EditBeer() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const beerId = searchParams.get('id');

  const [beer, setBeer] = useState(null);
  const [formData, setFormData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [locations, setLocations] = useState([]);

  // State for volume and MQTT controls
  const [isCustomVolume, setIsCustomVolume] = useState(false);
  const [isMqttTracked, setIsMqttTracked] = useState(false);
  const [isMqttDialogOpen, setIsMqttDialogOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  useEffect(() => {
    if (!beerId) {
      navigate(createPageUrl("Dashboard"));
      return;
    }

    async function fetchData() {
      setIsLoading(true);
      try {
        const [beerData, locationsData] = await Promise.all([
          Beer.get(beerId),
          StorageLocation.list(),
        ]);
        
        setBeer(beerData);
        setFormData({
          ...beerData,
          brew_date: beerData.brew_date ? new Date(beerData.brew_date).toISOString().split('T')[0] : '',
        });
        setLocations(locationsData);

        // Set initial state for volume/MQTT controls
        setIsMqttTracked(beerData.is_mqtt_tracked || false);
        if (beerData.container_volume && !standardVolumes.includes(String(beerData.container_volume))) {
            setIsCustomVolume(true);
        }

      } catch (error) {
        console.error("Error fetching beer data:", error);
        navigate(createPageUrl("Dashboard"));
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [beerId, navigate]);

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
      setIsMqttDialogOpen(true);
      setFormData(prev => ({ ...prev, container_volume: '', current_quantity: '', container_type: '', is_mqtt_tracked: true }));
    } else if (value === 'other') {
      setIsCustomVolume(true);
      setIsMqttTracked(false);
      setFormData(prev => ({ ...prev, container_volume: '', is_mqtt_tracked: false }));
    } else {
      setIsCustomVolume(false);
      setIsMqttTracked(false);
      setFormData(prev => ({ ...prev, container_volume: value, is_mqtt_tracked: false }));
    }
  };

  const handleMqttConfigSave = ({ topic, unit }) => {
    setFormData(prev => ({ ...prev, mqtt_topic: topic, mqtt_unit: unit }));
    setIsMqttDialogOpen(false);
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
    } else {
        if (!formData.current_quantity) {
            alert("Please enter a quantity.");
            return;
        }
        if (!formData.container_volume) {
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
      const payload = {
          ...formData,
          alcohol_percentage: parseFloat(formData.alcohol_percentage),
          bitterness_ibu: formData.bitterness_ibu ? parseFloat(formData.bitterness_ibu) : null,
          is_mqtt_tracked: isMqttTracked,
          container_volume: isMqttTracked ? 0 : parseFloat(formData.container_volume),
          current_quantity: isMqttTracked ? 0 : parseInt(formData.current_quantity, 10),
          original_quantity: isMqttTracked ? 0 : parseInt(formData.original_quantity, 10),
      };
      
      await Beer.update(beerId, payload);
      navigate(createPageUrl("Dashboard"));
    } catch (error) {
      console.error('Error updating beer:', error);
      alert("Failed to update beer. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await Beer.delete(beerId);
      navigate(createPageUrl("Dashboard"));
    } catch (error) {
      console.error('Error deleting beer:', error);
      alert("Failed to delete beer. Please try again.");
      setIsDeleting(false);
    }
  };

  if (isLoading || !formData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-[--accent-text]" />
      </div>
    );
  }

  const totalLiters = isMqttTracked ? 'MQTT' : ((parseInt(formData.current_quantity) || 0) * (parseFloat(formData.container_volume) || 0));

  return (
    <div className="p-6 md:p-8 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between gap-4 mb-8"
        >
          <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="icon"
                onClick={() => navigate(createPageUrl("Dashboard"))}
                className="border-[--border-color] hover:bg-[--outline-hover-bg]"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <div>
                <h1 className="text-4xl font-bold text-[--primary-text] mb-2">Edit Batch</h1>
                <p className="text-[--secondary-text]">Update the details for "{beer.name}"</p>
              </div>
          </div>
          
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="icon" className="h-10 w-10">
                <Trash2 className="w-4 h-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure you want to delete this beer?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete the beer batch "{beer.name}" and all associated consumption logs.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} disabled={isDeleting}>
                  {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Delete"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

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
                        {standardVolumes.map(vol => <SelectItem key={vol} value={vol}>{vol}L</SelectItem>)}
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
                      <Label htmlFor="current_quantity" className="text-[--primary-text] font-medium">
                        Quantity of Containers *
                      </Label>
                      <Input
                        id="current_quantity"
                        type="number"
                        step="1"
                        min="0"
                        value={formData.current_quantity}
                        onChange={(e) => handleInputChange('current_quantity', e.target.value)}
                        required
                        className="border-[--border-color] focus:border-[--border-focus-color]"
                      />
                    </div>
                  )}
                  
                  <div className="md:col-span-2 p-4 bg-[--outline-hover-bg] rounded-lg text-center">
                    <p className="text-[--primary-text] font-medium">Total Volume Remaining</p>
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
                        value={formData.url || ''}
                        onChange={(e) => handleInputChange('url', e.target.value)}
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
                    rows={4}
                    className="border-[--border-color] focus:border-[--border-focus-color]"
                  />
                </div>
                <div className="flex justify-end pt-6">
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
                        Save Changes
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
