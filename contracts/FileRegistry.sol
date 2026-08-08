// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract FileRegistry {

    struct FileData {
        address uploader;
        uint256 timestamp;
        bool exists;
        string ipfsCid;       // IPFS Content Identifier
        string documentType;  // MIME type (e.g., "application/pdf")
        string fileName;      // Original filename
        uint8 aiRiskScore;    // AI analysis risk score (0-100)
        bool isRevoked;       // Whether the document has been revoked
    }

    mapping(string => FileData) private files;
    mapping(address => string[]) private uploaderFiles;
    
    uint256 public totalDocuments;

    event FileRegistered(string fileHash, address uploader, uint256 timestamp, string ipfsCid, string documentType, uint8 aiRiskScore);
    event FileRevoked(string fileHash, address uploader, uint256 timestamp);

    function registerFile(
        string memory fileHash,
        string memory ipfsCid,
        string memory documentType,
        string memory fileName,
        uint8 aiRiskScore
    ) public {
        require(!files[fileHash].exists, "File already registered");
        require(aiRiskScore <= 100, "Risk score must be 0-100");

        files[fileHash] = FileData({
            uploader: msg.sender,
            timestamp: block.timestamp,
            exists: true,
            ipfsCid: ipfsCid,
            documentType: documentType,
            fileName: fileName,
            aiRiskScore: aiRiskScore,
            isRevoked: false
        });

        uploaderFiles[msg.sender].push(fileHash);
        totalDocuments++;

        emit FileRegistered(fileHash, msg.sender, block.timestamp, ipfsCid, documentType, aiRiskScore);
    }

    function verifyFile(string memory fileHash)
        public
        view
        returns(address uploader, uint256 timestamp, bool exists, bool isRevoked)
    {
        FileData memory file = files[fileHash];
        return (file.uploader, file.timestamp, file.exists, file.isRevoked);
    }

    function getFileDetails(string memory fileHash)
        public
        view
        returns(FileData memory)
    {
        require(files[fileHash].exists, "File not found");
        return files[fileHash];
    }

    function revokeFile(string memory fileHash) public {
        require(files[fileHash].exists, "File not found");
        require(files[fileHash].uploader == msg.sender, "Only uploader can revoke");
        require(!files[fileHash].isRevoked, "File already revoked");

        files[fileHash].isRevoked = true;
        emit FileRevoked(fileHash, msg.sender, block.timestamp);
    }

    function getFilesByUploader(address uploader)
        public
        view
        returns(string[] memory)
    {
        return uploaderFiles[uploader];
    }
}