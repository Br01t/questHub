import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { ArrowLeft, Users, AlertCircle, CheckCircle2, FileText, BarChart3, Settings, Shield } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const FAQS = [
  {
    question: "Cos'è QuestHub?",
    answer: "QuestHub è un'applicazione per la gestione e l'analisi dei questionari di valutazione VDT per lavoratori e uffici di diverse aziende e sedi."
  },
  {
    question: "Come posso compilare un nuovo questionario?",
    answer: "Clicca su 'Nuovo Questionario' nella dashboard e compila tutte le sezioni richieste. Le domande obbligatorie sono controllate automaticamente e puoi caricare immagini con anteprima."
  },
  {
    question: "Come visualizzo le analisi dei dati?",
    answer: "Clicca su 'Analisi Dati' nella dashboard per vedere statistiche, grafici e distribuzioni. Puoi analizzare i dati per lavoratore, reparto, sede o azienda."
  },
  {
    question: "Posso esportare i report in PDF?",
    answer: "Sì, dalle pagine di analisi puoi esportare PDF dei report per ogni lavoratore (con confronto temporale) o generare relazioni finali personalizzabili con intestazione, corpo e conclusioni."
  },
  {
    question: "Qual è la differenza tra User e Admin?",
    answer: "Gli User possono compilare questionari solo per aziende e sedi assegnate e visualizzare i relativi dati. Gli Admin hanno accesso completo: gestiscono aziende, sedi, utenti e possono vedere tutti i dati."
  },
  {
    question: "Come funzionano i filtri per azienda e sede?",
    answer: "Nella home puoi selezionare azienda e sede dalle tendine accanto al logo per visualizzare i grafici aggiornati. Nelle analisi, i filtri ti permettono di concentrarti sui dati specifici (ancora in perfezionamento)."
  }
];

const FEATURES = [
  {
    icon: FileText,
    title: "Compilazione Questionari",
    items: [
      "Domande obbligatorie e facoltative con controlli automatici",
      "Domande colorate nelle tendine per facilitare la navigazione",
      "Caricamento immagini con anteprima prima dell'invio",
      "User: compilazione solo per aziende/sedi assegnate",
      "Admin: compilazione per qualsiasi azienda e sede"
    ]
  },
  {
    icon: Settings,
    title: "Gestione Sistema",
    items: [
      "Creazione ed eliminazione di aziende e sedi (solo Admin)",
      "Assegnazione di aziende e sedi agli utenti",
      "Gestione autorità admin",
      "Controllo accessi basato su ruoli"
    ]
  },
  {
    icon: BarChart3,
    title: "Analisi e Report",
    items: [
      "Analisi per singolo lavoratore con report PDF confronto temporale",
      "Relazione finale PDF personalizzabile (intestazione, corpo, conclusioni)",
      "Analisi per reparto (user: solo sedi assegnate)",
      "Confronto tra reparti (in sviluppo separazione per azienda)",
      "Grafici aggiornati in tempo reale per azienda/sede selezionata"
    ]
  },
  {
    icon: Shield,
    title: "Controllo Accessi",
    items: [
      "User: accesso solo ai dati di aziende/sedi assegnate",
      "Admin: accesso completo a tutti i dati distinguibili per azienda/sede",
      "Filtri automatici basati sui permessi utente"
    ]
  }
];

const WIP_ITEMS = [
  "Filtri azienda/sede nelle analisi da perfezionare",
  "Separazione completa dei reparti per azienda",
  "Gestione avanzata grafici per confronto reparti",
  "Pulizia e normalizzazione dei dati demo",
  "Ottimizzazione stile mobile",
  "Possibile aggiunta: creazione questionari personalizzati da admin"
];

