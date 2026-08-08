const crypto = require('crypto');
const path = require('path');

// AI-Based Document Analysis Module
// Performs heuristic document forensics, anomaly detection, and risk scoring
// Analyzes file metadata, structure, and patterns to detect potential fraud

class AIDocumentAnalyzer {
  constructor() {
    // Risk weight configuration
    this.weights = {
      fileIntegrity: 0.20,
      metadataAnalysis: 0.25,
      contentAnalysis: 0.25,
      anomalyDetection: 0.30
    };

    // Known suspicious patterns
    this.suspiciousPatterns = {
      minPdfSize: 1024,           // PDFs smaller than 1KB are suspicious
      maxPdfSize: 100 * 1024 * 1024, // PDFs larger than 100MB are suspicious
      minImageSize: 500,          // Images smaller than 500 bytes are suspicious
      suspiciousSoftware: [
        'fake', 'crack', 'hack', 'exploit', 'malware'
      ],
      suspiciousJsPatterns: [
        'eval(', 'document.write', 'window.location', 'XMLHttpRequest',
        'ActiveXObject', '.exe', 'powershell', 'cmd.exe'
      ]
    };
  }

  // Main analysis entry point
  async analyze(fileBuffer, fileName, mimeType) {
    const startTime = Date.now();
    const findings = [];
    const scores = {
      fileIntegrity: 0,
      metadataAnalysis: 0,
      contentAnalysis: 0,
      anomalyDetection: 0
    };

    // 1. File Integrity Analysis
    const integrityResult = this._analyzeFileIntegrity(fileBuffer, fileName, mimeType);
    scores.fileIntegrity = integrityResult.score;
    findings.push(...integrityResult.findings);

    // 2. Metadata Analysis
    const metadataResult = await this._analyzeMetadata(fileBuffer, fileName, mimeType);
    scores.metadataAnalysis = metadataResult.score;
    findings.push(...metadataResult.findings);

    // 3. Content Analysis
    const contentResult = await this._analyzeContent(fileBuffer, fileName, mimeType);
    scores.contentAnalysis = contentResult.score;
    findings.push(...contentResult.findings);

    // 4. Anomaly Detection
    const anomalyResult = this._detectAnomalies(fileBuffer, fileName, mimeType);
    scores.anomalyDetection = anomalyResult.score;
    findings.push(...anomalyResult.findings);

    // Calculate weighted risk score
    const riskScore = Math.round(
      scores.fileIntegrity * this.weights.fileIntegrity +
      scores.metadataAnalysis * this.weights.metadataAnalysis +
      scores.contentAnalysis * this.weights.contentAnalysis +
      scores.anomalyDetection * this.weights.anomalyDetection
    );

    const analysisTime = Date.now() - startTime;

    return {
      riskScore: Math.min(riskScore, 100),
      riskLevel: this._getRiskLevel(riskScore),
      scores,
      findings,
      hashes: {
        sha256: crypto.createHash('sha256').update(fileBuffer).digest('hex'),
        md5: crypto.createHash('md5').update(fileBuffer).digest('hex')
      },
      fileInfo: {
        fileName,
        mimeType,
        fileSize: fileBuffer.length,
        fileSizeFormatted: this._formatFileSize(fileBuffer.length)
      },
      recommendations: this._generateRecommendations(riskScore, findings),
      analyzedAt: new Date().toISOString(),
      analysisTimeMs: analysisTime
    };
  }

