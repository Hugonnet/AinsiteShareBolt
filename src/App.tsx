import { useState, useEffect } from 'react';
import { Upload, Send, Mic, Square, Trash2, Play, MapPin, AlertCircle } from 'lucide-react';
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [useAutoLocation, setUseAutoLocation] = useState(false);

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
    }
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

    try {
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

      if (files) {
        for (let i = 0; i < files.length; i++) {
          formDataToSend.append('files', files[i]);
        }
      }

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

      if (!response.ok) {
        throw new Error('Échec de l\'envoi');
      }

      setSubmitStatus('success');
      setFormData({ entreprise: '', ville: '', departement: '', typeProjet: 'neuf', description: '' });
      setFiles(null);
      setUseAutoLocation(false);
      audioRecorder.deleteRecording();
      const fileInput = document.getElementById('file-upload') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

      setTimeout(() => setSubmitStatus('idle'), 5000);
    } catch (error) {
      console.error('Erreur:', error);
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-6 left-6">
        <div className="text-2xl font-bold">
          <span className="text-gray-400">@insite</span>
          <span className="text-red-500">.net</span>
        </div>
      </div>

      <div className="w-full max-w-2xl relative mt-16">
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-3">
            Partagez vos réalisations
          </h1>
          <p className="text-gray-400 text-lg">
            Téléchargez et partagez facilement les photos de vos chantiers
          </p>
        </div>

        {submitStatus === 'success' && (
          <div className="mb-6 p-4 bg-green-500/20 border border-green-500/50 rounded-xl flex items-center gap-3">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <p className="text-green-400">Fichiers envoyés avec succès!</p>
          </div>
        )}

        {submitStatus === 'error' && (
          <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-xl">
            <p className="text-red-400">Une erreur est survenue. Veuillez réessayer.</p>
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

            {useAutoLocation && location.city && location.department && (
              <div className="mb-3 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                <p className="text-green-400 text-sm font-medium">
                  Localisation détectée: {location.city}, département {location.department}
                </p>
                {location.accuracy && (
                  <p className="text-green-400/70 text-xs mt-1">
                    Précision: ±{Math.round(location.accuracy)}m
                  </p>
                )}
              </div>
            )}

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
              Décrivez votre prestation en 1 phrase
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
              <div className="mt-4 space-y-2">
                {Array.from(files).map((file, index) => (
                  <div key={index} className="flex items-center gap-2 text-gray-400 text-sm bg-black/50 px-3 py-2 rounded-lg border border-gray-800">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="truncate flex-1">{file.name}</span>
                    <span className="text-gray-500">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

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
        </form>
      </div>
    </div>
  );
}

export default App;
