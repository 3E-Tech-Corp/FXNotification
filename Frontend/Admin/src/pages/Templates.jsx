import { useState, useEffect, useCallback } from 'react';
import { Plus, Edit2, X, Loader2, RefreshCw, Eye } from 'lucide-react';
import { useToast } from '../App';
import { getTemplates, getTemplate, createTemplate, updateTemplate, previewTemplate } from '../services/api';

export default function Templates() {
  const toast = useToast();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(null);
  const [previewing, setPreviewing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getTemplates();
      setTemplates(data || []);
    } catch {
      toast('Failed to load templates', 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const openEdit = async (tpl) => {
    try {
      // Fetch full template with body
      const full = await getTemplate(tpl.eT_ID);
      setEditing(full);
    } catch {
      toast('Failed to load template', 'error');
    }
  };

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      if (editing.eT_ID) {
        await updateTemplate(editing.eT_ID, editing);
        toast('Template updated', 'success');
      } else {
        await createTemplate(editing);
        toast('Template created', 'success');
      }
      setEditing(null);
      load();
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to save template', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handlePreview = async () => {
    if (!editing) return;
    setPreviewing(true);
    try {
      const result = await previewTemplate({
        templateId: editing.eT_ID || null,
        templateCode: editing.eT_Code,
        bodyJson: '{}',
        detailJson: '[]',
      });
      setPreview(result);
    } catch (err) {
      toast(err.response?.data?.message || 'Preview failed', 'error');
    } finally {
      setPreviewing(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Email Templates</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Scriban-powered email templates</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
            <RefreshCw size={16} />
          </button>
          <button onClick={() => setEditing({ lang_Code: 'en' })}
            className="flex items-center gap-2 px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700">
            <Plus size={16} /> Add Template
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader2 size={24} className="animate-spin text-indigo-500" /></div>
        ) : templates.length === 0 ? (
          <div className="text-center py-20 text-gray-400 text-sm">No templates configured</div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {templates.map((tpl) => (
              <div key={tpl.eT_ID} className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800/30">
                <div>
                  <p className="font-medium">{tpl.eT_Code}</p>
                  <p className="text-sm text-gray-500">{tpl.subject} ({tpl.lang_Code})</p>
                  {tpl.app_Code && <p className="text-sm text-gray-400">App: {tpl.app_Code}</p>}
                </div>
                <button onClick={() => openEdit(tpl)}
                  className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950 rounded">
                  <Edit2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-2xl w-full m-4 max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b dark:border-gray-800 flex items-center justify-between">
              <h3 className="font-semibold">{editing.eT_ID ? 'Edit' : 'Add'} Template</h3>
              <button onClick={() => { setEditing(null); setPreview(null); }}><X size={20} /></button>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Template Code</label>
                  <input type="text" value={editing.eT_Code || ''} onChange={(e) => setEditing({ ...editing, eT_Code: e.target.value })}
                    className="w-full px-3 py-2 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
                    placeholder="WELCOME_EMAIL" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Language</label>
                  <input type="text" value={editing.lang_Code || 'en'} onChange={(e) => setEditing({ ...editing, lang_Code: e.target.value })}
                    className="w-full px-3 py-2 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">App Code</label>
                <input type="text" value={editing.app_Code || ''} onChange={(e) => setEditing({ ...editing, app_Code: e.target.value })}
                  className="w-full px-3 py-2 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
                  placeholder="(optional)" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Subject</label>
                <input type="text" value={editing.subject || ''} onChange={(e) => setEditing({ ...editing, subject: e.target.value })}
                  className="w-full px-3 py-2 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium">Body (HTML with Scriban)</label>
                  {editing.eT_ID && (
                    <button onClick={handlePreview} disabled={previewing}
                      className="flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 hover:underline">
                      {previewing ? <Loader2 size={12} className="animate-spin" /> : <Eye size={12} />}
                      Preview
                    </button>
                  )}
                </div>
                <textarea value={editing.body || ''} onChange={(e) => setEditing({ ...editing, body: e.target.value })}
                  className="w-full px-3 py-2 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 font-mono text-sm"
                  rows={12} />
              </div>
              {/* Preview Panel */}
              {preview && (
                <div className="border dark:border-gray-700 rounded-lg overflow-hidden">
                  <div className="px-3 py-2 bg-gray-50 dark:bg-gray-800 text-sm font-medium border-b dark:border-gray-700">
                    Preview: {preview.subject}
                  </div>
                  <div className="p-3 bg-white dark:bg-gray-900 text-sm" dangerouslySetInnerHTML={{ __html: preview.body }} />
                </div>
              )}
            </div>
            <div className="p-4 border-t dark:border-gray-800 flex justify-end gap-2">
              <button onClick={() => { setEditing(null); setPreview(null); }} className="px-4 py-2 border dark:border-gray-700 rounded-lg text-sm">Cancel</button>
              <button onClick={handleSave} disabled={saving}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2">
                {saving && <Loader2 size={14} className="animate-spin" />}
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
