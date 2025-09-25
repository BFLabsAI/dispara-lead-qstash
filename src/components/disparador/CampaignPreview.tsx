"use client";

import { PhoneMockup } from "./PhoneMockup";

interface Template {
  type: 'texto' | 'imagem' | 'audio' | 'video';
  text: string;
  mediaUrl?: string;
}

interface CampaignPreviewProps {
  templates: Template[];
}

export const CampaignPreview = ({ templates }: CampaignPreviewProps) => {
  return (
    <div className="sticky top-24">
      <h4 className="font-semibold mb-4 text-center">Pré-visualização</h4>
      <PhoneMockup>
        <div className="p-4 h-full overflow-y-auto flex flex-col gap-2">
          {templates.map((template, index) => (
            <div key={index} className="bg-[#dcf8c6] dark:bg-[#054740] text-foreground self-start max-w-[80%] rounded-lg p-2 shadow-sm">
              {template.type === 'imagem' && template.mediaUrl && (
                <img src={template.mediaUrl} alt="Preview" className="rounded-md mb-1 max-h-40" />
              )}
              {template.type !== 'texto' && !template.mediaUrl && (
                 <div className="h-24 bg-muted rounded-md flex items-center justify-center text-muted-foreground text-sm mb-1">
                   Mídia
                 </div>
              )}
              {template.text && <p className="text-sm whitespace-pre-wrap">{template.text || "Sua legenda aqui..."}</p>}
              {!template.text && template.type === 'texto' && <p className="text-sm text-muted-foreground">Sua mensagem aqui...</p>}
            </div>
          ))}
           {templates.length === 0 && (
            <div className="m-auto text-center text-muted-foreground">
              <p className="text-sm">Sua campanha aparecerá aqui.</p>
            </div>
          )}
        </div>
      </PhoneMockup>
    </div>
  );
};