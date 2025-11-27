import { createClientFromRequest } from 'npm:@base44/sdk@0.5.0';
import * as mqtt from 'npm:mqtt@5.3.4';

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
        // Get MQTT settings
        const settingsList = await base44.asServiceRole.entities.AppSettings.list();
        if (settingsList.length === 0 || !settingsList[0].mqtt_enabled) {
            return new Response(JSON.stringify({ 
                success: false,
                error: 'MQTT not enabled in settings' 
            }), { 
                status: 200, 
                headers: { 'Content-Type': 'application/json' } 
            });
        }
        
        const settings = settingsList[0];
        
        if (!settings.mqtt_broker_url || !settings.mqtt_broker_url.trim()) {
            return new Response(JSON.stringify({ 
                success: false,
                error: 'MQTT broker URL not configured' 
            }), { 
                status: 200, 
                headers: { 'Content-Type': 'application/json' } 
            });
        }

        // Parse broker URL and port properly
        let brokerUrl = settings.mqtt_broker_url.trim();
        let port = parseInt(settings.mqtt_port) || 1883;
        
        // If broker URL already contains protocol and port, extract them
        if (brokerUrl.includes('://')) {
            const urlParts = brokerUrl.split('://');
            const protocol = urlParts[0];
            const hostPart = urlParts[1];
            
            if (hostPart.includes(':')) {
                const [host, portStr] = hostPart.split(':');
                port = parseInt(portStr) || port;
                brokerUrl = `${protocol}://${host}`;
            }
        } else {
            // Add protocol if missing
            brokerUrl = 'mqtt://' + brokerUrl;
        }

        console.log(`Testing connection to: ${brokerUrl} on port ${port}`);

        // Test connection with explicit port
        const clientOptions = {
            port: port,
            connectTimeout: 10000, // 10 seconds
            reconnectPeriod: 0,
        };

        if (settings.mqtt_username && settings.mqtt_username.trim()) {
            clientOptions.username = settings.mqtt_username.trim();
        }
        if (settings.mqtt_password && settings.mqtt_password.trim()) {
            clientOptions.password = settings.mqtt_password.trim();
        }

        console.log('Client options:', { ...clientOptions, password: clientOptions.password ? '***' : undefined });

        const client = mqtt.connect(brokerUrl, clientOptions);

        return new Promise((resolve) => {
            const timeout = setTimeout(() => {
                client.end(true);
                resolve(new Response(JSON.stringify({ 
                    success: false,
                    error: 'Connection timeout (10 seconds)',
                    broker_url: brokerUrl,
                    port: port,
                    attempted_connection: `${brokerUrl}:${port}`
                }), { 
                    status: 200, 
                    headers: { 'Content-Type': 'application/json' } 
                }));
            }, 12000);

            client.on('connect', () => {
                console.log('Successfully connected to MQTT broker');
                clearTimeout(timeout);
                client.end(true);
                resolve(new Response(JSON.stringify({ 
                    success: true,
                    message: 'Successfully connected to MQTT broker',
                    broker_url: brokerUrl,
                    port: port,
                    connected_to: `${brokerUrl}:${port}`
                }), { 
                    status: 200, 
                    headers: { 'Content-Type': 'application/json' } 
                }));
            });

            client.on('error', (err) => {
                console.error('MQTT connection error:', err);
                clearTimeout(timeout);
                client.end(true);
                resolve(new Response(JSON.stringify({ 
                    success: false,
                    error: `Connection failed: ${err.message}`,
                    broker_url: brokerUrl,
                    port: port,
                    attempted_connection: `${brokerUrl}:${port}`,
                    error_code: err.code
                }), { 
                    status: 200, 
                    headers: { 'Content-Type': 'application/json' } 
                }));
            });

            client.on('close', () => {
                console.log('MQTT connection closed');
            });
        });

    } catch (error) {
        console.error('Test MQTT connection error:', error);
        return new Response(JSON.stringify({ 
            success: false,
            error: `Test failed: ${error.message}` 
        }), { 
            status: 200, 
            headers: { 'Content-Type': 'application/json' } 
        });
    }
});