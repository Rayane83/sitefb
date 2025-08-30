import { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Guild } from '@/lib/types';
import { Server, ChevronDown } from 'lucide-react';

interface GuildSwitcherProps {
  guilds: Guild[];
  selectedGuildId?: string;
  onGuildChange: (guildId: string) => void;
  isLoading?: boolean;
}

export function GuildSwitcher({ 
  guilds, 
  selectedGuildId, 
  onGuildChange, 
  isLoading = false 
}: GuildSwitcherProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // État vide si pas de guildes
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
        <Badge variant="outline" className="text-muted-foreground">
          Aucune guilde disponible
        </Badge>
      </div>
    );
  }

  const selectedGuild = guilds.find(g => g.id === selectedGuildId);

  return (
    <div className="flex items-center space-x-2">
      <Server className="w-4 h-4 text-muted-foreground" />
      <Select value={selectedGuildId} onValueChange={onGuildChange}>
        <SelectTrigger className="w-48">
          <SelectValue placeholder="Sélectionner une guilde">
            {selectedGuild && (
              <div className="flex items-center space-x-2">
                {selectedGuild.icon && (
                  <img 
                    src={selectedGuild.icon} 
                    alt="" 
                    className="w-4 h-4 rounded-full"
                  />
                )}
                <span className="truncate">{selectedGuild.name}</span>
              </div>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {guilds.map((guild) => (
            <SelectItem key={guild.id} value={guild.id}>
              <div className="flex items-center space-x-2">
                {guild.icon ? (
                  <img 
                    src={guild.icon} 
                    alt="" 
                    className="w-4 h-4 rounded-full"
                  />
                ) : (
                  <div className="w-4 h-4 rounded-full bg-primary/20 flex items-center justify-center">
                    <Server className="w-2 h-2 text-primary" />
                  </div>
                )}
                <span className="truncate">{guild.name}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      {guilds.length > 0 && (
        <Badge variant="secondary" className="text-xs">
          {guilds.length} guilde{guilds.length > 1 ? 's' : ''}
        </Badge>
      )}
    </div>
  );
}