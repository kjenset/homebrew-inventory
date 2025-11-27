import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Beer, ConsumptionLog, StorageLocation, AppSettings, FridgeTemp, DoorSensor, LeakSensor } from "@/entities/all";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Plus, Beer as BeerIcon, TrendingUp, Calendar, MapPin, ChevronDown, Home, Menu, Settings, Hop, SortAsc, Filter, Download, Thermometer, BookOpen, MessageSquare, Lock, Droplet, RadioTower, Archive } from "lucide-react";
import { motion } from "framer-motion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

import StatsCards from "../components/dashboard/StatsCards";
import SensorCard from "../components/dashboard/SensorCard";
import BeerCard from "../components/dashboard/BeerCard";
import PinProtection from "../components/auth/PinProtection";
import BatchSelector from "../components/brewfather/BatchSelector";
import LitersChart from "../components/dashboard/LitersChart";
import BatchesChart from "../components/dashboard/BatchesChart";
import ConsumptionChart from "../components/dashboard/ConsumptionChart";
import TemperatureChart from "../components/dashboard/TemperatureChart";
import FeedbackDialog from "../components/dashboard/FeedbackDialog";
import WelcomeDialog from "../components/dashboard/WelcomeDialog";
import { setupExampleData } from "@/functions/setupExampleData";

// A simple map to get Lucide icons by name
const iconMap = {
  TrendingUp,
  Calendar,
  BeerIcon,
  Hop,
};

