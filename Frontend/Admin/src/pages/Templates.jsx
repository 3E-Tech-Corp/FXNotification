import { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft,
  RefreshCw,
  AlertCircle,
  Eye,
  FileText,
  Search,
  Info,
  Plus,
  Edit2,
  Save,
  X,
} from 'lucide-react';
import {
  getTemplates,
  getTemplate,
  createTemplate,
  updateTemplate,
  previewTemplate,
} from '../services/api';
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
  const [editCode, setEditCode] = useState('');
  const [editLang, setEditLang] = useState('en');
  const [editApp, setEditApp] = useState('');
  const [sampleData, setSampleData] = useState(defaultSampleData);
  const [previewHtml, setPreviewHtml] = useState(null);
  const [previewing, setPreviewing] = useState(false);
  const [savingDetail, setSavingDetail] = useState(false);

  // Create modal
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({
    eT_Code: '',
    lang_Code: 'en',
    subject: '',
    body: '',
    app_Code: '',
  });
  const [creating, setCreating] = useState(false);

  const fetchTemplates = useCallback(async () => {
    try {
      setError(null);
      const res = await getTemplates();
      setTemplates(res.data?.data || []);
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
      const d = res.data?.data;
      setDetail(d);
      setEditSubject(d?.subject || '');
      setEditBody(d?.body || '');
      setEditCode(d?.eT_Code || '');
      setEditLang(d?.lang_Code || 'en');
      setEditApp(d?.app_Code || '');
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
        bodyJson: JSON.stringify(parsedData.body || parsedData),
        detailJson: parsedData.details ? JSON.stringify(parsedData.details) : null,
      });
      const data = res.data?.data;
      setPreviewHtml(data?.body || data?.html || data);
      toast('Preview generated', 'success');
    } catch {
      toast('Failed to generate preview', 'error');
    } finally {
      setPreviewing(false);
    }
  };

  const handleSaveTemplate = async () => {
    if (!selectedId) return;
    try {
      setSavingDetail(true);
      await updateTemplate(selectedId, {
        eT_Code: editCode,
        lang_Code: editLang,
        subject: editSubject,
        body: editBody,
        app_Code: editApp,
      });
      toast('Template saved', 'success');
      fetchTemplates();
    } catch {
      toast('Failed to save template', 'error');
    } finally {
      setSavingDetail(false);
    }
  };

  const handleCreate = async () => {
    if (!createForm.eT_Code.trim()) {
      toast('Template code is required', 'error');
      return;
    }
    try {
      setCreating(true);
      await createTemplate(createForm);
      toast('Template created', 'success');
      setShowCreate(false);
      fetchTemplates();
    } catch {
      toast('Failed to create template', 'error');
    } finally {
      setCreating(false);
    }
  };

  const filteredTemplates = templates.filter(
    (t) =>
      !search ||
      (t.eT_Code || '').toLowerCase().includes(search.toLowerCase()) ||
      (t.subject || '').toLowerCase().includes(search.toLowerCase()) ||
      (t.lang_Code || '').toLowerCase().includes(search.toLowerCase()) ||
      (t.app_Code || '').toLowerCase().includes(search.toLowerCase())
  );

  // Detail / Editor view
  if (selectedId) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() => { setSelectedId(null); setDetail(null); setPreviewHtml(null); }}
            className="inline-flex items-center gap-1.5 text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            <ArrowLeft size={14} />
            Back to templates
          </button>
          <button
            onClick={handleSaveTemplate}
            disabled={savingDetail}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            {savingDetail ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
            Save Template
          </button>
        </div>

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
                <div className="flex items-center gap-2 flex-wrap">
                  <input
                    type="text"
                    value={editCode}
                    onChange={(e) => setEditCode(e.target.value)}
                    className="text-lg font-bold bg-transparent border-b border-dashed border-gray-300 dark:border-gray-600 focus:border-indigo-500 focus:outline-none px-1"
                    placeholder="Template Code"
                  />
                  <input
                    type="text"
                    value={editLang}
                    onChange={(e) => setEditLang(e.target.value)}
                    className="w-12 text-xs bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded text-gray-500 dark:text-gray-400 border border-transparent focus:border-indigo-500 focus:outline-none"
                    placeholder="en"
                  />
                  <input
                    type="text"
                    value={editApp}
                    onChange={(e) => setEditApp(e.target.value)}
                    className="w-24 text-xs bg-indigo-50 dark:bg-indigo-950 px-2 py-0.5 rounded text-indigo-600 dark:text-indigo-400 border border-transparent focus:border-indigo-500 focus:outline-none"
                    placeholder="App Code"
                  />
                </div>
              </div>

              {/* Scriban tip */}
              <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-900 mb-4">
                <Info size={14} className="text-blue-500 mt-0.5 shrink-0" />
                <span className="text-xs text-blue-700 dark:text-blue-300">
                  <strong>Scriban syntax:</strong> Use {'{{ variable_name }}'}, {'{{ for item in details }}'}...{'{{ end }}'}, {'{{ if condition }}'}...{'{{ end }}'}
                </span>
              </div>

              {/* Subject */}
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Subject</label>
              <input
                type="text"
                value={editSubject}
                onChange={(e) => setEditSubject(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-4"
              />

              {/* Body */}
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Body</label>
              <textarea
                value={editBody}
                onChange={(e) => setEditBody(e.target.value)}
                rows={20}
                className="w-full px-4 py-3 text-sm border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 font-mono leading-relaxed resize-y focus:outline-none focus:ring-2 focus:ring-indigo-500"
                spellCheck={false}
              />
            </div>

            {/* Sample data & preview */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Sample Data (JSON)</label>
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
                  {previewing ? <RefreshCw size={14} className="animate-spin" /> : <Eye size={14} />}
                  Live Preview
                </button>
              </div>

              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Rendered Preview</label>
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
          <p className="text-sm text-gray-500 dark:text-gray-400">Email & SMS notification templates</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchTemplates}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <RefreshCw size={16} />
          </button>
          <button
            onClick={() => {
              setCreateForm({ eT_Code: '', lang_Code: 'en', subject: '', body: '', app_Code: '' });
              setShowCreate(true);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700"
          >
            <Plus size={14} />
            New Template
          </button>
        </div>
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
            <button onClick={fetchTemplates} className="text-sm px-4 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
              Retry
            </button>
          </div>
        ) : filteredTemplates.length === 0 ? (
          <div className="text-center py-20 text-gray-400 dark:text-gray-500 text-sm">No templates found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800">
                  <Th>ID</Th>
                  <Th>Template Code</Th>
                  <Th>Language</Th>
                  <Th>App</Th>
                  <Th>Subject</Th>
                </tr>
              </thead>
              <tbody>
                {filteredTemplates.map((t) => (
                  <tr
                    key={t.eT_ID}
                    onClick={() => openTemplate(t.eT_ID)}
                    className="border-b border-gray-100 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/30 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-4 font-mono text-xs text-gray-500 dark:text-gray-400">{t.eT_ID}</td>
                    <td className="py-3 px-4 font-mono text-xs font-medium text-indigo-600 dark:text-indigo-400">
                      {t.eT_Code}
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">
                        {t.lang_Code || 'EN'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-xs text-gray-500 dark:text-gray-400">{t.app_Code || '—'}</td>
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

      {/* Create Modal */}
      {showCreate && (
        <Modal onClose={() => setShowCreate(false)}>
          <h3 className="text-lg font-semibold mb-4">New Template</h3>
          <div className="space-y-4">
            <FormField label="Template Code *" value={createForm.eT_Code} onChange={(v) => setCreateForm((p) => ({ ...p, eT_Code: v }))} placeholder="e.g., WELCOME_TPL" />
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Language" value={createForm.lang_Code} onChange={(v) => setCreateForm((p) => ({ ...p, lang_Code: v }))} placeholder="en" />
              <FormField label="App Code" value={createForm.app_Code} onChange={(v) => setCreateForm((p) => ({ ...p, app_Code: v }))} placeholder="Optional" />
            </div>
            <FormField label="Subject" value={createForm.subject} onChange={(v) => setCreateForm((p) => ({ ...p, subject: v }))} placeholder="Email subject line" />
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Body</label>
              <textarea
                value={createForm.body}
                onChange={(e) => setCreateForm((p) => ({ ...p, body: e.target.value }))}
                rows={8}
                placeholder="Template body (HTML with Scriban)"
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 font-mono resize-y focus:outline-none focus:ring-2 focus:ring-indigo-500"
                spellCheck={false}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={creating}
              className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              {creating && <RefreshCw size={12} className="inline animate-spin mr-1" />}
              Create Template
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Th({ children }) {
  return (
    <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">
      {children}
    </th>
  );
}

function FormField({ label, value, onChange, placeholder, type = 'text' }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />
    </div>
  );
}

function Modal({ children, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-end mb-2">
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
