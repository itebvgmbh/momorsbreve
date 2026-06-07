import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { XCircle, ArrowLeft, CreditCard } from "lucide-react";

export default function PaymentCancelPage() {
  const [, navigate] = useLocation();

  return (
    <div className="p-4 sm:p-6 max-w-lg mx-auto mt-12">
      <Card className="p-8 text-center space-y-6">
        <div className="relative mx-auto w-fit">
          <XCircle className="h-16 w-16 text-muted-foreground" />
        </div>

        <div className="space-y-2">
          <h1 className="font-serif text-2xl font-bold">Zahlung abgebrochen</h1>
          <p className="text-muted-foreground">
            Die Zahlung wurde abgebrochen. Es wurden keine Kosten berechnet.
          </p>
        </div>

        <div className="bg-muted/50 rounded-lg p-4">
          <p className="text-sm text-muted-foreground">
            Sie können jederzeit zurückkehren und ein Paket auswählen.
            Ihr bisheriges Guthaben bleibt erhalten.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button variant="outline" onClick={() => navigate("/app")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Zum Dashboard
          </Button>
          <Button onClick={() => navigate("/app/pricing")}>
            <CreditCard className="h-4 w-4 mr-2" />
            Zurück zu den Paketen
          </Button>
        </div>
      </Card>
    </div>
  );
}
