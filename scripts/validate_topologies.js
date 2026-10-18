import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const topologiesDir = path.resolve(__dirname, '..', 'topologies');

console.log('🔍 NetForge Topology Schema Validator');
console.log(`Scanning: ${topologiesDir}\n`);

if (!fs.existsSync(topologiesDir)) {
  console.error(`❌ Topologies directory not found: ${topologiesDir}`);
  process.exit(1);
}

const files = fs.readdirSync(topologiesDir).filter(f => f.endsWith('.json'));

if (files.length === 0) {
  console.warn('⚠️ No topology JSON files found.');
  process.exit(0);
}

let allValid = true;

for (const file of files) {
  const filePath = path.join(topologiesDir, file);
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const topo = JSON.parse(raw);

    const errors = [];

    if (!topo.name || typeof topo.name !== 'string') {
      errors.push('Missing or invalid "name" string');
    }

    if (!topo.devices || typeof topo.devices !== 'object') {
      errors.push('Missing or invalid "devices" object');
    }

    if (!topo.links || typeof topo.links !== 'object') {
      errors.push('Missing or invalid "links" object');
    }

    const deviceIds = new Set(Object.keys(topo.devices || {}));

    // Validate devices
    for (const [devId, dev] of Object.entries(topo.devices || {})) {
      if (dev.id !== devId) {
        errors.push(`Device key mismatch: key "${devId}" != id "${dev.id}"`);
      }
      if (!['pc', 'laptop', 'switch', 'router', 'server', 'hub', 'firewall', 'attacker'].includes(dev.device_type)) {
        errors.push(`Device "${devId}" has unknown device_type: "${dev.device_type}"`);
      }
      if (typeof dev.x !== 'number' || typeof dev.y !== 'number') {
        errors.push(`Device "${devId}" missing numeric (x, y) coordinates`);
      }
      if (!dev.interfaces || typeof dev.interfaces !== 'object') {
        errors.push(`Device "${devId}" missing interfaces object`);
      }
    }

    // Validate links
    for (const [linkId, link] of Object.entries(topo.links || {})) {
      if (!deviceIds.has(link.device_a_id)) {
        errors.push(`Link "${linkId}" references non-existent device_a_id: "${link.device_a_id}"`);
      }
      if (!deviceIds.has(link.device_b_id)) {
        errors.push(`Link "${linkId}" references non-existent device_b_id: "${link.device_b_id}"`);
      }
    }

    if (errors.length > 0) {
      console.error(`❌ ${file}: FAILED with ${errors.length} error(s):`);
      errors.forEach(e => console.error(`   - ${e}`));
      allValid = false;
    } else {
      const devCount = Object.keys(topo.devices).length;
      const linkCount = Object.keys(topo.links).length;
      console.log(`✅ ${file}: Valid (${devCount} devices, ${linkCount} links) — "${topo.name}"`);
    }
  } catch (err) {
    console.error(`❌ ${file}: JSON Parse Error: ${err.message}`);
    allValid = false;
  }
}

if (!allValid) {
  console.error('\n❌ Topology validation failed.');
  process.exit(1);
} else {
  console.log('\n🎉 All topology schemas verified successfully!');
  process.exit(0);
}
