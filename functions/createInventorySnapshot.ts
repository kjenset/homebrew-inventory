import { createClientFromRequest } from 'npm:@base44/sdk@0.5.0';

Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);

    try {
        // Get all beers to calculate current totals
        const beers = await base44.asServiceRole.entities.Beer.list();
        
        // Calculate total liters and total beer count
        const totalLiters = beers.reduce((sum, beer) => {
            const quantity = beer.current_quantity || 0;
            const volume = beer.container_volume || 0;
            return sum + (quantity * volume);
        }, 0);
        
        const totalBeers = beers.length;
        
        // Create snapshot for today
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
        
        // Check if snapshot already exists for today
        const existingSnapshots = await base44.asServiceRole.entities.InventorySnapshot.filter({
            snapshot_date: today
        });
        
        if (existingSnapshots.length > 0) {
            // Update existing snapshot
            await base44.asServiceRole.entities.InventorySnapshot.update(existingSnapshots[0].id, {
                total_liters: totalLiters,
                total_beers: totalBeers,
                snapshot_date: today
            });
            
            return new Response(JSON.stringify({
                message: 'Daily inventory snapshot updated',
                total_liters: totalLiters,
                total_beers: totalBeers,
                date: today
            }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        } else {
            // Create new snapshot
            await base44.asServiceRole.entities.InventorySnapshot.create({
                total_liters: totalLiters,
                total_beers: totalBeers,
                snapshot_date: today
            });
            
            return new Response(JSON.stringify({
                message: 'Daily inventory snapshot created',
                total_liters: totalLiters,
                total_beers: totalBeers,
                date: today
            }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        }

    } catch (error) {
        console.error('Create inventory snapshot error:', error);
        return new Response(JSON.stringify({
            error: `Failed to create inventory snapshot: ${error.message}`
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
});