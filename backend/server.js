const cors = require('cors');
const express = require('express');
const multer = require('multer');
const crypto = require('crypto');
const path = require('path');
const { ethers } = require('ethers');
const config = require('./config');
const ipfsService = require('./services/ipfsService');
const aiAnalyzer = require('./services/aiAnalyzer');

const app = express();
const upload = multer({
  limits: { fileSize: config.maxFileSize }
});

app.use(cors());
app.use(express.json());

/* ===============================
   Blockchain Connection
================================= */

const provider = new ethers.JsonRpcProvider(config.provider);
const wallet = new ethers.Wallet(config.privateKey, provider);
const abi = require('../artifacts/contracts/FileRegistry.sol/FileRegistry.json').abi;
const contract = new ethers.Contract(config.contractAddress, abi, wallet);

console.log('Connected to blockchain at:', config.provider);
console.log('Contract address:', config.contractAddress);

/* ===============================
   Upload Route (Full Pipeline)
   File → AI Analysis → IPFS → Blockchain
================================= */
app.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const fileBuffer = req.file.buffer;
    const fileName = req.file.originalname;
    const mimeType = req.file.mimetype;

    // Step 1: Generate SHA-256 hash
    const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

    // Step 2: AI Analysis
    const analysis = await aiAnalyzer.analyze(fileBuffer, fileName, mimeType);

    // Step 3: Upload to IPFS
    const ipfsResult = await ipfsService.upload(fileBuffer, fileName);

    // Step 4: Register on blockchain
    const tx = await contract.registerFile(
      hash,
      ipfsResult.cid,
      mimeType,
      fileName,
      analysis.riskScore
    );
    const receipt = await tx.wait();

    res.json({
      success: true,
      message: 'Document registered successfully',
      data: {
        hash,
        ipfsCid: ipfsResult.cid,
        ipfsUrl: ipfsService.getGatewayUrl(ipfsResult.cid),
        fileName,
        mimeType,
        fileSize: fileBuffer.length,
        blockNumber: Number(receipt.blockNumber),
        transactionHash: receipt.hash,
        aiAnalysis: analysis
      }
    });

  } catch (error) {
    console.error('Upload error:', error);
    if (error.reason) {
      res.status(400).json({ error: error.reason });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

/* ===============================
   Verify Route
================================= */
app.post('/verify', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const fileBuffer = req.file.buffer;
    const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

    // Query blockchain
    const [uploader, timestamp, exists, isRevoked] = await contract.verifyFile(hash);

    if (!exists) {
      return res.json({
        success: true,
        verified: false,
        hash,
        message: 'Document NOT FOUND on blockchain'
      });
    }

    // Get full details
    const details = await contract.getFileDetails(hash);

    res.json({
      success: true,
      verified: true,
      hash,
      message: isRevoked ? 'Document found but has been REVOKED' : 'Document is VERIFIED on blockchain',
      data: {
        uploader: details.uploader,
        timestamp: Number(details.timestamp),
        registeredAt: new Date(Number(details.timestamp) * 1000).toISOString(),
        ipfsCid: details.ipfsCid,
        ipfsUrl: ipfsService.getGatewayUrl(details.ipfsCid),
        documentType: details.documentType,
        fileName: details.fileName,
        aiRiskScore: Number(details.aiRiskScore),
        isRevoked: details.isRevoked
      }
    });

  } catch (error) {
    console.error('Verify error:', error);
    res.status(500).json({ error: error.message });
  }
});

/* ===============================
   Standalone AI Analysis Route
================================= */
app.post('/analyze', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const analysis = await aiAnalyzer.analyze(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype
    );

    res.json({
      success: true,
      analysis
    });

  } catch (error) {
    console.error('Analysis error:', error);
    res.status(500).json({ error: error.message });
  }
});

/* ===============================
   Get Documents by Address
================================= */
app.get('/documents/:address', async (req, res) => {
  try {
    const { address } = req.params;
    if (!ethers.isAddress(address)) {
      return res.status(400).json({ error: 'Invalid Ethereum address' });
    }

    const fileHashes = await contract.getFilesByUploader(address);
    const documents = [];

    for (const hash of fileHashes) {
      const details = await contract.getFileDetails(hash);
      documents.push({
        hash,
        uploader: details.uploader,
        timestamp: Number(details.timestamp),
        registeredAt: new Date(Number(details.timestamp) * 1000).toISOString(),
        ipfsCid: details.ipfsCid,
        documentType: details.documentType,
        fileName: details.fileName,
        aiRiskScore: Number(details.aiRiskScore),
        isRevoked: details.isRevoked
      });
    }

    res.json({ success: true, address, count: documents.length, documents });

  } catch (error) {
    console.error('Documents error:', error);
    res.status(500).json({ error: error.message });
  }
});

/* ===============================
   Get Single Document Details
================================= */
app.get('/document/:hash', async (req, res) => {
  try {
    const { hash } = req.params;
    const [uploader, timestamp, exists, isRevoked] = await contract.verifyFile(hash);

    if (!exists) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const details = await contract.getFileDetails(hash);

    res.json({
      success: true,
      document: {
        hash,
        uploader: details.uploader,
        timestamp: Number(details.timestamp),
        registeredAt: new Date(Number(details.timestamp) * 1000).toISOString(),
        ipfsCid: details.ipfsCid,
        ipfsUrl: ipfsService.getGatewayUrl(details.ipfsCid),
        documentType: details.documentType,
        fileName: details.fileName,
        aiRiskScore: Number(details.aiRiskScore),
        isRevoked: details.isRevoked
      }
    });

  } catch (error) {
    console.error('Document error:', error);
    res.status(500).json({ error: error.message });
  }
});

/* ===============================
   Platform Statistics
================================= */
app.get('/stats', async (req, res) => {
  try {
    const totalDocuments = await contract.totalDocuments();

    res.json({
      success: true,
      stats: {
        totalDocuments: Number(totalDocuments),
        contractAddress: config.contractAddress,
        network: config.provider
      }
    });

  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ error: error.message });
  }
});

/* ===============================
   Revoke Document
================================= */
app.post('/revoke/:hash', async (req, res) => {
  try {
    const { hash } = req.params;
    const tx = await contract.revokeFile(hash);
    const receipt = await tx.wait();

    res.json({
      success: true,
      message: 'Document revoked successfully',
      transactionHash: receipt.hash,
      blockNumber: Number(receipt.blockNumber)
    });

  } catch (error) {
    console.error('Revoke error:', error);
    if (error.reason) {
      res.status(400).json({ error: error.reason });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

/* ===============================
   Health Check
================================= */
app.get('/health', async (req, res) => {
  try {
    const blockNumber = await provider.getBlockNumber();
    res.json({
      status: 'healthy',
      blockNumber,
      contractAddress: config.contractAddress
    });
  } catch (error) {
    res.status(503).json({ status: 'unhealthy', error: error.message });
  }
});

/* ===============================
   Start Server
================================= */
app.listen(config.port, () => {
  console.log(`\n🚀 Document Verification API running on port ${config.port}`);
  console.log(`📋 Endpoints:`);
  console.log(`   POST /upload    - Upload & register document`);
  console.log(`   POST /verify    - Verify document authenticity`);
  console.log(`   POST /analyze   - AI analysis only`);
  console.log(`   GET  /documents/:address - Get user documents`);
  console.log(`   GET  /document/:hash     - Get document details`);
  console.log(`   GET  /stats     - Platform statistics`);
  console.log(`   POST /revoke/:hash       - Revoke document`);
  console.log(`   GET  /health    - Health check\n`);
});