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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';

type AnswerMap = Record<string, string | boolean | string[]>;

type Question = {
  id: string;
  section: string;
  type: 'text' | 'select' | 'radio' | 'checkbox-multi' | 'textarea';
  question: string;
  options?: string[];
};

const questions: Question[] = [
  { id: 'meta_nome', section: 'Intestazione', type: 'text', question: 'Nome del valutato (lavoratore o reparto)' },
  { id: 'meta_postazione', section: 'Intestazione', type: 'text', question: 'Postazione n.' },
  { id: 'meta_reparto', section: 'Intestazione', type: 'text', question: 'Ufficio / Reparto' },

  { id: '1.1', section: '1) ORGANIZZAZIONE DEL LAVORO', type: 'select', question: '1.1 Ore di lavoro settimanali a VDT (abituali)', options: ['<20', '>20'] },
  { id: '1.2', section: '1) ORGANIZZAZIONE DEL LAVORO', type: 'radio', question: '1.2 La mansione prevede pause/cambi attività di 15 minuti ogni 120 minuti di applicazione continuativa al VDT', options: ['SI', 'NO'] },
  { id: '1.3', section: '1) ORGANIZZAZIONE DEL LAVORO', type: 'checkbox-multi', question: '1.3 Tipo di lavoro prevalente', options: ['inserimento dati', 'acquisizione dati', 'videoscrittura', 'programmazione'] },
  { id: '1.4', section: '1) ORGANIZZAZIONE DEL LAVORO', type: 'radio', question: '1.4 È stata effettuata informazione al lavoratore per il corretto uso del VDT', options: ['SI', 'NO'] },

  { id: '2.1', section: '2) MICROCLIMA', type: 'radio', question: "2.1 Modalità per il ricambio d'aria dell'ambiente", options: ['naturale', 'artificiale'] },
  { id: '2.2', section: '2) MICROCLIMA', type: 'radio', question: "2.2 Possibilità di regolare la temperatura dell'ambiente", options: ['presente', 'non presente'] },
  { id: '2.3', section: '2) MICROCLIMA', type: 'radio', question: "2.3 Possibilità di regolare l'umidità dell'ambiente", options: ['presente', 'non presente'] },
  { id: '2.4', section: '2) MICROCLIMA', type: 'radio', question: '2.4 Le attrezzature in dotazione producono eccesso di calore che comporta discomfort termico', options: ['SI', 'NO'] },

  { id: '3.1', section: '3) ILLUMINAZIONE', type: 'radio', question: 'Tipo di luce', options: ['naturale', 'artificiale', 'mista'] },
  { id: '3.2_nat', section: '3) ILLUMINAZIONE', type: 'radio', question: 'Per regolazione luce naturale', options: ['dispositivo copertura regolabile', 'copertura non regolabile', 'nessun dispositivo'] },
  { id: '3.2_art', section: '3) ILLUMINAZIONE', type: 'radio', question: 'Per regolazione luce artificiale', options: ['variatori di luminosità', 'accensione a isole', 'accensione centralizzata'] },
  { id: '3.3', section: '3) ILLUMINAZIONE', type: 'radio', question: 'Posizione della postazione rispetto alla sorgente di luce naturale', options: ['perpendicolare', 'frontale', 'di spalle'] },

  { id: '4.1', section: '4) RUMORE AMBIENTALE', type: 'text', question: '4.1 Eventuale misura (dB(A))' },
  { id: '4.2', section: '4) RUMORE AMBIENTALE', type: 'radio', question: "4.2 Può disturbare l'attenzione e la comunicazione verbale", options: ['SI', 'NO'] },

  { id: '5.1', section: '5) SPAZIO', type: 'radio', question: '5.1 Spazio di lavoro e manovra adeguato per ruotare/assumere posture', options: ['SI', 'NO'] },
  { id: '5.2', section: '5) SPAZIO', type: 'radio', question: '5.2 Percorsi liberi dagli ostacoli', options: ['SI', 'NO'] },

  { id: '6.1', section: '6) PIANO DI LAVORO', type: 'radio', question: 'Superficie adeguata (poco ingombrante)', options: ['SI', 'NO'] },
  { id: '6.2', section: '6) PIANO DI LAVORO', type: 'radio', question: 'Altezza del piano compresa indicativamente tra 70-80 cm', options: ['SI', 'NO'] },
  { id: '6.3', section: '6) PIANO DI LAVORO', type: 'radio', question: 'Dimensioni e disposizione di schermo, tastiera, mouse adeguate', options: ['SI', 'NO'] },

  { id: '7.1', section: '7) SEDILE DI LAVORO', type: 'radio', question: 'Altezza sedile regolabile', options: ['SI', 'NO', 'NON PRESENTE'] },
  { id: '7.2', section: '7) SEDILE DI LAVORO', type: 'radio', question: 'Inclinazione sedile regolabile', options: ['SI', 'NO', 'NON PRESENTE'] },
  { id: '7.3', section: '7) SEDILE DI LAVORO', type: 'radio', question: 'Schienale con supporto dorso-lombare', options: ['SI', 'NO', 'NON PRESENTE'] },
  { id: '7.4', section: '7) SEDILE DI LAVORO', type: 'radio', question: 'Schienale regolabile in altezza', options: ['SI', 'NO', 'NON PRESENTE'] },
  { id: '7.5', section: '7) SEDILE DI LAVORO', type: 'radio', question: 'Schienale e seduta con bordi smussati e materiali appropriati', options: ['SI', 'NO'] },
  { id: '7.6', section: '7) SEDILE DI LAVORO', type: 'radio', question: 'Presenza di ruote/meccanismo spostamento (se previsto)', options: ['SI', 'NO'] },

  { id: '8.1', section: '8) SCHERMO VIDEO', type: 'radio', question: 'Monitor VDT orientabile/inclinabile', options: ['SI', 'NO'] },
  { id: '8.2', section: '8) SCHERMO VIDEO', type: 'radio', question: 'Immagine stabile ed esente da sfarfallamento', options: ['SI', 'NO'] },
  { id: '8.3', section: '8) SCHERMO VIDEO', type: 'radio', question: 'Risoluzione e luminosità del carattere regolabili', options: ['SI', 'NO'] },
  { id: '8.4', section: '8) SCHERMO VIDEO', type: 'radio', question: 'Contrasto e luminosità adeguati', options: ['SI', 'NO'] },
  { id: '8.5', section: '8) SCHERMO VIDEO', type: 'radio', question: 'Presenza di riflessi o riverberi sullo schermo', options: ['SI', 'NO'] },
  { id: '8.6', section: '8) SCHERMO VIDEO', type: 'text', question: 'Note su posizione dello schermo (altezza occhi, distanza, ecc.)' },

  { id: '9.1', section: '9) TASTIERA', type: 'radio', question: 'Tastiera e mouse separati dallo schermo', options: ['SI', 'NO'] },
  { id: '9.2', section: '9) TASTIERA', type: 'radio', question: 'Tastiera inclinabile', options: ['SI', 'NO'] },
  { id: '9.3', section: '9) TASTIERA', type: 'radio', question: 'Spazio adeguato per appoggiare avambracci davanti alla tastiera', options: ['SI', 'NO'] },
  { id: '9.4', section: '9) TASTIERA', type: 'radio', question: 'Simboli/tasti leggibili dalla normale posizione', options: ['SI', 'NO'] },

  { id: '10.1', section: '10) INTERFACCIA UOMO-MACCHINA', type: 'radio', question: 'Il software presente è di facile utilizzo e adeguato al lavoro svolto', options: ['SI', 'NO'] },
  { id: '10_2', section: '10) INTERFACCIA UOMO-MACCHINA', type: 'text', question: 'Osservazioni (eventuali)' },

  { id: 'foto_postazione', section: 'Fine', type: 'text', question: 'Foto della postazione (URL o nota)' }
] as const;

