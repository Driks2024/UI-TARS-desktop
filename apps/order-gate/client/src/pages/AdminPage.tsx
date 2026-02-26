import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import api from '../lib/api';
import { useAuthStore } from '../store/auth';
import { Plus, Edit, Trash, X } from 'lucide-react';

interface PriceItem {
  id: string;
  sku?: string;
  prefix?: string;
  groupName?: string;
  minPrice: number;
  fullPrice?: number;
}

const AdminPage = () => {
  const [prices, setPrices] = useState<PriceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PriceItem | null>(null);
  const { register, handleSubmit, reset } = useForm<PriceItem>();
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    fetchPrices();
  }, []);

  const fetchPrices = async () => {
    try {
      const response = await api.get('/admin/prices');
      setPrices(response.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: PriceItem) => {
    // Convert strings to numbers
    data.minPrice = Number(data.minPrice);
    if (data.fullPrice) data.fullPrice = Number(data.fullPrice);

    try {
      if (editingItem) {
        await api.put(`/admin/prices/${editingItem.id}`, data);
      } else {
        await api.post('/admin/prices', data);
      }
      setIsModalOpen(false);
      reset();
      setEditingItem(null);
      fetchPrices();
    } catch (err) {
      alert('Failed to save price rule');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this rule?')) return;
    try {
      await api.delete(`/admin/prices/${id}`);
      fetchPrices();
    } catch (err) {
      alert('Failed to delete price rule');
    }
  };

  const openModal = (item?: PriceItem) => {
    if (item) {
      setEditingItem(item);
      reset(item);
    } else {
      setEditingItem(null);
      reset({});
    }
    setIsModalOpen(true);
  };

  if (user?.role !== 'ADMIN') {
    return <div className="p-8 text-center text-red-600">Access Denied. Admin only.</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Price Catalog Management</h1>
          <button
            onClick={() => openModal()}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            <Plus size={20} />
            Add Rule
          </button>
        </div>

        {loading ? (
          <div className="text-center py-10">Loading...</div>
        ) : (
          <div className="bg-white rounded-xl shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Group</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Prefix</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SKU</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Min Price</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Full Price</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {prices.map((price) => (
                  <tr key={price.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{price.groupName || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{price.prefix || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{price.sku || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">R$ {price.minPrice.toFixed(2)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{price.fullPrice ? `R$ ${price.fullPrice.toFixed(2)}` : '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button onClick={() => openModal(price)} className="text-blue-600 hover:text-blue-900 mr-4">
                        <Edit size={18} />
                      </button>
                      <button onClick={() => handleDelete(price.id)} className="text-red-600 hover:text-red-900">
                        <Trash size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
                {prices.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-10 text-center text-gray-500">No prices configured.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-8 max-w-md w-full relative">
              <button
                onClick={() => setIsModalOpen(false)}
                className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
              >
                <X size={24} />
              </button>
              <h2 className="text-2xl font-bold mb-6">{editingItem ? 'Edit Price Rule' : 'New Price Rule'}</h2>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Group Name</label>
                  <input {...register('groupName')} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Prefix</label>
                    <input {...register('prefix')} placeholder="e.g. 1801." className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">SKU</label>
                    <input {...register('sku')} placeholder="e.g. 1801.001" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Min Price *</label>
                    <input type="number" step="0.01" {...register('minPrice', { required: true })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Full Price</label>
                    <input type="number" step="0.01" {...register('fullPrice')} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2" />
                  </div>
                </div>

                <div className="pt-4 flex justify-end gap-2">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">Cancel</button>
                  <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">Save</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPage;
