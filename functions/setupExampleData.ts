import { createClientFromRequest } from 'npm:@base44/sdk@0.5.0';

Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);

    // Ensure user is authenticated
    if (!(await base44.auth.isAuthenticated())) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    try {
        // 1. Create AppSettings with example text
        const settings = await base44.asServiceRole.entities.AppSettings.create({
            dashboard_title: "My Example Brewery",
            dashboard_subtitle: "This is a demo of your new inventory app!",
            background_color: "amber",
            pin_protection_enabled: false, // Disable PIN for demo
            public_menu_enabled: true, // Enable public menu for demo
            public_menu_title: "Demo Tap List",
        });

        // 2. Create example storage locations
        const mainFridge = await base44.asServiceRole.entities.StorageLocation.create({
            name: "Main Fridge (Demo)"
        });
        const cellar = await base44.asServiceRole.entities.StorageLocation.create({
            name: "Cellar (Demo)"
        });

        // 3. Create example beers using the location IDs
        const exampleBeers = [
            {
                name: "Example-IPA",
                style: "IPA",
                location_id: mainFridge.id,
                alcohol_percentage: 6.5,
                container_type: "Can",
                container_volume: 0.4,
                original_quantity: 12,
                current_quantity: 10,
                brew_date: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
                description: "A deliciously hoppy example IPA with notes of citrus and pine. Perfect for getting to know the app.",
                color: "Golden",
                bitterness_ibu: 55,
                url: "https://www.brewersfriend.com/homebrew/recipe/view/361324/citra-ipa",
            },
            {
                name: "Example-Stout",
                style: "Stout",
                location_id: cellar.id,
                alcohol_percentage: 5.0,
                container_type: "Bottle",
                container_volume: 0.5,
                original_quantity: 24,
                current_quantity: 24,
                brew_date: new Date(new Date().setDate(new Date().getDate() - 60)).toISOString().split('T')[0],
                description: "A rich and creamy stout with hints of coffee and chocolate. Great for aging in the cellar.",
                color: "Black",
                bitterness_ibu: 30,
            },
            {
                name: "Example-Lager (MQTT)",
                style: "Lager",
                location_id: mainFridge.id,
                alcohol_percentage: 4.2,
                brew_date: new Date(new Date().setDate(new Date().getDate() - 20)).toISOString().split('T')[0],
                description: "A crisp and refreshing lager. This example is set up to show how MQTT live tracking works. The volume is not tracked by containers.",
                color: "Pale Gold",
                is_mqtt_tracked: true,
                mqtt_topic: "brewery/keg/example-lager",
                mqtt_unit: "L",
                mqtt_last_value: JSON.stringify({ value: 18.5, unit: "L", timestamp: new Date().toISOString() }),
                original_quantity: 0,
                current_quantity: 0,
                container_volume: 0,
            }
        ];

        for (const beer of exampleBeers) {
            await base44.asServiceRole.entities.Beer.create(beer);
        }

        return new Response(JSON.stringify({ success: true, message: "Example data created successfully." }), {
            headers: { 'Content-Type': 'application/json' },
            status: 200,
        });

    } catch (error) {
        console.error("Error setting up example data:", error);
        return new Response(JSON.stringify({ success: false, error: error.message }), {
            headers: { 'Content-Type': 'application/json' },
            status: 500,
        });
    }
});