const CompileQuestionnaire: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [answers, setAnswers] = useState<AnswerMap>({});
  const [submitting, setSubmitting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

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

  const validateForm = (): boolean => {
    for (const q of questions) {
      const isTextField = q.type === 'text' || q.type === 'textarea';
      const mustCheck = !isTextField || q.id === 'meta_nome' || q.id === 'foto_postazione' || q.id === 'meta_postazione' || q.id === 'meta_reparto';

      if (mustCheck && !answers[q.id]) {
        toast({
          variant: 'destructive',
          title: 'Attenzione',
          description: `Rispondi alla domanda: "${q.question}" nella sezione "${q.section}"`,
        });
        return false;
      }
    }
    return true;
  };

  const handlePreview = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      setShowPreview(true);
    }
  };

  const handleSubmitConfirmed = async () => {
    setSubmitting(true);
    try {
      const completeAnswers: AnswerMap = {};
      questions.forEach(q => {
        if (answers[q.id] !== undefined && answers[q.id] !== null) {
          completeAnswers[q.id] = answers[q.id];
        } else {
          if (q.type === 'checkbox-multi') completeAnswers[q.id] = [];
          else completeAnswers[q.id] = '';
        }
      });

      await addDoc(collection(db, 'responses'), {
        userId: user?.uid ?? null,
        userEmail: user?.email ?? null,
        formId: 'checklist_vdt_v1',
        answers: completeAnswers,
        createdAt: serverTimestamp(),
      });

      toast({
        title: 'Questionario inviato!',
        description: 'Grazie per aver completato la checklist',
      });
      navigate('/dashboard');
    } catch (err) {
      console.error('submit err', err);
      toast({
        variant: 'destructive',
        title: 'Errore',
        description: "Errore durante l'invio",
      });
    } finally {
      setSubmitting(false);
      setShowPreview(false);
    }
  };

  const sections: Record<string, Question[]> = {};
  questions.forEach(q => {
    if (!sections[q.section]) sections[q.section] = [];
    sections[q.section].push(q);
  });

  // ✅ Aggiornata: ignora text/textarea tranne meta_nome e foto_postazione
  const isSectionComplete = (sectionKey: string) => {
    return sections[sectionKey].every(q => {
      const isTextField = q.type === 'text' || q.type === 'textarea';
      const mustCheck = !isTextField || q.id === 'meta_nome' || q.id === 'foto_postazione' || q.id === 'meta_postazione' || q.id === 'meta_reparto';
      if (!mustCheck) return true;

      const val = answers[q.id];
      if (q.type === 'checkbox-multi') return Array.isArray(val) && val.length > 0;
      return val !== undefined && val !== '';
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-accent/5">
      <header className="border-b bg-card/80 backdrop-blur-md shadow-md sticky top-0 z-50">
        <div className="container mx-auto px-4 py-5 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 text-center sm:text-left">
            <div className="flex justify-center sm:justify-start">
              <div className="p-2 rounded-lg bg-gradient-to-br from-primary to-primary-glow">
                <Send className="h-6 w-6 text-white" />
              </div>
            </div>
            <h1 className="text-xl font-bold leading-tight">Compilazione Checklist VDT</h1>
          </div>
          <Button variant="outline" onClick={() => navigate('/dashboard')} className="gap-2 w-full sm:w-auto">
            <ArrowLeft className="h-4 w-4" /> Dashboard
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-5xl">
        <Card className="shadow-xl border-2">
          <CardHeader className="bg-gradient-to-r from-primary/10 to-accent/10 border-b">
            <CardTitle className="text-2xl">POSTAZIONE DI LAVORO CON VIDEOTERMINALE</CardTitle>
            <CardDescription className="text-base">
              Check list di valutazione della conformità - Compila tutti i campi richiesti
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePreview} className="space-y-6">
              <Accordion type="multiple" className="w-full">
                {Object.keys(sections).map(sectionKey => (
                  <AccordionItem
                    key={sectionKey}
                    value={sectionKey}
                    className={`border-2 rounded-xl overflow-hidden transition-colors ${
                      isSectionComplete(sectionKey)
                        ? 'border-green-500 bg-green-50'
                        : 'border-primary/20 bg-white'
                    }`}
                  >
                    <AccordionTrigger
                      className="px-4 py-3 text-lg font-semibold w-full flex items-center justify-between border-b-0"
                    >
                      <span className="text-left">{sectionKey}</span>
                      {isSectionComplete(sectionKey) && (
                        <span className="text-green-600 text-sm font-medium ml-auto">
                          ✅
                        </span>
                      )}
                    </AccordionTrigger>
                    <AccordionContent className="space-y-4 p-4">
                      {sections[sectionKey].map(q => (
                        <div
                          key={q.id}
                          className="p-4 border-2 rounded-lg bg-card hover:border-primary/30 transition-colors shadow-sm"
                        >
                          <Label className="font-semibold">{q.question}</Label>

                          {q.type === 'text' && (
                            <Input
                              value={(answers[q.id] as string) || ''}
                              onChange={e => setValue(q.id, e.target.value)}
                              className="mt-2"
                            />
                          )}

                          {q.type === 'select' && q.options && (
                            <div className="mt-2 flex gap-2 flex-wrap">
                              {q.options.map(opt => (
                                <button
                                  type="button"
                                  key={opt}
                                  onClick={() => setValue(q.id, opt)}
                                  className={`px-3 py-1 rounded border ${
                                    answers[q.id] === opt
                                      ? 'bg-indigo-600 text-white'
                                      : 'bg-white'
                                  }`}
                                >
                                  {opt}
                                </button>
                              ))}
                            </div>
                          )}

                          {q.type === 'radio' && q.options && (
                            <RadioGroup
                              value={(answers[q.id] as string) || ''}
                              onValueChange={v => setValue(q.id, v)}
                              className="mt-2 space-y-2"
                            >
                              {q.options.map(opt => (
                                <div key={opt} className="flex items-center space-x-2">
                                  <RadioGroupItem value={opt} id={`${q.id}-${opt}`} />
                                  <Label htmlFor={`${q.id}-${opt}`} className="cursor-pointer">{opt}</Label>
                                </div>
                              ))}
                            </RadioGroup>
                          )}

                          {q.type === 'checkbox-multi' && q.options && (
                            <div className="mt-2 space-y-2">
                              {q.options.map(opt => {
                                const checked = ((answers[q.id] as string[]) || []).includes(opt);
                                return (
                                  <div key={opt} className="flex items-center space-x-2">
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      onChange={() => toggleMulti(q.id, opt)}
                                      id={`${q.id}-${opt}`}
                                    />
                                    <Label htmlFor={`${q.id}-${opt}`} className="cursor-pointer">
                                      {opt}
                                    </Label>
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {q.type === 'textarea' && (
                            <Textarea
                              value={(answers[q.id] as string) || ''}
                              onChange={e => setValue(q.id, e.target.value)}
                              rows={4}
                              className="mt-2"
                            />
                          )}
                        </div>
                      ))}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>

              <div className="flex gap-3 pt-4">
                <Button type="submit" variant="gradient" className="flex-1" size="lg" disabled={submitting}>
                  <Send className="mr-2 h-5 w-5" />
                  {submitting ? 'Invio in corso...' : 'Invia Questionario'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  onClick={() => {
                    setAnswers({});
                    toast({ title: 'Form resettato', description: 'Tutte le risposte sono state cancellate' });
                  }}
                >
                  Reset
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>

      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Conferma le risposte prima dell'invio</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {Object.keys(sections).map(sectionKey => (
              <div key={sectionKey}>
                <h4 className="font-bold text-primary mt-4 mb-2">{sectionKey}</h4>
                <div className="space-y-2">
                  {sections[sectionKey].map(q => (
                    <div key={q.id}>
                      <p className="font-semibold">{q.id}. {q.question}</p>
                      <p className="text-muted-foreground text-sm">
                        {Array.isArray(answers[q.id])
                          ? (answers[q.id] as string[]).join(', ') || '—'
                          : answers[q.id] || '—'}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setShowPreview(false)}>
              Torna indietro
            </Button>
            <Button onClick={handleSubmitConfirmed} disabled={submitting}>
              {submitting ? 'Invio in corso...' : 'Conferma e invia'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CompileQuestionnaire;