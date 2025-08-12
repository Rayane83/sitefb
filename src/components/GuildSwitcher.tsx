import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Guild } from '@/lib/types';
import { Server } from 'lucide-react';
import { useEffect, useState } from 'react';

interface GuildSwitcherProps {
  guilds: Guild[];
  selectedGuildId?: string;
  onGuildChange: (guildId: string) => void;
  isLoading?: boolean;
}

export function GuildSwitcher({ guilds, selectedGuildId, onGuildChange, isLoading = false }: GuildSwitcherProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted || isLoading) {
    return (
      <div className="flex items-center space-x-2">
        <Server className="w-4 h-4 text-muted-foreground" />
        <div className="w-48 h-10 bg-muted animate-pulse rounded-md" />
      </div>
    );
  }

  if (guilds.length === 0) {
    return (
      <div className="flex items-center space-x-2">
        <Server className="w-4 h-4 text-muted-foreground" />
        <Badge variant="outline" className="text-muted-foreground">Aucune guilde disponible</Badge>
      </div>
    );
  }

  const selectedGuild = guilds.find((g) => g.id === selectedGuildId);

  return (
    <div className="flex items-center space-x-2">
      <Server className="w-4 h-4 text-muted-foreground" />
      <Select value={selectedGuildId} onValueChange={onGuildChange}>
        <SelectTrigger className="w-48">
          <SelectValue placeholder="Sélectionner une guilde">
            {selectedGuild && (<span className="inline-flex items-center gap-2"><span className="truncate">{selectedGuild.name}</span><Badge variant="secondary">{selectedGuild.id}</Badge></span>)}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {guilds.map((g) => (
            <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
