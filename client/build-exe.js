const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const CACHE_DIR = path.join(os.homedir(), 'AppData', 'Local', 'electron-builder', 'Cache', 'winCodeSign');
const SEVEN_ZIP = path.join(__dirname, '..', 'node_modules', '7zip-bin', 'win', 'x64', '7za.exe');
const TEMP_DIR = path.join(os.tmpdir(), 'adxpower-build');

console.log('=== AdxPower EXE Builder ===');
console.log('Step 1: Cleaning old cache...');
if (fs.existsSync(CACHE_DIR)) {
  fs.rmSync(CACHE_DIR, { recursive: true, force: true });
}
if (fs.existsSync(TEMP_DIR)) {
  fs.rmSync(TEMP_DIR, { recursive: true, force: true });
}
fs.mkdirSync(TEMP_DIR, { recursive: true });

console.log('Step 2: Building Electron JS...');
execSync('npx tsc -p tsconfig.electron.json', { cwd: __dirname, stdio: 'inherit' });

console.log('Step 3: Building Vite frontend...');
execSync('npx vite build', { cwd: __dirname, stdio: 'inherit' });

console.log('Step 4: Running electron-builder (first pass to download winCodeSign)...');
try {
  execSync('npx electron-builder --win --dir', { cwd: __dirname, stdio: 'inherit', env: { ...process.env, CSC_IDENTITY_AUTO_DISCOVERY: 'false' } });
  console.log('BUILD SUCCESS!');
} catch (e) {
  console.log('First pass failed (expected), fixing winCodeSign cache...');
}

console.log('Step 5: Fixing winCodeSign cache (extracting without darwin symlinks)...');
if (fs.existsSync(CACHE_DIR)) {
  const entries = fs.readdirSync(CACHE_DIR);
  const sevFile = entries.find(f => f.endsWith('.7z'));
  if (sevFile) {
    const hashName = sevFile.replace('.7z', '');
    const archivePath = path.join(CACHE_DIR, sevFile);
    const extractDir = path.join(CACHE_DIR, hashName);
    const tempExtract = path.join(TEMP_DIR, hashName);

    fs.mkdirSync(tempExtract, { recursive: true });
    
    console.log(`  Extracting ${sevFile} (excluding darwin)...`);
    try {
      execSync(`"${SEVEN_ZIP}" x -bd -y -xr!darwin "${archivePath}" -o"${tempExtract}"`, { stdio: 'inherit' });
    } catch (e) {
      console.log('  Extraction with -xr!darwin failed, trying with move method...');
      try {
        execSync(`"${SEVEN_ZIP}" x -bd -y "${archivePath}" -o"${tempExtract}"`, { stdio: 'inherit' });
      } catch (e2) {
        console.log('  7z extraction had errors (darwin symlinks), removing failed dir...');
      }
    }

    // Remove darwin directory if it exists
    const darwinDir = path.join(tempExtract, 'darwin');
    if (fs.existsSync(darwinDir)) {
      fs.rmSync(darwinDir, { recursive: true, force: true });
    }

    // Copy to cache
    if (fs.existsSync(extractDir)) {
      fs.rmSync(extractDir, { recursive: true, force: true });
    }
    fs.cpSync(tempExtract, extractDir, { recursive: true });
    console.log('  Cache fixed!');
  } else {
    console.log('  No .7z file found in cache');
  }
}

console.log('Step 6: Final build with fixed cache...');
try {
  execSync('npx electron-builder --win --dir', { cwd: __dirname, stdio: 'inherit', env: { ...process.env, CSC_IDENTITY_AUTO_DISCOVERY: 'false' } });
  
  const releaseDir = path.join(__dirname, 'release', 'win-unpacked');
  if (fs.existsSync(releaseDir)) {
    console.log('\n=== BUILD SUCCESSFUL! ===');
    console.log(`Output: ${releaseDir}`);
    console.log(`Run: ${path.join(releaseDir, 'AdxPower.exe')}`);
  }
} catch (e) {
  console.error('BUILD FAILED:', e.message);
  process.exit(1);
}

// Cleanup
fs.rmSync(TEMP_DIR, { recursive: true, force: true });
