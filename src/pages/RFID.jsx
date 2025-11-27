
import React, { useState, useEffect, useMemo } from 'react';
import { Beer, RfidTag, StorageLocation } from '@/entities/all';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, RadioTower, ScanLine, Tag, Save, X, Plus, Trash2, Loader2 } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';
import { scanRfidTags } from '@/functions/scanRfidTags';

export default function RfidPage() {
    const navigate = useNavigate();
    const [beers, setBeers] = useState([]);
    const [rfidTags, setRfidTags] = useState([]);
    const [locations, setLocations] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedBeerId, setSelectedBeerId] = useState(null);
    const [newTagId, setNewTagId] = useState('');
    const [selectedLocation, setSelectedLocation] = useState('all');
    const [bulkTagIds, setBulkTagIds] = useState('');
    const [isBulkMode, setIsBulkMode] = useState(false);
    const [isScanning, setIsScanning] = useState(false);
    const [scanDuration, setScanDuration] = useState(10);

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const [beersData, tagsData, locationsData] = await Promise.all([
                    Beer.list('-brew_date'),
                    RfidTag.list('-registered_date'),
                    StorageLocation.list(),
                ]);
                setBeers(beersData);
                setRfidTags(tagsData);
                setLocations(locationsData);
            } catch (error) {
                console.error("Error fetching data:", error);
            }
            setIsLoading(false);
        };
        fetchData();
    }, []);

    const handleLiveScan = async () => {
        setIsScanning(true);
        try {
            const { data } = await scanRfidTags({ 
                action: 'start_scan', 
                duration: scanDuration 
            });

            if (data.success) {
                // Add newly detected tags to the bulk registration text area
                const currentTags = bulkTagIds.split('\n').map(id => id.trim()).filter(id => id.length > 0);
                const newTags = data.tags_detected.filter(tag => !currentTags.includes(tag));
                
                if (newTags.length > 0) {
                    const updatedTags = [...currentTags, ...newTags].join('\n');
                    setBulkTagIds(updatedTags);
                    alert(`Found ${newTags.length} new RFID tags!\n\n${data.message || ''}`);
                } else {
                    alert(`Scan completed. No new tags detected.\n\n${data.message || ''}`);
                }
            } else {
                alert(`Scan failed: ${data.error}`);
            }
        } catch (error) {
            console.error("Live scan error:", error);
            alert("Failed to communicate with RFID scanner. Please check your setup.");
        }
        setIsScanning(false);
    };

    const handleRegisterSingleTag = async () => {
        if (!selectedBeerId || !newTagId.trim()) return;

        const beer = beers.find(b => b.id === selectedBeerId);
        if (!beer) return;

        try {
            await RfidTag.create({
                tag_id: newTagId.trim().toUpperCase(),
                beer_id: beer.id,
                beer_name: beer.name,
                registered_date: new Date().toISOString()
            });

            // Enable RFID tracking for this beer if not already enabled
            if (!beer.rfid_enabled) {
                await Beer.update(beer.id, { rfid_enabled: true });
                setBeers(beers.map(b => 
                    b.id === beer.id ? { ...b, rfid_enabled: true } : b
                ));
            }

            // Refresh tags
            const updatedTags = await RfidTag.list('-registered_date');
            setRfidTags(updatedTags);
            
            setNewTagId('');
            setSelectedBeerId(null);
        } catch (error) {
            console.error("Error registering tag:", error);
            alert("Failed to register tag. Please try again.");
        }
    };

    const handleBulkRegister = async () => {
        if (!selectedBeerId || !bulkTagIds.trim()) return;

        const beer = beers.find(b => b.id === selectedBeerId);
        if (!beer) return;

        const tagIds = bulkTagIds
            .split(/[\n,;]/)
            .map(id => id.trim().toUpperCase())
            .filter(id => id.length > 0);

        if (tagIds.length === 0) {
            alert("Please enter at least one tag ID or use Live Scan.");
            return;
        }

        try {
            // Create all tags
            for (const tagId of tagIds) {
                await RfidTag.create({
                    tag_id: tagId,
                    beer_id: beer.id,
                    beer_name: beer.name,
                    registered_date: new Date().toISOString()
                });
            }

            // Enable RFID tracking for this beer
            if (!beer.rfid_enabled) {
                await Beer.update(beer.id, { rfid_enabled: true });
                setBeers(beers.map(b => 
                    b.id === beer.id ? { ...b, rfid_enabled: true } : b
                ));
            }

            // Refresh tags
            const updatedTags = await RfidTag.list('-registered_date');
            setRfidTags(updatedTags);
            
            setBulkTagIds('');
            setSelectedBeerId(null);
            setIsBulkMode(false);
            alert(`Successfully registered ${tagIds.length} tags for ${beer.name}`);
        } catch (error) {
            console.error("Error bulk registering tags:", error);
            alert("Failed to register tags. Please try again.");
        }
    };

    const handleDeleteTag = async (tagToDelete) => {
        if (!confirm("Are you sure you want to delete this RFID tag registration?")) return;

        try {
            // Delete the tag from the database
            await RfidTag.delete(tagToDelete.id);

            // Immediately update the local state for a quick UI response
            const updatedTagsList = rfidTags.filter(t => t.id !== tagToDelete.id);
            setRfidTags(updatedTagsList);

            // Check if there are any other tags remaining for this specific beer
            const remainingTagsForBeer = updatedTagsList.filter(t => t.beer_id === tagToDelete.beer_id);

            // If no tags are left for this beer, update the beer to disable RFID tracking
            if (remainingTagsForBeer.length === 0) {
                await Beer.update(tagToDelete.beer_id, { rfid_enabled: false });
                
                // Refresh the main beers list to update the badge in the UI
                const updatedBeers = await Beer.list('-brew_date');
                setBeers(updatedBeers);
            }
        } catch (error) {
            console.error("Error deleting tag:", error);
            alert("Failed to delete tag. Please try again.");
            // Optional: Re-fetch to ensure consistency on error
            const freshTags = await RfidTag.list('-registered_date');
            setRfidTags(freshTags);
        }
    };

    const filteredBeers = useMemo(() => {
        if (selectedLocation === 'all') return beers;
        return beers.filter(beer => beer.location_id === selectedLocation);
    }, [beers, selectedLocation]);

    const getTagsForBeer = (beerId) => {
        return rfidTags.filter(tag => tag.beer_id === beerId);
    };

    const getTagCountByStatus = (beerId, status) => {
        return rfidTags.filter(tag => tag.beer_id === beerId && tag.status === status).length;
    };

    return (
        <div className="p-6 md:p-8 min-h-screen">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <motion.div 
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4"
                >
                    <div className="flex items-center gap-4">
                        <Link to={createPageUrl("Dashboard")} className="p-2 bg-white/50 rounded-full shadow-inner hover:bg-white/70 transition-colors">
                            <ArrowLeft className="w-6 h-6 text-[--accent-text]" />
                        </Link>
                        <div className="p-3 bg-white/50 rounded-full shadow-inner">
                            <RadioTower className="w-10 h-10 text-[--accent-text]" />
                        </div>
                        <div>
                            <h1 className="text-4xl font-bold text-[--primary-text]">RFID Management</h1>
                            <p className="text-[--secondary-text]">Register, view, and manage RFID tags for automated stock tracking.</p>
                        </div>
                    </div>
                </motion.div>
                
                {/* Registration Card */}
                <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl mb-8">
                    <CardHeader>
                        <CardTitle className="text-2xl text-[--primary-text]">Register New Tags</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Select value={selectedBeerId || ""} onValueChange={setSelectedBeerId}>
                                <SelectTrigger className="border-[--border-color] focus:border-[--border-focus-color]">
                                    <SelectValue placeholder="Select a beer batch to register tags for" />
                                </SelectTrigger>
                                <SelectContent>
                                    {filteredBeers.map(beer => (
                                        <SelectItem key={beer.id} value={beer.id}>
                                            {beer.name} ({beer.style})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <div className="flex gap-2">
                                <Button 
                                    variant={!isBulkMode ? "default" : "outline"}
                                    onClick={() => setIsBulkMode(false)}
                                    style={!isBulkMode ? { backgroundColor: 'var(--button-bg)' } : {}}
                                >
                                    Single Tag
                                </Button>
                                <Button 
                                    variant={isBulkMode ? "default" : "outline"}
                                    onClick={() => setIsBulkMode(true)}
                                    style={isBulkMode ? { backgroundColor: 'var(--button-bg)' } : {}}
                                >
                                    Bulk Register
                                </Button>
                            </div>
                        </div>

                        {!isBulkMode ? (
                            <div className="flex gap-2">
                                <Input 
                                    value={newTagId}
                                    onChange={(e) => setNewTagId(e.target.value)}
                                    placeholder="Scan or enter RFID Tag ID (e.g., E200001A2B3C4D5E)"
                                    className="border-[--border-color] focus:border-[--border-focus-color]"
                                />
                                <Button onClick={handleRegisterSingleTag} disabled={!selectedBeerId || !newTagId.trim()}>
                                    <Save className="w-4 h-4 mr-2" />
                                    Register Tag
                                </Button>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <div className="flex items-center gap-4 mb-3">
                                    <div className="flex items-center gap-2">
                                        <label className="text-sm font-medium">Scan Duration:</label>
                                        <Select value={scanDuration.toString()} onValueChange={(value) => setScanDuration(parseInt(value))}>
                                            <SelectTrigger className="w-20">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="5">5s</SelectItem>
                                                <SelectItem value="10">10s</SelectItem>
                                                <SelectItem value="15">15s</SelectItem>
                                                <SelectItem value="30">30s</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <Button 
                                        onClick={handleLiveScan} 
                                        disabled={isScanning || !selectedBeerId}
                                        variant="outline"
                                        className="flex items-center gap-2"
                                    >
                                        {isScanning ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                Scanning...
                                            </>
                                        ) : (
                                            <>
                                                <ScanLine className="w-4 h-4" />
                                                Live Scan
                                            </>
                                        )}
                                    </Button>
                                </div>
                                
                                <textarea
                                    value={bulkTagIds}
                                    onChange={(e) => setBulkTagIds(e.target.value)}
                                    placeholder="Enter multiple tag IDs, one per line or separated by commas:&#10;E200001A2B3C4D5E&#10;E200001A2B3C4D5F&#10;E200001A2B3C4D60&#10;&#10;Or use the 'Live Scan' button above to automatically detect tags!"
                                    className="w-full h-32 p-3 border border-[--border-color] rounded-lg focus:border-[--border-focus-color] resize-none"
                                />
                                <Button onClick={handleBulkRegister} disabled={!selectedBeerId || !bulkTagIds.trim()}>
                                    <Plus className="w-4 h-4 mr-2" />
                                    Register All Tags
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Beer Inventory with RFID Status */}
                <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="text-2xl text-[--primary-text]">Beer Inventory & RFID Status</CardTitle>
                        <div className="w-64">
                             <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                                <SelectTrigger className="border-[--border-color] focus:border-[--border-focus-color]">
                                    <SelectValue placeholder="Filter by location" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Locations</SelectItem>
                                    {locations.map(loc => (
                                        <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <p className="text-center py-8">Loading beers...</p>
                        ) : (
                            <div className="space-y-3">
                                {filteredBeers.map(beer => {
                                    const beerTags = getTagsForBeer(beer.id);
                                    const inStockTags = getTagCountByStatus(beer.id, 'in_stock');
                                    const consumedTags = getTagCountByStatus(beer.id, 'consumed');

                                    return (
                                        <div key={beer.id} className="p-4 rounded-lg bg-[--outline-hover-bg] border border-[--border-color]">
                                            <div className="flex items-center justify-between gap-4">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <p className="font-bold text-[--primary-text]">{beer.name}</p>
                                                        {beer.rfid_enabled && (
                                                            <Badge variant="outline" className="text-green-600 border-green-200">
                                                                <RadioTower className="w-3 h-3 mr-1" />
                                                                RFID Enabled
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <p className="text-sm text-[--secondary-text] mb-1">{beer.style} • Current Stock: {beer.current_quantity}</p>
                                                    
                                                    {beerTags.length > 0 && (
                                                        <div className="flex gap-4 text-xs text-[--accent-text]">
                                                            <span>RFID Tags: {beerTags.length} total</span>
                                                            <span className="text-green-600">{inStockTags} in stock</span>
                                                            <span className="text-gray-500">{consumedTags} consumed</span>
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="text-right">
                                                    {beerTags.length === 0 ? (
                                                        <p className="text-sm text-gray-500 italic">No tags registered</p>
                                                    ) : (
                                                        <div className="space-y-1">
                                                            {beerTags.slice(0, 3).map(tag => (
                                                                <div key={tag.id} className="flex items-center gap-2 text-xs">
                                                                    <code className="bg-gray-100 px-2 py-1 rounded font-mono">
                                                                        {tag.tag_id.slice(-8)}...
                                                                    </code>
                                                                    <Badge variant={tag.status === 'in_stock' ? 'default' : 'secondary'} className="text-xs">
                                                                        {tag.status}
                                                                    </Badge>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        onClick={() => handleDeleteTag(tag)}
                                                                        className="h-6 w-6 p-0 text-red-600 hover:text-red-800"
                                                                    >
                                                                        <Trash2 className="w-3 h-3" />
                                                                    </Button>
                                                                </div>
                                                            ))}
                                                            {beerTags.length > 3 && (
                                                                <p className="text-xs text-gray-500">
                                                                    ...and {beerTags.length - 3} more
                                                                </p>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                         {filteredBeers.length === 0 && !isLoading && (
                            <p className="text-center py-12 text-[--secondary-text]">
                                No beers found for this location.
                            </p>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
