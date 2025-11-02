import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Send } from 'lucide-react';

type AnswerMap = Record<string, string | boolean | string[]>;

type Question = {
  id: string;
  section: string;
  type: 'text' | 'select' | 'radio' | 'checkbox-multi' | 'textarea';
  question: string;
  options?: string[];
}

const questions: Question[] = [
  // Header data fields
  { id: 'meta_nome', section: 'Intestazione', type: 'text' as 'text' | 'select' | 'radio' | 'checkbox-multi' | 'textarea', question: 'Nome del valutato (lavoratore o reparto)' },
  { id: 'meta_postazione', section: 'Intestazione', type: 'text', question: 'Postazione n.' },
  { id: 'meta_reparto', section: 'Intestazione', type: 'text', question: 'Ufficio / Reparto' },

  // 1 ORGANIZZAZIONE DEL LAVORO
  { id: '1.1', section: '1) ORGANIZZAZIONE DEL LAVORO', type: 'select', question: 'Ore di lavoro settimanali a VDT (abituali)', options: ['<20', '>20'] },
  { id: '1.2', section: '1) ORGANIZZAZIONE DEL LAVORO', type: 'radio', question: 'La mansione prevede pause/cambi attività di 15 minuti ogni 120 minuti di applicazione continuativa al VDT', options: ['SI', 'NO'] },
  { id: '1.2_note', section: '1) ORGANIZZAZIONE DEL LAVORO', type: 'text', question: 'Necessità di intervento (eventuale)' },
  { id: '1.3', section: '1) ORGANIZZAZIONE DEL LAVORO', type: 'checkbox-multi', question: 'Tipo di lavoro prevalente', options: ['inserimento dati', 'acquisizione dati', 'videoscrittura', 'programmazione'] },
  { id: '1.4', section: '1) ORGANIZZAZIONE DEL LAVORO', type: 'radio', question: 'È stata effettuata informazione al lavoratore per il corretto uso del VDT', options: ['SI', 'NO'] },
  { id: '1.4_note', section: '1) ORGANIZZAZIONE DEL LAVORO', type: 'text', question: 'Necessità di intervento (eventuale)' },

  // 2 MICROCLIMA
  { id: '2.1', section: '2) MICROCLIMA', type: 'radio', question: 'Modalità per il ricambio d’aria dell’ambiente', options: ['naturale', 'artificiale'] },
  { id: '2.2', section: '2) MICROCLIMA', type: 'radio', question: 'Possibilità di regolare la temperatura dell’ambiente', options: ['presente', 'non presente'] },
  { id: '2.3', section: '2) MICROCLIMA', type: 'radio', question: 'Possibilità di regolare l’umidità dell’ambiente', options: ['presente', 'non presente'] },
  { id: '2.4', section: '2) MICROCLIMA', type: 'radio', question: 'Le attrezzature in dotazione producono eccesso di calore che comporta discomfort termico', options: ['SI', 'NO'] },
  { id: '2.4_note', section: '2) MICROCLIMA', type: 'text', question: 'Necessità di intervento (eventuale)' },

  // 3 ILLUMINAZIONE
  { id: '3.1', section: '3) ILLUMINAZIONE', type: 'radio', question: 'Tipo di luce', options: ['naturale', 'artificiale', 'mista'] },
  { id: '3.2_nat', section: '3) ILLUMINAZIONE', type: 'radio', question: 'Per regolazione luce naturale', options: ['dispositivo copertura regolabile', 'copertura non regolabile', 'nessun dispositivo'] },
  { id: '3.2_art', section: '3) ILLUMINAZIONE', type: 'radio', question: 'Per regolazione luce artificiale', options: ['variatori di luminosità', 'accensione a isole', 'accensione centralizzata'] },
  { id: '3.3', section: '3) ILLUMINAZIONE', type: 'radio', question: 'Posizione della postazione rispetto alla sorgente di luce naturale', options: ['perpendicolare', 'frontale', 'di spalle'] },
  { id: '3_note', section: '3) ILLUMINAZIONE', type: 'text', question: 'Necessità di intervento (eventuale)' },

  // 4 RUMORE AMBIENTALE
  { id: '4.1', section: '4) RUMORE AMBIENTALE', type: 'text', question: 'Eventuale misura (dB(A))' },
  { id: '4.2', section: '4) RUMORE AMBIENTALE', type: 'radio', question: 'Può disturbare l’attenzione e la comunicazione verbale', options: ['SI', 'NO'] },
  { id: '4_note', section: '4) RUMORE AMBIENTALE', type: 'text', question: 'Necessità di intervento (eventuale)' },

  // 5 SPAZIO
  { id: '5.1', section: '5) SPAZIO', type: 'radio', question: 'Spazio di lavoro e manovra adeguato per ruotare/assumere posture', options: ['SI', 'NO'] },
  { id: '5.2', section: '5) SPAZIO', type: 'radio', question: 'Percorsi liberi dagli ostacoli', options: ['SI', 'NO'] },
  { id: '5_note', section: '5) SPAZIO', type: 'text', question: 'Necessità di intervento (eventuale)' },

  // 6 PIANO DI LAVORO
  { id: '6.1', section: '6) PIANO DI LAVORO', type: 'radio', question: 'Superficie adeguata (poco ingombrante)', options: ['SI', 'NO'] },
  { id: '6.2', section: '6) PIANO DI LAVORO', type: 'radio', question: 'Altezza del piano compresa indicativamente tra 70-80 cm', options: ['SI', 'NO'] },
  { id: '6.3', section: '6) PIANO DI LAVORO', type: 'radio', question: 'Dimensioni e disposizione di schermo, tastiera, mouse adeguate', options: ['SI', 'NO'] },
  { id: '6_note', section: '6) PIANO DI LAVORO', type: 'text', question: 'Necessità di intervento (eventuale)' },

  // 7 SEDILE DI LAVORO
  { id: '7.1', section: '7) SEDILE DI LAVORO', type: 'radio', question: 'Altezza sedile regolabile', options: ['SI', 'NO', 'NON PRESENTE'] },
  { id: '7.2', section: '7) SEDILE DI LAVORO', type: 'radio', question: 'Inclinazione sedile regolabile', options: ['SI', 'NO', 'NON PRESENTE'] },
  { id: '7.3', section: '7) SEDILE DI LAVORO', type: 'radio', question: 'Schienale con supporto dorso-lombare', options: ['SI', 'NO', 'NON PRESENTE'] },
  { id: '7.4', section: '7) SEDILE DI LAVORO', type: 'radio', question: 'Schienale regolabile in altezza', options: ['SI', 'NO', 'NON PRESENTE'] },
  { id: '7.5', section: '7) SEDILE DI LAVORO', type: 'radio', question: 'Schienale e seduta con bordi smussati e materiali appropriati', options: ['SI', 'NO'] },
  { id: '7.6', section: '7) SEDILE DI LAVORO', type: 'radio', question: 'Presenza di ruote/meccanismo spostamento (se previsto)', options: ['SI', 'NO'] },
  { id: '7_note', section: '7) SEDILE DI LAVORO', type: 'text', question: 'Necessità di intervento (eventuale)' },

  // 8 SCHERMO VIDEO
  { id: '8.1', section: '8) SCHERMO VIDEO', type: 'radio', question: 'Monitor VDT orientabile/inclinabile', options: ['SI', 'NO'] },
  { id: '8.2', section: '8) SCHERMO VIDEO', type: 'radio', question: 'Immagine stabile ed esente da sfarfallamento', options: ['SI', 'NO'] },
  { id: '8.3', section: '8) SCHERMO VIDEO', type: 'radio', question: 'Risoluzione e luminosità del carattere regolabili', options: ['SI', 'NO'] },
  { id: '8.4', section: '8) SCHERMO VIDEO', type: 'radio', question: 'Contrasto e luminosità adeguati', options: ['SI', 'NO'] },
  { id: '8.5', section: '8) SCHERMO VIDEO', type: 'radio', question: 'Presenza di riflessi o riverberi sullo schermo', options: ['SI', 'NO'] },
  { id: '8.6', section: '8) SCHERMO VIDEO', type: 'text', question: 'Note su posizione dello schermo (altezza occhi, distanza, ecc.)' },
  { id: '8_note', section: '8) SCHERMO VIDEO', type: 'text', question: 'Necessità di intervento (eventuale)' },

  // 9 TASTIERA
  { id: '9.1', section: '9) TASTIERA', type: 'radio', question: 'Tastiera e mouse separati dallo schermo', options: ['SI', 'NO'] },
  { id: '9.2', section: '9) TASTIERA', type: 'radio', question: 'Tastiera inclinabile', options: ['SI', 'NO'] },
  { id: '9.3', section: '9) TASTIERA', type: 'radio', question: 'Spazio adeguato per appoggiare avambracci davanti alla tastiera', options: ['SI', 'NO'] },
  { id: '9.4', section: '9) TASTIERA', type: 'radio', question: 'Simboli/tasti leggibili dalla normale posizione', options: ['SI', 'NO'] },
  { id: '9_note', section: '9) TASTIERA', type: 'text', question: 'Necessità di intervento (eventuale)' },

  // 10 INTERFACCIA UOMO-MACCHINA
  { id: '10.1', section: '10) INTERFACCIA UOMO-MACCHINA', type: 'radio', question: 'Il software presente è di facile utilizzo e adeguato al lavoro svolto', options: ['SI', 'NO'] },
  { id: '10_note', section: '10) INTERFACCIA UOMO-MACCHINA', type: 'text', question: 'Osservazioni (eventuali)' },

  // Foto e note finali
  { id: 'foto_postazione', section: 'Fine', type: 'text', question: 'Foto della postazione (URL o nota)' }
] as const;

