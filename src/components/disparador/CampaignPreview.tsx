"use client";

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
      <h4 className="font-semibold mb-2 text-center">Pré-visualização</h4>
      <div className="bg-muted/50 dark:bg-background rounded-lg p-4 h-[400px] overflow-y-auto border">
        <div className="flex flex-col gap-2">
          {templates.map((template, index) => (
            <div key={index} className="bg-green-100 dark:bg-green-900/30 text-foreground self-start max-w-xs rounded-lg p-2 shadow-sm">
              {template.type === 'imagem' && template.mediaUrl && (
                <img src={template.mediaUrl} alt="Preview" className="rounded-md mb-1 max-h-40" />
              )}
              {template.type !== 'texto' && !template.mediaUrl && (
                 <div className="h-24 bg-muted rounded-md flex items-center justify-center text-muted-foreground text-sm mb-1">
                   Preview da Mídia
                 </div>
              )}
              {template.text && <p className="text-sm whitespace-pre-wrap">{template.text || "Sua legenda aqui..."}</p>}
              {!template.text && template.type === 'texto' && <p className="text-sm text-muted-foreground">Sua mensagem aqui...</p>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};