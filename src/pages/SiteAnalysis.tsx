import { useState, useMemo, useEffect } from "react";
import { collection, getDocs, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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

type Company = {
  id: string;
  name: string;
};

type CompanySite = {
  id: string;
  name: string;
  companyId: string;
};

const FULL_QUESTIONS: { id: string; label: string }[] = [
  { id: "meta_nome", label: "Nome valutato / lavoratore" },
  { id: "meta_postazione", label: "Postazione n." },
  { id: "meta_reparto", label: "Ufficio / Reparto" },
  { id: "1.1", label: "1.1 Ore di lavoro settimanali a VDT (abituali)" },
  { id: "1.2", label: "1.2 Pause/cambi attività 15' ogni 120' (SI/NO)" },
  { id: "1.2_note", label: "1.2 - Necessità di intervento (note)" },
  { id: "1.3", label: "1.3 Tipo di lavoro prevalente" },
  { id: "1.4", label: "1.4 Informazione al lavoratore per uso VDT (SI/NO)" },
  { id: "1.4_note", label: "1.4 - Necessità di intervento (note)" },
  { id: "2.1", label: "2.1 Modalità ricambio aria (naturale/artificiale)" },
  { id: "2.2", label: "2.2 Possibilità di regolare la temperatura" },
  { id: "2.3", label: "2.3 Possibilità di regolare l'umidità" },
  { id: "2.4", label: "2.4 Eccesso di calore dalle attrezzature (SI/NO)" },
  { id: "2.4_note", label: "2.4 - Necessità di intervento (note)" },
  { id: "3.1", label: "3.1 Tipo di luce (naturale/artificiale/mista)" },
  { id: "3.2_nat", label: "3.2 - Regolazione luce naturale" },
  { id: "3.2_art", label: "3.2 - Regolazione luce artificiale" },
  { id: "3.3", label: "3.3 Posizione rispetto alla sorgente naturale" },
  { id: "3_note", label: "3 - Necessità di intervento (note)" },
  { id: "4.1", label: "4.1 Eventuale misura rumore (dB(A))" },
  { id: "4.2", label: "4.2 Disturbo attenzione/comunicazione (SI/NO)" },
  { id: "4_note", label: "4 - Necessità di intervento (note)" },
  { id: "5.1", label: "5.1 Spazio di lavoro/manovra adeguato (SI/NO)" },
  { id: "5.2", label: "5.2 Percorsi liberi da ostacoli (SI/NO)" },
  { id: "5_note", label: "5 - Necessità di intervento (note)" },
  { id: "6.1", label: "6.1 Superficie del piano adeguata (SI/NO)" },
  { id: "6.2", label: "6.2 Altezza del piano 70-80cm (SI/NO)" },
  {
    id: "6.3",
    label: "6.3 Dimensioni/disposizione schermo/tastiera/mouse (SI/NO)",
  },
  { id: "6_note", label: "6 - Necessità di intervento (note)" },
  { id: "7.1", label: "7.1 Altezza sedile regolabile" },
  { id: "7.2", label: "7.2 Inclinazione sedile regolabile" },
  { id: "7.3", label: "7.3 Schienale con supporto dorso-lombare" },
  { id: "7.4", label: "7.4 Schienale regolabile in altezza" },
  {
    id: "7.5",
    label: "7.5 Schienale/seduta bordi smussati/materiali appropriati",
  },
  { id: "7.6", label: "7.6 Presenza di ruote/meccanismo spostamento" },
  { id: "7_note", label: "7 - Necessità di intervento (note)" },
  { id: "8.1", label: "8.1 Monitor orientabile/inclinabile" },
  { id: "8.2", label: "8.2 Immagine stabile, senza sfarfallio" },
  { id: "8.3", label: "8.3 Risoluzione/luminosità regolabili" },
  { id: "8.4", label: "8.4 Contrasto/luminosità adeguati" },
  { id: "8.5", label: "8.5 Presenza di riflessi o riverberi" },
  { id: "8.6", label: "8.6 Note su posizione dello schermo" },
  { id: "8_note", label: "8 - Necessità di intervento (note)" },
  { id: "9.1", label: "9.1 Tastiera e mouse separati dallo schermo" },
  { id: "9.2", label: "9.2 Tastiera inclinabile" },
  { id: "9.3", label: "9.3 Spazio per appoggiare avambracci" },
  { id: "9.4", label: "9.4 Simboli/tasti leggibili" },
  { id: "9_note", label: "9 - Necessità di intervento (note)" },
  { id: "10.1", label: "10.1 Software adeguato e di facile utilizzo (SI/NO)" },
  { id: "10_note", label: "10 - Osservazioni (note)" },
  { id: "foto_postazione", label: "Foto della postazione (URL/nota)" },
];

const SECTION_TITLES: Record<string, string> = {
  meta_nome: "INTESTAZIONE",
  "1.1": "1) ORGANIZZAZIONE DEL LAVORO",
  "2.1": "2) MICROCLIMA",
  "3.1": "3) ILLUMINAZIONE",
  "4.1": "4) RUMORE",
  "5.1": "5) AMBIENTE DI LAVORO",
  "6.1": "6) PIANO DI LAVORO",
  "7.1": "7) SEDILE DI LAVORO",
  "8.1": "8) SCHERMO",
  "9.1": "9) TASTIERA E DISPOSITIVI DI INPUT",
  "10.1": "10) SOFTWARE",
};

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
}: SiteAnalysisProps) {
  const [selectedCompany, setSelectedCompany] = useState<string>("all");
  const [selectedSite, setSelectedSite] = useState<string>("all");
  const [openCompany, setOpenCompany] = useState(false);
  const [openSite, setOpenSite] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [allSites, setAllSites] = useState<CompanySite[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Carica aziende
      const companiesSnap = await getDocs(query(collection(db, "companies")));
      let companiesData = companiesSnap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as Company[];

      // Carica sedi
      const sitesSnap = await getDocs(query(collection(db, "companySites")));
      let sitesData = sitesSnap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as CompanySite[];

      // Filtra in base ai permessi utente
      if (!isSuperAdmin && userProfile) {
        const userCompanyIds = userProfile?.companyIds || [];
        const userSiteIds = userProfile?.siteIds || [];

        // Filtra aziende assegnate
        if (userCompanyIds.length > 0) {
          companiesData = companiesData.filter((company) =>
            userCompanyIds.includes(company.id)
          );
        }

        // Filtra sedi assegnate
        if (userSiteIds.length > 0) {
          sitesData = sitesData.filter((site) => userSiteIds.includes(site.id));
        }
      }

      setCompanies(companiesData);
      setAllSites(sitesData);
    } catch (err) {
      console.error("load data", err);
    } finally {
      setLoading(false);
    }
  };

  // Sedi filtrate per azienda selezionata
  const filteredSites = useMemo(() => {
    if (selectedCompany === "all") return allSites;
    return allSites.filter((site) => site.companyId === selectedCompany);
  }, [allSites, selectedCompany]);

  // Reset sede quando cambia l'azienda
  useEffect(() => {
    setSelectedSite("all");
  }, [selectedCompany]);

  const responsesBySite = useMemo(() => {
    if (selectedSite === "all") return [];
    return filteredResponses.filter((r) => r.siteId === selectedSite);
  }, [filteredResponses, selectedSite]);

  const dates = responsesBySite.map((r) =>
    r.createdAt?.toDate()
      ? format(r.createdAt.toDate(), "dd/MM/yyyy HH:mm")
      : "N/D"
  );

  const workers = useMemo(
    () =>
      Array.from(
        new Set(
          responsesBySite
            .map((r) => String(r.answers?.meta_nome))
            .filter((n) => n && n !== "undefined" && n !== "null")
        )
      ).sort(),
    [responsesBySite]
  );

  const renderAnswer = (val: AnswerValue) => {
    if (val === undefined || val === null || val === "") return "—";
    if (Array.isArray(val)) return val.join(", ");
    return String(val);
  };

  const generatePDF = () => {
    if (selectedSite === "all" || responsesBySite.length === 0) return;

    const siteName =
      allSites.find((s) => s.id === selectedSite)?.name || selectedSite;
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });
    const marginLeft = 14;

    doc.setFontSize(16);
    doc.text(`Report sede: ${siteName}`, marginLeft, 20);
    doc.setFontSize(11);
    doc.text(`Date compilazioni: ${dates.join(", ")}`, marginLeft, 28);

    const body: string[][] = [];
    let currentSection = "";

    FULL_QUESTIONS.forEach((q) => {
      const sectionTitle = Object.entries(SECTION_TITLES).find(
        ([id]) => q.id === id
      )?.[1];
      if (sectionTitle && sectionTitle !== currentSection) {
        currentSection = sectionTitle;
        body.push([sectionTitle, ...Array(workers.length).fill("")]);
      }

      const answers = responsesBySite.map((r) =>
        renderAnswer(r.answers?.[q.id])
      );
      if (answers.every((a) => a === "—")) return;
      body.push([q.label, ...answers]);
    });

    autoTable(doc, {
      startY: 35,
      head: [["Domanda", ...workers]],
      body,
      theme: "striped",
      styles: { fontSize: 8, cellPadding: 2 },
      didParseCell: (data) => {
        if (body[data.row.index]?.[0] === currentSection) {
          data.cell.styles.fillColor = [230, 230, 230];
          data.cell.styles.fontStyle = "bold";
        }
      },
    });

    doc.setFontSize(8);
    doc.text(
      `Generato il ${format(new Date(), "dd/MM/yyyy HH:mm")}`,
      marginLeft,
      290
    );

    doc.save(
      `report_sede_${siteName}_${new Date().toISOString().slice(0, 10)}.pdf`
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-end items-center mb-4 gap-4">
        <Button
          variant="default"
          className="gap-2"
          onClick={generatePDF}
          disabled={selectedSite === "all"}
        >
          <BarChart3 className="h-4 w-4" />
          Esporta PDF
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 p-4 bg-accent/5 rounded-lg border">
        {/* Filtro Azienda */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Search className="h-5 w-5 text-primary shrink-0" />
          <Popover open={openCompany} onOpenChange={setOpenCompany}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={openCompany}
                className="w-full sm:w-[300px] justify-between"
              >
                {selectedCompany === "all"
                  ? "Tutte le aziende"
                  : companies.find((c) => c.id === selectedCompany)?.name ||
                    selectedCompany}
                <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full sm:w-[250px] p-0">
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
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          selectedCompany === "all"
                            ? "opacity-100"
                            : "opacity-0"
                        )}
                      />
                      Tutte
                    </CommandItem>
                    {companies.map((c) => (
                      <CommandItem
                        key={c.id}
                        value={c.id}
                        onSelect={(v) => {
                          setSelectedCompany(v);
                          setOpenCompany(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            selectedCompany === c.id
                              ? "opacity-100"
                              : "opacity-0"
                          )}
                        />
                        {c.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        {/* Filtro Sede */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Popover open={openSite} onOpenChange={setOpenSite}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={openSite}
                className="w-full sm:w-[300px] justify-between"
                disabled={filteredSites.length === 0}
              >
                {selectedSite === "all"
                  ? "Tutte le sedi"
                  : (() => {
                      const site = allSites.find((s) => s.id === selectedSite);
                      const company = companies.find(
                        (c) => c.id === site?.companyId
                      );
                      return site && company
                        ? `${site.name} - ${company.name}`
                        : selectedSite;
                    })()}
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
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          selectedSite === "all" ? "opacity-100" : "opacity-0"
                        )}
                      />
                      Tutte
                    </CommandItem>
                    {filteredSites.map((s) => {
                      const company = companies.find(
                        (c) => c.id === s.companyId
                      );
                      return (
                        <CommandItem
                          key={s.id}
                          value={s.id}
                          onSelect={(v) => {
                            setSelectedSite(v);
                            setOpenSite(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              selectedSite === s.id
                                ? "opacity-100"
                                : "opacity-0"
                            )}
                          />
                          {company ? `${s.name} - ${company.name}` : s.name}
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {selectedSite === "all" ? (
        <Card className="shadow-md">
          <CardContent className="py-12 text-center text-muted-foreground">
            Seleziona una sede per visualizzare il report.
          </CardContent>
        </Card>
      ) : (
        <Card className="shadow-lg border-2">
          <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent border-b">
            <CardTitle>
              {allSites.find((s) => s.id === selectedSite)?.name ||
                selectedSite}
            </CardTitle>
            <CardDescription>
              Confronto risposte dei lavoratori nella sede
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6 overflow-x-auto">
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr className="bg-accent/30 border-b">
                  <th className="text-left p-2 border-r font-semibold w-1/3">
                    Domanda
                  </th>
                  {workers.map((w) => (
                    <th
                      key={w}
                      className="text-center p-2 border-r font-semibold"
                    >
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
                    const sectionTitle = Object.entries(SECTION_TITLES).find(
                      ([id]) => q.id === id
                    )?.[1];
                    if (sectionTitle && sectionTitle !== currentSection) {
                      currentSection = sectionTitle;
                      rows.push(
                        <tr
                          key={`section-${currentSection}`}
                          className="bg-gray-200 text-left border-t-4 border-gray-300"
                        >
                          <td
                            colSpan={workers.length + 1}
                            className="p-2 font-semibold text-gray-800 uppercase tracking-wide"
                          >
                            {currentSection}
                          </td>
                        </tr>
                      );
                    }

                    const answers = responsesBySite.map((r) => {
                      const val = r.answers?.[q.id];

                      // Mostra l'immagine se è la colonna 'foto_postazione'
                      if (
                        q.id === "foto_postazione" &&
                        typeof val === "string" &&
                        val.startsWith("data:image")
                      ) {
                        return (
                          <img
                            src={val}
                            alt={`Foto ${r.answers?.meta_nome || ""}`}
                            className="mx-auto h-16 w-16 object-cover rounded"
                          />
                        );
                      }

                      return renderAnswer(val);
                    });

                    if (answers.every((a) => a === "—")) return;

                    rows.push(
                      <tr key={q.id} className="border-b hover:bg-accent/10">
                        <td className="p-2 border-r align-top font-medium">
                          {q.label}
                        </td>
                        {answers.map((a, idx) => (
                          <td
                            key={idx + q.id}
                            className="p-2 text-center border-r align-top"
                          >
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
