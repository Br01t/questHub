import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { collection, addDoc, serverTimestamp, doc, getDoc, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Send, Building2, MapPin, FileText } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Alert, AlertDescription } from "@/components/ui/alert";

type AnswerMap = Record<string, string | boolean | string[]>;

type Company = {
  id: string;
  name: string;
};

type CompanySite = {
  id: string;
  name: string;
  companyId: string;
};

type Question = {
  id: string;
  section: string;
  type: "text" | "textarea" | "multiple" | "scale" | "checkbox";
  label: string;
  options?: string[];
  scale?: { min: number; max: number };
  required?: boolean;
};

type Questionnaire = {
  id: string;
  name: string;
  sector: string;
  questions: Question[];
};

const CompileQuestionnaire: React.FC = () => {
  const { user, userProfile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [answers, setAnswers] = useState<AnswerMap>({});
  const [submitting, setSubmitting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [companyName, setCompanyName] = useState<string>("");
  const [siteName, setSiteName] = useState<string>("");

  const [showSelectDialog, setShowSelectDialog] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [sites, setSites] = useState<CompanySite[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");
  const [selectedSiteId, setSelectedSiteId] = useState<string>("");
  const [loadingData, setLoadingData] = useState(false);

  // Nuovi stati per gestione questionari
  const [questionnaires, setQuestionnaires] = useState<Questionnaire[]>([]);
  const [selectedQuestionnaireId, setSelectedQuestionnaireId] = useState<string>("");
  const [currentQuestionnaire, setCurrentQuestionnaire] = useState<Questionnaire | null>(null);
  const [loadingQuestionnaires, setLoadingQuestionnaires] = useState(true);

  useEffect(() => {
    loadQuestionnaires();
  }, []);

  useEffect(() => {
    const savedData = localStorage.getItem("selectedCompanyData");

    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        const { companyId, companyName, siteId, siteName } = parsed;
        setSelectedCompanyId(companyId);
        setSelectedSiteId(siteId);
        setCompanyName(companyName?.name || companyName || "N/D");
        setSiteName(siteName?.name || siteName || "N/D");
        setShowSelectDialog(false);
      } catch (err) {
        console.error("Errore parsing localStorage:", err);
        checkAndLoadCompanyData();
      }
    } else {
      checkAndLoadCompanyData();
    }
  }, [userProfile]);

  const loadQuestionnaires = async () => {
    try {
      const snap = await getDocs(collection(db, "questionnaires"));
      const data = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as Questionnaire[];
      setQuestionnaires(data);
    } catch (error) {
      console.error("Errore caricamento questionari:", error);
      toast({
        variant: "destructive",
        title: "Errore",
        description: "Impossibile caricare i questionari disponibili",
      });
    } finally {
      setLoadingQuestionnaires(false);
    }
  };

  const handleQuestionnaireSelect = (questionnaireId: string) => {
    const selected = questionnaires.find((q) => q.id === questionnaireId);
    if (selected) {
      setSelectedQuestionnaireId(questionnaireId);
      setCurrentQuestionnaire(selected);
      setAnswers({});
      toast({
        title: "Questionario selezionato",
        description: `Hai selezionato: ${selected.name}`,
      });
    }
  };

  const checkAndLoadCompanyData = async () => {
    if (userProfile?.companyIds && userProfile.companyIds.length === 1 && userProfile?.siteIds?.length === 1) {
      const companyId = userProfile.companyIds[0];
      const siteId = userProfile.siteIds[0];
      setSelectedCompanyId(companyId);
      setSelectedSiteId(siteId);
      await loadCompanyAndSite(companyId, siteId);
    } else {
      await loadCompaniesAndSites();
      setShowSelectDialog(true);
    }
  };

  const loadCompaniesAndSites = async () => {
    setLoadingData(true);
    try {
      if (!userProfile) return;

      let companiesData: Company[] = [];
      let sitesData: CompanySite[] = [];

      if (userProfile.companyIds && userProfile.companyIds.length > 0) {
        const companiesSnap = await getDocs(collection(db, "companies"));
        const allCompanies = companiesSnap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as Company[];
        companiesData = allCompanies.filter((c) => userProfile.companyIds!.includes(c.id));
      }

      if (userProfile.siteIds && userProfile.siteIds.length > 0) {
        const sitesSnap = await getDocs(collection(db, "companySites"));
        const allSites = sitesSnap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as CompanySite[];
        sitesData = allSites.filter((s) => userProfile.siteIds!.includes(s.id));
      } else if (userProfile.companyIds && userProfile.companyIds.length > 0) {
        const sitesSnap = await getDocs(collection(db, "companySites"));
        const allSites = sitesSnap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as CompanySite[];
        sitesData = allSites.filter((s) => userProfile.companyIds!.includes(s.companyId));
      }

      setCompanies(companiesData);
      setSites(sitesData);
    } catch (err) {
      console.error("Errore caricamento aziende/sedi", err);
    } finally {
      setLoadingData(false);
    }
  };

  const loadCompanyAndSite = async (companyId: string, siteId: string) => {
    try {
      const companyDoc = await getDoc(doc(db, "companies", companyId));
      if (companyDoc.exists()) {
        setCompanyName(companyDoc.data().name || "N/D");
      }

      const siteDoc = await getDoc(doc(db, "companySites", siteId));
      if (siteDoc.exists()) {
        setSiteName(siteDoc.data().name || "N/D");
      }
    } catch (err) {
      console.error("load company/site", err);
    }
  };

  const handleConfirmSelection = async () => {
    if (!selectedCompanyId || !selectedSiteId) {
      toast({
        variant: "destructive",
        title: "Attenzione",
        description: "Seleziona sia azienda che sede per procedere",
      });
      return;
    }

    await loadCompanyAndSite(selectedCompanyId, selectedSiteId);
    setShowSelectDialog(false);
  };

  const filteredSites = sites.filter((s) => s.companyId === selectedCompanyId);

  const setValue = (id: string, value: string | boolean | string[]) => {
    setAnswers((prev) => ({ ...prev, [id]: value }));
  };

  const toggleMulti = (id: string, option: string) => {
    const prev = (answers[id] as string[]) || [];
    if (prev.includes(option)) {
      setAnswers((p) => ({ ...p, [id]: prev.filter((s) => s !== option) }));
    } else {
      setAnswers((p) => ({ ...p, [id]: [...prev, option] }));
    }
  };

  const validateForm = (): boolean => {
    if (!currentQuestionnaire) {
      toast({
        variant: "destructive",
        title: "Attenzione",
        description: "Seleziona un questionario prima di inviare",
      });
      return false;
    }

    for (const q of currentQuestionnaire.questions) {
      if (q.required !== false && !answers[q.id]) {
        toast({
          variant: "destructive",
          title: "Attenzione",
          description: `Rispondi alla domanda: "${q.label}" nella sezione "${q.section}"`,
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
    if (!currentQuestionnaire) return;

    setSubmitting(true);
    try {
      const completeAnswers: Record<string, string | string[] | boolean | null> = {};

      for (const q of currentQuestionnaire.questions) {
        const val = answers[q.id];
        if (Array.isArray(val)) {
          completeAnswers[q.id] = val.map((v) => String(v));
        } else if (typeof val === "string" || typeof val === "boolean") {
          completeAnswers[q.id] = val;
        } else {
          completeAnswers[q.id] = val ? String(val) : "";
        }
      }

      await addDoc(collection(db, "responses"), {
        userId: user?.uid ?? null,
        userEmail: user?.email ?? null,
        companyId: selectedCompanyId,
        siteId: selectedSiteId,
        questionnaireId: selectedQuestionnaireId,
        questionnaireName: currentQuestionnaire.name,
        sector: currentQuestionnaire.sector,
        answers: completeAnswers,
        createdAt: serverTimestamp(),
      });

      toast({
        title: "Questionario inviato!",
        description: "Grazie per aver completato la compilazione",
      });
      localStorage.removeItem("selectedCompanyData");
      navigate("/dashboard");
    } catch (err) {
      console.error("submit err", err);
      toast({
        variant: "destructive",
        title: "Errore",
        description: "Errore durante l'invio. Verifica i dati o riprova.",
      });
    } finally {
      setSubmitting(false);
      setShowPreview(false);
    }
  };

  const groupQuestionsBySection = () => {
    if (!currentQuestionnaire) return {};
    const sections: Record<string, Question[]> = {};
    currentQuestionnaire.questions.forEach((q) => {
      if (!sections[q.section]) sections[q.section] = [];
      sections[q.section].push(q);
    });
    return sections;
  };

  const sections = groupQuestionsBySection();

  const isSectionComplete = (sectionKey: string) => {
    return sections[sectionKey].every((q) => {
      if (q.required === false) return true;
      const val = answers[q.id];
      if (q.type === "checkbox") return Array.isArray(val) && val.length > 0;
      return val !== undefined && val !== "";
    });
  };

  if (loadingQuestionnaires) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-accent/5 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Caricamento questionari...</p>
        </div>
      </div>
    );
  }

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
            <h1 className="text-xl font-bold leading-tight">Compilazione Questionario</h1>
          </div>
          <Button variant="outline" onClick={() => navigate("/dashboard")} className="gap-2 w-full sm:w-auto">
            <ArrowLeft className="h-4 w-4" /> Dashboard
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-5xl space-y-6">
        {selectedCompanyId && selectedSiteId && (
          <Alert className="bg-gradient-to-r from-primary/5 to-accent/5 border-2 border-primary/20">
            <AlertDescription>
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                <div className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  <span className="font-semibold">Azienda:</span>
                  <span className="text-muted-foreground">{companyName || "Caricamento..."}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-primary" />
                  <span className="font-semibold">Sede:</span>
                  <span className="text-muted-foreground">{siteName || "Caricamento..."}</span>
                </div>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Selezione Questionario */}
        {selectedCompanyId && selectedSiteId && (
          <Card className="shadow-lg border-2 border-primary/20">
            <CardHeader className="bg-gradient-to-r from-primary/10 to-accent/10">
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Seleziona Questionario
              </CardTitle>
              <CardDescription>Scegli quale questionario compilare</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <Label htmlFor="questionnaire">Questionario disponibile</Label>
                <Select value={selectedQuestionnaireId} onValueChange={handleQuestionnaireSelect}>
                  <SelectTrigger id="questionnaire">
                    <SelectValue placeholder="Seleziona un questionario..." />
                  </SelectTrigger>
                  <SelectContent>
                    {questionnaires.map((q) => (
                      <SelectItem key={q.id} value={q.id}>
                        {q.name} - {q.sector} ({q.questions.length} domande)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Form Questionario */}
        {currentQuestionnaire && (
          <Card className="shadow-xl border-2">
            <CardHeader className="bg-gradient-to-r from-primary/10 to-accent/10 border-b">
              <CardTitle className="text-2xl">{currentQuestionnaire.name}</CardTitle>
              <CardDescription className="text-base">
                Settore: {currentQuestionnaire.sector} • Compila tutti i campi richiesti
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePreview} className="space-y-6">
                <Accordion type="multiple" className="w-full">
                  {Object.keys(sections).map((sectionKey) => (
                    <AccordionItem
                      key={sectionKey}
                      value={sectionKey}
                      className={`border-2 rounded-xl overflow-hidden transition-colors ${
                        isSectionComplete(sectionKey) ? "border-green-500 bg-green-50" : "border-primary/20 bg-white"
                      }`}
                    >
                      <AccordionTrigger className="px-4 py-3 text-lg font-semibold w-full flex items-center justify-between border-b-0">
                        <span className="text-left">{sectionKey}</span>
                        {isSectionComplete(sectionKey) && <span className="text-green-600 text-sm font-medium ml-auto">✅</span>}
                      </AccordionTrigger>
                      <AccordionContent className="space-y-4 p-4">
                        {sections[sectionKey].map((q) => (
                          <div key={q.id} className="p-4 border-2 rounded-lg bg-card hover:border-primary/30 transition-colors shadow-sm">
                            <Label className="font-semibold">
                              {q.label} {q.required !== false && <span className="text-destructive">*</span>}
                            </Label>

                            {q.type === "text" && (
                              <Input value={(answers[q.id] as string) || ""} onChange={(e) => setValue(q.id, e.target.value)} className="mt-2" />
                            )}

                            {q.type === "textarea" && (
                              <Textarea
                                value={(answers[q.id] as string) || ""}
                                onChange={(e) => setValue(q.id, e.target.value)}
                                rows={4}
                                className="mt-2"
                              />
                            )}

                            {q.type === "multiple" && q.options && (
                              <RadioGroup value={(answers[q.id] as string) || ""} onValueChange={(v) => setValue(q.id, v)} className="mt-2 space-y-2">
                                {q.options.map((opt) => (
                                  <div key={opt} className="flex items-center space-x-2">
                                    <RadioGroupItem value={opt} id={`${q.id}-${opt}`} />
                                    <Label htmlFor={`${q.id}-${opt}`} className="cursor-pointer">
                                      {opt}
                                    </Label>
                                  </div>
                                ))}
                              </RadioGroup>
                            )}

                            {q.type === "checkbox" && q.options && (
                              <div className="mt-2 space-y-2">
                                {q.options.map((opt) => {
                                  const checked = ((answers[q.id] as string[]) || []).includes(opt);
                                  return (
                                    <div key={opt} className="flex items-center space-x-2">
                                      <input type="checkbox" checked={checked} onChange={() => toggleMulti(q.id, opt)} id={`${q.id}-${opt}`} />
                                      <Label htmlFor={`${q.id}-${opt}`} className="cursor-pointer">
                                        {opt}
                                      </Label>
                                    </div>
                                  );
                                })}
                              </div>
                            )}

                            {q.type === "scale" && q.scale && (
                              <div className="mt-2">
                                <Input
                                  type="number"
                                  min={q.scale.min}
                                  max={q.scale.max}
                                  value={(answers[q.id] as string) || ""}
                                  onChange={(e) => setValue(q.id, e.target.value)}
                                  placeholder={`Da ${q.scale.min} a ${q.scale.max}`}
                                />
                              </div>
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
                    {submitting ? "Invio in corso..." : "Invia Questionario"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    onClick={() => {
                      setAnswers({});
                      toast({
                        title: "Form resettato",
                        description: "Tutte le risposte sono state cancellate",
                      });
                    }}
                  >
                    Reset
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}
      </main>

      {/* Dialog Preview */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Conferma le risposte prima dell'invio</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {Object.keys(sections).map((sectionKey) => (
              <div key={sectionKey}>
                <h4 className="font-bold text-primary mt-4 mb-2">{sectionKey}</h4>
                <div className="space-y-2">
                  {sections[sectionKey].map((q) => (
                    <div key={q.id} className="space-y-1">
                      <p className="font-semibold">{q.label}</p>
                      <p className="text-muted-foreground text-sm break-words">
                        {Array.isArray(answers[q.id]) ? (answers[q.id] as string[]).join(", ") || "—" : answers[q.id] || "—"}
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
              {submitting ? "Invio in corso..." : "Conferma e invia"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog selezione azienda e sede */}
      <Dialog open={showSelectDialog} onOpenChange={setShowSelectDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Seleziona Azienda e Sede</DialogTitle>
            <DialogDescription>Prima di compilare il questionario, specifica per quale azienda e sede stai lavorando.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="company">Azienda</Label>
              <Select
                value={selectedCompanyId}
                onValueChange={(value) => {
                  setSelectedCompanyId(value);
                  setSelectedSiteId("");
                }}
              >
                <SelectTrigger id="company">
                  <SelectValue placeholder="Seleziona azienda..." />
                </SelectTrigger>
                <SelectContent>
                  {companies.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="site">Sede</Label>
              <Select value={selectedSiteId} onValueChange={setSelectedSiteId} disabled={!selectedCompanyId}>
                <SelectTrigger id="site">
                  <SelectValue placeholder={selectedCompanyId ? "Seleziona sede..." : "Prima seleziona un'azienda"} />
                </SelectTrigger>
                <SelectContent>
                  {filteredSites.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleConfirmSelection} disabled={!selectedCompanyId || !selectedSiteId || loadingData} className="w-full">
              Conferma e Procedi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CompileQuestionnaire;