const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const config = require('../config');

// Local IPFS simulation service
// Generates CID-like identifiers and stores files locally
// Can be replaced with Pinata/Infura IPFS integration

class IPFSService {
  constructor() {
    this.storagePath = config.ipfsStoragePath;
    this._ensureStorageDir();
  }

  _ensureStorageDir() {
    if (!fs.existsSync(this.storagePath)) {
      fs.mkdirSync(this.storagePath, { recursive: true });
    }
  }

  // Generate a CID-like identifier from file content
  generateCID(buffer) {
    const hash = crypto.createHash('sha256').update(buffer).digest('hex');
    // Simulate IPFS CIDv1 format: Qm + base58-like encoding
    return 'Qm' + Buffer.from(hash, 'hex').toString('base64url').slice(0, 44);
  }

  // Upload file to local IPFS storage
  async upload(fileBuffer, fileName) {
    const cid = this.generateCID(fileBuffer);
    const filePath = path.join(this.storagePath, cid);
    
    // Store the file
    fs.writeFileSync(filePath, fileBuffer);
    
    // Store metadata alongside
    const metaPath = path.join(this.storagePath, `${cid}.meta.json`);
    fs.writeFileSync(metaPath, JSON.stringify({
      fileName,
      size: fileBuffer.length,
      uploadedAt: new Date().toISOString(),
      cid
    }, null, 2));

    return {
      cid,
      size: fileBuffer.length,
      path: filePath
    };
  }

  // Retrieve file from local IPFS storage
  async retrieve(cid) {
    const filePath = path.join(this.storagePath, cid);
    const metaPath = path.join(this.storagePath, `${cid}.meta.json`);

    if (!fs.existsSync(filePath)) {
      return null;
    }

    const fileBuffer = fs.readFileSync(filePath);
    let metadata = {};
    if (fs.existsSync(metaPath)) {
      metadata = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
    }

    return {
      buffer: fileBuffer,
      metadata
    };
  }

  // Check if a CID exists in storage
  async exists(cid) {
    const filePath = path.join(this.storagePath, cid);
    return fs.existsSync(filePath);
  }

  // Get gateway URL for a CID (simulated)
  getGatewayUrl(cid) {
    return `https://ipfs.io/ipfs/${cid}`;
  }
}

module.exports = new IPFSService();