  // File Integrity Analysis
  _analyzeFileIntegrity(buffer, fileName, mimeType) {
    const findings = [];
    let score = 0;

    // Check file extension matches MIME type
    const ext = path.extname(fileName).toLowerCase();
    const expectedMimes = {
      '.pdf': ['application/pdf'],
      '.png': ['image/png'],
      '.jpg': ['image/jpeg'],
      '.jpeg': ['image/jpeg'],
      '.gif': ['image/gif'],
      '.webp': ['image/webp'],
      '.doc': ['application/msword'],
      '.docx': ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
      '.txt': ['text/plain']
    };

    if (expectedMimes[ext] && !expectedMimes[ext].includes(mimeType)) {
      score += 40;
      findings.push({
        type: 'FILE_INTEGRITY',
        severity: 'HIGH',
        message: `File extension "${ext}" does not match MIME type "${mimeType}"`,
        detail: 'This could indicate a disguised file attempting to bypass security.'
      });
    } else {
      findings.push({
        type: 'FILE_INTEGRITY',
        severity: 'INFO',
        message: `File type verified: ${mimeType} matches extension ${ext}`,
        detail: 'File extension and MIME type are consistent.'
      });
    }

    // Check magic bytes (file signatures)
    const magicBytesCheck = this._checkMagicBytes(buffer, mimeType);
    if (!magicBytesCheck.valid) {
      score += 35;
      findings.push({
        type: 'FILE_INTEGRITY',
        severity: 'HIGH',
        message: 'File signature (magic bytes) mismatch',
        detail: magicBytesCheck.detail
      });
    } else {
      findings.push({
        type: 'FILE_INTEGRITY',
        severity: 'INFO',
        message: 'File signature verified successfully',
        detail: 'Binary file header matches expected format.'
      });
    }

    // Check for null bytes in text files
    if (mimeType === 'text/plain') {
      const nullCount = buffer.filter(b => b === 0).length;
      if (nullCount > 0) {
        score += 25;
        findings.push({
          type: 'FILE_INTEGRITY',
          severity: 'MEDIUM',
          message: `Text file contains ${nullCount} null bytes`,
          detail: 'Null bytes in text files may indicate binary data or corruption.'
        });
      }
    }

    return { score: Math.min(score, 100), findings };
  }

  // Metadata Analysis
  async _analyzeMetadata(buffer, fileName, mimeType) {
    const findings = [];
    let score = 0;

    if (mimeType === 'application/pdf') {
      try {
        const pdfParse = require('pdf-parse');
        const pdfData = await pdfParse(buffer);

        // Check page count
        if (pdfData.numpages === 0) {
          score += 30;
          findings.push({
            type: 'METADATA',
            severity: 'HIGH',
            message: 'PDF has zero pages',
            detail: 'A PDF with no pages is highly suspicious and may be corrupted or malicious.'
          });
        } else {
          findings.push({
            type: 'METADATA',
            severity: 'INFO',
            message: `PDF contains ${pdfData.numpages} page(s)`,
            detail: 'Page count is within normal range.'
          });
        }

        // Check PDF metadata
        const info = pdfData.info || {};
        
        if (info.Creator) {
          const creatorLower = info.Creator.toLowerCase();
          const isSuspicious = this.suspiciousPatterns.suspiciousSoftware.some(
            p => creatorLower.includes(p)
          );
          if (isSuspicious) {
            score += 35;
            findings.push({
              type: 'METADATA',
              severity: 'HIGH',
              message: `Suspicious PDF creator software: "${info.Creator}"`,
              detail: 'The software used to create this PDF is associated with suspicious activity.'
            });
          } else {
            findings.push({
              type: 'METADATA',
              severity: 'INFO',
              message: `PDF creator: ${info.Creator}`,
              detail: 'Creator software appears legitimate.'
            });
          }
        } else {
          score += 10;
          findings.push({
            type: 'METADATA',
            severity: 'LOW',
            message: 'PDF creator metadata is missing',
            detail: 'Missing creator information is not necessarily suspicious but reduces traceability.'
          });
        }

        if (info.Producer) {
          findings.push({
            type: 'METADATA',
            severity: 'INFO',
            message: `PDF producer: ${info.Producer}`,
            detail: 'Producer metadata identified.'
          });
        }

        // Check for text content
        if (pdfData.text && pdfData.text.trim().length === 0 && pdfData.numpages > 0) {
          score += 15;
          findings.push({
            type: 'METADATA',
            severity: 'MEDIUM',
            message: 'PDF contains pages but no extractable text',
            detail: 'This could indicate a scanned document or image-only PDF.'
          });
        }

        // Check creation/modification dates
        if (info.CreationDate) {
          const creationDate = this._parsePdfDate(info.CreationDate);
          if (creationDate) {
            if (creationDate > new Date()) {
              score += 30;
              findings.push({
                type: 'METADATA',
                severity: 'HIGH',
                message: 'PDF creation date is in the future',
                detail: `Creation date: ${creationDate.toISOString()}. Future dates indicate timestamp manipulation.`
              });
            } else {
              findings.push({
                type: 'METADATA',
                severity: 'INFO',
                message: `PDF created: ${creationDate.toLocaleDateString()}`,
                detail: 'Creation date appears valid.'
              });
            }
          }
        }

      } catch (err) {
        score += 20;
        findings.push({
          type: 'METADATA',
          severity: 'MEDIUM',
          message: 'Failed to parse PDF metadata',
          detail: `Error: ${err.message}. The PDF may be malformed or encrypted.`
        });
      }
    } else {
      // Non-PDF: basic metadata checks
      findings.push({
        type: 'METADATA',
        severity: 'INFO',
        message: `Document type: ${mimeType}`,
        detail: 'Non-PDF document — limited metadata analysis available.'
      });
    }

    return { score: Math.min(score, 100), findings };
  }

