import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Search, Check, BarChart3 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

type AnswerValue = string | number | boolean | string[] | null | undefined;

type ResponseDoc = {
  id: string;
  createdAt?: { toDate: () => Date };
  answers?: Record<string, AnswerValue>;
  userEmail?: string | null;
  userId?: string | null;
  companyId?: string | null;
  siteId?: string | null;
};

// Le domande vengono ora dal questionario selezionato

interface QuestionItem {
  id: string;
  label: string;
  type?: string;
  options?: string[];
  required?: boolean;
  section?: string;
}

interface Questionnaire {
  id: string;
  name: string;
  sector: string;
  questions: QuestionItem[];
  isActive?: boolean;
  createdAt?: Date;
}

interface SiteAnalysisProps {
  filteredResponses: ResponseDoc[];
  userProfile: any;
  isSuperAdmin: boolean;
  availableCompanies: { id: string; name: string }[];
  availableSites: { id: string; name: string; companyId: string }[];
  selectedCompanyFilter: string;
  setSelectedCompanyFilter: (value: string) => void;
  selectedSiteFilter: string;
  setSelectedSiteFilter: (value: string) => void;
  selectedQuestionnaire: Questionnaire | null;
}

export default function SiteAnalysis({
  filteredResponses,
  userProfile,
  isSuperAdmin,
  availableCompanies,
  availableSites,
  selectedCompanyFilter,
  setSelectedCompanyFilter,
  selectedSiteFilter,
  setSelectedSiteFilter,
  selectedQuestionnaire,
}: SiteAnalysisProps) {
  const FULL_QUESTIONS = selectedQuestionnaire?.questions || [];
  const [selectedSite, setSelectedSite] = useState<string>("all");
  const [openSite, setOpenSite] = useState(false);

  // Estrai le sedi uniche dalle risposte del questionario con l'azienda associata
  const sitesWithCompany = useMemo(() => {
    const sitesMap = new Map<string, { sede: string; companyName: string }>();
    
    filteredResponses.forEach((r) => {
      const sede = String(r.answers?.meta_sede || "");
      if (!sede || sede === "undefined" || sede === "null" || sede === "N/D" || sede.trim() === "") return;
      
      if (!sitesMap.has(sede)) {
        const companyId = r.companyId;
        const companyName = companyId ? availableCompanies.find((c) => c.id === companyId)?.name || "" : "";
        sitesMap.set(sede, { sede, companyName });
      }
    });
    
    return Array.from(sitesMap.values()).sort((a, b) => a.sede.localeCompare(b.sede));
  }, [filteredResponses, availableCompanies]);

  const availableSitesFromResponses = useMemo(() => sitesWithCompany.map(s => s.sede), [sitesWithCompany]);

  // Reset sede quando cambiano le risposte filtrate
  useEffect(() => {
    if (selectedSite !== "all" && !availableSitesFromResponses.includes(selectedSite)) {
      setSelectedSite("all");
    }
  }, [availableSitesFromResponses, selectedSite]);

  const responsesBySite = useMemo(() => {
    if (selectedSite === "all") return [];
    return filteredResponses.filter((r) => String(r.answers?.meta_sede || "") === selectedSite);
  }, [filteredResponses, selectedSite]);

  const dates = responsesBySite.map((r) => (r.createdAt?.toDate() ? format(r.createdAt.toDate(), "dd/MM/yyyy HH:mm") : "N/D"));

  const workers = useMemo(
    () => Array.from(new Set(responsesBySite.map((r) => String(r.answers?.meta_nome)).filter((n) => n && n !== "undefined" && n !== "null"))).sort(),
    [responsesBySite]
  );

  const renderAnswer = (val: AnswerValue) => {
    if (val === undefined || val === null || val === "") return "—";
    if (Array.isArray(val)) return val.join(", ");
    return String(val);
  };

  const generatePDF = () => {
    if (selectedSite === "all" || responsesBySite.length === 0) return;

    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const marginLeft = 14;
    doc.setFontSize(16);
    doc.text(`Report Sede: ${selectedSite}`, marginLeft, 20);

    const dates = responsesBySite
      .map((r) => r.createdAt?.toDate?.() ?? r.createdAt)
      .filter(Boolean)
      .map((d) => format(d as Date, "dd/MM/yyyy HH:mm"));

    doc.setFontSize(11);
    doc.text(`Date compilazioni: ${dates.join(", ")}`, marginLeft, 28);

    const body: any[] = [];
    let currentSection = "";

    FULL_QUESTIONS.forEach((q) => {
      const sectionTitle = q.section;
      if (sectionTitle && sectionTitle !== currentSection) {
        currentSection = sectionTitle;
        // Riga sezione con sfondo grigio e testo bold maiuscolo
        body.push([
          {
            content: currentSection.toUpperCase(),
            colSpan: workers.length + 1,
            styles: {
              fillColor: [229, 231, 235], // grigio chiaro come bg-gray-200
              fontStyle: "bold",
              halign: "left",
            },
          },
        ]);
      }

      const answers = responsesBySite.map((r) => {
        const val = r.answers?.[q.id];
        if (q.id === "foto_postazione" && typeof val === "string" && val.startsWith("data:image")) {
          return "—"; // Ignora immagini
        }
        return renderAnswer(val);
      });

      if (answers.every((a) => a === "—")) return;

      // Riga domanda + risposte lavoratori
      body.push([
        { content: q.label, styles: { fontStyle: "bold", halign: "left" } },
        ...answers.map((a) => ({ content: a, styles: { halign: "center" } })),
      ]);
    });

    autoTable(doc, {
      startY: 35,
      head: [["Domanda", ...workers]],
      body,
      theme: "striped",
      styles: {
        fontSize: 8,
        cellPadding: 2,
        valign: "middle",
        halign: "center",
      },
      didParseCell: (data) => {
        // Riga sezione con colSpan
        if (typeof data.cell.raw === 'object' && data.cell.raw && 'colSpan' in data.cell.raw) {
          data.cell.styles.fillColor = [229, 231, 235];
          data.cell.styles.fontStyle = "bold";
        }
      },
    });

    doc.setFontSize(8);
    doc.text(`Generato il ${format(new Date(), "dd/MM/yyyy HH:mm")}`, marginLeft, 290);

    doc.save(`report_sede_${selectedSite}_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-end items-center mb-4 gap-4">
        <Button variant="default" className="gap-2" onClick={generatePDF} disabled={selectedSite === "all"}>
          <BarChart3 className="h-4 w-4" />
          Esporta PDF
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 p-4 bg-accent/5 rounded-lg border">
        {/* Filtro Sede */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Search className="h-5 w-5 text-primary shrink-0" />
          <Popover open={openSite} onOpenChange={setOpenSite}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={openSite}
                className="w-full sm:w-[300px] justify-between"
                disabled={availableSitesFromResponses.length === 0}
              >
                {selectedSite === "all" ? "Seleziona sede..." : selectedSite}
                <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full sm:w-[300px] p-0">
              <Command>
                <CommandInput placeholder="Cerca sede..." />
                <CommandList>
                  <CommandEmpty>Nessuna sede trovata.</CommandEmpty>
                  <CommandGroup>
                    <CommandItem
                      value="all"
                      onSelect={() => {
                        setSelectedSite("all");
                        setOpenSite(false);
                      }}
                    >
                      <Check className={cn("mr-2 h-4 w-4", selectedSite === "all" ? "opacity-100" : "opacity-0")} />
                      Tutte
                    </CommandItem>
                    {sitesWithCompany.map((item) => (
                      <CommandItem
                        key={item.sede}
                        value={item.sede}
                        onSelect={(v) => {
                          setSelectedSite(v);
                          setOpenSite(false);
                        }}
                      >
                        <Check className={cn("mr-2 h-4 w-4", selectedSite === item.sede ? "opacity-100" : "opacity-0")} />
                        <span>{item.sede}</span>
                        {item.companyName && <span className="ml-2 text-muted-foreground text-xs">({item.companyName})</span>}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {selectedSite === "all" ? (
        <Card className="shadow-md">
          <CardContent className="py-12 text-center text-muted-foreground">Seleziona una sede per visualizzare il report.</CardContent>
        </Card>
      ) : (
        <Card className="shadow-lg border-2">
          <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent border-b">
            <CardTitle>{selectedSite}</CardTitle>
            <CardDescription>Confronto risposte dei lavoratori nella sede</CardDescription>
          </CardHeader>
          <CardContent className="pt-6 overflow-x-auto">
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr className="bg-accent/30 border-b">
                  <th className="text-left p-2 border-r font-semibold w-1/3">Domanda</th>
                  {workers.map((w) => (
                    <th key={w} className="text-center p-2 border-r font-semibold">
                      {w}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(() => {
                  let currentSection = "";
                  const rows: JSX.Element[] = [];
                  FULL_QUESTIONS.forEach((q) => {
                    const sectionTitle = q.section;
                    if (sectionTitle && sectionTitle !== currentSection) {
                      currentSection = sectionTitle;
                      rows.push(
                        <tr key={`section-${currentSection}`} className="bg-gray-200 text-left border-t-4 border-gray-300">
                          <td colSpan={workers.length + 1} className="p-2 font-semibold text-gray-800 uppercase tracking-wide">
                            {currentSection}
                          </td>
                        </tr>
                      );
                    }

                    const answers = responsesBySite.map((r) => {
                      const val = r.answers?.[q.id];

                      // Mostra l'immagine se è la colonna 'foto_postazione'
                      if (q.id === "foto_postazione" && typeof val === "string" && val.startsWith("data:image")) {
                        return <img src={val} alt={`Foto ${r.answers?.meta_nome || ""}`} className="mx-auto h-16 w-16 object-cover rounded" />;
                      }

                      return renderAnswer(val);
                    });

                    if (answers.every((a) => a === "—")) return;

                    rows.push(
                      <tr key={q.id} className="border-b hover:bg-accent/10">
                        <td className="p-2 border-r align-top font-medium">{q.label}</td>
                        {answers.map((a, idx) => (
                          <td key={idx + q.id} className="p-2 text-center border-r align-top">
                            {a}
                          </td>
                        ))}
                      </tr>
                    );
                  });
                  return rows;
                })()}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}