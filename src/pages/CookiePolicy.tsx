import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

const CookiePolicy = () => {
  const navigate = useNavigate();

  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-6">Cookie Policy (TODO)</h1>
      <p className="mb-4">
        Questo sito utilizza cookie per garantire la migliore esperienza di navigazione, analizzare il traffico e personalizzare i contenuti.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-2">Tipi di cookie utilizzati</h2>
      <ul className="list-disc ml-6 mb-4">
        <li>
          <strong>Cookie tecnici:</strong> necessari al corretto funzionamento del sito.
        </li>
        <li>
          <strong>Cookie analitici:</strong> per raccogliere dati anonimi sulle visite.
        </li>
        <li>
          <strong>Cookie di profilazione:</strong> opzionali, utilizzati solo con consenso esplicito.
        </li>
      </ul>

      <h2 className="text-xl font-semibold mt-6 mb-2">Gestione dei cookie</h2>
      <p className="mb-4">Puoi modificare le tue preferenze sui cookie attraverso le impostazioni del browser o rifiutare il loro utilizzo.</p>

      <div className="mt-8">
        <Button
          variant="outline"
          onClick={() => navigate("/")}
          className="gap-2 flex items-center"
        >
          <ArrowLeft className="h-4 w-4" />
          Torna alla home
        </Button>
      </div>
    </div>
  );
};

export default CookiePolicy;