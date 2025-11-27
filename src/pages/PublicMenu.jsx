import React, { useState, useEffect } from 'react';
import { Beer, AppSettings, StorageLocation } from '@/entities/all';
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import {
  Calendar,
  Droplets,
  Percent,
  MapPin,
  Container,
  Package,
  Hop,
  Rss
} from "lucide-react";
import { format } from "date-fns";

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

export default function PublicMenuPage() {
  const [beers, setBeers] = useState([]);
  const [settings, setSettings] = useState(null);
  const [locations, setLocations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEnabled, setIsEnabled] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [settingsData, locationsData] = await Promise.all([
        AppSettings.list(),
        StorageLocation.list()
      ]);

      if (settingsData.length > 0) {
        setSettings(settingsData[0]);
        setIsEnabled(settingsData[0].public_menu_enabled ?? false);
        
        if (settingsData[0].public_menu_enabled) {
          // Only load beers if the public menu is enabled
          const beersData = await Beer.filter({ current_quantity: { $gt: 0 } }, '-brew_date');
          setBeers(beersData);
        }
      }
      setLocations(locationsData);
    } catch (error) {
      console.error('Error loading data:', error);
    }
    setIsLoading(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-100 to-amber-200">
        <div className="text-center">
          <Hop className="w-12 h-12 text-amber-600 opacity-50 mx-auto mb-4 animate-pulse" />
          <p className="text-amber-700">Loading menu...</p>
        </div>
      </div>
    );
  }

  if (!isEnabled) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-100 to-amber-200">
        <div className="text-center max-w-md p-8 bg-white/80 backdrop-blur-sm rounded-xl shadow-lg">
          <Hop className="w-16 h-16 text-amber-600 opacity-50 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-amber-900 mb-4">Menu Not Available</h1>
          <p className="text-amber-700">
            The public menu has been disabled by the owner. Please contact them if you believe this is an error.
          </p>
        </div>
      </div>
    );
  }

  const beersByLocation = beers.reduce((grouped, beer) => {
    const locationId = beer.location_id;
    const location = locations.find(loc => loc.id === locationId);
    const groupName = location ? location.name : 'Unassigned';

    if (!grouped[groupName]) {
      grouped[groupName] = [];
    }
    grouped[groupName].push(beer);
    return grouped;
  }, {});

  const title = settings?.public_menu_title || "What's On Tap";
  const backgroundColors = {
    amber: 'from-amber-100 to-amber-200',
    blue: 'from-blue-100 to-blue-200',
    green: 'from-green-100 to-green-200',
    purple: 'from-purple-100 to-purple-200',
    gray: 'from-gray-100 to-gray-200',
    orange: 'from-orange-100 to-orange-200',
    red: 'from-red-100 to-red-200'
  };
  const bgClass = backgroundColors[settings?.background_color] || backgroundColors.amber;

  return (
    <div className={`min-h-screen bg-gradient-to-br ${bgClass} p-6 md:p-8`}>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="flex justify-center items-center gap-4 mb-4">
            {settings?.logo_url ? (
              <img 
                src={settings.logo_url} 
                alt="Logo" 
                className="w-16 h-16 rounded-full object-cover shadow-lg" 
              />
            ) : (
              <div className="p-4 bg-white/50 rounded-full shadow-inner">
                <Hop className="w-12 h-12 text-amber-600" />
              </div>
            )}
            <div>
              <h1 className="text-5xl font-bold text-amber-900">{title}</h1>
              <p className="text-amber-700 mt-2">Currently available for tasting</p>
            </div>
          </div>
        </motion.div>

        {/* Beer Collection */}
        {beers.length === 0 ? (
          <div className="text-center py-12">
            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-8 shadow-lg max-w-md mx-auto">
              <Hop className="w-16 h-16 text-amber-600 opacity-50 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-amber-900 mb-2">Nothing Currently Available</h3>
              <p className="text-amber-700">Check back soon for new batches!</p>
            </div>
          </div>
        ) : Object.keys(beersByLocation).length > 1 ? (
          <div className="space-y-12">
            {Object.entries(beersByLocation).map(([locationName, locationBeers]) => (
              <motion.div
                key={locationName}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                <h2 className="text-3xl font-bold text-amber-900 mb-8 flex items-center gap-3">
                  <MapPin className="w-8 h-8 text-amber-700" />
                  {locationName}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {locationBeers.map((beer, index) => (
                    <BeerCard key={beer.id} beer={beer} index={index} />
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {beers.map((beer, index) => (
              <BeerCard key={beer.id} beer={beer} index={index} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function BeerCard({ beer, index }) {
  const isMqttTracked = beer.is_mqtt_tracked;
  
  const totalCurrentLiters = isMqttTracked
    ? (() => {
        if (!beer.mqtt_last_value) return 0;
        try {
          const jsonData = JSON.parse(beer.mqtt_last_value);
          return parseFloat(jsonData.value) || 0;
        } catch (e) {
          return parseFloat(beer.mqtt_last_value) || 0;
        }
      })()
    : (beer.current_quantity || 0) * (beer.container_volume || 0);

  const totalLitersUnit = isMqttTracked ? beer.mqtt_unit : 'L';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300"
    >
      <div className="p-6">
        <div className="text-center mb-4">
          <h3 className="text-2xl font-bold text-amber-900 mb-2">{beer.name}</h3>
          <Badge className={`text-sm ${styleColors[beer.style] || styleColors['Other']}`}>
            {beer.style}
          </Badge>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2">
              <Percent className="w-4 h-4 text-amber-600" />
              <span>{beer.alcohol_percentage}% ABV</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-amber-600" />
              <span>{format(new Date(beer.brew_date), 'd.M.y')}</span>
            </div>
            {beer.bitterness_ibu ? (
              <div className="flex items-center gap-2">
                <Droplets className="w-4 h-4 text-amber-600" />
                <span>{beer.bitterness_ibu} IBU</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-amber-300"></div>
                <span>{beer.color}</span>
              </div>
            )}
            {isMqttTracked ? (
              <div className="flex items-center gap-2">
                <Rss className="w-4 h-4 text-amber-600" />
                <span className="text-xs truncate">Live tracking</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-amber-600" />
                <span className="text-xs">{beer.container_type}</span>
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-amber-200">
            <div className="flex justify-center items-center gap-4">
              <div className="flex items-center gap-2">
                <Container className="w-5 h-5 text-amber-600" />
                <span className="font-bold text-lg text-amber-900">
                  {totalCurrentLiters.toFixed(isMqttTracked ? 2 : 1)}{totalLitersUnit}
                </span>
                <span className="text-amber-700">available</span>
              </div>
            </div>
            
            {!isMqttTracked && beer.current_quantity > 0 && (
              <div className="text-center mt-2">
                <span className="text-sm text-amber-700">
                  ({beer.current_quantity} {beer.container_type.toLowerCase()}{beer.current_quantity !== 1 ? 's' : ''})
                </span>
              </div>
            )}
          </div>
        </div>

        {beer.description && (
          <div className="pt-4 border-t border-amber-200 mt-4">
            <p className="text-sm text-amber-800 leading-relaxed">{beer.description}</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}