const Guide = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-accent/5">
      {/* HEADER */}
      <header className="border-b bg-card/80 backdrop-blur-md shadow-md sticky top-0 z-50">
        <div className="container mx-auto px-4 py-5 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 text-center sm:text-left">
            <div className="flex justify-center sm:justify-start">
              <div className="p-2 rounded-lg bg-gradient-to-br from-primary to-primary-glow">
                <Users className="h-6 w-6 text-white" />
              </div>
            </div>
            <h1 className="text-xl font-bold leading-tight">Guida / FAQ</h1>
          </div>

          <div className="flex justify-center sm:justify-end">
            <Button variant="outline" onClick={() => navigate("/dashboard")} className="gap-2 w-full sm:w-auto">
              <ArrowLeft className="h-4 w-4" /> Dashboard
            </Button>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="container mx-auto px-4 py-8 max-w-5xl space-y-8">
        
        {/* DEMO ALERT */}
        <Alert className="border-2 border-amber-500/50 bg-amber-50/50 dark:bg-amber-950/20">
          <AlertCircle className="h-5 w-5 text-amber-600" />
          <AlertDescription className="text-amber-900 dark:text-amber-100">
            <span className="font-semibold">Versione Demo - Work in Progress</span>
            <br />
            Questa è una versione dimostrativa dell'applicazione, ancora in fase di sviluppo. 
            Tutte le funzionalità sono modificabili, perfezionabili e implementabili in versioni future.
          </AlertDescription>
        </Alert>

        {/* FUNZIONALITÀ PRINCIPALI */}
        <Card className="shadow-lg border-2">
          <CardHeader className="bg-gradient-to-r from-primary/10 to-accent/10 border-b">
            <CardTitle className="text-2xl flex items-center gap-2">
              <CheckCircle2 className="h-6 w-6 text-primary" />
              Funzionalità Principali
            </CardTitle>
            <CardDescription>Scopri cosa può fare QuestHub nella sua versione demo</CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            {FEATURES.map((feature, idx) => (
              <div key={idx} className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <feature.icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold">{feature.title}</h3>
                </div>
                <ul className="space-y-2 ml-11">
                  {feature.items.map((item, itemIdx) => (
                    <li key={itemIdx} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* DASHBOARD E VISUALIZZAZIONE */}
        <Card className="shadow-lg border-2">
          <CardHeader className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border-b">
            <CardTitle className="text-xl flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-600" />
              Dashboard e Visualizzazione
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-3">
            <div className="flex items-start gap-2 text-sm">
              <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
              <span>Grafici nella home mostrano dati corretti per azienda e sede selezionata</span>
            </div>
            <div className="flex items-start gap-2 text-sm">
              <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
              <span>Se non ci sono risposte registrate, il grafico rimane vuoto ma la selezione rimane visibile</span>
            </div>
            <div className="flex items-start gap-2 text-sm">
              <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
              <span>Visualizzazione pensata per essere chiara, immediata e comprensibile</span>
            </div>
            <div className="flex items-start gap-2 text-sm">
              <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
              <span>Cross-platform: desktop e mobile (stile da perfezionare)</span>
            </div>
          </CardContent>
        </Card>

        {/* NOTE SUI DATI DEMO */}
        <Card className="shadow-lg border-2 border-blue-200 dark:border-blue-800">
          <CardHeader className="bg-gradient-to-r from-blue-500/10 to-indigo-500/10 border-b">
            <CardTitle className="text-xl flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-blue-600" />
              Nota sui Dati Demo
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground mb-4">
              Alcuni dati presenti sono <span className="font-semibold">parziali o di test</span>, inseriti durante lo sviluppo 
              per verificare le funzionalità. Verranno ripuliti e normalizzati nelle versioni future, ma consentono già di testare:
            </p>
            <ul className="space-y-2">
              <li className="flex items-start gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                <span>Creazione dei report PDF</span>
              </li>
              <li className="flex items-start gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                <span>Confronto tra risposte singole nel tempo</span>
              </li>
              <li className="flex items-start gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                <span>Confronto tra reparti (visualizzazione finale, da sistemare separazione per azienda)</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* IN SVILUPPO */}
        <Card className="shadow-lg border-2 border-orange-200 dark:border-orange-800">
          <CardHeader className="bg-gradient-to-r from-orange-500/10 to-amber-500/10 border-b">
            <CardTitle className="text-xl flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-600" />
              Funzionalità in Sviluppo
            </CardTitle>
            <CardDescription>Aspetti da perfezionare e implementare</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <ul className="space-y-2">
              {WIP_ITEMS.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <div className="h-2 w-2 rounded-full bg-orange-500 mt-2 flex-shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* FAQ */}
        <Card className="shadow-lg border-2">
          <CardHeader className="bg-gradient-to-r from-primary/10 to-accent/10 border-b">
            <CardTitle className="text-2xl">Domande Frequenti (FAQ)</CardTitle>
            <CardDescription>Trova le risposte alle domande più comuni</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <Accordion type="single" collapsible>
              {FAQS.map((faq, idx) => (
                <AccordionItem key={idx} value={`item-${idx}`}>
                  <AccordionTrigger className="text-left">{faq.question}</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">{faq.answer}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>

      </main>
    </div>
  );
};

export default Guide;