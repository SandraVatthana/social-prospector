import { useState, useRef, useEffect } from 'react';
import { Download, FileSpreadsheet, FileText, FileJson, ChevronDown, Loader2 } from 'lucide-react';
import { API_BASE_URL } from '../../lib/api';

/**
 * Dropdown pour exporter les données en différents formats
 * @param {string} type - Type d'export: 'prospects', 'crm', 'icp'
 * @param {object} filters - Filtres optionnels à appliquer
 */
export default function ExportDropdown({ type = 'prospects', filters = {}, className = '' }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportingFormat, setExportingFormat] = useState(null);
  const dropdownRef = useRef(null);

  // Fermer le dropdown quand on clique ailleurs
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const exportFormats = [
    {
      id: 'csv',
      label: 'CSV (Tableur)',
      description: 'Excel, Google Sheets',
      icon: FileSpreadsheet,
      endpoint: `/${type}/csv`
    },
    {
      id: 'markdown',
      label: 'Markdown',
      description: 'Rapport formaté',
      icon: FileText,
      endpoint: `/${type}/markdown`
    }
  ];

  // Ajouter JSON seulement pour l'export complet
  if (type === 'full') {
    exportFormats.push({
      id: 'json',
      label: 'JSON',
      description: 'Données brutes',
      icon: FileJson,
      endpoint: '/full/json'
    });
  }

  const handleExport = async (format) => {
    setIsExporting(true);
    setExportingFormat(format.id);

    try {
      // Construire l'URL avec les filtres
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
      const queryString = params.toString();
      const url = `${API_BASE_URL}/export${format.endpoint}${queryString ? `?${queryString}` : ''}`;

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Erreur lors de l\'export');
      }

      // Récupérer le nom du fichier depuis les headers
      const contentDisposition = response.headers.get('Content-Disposition');
      const filenameMatch = contentDisposition?.match(/filename="(.+)"/);
      const filename = filenameMatch ? filenameMatch[1] : `export_${type}.${format.id}`;

      // Télécharger le fichier
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      setIsOpen(false);
    } catch (error) {
      console.error('Export error:', error);
      alert('Erreur lors de l\'export: ' + error.message);
    } finally {
      setIsExporting(false);
      setExportingFormat(null);
    }
  };

  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isExporting}
        className="flex items-center gap-2 px-4 py-2 bg-white border border-warm-200 hover:bg-warm-50 text-warm-700 font-medium rounded-xl transition-colors disabled:opacity-50"
      >
        {isExporting ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Download className="w-4 h-4" />
        )}
        <span className="hidden sm:inline">Exporter</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-white border border-warm-200 rounded-xl shadow-lg z-20 overflow-hidden">
          <div className="p-2 border-b border-warm-100 bg-warm-50">
            <p className="text-xs font-medium text-warm-500 uppercase tracking-wide">Format d'export</p>
          </div>
          <div className="p-1">
            {exportFormats.map((format) => (
              <button
                key={format.id}
                onClick={() => handleExport(format)}
                disabled={isExporting}
                className="w-full flex items-center gap-3 px-3 py-2 hover:bg-warm-50 rounded-lg transition-colors disabled:opacity-50"
              >
                {isExporting && exportingFormat === format.id ? (
                  <Loader2 className="w-5 h-5 text-brand-500 animate-spin" />
                ) : (
                  <format.icon className="w-5 h-5 text-warm-400" />
                )}
                <div className="text-left">
                  <p className="text-sm font-medium text-warm-700">{format.label}</p>
                  <p className="text-xs text-warm-400">{format.description}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
