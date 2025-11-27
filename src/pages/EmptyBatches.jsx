
import React, { useState, useEffect, useMemo } from "react";
import { Beer, StorageLocation } from "@/entities/all";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ArrowLeft, Archive, Plus, Calendar, Percent, Droplets, Box, ExternalLink, RotateCcw } from "lucide-react";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

export default function EmptyBatchesPage() {
  const [archivedBeers, setArchivedBeers] = useState([]);
  const [locations, setLocations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedLocation, setSelectedLocation] = useState("all");
  const [restockQuantity, setRestockQuantity] = useState(1);
  const [selectedBeer, setSelectedBeer] = useState(null);
  const [showRestockDialog, setShowRestockDialog] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [beersData, locationsData] = await Promise.all([
        Beer.filter({ archived: true }, '-archived_date'),
        StorageLocation.list()
      ]);
      setArchivedBeers(beersData);
      setLocations(locationsData);
    } catch (error) {
      console.error('Error loading archived beers:', error);
    }
    setIsLoading(false);
  };

  const handleRestock = async () => {
    if (!selectedBeer || restockQuantity <= 0) return;

    try {
      await Beer.update(selectedBeer.id, {
        current_quantity: restockQuantity,
        archived: false,
        archived_date: null
      });
      
      setShowRestockDialog(false);
      setRestockQuantity(1);
      setSelectedBeer(null);
      loadData(); // Refresh the list
    } catch (error) {
      console.error('Error restocking beer:', error);
      alert('Failed to restock beer. Please try again.');
    }
  };

  const filteredArchivedBeers = useMemo(() => {
    if (selectedLocation === 'all') {
      return archivedBeers;
    }
    return archivedBeers.filter(beer => beer.location_id === selectedLocation);
  }, [archivedBeers, selectedLocation]);

  const getLocationName = (locationId) => {
    const location = locations.find(loc => loc.id === locationId);
    return location ? location.name : 'Unknown Location';
  };

  const openRestockDialog = (beer) => {
    setSelectedBeer(beer);
    setRestockQuantity(1);
    setShowRestockDialog(true);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading archived batches...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4"
        >
          <div className="flex items-center gap-4">
            <Link 
              to={createPageUrl("Dashboard")}
              className="p-2 bg-white/50 rounded-full shadow-inner hover:bg-white/70 transition-colors"
            >
              <ArrowLeft className="w-6 h-6 text-[--accent-text]" />
            </Link>
            <div className="p-3 bg-white/50 rounded-full shadow-inner">
              <Archive className="w-10 h-10 text-[--accent-text]" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-[--primary-text]">Empty Batches</h1>
              <p className="text-[--secondary-text]">Manage your finished beer batches</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <Select value={selectedLocation} onValueChange={setSelectedLocation}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by location" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Locations</SelectItem>
                {locations.map((location) => (
                  <SelectItem key={location.id} value={location.id}>
                    {location.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </motion.div>

        {/* Content */}
        {filteredArchivedBeers.length === 0 ? (
          <div className="text-center py-12 bg-white/80 backdrop-blur-sm rounded-xl border-0 shadow-lg">
            <Archive className="w-16 h-16 text-[--accent-text] opacity-50 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-[--primary-text] mb-2">
              No empty batches yet
            </h3>
            <p className="text-[--secondary-text] mb-6">
              Empty batches will appear here when you finish drinking them.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredArchivedBeers.map((beer, index) => (
              <motion.div
                key={beer.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300 opacity-75">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <div className="flex-1 min-w-0 text-center">
                        <h3 className="text-xl font-bold text-[--primary-text] truncate mb-2">{beer.name}</h3>
                        <div className="flex items-center justify-center gap-2">
                          <Badge className={`text-xs ${styleColors[beer.style] || styleColors['Other']}`}>
                            {beer.style}
                          </Badge>
                          <Badge variant="outline" className="text-xs text-gray-600">
                            Archived
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="p-4 pt-0 pb-2">
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="flex items-center gap-1.5">
                          <Percent className="w-3 h-3 text-[--accent-text]" />
                          <span>{beer.alcohol_percentage}% ABV</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3 h-3 text-[--accent-text]" />
                          <span>{format(new Date(beer.brew_date), 'd.M.y')}</span>
                        </div>
                        {beer.bitterness_ibu ? (
                          <div className="flex items-center gap-1.5">
                            <Droplets className="w-3 h-3 text-[--accent-text]" />
                            <span>{beer.bitterness_ibu} IBU</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <Box className="w-3 h-3 text-[--accent-text]" />
                            <span>{beer.color}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1.5">
                          <span className="text-[--secondary-text]">{getLocationName(beer.location_id)}</span>
                        </div>
                      </div>
                      
                      {beer.archived_date && (
                        <div className="pt-2 border-t border-[--border-color] text-center">
                          <div className="text-xs text-[--secondary-text]">
                            Finished: {format(new Date(beer.archived_date), 'MMM d, yyyy')}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>

                  <CardFooter className="p-4 pt-2 space-x-2">
                    <Button
                      size="sm"
                      onClick={() => openRestockDialog(beer)}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                    >
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Restock
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      asChild
                      className="flex-1"
                    >
                      <Link to={createPageUrl(`EditBeer?id=${beer.id}`)}>
                        View Details
                      </Link>
                    </Button>
                  </CardFooter>
                </Card>
              </motion.div>
            ))}
          </div>
        )}

        {/* Restock Dialog */}
        <Dialog open={showRestockDialog} onOpenChange={setShowRestockDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Restock {selectedBeer?.name}</DialogTitle>
              <DialogDescription>
                How many containers do you want to add back to stock?
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Label htmlFor="restock-quantity">Quantity</Label>
              <Input
                id="restock-quantity"
                type="number"
                min="1"
                value={restockQuantity}
                onChange={(e) => setRestockQuantity(parseInt(e.target.value) || 1)}
                className="mt-2"
                placeholder="1"
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowRestockDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleRestock} className="bg-green-600 hover:bg-green-700 text-white">
                <Plus className="w-4 h-4 mr-2" />
                Restock {restockQuantity} container{restockQuantity !== 1 ? 's' : ''}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
