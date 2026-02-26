export interface Order {
  id: string;
  originalFilename: string;
  fileHash: string;
  status: 'APPROVED' | 'REJECTED' | 'EXCEPTION' | 'PENDING';
  extractedData: string; // JSON
  validationResult: string; // JSON
  createdAt: string;
  user: {
    name: string;
    email: string;
  };
}

export interface ValidationResult {
  status: 'APPROVED' | 'REJECTED' | 'EXCEPTION';
  reasons: string[];
  warnings: string[];
  exceptions: string[];
}
