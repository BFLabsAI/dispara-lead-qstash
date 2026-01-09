import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, X, Save } from "lucide-react";
import { toast } from "sonner";

interface PhoneInputSectionProps {
    title: string;
    description: string;
    icon: any;
    phones: string[];
    setPhones: (phones: string[]) => void;
    newPhone: string;
    setNewPhone: (phone: string) => void;
    countryCode: string;
    setCountryCode: (code: string) => void;
    formatPhone: (value: string) => string;
    onSave?: () => void;
    saving?: boolean;
}

export function PhoneInputSection({
    title,
    description,
    icon: Icon,
    phones,
    setPhones,
    newPhone,
    setNewPhone,
    countryCode,
    setCountryCode,
    formatPhone,
    onSave,
    saving = false
}: PhoneInputSectionProps) {

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const formatted = formatPhone(e.target.value);
        setNewPhone(formatted);
    };

    const handleAddPhone = () => {
        const raw = newPhone.replace(/\D/g, "");
        if (raw.length < 10) {
            toast.error("Número inválido. Digite o DDD e o número completo.");
            return;
        }
        const fullNumber = countryCode + raw;

        if (phones.includes(fullNumber)) {
            toast.error("Este número já foi adicionado.");
            return;
        }

        const newPhonesList = [...phones, fullNumber];
        setPhones(newPhonesList);
        setNewPhone("");
    };

    const handleRemovePhone = (phoneToRemove: string) => {
        setPhones(phones.filter(p => p !== phoneToRemove));
    };

    return (
        <Card className="flex flex-col h-full">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Icon className="h-5 w-5" /> {title}
                </CardTitle>
                <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 flex-grow">
                <div className="space-y-4">
                    <div className="flex gap-2 items-start">
                        <Select value={countryCode} onValueChange={setCountryCode}>
                            <SelectTrigger className="w-[120px]">
                                <SelectValue placeholder="País" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="55">🇧🇷 (+55)</SelectItem>
                            </SelectContent>
                        </Select>

                        <Input
                            placeholder="(11) 9 9999-9999"
                            value={newPhone}
                            onChange={handlePhoneChange}
                            className="max-w-xs font-mono"
                            onKeyDown={(e) => e.key === 'Enter' && handleAddPhone()}
                            maxLength={16}
                        />

                        <Button onClick={handleAddPhone} variant="secondary">
                            <Plus className="h-4 w-4 mr-2" /> Adicionar
                        </Button>
                    </div>

                    <p className="text-xs text-muted-foreground">
                        * O código do país (+{countryCode}) será adicionado automaticamente.
                    </p>

                    <div className="flex flex-wrap gap-2">
                        {phones.length === 0 && (
                            <span className="text-sm text-muted-foreground italic">Nenhum número configurado.</span>
                        )}
                        {phones.map((phone) => (
                            <Badge key={phone} variant="outline" className="pl-3 pr-1 py-1 h-8 text-sm gap-2">
                                {phone}
                                <button
                                    onClick={() => handleRemovePhone(phone)}
                                    className="hover:bg-destructive/10 hover:text-destructive rounded-full p-0.5 transition-colors"
                                >
                                    <X className="h-3 w-3" />
                                </button>
                            </Badge>
                        ))}
                    </div>
                </div>
            </CardContent>
            {onSave && (
                <CardFooter className="border-t pt-6 bg-muted/40">
                    <div className="flex justify-end w-full">
                        <Button onClick={onSave} disabled={saving} size="sm">
                            {saving ? "Salvando..." : (
                                <>
                                    <Save className="h-4 w-4 mr-2" /> Salvar {title.split(' ')[0]}
                                </>
                            )}
                        </Button>
                    </div>
                </CardFooter>
            )}
        </Card>
    );
}
