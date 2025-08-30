import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { Role } from "@/lib/types";
import { FileText, GraduationCap, UploadCloud, Info } from "lucide-react";

interface DocsUploadProps {
  guildId: string;
  entreprise?: string;
  role: Role;
}

export function DocsUpload({ guildId, entreprise, role }: DocsUploadProps) {
  const { toast } = useToast();
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
  const [invoiceDate, setInvoiceDate] = useState<string>("");
  const [invoiceAmount, setInvoiceAmount] = useState<string>("");
  const [invoiceDesc, setInvoiceDesc] = useState<string>("");
  const [isUploadingInvoice, setIsUploadingInvoice] = useState(false);

  const [diplomaFile, setDiplomaFile] = useState<File | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [grade, setGrade] = useState("");
  const [isUploadingDiploma, setIsUploadingDiploma] = useState(false);

  const isStaff = role === "staff";
  const canUpload = isStaff || role === "patron" || role === "co-patron";
  const canViewOnly = role === "dot" && !canUpload;

  async function uploadToStorage(type: "facture" | "diplome", file: File): Promise<string> {
    const ext = file.name.split(".").pop() || "file";
    const ts = Date.now();
    const safeEnt = (entreprise || "inconnue").replace(/[^a-z0-9_-]/gi, "_");
    const path = `${guildId}/${safeEnt}/${type}/${ts}.${ext}`;

    const { error } = await supabase.storage.from("archives").upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type || undefined,
    });
    if (error) throw error;

    const { data } = supabase.storage.from("archives").getPublicUrl(path);
    return data.publicUrl;
  }

  async function insertArchiveRecord(type: "facture" | "diplome", payload: Record<string, any>, montant?: number, date?: string) {
    const { error } = await supabase.from("archives").insert({
      guild_id: guildId,
      entreprise_key: entreprise || null,
      type,
      statut: "En attente",
      montant: montant ? Number(montant) : null,
      date: date ? new Date(date).toISOString() : new Date().toISOString(),
      payload,
    });
    if (error) throw error;
  }

  const handleInvoiceSubmit = async () => {
    if (!canUpload) return;
    if (!invoiceFile) {
      toast({ title: "Fichier manquant", description: "Ajoutez une facture (PDF ou image)", variant: "destructive" as any });
      return;
    }
    try {
      setIsUploadingInvoice(true);
      const url = await uploadToStorage("facture", invoiceFile);
      await insertArchiveRecord(
        "facture",
        { url, description: invoiceDesc || undefined, filename: invoiceFile.name, entreprise },
        invoiceAmount ? Number(invoiceAmount) : undefined,
        invoiceDate || undefined
      );
      toast({ title: "Facture envoyée", description: "La facture a été archivée." });
      // reset form
      setInvoiceFile(null);
      setInvoiceDate("");
      setInvoiceAmount("");
      setInvoiceDesc("");
    } catch (e) {
      console.error(e);
      toast({ title: "Échec de l'envoi", description: "Vérifiez le fichier et réessayez.", variant: "destructive" as any });
    } finally {
      setIsUploadingInvoice(false);
    }
  };

  const handleDiplomaSubmit = async () => {
    if (!canUpload) return;
    if (!diplomaFile || !firstName || !lastName || !grade) {
      toast({ title: "Champs requis", description: "Remplissez NOM, Prénom, Grade et joignez le diplôme.", variant: "destructive" as any });
      return;
    }
    try {
      setIsUploadingDiploma(true);
      const url = await uploadToStorage("diplome", diplomaFile);
      await insertArchiveRecord("diplome", {
        url,
        nom: lastName,
        prenom: firstName,
        grade,
        filename: diplomaFile.name,
        entreprise,
      });
      toast({ title: "Diplôme envoyé", description: "Le diplôme a été archivé." });
      // reset form
      setDiplomaFile(null);
      setFirstName("");
      setLastName("");
      setGrade("");
    } catch (e) {
      console.error(e);
      toast({ title: "Échec de l'envoi", description: "Vérifiez le fichier et réessayez.", variant: "destructive" as any });
    } finally {
      setIsUploadingDiploma(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Factures / Diplômes</h2>
        {entreprise && <Badge variant="outline">{entreprise}</Badge>}
      </div>

      {canViewOnly && (
        <div className="stat-card">
          <div className="flex items-start gap-3 text-sm text-muted-foreground">
            <Info className="w-4 h-4 mt-1" />
            <p>Accès lecture seule. Consultez les documents dans l’onglet Archives.</p>
          </div>
        </div>
      )}

      {/* Formulaire Facture */}
      <Card className="stat-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Déposer une facture
          </CardTitle>
          <CardDescription>PDF ou image. Ajoutez au besoin date, montant et description.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Date</Label>
              <Input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} disabled={!canUpload} />
            </div>
            <div>
              <Label>Montant ($)</Label>
              <Input type="number" min={0} value={invoiceAmount} onChange={(e) => setInvoiceAmount(e.target.value)} placeholder="Optionnel" disabled={!canUpload} />
            </div>
            <div>
              <Label>Fichier (PDF/Image)</Label>
              <Input type="file" accept="application/pdf,image/*" onChange={(e) => setInvoiceFile(e.target.files?.[0] || null)} disabled={!canUpload} />
            </div>
          </div>
          <div>
            <Label>Description</Label>
            <Textarea placeholder="Description de la facture (optionnel)" value={invoiceDesc} onChange={(e) => setInvoiceDesc(e.target.value)} disabled={!canUpload} />
          </div>
          <div className="flex justify-end">
            <Button onClick={handleInvoiceSubmit} disabled={!canUpload || isUploadingInvoice}>
              <UploadCloud className="w-4 h-4 mr-2" />
              {isUploadingInvoice ? "Envoi..." : "Envoyer la facture"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Formulaire Diplôme */}
      <Card className="stat-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-primary" />
            Déposer un diplôme
          </CardTitle>
          <CardDescription>Image du diplôme + informations. Exemple: NOM Prénom — Grade → Diplôme.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label>NOM</Label>
              <Input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Ex: Dupont" disabled={!canUpload} />
            </div>
            <div>
              <Label>Prénom</Label>
              <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Ex: Jean" disabled={!canUpload} />
            </div>
            <div>
              <Label>Grade</Label>
              <Input value={grade} onChange={(e) => setGrade(e.target.value)} placeholder="Ex: Manager" disabled={!canUpload} />
            </div>
            <div>
              <Label>Fichier (Image)</Label>
              <Input type="file" accept="image/*" onChange={(e) => setDiplomaFile(e.target.files?.[0] || null)} disabled={!canUpload} />
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={handleDiplomaSubmit} disabled={!canUpload || isUploadingDiploma}>
              <UploadCloud className="w-4 h-4 mr-2" />
              {isUploadingDiploma ? "Envoi..." : "Envoyer le diplôme"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
