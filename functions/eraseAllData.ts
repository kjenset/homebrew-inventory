import { createClientFromRequest } from 'npm:@base44/sdk@0.5.0';

Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);

    // Ensure user is authenticated before proceeding
    if (!(await base44.auth.isAuthenticated())) {
        return new Response(JSON.stringify({ error: 'Unauthorized: You must be logged in to perform this action.' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    try {
        // List of entities whose data will be completely erased.
        // AppSettings is excluded to preserve user configuration.
        const entitiesToDelete = [
            'Beer',
            'ConsumptionLog',
            'StorageLocation',
            'FridgeTemp',
            'InventorySnapshot'
        ];

        let deletedCounts = {};

        // Loop through each entity and delete all its records
        for (const entityName of entitiesToDelete) {
            console.log(`Fetching records for ${entityName}...`);
            const records = await base44.asServiceRole.entities[entityName].list();
            const idsToDelete = records.map(r => r.id);
            
            deletedCounts[entityName] = idsToDelete.length;

            if (idsToDelete.length > 0) {
                console.log(`Deleting ${idsToDelete.length} records from ${entityName}...`);
                // The SDK deletes one by one, so we loop through the IDs
                for (const id of idsToDelete) {
                    await base44.asServiceRole.entities[entityName].delete(id);
                }
                console.log(`Finished deleting from ${entityName}.`);
            } else {
                console.log(`No records to delete in ${entityName}.`);
            }
        }
        
        return new Response(JSON.stringify({
            message: 'All private data has been successfully erased. Your settings have been kept.',
            details: deletedCounts
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Error erasing all data:', error);
        return new Response(JSON.stringify({
            error: `Failed to erase data: ${error.message}`
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
});