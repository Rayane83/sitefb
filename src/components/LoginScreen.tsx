import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Shield, TrendingUp } from "lucide-react";

interface LoginScreenProps {
  onLogin: () => void;
}

export function LoginScreen({ onLogin }: LoginScreenProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-primary/5 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl mx-auto">
        {/* Hero Section */}
        <div className="text-center mb-12 animate-fade-in">
          <div className="mb-6">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-4">
              <Shield className="w-10 h-10 text-primary" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-foreground mb-4">
            Portail Entreprise Discord
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Gérez vos entreprises Discord multi-guildes en toute simplicité. 
            Dotations, impôts, blanchiment et bien plus.
          </p>
        </div>

        {/* Features Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-12 animate-slide-up">
          <Card className="stat-card">
            <CardHeader className="text-center">
              <TrendingUp className="w-8 h-8 text-primary mx-auto mb-2" />
              <CardTitle className="text-lg">Dashboard</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-center">
                Suivez vos KPI en temps réel : CA, bénéfices, impôts et employés
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="stat-card">
            <CardHeader className="text-center">
              <Users className="w-8 h-8 text-success mx-auto mb-2" />
              <CardTitle className="text-lg">Dotations</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-center">
                Calculez automatiquement les salaires et primes via paliers configurés
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="stat-card">
            <CardHeader className="text-center">
              <Shield className="w-8 h-8 text-warning mx-auto mb-2" />
              <CardTitle className="text-lg">Gestion Multi-Guilde</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-center">
                Switching instantané entre vos différentes guildes et entreprises
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        {/* Login Card */}
        <Card className="max-w-md mx-auto stat-card animate-fade-in">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Connexion</CardTitle>
            <CardDescription>
              Connectez-vous avec votre compte Discord pour accéder au portail
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={onLogin}
              className="w-full btn-discord text-lg py-6"
              size="lg"
            >
              <svg 
                className="w-6 h-6 mr-3" 
                viewBox="0 0 24 24" 
                fill="currentColor"
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