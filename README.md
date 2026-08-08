# 🔐 Blockchain Document Verification Platform

A decentralized, tamper-proof document authentication and verification platform leveraging Ethereum smart contracts, IPFS storage, and an automated AI heuristic analysis engine to detect fraudulent or suspicious document submissions before on-chain registration.

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│  Frontend   │────▶│   Backend    │────▶│   Ethereum      │
│  (Browser)  │◀────│  (Express)   │◀────│   Blockchain    │
└─────────────┘     │              │     └─────────────────┘
                    │  ┌────────┐  │     ┌─────────────────┐
                    │  │   AI   │  │────▶│   IPFS Storage  │
                    │  │Analyzer│  │     └─────────────────┘
                    │  └────────┘  │
                    └──────────────┘
```

## Features

- ✔ **Immutable Document Hashing**: SHA-256 cryptographic hashes generated on backend and pinned on-chain.
- ✔ **Ethereum Smart Contract Registry**: Decentralized document ownership and verification history stored via `FileRegistry.sol`.
- ✔ **IPFS Integration**: Decentralized file storage for off-chain content storage and retrieval.
- ✔ **AI Document Analysis**: Automated heuristic analysis engine scanning text content, structure, metadata, and suspicious patterns prior to registration.
- ✔ **Instant Verification**: Fast lookup interface enabling users to check document authenticity, registered metadata, and integrity status.
- ✔ **RESTful API backend**: Robust Express middleware managing blockchain client connections, IPFS pinning, and AI evaluation.

## Tech Stack

| Component | Technology | Description |
| --- | --- | --- |
| Smart Contracts | Solidity, Hardhat, Ethers.js | Ethereum-based contract compilation, testing, and interaction |
| Backend | Node.js, Express, Multer | REST API handling document upload, hash computation, and smart contract orchestration |
| AI Analysis | pdf-parse, Custom Heuristic Engine | Extract text & structure to perform heuristic anomaly detection |
| Storage | IPFS / Pinata | Decentralized file storage for verified documents |
| Frontend | HTML5, CSS3, JavaScript | Web interface for submitting documents and verifying authenticity |

## Prerequisites

- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher
- **MetaMask**: Optional (for web-based wallet interactions)

## Quick Start

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/blockchain-file-auth.git
   cd blockchain-file-auth
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment variables:**
   ```bash
   cp .env.example .env
   ```

4. **Start local Hardhat network (Terminal 1):**
   ```bash
   npx hardhat node
   ```

5. **Deploy smart contracts (Terminal 2):**
   ```bash
   npm run deploy
   ```

6. **Start backend server (Terminal 2):**
   ```bash
   npm start
   ```

7. **Access Frontend:**
   Open `frontend/index.html` directly in your browser.

## API Endpoints

| Method | Path | Description |
| --- | --- | --- |
| `POST` | `/api/upload` | Uploads a document, performs AI analysis, pins to IPFS, and registers hash on blockchain |
| `GET` | `/api/verify/:hash` | Queries blockchain registry for document verification status and metadata |
| `GET` | `/api/health` | Returns server, RPC connection, and smart contract connection status |

## Smart Contract (`FileRegistry.sol`)

The `FileRegistry.sol` contract serves as the single source of truth for registered documents on the Ethereum network. Key capabilities include:
- **Registration**: Records cryptographic document hash (`bytes32`), IPFS CID, title/description, timestamp, and registrant address.
- **Verification**: Allows public querying of document metadata using the unique SHA-256 hash.
- **Duplicate Protection**: Prevents duplicate registration of existing file hashes.

## AI Analysis Module

The AI analysis module (`backend/aiAnalyzer.js`) performs heuristic analysis on uploaded documents (such as PDF files) prior to blockchain registration:
- **Text & Structure Parsing**: Uses `pdf-parse` to analyze raw text content, metadata, page counts, and formatting signatures.
- **Heuristic Anomaly Detection**: Checks for key indicators of fraud, suspicious pattern repetition, structural corruption, missing metadata, or suspicious keyword flags.
- **Confidence & Safety Scoring**: Assigns an integrity/authenticity score to warn administrators or halt automated registration if suspicious patterns are identified.

## Project Structure

```
blockchain-file-auth/
├── backend/
│   ├── aiAnalyzer.js
│   ├── ipfs.js
│   ├── server.js
│   └── web3.js
├── contracts/
│   └── FileRegistry.sol
├── frontend/
│   ├── app.js
│   ├── index.html
│   └── style.css
├── scripts/
│   └── deploy.js
├── test/
│   └── FileRegistry.test.js
├── .env.example
├── hardhat.config.js
├── package.json
└── README.md
```

## License

[MIT](LICENSE)
