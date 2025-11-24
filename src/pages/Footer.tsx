import { Link } from "react-router-dom";

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-card/90 backdrop-blur-md border-t border-gray-200">
      <div className="container mx-auto px-4 py-6 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
        <div className="flex flex-col md:flex-row items-center gap-4 text-center md:text-left">
          <span>&copy; {currentYear} QuestHub</span>
          <Link to="/privacy" className="underline hover:text-primary transition-colors">
            Privacy Policy
          </Link>
          <Link to="/cookies" className="underline hover:text-primary transition-colors">
            Cookie Policy
          </Link>
        </div>

        <div className="flex flex-col md:flex-row items-center gap-4 text-center md:text-right">
          <span>
            Contatti:{" "}
            <a href="mailto:info@questhub.com" className="underline hover:text-primary">
              info@questhub.com
            </a>
          </span>
          <span>Tel: +39 0123 456 789</span>
        </div>

        <div className="mt-2 md:mt-0 text-xs text-muted-foreground text-center md:text-right max-w-md">
          (TODO) I dati raccolti sono trattati in conformità al <strong>GDPR (Reg. UE 2016/679)</strong> e alle policy aziendali ISO 27001/9001 per la
          sicurezza e la qualità dei dati.
        </div>
      </div>
    </footer>
  );
};

export default Footer;