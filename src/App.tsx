import { useState, useEffect } from 'react';
import { Upload, Send, Mic, Square, Trash2, Play, MapPin, AlertCircle, Video, X, CheckCircle, XCircle } from 'lucide-react';
import { useGeolocation } from './hooks/useGeolocation';
import { useAudioRecorder } from './hooks/useAudioRecorder';

function App() {
  const [formData, setFormData] = useState({
    entreprise: '',
    ville: '',
    departement: '',
    typeProjet: 'neuf',
    description: '',
  });
  const [files, setFiles] = useState<FileList | null>(null);
  const [filePreviews, setFilePreviews] = useState<string[]>([]);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoDuration, setVideoDuration] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [useAutoLocation, setUseAutoLocation] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const location = useGeolocation();
  const audioRecorder = useAudioRecorder();

  useEffect(() => {
    if (useAutoLocation && location.city && location.department) {
      setFormData(prev => ({
        ...prev,
        ville: location.city || '',
        departement: location.department || '',
      }));
    }
  }, [useAutoLocation, location.city, location.department]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleRadioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      typeProjet: e.target.value,
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(e.target.files);

      const previews: string[] = [];
      Array.from(e.target.files).forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          previews.push(reader.result as string);
          setFilePreviews([...previews]);
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const handleVideoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const video = document.createElement('video');
      video.preload = 'metadata';

      video.onloadedmetadata = () => {
        window.URL.revokeObjectURL(video.src);
        const duration = Math.floor(video.duration);

        if (duration > 40) {
          alert('La vidéo ne doit pas dépasser 40 secondes');
          e.target.value = '';
          return;
        }

        setVideoFile(file);
        setVideoDuration(duration);
      };

      video.src = URL.createObjectURL(file);
    }
  };

  const removeVideo = () => {
    setVideoFile(null);
    setVideoDuration(0);
    const videoInput = document.getElementById('video-upload') as HTMLInputElement;
    if (videoInput) videoInput.value = '';
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus('idle');
    setUploadProgress(0);

    try {
      setUploadProgress(10);
      const formDataToSend = new FormData();
      formDataToSend.append('entreprise', formData.entreprise);
      formDataToSend.append('ville', formData.ville);
      formDataToSend.append('departement', formData.departement);
      formDataToSend.append('typeProjet', formData.typeProjet);
      formDataToSend.append('description', formData.description);

      if (useAutoLocation && location.latitude && location.longitude) {
        formDataToSend.append('latitude', location.latitude.toString());
        formDataToSend.append('longitude', location.longitude.toString());
        formDataToSend.append('accuracy', location.accuracy?.toString() || '');
      }

      if (audioRecorder.audioBlob) {
        const audioFile = new File(
          [audioRecorder.audioBlob],
          `audio_${Date.now()}.webm`,
          { type: 'audio/webm' }
        );
        formDataToSend.append('audio', audioFile);
        formDataToSend.append('audioDuration', audioRecorder.recordingTime.toString());
      }

      if (videoFile) {
        formDataToSend.append('video', videoFile);
        formDataToSend.append('videoDuration', videoDuration.toString());
      }

      if (files) {
        for (let i = 0; i < files.length; i++) {
          formDataToSend.append('files', files[i]);
        }
      }

      setUploadProgress(30);

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-files`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: formDataToSend,
        }
      );

      setUploadProgress(70);

      if (!response.ok) {
        throw new Error('Échec de l\'envoi');
      }

      setUploadProgress(100);
      setSubmitStatus('success');
      setFormData({ entreprise: '', ville: '', departement: '', typeProjet: 'neuf', description: '' });
      setFiles(null);
      setFilePreviews([]);
      setVideoFile(null);
      setVideoDuration(0);
      setUseAutoLocation(false);
      audioRecorder.deleteRecording();
      const fileInput = document.getElementById('file-upload') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      const videoInput = document.getElementById('video-upload') as HTMLInputElement;
      if (videoInput) videoInput.value = '';

      setTimeout(() => {
        setSubmitStatus('idle');
        setUploadProgress(0);
      }, 5000);
    } catch (error) {
      console.error('Erreur:', error);
      setSubmitStatus('error');
      setUploadProgress(0);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4 relative overflow-hidden">
      <div className="w-full max-w-2xl relative">
        <div className="text-center mb-8 mt-16">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-3">
            Partagez vos réalisations
          </h1>
          <p className="text-gray-400 text-lg">
            Téléchargez et partagez facilement les photos de vos chantiers
          </p>
        </div>

        {submitStatus === 'success' && (
          <div className="mb-6 p-5 bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/50 rounded-xl shadow-lg animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0">
                <CheckCircle className="w-8 h-8 text-green-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-green-400 font-semibold text-lg mb-1">Projet envoyé avec succès!</h3>
                <p className="text-green-300/80 text-sm">Vos fichiers ont été téléchargés et sont maintenant disponibles dans l'administration.</p>
              </div>
            </div>
          </div>
        )}

        {submitStatus === 'error' && (
          <div className="mb-6 p-5 bg-gradient-to-r from-red-500/20 to-rose-500/20 border border-red-500/50 rounded-xl shadow-lg animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0">
                <XCircle className="w-8 h-8 text-red-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-red-400 font-semibold text-lg mb-1">Erreur lors de l'envoi</h3>
                <p className="text-red-300/80 text-sm">Une erreur est survenue. Veuillez vérifier votre connexion et réessayer.</p>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="entreprise" className="block text-white font-medium mb-3">
              Nom de votre entreprise
            </label>
            <input
              type="text"
              id="entreprise"
              name="entreprise"
              required
              value={formData.entreprise}
              onChange={handleInputChange}
              className="w-full px-4 py-3 bg-black border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
              placeholder="Votre entreprise"
            />
          </div>

          <div>
            <label className="block text-white font-medium mb-3">
              Géolocalisation chantier
            </label>
            <button
              type="button"
              onClick={() => setUseAutoLocation(!useAutoLocation)}
              className={`w-full px-4 py-3 rounded-lg font-medium transition-all mb-3 flex items-center justify-center gap-2 ${
                useAutoLocation
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-red-600 hover:bg-red-700 text-white'
              }`}
            >
              <MapPin className="w-5 h-5" />
              Géolocalisation automatique
            </button>


            {useAutoLocation && location.loading && (
              <div className="mb-3 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                <p className="text-blue-400 text-sm">Récupération de la localisation...</p>
              </div>
            )}

            {useAutoLocation && location.error && (
              <div className="mb-3 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 mt-0.5" />
                <p className="text-red-400 text-sm">{location.error}</p>
              </div>
            )}

            <input
              type="text"
              id="ville"
              name="ville"
              required
              value={formData.ville}
              onChange={handleInputChange}
              disabled={useAutoLocation}
              className="w-full px-4 py-3 bg-black border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              placeholder="Ou entrez le nom de la ville"
            />
          </div>

          <div>
            <label htmlFor="departement" className="block text-white font-medium mb-3">
              Département concerné
            </label>
            <input
              type="text"
              id="departement"
              name="departement"
              required
              value={formData.departement}
              onChange={handleInputChange}
              disabled={useAutoLocation}
              className="w-full px-4 py-3 bg-black border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              placeholder="Exemple : 01"
            />
          </div>

          <div>
            <label className="block text-white font-medium mb-3">
              Type de projet
            </label>
            <div className="flex gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="typeProjet"
                  value="neuf"
                  checked={formData.typeProjet === 'neuf'}
                  onChange={handleRadioChange}
                  className="w-4 h-4 text-red-600 bg-black border-gray-700 focus:ring-red-500"
                />
                <span className="text-white">Projet neuf</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="typeProjet"
                  value="renovation"
                  checked={formData.typeProjet === 'renovation'}
                  onChange={handleRadioChange}
                  className="w-4 h-4 text-red-600 bg-black border-gray-700 focus:ring-red-500"
                />
                <span className="text-white">Rénovation</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-white font-medium mb-3">
              Décrivez votre prestation en 1 phrase avec nom de la localité si possible
            </label>

            {!audioRecorder.audioUrl ? (
              <div className="space-y-3">
                {!audioRecorder.isRecording ? (
                  <button
                    type="button"
                    onClick={audioRecorder.startRecording}
                    className="w-full px-4 py-3 bg-red-600 hover:bg-red-700 rounded-lg font-medium text-white transition-all flex items-center justify-center gap-2"
                  >
                    <Mic className="w-5 h-5" />
                    Enregistrer un message vocal
                  </button>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-center gap-4 p-6 bg-red-500/20 border border-red-500/50 rounded-lg">
                      <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                      <span className="text-white font-mono text-xl">
                        {formatTime(audioRecorder.recordingTime)}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={audioRecorder.stopRecording}
                      className="w-full px-4 py-3 bg-red-600 hover:bg-red-700 rounded-lg font-medium text-white transition-all flex items-center justify-center gap-2"
                    >
                      <Square className="w-5 h-5" />
                      Arrêter l'enregistrement
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-4 bg-green-500/20 border border-green-500/50 rounded-lg">
                  <Play className="w-5 h-5 text-green-400" />
                  <div className="flex-1">
                    <p className="text-green-400 text-sm font-medium mb-2">Enregistrement terminé</p>
                    <audio src={audioRecorder.audioUrl} controls className="w-full h-8" />
                  </div>
                  <button
                    type="button"
                    onClick={audioRecorder.deleteRecording}
                    className="p-2 hover:bg-red-500/20 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-5 h-5 text-red-400" />
                  </button>
                </div>
              </div>
            )}

            <textarea
              id="description"
              name="description"
              rows={4}
              value={formData.description}
              onChange={handleInputChange}
              className="w-full px-4 py-3 bg-black border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all resize-none mt-3"
              placeholder="Ou bien décrivez votre prestation (Ex : Isolation murs intérieurs villa à Brion ou Ravalement façades crépi rustique à Nantua)"
            />
          </div>

          <div className="bg-zinc-900 rounded-xl p-6 border border-gray-800">
            <div className="relative">
              <input
                type="file"
                id="file-upload"
                multiple
                required
                accept="image/png,image/jpeg,image/webp"
                onChange={handleFileChange}
                className="hidden"
              />
              <label
                htmlFor="file-upload"
                className="block w-full px-4 py-4 bg-red-600 hover:bg-red-700 rounded-lg cursor-pointer transition-all text-center text-white font-medium flex items-center justify-center gap-2"
              >
                <Upload className="w-5 h-5" />
                Choisir des photos
              </label>
              <p className="text-gray-500 text-sm text-center mt-3">
                Maximum 10 photos au format PNG, JPG ou WEBP
              </p>
            </div>
            {files && files.length > 0 && (
              <div className="mt-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {Array.from(files).map((file, index) => (
                    <div key={index} className="relative group">
                      {filePreviews[index] ? (
                        <div className="relative aspect-square rounded-lg overflow-hidden border border-gray-700 bg-black/50">
                          <img
                            src={filePreviews[index]}
                            alt={file.name}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="absolute bottom-2 left-2 right-2">
                              <p className="text-white text-xs font-medium truncate">{file.name}</p>
                              <p className="text-gray-300 text-xs">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="aspect-square rounded-lg bg-black/50 border border-gray-700 flex items-center justify-center">
                          <div className="text-center">
                            <div className="w-8 h-8 border-4 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                            <p className="text-gray-500 text-xs">Chargement...</p>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="bg-zinc-900 rounded-xl p-6 border border-gray-800">
            <label className="block text-white font-medium mb-3">
              Vidéo (optionnel, max 40 secondes)
            </label>
            {!videoFile ? (
              <div className="relative">
                <input
                  type="file"
                  id="video-upload"
                  accept="video/mp4,video/webm,video/quicktime"
                  onChange={handleVideoChange}
                  className="hidden"
                />
                <label
                  htmlFor="video-upload"
                  className="block w-full px-4 py-4 bg-zinc-800 hover:bg-zinc-700 rounded-lg cursor-pointer transition-all text-center text-white font-medium flex items-center justify-center gap-2 border border-gray-700"
                >
                  <Video className="w-5 h-5" />
                  Ajouter une vidéo
                </label>
                <p className="text-gray-500 text-sm text-center mt-3">
                  MP4, WebM ou MOV - Durée maximale: 40 secondes
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-4 bg-blue-500/20 border border-blue-500/50 rounded-lg">
                  <Video className="w-5 h-5 text-blue-400" />
                  <div className="flex-1">
                    <p className="text-blue-400 text-sm font-medium">{videoFile.name}</p>
                    <p className="text-gray-400 text-xs mt-1">
                      Durée: {formatTime(videoDuration)} - {(videoFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={removeVideo}
                    className="p-2 hover:bg-red-500/20 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-red-400" />
                  </button>
                </div>
                <video
                  src={URL.createObjectURL(videoFile)}
                  controls
                  className="w-full rounded-lg"
                  style={{ maxHeight: '300px' }}
                />
              </div>
            )}
          </div>

          <div className="space-y-3 mt-12 mb-16">
            {isSubmitting && (
              <div className="bg-zinc-900 rounded-xl p-4 border border-gray-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white text-sm font-medium">Envoi en cours...</span>
                  <span className="text-white text-sm font-bold">{uploadProgress}%</span>
                </div>
                <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-pink-600 via-purple-600 to-blue-600 h-full rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${uploadProgress}%` }}
                  >
                    <div className="w-full h-full bg-white/20 animate-pulse"></div>
                  </div>
                </div>
              </div>
            )}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-gradient-to-r from-pink-600 via-purple-600 to-blue-600 hover:from-pink-700 hover:via-purple-700 hover:to-blue-700 text-white font-bold py-4 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-lg"
            >
              {isSubmitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Envoi en cours...
                </>
              ) : (
                <>
                  Soumettre le projet
                </>
              )}
            </button>
            <a
              href="#admin"
              onClick={(e) => {
                e.preventDefault();
                const event = new CustomEvent('navigate-to-admin');
                window.dispatchEvent(event);
              }}
              className="block text-center text-gray-600 text-xs hover:text-gray-500 transition-colors py-2"
            >
              Admin
            </a>
          </div>
        </form>
      </div>
    </div>
  );
}

export default App;