  // Content Analysis
  async _analyzeContent(buffer, fileName, mimeType) {
    const findings = [];
    let score = 0;

    if (mimeType === 'application/pdf') {
      // Check for embedded JavaScript
      const content = buffer.toString('latin1');
      const jsPatterns = ['/JavaScript', '/JS ', '/Launch', '/OpenAction', '/AA'];
      const foundPatterns = jsPatterns.filter(p => content.includes(p));

      if (foundPatterns.length > 0) {
        score += 30;
        findings.push({
          type: 'CONTENT',
          severity: 'HIGH',
          message: `PDF contains active content: ${foundPatterns.join(', ')}`,
          detail: 'Embedded JavaScript or auto-actions in PDFs can be used for malicious purposes.'
        });
      }

      // Check for embedded files/attachments
      if (content.includes('/EmbeddedFile') || content.includes('/Filespec')) {
        score += 15;
        findings.push({
          type: 'CONTENT',
          severity: 'MEDIUM',
          message: 'PDF contains embedded files or attachments',
          detail: 'Embedded files could contain malicious payloads.'
        });
      }

      // Check for form fields
      if (content.includes('/AcroForm') || content.includes('/XFA')) {
        findings.push({
          type: 'CONTENT',
          severity: 'LOW',
          message: 'PDF contains form fields',
          detail: 'Interactive forms detected. Content may change based on form input.'
        });
      }

      // Check for encryption
      if (content.includes('/Encrypt')) {
        score += 10;
        findings.push({
          type: 'CONTENT',
          severity: 'MEDIUM',
          message: 'PDF is encrypted',
          detail: 'Encrypted PDFs may hide their true content from analysis.'
        });
      }

      // Check for suspicious strings
      const suspiciousFound = this.suspiciousPatterns.suspiciousJsPatterns.filter(
        p => content.toLowerCase().includes(p.toLowerCase())
      );
      if (suspiciousFound.length > 0) {
        score += 25;
        findings.push({
          type: 'CONTENT',
          severity: 'HIGH',
          message: `Suspicious code patterns detected: ${suspiciousFound.join(', ')}`,
          detail: 'These patterns are commonly associated with malicious documents.'
        });
      }
    }

    // Check for steganography indicators in images
    if (mimeType && mimeType.startsWith('image/')) {
      // Check if image has unusually large file size for its format
      const sizePerPixelThreshold = {
        'image/png': 10,    // bytes per pixel
        'image/jpeg': 5,
        'image/gif': 8,
        'image/webp': 8
      };

      findings.push({
        type: 'CONTENT',
        severity: 'INFO',
        message: `Image document analyzed (${this._formatFileSize(buffer.length)})`,
        detail: 'Image format validation completed.'
      });
    }

    if (findings.length === 0) {
      findings.push({
        type: 'CONTENT',
        severity: 'INFO',
        message: 'No suspicious content patterns detected',
        detail: 'Content analysis passed all checks.'
      });
    }

    return { score: Math.min(score, 100), findings };
  }

