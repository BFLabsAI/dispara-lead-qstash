"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Target, Users, FileText } from "lucide-react";

export const CampaignStep = ({ 
  campaignName, 
  setCampaignName, 
  publicTarget, 
  setPublicTarget, 
  content, 
  setContent 
}: { 
  campaignName: string; 
  setCampaignName: (name: string) => void; 
  publicTarget: string; 
  setPublicTarget: (target: string) => void; 
  content: string; 
  setContent: (content: string) => void; 
}) => {
  return (
    <Card className="glass-card rounded-2xl border border-green-200/50 dark:border-green-500/30 shadow-lg overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 bg-green-500/20 rounded-xl border border-green-500/30 animate-pulse-glow">
            <Target className="h-5 w-5 text-green-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">Passo 1: Configuração da Campanha</h3>
        </div>
        
        <div className="space-y-6">
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-gray-700 dark:text-gray-300 font-medium">
              <FileText className="h-4 w-4" /> Nome da Campanha
            </Label>
            <Input 
              placeholder="Ex: Promoção de Verão 2025" 
              value={campaignName}
              onChange={(e) => setCampaignName(e.target.value)}
              className="bg-white/80 dark:bg-gray-800/80 border-gray-300 dark:border-gray-600"
            />
          </div>
          
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-gray-700 dark:text-gray-300 font-medium">
              <Users className="h-4 w-4" /> Público
            </Label>
            <Textarea 
              placeholder="Descreva para quem você está enviando as mensagens. Ex: Clientes que compraram produtos de beleza nos últimos 3 meses." 
              value={publicTarget}
              onChange={(e) => setPublicTarget(e.target.value)}
              className="min-h-[100px] bg-white/80 dark:bg-gray-800/80 border-gray-300 dark:border-gray-600"
            />
          </div>
          
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-gray-700 dark:text-gray-300 font-medium">
              <FileText className="h-4 w-4" /> Conteúdo
            </Label>
            <Textarea 
              placeholder="Descreva brevemente o conteúdo da sua ação. Ex: Anúncio de lançamento de nova linha de protetores solares com 20% de desconto." 
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[100px] bg-white/80 dark:bg-gray-800/80 border-gray-300 dark:border-gray-600"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};