const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

module.exports = {
  port: process.env.PORT || 3000,
  provider: process.env.RPC_URL || 'http://127.0.0.1:8545',
  privateKey: process.env.PRIVATE_KEY || '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
  contractAddress: process.env.CONTRACT_ADDRESS || '0x5FbDB2315678afecb367f032d93F642f64180aa3',
  ipfsStoragePath: path.join(__dirname, 'ipfs-storage'),
  maxFileSize: 50 * 1024 * 1024, // 50MB
  supportedTypes: [
    'application/pdf',
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/gif',
    'image/webp',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain'
  ]
};
