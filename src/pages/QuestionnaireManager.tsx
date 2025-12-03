import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Edit, Save, X, Copy, Lock, Search } from "lucide-react"; // Importato Search
import { db } from "@/lib/firebase";
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, serverTimestamp } from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Questionnaire, Question, QuestionType } from "@/types/questionnaire";

const META_QUESTIONS: Question[] = [
  { id: "meta_nome", label: "Nome e Cognome lavoratore", section: "Dati Identificativi", type: "text", required: true },
  { id: "meta_reparto", label: "Reparto / Ufficio", section: "Dati Identificativi", type: "text", required: true },
  { id: "meta_azienda", label: "Azienda", section: "Dati Identificativi", type: "text", required: true },
  { id: "meta_sede", label: "Sede", section: "Dati Identificativi", type: "text", required: true },
];

const isMetaQuestion = (questionId: string) => META_QUESTIONS.some((mq) => mq.id === questionId);

export default function QuestionnaireManager() {
  const { user } = useAuth();
  const [questionnaires, setQuestionnaires] = useState<Questionnaire[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const [questionnaireSearchTerm, setQuestionnaireSearchTerm] = useState("");

  const [formName, setFormName] = useState("");
  const [formSector, setFormSector] = useState("");
  const [formQuestions, setFormQuestions] = useState<Question[]>([]);

  useEffect(() => {
    loadQuestionnaires();
  }, []);

  const loadQuestionnaires = async () => {
    try {
      const snap = await getDocs(collection(db, "questionnaires"));
      const data = snap.docs.map((d) => {
        const docData = d.data();
        return {
          id: d.id,
          ...docData,
          createdAt: docData.createdAt?.toDate() || new Date(),
        } as Questionnaire;
      });
      setQuestionnaires(data);
      console.log("Questionari caricati:", data.length);
    } catch (error) {
      // ...
    } finally {
      setLoading(false);
    }
  };

  const filteredQuestionnaires = questionnaires.filter((q) => {
    const term = questionnaireSearchTerm.toLowerCase();
    return q.name.toLowerCase().includes(term) || q.sector.toLowerCase().includes(term);
  });

  const startCreating = () => {
    setFormName("");
    setFormSector("");
    setFormQuestions([...META_QUESTIONS]);
    setEditingId(null);
    setIsCreating(true);
  };

  const startEditing = (q: Questionnaire) => {
    setFormName(q.name);
    setFormSector(q.sector);
    setFormQuestions([...q.questions]);
    setEditingId(q.id);
    setIsCreating(true);
  };

  const cancelEditing = () => {
    setIsCreating(false);
    setEditingId(null);
    setFormName("");
    setFormSector("");
    setFormQuestions([]);
  };

  const saveQuestionnaire = async () => {
    if (!user) return;
    if (!formName.trim() || !formSector.trim()) {
      toast.error("Nome e settore sono obbligatori");
      return;
    }
    if (formQuestions.length === 0) {
      toast.error("Aggiungi almeno una domanda");
      return;
    }

    try {
      const data = {
        name: formName,
        sector: formSector,
        questions: formQuestions,
        updatedAt: serverTimestamp(),
      };

      if (editingId) {
        await updateDoc(doc(db, "questionnaires", editingId), data);
        toast.success("Questionario aggiornato");
      } else {
        await addDoc(collection(db, "questionnaires"), {
          ...data,
          createdAt: serverTimestamp(),
          createdBy: user.uid,
        });
        toast.success("Questionario creato");
      }

      await loadQuestionnaires();
      cancelEditing();
    } catch (error) {
      console.error("Errore nel salvataggio:", error);
      toast.error("Errore nel salvataggio del questionario");
    }
  };

  const deleteQuestionnaire = async (id: string) => {
    if (!confirm("Sei sicuro di voler eliminare questo questionario?")) return;

    try {
      await deleteDoc(doc(db, "questionnaires", id));
      toast.success("Questionario eliminato");
      await loadQuestionnaires();
    } catch (error) {
      console.error("Errore nell'eliminazione:", error);
      toast.error("Errore nell'eliminazione del questionario");
    }
  };

  const addQuestion = () => {
    const defaultSection = formQuestions.length > 0 ? formQuestions[formQuestions.length - 1].section : "Nuova Sezione";

    const newQuestion: Question = {
      id: `q_${Date.now()}`,
      label: "",
      section: defaultSection || "",
      type: "text",
      required: true,
    };
    setFormQuestions([...formQuestions, newQuestion]);
  };

  function updateQuestion<K extends keyof Question>(index: number, field: K, value: Question[K]) {
    const updated = [...formQuestions];
    updated[index] = { ...updated[index], [field]: value } as Question;
    setFormQuestions(updated);
  };

  const deleteQuestion = (index: number) => {
    const question = formQuestions[index];
    if (isMetaQuestion(question.id)) {
      toast.error("I campi identificativi non possono essere eliminati");
      return;
    }
    setFormQuestions(formQuestions.filter((_, i) => i !== index));
  };

  const addOption = (questionIndex: number) => {
    const updated = [...formQuestions];
    const question = updated[questionIndex];
    if (!question.options) question.options = [];
    question.options.push("");
    setFormQuestions(updated);
  };

  const updateOption = (questionIndex: number, optionIndex: number, value: string) => {
    const updated = [...formQuestions];
    if (updated[questionIndex].options) {
      updated[questionIndex].options![optionIndex] = value;
    }
    setFormQuestions(updated);
  };

  const duplicateQuestionnaire = async (q: Questionnaire) => {
    if (!user) return;

    try {
      const data = {
        ...q,
        name: q.name + " (Copia)",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: user.uid,
      };
      delete data.id;
      await addDoc(collection(db, "questionnaires"), data);
      toast.success("Questionario duplicato");
      await loadQuestionnaires();
    } catch (error) {
      console.error("Errore nella duplicazione:", error);
      toast.error("Errore nella duplicazione del questionario");
    }
  };

  const deleteOption = (questionIndex: number, optionIndex: number) => {
    const updated = [...formQuestions];
    if (updated[questionIndex].options) {
      updated[questionIndex].options = updated[questionIndex].options!.filter((_, i) => i !== optionIndex);
    }
    setFormQuestions(updated);
  };

  if (loading) {
    return <div className="p-8">Caricamento...</div>;
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gestione Questionari</h1>
          <p className="text-muted-foreground mt-1">Crea e modifica i questionari per la valutazione (<b>{questionnaires.length} totali</b>)</p>
        </div>
        {!isCreating && (
          <Button onClick={startCreating}>
            <Plus className="mr-2 h-4 w-4" />
            Nuovo Questionario
          </Button>
        )}
      </div>

      {isCreating && (
        <Card className="border-primary">
          <CardHeader>
            <CardTitle>{editingId ? "Modifica Questionario" : "Nuovo Questionario"}</CardTitle>
            <CardDescription>Inserisci i dettagli del questionario e le domande</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Titolo Questionario *</Label>
                <Input id="name" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="es. Valutazione Uffici 2025" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sector">Tipologia *</Label>
                <Input id="sector" value={formSector} onChange={(e) => setFormSector(e.target.value)} placeholder="es. Sicurezza, Formazione, ecc." />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-lg font-semibold">Domande</Label>
                <Button onClick={addQuestion} variant="outline" size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Aggiungi Domanda
                </Button>
              </div>

              <Accordion type="single" collapsible className="w-full">
                {formQuestions.map((q, index) => {
                  const isMeta = isMetaQuestion(q.id);
                  return (
                    <AccordionItem key={q.id} value={q.id}>
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center gap-2 text-left">
                          <span className="font-mono text-sm text-muted-foreground">#{index + 1}</span>
                          <span>{q.label || "Nuova domanda"}</span>
                          {isMeta && (
                            <Badge variant="secondary" className="gap-1 text-xs">
                              <Lock className="h-3 w-3" />
                              Obbligatorio
                            </Badge>
                          )}
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Sezione</Label>
                              <Input
                                value={q.section}
                                onChange={(e) => updateQuestion(index, "section", e.target.value)}
                                placeholder="es. Intestazione, Illuminazione, ecc."
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Tipo</Label>
                              <Select value={q.type} onValueChange={(value) => updateQuestion(index, "type", value as QuestionType)}>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="text">Testo breve</SelectItem>
                                  <SelectItem value="textarea">Testo lungo</SelectItem>
                                  <SelectItem value="multiple">Risposta multipla</SelectItem>
                                  <SelectItem value="scale">Scala numerica</SelectItem>
                                  <SelectItem value="checkbox">Checkbox</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label>Testo Domanda</Label>
                            <Input
                              value={q.label}
                              onChange={(e) => updateQuestion(index, "label", e.target.value)}
                              placeholder="es. Nome del valutato"
                            />
                          </div>

                          {q.type === "multiple" && (
                            <div className="space-y-2">
                              <Label>Opzioni di risposta</Label>
                              <div className="space-y-2">
                                {q.options?.map((opt, optIdx) => (
                                  <div key={optIdx} className="flex gap-2">
                                    <Input
                                      value={opt}
                                      onChange={(e) => updateOption(index, optIdx, e.target.value)}
                                      placeholder={`Opzione ${optIdx + 1}`}
                                    />
                                    <Button variant="ghost" size="icon" onClick={() => deleteOption(index, optIdx)}>
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                ))}
                                <Button onClick={() => addOption(index)} variant="outline" size="sm">
                                  <Plus className="mr-2 h-4 w-4" />
                                  Aggiungi Opzione
                                </Button>
                              </div>
                            </div>
                          )}

                          {q.type === "scale" && (
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label>Valore minimo</Label>
                                <Input
                                  type="number"
                                  value={q.scale?.min || 1}
                                  onChange={(e) =>
                                    updateQuestion(index, "scale", {
                                      ...q.scale,
                                      min: parseInt(e.target.value),
                                    })
                                  }
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Valore massimo</Label>
                                <Input
                                  type="number"
                                  value={q.scale?.max || 5}
                                  onChange={(e) =>
                                    updateQuestion(index, "scale", {
                                      ...q.scale,
                                      max: parseInt(e.target.value),
                                    })
                                  }
                                />
                              </div>
                            </div>
                          )}

                          {!isMeta && (
                            <div className="flex justify-end">
                              <Button variant="destructive" size="sm" onClick={() => deleteQuestion(index)}>
                                <Trash2 className="mr-2 h-4 w-4" />
                                Elimina Domanda
                              </Button>
                            </div>
                          )}
                          {isMeta && (
                            <div className="text-sm text-muted-foreground bg-muted p-2 rounded">
                              Questo campo è obbligatorio per il filtraggio delle analisi e non può essere eliminato.
                            </div>
                          )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={cancelEditing}>
                <X className="mr-2 h-4 w-4" />
                Annulla
              </Button>
              <Button onClick={saveQuestionnaire}>
                <Save className="mr-2 h-4 w-4" />
                Salva Questionario
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {!isCreating && (
        <>
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
            <div className="relative flex-1">
              <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
              <Input
                id="search-questionnaire"
                type="text"
                placeholder={`Cerca per titolo o settore`}
                value={questionnaireSearchTerm}
                onChange={(e) => setQuestionnaireSearchTerm(e.target.value)}
                className="w-full pl-9"
              />
            </div>
            <p className="text-sm text-muted-foreground whitespace-nowrap">Visualizzati: <b>{filteredQuestionnaires.length}</b></p>
          </div>

          <div className="grid gap-4">
            {filteredQuestionnaires.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                {questionnaireSearchTerm ? "Nessun questionario trovato con questi criteri." : "Nessun questionario è stato creato."}
              </p>
            ) : (
              filteredQuestionnaires.map((q) => (
                <Card key={q.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle>{q.name}</CardTitle>
                        <CardDescription className="mt-2">
                          Settore: {q.sector} • {q.questions?.length || 0} domande
                        </CardDescription>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => startEditing(q)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => duplicateQuestionnaire(q)}>
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => deleteQuestionnaire(q.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardFooter>
                    <div className="text-sm text-muted-foreground">Creato il {q.createdAt.toLocaleDateString()}</div>
                  </CardFooter>
                </Card>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}