import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

const PrivacyPolicy = () => {
  const navigate = useNavigate();

  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-6">Informativa Privacy (TODO)</h1>
      <p className="mb-4">
        La presente Informativa Privacy descrive come raccogliamo, utilizziamo e proteggiamo i tuoi dati personali in conformità al Regolamento UE
        2016/679 (GDPR) e alle linee guida ISO 27001.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-2">Dati raccolti</h2>
      <p className="mb-4">
        Raccogliamo dati come nome, email e risposte ai questionari, esclusivamente per finalità di gestione dei servizi offerti.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-2">Finalità del trattamento</h2>
      <p className="mb-4">I dati vengono trattati per fornire i servizi richiesti, analizzare le risposte e generare statistiche anonime.</p>

      <h2 className="text-xl font-semibold mt-6 mb-2">Diritti dell’utente</h2>
      <p className="mb-4">Puoi in qualsiasi momento accedere, rettificare o cancellare i tuoi dati, così come revocare il consenso al trattamento.</p>

      <h2 className="text-xl font-semibold mt-6 mb-2">Sicurezza dei dati</h2>
      <p className="mb-4">Adottiamo misure tecniche e organizzative conformi a ISO 27001 per proteggere i dati da accessi non autorizzati.</p>

      <div className="mt-8">
        <Button variant="outline" onClick={() => navigate("/")} className="gap-2 flex items-center">
          <ArrowLeft className="h-4 w-4" />
          Torna alla home
        </Button>
      </div>
    </div>
  );
};

export default PrivacyPolicy;