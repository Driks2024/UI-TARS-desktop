import { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { Upload as UploadIcon, FileText, CheckCircle, XCircle } from 'lucide-react';

const Upload = () => {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const onDrop = (acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
      setError(null);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    multiple: false,
  });

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      navigate(`/orders/${response.data.order.id}`);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-xl w-full bg-white rounded-2xl shadow-xl p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
          <UploadIcon className="text-blue-600" />
          Upload Order PDF
        </h2>

        <div
          {...getRootProps() as any}
          className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
            isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400'
          }`}
        >
          <input {...getInputProps() as any} />
          <div className="flex flex-col items-center gap-4">
            <FileText size={48} className="text-gray-400" />
            {file ? (
              <div className="text-gray-700 font-medium">{file.name}</div>
            ) : (
              <div className="text-gray-500">
                <p className="text-lg font-medium">Drag & drop a PDF here</p>
                <p className="text-sm">or click to select file</p>
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-100 text-red-700 rounded-lg flex items-center gap-2">
            <XCircle size={20} />
            {error}
          </div>
        )}

        <div className="mt-8 flex justify-end gap-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={!file || uploading}
            className={`px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2 ${
              (!file || uploading) ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {uploading ? 'Processing...' : 'Upload & Validate'}
            {!uploading && <CheckCircle size={18} />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Upload;
