import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { audienceService, AudienceContact } from "@/services/audienceService";
import { Loader2, Search } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface AudienceDetailsDialogProps {
    audienceId: string;
    audienceName: string;
}

export const AudienceDetailsDialog = ({ audienceId, audienceName }: AudienceDetailsDialogProps) => {
    const [contacts, setContacts] = useState<AudienceContact[]>([]);
    const [loading, setLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        if (isOpen && audienceId) {
            loadContacts();
        }
    }, [isOpen, audienceId]);

    const loadContacts = async () => {
        setLoading(true);
        try {
            // Fetch specifically for this audience
            const data = await audienceService.getContactsForAudiences([audienceId]);
            // Limit to 50 for preview
            setContacts(data.slice(0, 50));
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    // Dynamically extract all metadata keys found in the loaded contacts
    const metadataKeys = Array.from(new Set(
        contacts.flatMap(c => Object.keys(c.metadata || {}))
    ));

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <Search className="h-4 w-4" />
                    <span className="sr-only">Ver detalhes</span>
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Detalhes: {audienceName}</DialogTitle>
                    <DialogDescription>
                        Visualizando os 50 primeiros contatos desta audiência.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-hidden min-h-[300px]">
                    {loading ? (
                        <div className="flex items-center justify-center h-full">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : contacts.length > 0 ? (
                        <ScrollArea className="h-[500px] border rounded-md">
                            <Table>
                                <TableHeader className="sticky top-0 bg-secondary">
                                    <TableRow>
                                        <TableHead>Telefone</TableHead>
                                        <TableHead>Nome</TableHead>
                                        {metadataKeys.map(key => (
                                            <TableHead key={key}>{key}</TableHead>
                                        ))}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {contacts.map((contact, idx) => (
                                        <TableRow key={idx}>
                                            <TableCell className="font-mono text-xs">{contact.phone_number}</TableCell>
                                            <TableCell>{contact.name || '-'}</TableCell>
                                            {metadataKeys.map(key => (
                                                <TableCell key={key} className="text-xs text-muted-foreground">
                                                    {contact.metadata?.[key] || '-'}
                                                </TableCell>
                                            ))}
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </ScrollArea>
                    ) : (
                        <div className="flex items-center justify-center h-full text-muted-foreground">
                            Nenhum contato encontrado.
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
};