export default function Dashboard() {
  const [beers, setBeers] = useState([]);
  const [consumptionLogs, setConsumptionLogs] = useState([]);
  const [locations, setLocations] = useState([]);
  const [fridgeTemp, setFridgeTemp] = useState(null);
  const [doorSensor, setDoorSensor] = useState(null);
  const [leakSensor, setLeakSensor] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedLocation, setSelectedLocation] = useState("all");
  const [sortBy, setSortBy] = useState('brew_date_desc');
  const [scannedBeerId, setScannedBeerId] = useState(null);
  const [showPinDialog, setShowPinDialog] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const [appSettings, setAppSettings] = useState({
    dashboard_title: 'Brewery Dashboard',
    dashboard_subtitle: 'Track your homemade beer collection and consumption',
    logo_url: null,
    enable_pin_for_stock_changes: false,
    pin_protection_enabled: false,
    grid_layout: 'standard'
  });
  const [showBatchSelector, setShowBatchSelector] = useState(false);
  const [showLitersChart, setShowLitersChart] = useState(false);
  const [showBatchesChart, setShowBatchesChart] = useState(false);
  const [showConsumptionChart, setShowConsumptionChart] = useState(false);
  const [showTempChart, setShowTempChart] = useState(false);
  const [showFeedbackDialog, setShowFeedbackDialog] = useState(false);
  const [showWelcomeDialog, setShowWelcomeDialog] = useState(false);
  
  const loadData = useCallback(async (showLoadingState = true) => {
    if (showLoadingState) {
      setIsLoading(true);
    }
    try {
      const [beersData, logsData, locationsData, settingsData, tempData, doorData, leakData] = await Promise.all([
        Beer.filter({ archived: { $ne: true } }, '-created_date'), // Only load non-archived beers
        ConsumptionLog.list('-consumption_date', 10),
        StorageLocation.list(),
        AppSettings.list(),
        FridgeTemp.list('-timestamp', 1),
        DoorSensor.list('-timestamp', 1),
        LeakSensor.list('-timestamp', 1),
      ]);
      setBeers(beersData);
      setConsumptionLogs(logsData);
      setLocations(locationsData);
      if (settingsData.length > 0) {
        setAppSettings(prevSettings => ({
            ...prevSettings,
            ...settingsData[0]
        }));
      } else {
        // Fix: Use the correct setter setShowWelcomeDialog
        setShowWelcomeDialog(true);
      }
      setFridgeTemp(tempData.length > 0 ? tempData[0] : null);
      setDoorSensor(doorData.length > 0 ? doorData[0] : null);
      setLeakSensor(leakData.length > 0 ? leakData[0] : null);
    } catch (error) {
      console.error('Error loading data:', error);
    }
    if (showLoadingState) {
      setIsLoading(false);
    }
  }, []); 

  // New function to ONLY refresh sensor data
  const refreshSensorData = useCallback(async () => {
    try {
      const [tempData, doorData, leakData] = await Promise.all([
        FridgeTemp.list('-timestamp', 1),
        DoorSensor.list('-timestamp', 1),
        LeakSensor.list('-timestamp', 1),
      ]);
      setFridgeTemp(tempData.length > 0 ? tempData[0] : null);
      setDoorSensor(doorData.length > 0 ? doorData[0] : null);
      setLeakSensor(leakData.length > 0 ? leakData[0] : null);
      console.log('Sensor data refreshed via Polling.');
    } catch (error) {
      console.error('Error refreshing sensor data:', error);
    }
  }, []);

  // New function to ONLY refresh temperature
  const refreshTemperature = useCallback(async () => {
    try {
      const tempData = await FridgeTemp.list('-timestamp', 1);
      if (tempData.length > 0) {
        setFridgeTemp(tempData[0]);
        console.log('Temperature automatically refreshed.');
      }
    } catch (error) {
      console.error('Error refreshing temperature:', error);
    }
  }, []);

  // Efficiently refresh both beer data and temperature
  const refreshDynamicData = useCallback(async () => {
    try {
      const [beersData, tempData] = await Promise.all([
        Beer.list('-created_date'),
        FridgeTemp.list('-timestamp', 1),
      ]);

      // Update beers
      setBeers(prevBeers => {
        const hasChanges = beersData.some((newBeer, index) => {
          if (!prevBeers[index]) return true;
          const oldBeer = prevBeers[index];
          return oldBeer.mqtt_last_value !== newBeer.mqtt_last_value ||
                 oldBeer.current_quantity !== newBeer.current_quantity;
        });
        
        if (hasChanges || beersData.length !== prevBeers.length) {
          console.log('Beer data updated');
          return beersData;
        }
        return prevBeers;
      });

      // Update temperature
      if (tempData.length > 0) {
        if (!fridgeTemp || fridgeTemp.temperature !== tempData[0].temperature) {
            setFridgeTemp(tempData[0]);
        }
      }

    } catch (error) {
      console.error('Error refreshing dynamic data:', error);
    }
  }, [fridgeTemp]);
  
  useEffect(() => {
    // Check for a scanned beer ID in the URL on initial load
    const params = new URLSearchParams(window.location.search);
    const scanId = params.get('scan_id');
    if (scanId) {
      setScannedBeerId(scanId);
      // Clean the URL to prevent the dialog from re-opening on refresh
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }

    // Load initial data
    loadData();
    
    // Set up a safe polling interval for temperature updates
    const pollInterval = setInterval(() => {
      refreshTemperature();
    }, 30 * 60 * 1000); // 30 minutes
    
    // Set up more frequent polling for sensor data (every 2 minutes)
    const sensorPollInterval = setInterval(() => {
      refreshSensorData();
    }, 2 * 60 * 1000); // 2 minutes
    
    // Cleanup intervals on component unmount
    return () => {
      clearInterval(pollInterval);
      clearInterval(sensorPollInterval);
    };
    
  }, [loadData, refreshSensorData, refreshTemperature]);

  const handleStockChange = async (beer, consumedQuantity, notes, direction) => {
    if (consumedQuantity === 0) return;

    try {
      let newQuantity;
      const consumedLiters = consumedQuantity * beer.container_volume;

      if (direction === 'out') {
        newQuantity = Math.max(0, beer.current_quantity - consumedQuantity);
      } else {
        newQuantity = beer.current_quantity + consumedQuantity;
      }

      // IMMEDIATELY update local state for instant UI feedback
      setBeers(prevBeers => {
        // If quantity becomes 0, remove from list (it will be archived)
        if (newQuantity === 0) {
          return prevBeers.filter(b => b.id !== beer.id);
        }
        // Otherwise update the quantity
        return prevBeers.map(b => 
          b.id === beer.id ? { ...b, current_quantity: newQuantity } : b
        );
      });

      // Now perform the server operations
      if (direction === 'out') {
        // Log consumption
        await ConsumptionLog.create({
          beer_id: beer.id,
          beer_name: beer.name,
          quantity_consumed: consumedLiters,
          containers_consumed: consumedQuantity,
          consumption_date: new Date().toISOString(),
          notes
        });
        
        const updatePayload = {
          current_quantity: newQuantity
        };

        // If quantity becomes 0, archive the beer
        if (newQuantity === 0) {
          updatePayload.archived = true;
          updatePayload.archived_date = new Date().toISOString();
        }
        
        await Beer.update(beer.id, updatePayload);
      } else { // direction === 'in'
        const updatePayload = {
          current_quantity: newQuantity
        };

        // If beer was archived and we're adding stock, unarchive it
        if (beer.archived && newQuantity > 0) {
          updatePayload.archived = false;
          updatePayload.archived_date = null;
        }
        
        await Beer.update(beer.id, updatePayload);
      }

      // Refresh consumption logs only (not beers - we already updated locally)
      const logsData = await ConsumptionLog.list('-consumption_date', 10);
      setConsumptionLogs(logsData);
    } catch (error) {
      console.error('Error changing stock:', error);
      // On error, reload data to restore correct state
      loadData(false);
      throw error;
    }
  };

  const handleMoveBeer = async (originalBeer, quantityToMove, destinationLocationId) => {
    try {
        const newQuantityForOriginal = originalBeer.current_quantity - quantityToMove;
        if (newQuantityForOriginal < 0) {
            throw new Error("Cannot move more than available stock.");
        }

        // 1. Update the original beer's quantity
        await Beer.update(originalBeer.id, { current_quantity: newQuantityForOriginal });

        // 2. Check if a beer with the same details already exists at the destination
        const existingBeersAtDestination = await Beer.filter({
            name: originalBeer.name,
            style: originalBeer.style,
            brew_date: originalBeer.brew_date,
            location_id: destinationLocationId,
        });

        if (existingBeersAtDestination.length > 0) {
            // If it exists, just add to its quantity
            const existingBeer = existingBeersAtDestination[0];
            const newQuantityForExisting = existingBeer.current_quantity + quantityToMove;
            await Beer.update(existingBeer.id, { current_quantity: newQuantityForExisting });
        } else {
            // 3. If it doesn't exist, create a new beer record for the new location
            const newBeerData = { ...originalBeer };
            delete newBeerData.id; // Remove id to create a new record
            delete newBeerData.created_date;
            delete newBeerData.updated_date;

            await Beer.create({
                ...newBeerData,
                location_id: destinationLocationId,
                original_quantity: quantityToMove, // The original quantity for this new entry is the amount moved
                current_quantity: quantityToMove,
                // Reset tracking-specific fields for the new entry
                is_mqtt_tracked: false,
                mqtt_topic: null,
                rfid_enabled: false,
            });
        }
        
        // 4. Reload all data to refresh the dashboard (without loading spinner)
        await loadData(false);
    } catch (error) {
        console.error("Error moving beer stock:", error);
        alert("An error occurred while moving the beer. Please refresh and try again.");
    }
  };


  const handleProtectedAction = (actionName, callback) => {
    // Check if PIN protection is disabled
    if (appSettings?.pin_protection_enabled === false) {
      // If disabled, execute the callback directly without PIN
      callback();
      return;
    }
    
    // If enabled, show PIN dialog
    setPendingAction({ actionName, callback });
    setShowPinDialog(true);
  };

  const onPinAuthenticated = () => {
    if (pendingAction) {
      pendingAction.callback();
      setPendingAction(null);
    }
    setShowPinDialog(false);
  };

  const handleStartFresh = async () => {
    // Create a minimal settings object to prevent the dialog from showing again
    await AppSettings.create({ dashboard_title: 'My Brewery' }); 
    // Navigate to the settings page
    window.location.href = createPageUrl("Settings");
  };

  const handleLoadExamples = async () => {
    try {
      await setupExampleData();
      setShowWelcomeDialog(false);
      await loadData(); // Reload all data to reflect the new examples
    } catch (error) {
      console.error("Failed to load example data:", error);
      alert("There was an error loading the example data. Please try again.");
    }
  };

  const handleBrewfatherImport = () => {
    setShowBatchSelector(true);
  };

  const handleImportComplete = (imported, skipped) => {
    let alertMessage = `Import complete!\n\n`;
    if (imported > 0) {
      alertMessage += `New batches imported: ${imported}\n`;
    }
    if (skipped > 0) {
      alertMessage += `Already existing (skipped): ${skipped}\n`;
    }
    if (imported === 0 && skipped === 0) {
      alertMessage += `No batches were imported.`;
    }
    
    alert(alertMessage);
    loadData(); // Refresh the dashboard after import
  };

  // Helper functions for navigation (used with PIN protection)
  const navigateToAddBeer = () => {
    window.location.href = createPageUrl("AddBeer");
  };

  const navigateToSettings = () => {
    window.location.href = createPageUrl("Settings");
  };

  // Gets all active sensors to display in the new SensorCard
  const getActiveSensors = () => {
    const activeSensors = [];

    // Order: Temperature, Door, Leak
    
    // 1. Temperature Sensor
    if (fridgeTemp && ((appSettings?.mqtt_temp_enabled && appSettings?.mqtt_enabled) || (appSettings?.ha_temp_enabled && appSettings?.ha_enabled))) {
        activeSensors.push({
            id: 'temp',
            icon: Thermometer,
            value: `${fridgeTemp.temperature.toFixed(1)}°C`,
            label: fridgeTemp.location_name || 'Temperature',
            statusColor: 'text-sky-600',
            onChartClick: () => setShowTempChart(true) // Clickable row to open chart
        });
    }

    // 2. Door Sensor
    if (doorSensor && ((appSettings?.mqtt_door_enabled && appSettings?.mqtt_enabled) || (appSettings?.ha_door_enabled && appSettings?.ha_enabled))) {
        const isOpen = doorSensor.status === 'open';
        activeSensors.push({
            id: 'door',
            icon: Lock,
            value: isOpen ? 'Open' : 'Locked',
            label: doorSensor.location_name || 'Door Status',
            statusColor: isOpen ? 'text-red-600' : 'text-green-600',
        });
    }

    // 3. Leak Sensor
    if (leakSensor && ((appSettings?.mqtt_leak_enabled && appSettings?.mqtt_enabled) || (appSettings?.ha_leak_enabled && appSettings?.ha_enabled))) {
        const isLeaking = leakSensor.status === 'leak';
        activeSensors.push({
            id: 'leak',
            icon: Droplet,
            value: isLeaking ? 'Leak!' : 'Dry',
            label: leakSensor.location_name || 'Leak Status',
            statusColor: isLeaking ? 'text-red-600' : 'text-blue-600',
        });
    }

    return activeSensors;
  };

  const filteredBeers = useMemo(() => {
    if (selectedLocation === 'all') {
      return beers;
    }
    return beers.filter(beer => beer.location_id === selectedLocation);
  }, [beers, selectedLocation]);

  const sortedBeers = useMemo(() => {
    const sortableBeers = [...filteredBeers];

    sortableBeers.sort((a, b) => {
      switch (sortBy) {
        case 'name_asc':
          return a.name.localeCompare(b.name);
        case 'name_desc':
          return b.name.localeCompare(a.name);
        case 'brew_date_desc':
          return new Date(b.brew_date) - new Date(a.brew_date);
        case 'brew_date_asc':
          return new Date(a.brew_date) - new Date(a.brew_date);
        case 'liters_desc': {
          const aLiters = (a.current_quantity * a.container_volume);
          const bLiters = (b.current_quantity * b.container_volume);
          return bLiters - aLiters;
        }
        case 'liters_asc': {
          const aLitersAsc = (a.current_quantity * a.container_volume);
          const bLitersAsc = (b.current_quantity * b.container_volume);
          return aLitersAsc - bLitersAsc;
        }
        default:
          return 0;
      }
    });

    return sortableBeers;
  }, [filteredBeers, sortBy]);


  const totalBeers = filteredBeers.length;
  
  const totalLitersRemaining = filteredBeers.reduce((sum, beer) => {
    const quantity = beer.current_quantity || 0;
    const volume = beer.container_volume || 0;
    return sum + (quantity * volume);
  }, 0);

  const totalConsumedThisMonth = useMemo(() => {
    // Get IDs of filtered beers
    const filteredBeerIds = new Set(filteredBeers.map(beer => beer.id));
    
    return consumptionLogs
      .filter(log => {
        // Only include logs for beers in the selected location
        const isFromFilteredLocation = filteredBeerIds.has(log.beer_id);
        
        const logDate = new Date(log.consumption_date);
        const now = new Date();
        const isThisMonth = logDate.getMonth() === now.getMonth() && logDate.getFullYear() === now.getFullYear();
        
        return isFromFilteredLocation && isThisMonth;
      })
      .reduce((sum, log) => sum + log.quantity_consumed, 0);
  }, [consumptionLogs, filteredBeers]);

  const beersByLocation = useMemo(() => {
    const grouped = {};
    const locationMap = new Map(locations.map(loc => [loc.id, loc.name]));

    sortedBeers.forEach(beer => {
      const locationId = beer.location_id;
      const groupName = locationId ? locationMap.get(locationId) : 'Unassigned';
      if (!groupName) return;

      if (!grouped[groupName]) {
        grouped[groupName] = [];
      }
      grouped[groupName].push(beer);
    });
    
    // Ensure consistent order based on `locations` array, then 'Unassigned'
    const orderedGroupedBeers = {};
    locations.forEach(loc => {
      if (grouped[loc.name]) {
        orderedGroupedBeers[loc.name] = grouped[loc.name];
      }
    });
    if (grouped['Unassigned']) {
      orderedGroupedBeers['Unassigned'] = grouped['Unassigned'];
    }

    return orderedGroupedBeers;
  }, [sortedBeers, locations]);

  const getSelectedLocationName = () => {
    if (selectedLocation === "all") return "All Locations";
    const location = locations.find(loc => loc.id === selectedLocation);
    return location ? location.name : "All Locations";
  };

  // Helper function to get grid classes based on layout setting
  const getGridClasses = () => {
    const layout = appSettings?.grid_layout || 'standard';
    switch (layout) {
      case 'compact':
        return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4';
      case 'standard':
        return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6';
      case 'comfortable':
        return 'grid-cols-1 lg:grid-cols-2 gap-8';
      case 'list':
        return 'grid-cols-1 gap-4';
      default:
        return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6';
    }
  };

  // This function is now deprecated and replaced by getActiveSensors
  // Keeping it empty to avoid issues in case it's still referenced somewhere
  // though the plan is to remove its usage in JSX.
  const getSensorData = () => {
    return {};
  };

  // Show welcome dialog if it's a new user
  if (showWelcomeDialog) {
      return (
          <WelcomeDialog
              isOpen={showWelcomeDialog}
              onStartFresh={handleStartFresh}
              onLoadExamples={handleLoadExamples}
          />
      );
  }

  if (isLoading) {
    return (
      <div className="p-6 md:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {Array(3).fill(0).map((_, i) => (
              <div key={i} className="h-32 bg-white/50 rounded-xl animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-6 md:px-8 pb-6 md:pb-8 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/50 rounded-full shadow-inner flex-shrink-0">
               {appSettings.logo_url ? (
                 <img 
                   src={appSettings.logo_url} 
                   alt="Dashboard Logo" 
                   className="w-10 h-10 rounded-full object-cover" 
                 />
               ) : (
                 <Hop className="w-10 h-10 text-[--accent-text]" />
               )}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-4xl font-bold text-[--primary-text]">{appSettings.dashboard_title}</h1>
              </div>
              <p className="text-[--secondary-text]">{appSettings.dashboard_subtitle}</p>
            </div>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                style={{ backgroundColor: 'var(--button-bg)' }} 
                onMouseOver={e => e.currentTarget.style.backgroundColor = 'var(--button-bg-hover)'} 
                onMouseOut={e => e.currentTarget.style.backgroundColor = 'var(--button-bg)'} 
                className="text-white shadow-lg"
              >
                <Menu className="w-5 h-5 mr-2" />
                Menu
                <ChevronDown className="w-4 h-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem asChild>
                <Link to={createPageUrl("Dashboard")} className="w-full">
                  <Home className="w-4 h-4 mr-2" />
                  Dashboard
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              
              <DropdownMenuItem onSelect={() => handleProtectedAction("add new beer", () => navigateToAddBeer())}>
                <Plus className="w-4 h-4 mr-2" />
                Add New Beer
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={handleBrewfatherImport}>
                <Download className="w-4 h-4 mr-2" />
                Import from Brewfather
              </DropdownMenuItem>
              <DropdownMenuSeparator />

              {/* RFID Management Link */}
              <DropdownMenuItem asChild>
                <Link to={createPageUrl("RFID")} className="w-full">
                  <RadioTower className="w-4 h-4 mr-2" />
                  RFID Management
                </Link>
              </DropdownMenuItem>

              {/* New Empty Batches Link */}
              <DropdownMenuItem asChild>
                <Link to={createPageUrl("EmptyBatches")} className="w-full">
                  <Archive className="w-4 h-4 mr-2" />
                  Empty Batches
                </Link>
              </DropdownMenuItem>

              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <Filter className="w-4 h-4 mr-2" />
                  <span>Filter by Location</span>
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                   <DropdownMenuItem onSelect={() => setSelectedLocation('all')}>
                    All Locations
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {locations.map((location) => (
                    <DropdownMenuItem key={location.id} onSelect={() => setSelectedLocation(location.id)}>
                      {location.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>

              <DropdownMenuItem asChild>
                <Link to={createPageUrl("Activity")} className="w-full">
                  <Calendar className="w-4 h-4 mr-2" />
                  View Activity Log
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              
              <DropdownMenuItem onSelect={() => handleProtectedAction("access settings", () => navigateToSettings())}>
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </DropdownMenuItem>

              {/* New Documentation Link */}
              <DropdownMenuItem asChild>
                <Link to={createPageUrl("Documentation")} className="w-full">
                  <BookOpen className="w-4 h-4 mr-2" />
                  Documentation
                </Link>
              </DropdownMenuItem>

              {/* New Feedback Link */}
              <DropdownMenuItem onSelect={() => setShowFeedbackDialog(true)}>
                <MessageSquare className="w-4 h-4 mr-2" />
                Send Feedback
              </DropdownMenuItem>

            </DropdownMenuContent>
          </DropdownMenu>
        </motion.div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6 mb-8">
          <StatsCards
            title="Total Batches"
            value={totalBeers}
            icon={BeerIcon}
            bgColor="bg-amber-500"
            textColor="text-[--primary-text]"
            subtitle="Ready to drink"
            showChartButton={true}
            onChartClick={() => setShowBatchesChart(true)}
          />
          <StatsCards
            title="Liters Remaining"
            value={`${totalLitersRemaining.toFixed(1)}L`}
            icon={TrendingUp}
            bgColor="bg-orange-500"
            textColor="text-[--primary-text]"
            subtitle="Ready to drink"
            showChartButton={true}
            onChartClick={() => setShowLitersChart(true)}
          />
          <StatsCards
            title="This Month"
            value={`${totalConsumedThisMonth.toFixed(1)}L`}
            icon={Calendar}
            bgColor="bg-yellow-500"
            textColor="text-[--primary-text]"
            subtitle="Consumed"
            showChartButton={true}
            onChartClick={() => setShowConsumptionChart(true)}
          />
          <SensorCard
            sensors={getActiveSensors()}
          />
        </div>
        
        {/* Beer Collection */}
        <div>
          {sortedBeers.length === 0 && !isLoading ? (
            <div className="text-center py-12 bg-white/80 backdrop-blur-sm rounded-xl border-0 shadow-lg">
              <BeerIcon className="w-16 h-16 text-[--accent-text] opacity-50 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-[--primary-text] mb-2">
                {selectedLocation === 'all' ? 'No beers yet' : 'No beers at this location'}
              </h3>
              <p className="text-[--secondary-text] mb-6">
                {selectedLocation === 'all'
                  ? "Start by adding your first homemade batch!"
                  : 'Try selecting another location or add a new beer.'}
              </p>
              <Button 
                onClick={() => handleProtectedAction("add a beer", () => navigateToAddBeer())}
                style={{ backgroundColor: 'var(--button-bg)' }} 
                onMouseOver={e => e.currentTarget.style.backgroundColor = 'var(--button-bg-hover)'} 
                onMouseOut={e => e.currentTarget.style.backgroundColor = 'var(--button-bg)'} 
                className="text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add a Beer
              </Button>
            </div>
          ) : selectedLocation === 'all' ? (
            <div className="space-y-12">
              {Object.entries(beersByLocation).map(([locationName, locationBeers], locationIndex) => (
                <motion.div
                  key={locationName}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-[--primary-text] flex items-center gap-3">
                      <MapPin className="w-6 h-6 text-[--secondary-text]" />
                      {locationName}
                    </h2>
                    {locationIndex === 0 && (
                      <div className="flex items-center gap-2">
                        <label htmlFor="sort-by" className="text-sm font-medium text-[--secondary-text] shrink-0">
                          Sort by
                        </label>
                        <Select value={sortBy} onValueChange={setSortBy}>
                          <SelectTrigger id="sort-by" className="w-[220px] border-[--border-color] focus:border-[--border-focus-color]">
                            <SelectValue placeholder="Select Sort Order" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="brew_date_desc">Brew Date (Newest First)</SelectItem>
                            <SelectItem value="brew_date_asc">Brew Date (Oldest First)</SelectItem>
                            <SelectItem value="name_asc">Name (A-Z)</SelectItem>
                            <SelectItem value="name_desc">Name (Z-A)</SelectItem>
                            <SelectItem value="liters_desc">Liters Left (Most First)</SelectItem>
                            <SelectItem value="liters_asc">Liters Left (Least First)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                  <div className={`grid ${getGridClasses()}`}>
                    {locationBeers.map((beer, index) => (
                      <div key={`${beer.id}-${beer.current_quantity}`}>
                        <BeerCard 
                          beer={beer} 
                          onStockChange={handleStockChange}
                          isInitiallyOpen={beer.id === scannedBeerId}
                          onDialogClose={() => setScannedBeerId(null)}
                          appSettings={appSettings}
                          onProtectedAction={handleProtectedAction}
                          locations={locations}
                          onMoveBeer={handleMoveBeer}
                        />
                      </div>
                    ))}
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-[--primary-text] flex items-center gap-3">
                  <MapPin className="w-6 h-6 text-[--secondary-text]" />
                  {getSelectedLocationName()}
                </h2>
                <div className="flex items-center gap-2">
                  <label htmlFor="sort-by-single" className="text-sm font-medium text-[--secondary-text] shrink-0">
                    Sort by
                  </label>
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger id="sort-by-single" className="w-[220px] border-[--border-color] focus:border-[--border-focus-color]">
                      <SelectValue placeholder="Select Sort Order" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="brew_date_desc">Brew Date (Newest First)</SelectItem>
                      <SelectItem value="brew_date_asc">Brew Date (Oldest First)</SelectItem>
                      <SelectItem value="name_asc">Name (A-Z)</SelectItem>
                      <SelectItem value="name_desc">Name (Z-A)</SelectItem>
                      <SelectItem value="liters_desc">Liters Left (Most First)</SelectItem>
                      <SelectItem value="liters_asc">Liters Left (Least First)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className={`grid ${getGridClasses()}`}>
                {sortedBeers.map((beer, index) => (
                  <div key={`${beer.id}-${beer.current_quantity}`}>
                    <BeerCard 
                      beer={beer} 
                      onStockChange={handleStockChange}
                      isInitiallyOpen={beer.id === scannedBeerId}
                      onDialogClose={() => setScannedBeerId(null)}
                      appSettings={appSettings}
                      onProtectedAction={handleProtectedAction}
                      locations={locations}
                      onMoveBeer={handleMoveBeer}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      
      {/* PIN Dialog at page level */}
      {showPinDialog && pendingAction && (
        <PinProtection 
          isOpen={showPinDialog}
          onClose={() => setShowPinDialog(false)}
          actionName={pendingAction.actionName}
          onAuthenticated={onPinAuthenticated}
        />
      )}

      {/* Batch Selector Dialog */}
      <BatchSelector
        isOpen={showBatchSelector}
        onClose={() => setShowBatchSelector(false)}
        onImportComplete={handleImportComplete}
      />

      {/* Chart Dialogs */}
      <LitersChart
        isOpen={showLitersChart}
        onClose={() => setShowLitersChart(false)}
      />
      <BatchesChart
        isOpen={showBatchesChart}
        onClose={() => setShowBatchesChart(false)}
      />
      <ConsumptionChart
        isOpen={showConsumptionChart}
        onClose={() => setShowConsumptionChart(false)}
      />
      <TemperatureChart
        isOpen={showTempChart}
        onClose={() => setShowTempChart(false)}
      />

      <FeedbackDialog
        isOpen={showFeedbackDialog}
        onClose={() => setShowFeedbackDialog(false)}
      />
    </div>
    </div>
  );
}