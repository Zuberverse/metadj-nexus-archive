#!/usr/bin/env node

/**
 * MetaDJ Nexus - Music Metadata Validator
 * Validates music.json for data integrity
 */
const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
};

const log = {
  error: (msg) => console.log(`${colors.red}✗ ${msg}${colors.reset}`),
  success: (msg) => console.log(`${colors.green}✓ ${msg}${colors.reset}`),
  warn: (msg) => console.log(`${colors.yellow}⚠ ${msg}${colors.reset}`),
  info: (msg) => console.log(`  ${msg}`),
};

// Load tracks data
const tracksPath = path.join(__dirname, '../src/data/music.json');
const collectionsPath = path.join(__dirname, '../src/data/collections.json');

if (!fs.existsSync(tracksPath)) {
  log.error('music.json not found');
  process.exit(1);
}

if (!fs.existsSync(collectionsPath)) {
  log.error('collections.json not found');
  process.exit(1);
}

let tracks;
let collections;
try {
  tracks = JSON.parse(fs.readFileSync(tracksPath, 'utf-8'));
} catch (error) {
  log.error(`Failed to parse music.json: ${error.message}`);
  process.exit(1);
}

try {
  collections = JSON.parse(fs.readFileSync(collectionsPath, 'utf-8'));
} catch (error) {
  log.error(`Failed to parse collections.json: ${error.message}`);
  process.exit(1);
}

console.log('MetaDJ Nexus - Track Validator\n');

let errors = 0;
let warnings = 0;

// Validation 0: Unique track IDs
log.info('Checking for duplicate track IDs...');
const seenTrackIds = new Set();
tracks.forEach((track) => {
  if (!track.id) return;
  if (seenTrackIds.has(track.id)) {
    log.error(`${track.id}: Duplicate track id`);
    errors++;
  } else {
    seenTrackIds.add(track.id);
  }
});

// Validation 1: Exactly 2 genre tags
log.info('Checking genre tags...');
tracks.forEach((track) => {
  if (!track.genres || track.genres.length !== 2) {
    log.error(`${track.id}: Must have exactly 2 genre tags (has ${track.genres?.length || 0})`);
    errors++;
  }
});

// Validation 2: Complete metadata
log.info('Checking required fields...');
const requiredFields = ['id', 'title', 'artist', 'collection', 'duration', 'audioUrl'];
tracks.forEach((track) => {
  requiredFields.forEach((field) => {
    if (!track[field]) {
      log.error(`${track.id}: Missing required field "${field}"`);
      errors++;
    }
  });
});

// Validation 3: Audio URLs use /api/audio/ format
log.info('Checking audio URLs...');
tracks.forEach((track) => {
  if (track.audioUrl && !track.audioUrl.startsWith('/api/audio/')) {
    log.error(`${track.id}: Audio URL should use /api/audio/ format`);
    errors++;
  }
});

// Validation 3b: Track collections exist
log.info('Checking collection references...');
const collectionTitles = new Set(collections.map((c) => c.title));
tracks.forEach((track) => {
  if (track.collection && !collectionTitles.has(track.collection)) {
    log.error(`${track.id}: References unknown collection "${track.collection}"`);
    errors++;
  }
});

// Validation 4: Collection track counts
log.info('Checking collection track counts...');
collections.forEach((collection) => {
  const collectionTracks = tracks.filter((t) => t.collection === collection.title);
  if (collectionTracks.length !== collection.trackCount) {
    log.error(
      `${collection.title}: Track count mismatch (expected ${collection.trackCount}, found ${collectionTracks.length})`
    );
    errors++;
  }
});

// Validation 5: No "Cinematic" as genre tag
log.info('Checking for retired "Cinematic" tag...');
tracks.forEach((track) => {
  if (track.genres && track.genres.includes('Cinematic')) {
    log.warn(`${track.id}: Uses retired "Cinematic" tag`);
    warnings++;
  }
});

// Summary
console.log('');
if (errors === 0 && warnings === 0) {
  log.success('All validations passed!');
  log.info(`Total tracks: ${tracks.length}`);
  log.info(`Collections: ${collections.length}`);
} else {
  if (errors > 0) {
    log.error(`${errors} error(s) found`);
  }
  if (warnings > 0) {
    log.warn(`${warnings} warning(s) found`);
  }
  process.exit(errors > 0 ? 1 : 0);
}
