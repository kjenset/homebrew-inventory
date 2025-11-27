
import { createClientFromRequest } from 'npm:@base44/sdk@0.5.0';

const validBeerStyles = new Set(["IPA", "Pale Ale", "Lager", "Stout", "Porter", "Wheat Beer", "Saison", "Pilsner", "Amber Ale", "Brown Ale", "Belgian Ale", "Sour Beer"]);

Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);

    if (!(await base44.auth.isAuthenticated())) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }

    try {
        const body = await req.json().catch(() => ({}));
        const { action, selectedBatches } = body;

        const settings = await base44.asServiceRole.entities.AppSettings.list();
        if (settings.length === 0) {
            return new Response(JSON.stringify({ error: 'App settings not found. Please configure Brewfather credentials in Settings first.' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
        }

        const { brewfather_user_id, brewfather_api_key } = settings[0];
        
        if (!brewfather_user_id || !brewfather_api_key || !brewfather_user_id.trim() || !brewfather_api_key.trim()) {
            return new Response(JSON.stringify({ error: 'Brewfather API credentials are missing or empty. Please check your Settings.' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
        }

        const authHeader = 'Basic ' + btoa(`${brewfather_user_id.trim()}:${brewfather_api_key.trim()}`);
        
        if (action === 'list') {
            // Updated the include parameter to fetch the full recipe object
            const response = await fetch('https://api.brewfather.app/v2/batches?include=recipe,packaging&limit=50', {
                headers: { 
                    'Authorization': authHeader,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                let errorMessage = `Brewfather API error: ${response.status}`;
                if (response.status === 401) {
                    errorMessage = 'Invalid Brewfather credentials. Please double-check your User ID and API Key in Settings.';
                }
                return new Response(JSON.stringify({ error: errorMessage }), { 
                    status: response.status, 
                    headers: { 'Content-Type': 'application/json' } 
                });
            }

            const bfBatches = await response.json();
            
            if (!Array.isArray(bfBatches)) {
                return new Response(JSON.stringify({ error: 'Invalid response from Brewfather API' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
            }

            // Get existing beers to mark which ones are already imported
            const existingBeers = await base44.asServiceRole.entities.Beer.list();
            const existingBfIds = new Set(existingBeers.map(b => b.brewfather_id).filter(Boolean));

            // Format batches for selection UI
            const formattedBatches = bfBatches.map(batch => ({
                id: batch._id,
                name: batch.recipe?.name || `Batch ${batch.batchNo || 'Unknown'}`,
                style: batch.recipe?.style?.name || 'Other',
                status: batch.status || 'Unknown',
                brewDate: batch.brewDate,
                abv: batch.measuredAbv || batch.recipe?.abv,
                ibu: batch.recipe?.ibu, // IBU is now correctly fetched
                batchNo: batch.batchNo,
                alreadyImported: existingBfIds.has(batch._id),
                rawData: batch // Keep full data for import
            }));

            return new Response(JSON.stringify({
                action: 'list',
                batches: formattedBatches
            }), { status: 200, headers: { 'Content-Type': 'application/json' } });

        } else if (action === 'import' && selectedBatches) {
            // Import selected batches
            const existingBeers = await base44.asServiceRole.entities.Beer.list();
            const existingBfIds = new Set(existingBeers.map(b => b.brewfather_id).filter(Boolean));

            const newBeersToCreate = [];
            let skippedCount = 0;

            for (const batch of selectedBatches) {
                if (existingBfIds.has(batch.id)) {
                    skippedCount++;
                    continue;
                }

                const rawBatch = batch.rawData;
                const styleName = rawBatch.recipe?.style?.name;
                const mappedStyle = validBeerStyles.has(styleName) ? styleName : "Other";
                
                const packaging = rawBatch.packaging || {};
                const bottleCount = packaging.bottles?.reduce((sum, p) => sum + (p.count || 0), 0) || 0;
                const kegCount = packaging.kegs?.reduce((sum, p) => sum + (p.count || 0), 0) || 0;
                
                // Default to Can with 0.5L volume
                let containerType = "Can";
                let containerVolume = 0.5;
                let totalCount; // Will be determined based on packaging or default to 1
                
                // Override defaults if specific packaging data exists
                if (kegCount > 0) {
                    containerType = "Keg";
                    containerVolume = packaging.kegs?.[0]?.volume || 19;
                    totalCount = kegCount;
                } else if (bottleCount > 0) {
                    containerType = "Bottle";
                    containerVolume = packaging.bottles?.[0]?.volume || 0.5;
                    totalCount = bottleCount;
                } else {
                    // Use defaults: Can, 0.5L, and set reasonable quantity
                    totalCount = 1;
                }

                const newBeer = {
                    name: rawBatch.recipe?.name || `Batch ${rawBatch.batchNo || 'Unknown'}`,
                    style: mappedStyle,
                    brew_date: rawBatch.brewDate ? new Date(rawBatch.brewDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                    alcohol_percentage: rawBatch.measuredAbv 
                        ? Math.round(rawBatch.measuredAbv * 10) / 10 
                        : rawBatch.recipe?.abv 
                            ? Math.round(rawBatch.recipe.abv * 10) / 10 
                            : 5.0,
                    bitterness_ibu: rawBatch.recipe?.ibu 
                        ? Math.round(rawBatch.recipe.ibu) 
                        : null,
                    color: "Golden",
                    container_type: containerType,
                    container_volume: containerVolume,
                    original_quantity: totalCount,
                    current_quantity: totalCount,
                    description: `Imported from Brewfather. Batch No: ${rawBatch.batchNo || 'N/A'}. Status: ${rawBatch.status || 'N/A'}.`,
                    brewfather_id: rawBatch._id
                };
                newBeersToCreate.push(newBeer);
            }

            const importedBeerIds = [];
            if (newBeersToCreate.length > 0) {
                const createdBeers = await base44.asServiceRole.entities.Beer.bulkCreate(newBeersToCreate);
                // Extract IDs from created beers for potential redirect
                importedBeerIds.push(...createdBeers.map(beer => beer.id));
            }

            return new Response(JSON.stringify({
                action: 'import',
                imported: newBeersToCreate.length,
                skipped: skippedCount,
                importedBeerIds: importedBeerIds // Include IDs for potential redirect
            }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }

        return new Response(JSON.stringify({ error: 'Invalid action specified' }), { status: 400, headers: { 'Content-Type': 'application/json' } });

    } catch (error) {
        console.error('Import function error:', error);
        return new Response(JSON.stringify({ 
            error: `Import failed: ${error.message || 'Unknown error occurred'}` 
        }), { 
            status: 500, 
            headers: { 'Content-Type': 'application/json' } 
        });
    }
});
