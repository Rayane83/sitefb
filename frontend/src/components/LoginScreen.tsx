import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Shield, BadgeCheck, Clock } from "lucide-react";

interface LoginScreenProps {
  onLogin: () => void;
}

export function LoginScreen({ onLogin }: LoginScreenProps) {
  const [isHuman, setIsHuman] = useState(false);

  return (
    <div className="min-h-screen bg-hero-pro flex items-center justify-center p-4">
      <div className="w-full max-w-4xl mx-auto">
        {/* Hero Section */}
        <div className="text-center mb-10 animate-fade-in">
          <img
            src="/lovable-uploads/edb98f3b-c1fa-4ca1-8a20-dd0be59b3591.png"
            alt="Logo Flashback Fa"
            className="mx-auto h-16 w-16 rounded-md shadow"
            loading="lazy"
            decoding="async"
          />
          <h1 className="mt-6 text-4xl font-extrabold text-gradient">
            Portail Entreprise Flashback Fa
          </h1>
          <p className="mt-3 text-lg text-muted-foreground max-w-xl mx-auto">
            Connectez-vous avec Discord pour accéder à votre espace d’entreprise.
          </p>

          {/* Benefits */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-3xl mx-auto mt-6">
            <div className="stat-card py-3">
              <div className="flex items-center justify-center gap-2 text-sm">
                <Shield className="w-4 h-4 text-primary" />
                <span>Connexion OAuth sécurisée</span>
              </div>
            </div>
            <div className="stat-card py-3">
              <div className="flex items-center justify-center gap-2 text-sm">
                <BadgeCheck className="w-4 h-4 text-primary" />
                <span>Accès rôles & permissions</span>
              </div>
            </div>
            <div className="stat-card py-3">
              <div className="flex items-center justify-center gap-2 text-sm">
                <Clock className="w-4 h-4 text-primary" />
                <span>Disponible 24/7</span>
              </div>
            </div>
          </div>
        </div>

        {/* Login Card */}
        <Card className="glass-panel max-w-md mx-auto">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Connexion</CardTitle>
            <CardDescription>Accédez à votre portail Flashback Fa</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-center space-x-3">
              <Checkbox id="human" checked={isHuman} onCheckedChange={(v) => setIsHuman(Boolean(v))} />
              <Label htmlFor="human" className="text-sm text-foreground">
                Je ne suis pas un robot
              </Label>
            </div>
            <Button 
              onClick={onLogin}
              className="w-full btn-discord text-lg py-6"
              size="lg"
              disabled={!isHuman}
              aria-disabled={!isHuman}
              title={!isHuman ? "Cochez la case pour continuer" : "Se connecter avec Discord"}
            >
              <svg 
                className="w-6 h-6 mr-3" 
                viewBox="0 0 24 24" 
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419-.0190 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9460 2.4189-2.1568 2.4189Z"/>
              </svg>
              Se connecter avec Discord
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              En vous connectant, vous acceptez nos conditions d'utilisation
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
