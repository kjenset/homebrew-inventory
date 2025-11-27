
import { createClientFromRequest } from 'npm:@base44/sdk@0.5.0';
import * as mqtt from 'npm:mqtt@5.3.4';

// Helper to send email alerts
async function sendTempAlertEmail(base44, settings, temperature) {
    if (!settings.temp_alert_email) {
        console.log("Temperature alert triggered, but no email is configured.");
        return;
    }

    const subject = `High Temperature Alert: ${settings.mqtt_temp_location || 'Your Fermenter'}`;
    const body = `
        <p>This is an automated alert from your Homebrew Inventory app.</p>
        <p>The temperature for <strong>${settings.mqtt_temp_location || 'your fermenter'}</strong> has exceeded the configured threshold.</p>
        <ul>
            <li>Current Temperature: <strong>${temperature.toFixed(1)}°C</strong></li>
            <li>Alert Threshold: <strong>${settings.temp_alert_threshold}°C</strong></li>
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
        // Get settings using service role (no user auth needed for background task)
        const settingsList = await base44.asServiceRole.entities.AppSettings.list();
        if (settingsList.length === 0 || !settingsList[0].mqtt_enabled) {
            return new Response(JSON.stringify({ message: 'MQTT not enabled in settings' }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const settings = settingsList[0];

        // Validate MQTT settings
        if (!settings.mqtt_broker_url || !settings.mqtt_broker_url.trim()) {
            return new Response(JSON.stringify({ error: 'MQTT broker URL not configured' }), {
                status: 400,
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

        // Get topics to subscribe to based on enabled sensors
        const topics = [];

        // Add temperature topic if enabled
        if (settings.mqtt_temp_enabled && settings.mqtt_temp_topic && settings.mqtt_temp_topic.trim()) {
            topics.push(settings.mqtt_temp_topic.trim());
        }

        // Add door topic if enabled
        if (settings.mqtt_door_enabled && settings.mqtt_door_topic && settings.mqtt_door_topic.trim()) {
            topics.push(settings.mqtt_door_topic.trim());
        }

        // Add leak topic if enabled
        if (settings.mqtt_leak_enabled && settings.mqtt_leak_topic && settings.mqtt_leak_topic.trim()) {
            topics.push(settings.mqtt_leak_topic.trim());
        }

        if (topics.length === 0) {
            return new Response(JSON.stringify({ message: 'No MQTT sensors enabled or topics configured' }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        console.log(`Attempting to connect to MQTT broker: ${brokerUrl}:${port}`);
        console.log(`Topics to subscribe to: ${topics.join(', ')}`);

        // Create MQTT client with proper configuration
        const clientOptions = {
            port: port,
            connectTimeout: 10000,
            reconnectPeriod: 0, // Disable auto-reconnect for this function
        };

        // Add authentication if provided
        if (settings.mqtt_username && settings.mqtt_username.trim()) {
            clientOptions.username = settings.mqtt_username.trim();
        }
        if (settings.mqtt_password && settings.mqtt_password.trim()) {
            clientOptions.password = settings.mqtt_password.trim();
        }

        const client = mqtt.connect(brokerUrl, clientOptions);

        return new Promise((resolve, reject) => {
            let messageCount = 0;
            let hasConnected = false;

            // Set a timeout for the entire operation (30 seconds)
            const timeout = setTimeout(() => {
                console.log(`Timeout reached. Processed ${messageCount} messages.`);
                client.end(true, () => {
                     resolve(new Response(JSON.stringify({
                        message: `MQTT update completed. Processed ${messageCount} messages from ${topics.length} topics.`,
                        topics: topics,
                        broker_url: brokerUrl,
                        port: port
                    }), {
                        status: 200,
                        headers: { 'Content-Type': 'application/json' }
                    }));
                });
            }, 30000); // 30 seconds total timeout

            client.on('connect', () => {
                hasConnected = true;
                console.log('Connected to MQTT broker');

                // Subscribe to all topics
                client.subscribe(topics, { qos: 0 }, (err) => {
                    if (err) {
                        clearTimeout(timeout);
                        client.end(true); // Close connection if subscription fails
                        reject(new Response(JSON.stringify({
                            error: `MQTT subscription failed: ${err.message}`
                        }), {
                            status: 500,
                            headers: { 'Content-Type': 'application/json' }
                        }));
                        return;
                    }
                    console.log(`Successfully subscribed to ${topics.length} topics: ${topics.join(', ')}`);
                });
            });

            client.on('message', async (topic, message) => {
                try {
                    const messageString = message.toString().trim();
                    console.log(`Received message on topic ${topic}: ${messageString}`);

                    // Handle temperature topic
                    if (settings.mqtt_temp_enabled && topic === settings.mqtt_temp_topic) {
                        let temperature;
                        try {
                            // Try to parse as JSON first
                            const jsonData = JSON.parse(messageString);
                            temperature = parseFloat(jsonData.value || jsonData.temperature || jsonData.temp);
                        } catch (e) {
                            // If JSON parsing fails, try as plain number
                            temperature = parseFloat(messageString);
                        }

                        if (!isNaN(temperature)) {
                            console.log(`Storing temperature: ${temperature}°C for location: ${settings.mqtt_temp_location || 'Main Fridge'}`);
                            await base44.asServiceRole.entities.FridgeTemp.create({
                                temperature: temperature,
                                location_name: settings.mqtt_temp_location || 'Main Fridge',
                                timestamp: new Date().toISOString(),
                            });
                            messageCount++;

                            // Temperature Alert Logic
                            if (settings.temp_alert_enabled && settings.temp_alert_threshold && settings.temp_alert_email) {
                                const isOverThreshold = temperature > settings.temp_alert_threshold;
                                const lastStatus = settings.temp_alert_last_status || 'OK';

                                if (isOverThreshold && lastStatus === 'OK') {
                                    // Status changed from OK to ALERT, send notification
                                    await sendTempAlertEmail(base44, settings, temperature);
                                    // Update the status to prevent spamming
                                    await base44.asServiceRole.entities.AppSettings.update(settings.id, { temp_alert_last_status: 'ALERT' });
                                } else if (!isOverThreshold && lastStatus === 'ALERT') {
                                    // Status changed from ALERT back to OK, reset the status
                                    console.log("Temperature is back to normal. Resetting alert status.");
                                    await base44.asServiceRole.entities.AppSettings.update(settings.id, { temp_alert_last_status: 'OK' });
                                }
                            }
                        } else {
                            console.log(`Could not parse temperature from: ${messageString}`);
                        }
                    }

                    // Handle door sensor topic
                    if (settings.mqtt_door_enabled && topic === settings.mqtt_door_topic) {
                        let doorStatus;
                        try {
                            // Try to parse as JSON first
                            const jsonData = JSON.parse(messageString);
                            doorStatus = jsonData.status || jsonData.state || jsonData.door;
                        } catch (e) {
                            // If JSON parsing fails, use message string directly
                            doorStatus = messageString.toLowerCase();
                        }

                        // Normalize door status
                        let normalizedStatus;
                        if (doorStatus === 'open' || doorStatus === '1' || doorStatus === 'on' || doorStatus === true) {
                            normalizedStatus = 'open';
                        } else if (doorStatus === 'closed' || doorStatus === 'locked' || doorStatus === '0' || doorStatus === 'off' || doorStatus === false) {
                            normalizedStatus = 'locked';
                        }

                        if (normalizedStatus) {
                            console.log(`Storing door status: ${normalizedStatus} for location: ${settings.mqtt_door_location || 'Fermentation Chamber'}`);
                            await base44.asServiceRole.entities.DoorSensor.create({
                                status: normalizedStatus,
                                location_name: settings.mqtt_door_location || 'Fermentation Chamber',
                                timestamp: new Date().toISOString(),
                            });
                            messageCount++;
                        } else {
                            console.log(`Could not parse door status from: ${messageString}`);
                        }
                    }

                    // Handle leak sensor topic
                    if (settings.mqtt_leak_enabled && topic === settings.mqtt_leak_topic) {
                        let leakStatus;
                        try {
                            // Try to parse as JSON first
                            const jsonData = JSON.parse(messageString);
                            leakStatus = jsonData.status || jsonData.state || jsonData.leak;
                        } catch (e) {
                            // If JSON parsing fails, use message string directly
                            leakStatus = messageString.toLowerCase();
                        }

                        // Normalize leak status
                        let normalizedStatus;
                        if (leakStatus === 'leak' || leakStatus === 'wet' || leakStatus === '1' || leakStatus === 'on' || leakStatus === true) {
                            normalizedStatus = 'leak';
                        } else if (leakStatus === 'dry' || leakStatus === 'ok' || leakStatus === '0' || leakStatus === 'off' || leakStatus === false) {
                            normalizedStatus = 'dry';
                        }

                        if (normalizedStatus) {
                            console.log(`Storing leak status: ${normalizedStatus} for location: ${settings.mqtt_leak_location || 'Basement'}`);
                            await base44.asServiceRole.entities.LeakSensor.create({
                                status: normalizedStatus,
                                location_name: settings.mqtt_leak_location || 'Basement',
                                timestamp: new Date().toISOString(),
                            });
                            messageCount++;
                        } else {
                            console.log(`Could not parse leak status from: ${messageString}`);
                        }
                    }
                } catch (error) {
                    console.error(`Error processing message from topic ${topic}:`, error.message || error);
                }
            });

            client.on('error', (err) => {
                console.error('MQTT client error:', err);
                clearTimeout(timeout);
                client.end(true, () => {
                    reject(new Response(JSON.stringify({
                        error: `MQTT connection error: ${err.message}`,
                        broker_url: brokerUrl,
                        port: port,
                        error_code: err.code
                    }), {
                        status: 500,
                        headers: { 'Content-Type': 'application/json' }
                    }));
                });
            });

            client.on('close', () => {
                console.log('MQTT connection closed');
                // If the connection closed unexpectedly and we never connected successfully
                if (!hasConnected) {
                    clearTimeout(timeout);
                    reject(new Response(JSON.stringify({
                        error: 'Failed to connect to MQTT broker',
                        broker_url: brokerUrl,
                        port: port
                    }), {
                        status: 500,
                        headers: { 'Content-Type': 'application/json' }
                    }));
                }
                // If it closed after connection, it's either due to timeout or successful processing.
                // The resolve/reject will be handled by timeout or by explicit resolve if done before timeout.
                // No need to call resolve/reject here if it's a normal close after connect.
            });
        });

    } catch (error) {
        console.error('MQTT Update function error:', error);
        return new Response(JSON.stringify({
            error: `Function error: ${error.message}`
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
});
