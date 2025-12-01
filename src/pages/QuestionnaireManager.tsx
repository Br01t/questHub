import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Plus, Trash2, Edit, Save, X } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, serverTimestamp } from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Questionnaire, Question, QuestionType } from "@/types/questionnaire";

export default function QuestionnaireManager() {
  const { user } = useAuth();
  const [questionnaires, setQuestionnaires] = useState<Questionnaire[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Form state
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
    } catch (error) {
      console.error("Errore nel caricamento dei questionari:", error);
      toast.error("Errore nel caricamento dei questionari");
    } finally {
      setLoading(false);
    }
  };

  const startCreating = () => {
    setFormName("");
    setFormSector("");
    setFormQuestions([]);
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
    const newQuestion: Question = {
      id: `q_${Date.now()}`,
      label: "",
      section: "",
      type: "text",
      required: true,
    };
    setFormQuestions([...formQuestions, newQuestion]);
  };

  const updateQuestion = (index: number, field: keyof Question, value: any) => {
    const updated = [...formQuestions];
    updated[index] = { ...updated[index], [field]: value };
    setFormQuestions(updated);
  };

  const deleteQuestion = (index: number) => {
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
          <p className="text-muted-foreground mt-1">
            Crea e modifica i questionari per la valutazione
          </p>
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
            <CardDescription>
              Inserisci i dettagli del questionario e le domande
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Dati base */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome Questionario *</Label>
                <Input
                  id="name"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="es. Valutazione Uffici 2025"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sector">Settore *</Label>
                <Input
                  id="sector"
                  value={formSector}
                  onChange={(e) => setFormSector(e.target.value)}
                  placeholder="es. Uffici, Produzione, ecc."
                />
              </div>
            </div>

            {/* Lista domande */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-lg font-semibold">Domande</Label>
                <Button onClick={addQuestion} variant="outline" size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Aggiungi Domanda
                </Button>
              </div>

              <Accordion type="single" collapsible className="w-full">
                {formQuestions.map((q, index) => (
                  <AccordionItem key={q.id} value={q.id}>
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center gap-2 text-left">
                        <span className="font-mono text-sm text-muted-foreground">#{index + 1}</span>
                        <span>{q.label || "Nuova domanda"}</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>ID Domanda</Label>
                            <Input
                              value={q.id}
                              onChange={(e) => updateQuestion(index, "id", e.target.value)}
                              placeholder="es. meta_nome"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Tipo</Label>
                            <Select
                              value={q.type}
                              onValueChange={(value) => updateQuestion(index, "type", value as QuestionType)}
                            >
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

                        <div className="space-y-2">
                          <Label>Sezione</Label>
                          <Input
                            value={q.section}
                            onChange={(e) => updateQuestion(index, "section", e.target.value)}
                            placeholder="es. Intestazione, Illuminazione, ecc."
                          />
                        </div>

                        {/* Opzioni per risposta multipla */}
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
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => deleteOption(index, optIdx)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              ))}
                              <Button
                                onClick={() => addOption(index)}
                                variant="outline"
                                size="sm"
                              >
                                <Plus className="mr-2 h-4 w-4" />
                                Aggiungi Opzione
                              </Button>
                            </div>
                          </div>
                        )}

                        {/* Configurazione scala */}
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

                        <div className="flex justify-end">
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => deleteQuestion(index)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Elimina Domanda
                          </Button>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>

            {/* Azioni */}
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

      {/* Lista questionari esistenti */}
      {!isCreating && (
        <div className="grid gap-4">
          {questionnaires.map((q) => (
            <Card key={q.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>{q.name}</CardTitle>
                    <CardDescription>
                      Settore: {q.sector} • {q.questions.length} domande
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => startEditing(q)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => deleteQuestionnaire(q.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground">
                  Creato il {q.createdAt.toLocaleDateString()}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
