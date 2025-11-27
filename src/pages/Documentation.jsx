
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, BookOpen, KeyRound, Rss, Plus, Edit, BarChart3, MapPin, Calendar, Thermometer, Minus, RefreshCw, Lock, Droplet, RadioTower, QrCode, Archive, Camera } from 'lucide-react';
import { motion } from 'framer-motion';

export default function DocumentationPage() {
    const navigate = useNavigate();

    const Section = ({ title, icon, children }) => (
        <div className="mb-8">
            <h2 className="text-2xl font-semibold text-[--primary-text] flex items-center gap-3 mb-4">
                {icon}
                {title}
            </h2>
            <div className="space-y-4 text-[--secondary-text] leading-relaxed pl-10">
                {children}
            </div>
        </div>
    );

    const SubSection = ({ title, children }) => (
        <div className="p-4 bg-white/50 rounded-lg border border-[--border-color]">
            <h3 className="font-bold text-[--primary-text] mb-2">{title}</h3>
            {children}
        </div>
    );

    const YamlBlock = ({ children }) => (
        <pre className="bg-gray-100 p-3 my-2 rounded-md text-xs text-[--primary-text] font-mono overflow-x-auto">
            <code>
                {children}
            </code>
        </pre>
    );

    return (
        <div className="p-6 md:p-8 min-h-screen">
            <div className="max-w-4xl mx-auto">
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-4 mb-8"
                >
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => navigate(createPageUrl("Dashboard"))}
                        className="border-[--border-color] hover:bg-[--outline-hover-bg]"
                    >
                        <ArrowLeft className="w-4 h-4" />
                    </Button>
                    <div>
                        <h1 className="text-4xl font-bold text-[--primary-text]">App Documentation</h1>
                        <p className="text-[--secondary-text]">Complete guide to setting up and using your brewery inventory app.</p>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                >
                    <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl">
                        <CardHeader>
                            <CardTitle className="text-3xl text-[--primary-text] flex items-center gap-3">
                                <BookOpen className="w-8 h-8" />
                                User Guide
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Section title="Initial Setup" icon={<KeyRound className="w-6 h-6" />}>
                                <SubSection title="1. Set Your Security PIN">
                                    <p>Go to <Badge variant="outline">Settings</Badge>. Under "Security Settings", you can enable or disable PIN protection and set your 4-digit PIN. This protects sensitive actions like adding/editing beers or accessing settings.</p>
                                </SubSection>
                                <SubSection title="2. Create Storage Locations">
                                    <p>In <Badge variant="outline">Settings</Badge>, scroll to "Manage Storage Locations" to add places like "Main Fridge", "Garage", "Cellar". Each beer must be assigned to a location for proper organization.</p>
                                </SubSection>
                                <SubSection title="3. Connect to Brewfather (Optional)">
                                    <p>To import batches directly, go to <Badge variant="outline">Settings</Badge> and find the "Brewfather API Integration" section. Enter your Brewfather User ID and API Key. You can find these in your Brewfather account under Settings &gt; API.</p>
                                </SubSection>
                            </Section>

                            <Section title="Managing Your Beer Inventory" icon={<Plus className="w-6 h-6" />}>
                                <SubSection title="Adding a New Beer">
                                    <p>Click <Badge variant="outline">Add New Beer</Badge> from the main menu. Fill in the beer details like name, style, ABV, and storage location. You can choose between traditional container tracking (bottles, cans) or MQTT live tracking for advanced setups.</p>
                                    <p className="mt-2"><strong>QR Code Scanner:</strong> When adding a recipe link, click the <QrCode className="w-4 h-4 inline" /> button next to the link field to scan QR codes with your camera instead of typing URLs manually.</p>
                                </SubSection>
                                <SubSection title="Importing from Brewfather">
                                    <p>If you've configured Brewfather integration, use <Badge variant="outline">Import from Brewfather</Badge> to automatically import your recipes. The app will create beers with 0.5L cans by default, which you can edit later if needed. When importing a single batch, you'll be automatically redirected to its edit page.</p>
                                </SubSection>
                                <SubSection title="Recording Consumption">
                                    <p>Click <Badge variant="outline">Change Stock</Badge> on any beer card. Use <Minus className="w-4 h-4 inline" /> to remove stock (consumption) or <Plus className="w-4 h-4 inline" /> to add stock (restocking). Add tasting notes in the optional notes field.</p>
                                </SubSection>
                                <SubSection title="Editing Beer Details">
                                    <p>Click the pencil icon <Edit className="w-4 h-4 inline" /> on any beer card to edit its details, change the location, update quantities, or add recipe links. The QR scanner is also available here for quick link additions.</p>
                                </SubSection>
                                <SubSection title="Empty Batch Management">
                                    <p>When a beer's stock reaches zero, it's automatically archived to keep your main dashboard clean. Access archived beers via <Badge variant="outline">Empty Batches</Badge> in the main menu. You can still add stock to archived beers - they'll automatically return to the active inventory.</p>
                                </SubSection>
                            </Section>

                            <Section title="RFID Automation" icon={<RadioTower className="w-6 h-6" />}>
                                <SubSection title="RFID Hardware Setup">
                                    <p>The app supports UHF RFID readers (like the FonKan FM-505) connected to a Raspberry Pi. This enables automatic stock tracking by detecting when tagged containers are removed from storage.</p>
                                </SubSection>
                                <SubSection title="Managing RFID Tags">
                                    <p>Use <Badge variant="outline">RFID Management</Badge> from the main menu to:</p>
                                    <ul className="list-disc list-inside mt-2 space-y-1">
                                        <li>Register tags to specific beer batches (single or bulk registration)</li>
                                        <li>Use Live Scan feature to automatically detect nearby RFID tags</li>
                                        <li>View tag status (in stock vs consumed) for each beer</li>
                                        <li>Delete tag registrations when needed</li>
                                    </ul>
                                </SubSection>
                                <SubSection title="Automatic Stock Updates">
                                    <p>Once RFID tags are registered to a beer batch, the system automatically:</p>
                                    <ul className="list-disc list-inside mt-2 space-y-1">
                                        <li>Tracks individual containers via unique tag IDs</li>
                                        <li>Updates stock counts when containers are consumed</li>
                                        <li>Creates consumption log entries automatically</li>
                                        <li>Shows "RFID Tracked" badges on beer cards</li>
                                    </ul>
                                </SubSection>
                            </Section>
                            
                            <Section title="Live Data & Sensors" icon={<Rss className="w-6 h-6" />}>
                                <p>Pull real-time data from your smart home devices. The dashboard displays this information in the top-right sensor card.</p>
                                <SubSection title="1. Home Assistant Integration">
                                    <p>Pull sensor data directly from Home Assistant. Go to <Badge variant="outline">Settings</Badge>, provide your Home Assistant URL (e.g., `http://homeassistant.local:8123`) and a Long-Lived Access Token.</p>
                                    <p>After connecting, enable the specific sensors you want to track:</p>
                                    <ul className="list-disc list-inside mt-2 space-y-1">
                                        <li><Thermometer className="w-4 h-4 inline" /> <strong>Temperature:</strong> Monitor fridge temperature (entity ID like `sensor.fridge_temperature`)</li>
                                        <li><Lock className="w-4 h-4 inline" /> <strong>Door Sensor:</strong> Track door open/closed status (binary sensor)</li>
                                        <li><Droplet className="w-4 h-4 inline" /> <strong>Leak Sensor:</strong> Monitor for water leaks (binary sensor)</li>
                                    </ul>
                                </SubSection>
                                <SubSection title="2. MQTT Broker Integration">
                                    <p>Alternatively, for devices like an iSpindel or custom sensors, configure your MQTT broker in <Badge variant="outline">Settings</Badge>. The app can subscribe to topics for Temperature, Door Status, and Leak Detection.</p>
                                    <p><strong>MQTT Beer Tracking:</strong> Individual beers can be configured for live volume tracking via MQTT (useful for keg monitoring with smart scales).</p>
                                </SubSection>
                                <SubSection title="3. Temperature Alerts">
                                    <p>Enable email alerts when your fridge temperature exceeds a threshold. Configure the alert email and temperature limit in <Badge variant="outline">Settings</Badge>.</p>
                                </SubSection>
                            </Section>

                            <Section title="Automating Data Updates" icon={<RefreshCw className="w-6 h-6" />}>
                                <p>To get regular updates, you must trigger the app's data-fetching functions automatically. Without this, sensor data will not update.</p>
                                <SubSection title="For Home Assistant (Recommended)">
                                    <p>Add the following to your Home Assistant `configuration.yaml` to create a command:</p>
                                    <YamlBlock>
                                        {`rest_command:
  update_brewery_data:
    url: "YOUR_APP_URL/functions/updateHomeAssistantData"
    method: POST`}
                                    </YamlBlock>
                                    <p>Then, create an automation in your `automations.yaml` to run this command every 5 minutes:</p>
                                    <YamlBlock>
                                        {`- alias: "Update Brewery Inventory Data"
  trigger:
    - platform: time_pattern
      minutes: "/5"
  action:
    - service: rest_command.update_brewery_data`}
                                    </YamlBlock>
                                    <p>Replace `YOUR_APP_URL` with your actual app URL (e.g., `https://xyz.base44.app`).</p>
                                </SubSection>
                                <SubSection title="For MQTT">
                                    <p>The `updateMqttData` function must be called regularly. Use a free service like cron-job.org to send a POST request to the function's URL every 10-15 minutes. You can find the URL in your app under `Code &gt; Functions &gt; updateMqttData`.</p>
                                </SubSection>
                                <SubSection title="For RFID Automation">
                                    <p>Set up your Raspberry Pi to automatically call the `rfidEventHandler` function when tags are detected. The function URL is available in your app's Functions section.</p>
                                </SubSection>
                            </Section>

                            <Section title="Charts and Analytics" icon={<BarChart3 className="w-6 h-6" />}>
                                <SubSection title="Viewing Historical Data">
                                    <p>Click the chart icons on the stats cards to see trends over time:</p>
                                    <ul className="list-disc list-inside mt-2 space-y-1">
                                        <li><strong>Liters Chart:</strong> Track your total inventory volume over time</li>
                                        <li><strong>Batches Chart:</strong> Monitor how many beer batches you have available</li>
                                        <li><strong>Consumption Chart:</strong> Daily consumption patterns and trends</li>
                                        <li><strong>Temperature Chart:</strong> Historical temperature data (click sensor card)</li>
                                    </ul>
                                </SubSection>
                                <SubSection title="Creating Data Snapshots">
                                    <p>Charts need historical data to function. Go to <Badge variant="outline">Settings</Badge> and click <Badge variant="outline">Create Current Snapshot</Badge> to enable chart functionality. Ideally, do this daily to build up meaningful trend data.</p>
                                    <p><strong>Automatic Snapshots:</strong> Set up a daily automation (similar to sensor updates) to call the `createInventorySnapshot` function for continuous historical tracking.</p>
                                </SubSection>
                            </Section>

                            <Section title="Advanced Features" icon={<Calendar className="w-6 h-6" />}>
                                <SubSection title="Public Menu">
                                    <p>Enable a public, read-only page showing your current beer selection. Perfect for sharing what's available with friends or family. Configure in <Badge variant="outline">Settings</Badge> under "Public Menu Settings".</p>
                                </SubSection>
                                <SubSection title="Activity Logging">
                                    <p>View detailed consumption history via <Badge variant="outline">View Activity Log</Badge>. Shows what was consumed when, with any tasting notes you added.</p>
                                </SubSection>
                                <SubSection title="Camera Integration">
                                    <p>The QR code scanner supports switching between front and back cameras using the <Camera className="w-4 h-4 inline" /> button. Back cameras typically work better for QR scanning due to better focus capabilities.</p>
                                </SubSection>
                                <SubSection title="Data Management">
                                    <p>In <Badge variant="outline">Settings</Badge>, you can:</p>
                                    <ul className="list-disc list-inside mt-2 space-y-1">
                                        <li>Create inventory snapshots for historical data</li>
                                        <li>Load example data for testing</li>
                                        <li>Erase all data for a fresh start</li>
                                        <li>Test all your integrations (MQTT, Home Assistant, Brewfather)</li>
                                    </ul>
                                </SubSection>
                            </Section>

                            <Section title="Storage Locations & Organization" icon={<MapPin className="w-6 h-6" />}>
                                <SubSection title="Managing Locations">
                                    <p>In <Badge variant="outline">Settings</Badge>, scroll to "Manage Storage Locations" to add places like "Main Fridge", "Garage", "Cellar". Each beer must be assigned to a location for proper organization.</p>
                                </SubSection>
                                <SubSection title="Filtering by Location">
                                    <p>Use the main menu's "Filter by Location" to view only beers in specific places, making it easier to manage large inventories across multiple storage areas.</p>
                                </SubSection>
                                <SubSection title="Grid Layout Options">
                                    <p>Choose between Compact, Standard, Comfortable, or List view for your beer cards in <Badge variant="outline">Settings</Badge> to match your preference and screen size.</p>
                                </SubSection>
                            </Section>

                            <Section title="Troubleshooting" icon={<Calendar className="w-6 h-6" />}>
                                <SubSection title="Charts Showing 'No Data'">
                                    <p>Create an inventory snapshot in Settings. Charts need at least one data point to display anything meaningful.</p>
                                </SubSection>
                                <SubSection title="QR Scanner Not Working">
                                    <p>The QR scanner requires a modern browser (Chrome recommended) and camera permissions. Try switching between front and back cameras if scanning is difficult. Ensure good lighting and hold the QR code steady.</p>
                                </SubSection>
                                <SubSection title="RFID Tags Not Detected">
                                    <p>Ensure your RFID reader is properly connected to the Raspberry Pi and the webhook URL is correctly configured. Check the Pi's system logs for connection errors.</p>
                                </SubSection>
                                <SubSection title="Home Assistant Not Working">
                                    <p>Verify the URL (including http/https) and ensure your Long-Lived Access Token is correct. Use the "Test Connection" button in Settings for detailed feedback. Check Home Assistant logs for errors related to the `rest_command`.</p>
                                </SubSection>
                                <SubSection title="MQTT Not Working">
                                    <p>Check your broker URL format (e.g., mqtt:// or mqtts://), verify username/password, and ensure your sensor is publishing to the correct topic. Use the connection test first.</p>
                                </SubSection>
                                <SubSection title="Brewfather Import Issues">
                                    <p>Double-check your User ID and API Key in Settings. The error message will indicate if it's a credentials issue or API connection problem.</p>
                                </SubSection>
                                <SubSection title="Empty Batches Not Moving to Archive">
                                    <p>Archives are created automatically when stock reaches zero through the Change Stock dialog. Manual quantity edits in the Edit Beer page don't trigger automatic archiving.</p>
                                </SubSection>
                            </Section>

                            <div className="mt-8 p-6 bg-[--outline-hover-bg] rounded-lg border border-[--border-color]">
                                <h2 className="text-xl font-bold text-[--primary-text] mb-3">Quick Start Checklist</h2>
                                <ul className="space-y-2 text-[--secondary-text]">
                                    <li>• Set up PIN protection in Settings</li>
                                    <li>• Add at least one storage location (like "Main Fridge")</li>
                                    <li>• Add your first beer manually or via Brewfather import</li>
                                    <li>• Connect to Home Assistant or MQTT in Settings for live sensor data</li>
                                    <li>• Set up automations to regularly update sensor data</li>
                                    <li>• Create an inventory snapshot to enable historical charts</li>
                                    <li>• Configure RFID setup for automatic stock tracking (advanced)</li>
                                    <li>• Enable public menu for sharing your beer list (optional)</li>
                                </ul>
                            </div>

                            <div className="mt-6 p-6 bg-blue-50 rounded-lg border border-blue-200">
                                <h2 className="text-xl font-bold text-blue-900 mb-3">Hardware Integration Summary</h2>
                                <div className="grid md:grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <h3 className="font-semibold text-blue-800 mb-2">RFID System:</h3>
                                        <ul className="space-y-1 text-blue-700">
                                            <li>• UHF RFID Reader (FonKan FM-505)</li>
                                            <li>• Raspberry Pi for processing</li>
                                            <li>• UHF sticker tags for containers</li>
                                            <li>• Automatic consumption tracking</li>
                                        </ul>
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-blue-800 mb-2">Sensors:</h3>
                                        <ul className="space-y-1 text-blue-700">
                                            <li>• Temperature monitoring</li>
                                            <li>• Door open/close detection</li>
                                            <li>• Leak sensors for safety</li>
                                            <li>• MQTT or Home Assistant integration</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>
            </div>
        </div>
    );
}
