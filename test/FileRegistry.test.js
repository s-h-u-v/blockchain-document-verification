const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("FileRegistry", function () {
  let fileRegistry;
  let owner;
  let addr1;
  let addr2;

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();
    const FileRegistry = await ethers.getContractFactory("FileRegistry");
    fileRegistry = await FileRegistry.deploy();
  });

  describe("Registration", function () {
    it("Should register a file with full metadata", async function () {
      await fileRegistry.registerFile(
        "abc123hash",
        "QmTestCid123",
        "application/pdf",
        "document.pdf",
        25
      );
      const details = await fileRegistry.getFileDetails("abc123hash");
      expect(details.uploader).to.equal(owner.address);
      expect(details.ipfsCid).to.equal("QmTestCid123");
      expect(details.documentType).to.equal("application/pdf");
      expect(details.fileName).to.equal("document.pdf");
      expect(details.aiRiskScore).to.equal(25);
      expect(details.isRevoked).to.be.false;
      expect(details.exists).to.be.true;
    });

    it("Should prevent duplicate registration", async function () {
      await fileRegistry.registerFile("abc123hash", "QmCid1", "application/pdf", "doc.pdf", 10);
      await expect(
        fileRegistry.registerFile("abc123hash", "QmCid2", "application/pdf", "doc2.pdf", 20)
      ).to.be.revertedWith("File already registered");
    });

    it("Should reject risk score above 100", async function () {
      await expect(
        fileRegistry.registerFile("abc123hash", "QmCid1", "application/pdf", "doc.pdf", 101)
      ).to.be.revertedWith("Risk score must be 0-100");
    });

    it("Should emit FileRegistered event", async function () {
      await expect(
        fileRegistry.registerFile("abc123hash", "QmCid1", "application/pdf", "doc.pdf", 30)
      ).to.emit(fileRegistry, "FileRegistered");
    });

    it("Should increment totalDocuments", async function () {
      expect(await fileRegistry.totalDocuments()).to.equal(0);
      await fileRegistry.registerFile("hash1", "cid1", "application/pdf", "a.pdf", 10);
      expect(await fileRegistry.totalDocuments()).to.equal(1);
      await fileRegistry.registerFile("hash2", "cid2", "image/png", "b.png", 5);
      expect(await fileRegistry.totalDocuments()).to.equal(2);
    });

    it("Should allow different users to register different files", async function () {
      await fileRegistry.connect(addr1).registerFile("hash1", "cid1", "application/pdf", "a.pdf", 10);
      await fileRegistry.connect(addr2).registerFile("hash2", "cid2", "image/png", "b.png", 20);
      const details1 = await fileRegistry.getFileDetails("hash1");
      const details2 = await fileRegistry.getFileDetails("hash2");
      expect(details1.uploader).to.equal(addr1.address);
      expect(details2.uploader).to.equal(addr2.address);
    });
  });

  describe("Verification", function () {
    it("Should verify a registered file", async function () {
      await fileRegistry.registerFile("abc123hash", "QmCid1", "application/pdf", "doc.pdf", 15);
      const [uploader, timestamp, exists, isRevoked] = await fileRegistry.verifyFile("abc123hash");
      expect(exists).to.be.true;
      expect(uploader).to.equal(owner.address);
      expect(isRevoked).to.be.false;
      expect(timestamp).to.be.greaterThan(0);
    });

    it("Should return exists=false for unregistered file", async function () {
      const [uploader, timestamp, exists, isRevoked] = await fileRegistry.verifyFile("nonexistent");
      expect(exists).to.be.false;
    });
  });

  describe("Revocation", function () {
    beforeEach(async function () {
      await fileRegistry.registerFile("abc123hash", "QmCid1", "application/pdf", "doc.pdf", 10);
    });

    it("Should allow uploader to revoke their file", async function () {
      await fileRegistry.revokeFile("abc123hash");
      const [, , , isRevoked] = await fileRegistry.verifyFile("abc123hash");
      expect(isRevoked).to.be.true;
    });

    it("Should prevent non-uploader from revoking", async function () {
      await expect(
        fileRegistry.connect(addr1).revokeFile("abc123hash")
      ).to.be.revertedWith("Only uploader can revoke");
    });

    it("Should prevent double revocation", async function () {
      await fileRegistry.revokeFile("abc123hash");
      await expect(
        fileRegistry.revokeFile("abc123hash")
      ).to.be.revertedWith("File already revoked");
    });

    it("Should emit FileRevoked event", async function () {
      await expect(
        fileRegistry.revokeFile("abc123hash")
      ).to.emit(fileRegistry, "FileRevoked");
    });
  });

  describe("Uploader Files", function () {
    it("Should track files per uploader", async function () {
      await fileRegistry.registerFile("hash1", "cid1", "application/pdf", "a.pdf", 10);
      await fileRegistry.registerFile("hash2", "cid2", "image/png", "b.png", 20);
      const files = await fileRegistry.getFilesByUploader(owner.address);
      expect(files.length).to.equal(2);
      expect(files[0]).to.equal("hash1");
      expect(files[1]).to.equal("hash2");
    });

    it("Should return empty array for address with no files", async function () {
      const files = await fileRegistry.getFilesByUploader(addr1.address);
      expect(files.length).to.equal(0);
    });
  });

  describe("File Details", function () {
    it("Should revert for non-existent file", async function () {
      await expect(
        fileRegistry.getFileDetails("nonexistent")
      ).to.be.revertedWith("File not found");
    });
  });
});
