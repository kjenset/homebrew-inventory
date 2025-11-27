
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Calendar, Percent, Droplets, AlertCircle, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { importFromBrewfather } from "@/functions/importFromBrewfather";

const statusColors = {
  'Planning': 'bg-blue-100 text-blue-800',
  'Brewing': 'bg-orange-100 text-orange-800', 
  'Fermenting': 'bg-yellow-100 text-yellow-800',
  'Conditioning': 'bg-purple-100 text-purple-800',
  'Completed': 'bg-green-100 text-green-800',
  'Kegged': 'bg-indigo-100 text-indigo-800',
  'Bottled': 'bg-teal-100 text-teal-800',
  'Served': 'bg-gray-100 text-gray-800'
};

export default function BatchSelector({ isOpen, onClose, onImportComplete }) {
  const [batches, setBatches] = useState([]);
  const [selectedBatches, setSelectedBatches] = useState(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadBatches();
    }
  }, [isOpen]);

  const loadBatches = async () => {
    setIsLoading(true);
    setError('');
    try {
      const { data } = await importFromBrewfather({ action: 'list' });
      const batchesList = data.batches || [];
      
      // Sort by brew date (newest first)
      const sortedBatches = batchesList.sort((a, b) => {
        // Handle cases where brewDate might be null or undefined
        if (!a.brewDate && !b.brewDate) return 0; // Both don't have brewDate, maintain original order
        if (!a.brewDate) return 1; // a doesn't have brewDate, b does, so b comes first (a moves to end)
        if (!b.brewDate) return -1; // b doesn't have brewDate, a does, so a comes first (b moves to end)
        
        // Convert to Date objects for comparison
        return new Date(b.brewDate) - new Date(a.brewDate); // Newest first
      });
      
      setBatches(sortedBatches);
    } catch (error) {
      const errorMessage = error.response?.data?.detail || error.response?.data?.error || 'Failed to load batches from Brewfather';
      if (errorMessage.includes("subscription tier is too low")) {
        setError("Brewfather import is a premium feature. Please upgrade your subscription plan to use it.");
      } else if (errorMessage.includes("Invalid Brewfather credentials")) {
        setError("Invalid Brewfather credentials. Please check your User ID and API Key in Settings.");
      } else {
        setError(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectBatch = (batchId, checked) => {
    const newSelected = new Set(selectedBatches);
    if (checked) {
      newSelected.add(batchId);
    } else {
      newSelected.delete(batchId);
    }
    setSelectedBatches(newSelected);
  };

  const handleSelectAll = (checked) => {
    if (checked) {
      const importableBatches = batches.filter(b => !b.alreadyImported).map(b => b.id);
      setSelectedBatches(new Set(importableBatches));
    } else {
      setSelectedBatches(new Set());
    }
  };

  const handleImport = async () => {
    if (selectedBatches.size === 0) return;
    
    setIsImporting(true);
    try {
      const selectedBatchData = batches.filter(b => selectedBatches.has(b.id));
      const { data } = await importFromBrewfather({ 
        action: 'import', 
        selectedBatches: selectedBatchData 
      });
      
      // If only one beer was imported, redirect to its edit page
      if (data.imported === 1 && data.importedBeerIds && data.importedBeerIds.length === 1) {
        const beerId = data.importedBeerIds[0];
        // Assuming the path for editing a beer is /EditBeer?id=...
        window.location.href = `/EditBeer?id=${beerId}`;
        return; // Don't call onImportComplete since we're navigating away
      }
      
      // For multiple imports or no imports, show normal success message
      onImportComplete(data.imported, data.skipped);
      onClose();
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to import selected batches');
    } finally {
      setIsImporting(false);
    }
  };

  const importableBatches = batches.filter(b => !b.alreadyImported);
  const allImportableSelected = importableBatches.length > 0 && 
    importableBatches.every(b => selectedBatches.has(b.id));

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Select Batches from Brewfather</DialogTitle>
          <DialogDescription>
            Choose which batches you want to import into your inventory. 
            Batches already imported are marked and cannot be selected again.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        <div className="flex-1 overflow-hidden flex flex-col">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin mr-2" />
              Loading batches from Brewfather...
            </div>
          ) : batches.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No batches found in your Brewfather account.
            </div>
          ) : (
            <>
              <div className="flex items-center gap-4 p-3 border-b bg-gray-50">
                <Checkbox
                  checked={allImportableSelected}
                  onCheckedChange={handleSelectAll}
                  disabled={importableBatches.length === 0}
                />
                <span className="font-medium">
                  Select All Importable ({importableBatches.length} batches)
                </span>
                <span className="text-sm text-gray-600">
                  {selectedBatches.size} selected
                </span>
              </div>
              
              <div className="flex-1 overflow-auto p-2">
                <div className="space-y-2">
                  {batches.map((batch, index) => (
                    <motion.div
                      key={batch.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className={`p-4 border rounded-lg ${
                        batch.alreadyImported 
                          ? 'bg-gray-50 border-gray-200' 
                          : 'bg-white border-gray-300 hover:border-gray-400'
                      } transition-colors`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="pt-1">
                          {batch.alreadyImported ? (
                            <CheckCircle2 className="w-5 h-5 text-green-600" />
                          ) : (
                            <Checkbox
                              checked={selectedBatches.has(batch.id)}
                              onCheckedChange={(checked) => handleSelectBatch(batch.id, checked)}
                            />
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <h4 className={`font-semibold ${
                              batch.alreadyImported ? 'text-gray-600' : 'text-gray-900'
                            }`}>
                              {batch.name}
                            </h4>
                            
                            <Badge className={statusColors[batch.status] || 'bg-gray-100 text-gray-800'}>
                              {batch.status}
                            </Badge>
                            
                            {batch.alreadyImported && (
                              <Badge variant="outline" className="text-green-600 border-green-200">
                                Already Imported
                              </Badge>
                            )}
                          </div>
                          
                          <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                            <div className="flex items-center gap-1">
                              <span className="font-medium">Style:</span>
                              <span>{batch.style}</span>
                            </div>
                            
                            {batch.batchNo && (
                              <div className="flex items-center gap-1">
                                <span className="font-medium">Batch:</span>
                                <span>#{batch.batchNo}</span>
                              </div>
                            )}
                            
                            {batch.brewDate && (
                              <div className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                <span>{format(new Date(batch.brewDate), 'MMM dd, yyyy')}</span>
                              </div>
                            )}
                            
                            {batch.abv && (
                              <div className="flex items-center gap-1">
                                <Percent className="w-3 h-3" />
                                <span>{batch.abv.toFixed(1)}% ABV</span>
                              </div>
                            )}
                            
                            {batch.ibu && (
                              <div className="flex items-center gap-1">
                                <Droplets className="w-3 h-3" />
                                <span>{batch.ibu} IBU</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleImport}
            disabled={selectedBatches.size === 0 || isImporting}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isImporting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Importing...
              </>
            ) : (
              `Import Selected (${selectedBatches.size})`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