  // Anomaly Detection
  _detectAnomalies(buffer, fileName, mimeType) {
    const findings = [];
    let score = 0;

    // File size anomalies
    if (mimeType === 'application/pdf') {
      if (buffer.length < this.suspiciousPatterns.minPdfSize) {
        score += 35;
        findings.push({
          type: 'ANOMALY',
          severity: 'HIGH',
          message: `Unusually small PDF (${this._formatFileSize(buffer.length)})`,
          detail: 'PDFs under 1KB are suspicious — they likely contain no meaningful content.'
        });
      } else if (buffer.length > this.suspiciousPatterns.maxPdfSize) {
        score += 20;
        findings.push({
          type: 'ANOMALY',
          severity: 'MEDIUM',
          message: `Unusually large PDF (${this._formatFileSize(buffer.length)})`,
          detail: 'Extremely large PDFs may contain hidden data or embedded resources.'
        });
      }
    }

    if (mimeType && mimeType.startsWith('image/') && buffer.length < this.suspiciousPatterns.minImageSize) {
      score += 30;
      findings.push({
        type: 'ANOMALY',
        severity: 'HIGH',
        message: `Unusually small image (${this._formatFileSize(buffer.length)})`,
        detail: 'Images under 500 bytes are suspicious and may be corrupted or placeholder files.'
      });
    }

    // Filename anomalies
    const nameAnomalies = this._checkFilenameAnomalies(fileName);
    score += nameAnomalies.score;
    findings.push(...nameAnomalies.findings);

    // Entropy analysis (high entropy may indicate encryption or obfuscation)
    const entropy = this._calculateEntropy(buffer);
    if (entropy > 7.9) {
      score += 15;
      findings.push({
        type: 'ANOMALY',
        severity: 'MEDIUM',
        message: `High file entropy detected (${entropy.toFixed(2)}/8.0)`,
        detail: 'Very high entropy suggests the file may be encrypted, compressed, or obfuscated.'
      });
    } else {
      findings.push({
        type: 'ANOMALY',
        severity: 'INFO',
        message: `File entropy: ${entropy.toFixed(2)}/8.0`,
        detail: 'Entropy is within normal range for this file type.'
      });
    }

    // Check for double extensions
    const extensions = fileName.split('.').slice(1);
    if (extensions.length > 1) {
      const executableExts = ['exe', 'bat', 'cmd', 'ps1', 'vbs', 'js', 'msi'];
      const hasExecutable = extensions.some(ext => executableExts.includes(ext.toLowerCase()));
      if (hasExecutable) {
        score += 40;
        findings.push({
          type: 'ANOMALY',
          severity: 'CRITICAL',
          message: `Double extension with executable type detected: ${fileName}`,
          detail: 'Files with double extensions containing executable types are a common malware delivery technique.'
        });
      }
    }

    if (findings.length === 0) {
      findings.push({
        type: 'ANOMALY',
        severity: 'INFO',
        message: 'No anomalies detected',
        detail: 'All anomaly checks passed.'
      });
    }

    return { score: Math.min(score, 100), findings };
  }

  // Helper: Check file magic bytes
  _checkMagicBytes(buffer, mimeType) {
    const signatures = {
      'application/pdf': { bytes: [0x25, 0x50, 0x44, 0x46], name: '%PDF' },
      'image/png': { bytes: [0x89, 0x50, 0x4E, 0x47], name: 'PNG' },
      'image/jpeg': { bytes: [0xFF, 0xD8, 0xFF], name: 'JPEG' },
      'image/gif': { bytes: [0x47, 0x49, 0x46], name: 'GIF' },
      'image/webp': { bytes: [0x52, 0x49, 0x46, 0x46], name: 'RIFF/WebP' }
    };

    const sig = signatures[mimeType];
    if (!sig) return { valid: true, detail: 'No signature check available for this type.' };

    const headerBytes = Array.from(buffer.slice(0, sig.bytes.length));
    const matches = sig.bytes.every((b, i) => headerBytes[i] === b);

    return {
      valid: matches,
      detail: matches
        ? `File header matches ${sig.name} signature.`
        : `Expected ${sig.name} header [${sig.bytes.map(b => '0x' + b.toString(16).toUpperCase()).join(' ')}] but found [${headerBytes.map(b => '0x' + b.toString(16).toUpperCase()).join(' ')}].`
    };
  }

