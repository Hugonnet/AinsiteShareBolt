import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Calendar, MapPin, Building, Filter, X, Download, Trash2, Edit2, Save, XCircle, FileText } from 'lucide-react';
import JSZip from 'jszip';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

function ProjectFiles({ submissionId }: { submissionId: string }) {
  const [files, setFiles] = useState<Array<{ name: string; url: string }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadFiles = async () => {
      try {
        console.log('=== Loading files for submission:', submissionId);
        const { data, error } = await supabase.storage
          .from('construction-files')
          .list(submissionId);

        console.log('=== Files list result:');
        console.log('  - Data:', data);
        console.log('  - Data length:', data?.length);
        console.log('  - Error:', error);

        if (error) {
          console.error('=== Storage list error:', error);
          return;
        }

        if (data && data.length > 0) {
          console.log('=== Found', data.length, 'files');
          const fileUrls = data.map(file => {
            const { data: urlData } = supabase.storage
              .from('construction-files')
              .getPublicUrl(`${submissionId}/${file.name}`);
            console.log('  - File:', file.name, '-> URL:', urlData.publicUrl);
            return {
              name: file.name,
              url: urlData.publicUrl,
            };
          });
          setFiles(fileUrls);
        } else {
          console.log('=== No files found in data');
        }
      } catch (error) {
        console.error('=== Exception loading files:', error);
      } finally {
        setLoading(false);
      }
    };

    loadFiles();
  }, [submissionId]);

  if (loading) {
    return (
      <div>
        <h3 className="text-lg font-semibold mb-2">Photos et fichiers</h3>
        <div className="bg-zinc-800 rounded-lg p-4 text-center text-gray-400">
          Chargement des fichiers...
        </div>
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div>
        <h3 className="text-lg font-semibold mb-2">Photos et fichiers</h3>
        <div className="bg-zinc-800 rounded-lg p-4 text-center text-gray-400">
          Aucun fichier trouvé pour ce projet
        </div>
      </div>
    );
  }

  const isImage = (filename: string) => {
    return /\.(jpg|jpeg|png|gif|webp)$/i.test(filename);
  };

  return (
    <div>
      <h3 className="text-lg font-semibold mb-2">Photos et fichiers</h3>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {files.map((file) => (
          <div key={file.name} className="bg-zinc-800 rounded-lg overflow-hidden">
            {isImage(file.name) ? (
              <a href={file.url} target="_blank" rel="noopener noreferrer">
                <img
                  src={file.url}
                  alt={file.name}
                  className="w-full h-40 object-cover hover:opacity-80 transition-opacity cursor-pointer"
                />
              </a>
            ) : (
              <a
                href={file.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center justify-center h-40 hover:bg-zinc-700 transition-colors"
              >
                <FileText className="w-12 h-12 text-gray-400 mb-2" />
                <span className="text-sm text-gray-400 px-2 text-center truncate w-full">
                  {file.name}
                </span>
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

interface Submission {
  id: string;
  entreprise: string;
  ville: string;
  departement: string;
  type_projet: string;
  message: string;
  latitude: number | null;
  longitude: number | null;
  audio_description_url: string | null;
  video_url: string | null;
  created_at: string;
}

export function AdminPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [filteredSubmissions, setFilteredSubmissions] = useState<Submission[]>([]);
  const [companies, setCompanies] = useState<string[]>([]);
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [editingSubmission, setEditingSubmission] = useState<Submission | null>(null);
  const [editForm, setEditForm] = useState<Partial<Submission>>({});
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    loadSubmissions();
  }, []);

  useEffect(() => {
    if (selectedCompanies.length === 0) {
      setFilteredSubmissions(submissions);
    } else {
      setFilteredSubmissions(
        submissions.filter(s => selectedCompanies.includes(s.entreprise))
      );
    }
  }, [selectedCompanies, submissions]);

  const loadSubmissions = async () => {
    try {
      const { data, error } = await supabase
        .from('file_submissions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setSubmissions(data || []);

      const uniqueCompanies = [...new Set(data?.map(s => s.entreprise) || [])];
      setCompanies(uniqueCompanies);
    } catch (error) {
      console.error('Error loading submissions:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleCompany = (company: string) => {
    setSelectedCompanies(prev =>
      prev.includes(company)
        ? prev.filter(c => c !== company)
        : [...prev, company]
    );
  };

  const downloadArchive = async (submission: Submission) => {
    setDownloadingId(submission.id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-archive`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            submissionId: submission.id,
            ville: submission.ville,
            departement: submission.departement,
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.files && data.files.length > 0) {
          const zip = new JSZip();

          for (const file of data.files) {
            try {
              const fileResponse = await fetch(file.url);
              const blob = await fileResponse.blob();
              zip.file(file.name, blob);
            } catch (err) {
              console.error(`Error downloading file ${file.name}:`, err);
            }
          }

          const zipBlob = await zip.generateAsync({ type: 'blob' });
          const url = URL.createObjectURL(zipBlob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${data.archiveName}.zip`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        } else {
          alert('Erreur: Aucun fichier à télécharger');
        }
      } else {
        const errorData = await response.json();
        alert(`Erreur lors de la création de l'archive: ${errorData.error || 'Erreur inconnue'}`);
      }
    } catch (error) {
      console.error('Error downloading archive:', error);
      alert('Erreur lors du téléchargement de l\'archive');
    } finally {
      setDownloadingId(null);
    }
  };

  const deleteSubmission = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce projet ?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('file_submissions')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setSelectedSubmission(null);
      await loadSubmissions();
      alert('Projet supprimé avec succès');
    } catch (error) {
      console.error('Error deleting submission:', error);
      alert('Erreur lors de la suppression');
    }
  };

  const startEditing = (submission: Submission) => {
    setEditingSubmission(submission);
    setEditForm({
      entreprise: submission.entreprise,
      ville: submission.ville,
      departement: submission.departement,
      type_projet: submission.type_projet,
      message: submission.message,
    });
  };

  const cancelEditing = () => {
    setEditingSubmission(null);
    setEditForm({});
  };

  const saveEdit = async () => {
    if (!editingSubmission) return;

    try {
      const { error } = await supabase
        .from('file_submissions')
        .update({
          entreprise: editForm.entreprise,
          ville: editForm.ville,
          departement: editForm.departement,
          type_projet: editForm.type_projet,
          message: editForm.message,
        })
        .eq('id', editingSubmission.id);

      if (error) throw error;

      setEditingSubmission(null);
      setEditForm({});
      if (selectedSubmission?.id === editingSubmission.id) {
        setSelectedSubmission(null);
      }
      await loadSubmissions();
      alert('Projet modifié avec succès');
    } catch (error) {
      console.error('Error updating submission:', error);
      alert('Erreur lors de la modification');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <p className="text-white">Chargement...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Administration - Projets</h1>

        <div className="bg-zinc-900 rounded-xl p-6 border border-gray-800 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <Filter className="w-5 h-5 text-gray-400" />
            <h2 className="text-xl font-semibold">Filtrer par entreprise</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {companies.map(company => (
              <button
                key={company}
                onClick={() => toggleCompany(company)}
                className={`px-4 py-2 rounded-lg border transition-all ${
                  selectedCompanies.includes(company)
                    ? 'bg-red-600 border-red-500 text-white'
                    : 'bg-zinc-800 border-gray-700 text-gray-300 hover:border-gray-600'
                }`}
              >
                {company}
              </button>
            ))}
            {selectedCompanies.length > 0 && (
              <button
                onClick={() => setSelectedCompanies([])}
                className="px-4 py-2 rounded-lg border border-gray-700 bg-zinc-800 text-gray-300 hover:border-gray-600 flex items-center gap-2"
              >
                <X className="w-4 h-4" />
                Réinitialiser
              </button>
            )}
          </div>
          <p className="text-gray-500 text-sm mt-3">
            {filteredSubmissions.length} projet(s) affiché(s)
          </p>
        </div>

        <div className="grid gap-4">
          {filteredSubmissions.map(submission => (
            <div
              key={submission.id}
              className="bg-zinc-900 rounded-xl p-6 border border-gray-800 hover:border-gray-700 transition-all cursor-pointer"
              onClick={() => setSelectedSubmission(submission)}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <Building className="w-5 h-5 text-red-500" />
                    <h3 className="text-xl font-semibold">{submission.entreprise}</h3>
                  </div>
                  <div className="flex items-center gap-4 text-gray-400 text-sm">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      {new Date(submission.created_at).toLocaleDateString('fr-FR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                    {submission.ville && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        {submission.ville} ({submission.departement})
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      startEditing(submission);
                    }}
                    className="px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center gap-2 transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteSubmission(submission.id);
                    }}
                    className="px-3 py-2 bg-red-600 hover:bg-red-700 rounded-lg flex items-center gap-2 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      downloadArchive(submission);
                    }}
                    disabled={downloadingId === submission.id}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {downloadingId === submission.id ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4" />
                        Archive
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="flex gap-2">
                <span className="px-3 py-1 bg-zinc-800 rounded-full text-xs">
                  {submission.type_projet === 'neuf' ? 'Projet neuf' : 'Rénovation'}
                </span>
                {submission.audio_description_url && (
                  <span className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-xs">
                    Audio
                  </span>
                )}
                {submission.video_url && (
                  <span className="px-3 py-1 bg-purple-500/20 text-purple-400 rounded-full text-xs">
                    Vidéo
                  </span>
                )}
              </div>

              {submission.message && (
                <p className="text-gray-400 text-sm mt-3 line-clamp-2">
                  {submission.message}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {editingSubmission && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          onClick={cancelEditing}
        >
          <div
            className="bg-zinc-900 rounded-xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-800"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-6">
              <h2 className="text-2xl font-bold">Modifier le projet</h2>
              <button
                onClick={cancelEditing}
                className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Entreprise
                </label>
                <input
                  type="text"
                  value={editForm.entreprise || ''}
                  onChange={(e) => setEditForm({ ...editForm, entreprise: e.target.value })}
                  className="w-full px-4 py-3 bg-zinc-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Ville
                </label>
                <input
                  type="text"
                  value={editForm.ville || ''}
                  onChange={(e) => setEditForm({ ...editForm, ville: e.target.value })}
                  className="w-full px-4 py-3 bg-zinc-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Département
                </label>
                <input
                  type="text"
                  value={editForm.departement || ''}
                  onChange={(e) => setEditForm({ ...editForm, departement: e.target.value })}
                  className="w-full px-4 py-3 bg-zinc-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Type de projet
                </label>
                <select
                  value={editForm.type_projet || 'neuf'}
                  onChange={(e) => setEditForm({ ...editForm, type_projet: e.target.value })}
                  className="w-full px-4 py-3 bg-zinc-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="neuf">Projet neuf</option>
                  <option value="renovation">Rénovation</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Description
                </label>
                <textarea
                  value={editForm.message || ''}
                  onChange={(e) => setEditForm({ ...editForm, message: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-3 bg-zinc-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={cancelEditing}
                  className="flex-1 px-6 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors"
                >
                  <XCircle className="w-5 h-5" />
                  Annuler
                </button>
                <button
                  onClick={saveEdit}
                  className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors"
                >
                  <Save className="w-5 h-5" />
                  Enregistrer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedSubmission && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          onClick={() => setSelectedSubmission(null)}
        >
          <div
            className="bg-zinc-900 rounded-xl p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-gray-800"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold mb-2">{selectedSubmission.entreprise}</h2>
                <p className="text-gray-400">
                  {new Date(selectedSubmission.created_at).toLocaleDateString('fr-FR', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
              <button
                onClick={() => setSelectedSubmission(null)}
                className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-2">Informations</h3>
                <div className="bg-zinc-800 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Type de projet:</span>
                    <span>{selectedSubmission.type_projet === 'neuf' ? 'Projet neuf' : 'Rénovation'}</span>
                  </div>
                  {selectedSubmission.ville && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Localisation:</span>
                      <span>{selectedSubmission.ville}, {selectedSubmission.departement}</span>
                    </div>
                  )}
                  {selectedSubmission.latitude && selectedSubmission.longitude && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Coordonnées:</span>
                      <a
                        href={`https://www.google.com/maps?q=${selectedSubmission.latitude},${selectedSubmission.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:underline"
                      >
                        Voir sur Google Maps
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {selectedSubmission.message && (
                <div>
                  <h3 className="text-lg font-semibold mb-2">Description</h3>
                  <p className="bg-zinc-800 rounded-lg p-4">{selectedSubmission.message}</p>
                </div>
              )}

              <ProjectFiles submissionId={selectedSubmission.id} />

              {selectedSubmission.audio_description_url && (
                <div>
                  <h3 className="text-lg font-semibold mb-2">Message vocal</h3>
                  <audio src={selectedSubmission.audio_description_url} controls className="w-full" />
                </div>
              )}

              {selectedSubmission.video_url && (
                <div>
                  <h3 className="text-lg font-semibold mb-2">Vidéo</h3>
                  <video src={selectedSubmission.video_url} controls className="w-full rounded-lg" />
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => startEditing(selectedSubmission)}
                  className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors"
                >
                  <Edit2 className="w-5 h-5" />
                  Modifier
                </button>
                <button
                  onClick={() => deleteSubmission(selectedSubmission.id)}
                  className="flex-1 px-6 py-3 bg-red-600 hover:bg-red-700 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors"
                >
                  <Trash2 className="w-5 h-5" />
                  Supprimer
                </button>
                <button
                  onClick={() => downloadArchive(selectedSubmission)}
                  disabled={downloadingId === selectedSubmission.id}
                  className="flex-1 px-6 py-3 bg-green-600 hover:bg-green-700 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {downloadingId === selectedSubmission.id ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Création...
                    </>
                  ) : (
                    <>
                      <Download className="w-5 h-5" />
                      Archive
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
