
import { createClientFromRequest } from 'npm:@base44/sdk@0.5.0';

// Helper to send email alerts
async function sendTempAlertEmail(base44, settings, temperature, sensorName) {
    if (!settings.temp_alert_email) {
        console.log("Temperature alert triggered, but no email is configured.");
        return;
    }

    const subject = `High Temperature Alert: ${sensorName}`;
    const body = `
        <p>This is an automated alert from your Homebrew Inventory app.</p>
        <p>The temperature for <strong>${sensorName}</strong> has exceeded the configured threshold.</p>
        <ul>
            <li>Current Temperature: <strong>${temperature.toFixed(1)}°C</strong></li>
            <li>Alert Threshold: <strong>${settings.temp_alert_threshold}°C</strong></li>
            <li>Source: Home Assistant</li>
        </ul>
        <p>Please check your cooling system.</p>
    `;

    try {
        await base44.asServiceRole.integrations.SendEmail({
            to: settings.temp_alert_email,
            subject: subject,
            body: body,
        });
        console.log(`High temperature alert email sent to ${settings.temp_alert_email}.`);
    } catch (emailError) {
        console.error("Failed to send temperature alert email:", emailError.message || emailError);
    }
}

Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);

    try {
        // Get settings using service role
        const settingsList = await base44.asServiceRole.entities.AppSettings.list();
        if (settingsList.length === 0 || !settingsList[0].ha_enabled) {
            return new Response(JSON.stringify({ message: 'Home Assistant integration not enabled' }), { 
                status: 200, 
                headers: { 'Content-Type': 'application/json' } 
            });
        }
        
        const settings = settingsList[0];
        
        // Validate Home Assistant settings
        if (!settings.ha_url || !settings.ha_token) {
            return new Response(JSON.stringify({ error: 'Home Assistant URL and token are required' }), { 
                status: 400, 
                headers: { 'Content-Type': 'application/json' } 
            });
        }

        let haUrl = settings.ha_url.trim();
        
        // Handle different URL formats - use HTTP by default for all addresses
        if (!haUrl.startsWith('http://') && !haUrl.startsWith('https://')) {
            haUrl = 'http://' + haUrl;
        }
        
        // Ensure URL doesn't end with trailing slash
        if (haUrl.endsWith('/')) {
            haUrl = haUrl.slice(0, -1);
        }

        console.log(`Connecting to Home Assistant at: ${haUrl}`);

        const headers = {
            'Authorization': `Bearer ${settings.ha_token}`,
            'Content-Type': 'application/json',
        };

        let updatedCount = 0;

        // Handle temperature entity if enabled
        if (settings.ha_temp_enabled && settings.ha_temp_entity && settings.ha_temp_entity.trim()) {
            try {
                console.log(`Fetching temperature from HA entity: ${settings.ha_temp_entity}`);
                
                const response = await fetch(`${haUrl}/api/states/${settings.ha_temp_entity}`, {
                    method: 'GET',
                    headers: headers,
                });

                if (!response.ok) {
                    console.error(`HA API error for temperature: ${response.status} ${response.statusText}`);
                    throw new Error(`HA API returned ${response.status}: ${response.statusText}`); 
                }

                const entityData = await response.json();
                const temperature = parseFloat(entityData.state);
                
                if (!isNaN(temperature)) {
                    console.log(`Storing temperature: ${temperature}°C from ${settings.ha_temp_entity}`);
                    
                    await base44.asServiceRole.entities.FridgeTemp.create({
                        temperature: temperature,
                        location_name: settings.ha_temp_location || entityData.attributes?.friendly_name || settings.ha_temp_entity,
                        timestamp: new Date().toISOString(),
                    });
                    
                    updatedCount++;

                    // Temperature Alert Logic
                    if (settings.temp_alert_enabled && settings.temp_alert_threshold && settings.temp_alert_email) {
                        const isOverThreshold = temperature > settings.temp_alert_threshold;
                        const lastStatus = settings.temp_alert_last_status || 'OK';

                        if (isOverThreshold && lastStatus === 'OK') {
                            const sensorName = settings.ha_temp_location || entityData.attributes?.friendly_name || settings.ha_temp_entity;
                            await sendTempAlertEmail(base44, settings, temperature, sensorName);
                            await base44.asServiceRole.entities.AppSettings.update(settings.id, { temp_alert_last_status: 'ALERT' });
                        } else if (!isOverThreshold && lastStatus === 'ALERT') {
                            console.log("Temperature is back to normal. Resetting alert status.");
                            await base44.asServiceRole.entities.AppSettings.update(settings.id, { temp_alert_last_status: 'OK' });
                        }
                    }
                } else {
                    console.log(`Could not parse temperature from entity ${settings.ha_temp_entity}: ${entityData.state}`);
                }
            } catch (error) {
                console.error(`Error fetching temperature from ${settings.ha_temp_entity}:`, error.message);
            }
        }

        // Handle door sensor entity if enabled
        if (settings.ha_door_enabled && settings.ha_door_entity && settings.ha_door_entity.trim()) {
            try {
                console.log(`Fetching door status from HA entity: ${settings.ha_door_entity}`);
                
                const response = await fetch(`${haUrl}/api/states/${settings.ha_door_entity}`, {
                    method: 'GET',
                    headers: headers,
                });

                if (!response.ok) {
                    console.error(`HA API error for door sensor: ${response.status} ${response.statusText}`);
                } else {
                    const entityData = await response.json();
                    let doorStatus = entityData.state.toLowerCase();
                    
                    // Normalize door status
                    let normalizedStatus;
                    if (doorStatus === 'on' || doorStatus === 'open' || doorStatus === '1' || doorStatus === 'true') {
                        normalizedStatus = 'open';
                    } else if (doorStatus === 'off' || doorStatus === 'closed' || doorStatus === 'locked' || doorStatus === '0' || doorStatus === 'false') {
                        normalizedStatus = 'locked';
                    }
                    
                    if (normalizedStatus) {
                        console.log(`Storing door status: ${normalizedStatus} from ${settings.ha_door_entity}`);
                        
                        await base44.asServiceRole.entities.DoorSensor.create({
                            status: normalizedStatus,
                            location_name: settings.ha_door_location || entityData.attributes?.friendly_name || settings.ha_door_entity,
                            timestamp: new Date().toISOString(),
                        });
                        
                        updatedCount++;
                    } else {
                        console.log(`Could not parse door status from entity ${settings.ha_door_entity}: ${entityData.state}`);
                    }
                }
            } catch (error) {
                console.error(`Error fetching door status from ${settings.ha_door_entity}:`, error.message);
            }
        }

        // Handle leak sensor entity if enabled
        if (settings.ha_leak_enabled && settings.ha_leak_entity && settings.ha_leak_entity.trim()) {
            try {
                console.log(`Fetching leak status from HA entity: ${settings.ha_leak_entity}`);
                
                const response = await fetch(`${haUrl}/api/states/${settings.ha_leak_entity}`, {
                    method: 'GET',
                    headers: headers,
                });

                if (!response.ok) {
                    console.error(`HA API error for leak sensor: ${response.status} ${response.statusText}`);
                } else {
                    const entityData = await response.json();
                    let leakStatus = entityData.state.toLowerCase();
                    
                    // Normalize leak status
                    let normalizedStatus;
                    if (leakStatus === 'on' || leakStatus === 'wet' || leakStatus === 'leak' || leakStatus === '1' || leakStatus === 'true') {
                        normalizedStatus = 'leak';
                    } else if (leakStatus === 'off' || leakStatus === 'dry' || leakStatus === 'ok' || leakStatus === '0' || leakStatus === 'false') {
                        normalizedStatus = 'dry';
                    }
                    
                    if (normalizedStatus) {
                        console.log(`Storing leak status: ${normalizedStatus} from ${settings.ha_leak_entity}`);
                        
                        await base44.asServiceRole.entities.LeakSensor.create({
                            status: normalizedStatus,
                            location_name: settings.ha_leak_location || entityData.attributes?.friendly_name || settings.ha_leak_entity,
                            timestamp: new Date().toISOString(),
                        });
                        
                        updatedCount++;
                    } else {
                        console.log(`Could not parse leak status from entity ${settings.ha_leak_entity}: ${entityData.state}`);
                    }
                }
            } catch (error) {
                console.error(`Error fetching leak status from ${settings.ha_leak_entity}:`, error.message);
            }
        }

        return new Response(JSON.stringify({ 
            message: `Home Assistant data update completed. Updated ${updatedCount} sensor readings.`,
            ha_url: haUrl,
            entities_processed: updatedCount
        }), { 
            status: 200, 
            headers: { 'Content-Type': 'application/json' } 
        });

    } catch (error) {
        console.error('Home Assistant Update function error:', error);
        return new Response(JSON.stringify({ 
            error: `Function error: ${error.message}` 
        }), { 
            status: 500, 
            headers: { 'Content-Type': 'application/json' } 
        });
    }
});
