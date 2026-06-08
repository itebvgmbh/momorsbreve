import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";

export default function NotFound() {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background">
      <Card className="w-full max-w-md mx-4">
        <CardContent className="pt-6 text-center">
          <AlertCircle className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
          <h1 className="font-serif text-2xl font-bold mb-2">
            {t("notFound.title")}
          </h1>
          <p className="text-sm text-muted-foreground mb-6">
            {t("notFound.description")}
          </p>
          <Link href="/">
            <Button variant="outline" data-testid="button-back-home">
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t("notFound.backHome")}
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