const CompileQuestionnaire: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [answers, setAnswers] = useState<AnswerMap>({});
  const [submitting, setSubmitting] = useState(false);

  const setValue = (id: string, value: string | boolean | string[]) => {
    setAnswers(prev => ({ ...prev, [id]: value }));
  };

  const toggleMulti = (id: string, option: string) => {
    const prev = (answers[id] as string[]) || [];
    if (prev.includes(option)) {
      setAnswers(p => ({ ...p, [id]: prev.filter(s => s !== option) }));
    } else {
      setAnswers(p => ({ ...p, [id]: [...prev, option] }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // minimal validation: requested that header fields are filled
    if (!answers['meta_nome']) {
      toast({ variant: 'destructive', title: 'Attenzione', description: 'Inserisci il nome del valutato' });
      return;
    }

    setSubmitting(true);
    try {
      await addDoc(collection(db, 'responses'), {
        userId: user?.uid ?? null,
        userEmail: user?.email ?? null,
        formId: 'checklist_vdt_v1',
        answers,
        createdAt: serverTimestamp()
      });

      toast({ title: 'Questionario inviato!', description: 'Grazie per aver completato la checklist' });
      navigate('/dashboard');
    } catch (err) {
      console.error('submit err', err);
      toast({ variant: 'destructive', title: 'Errore', description: 'Errore durante l\'invio' });
    } finally {
      setSubmitting(false);
    }
  };

  // group questions by section for display
  const sections: Record<string, (typeof questions[number])[]> = {};
  questions.forEach(q => {
    if (!sections[q.section]) sections[q.section] = [];
    sections[q.section].push(q);
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/5">
      <header className="bg-card border-b sticky top-0 z-50 backdrop-blur-sm bg-card/95">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Torna alla Dashboard
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle>POSTAZIONE DI LAVORO CON VIDEOTERMINALE</CardTitle>
            <CardDescription>Check list di valutazione della conformità</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {Object.keys(sections).map(sectionKey => (
                <section key={sectionKey} className="mb-6">
                  <h3 className="text-sm font-semibold mb-3">{sectionKey}</h3>

                  <div className="space-y-4">
                    {sections[sectionKey].map((q: typeof questions[number]) => (
                      <div key={q.id} className="p-3 border rounded-md bg-white">
                        <Label className="font-semibold">{q.question}</Label>

                        {q.type === 'text' && (
                          <Input value={(answers[q.id] as string) || ''} onChange={(e) => setValue(q.id, e.target.value)} className="mt-2" />
                        )}

                        {q.type === 'select' && q.options && (
                          <div className="mt-2 flex gap-2">
                            {q.options.map((opt: string) => (
                              <button
                                type="button"
                                key={opt}
                                onClick={() => setValue(q.id, opt)}
                                className={`px-3 py-1 rounded border ${answers[q.id] === opt ? 'bg-indigo-600 text-white' : 'bg-white'}`}
                              >
                                {opt}
                              </button>
                            ))}
                          </div>
                        )}

                        {q.type === 'radio' && q.options && (
                          <div className="mt-2 space-y-2">
                            <RadioGroup value={(answers[q.id] as string) || ''} onValueChange={(v) => setValue(q.id, v)}>
                              {q.options.map((opt: string) => (
                                <div key={opt} className="flex items-center space-x-2">
                                  <RadioGroupItem value={opt} id={`${q.id}-${opt}`} />
                                  <Label htmlFor={`${q.id}-${opt}`} className="cursor-pointer">{opt}</Label>
                                </div>
                              ))}
                            </RadioGroup>
                          </div>
                        )}

                        {q.type === 'checkbox-multi' && q.options && (
                          <div className="mt-2 space-y-2">
                            {q.options.map((opt: string) => {
                              const checked = ((answers[q.id] as string[]) || []).includes(opt);
                              return (
                                <div key={opt} className="flex items-center space-x-2">
                                  <input type="checkbox" checked={checked} onChange={() => toggleMulti(q.id, opt)} id={`${q.id}-${opt}`} />
                                  <Label htmlFor={`${q.id}-${opt}`} className="cursor-pointer">{opt}</Label>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {q.type === 'textarea' && (
                          <Textarea value={(answers[q.id] as string) || ''} onChange={(e) => setValue(q.id, e.target.value)} rows={4} className="mt-2" />
                        )}

                      </div>
                    ))}
                  </div>
                </section>
              ))}

              <div className="flex gap-2">
                <Button type="submit" className="flex-1" size="lg" disabled={submitting}>
                  <Send className="mr-2 h-4 w-4" />
                  {submitting ? 'Invio in corso...' : 'Invia Questionario'}
                </Button>
                <Button type="button" variant="ghost" onClick={() => {
                  // quick reset
                  setAnswers({});
                }}>
                  Reset
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default CompileQuestionnaire;