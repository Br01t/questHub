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

interface CompanyAnalysisProps {
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

export default function CompanyAnalysis({
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
}: CompanyAnalysisProps) {
  const FULL_QUESTIONS = selectedQuestionnaire?.questions || [];
  const [selectedCompany, setSelectedCompany] = useState<string>("all");
  const [openCompany, setOpenCompany] = useState(false);

  // Estrai le aziende uniche dalle risposte del questionario
  const availableCompaniesFromResponses = useMemo(() => {
    const companies = filteredResponses
      .map((r) => String(r.answers?.meta_azienda || ""))
      .filter((c) => c && c !== "undefined" && c !== "null" && c !== "N/D" && c.trim() !== "");
    return Array.from(new Set(companies)).sort();
  }, [filteredResponses]);

  // Reset azienda quando cambiano le risposte filtrate
  useEffect(() => {
    if (selectedCompany !== "all" && !availableCompaniesFromResponses.includes(selectedCompany)) {
      setSelectedCompany("all");
    }
  }, [availableCompaniesFromResponses, selectedCompany]);

  const responsesByCompany = useMemo(() => {
    if (selectedCompany === "all") return [];
    return filteredResponses.filter((r) => String(r.answers?.meta_azienda || "") === selectedCompany);
  }, [filteredResponses, selectedCompany]);

  const dates = responsesByCompany.map((r) => (r.createdAt?.toDate() ? format(r.createdAt.toDate(), "dd/MM/yyyy HH:mm") : "N/D"));

  const workers = useMemo(
    () =>
      Array.from(new Set(responsesByCompany.map((r) => String(r.answers?.meta_nome)).filter((n) => n && n !== "undefined" && n !== "null"))).sort(),
    [responsesByCompany]
  );

  const renderAnswer = (val: AnswerValue) => {
    if (val === undefined || val === null || val === "") return "—";
    if (Array.isArray(val)) return val.join(", ");
    return String(val);
  };

  const generatePDF = () => {
    if (selectedCompany === "all" || responsesByCompany.length === 0) return;

    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });
    const marginLeft = 14;

    doc.setFontSize(16);
    doc.text(`Report azienda: ${selectedCompany}`, marginLeft, 20);

    const dates = responsesByCompany.map((r) => (r.createdAt?.toDate ? format(r.createdAt.toDate(), "dd/MM/yyyy HH:mm") : "N/D")).filter(Boolean);

    doc.setFontSize(11);
    doc.text(`Date compilazioni: ${dates.join(", ")}`, marginLeft, 28);

    const body: any[] = [];
    let currentSection = "";

    FULL_QUESTIONS.forEach((q) => {
      const sectionTitle = q.section;

      if (sectionTitle && sectionTitle !== currentSection) {
        currentSection = sectionTitle;
        body.push([
          {
            content: currentSection.toUpperCase(),
            colSpan: workers.length + 1,
            styles: {
              fillColor: [229, 231, 235],
              fontStyle: "bold",
              halign: "left",
            },
          },
        ]);
      }

      const answers = responsesByCompany.map((r) => {
        const val = r.answers?.[q.id];
        if (q.id === "foto_postazione" && typeof val === "string") {
          return "—"; // Ignora immagini per ora TODO
        }
        return renderAnswer(val);
      });

      if (answers.every((a) => a === "—")) return;

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
        if (typeof data.cell.raw === 'object' && data.cell.raw && 'colSpan' in data.cell.raw) {
          data.cell.styles.fillColor = [229, 231, 235];
          data.cell.styles.fontStyle = "bold";
          data.cell.styles.halign = "left";
        }
      },
    });

    doc.setFontSize(8);
    doc.text(`Generato il ${format(new Date(), "dd/MM/yyyy HH:mm")}`, marginLeft, 290);

    doc.save(`report_azienda_${selectedCompany}_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between items-center mb-4 gap-4">
        {/* Pulsante export */}
        <Button variant="default" className="gap-2" onClick={generatePDF} disabled={selectedCompany === "all"}>
          <BarChart3 className="h-4 w-4" />
          Esporta PDF
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 p-4 bg-accent/5 rounded-lg border">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Search className="h-5 w-5 text-primary shrink-0" />
          <Popover open={openCompany} onOpenChange={setOpenCompany}>
            <PopoverTrigger asChild>
              <Button variant="outline" role="combobox" aria-expanded={openCompany} className="w-full sm:w-[300px] justify-between">
                {selectedCompany === "all" ? "Seleziona azienda..." : selectedCompany}
                <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full sm:w-[300px] p-0">
              <Command>
                <CommandInput placeholder="Cerca azienda..." />
                <CommandList>
                  <CommandEmpty>Nessuna azienda trovata.</CommandEmpty>
                  <CommandGroup>
                    <CommandItem
                      value="all"
                      onSelect={() => {
                        setSelectedCompany("all");
                        setOpenCompany(false);
                      }}
                    >
                      <Check className={cn("mr-2 h-4 w-4", selectedCompany === "all" ? "opacity-100" : "opacity-0")} />
                      Tutte
                    </CommandItem>
                    {availableCompaniesFromResponses.map((c) => (
                      <CommandItem
                        key={c}
                        value={c}
                        onSelect={(v) => {
                          setSelectedCompany(v);
                          setOpenCompany(false);
                        }}
                      >
                        <Check className={cn("mr-2 h-4 w-4", selectedCompany === c ? "opacity-100" : "opacity-0")} />
                        {c}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {selectedCompany === "all" ? (
        <Card className="shadow-md">
          <CardContent className="py-12 text-center text-muted-foreground">Seleziona un'azienda per visualizzare il report.</CardContent>
        </Card>
      ) : (
        <Card className="shadow-lg border-2">
          <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent border-b">
            <CardTitle>{selectedCompany}</CardTitle>
            <CardDescription>Confronto risposte dei lavoratori nell'azienda</CardDescription>
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

                    const answers = responsesByCompany.map((r) => {
                      const val = r.answers?.[q.id];

                      if (q.id === "foto_postazione" && typeof val === "string") {
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