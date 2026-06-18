const { withAndroidManifest } = require('expo/config-plugins');

/**
 * Marks common hardware features as optional so Play Console does not exclude
 * devices without GPS, camera, telephony, etc.
 * Must be listed last in app.json "plugins" so it runs after other plugins.
 */
const OPTIONAL_HARDWARE = [
  'android.hardware.camera',
  'android.hardware.camera.autofocus',
  'android.hardware.camera.front',
  'android.hardware.location',
  'android.hardware.location.gps',
  'android.hardware.location.network',
  'android.hardware.microphone',
  'android.hardware.telephony',
  'android.hardware.wifi',
  'android.hardware.bluetooth',
  'android.hardware.sensor.accelerometer',
  'android.hardware.touchscreen',
];

function getFeatures(manifest) {
  const existing = manifest.manifest['uses-feature'];
  if (!existing) return [];
  return Array.isArray(existing) ? existing : [existing];
}

function markOptional(features, name) {
  const index = features.findIndex((f) => f.$?.['android:name'] === name);
  if (index >= 0) {
    features[index].$['android:required'] = 'false';
    return;
  }
  features.push({ $: { 'android:name': name, 'android:required': 'false' } });
}

function withOptionalAndroidHardware(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults;
    const features = getFeatures(manifest);
    for (const name of OPTIONAL_HARDWARE) {
      markOptional(features, name);
    }
    manifest.manifest['uses-feature'] = features;
    config.modResults = manifest;
    return config;
  });
}

module.exports = withOptionalAndroidHardware;
