import { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft,
  RefreshCw,
  AlertCircle,
  Eye,
  FileText,
  Search,
  Info,
} from 'lucide-react';
import { getTemplates, getTemplate, previewTemplate } from '../services/api';
import { useToast } from '../App';

const defaultSampleData = JSON.stringify(
  {
    body: {
      name: 'John Doe',
      company: 'Acme Corp',
      date: '2025-01-15',
      amount: '1,250.00',
    },
    details: [
      { description: 'Item 1', quantity: 2, price: '500.00' },
      { description: 'Item 2', quantity: 1, price: '250.00' },
    ],
  },
  null,
  2
);

export default function Templates() {
  const toast = useToast();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [search, setSearch] = useState('');

  // Editor state
  const [editSubject, setEditSubject] = useState('');
  const [editBody, setEditBody] = useState('');
  const [sampleData, setSampleData] = useState(defaultSampleData);
  const [previewHtml, setPreviewHtml] = useState(null);
  const [previewing, setPreviewing] = useState(false);

  const fetchTemplates = useCallback(async () => {
    try {
      setError(null);
      const res = await getTemplates();
      setTemplates(res.data || []);
    } catch {
      setError('Failed to load templates');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const openTemplate = async (id) => {
    setSelectedId(id);
    setDetailLoading(true);
    setPreviewHtml(null);
    try {
      const res = await getTemplate(id);
      setDetail(res.data);
      setEditSubject(res.data.subject || '');
      setEditBody(res.data.body || '');
    } catch {
      toast('Failed to load template', 'error');
    } finally {
      setDetailLoading(false);
    }
  };

  const handlePreview = async () => {
    setPreviewing(true);
    try {
      let parsedData = {};
      try {
        parsedData = JSON.parse(sampleData);
      } catch {
        toast('Invalid JSON in sample data', 'error');
        setPreviewing(false);
        return;
      }
      const res = await previewTemplate({
        templateId: selectedId,
        subject: editSubject,
        body: editBody,
        data: parsedData,
      });
      setPreviewHtml(res.data.renderedBody || res.data.html || res.data);
      toast('Preview generated', 'success');
    } catch {
      toast('Failed to generate preview', 'error');
    } finally {
      setPreviewing(false);
    }
  };

  const filteredTemplates = templates.filter(
    (t) =>
      !search ||
      (t.code || t.templateCode || '').toLowerCase().includes(search.toLowerCase()) ||
      (t.subject || '').toLowerCase().includes(search.toLowerCase()) ||
      (t.language || '').toLowerCase().includes(search.toLowerCase()) ||
      (t.appKey || '').toLowerCase().includes(search.toLowerCase())
  );

  // Detail view
  if (selectedId) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => {
            setSelectedId(null);
            setDetail(null);
            setPreviewHtml(null);
          }}
          className="inline-flex items-center gap-1.5 text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
        >
          <ArrowLeft size={14} />
          Back to templates
        </button>

        {detailLoading ? (
          <div className="flex items-center justify-center py-20">
            <RefreshCw size={24} className="animate-spin text-indigo-500" />
          </div>
        ) : detail ? (
          <div className="space-y-4">
            {/* Template meta */}
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
              <div className="flex items-center gap-3 mb-4">
                <FileText size={20} className="text-indigo-500" />
                <h2 className="text-lg font-bold">
                  {detail.code || detail.templateCode}
                </h2>
                <span className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded text-gray-500 dark:text-gray-400">
                  {detail.language || 'EN'}
                </span>
                {detail.appKey && (
                  <span className="text-xs bg-indigo-50 dark:bg-indigo-950 px-2 py-0.5 rounded text-indigo-600 dark:text-indigo-400">
                    {detail.appKey}
                  </span>
                )}
              </div>

              {/* Scriban tip */}
              <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-900 mb-4">
                <Info size={14} className="text-blue-500 mt-0.5 shrink-0" />
                <span className="text-xs text-blue-700 dark:text-blue-300">
                  <strong>Scriban syntax:</strong> Use {'{{ variable_name }}'}, {'{{ for item in details }}'}...{'{{ end }}'}, {'{{ if condition }}'}...{'{{ end }}'}
                </span>
              </div>

              {/* Subject */}
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                Subject
              </label>
              <input
                type="text"
                value={editSubject}
                onChange={(e) => setEditSubject(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-4"
              />

              {/* Body */}
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                Body
              </label>
              <div className="relative">
                <textarea
                  value={editBody}
                  onChange={(e) => setEditBody(e.target.value)}
                  rows={20}
                  className="w-full px-4 py-3 text-sm border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 font-mono leading-relaxed resize-y focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  spellCheck={false}
                />
                {/* Line numbers overlay hint */}
                <div className="absolute top-3 left-0 w-8 text-right pr-1 pointer-events-none select-none">
                  {editBody.split('\n').slice(0, 30).map((_, i) => (
                    <div key={i} className="text-[10px] text-gray-300 dark:text-gray-700 leading-relaxed">
                      {i + 1}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Sample data & preview */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                  Sample Data (JSON)
                </label>
                <textarea
                  value={sampleData}
                  onChange={(e) => setSampleData(e.target.value)}
                  rows={12}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 font-mono resize-y focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  spellCheck={false}
                />
                <button
                  onClick={handlePreview}
                  disabled={previewing}
                  className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                  {previewing ? (
                    <RefreshCw size={14} className="animate-spin" />
                  ) : (
                    <Eye size={14} />
                  )}
                  Live Preview
                </button>
              </div>

              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                  Rendered Preview
                </label>
                {previewHtml ? (
                  <iframe
                    srcDoc={typeof previewHtml === 'string' ? previewHtml : JSON.stringify(previewHtml)}
                    className="w-full h-80 border border-gray-200 dark:border-gray-700 rounded-lg bg-white"
                    sandbox="allow-same-origin"
                    title="Template preview"
                  />
                ) : (
                  <div className="w-full h-80 flex items-center justify-center border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-400">
                    Click "Live Preview" to render
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-20 text-gray-400">Template not found</div>
        )}
      </div>
    );
  }

  // List view
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Templates</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Email & SMS notification templates
          </p>
        </div>
        <button
          onClick={fetchTemplates}
          className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <RefreshCw size={16} />
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search templates..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <RefreshCw size={24} className="animate-spin text-indigo-500" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <AlertCircle size={32} className="text-red-400" />
            <p className="text-sm text-gray-500">{error}</p>
            <button
              onClick={fetchTemplates}
              className="text-sm px-4 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              Retry
            </button>
          </div>
        ) : filteredTemplates.length === 0 ? (
          <div className="text-center py-20 text-gray-400 dark:text-gray-500 text-sm">
            No templates found
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800">
                  <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">
                    Template Code
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">
                    Language
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">
                    App
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">
                    Subject
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredTemplates.map((t) => (
                  <tr
                    key={t.id}
                    onClick={() => openTemplate(t.id)}
                    className="border-b border-gray-100 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/30 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-4 font-mono text-xs font-medium text-indigo-600 dark:text-indigo-400">
                      {t.code || t.templateCode}
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">
                        {t.language || 'EN'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-xs text-gray-500 dark:text-gray-400">
                      {t.appKey || '—'}
                    </td>
                    <td className="py-3 px-4 max-w-[400px] truncate text-gray-600 dark:text-gray-300">
                      {t.subject || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
