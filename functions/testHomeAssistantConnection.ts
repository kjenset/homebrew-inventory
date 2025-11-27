import { createClientFromRequest } from 'npm:@base44/sdk@0.5.0';

Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);

    // Require user authentication for this test function
    if (!(await base44.auth.isAuthenticated())) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    try {
        // Get Home Assistant settings
        const settingsList = await base44.asServiceRole.entities.AppSettings.list();
        if (settingsList.length === 0 || !settingsList[0].ha_enabled) {
            return new Response(JSON.stringify({ 
                success: false,
                error: 'Home Assistant not enabled in settings' 
            }), { 
                status: 200, 
                headers: { 'Content-Type': 'application/json' } 
            });
        }
        
        const settings = settingsList[0];
        
        if (!settings.ha_url || !settings.ha_token) {
            return new Response(JSON.stringify({ 
                success: false,
                error: 'Home Assistant URL and access token are required' 
            }), { 
                status: 200, 
                headers: { 'Content-Type': 'application/json' } 
            });
        }

        let haUrl = settings.ha_url.trim();
        
        // Handle different URL formats - use HTTP by default for all addresses
        if (!haUrl.startsWith('http://') && !haUrl.startsWith('https://')) {
            // Default to HTTP for all addresses (both local and dynamic DNS)
            haUrl = 'http://' + haUrl;
        }
        
        if (haUrl.endsWith('/')) {
            haUrl = haUrl.slice(0, -1);
        }

        console.log(`Testing connection to: ${haUrl}`);

        // Test connection by getting HA config
        const response = await fetch(`${haUrl}/api/config`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${settings.ha_token}`,
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            let errorMessage = `Connection failed: ${response.status} ${response.statusText}`;
            
            // Provide more specific error messages for common issues
            if (response.status === 401) {
                errorMessage = 'Authentication failed - check your access token';
            } else if (response.status === 404) {
                errorMessage = 'Home Assistant not found at this URL - check the address';
            } else if (response.status === 0 || response.status >= 500) {
                errorMessage = 'Cannot reach Home Assistant - check URL and network connection';
            }
            
            return new Response(JSON.stringify({ 
                success: false,
                error: errorMessage,
                ha_url: haUrl,
                status_code: response.status
            }), { 
                status: 200, 
                headers: { 'Content-Type': 'application/json' } 
            });
        }

        const config = await response.json();
        
        // Test temperature entity if configured
        let entityTest = null;
        if (settings.ha_temp_entity && settings.ha_temp_entity.trim()) {
            try {
                const entityResponse = await fetch(`${haUrl}/api/states/${settings.ha_temp_entity}`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${settings.ha_token}`,
                        'Content-Type': 'application/json',
                    },
                });

                if (entityResponse.ok) {
                    const entityData = await entityResponse.json();
                    entityTest = {
                        entity_id: settings.ha_temp_entity,
                        state: entityData.state,
                        unit: entityData.attributes?.unit_of_measurement || '',
                        friendly_name: entityData.attributes?.friendly_name || settings.ha_temp_entity,
                        success: true
                    };
                } else {
                    entityTest = {
                        entity_id: settings.ha_temp_entity,
                        success: false,
                        error: `Entity not found or accessible: ${entityResponse.status} ${entityResponse.statusText}`
                    };
                }
            } catch (entityError) {
                entityTest = {
                    entity_id: settings.ha_temp_entity,
                    success: false,
                    error: `Entity test failed: ${entityError.message}`
                };
            }
        }

        return new Response(JSON.stringify({ 
            success: true,
            message: 'Successfully connected to Home Assistant',
            ha_url: haUrl,
            ha_version: config.version,
            location_name: config.location_name,
            entity_test: entityTest
        }), { 
            status: 200, 
            headers: { 'Content-Type': 'application/json' } 
        });

    } catch (error) {
        console.error('Test Home Assistant connection error:', error);
        
        let userFriendlyError = error.message;
        if (error instanceof TypeError && error.message.includes('fetch')) {
            userFriendlyError = 'Cannot connect to Home Assistant - check your URL and network connection';
        } else if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
            userFriendlyError = 'Network connection issue - check your URL and network settings.';
        }
        
        return new Response(JSON.stringify({ 
            success: false,
            error: `Test failed: ${userFriendlyError}` 
        }), { 
            status: 200, 
            headers: { 'Content-Type': 'application/json' } 
        });
    }
});