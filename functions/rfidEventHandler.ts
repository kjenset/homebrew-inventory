import { createClientFromRequest } from 'npm:@base44/sdk@0.5.0';

Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);
    
    // This endpoint should be protected. A simple secret key check is a good start.
    const authHeader = req.headers.get('Authorization');
    const expectedAuth = `Bearer ${Deno.env.get('RFID_HANDLER_SECRET')}`;
    
    if (!Deno.env.get('RFID_HANDLER_SECRET') || authHeader !== expectedAuth) {
        console.error("RFID Handler: Unauthorized access attempt.");
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    try {
        const { rfid_tag_id, action } = await req.json();

        if (!rfid_tag_id || !action) {
            return new Response(JSON.stringify({ error: 'Missing rfid_tag_id or action' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // Find the RFID tag registration
        const rfidTags = await base44.asServiceRole.entities.RfidTag.filter({ tag_id: rfid_tag_id });

        if (rfidTags.length === 0) {
            console.log(`RFID Handler: No tag registration found for ${rfid_tag_id}`);
            return new Response(JSON.stringify({ message: `No registration found for tag ${rfid_tag_id}` }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' },
            });
        }
        
        const rfidTag = rfidTags[0];

        if (action === 'consumed') {
            // Only process if the tag is currently in stock
            if (rfidTag.status !== 'in_stock') {
                console.log(`RFID Handler: Tag ${rfid_tag_id} is already marked as consumed.`);
                return new Response(JSON.stringify({ success: false, message: 'Tag already consumed' }), { status: 200 });
            }

            // Get the beer details
            const beer = await base44.asServiceRole.entities.Beer.get(rfidTag.beer_id);
            
            if (beer.current_quantity > 0) {
                const newQuantity = beer.current_quantity - 1;
                
                // Update beer quantity
                await base44.asServiceRole.entities.Beer.update(beer.id, {
                    current_quantity: newQuantity,
                });

                // Mark this specific RFID tag as consumed
                await base44.asServiceRole.entities.RfidTag.update(rfidTag.id, {
                    status: 'consumed',
                    consumed_date: new Date().toISOString(),
                });

                // Log the consumption
                await base44.asServiceRole.entities.ConsumptionLog.create({
                    beer_id: beer.id,
                    beer_name: beer.name,
                    quantity_consumed: beer.container_volume,
                    containers_consumed: 1,
                    consumption_date: new Date().toISOString(),
                    notes: `Consumed (RFID Auto-Tracked: ${rfid_tag_id})`,
                });
                
                console.log(`RFID Handler: Processed consumption for beer "${beer.name}" (Tag: ${rfid_tag_id}). New quantity: ${newQuantity}`);
                return new Response(JSON.stringify({ success: true, message: `Consumed 1 unit of ${beer.name}` }), { status: 200 });
            } else {
                console.log(`RFID Handler: Consumption event for "${beer.name}" ignored, stock is already 0.`);
                return new Response(JSON.stringify({ success: false, message: 'Stock is already zero' }), { status: 200 });
            }
        } else if (action === 'stocked') {
            // Only process if the tag is currently consumed
            if (rfidTag.status !== 'consumed') {
                console.log(`RFID Handler: Tag ${rfid_tag_id} is already in stock.`);
                return new Response(JSON.stringify({ success: false, message: 'Tag already in stock' }), { status: 200 });
            }

            // Get the beer details
            const beer = await base44.asServiceRole.entities.Beer.get(rfidTag.beer_id);
            const newQuantity = beer.current_quantity + 1;
            
            // Update beer quantity
            await base44.asServiceRole.entities.Beer.update(beer.id, {
                current_quantity: newQuantity,
            });

            // Mark this specific RFID tag as back in stock
            await base44.asServiceRole.entities.RfidTag.update(rfidTag.id, {
                status: 'in_stock',
                consumed_date: null,
            });
            
            console.log(`RFID Handler: Processed restock for beer "${beer.name}" (Tag: ${rfid_tag_id}). New quantity: ${newQuantity}`);
            return new Response(JSON.stringify({ success: true, message: `Restocked 1 unit of ${beer.name}` }), { status: 200 });
        } else {
            return new Response(JSON.stringify({ error: 'Invalid action' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

    } catch (error) {
        console.error('RFID Handler Error:', error);
        return new Response(JSON.stringify({ error: `Function error: ${error.message}` }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
});