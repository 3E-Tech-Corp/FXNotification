import { useState, useEffect } from 'react';
import {
  Eye,
  Send,
  RefreshCw,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import { getTemplates, previewTemplate, queueNotification } from '../services/api';
import { useToast } from '../App';

const defaultBodyData = JSON.stringify(
  {
    name: 'John Doe',
    company: 'Acme Corp',
    date: '2025-01-15',
    amount: '1,250.00',
  },
  null,
  2
);

const defaultDetailData = JSON.stringify(
  [
    { description: 'Widget A', quantity: 2, unitPrice: '500.00' },
    { description: 'Widget B', quantity: 1, unitPrice: '250.00' },
  ],
  null,
  2
);

export default function TemplatePreview() {
  const toast = useToast();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [bodyData, setBodyData] = useState(defaultBodyData);
  const [detailData, setDetailData] = useState(defaultDetailData);
  const [previewResult, setPreviewResult] = useState(null);
  const [previewing, setPreviewing] = useState(false);
  const [sending, setSending] = useState(false);
  const [testEmail, setTestEmail] = useState('');

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const res = await getTemplates();
        setTemplates(res.data || []);
      } catch {
        toast('Failed to load templates', 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchTemplates();
  }, []);

  const parseJson = (str) => {
    try {
      return JSON.parse(str);
    } catch {
      return null;
    }
  };

  const handlePreview = async () => {
    if (!selectedTemplateId) {
      toast('Please select a template', 'error');
      return;
    }
    const body = parseJson(bodyData);
    if (body === null) {
      toast('Invalid JSON in body data', 'error');
      return;
    }
    const detail = detailData.trim() ? parseJson(detailData) : undefined;
    if (detailData.trim() && detail === null) {
      toast('Invalid JSON in detail data', 'error');
      return;
    }

    setPreviewing(true);
    try {
      const res = await previewTemplate({
        templateId: selectedTemplateId,
        data: { body, details: detail },
      });
      setPreviewResult(res.data);
      toast('Preview generated', 'success');
    } catch {
      toast('Failed to generate preview', 'error');
    } finally {
      setPreviewing(false);
    }
  };

  const handleSendTest = async () => {
    if (!testEmail) {
      toast('Please enter a test email address', 'error');
      return;
    }
    if (!selectedTemplateId) {
      toast('Please select a template first', 'error');
      return;
    }
    const body = parseJson(bodyData);
    if (body === null) {
      toast('Invalid JSON in body data', 'error');
      return;
    }
    const detail = detailData.trim() ? parseJson(detailData) : undefined;

    setSending(true);
    try {
      await queueNotification({
        templateId: selectedTemplateId,
        to: testEmail,
        data: { body, details: detail },
      });
      toast('Test notification queued!', 'success');
    } catch {
      toast('Failed to queue test notification', 'error');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Template Preview</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Preview & test email templates with sample data
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input panel */}
        <div className="space-y-4">
          {/* Template selector */}
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wider">
              Select Template
            </label>
            {loading ? (
              <div className="flex items-center gap-2 py-2 text-gray-400">
                <RefreshCw size={14} className="animate-spin" />
                Loading templates...
              </div>
            ) : (
              <select
                value={selectedTemplateId}
                onChange={(e) => setSelectedTemplateId(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">-- Choose a template --</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.code || t.templateCode} ({t.language || 'EN'})
                    {t.appKey ? ` — ${t.appKey}` : ''}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Body data */}
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wider">
              Body Data (JSON)
            </label>
            <textarea
              value={bodyData}
              onChange={(e) => setBodyData(e.target.value)}
              rows={8}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 font-mono resize-y focus:outline-none focus:ring-2 focus:ring-indigo-500"
              spellCheck={false}
              placeholder='{"key": "value"}'
            />
          </div>

          {/* Detail data */}
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wider">
              Detail Data (JSON, Optional)
            </label>
            <textarea
              value={detailData}
              onChange={(e) => setDetailData(e.target.value)}
              rows={6}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 font-mono resize-y focus:outline-none focus:ring-2 focus:ring-indigo-500"
              spellCheck={false}
              placeholder='[{"item": "value"}]'
            />
          </div>

          {/* Actions */}
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 space-y-4">
            <button
              onClick={handlePreview}
              disabled={previewing || !selectedTemplateId}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              {previewing ? (
                <RefreshCw size={16} className="animate-spin" />
              ) : (
                <Eye size={16} />
              )}
              Preview Template
            </button>

            <div className="border-t border-gray-200 dark:border-gray-800 pt-4">
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                Send Test To
              </label>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="test@example.com"
                  className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  onClick={handleSendTest}
                  disabled={sending || !testEmail || !selectedTemplateId}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50 shrink-0"
                >
                  {sending ? (
                    <RefreshCw size={14} className="animate-spin" />
                  ) : (
                    <Send size={14} />
                  )}
                  Send Test
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Preview panel */}
        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
            <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wider">
              Rendered Preview
            </h3>

            {previewResult ? (
              <div className="space-y-4">
                {/* Subject */}
                {(previewResult.renderedSubject || previewResult.subject) && (
                  <div>
                    <span className="text-xs text-gray-400 dark:text-gray-500 block mb-1">Subject:</span>
                    <div className="text-sm font-medium bg-gray-50 dark:bg-gray-800 px-3 py-2 rounded-lg">
                      {previewResult.renderedSubject || previewResult.subject}
                    </div>
                  </div>
                )}

                {/* HTML Body */}
                <div>
                  <span className="text-xs text-gray-400 dark:text-gray-500 block mb-1">Body:</span>
                  <iframe
                    srcDoc={
                      typeof (previewResult.renderedBody || previewResult.html || previewResult) === 'string'
                        ? previewResult.renderedBody || previewResult.html || previewResult
                        : ''
                    }
                    className="w-full h-[500px] border border-gray-200 dark:border-gray-700 rounded-lg bg-white"
                    sandbox="allow-same-origin"
                    title="Template preview"
                  />
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-[400px] text-gray-400 dark:text-gray-500">
                <Eye size={48} className="mb-3 opacity-30" />
                <p className="text-sm">Select a template and click "Preview"</p>
                <p className="text-xs mt-1">The rendered HTML will appear here</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