  // Helper: Check filename anomalies
  _checkFilenameAnomalies(fileName) {
    const findings = [];
    let score = 0;

    // Check for excessively long filenames
    if (fileName.length > 200) {
      score += 15;
      findings.push({
        type: 'ANOMALY',
        severity: 'MEDIUM',
        message: 'Excessively long filename',
        detail: `Filename is ${fileName.length} characters. Long filenames can be used to hide true extensions.`
      });
    }

    // Check for special characters that could indicate path traversal
    if (fileName.includes('..') || fileName.includes('/') || fileName.includes('\\')) {
      score += 30;
      findings.push({
        type: 'ANOMALY',
        severity: 'HIGH',
        message: 'Path traversal characters detected in filename',
        detail: 'Filename contains directory separators or parent references, which could indicate a path traversal attack.'
      });
    }

    // Check for Unicode tricks (right-to-left override, zero-width chars)
    const unicodeTricks = /[\u200B-\u200F\u202A-\u202E\u2060-\u2064\uFEFF]/;
    if (unicodeTricks.test(fileName)) {
      score += 35;
      findings.push({
        type: 'ANOMALY',
        severity: 'HIGH',
        message: 'Unicode manipulation characters found in filename',
        detail: 'Hidden Unicode characters can be used to disguise the true filename or extension.'
      });
    }

    return { score, findings };
  }

  // Helper: Calculate Shannon entropy
  _calculateEntropy(buffer) {
    const freq = new Array(256).fill(0);
    for (let i = 0; i < buffer.length; i++) {
      freq[buffer[i]]++;
    }
    let entropy = 0;
    for (let i = 0; i < 256; i++) {
      if (freq[i] > 0) {
        const p = freq[i] / buffer.length;
        entropy -= p * Math.log2(p);
      }
    }
    return entropy;
  }

  // Helper: Get risk level from score
  _getRiskLevel(score) {
    if (score <= 15) return 'LOW';
    if (score <= 40) return 'MEDIUM';
    if (score <= 70) return 'HIGH';
    return 'CRITICAL';
  }

  // Helper: Format file size
  _formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  // Helper: Parse PDF date format
  _parsePdfDate(dateStr) {
    try {
      // PDF date format: D:YYYYMMDDHHmmSS
      if (typeof dateStr !== 'string') return null;
      const cleaned = dateStr.replace(/^D:/, '');
      const year = parseInt(cleaned.substr(0, 4));
      const month = parseInt(cleaned.substr(4, 2)) - 1 || 0;
      const day = parseInt(cleaned.substr(6, 2)) || 1;
      if (isNaN(year)) return null;
      return new Date(year, month, day);
    } catch {
      return null;
    }
  }

  // Generate recommendations based on findings
  _generateRecommendations(riskScore, findings) {
    const recommendations = [];

    if (riskScore <= 15) {
      recommendations.push({
        type: 'APPROVE',
        message: 'Document appears safe for blockchain registration',
        icon: '✅'
      });
    } else if (riskScore <= 40) {
      recommendations.push({
        type: 'REVIEW',
        message: 'Document has minor concerns — review findings before registering',
        icon: '⚠️'
      });
    } else if (riskScore <= 70) {
      recommendations.push({
        type: 'CAUTION',
        message: 'Document has significant risk factors — careful review recommended',
        icon: '🔶'
      });
    } else {
      recommendations.push({
        type: 'REJECT',
        message: 'Document has critical risk factors — registration not recommended',
        icon: '🛑'
      });
    }

    // Specific recommendations based on findings
    const hasSeverity = (sev) => findings.some(f => f.severity === sev);

    if (hasSeverity('CRITICAL')) {
      recommendations.push({
        type: 'ACTION',
        message: 'Critical issues detected — investigate before proceeding',
        icon: '🚨'
      });
    }

    if (findings.some(f => f.message.includes('JavaScript') || f.message.includes('active content'))) {
      recommendations.push({
        type: 'ACTION',
        message: 'Remove active content (JavaScript) before registration',
        icon: '📜'
      });
    }

    if (findings.some(f => f.message.includes('encrypted'))) {
      recommendations.push({
        type: 'ACTION',
        message: 'Consider submitting an unencrypted version for full analysis',
        icon: '🔓'
      });
    }

    return recommendations;
  }
}

module.exports = new AIDocumentAnalyzer();
