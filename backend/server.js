const express = require("express");
const multer = require("multer");
const crypto = require("crypto");
const { ethers } = require("ethers");
require("dotenv").config();

const app = express();
const upload = multer();

app.use(express.json());

const PORT = 3000;

/* ===============================
   Blockchain Connection
================================= */

const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");

const privateKey = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"; // Paste first account private key

const wallet = new ethers.Wallet(privateKey, provider);

const contractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3"; // Paste deployed address

const abi = require("../artifacts/contracts/FileRegistry.sol/FileRegistry.json").abi;

const contract = new ethers.Contract(contractAddress, abi, wallet);

/* ===============================
   Upload Route (Register File)
================================= */
app.post("/upload", upload.single("file"), async (req, res) => {

  try {

    const fileBuffer = req.file.buffer;

    const hash = crypto
      .createHash("sha256")
      .update(fileBuffer)
      .digest("hex");

    const tx = await contract.registerFile(hash);

    const receipt = await tx.wait();

    res.json({
      message: "File registered successfully",
      hash: hash,
      blockNumber: receipt.blockNumber
    });

  } catch (error) {

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

app.post("/verify", upload.single("file"), async (req, res) => {
  try {
    const fileBuffer = req.file.buffer;

    const hash = crypto
      .createHash("sha256")
      .update(fileBuffer)
      .digest("hex");

    const result = await contract.verifyFile(hash);

    res.json({
      hash: hash,
      uploader: result[0],
      timestamp: result[1].toString(),
      exists: result[2]
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/* ===============================
   Start Server
================================= */

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});