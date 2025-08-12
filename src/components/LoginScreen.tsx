import { Button } from "/src/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "/src/components/ui/card";
import { Users, Shield, TrendingUp } from "lucide-react";

interface LoginScreenProps { onLogin: () => void }

export function LoginScreen({ onLogin }: LoginScreenProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-primary/5 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl mx-auto">
        <div className="text-center mb-12 animate-fade-in">
          <div className="mb-6">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-4">
              <Shield className="w-10 h-10 text-primary" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-foreground mb-4">Portail Entreprise Discord</h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">Gérez vos entreprises Discord multi-guildes. Dotations, impôts, blanchiment et plus.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-12 animate-slide-up">
          <Card>
            <CardHeader className="text-center">
              <TrendingUp className="w-8 h-8 text-primary mx-auto mb-2" />
              <CardTitle className="text-lg">Dashboard</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-center">KPI en temps réel : CA, bénéfices, impôts</CardDescription>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="text-center">
              <Users className="w-8 h-8 text-primary mx-auto mb-2" />
              <CardTitle className="text-lg">Dotations</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-center">Calculez salaires et primes par paliers</CardDescription>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="text-center">
              <Shield className="w-8 h-8 text-primary mx-auto mb-2" />
              <CardTitle className="text-lg">Staff</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-center">Configurer barèmes, entreprises et accès</CardDescription>
            </CardContent>
          </Card>
        </div>

        <div className="text-center">
          <Button size="lg" onClick={onLogin}>Se connecter avec Discord (mock)</Button>
        </div>
      </div>
    </div>
  );
}
