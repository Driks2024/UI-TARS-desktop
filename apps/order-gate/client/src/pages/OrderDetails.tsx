import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../lib/api';
import type { Order, ValidationResult } from '../types';
import { useAuthStore } from '../store/auth';
import { CheckCircle, XCircle, AlertCircle, FileText, Download, Mail, ArrowLeft, ShieldAlert, X } from 'lucide-react';

const OrderDetails = () => {
  const { id } = useParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailStatus, setEmailStatus] = useState<string | null>(null);

  const user = useAuthStore((state) => state.user);
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [justification, setJustification] = useState('');

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const response = await api.get(`/orders/${id}`);
        setOrder(response.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchOrder();
  }, [id]);

  const sendEmail = async () => {
    setSendingEmail(true);
    try {
      await api.post(`/orders/${id}/email-to-self`);
      setEmailStatus('Email sent successfully!');
    } catch (err) {
      setEmailStatus('Failed to send email.');
    } finally {
      setSendingEmail(false);
    }
  };

  const handleOverride = async () => {
    if (!justification) return alert('Justification is required');
    try {
      await api.post(`/admin/orders/${id}/override`, { justification });
      alert('Order overridden successfully!');
      window.location.reload();
    } catch (err) {
      alert('Failed to override order.');
    }
  };

  if (loading) return <div className="text-center py-10">Loading details...</div>;
  if (!order) return <div className="text-center py-10">Order not found.</div>;

  const validationResult: ValidationResult = JSON.parse(order.validationResult || '{}');
  const extractedData = JSON.parse(order.extractedData || '{}');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED': return 'text-green-600 bg-green-50 border-green-200';
      case 'REJECTED': return 'text-red-600 bg-red-50 border-red-200';
      case 'EXCEPTION': return 'text-orange-600 bg-orange-50 border-orange-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <Link to="/dashboard" className="flex items-center gap-2 text-gray-500 hover:text-gray-900 mb-6">
          <ArrowLeft size={20} /> Back to Dashboard
        </Link>

        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          {/* Header */}
          <div className="p-6 border-b border-gray-100 flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Order #{extractedData.orderNumber || 'Unknown'}
              </h1>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <FileText size={16} />
                {order.originalFilename}
                <span className="mx-2">•</span>
                Uploaded on {new Date(order.createdAt).toLocaleString()}
              </div>
            </div>
            <div className={`px-4 py-2 rounded-lg border flex items-center gap-2 ${getStatusColor(order.status)}`}>
              {order.status === 'APPROVED' && <CheckCircle size={20} />}
              {order.status === 'REJECTED' && <XCircle size={20} />}
              {order.status === 'EXCEPTION' && <AlertCircle size={20} />}
              <span className="font-bold">{order.status}</span>
            </div>
          </div>

          {/* Validation Results */}
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Validation Report</h3>

            {validationResult.reasons && validationResult.reasons.length > 0 ? (
              <div className="space-y-3 mb-6">
                {validationResult.reasons.map((reason, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 bg-red-50 text-red-700 rounded-lg border border-red-100">
                    <XCircle className="shrink-0 mt-0.5" size={18} />
                    <span>{reason}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 bg-green-50 text-green-700 rounded-lg border border-green-100 mb-6 flex items-center gap-2">
                <CheckCircle size={20} />
                No blocking violations found.
              </div>
            )}

            {validationResult.warnings && validationResult.warnings.length > 0 && (
              <div className="space-y-3 mb-6">
                {validationResult.warnings.map((warning, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 bg-orange-50 text-orange-700 rounded-lg border border-orange-100">
                    <AlertCircle className="shrink-0 mt-0.5" size={18} />
                    <span>{warning}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8 pt-6 border-t border-gray-100">
              {(order.status === 'APPROVED' || order.status === 'EXCEPTION') && (
                <a
                  href={`/api/orders/${order.id}/download/stamped`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 transition"
                >
                  <Download size={20} />
                  Download Stamped PDF
                </a>
              )}

              {order.status !== 'APPROVED' && (
                <a
                  href={`/api/orders/${order.id}/download/evidence`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 bg-gray-800 text-white px-4 py-3 rounded-lg hover:bg-gray-900 transition"
                >
                  <FileText size={20} />
                  Download Evidence PDF
                </a>
              )}

              <button
                onClick={sendEmail}
                disabled={sendingEmail}
                className="flex items-center justify-center gap-2 bg-purple-600 text-white px-4 py-3 rounded-lg hover:bg-purple-700 transition disabled:opacity-50"
              >
                <Mail size={20} />
                {sendingEmail ? 'Sending...' : 'Email to Me'}
              </button>
            </div>

            {emailStatus && (
              <div className="mt-4 text-center text-sm font-medium text-gray-600">
                {emailStatus}
              </div>
            )}

            {/* Admin Override */}
            {user?.role === 'ADMIN' && order.status === 'REJECTED' && (
              <div className="mt-8 pt-6 border-t border-gray-100">
                 <h4 className="text-sm font-bold text-gray-900 uppercase mb-2">Admin Zone</h4>
                 <button
                    onClick={() => setShowOverrideModal(true)}
                    className="flex items-center gap-2 bg-red-100 text-red-700 px-4 py-2 rounded-lg hover:bg-red-200 transition"
                 >
                    <ShieldAlert size={18} />
                    Override Rejection (Approve as Exception)
                 </button>
              </div>
            )}
          </div>

          {/* Extracted Data Preview (Optional) */}
          <div className="p-6 bg-gray-50 border-t border-gray-200">
            <details>
              <summary className="cursor-pointer text-sm font-medium text-gray-500 hover:text-gray-900">
                View Extracted Data JSON
              </summary>
              <pre className="mt-4 p-4 bg-gray-800 text-gray-200 rounded-lg overflow-x-auto text-xs">
                {JSON.stringify(extractedData, null, 2)}
              </pre>
            </details>
          </div>
        </div>
      </div>

      {/* Override Modal */}
      {showOverrideModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
           <div className="bg-white rounded-lg p-8 max-w-md w-full relative">
              <button onClick={() => setShowOverrideModal(false)} className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"><X size={24} /></button>
              <h2 className="text-xl font-bold mb-4">Override Rejection</h2>
              <p className="text-gray-600 mb-4 text-sm">
                 You are about to approve a rejected order. This action will be logged.
                 Please provide a justification.
              </p>
              <textarea
                 className="w-full border rounded-lg p-3 h-32 mb-4 focus:ring-2 focus:ring-red-500 outline-none"
                 placeholder="Justification..."
                 value={justification}
                 onChange={(e) => setJustification(e.target.value)}
              />
              <div className="flex justify-end gap-2">
                 <button onClick={() => setShowOverrideModal(false)} className="px-4 py-2 border rounded-lg hover:bg-gray-50">Cancel</button>
                 <button onClick={handleOverride} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">Confirm Override</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default OrderDetails;
