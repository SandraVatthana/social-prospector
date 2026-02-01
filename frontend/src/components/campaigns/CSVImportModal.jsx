import { useState, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  X,
  Upload,
  FileSpreadsheet,
  ArrowRight,
  ArrowLeft,
  Check,
  AlertCircle,
  Loader2,
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || '';

const FIELD_OPTIONS = [
  { value: '', label: '-- Ignorer --' },
  { value: 'username', label: 'Identifiant LinkedIn *' },
  { value: 'full_name', label: 'Nom complet' },
  { value: 'company', label: 'Entreprise' },
  { value: 'job_title', label: 'Poste' },
  { value: 'location', label: 'Localisation' },
  { value: 'bio', label: 'Bio / À propos' },
  { value: 'profile_url', label: 'URL du profil' },
  { value: 'notes', label: 'Notes' },
  { value: 'tags', label: 'Tags (séparés par virgule)' },
];

export default function CSVImportModal({ campaignId, onClose, onImportComplete }) {
  const { token } = useAuth();
  const [step, setStep] = useState('upload');
  const [file, setFile] = useState(null);
  const [csvData, setCsvData] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [mapping, setMapping] = useState({});
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [error, setError] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  function parseCSV(text) {
    const lines = text.split(/\r?\n/).filter(line => line.trim());
    return lines.map(line => {
      const result = [];
      let current = '';
      let inQuotes = false;

      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if ((char === ',' || char === ';') && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    });
  }

  function handleFileSelect(selectedFile) {
    setError(null);
    if (!selectedFile.name.endsWith('.csv')) {
      setError('Veuillez sélectionner un fichier CSV');
      return;
    }

    setFile(selectedFile);
    const reader = new FileReader();
    reader.onload = e => {
      const text = e.target?.result;
      const parsed = parseCSV(text);

      if (parsed.length < 2) {
        setError('Le fichier doit contenir au moins un en-tête et une ligne de données');
        return;
      }

      const headerRow = parsed[0];
      const dataRows = parsed.slice(1);

      setHeaders(headerRow);
      setCsvData(dataRows);

      // Auto-mapping
      const autoMapping = {};
      headerRow.forEach((header, index) => {
        const h = header.toLowerCase().trim();
        if (h.includes('linkedin') || h.includes('username') || h.includes('identifiant') || h.includes('profile') || h.includes('profil')) {
          autoMapping[index] = 'username';
        } else if (h.includes('name') || h.includes('nom') || h.includes('prénom')) {
          autoMapping[index] = 'full_name';
        } else if (h.includes('company') || h.includes('entreprise') || h.includes('société')) {
          autoMapping[index] = 'company';
        } else if (h.includes('title') || h.includes('poste') || h.includes('fonction') || h.includes('job')) {
          autoMapping[index] = 'job_title';
        } else if (h.includes('location') || h.includes('lieu') || h.includes('ville')) {
          autoMapping[index] = 'location';
        } else if (h.includes('bio') || h.includes('about') || h.includes('propos') || h.includes('description')) {
          autoMapping[index] = 'bio';
        } else if (h.includes('url') || h.includes('lien')) {
          autoMapping[index] = 'profile_url';
        } else if (h.includes('note')) {
          autoMapping[index] = 'notes';
        } else if (h.includes('tag')) {
          autoMapping[index] = 'tags';
        }
      });

      setMapping(autoMapping);
      setStep('mapping');
    };
    reader.readAsText(selectedFile);
  }

  function handleDragOver(e) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave(e) {
    e.preventDefault();
    setIsDragging(false);
  }

  function handleDrop(e) {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) handleFileSelect(droppedFile);
  }

  function hasUsernameMapping() {
    return Object.values(mapping).includes('username');
  }

  function getMappedData() {
    return csvData
      .map(row => {
        const mapped = {};
        Object.entries(mapping).forEach(([colIndex, field]) => {
          if (field && row[parseInt(colIndex)]) {
            mapped[field] = row[parseInt(colIndex)];
          }
        });
        return mapped;
      })
      .filter(row => row.username);
  }

  async function handleImport() {
    setImporting(true);
    setError(null);
    setStep('importing');

    try {
      const prospects = getMappedData();

      const res = await fetch(`${API_URL}/api/prospects/import-csv`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ prospects, campaign_id: campaignId }),
      });

      const json = await res.json();

      if (!json.success) {
        throw new Error(json.error?.message || 'Erreur lors de l\'import');
      }

      setImportResult(json.data);
      setStep('done');
      onImportComplete(json.data.imported);
    } catch (err) {
      setError(err.message || 'Erreur lors de l\'import');
      setStep('preview');
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-warm-100">
          <div>
            <h2 className="text-xl font-bold text-warm-900">Importer des prospects</h2>
            <p className="text-sm text-warm-500">
              {step === 'upload' && 'Étape 1/4 - Sélectionner un fichier'}
              {step === 'mapping' && 'Étape 2/4 - Mapper les colonnes'}
              {step === 'preview' && 'Étape 3/4 - Vérifier les données'}
              {step === 'importing' && 'Étape 4/4 - Import en cours'}
              {step === 'done' && 'Import terminé'}
            </p>
          </div>
          <button onClick={onClose} className="p-2 text-warm-400 hover:text-warm-600 hover:bg-warm-100 rounded-lg">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Upload Step */}
          {step === 'upload' && (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors ${
                isDragging ? 'border-brand-500 bg-brand-50' : 'border-warm-200 hover:border-warm-300'
              }`}
            >
              <FileSpreadsheet className="mx-auto text-warm-400 mb-4" size={48} />
              <p className="text-lg font-medium text-warm-700 mb-2">Glissez votre fichier CSV ici</p>
              <p className="text-warm-500 mb-4">ou</p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-6 py-2.5 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors font-medium"
              >
                Parcourir
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={e => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                className="hidden"
              />
              <p className="text-xs text-warm-400 mt-4">Formats acceptés: CSV avec séparateur virgule ou point-virgule</p>
            </div>
          )}

          {/* Mapping Step */}
          {step === 'mapping' && (
            <div>
              <div className="bg-brand-50 rounded-lg p-4 mb-6">
                <p className="text-sm text-brand-700">
                  <strong>{csvData.length}</strong> lignes détectées dans <strong>{file?.name}</strong>
                </p>
              </div>

              <p className="text-sm text-warm-600 mb-4">Associez les colonnes du CSV aux champs des prospects:</p>

              <div className="space-y-3">
                {headers.map((header, index) => (
                  <div key={index} className="flex items-center gap-4">
                    <div className="w-1/3">
                      <span className="text-sm font-medium text-warm-700 truncate block">{header || `Colonne ${index + 1}`}</span>
                      <span className="text-xs text-warm-400 truncate block">Ex: {csvData[0]?.[index] || '-'}</span>
                    </div>
                    <ArrowRight className="text-warm-400 flex-shrink-0" size={16} />
                    <select
                      value={mapping[index] || ''}
                      onChange={e => setMapping({ ...mapping, [index]: e.target.value })}
                      className="flex-1 px-3 py-2 border border-warm-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                    >
                      {FIELD_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>

              {!hasUsernameMapping() && (
                <div className="mt-4 p-3 bg-yellow-50 rounded-lg flex items-start gap-2">
                  <AlertCircle className="text-yellow-600 flex-shrink-0 mt-0.5" size={16} />
                  <p className="text-sm text-yellow-700">Vous devez mapper au moins une colonne vers "Identifiant LinkedIn"</p>
                </div>
              )}
            </div>
          )}

          {/* Preview Step */}
          {step === 'preview' && (
            <div>
              <div className="bg-green-50 rounded-lg p-4 mb-6">
                <p className="text-sm text-green-700">
                  <strong>{getMappedData().length}</strong> prospects prêts à être importés
                  {getMappedData().length < csvData.length && (
                    <span className="text-yellow-600 ml-2">
                      ({csvData.length - getMappedData().length} ignorés - identifiant manquant)
                    </span>
                  )}
                </p>
              </div>

              <p className="text-sm text-warm-600 mb-4">Aperçu des 5 premiers:</p>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-warm-50">
                    <tr>
                      {Object.values(mapping)
                        .filter(Boolean)
                        .map((field, i) => (
                          <th key={i} className="text-left px-3 py-2 font-medium text-warm-600">
                            {FIELD_OPTIONS.find(f => f.value === field)?.label || field}
                          </th>
                        ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-warm-100">
                    {getMappedData()
                      .slice(0, 5)
                      .map((row, i) => (
                        <tr key={i}>
                          {Object.entries(mapping)
                            .filter(([, field]) => field)
                            .map(([, field]) => (
                              <td key={field} className="px-3 py-2 text-warm-700 truncate max-w-[150px]">
                                {row[field] || '-'}
                              </td>
                            ))}
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>

              {error && (
                <div className="mt-4 p-3 bg-red-50 rounded-lg flex items-start gap-2">
                  <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={16} />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}
            </div>
          )}

          {/* Importing Step */}
          {step === 'importing' && (
            <div className="text-center py-12">
              <Loader2 className="mx-auto text-brand-600 animate-spin mb-4" size={48} />
              <p className="text-lg font-medium text-warm-700">Import en cours...</p>
              <p className="text-warm-500">Veuillez patienter</p>
            </div>
          )}

          {/* Done Step */}
          {step === 'done' && importResult && (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center mb-4">
                <Check className="text-green-600" size={32} />
              </div>
              <p className="text-lg font-medium text-warm-900 mb-2">Import terminé !</p>
              <p className="text-warm-600 mb-1">
                <strong>{importResult.imported}</strong> nouveau(x) prospect(s) importé(s)
              </p>
              {importResult.existing > 0 && <p className="text-sm text-warm-500">{importResult.existing} déjà existant(s)</p>}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-warm-100 bg-warm-50">
          <div>
            {step === 'mapping' && (
              <button
                onClick={() => {
                  setStep('upload');
                  setFile(null);
                  setCsvData([]);
                  setHeaders([]);
                  setMapping({});
                }}
                className="flex items-center gap-2 px-4 py-2 text-warm-600 hover:text-warm-800"
              >
                <ArrowLeft size={18} /> Retour
              </button>
            )}
            {step === 'preview' && (
              <button onClick={() => setStep('mapping')} className="flex items-center gap-2 px-4 py-2 text-warm-600 hover:text-warm-800">
                <ArrowLeft size={18} /> Retour
              </button>
            )}
          </div>

          <div className="flex gap-3">
            {step !== 'done' && step !== 'importing' && (
              <button onClick={onClose} className="px-4 py-2 text-warm-600 hover:text-warm-800">
                Annuler
              </button>
            )}

            {step === 'mapping' && (
              <button
                onClick={() => setStep('preview')}
                disabled={!hasUsernameMapping()}
                className="flex items-center gap-2 px-6 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Suivant <ArrowRight size={18} />
              </button>
            )}

            {step === 'preview' && (
              <button
                onClick={handleImport}
                disabled={importing || getMappedData().length === 0}
                className="flex items-center gap-2 px-6 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors disabled:opacity-50"
              >
                <Upload size={18} /> Importer {getMappedData().length} prospect(s)
              </button>
            )}

            {step === 'done' && (
              <button onClick={onClose} className="px-6 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors">
                Fermer
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
