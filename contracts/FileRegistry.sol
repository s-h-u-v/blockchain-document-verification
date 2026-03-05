// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract FileRegistry {

    struct FileData {
        address uploader;
        uint256 timestamp;
        bool exists;
    }

    mapping(string => FileData) private files;

    function registerFile(string memory fileHash) public {
        require(!files[fileHash].exists, "File already registered");

        files[fileHash] = FileData({
            uploader: msg.sender,
            timestamp: block.timestamp,
            exists: true
        });
    }

    function verifyFile(string memory fileHash) public view returns (
        address uploader,
        uint256 timestamp,
        bool exists
    ) {
        FileData memory file = files[fileHash];
        return (file.uploader, file.timestamp, file.exists);
    }
}