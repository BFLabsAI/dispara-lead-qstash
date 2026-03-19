import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { useDropzone } from "react-dropzone";
import * as XLSX from "xlsx";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { audienceService, AudienceContactInput, AudienceMutationResult } from "@/services/audienceService";
import { formatBrazilPhone } from "@/lib/phoneUtils";
import { Loader2, UserPlus, Upload, FileSpreadsheet, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface AddAudienceContactsDialogProps {
    audienceId: string;
    audienceName: string;
    onContactsAdded?: (result: AudienceMutationResult) => void | Promise<void>;
}

const normalizePhone = (value: string) => {
    const formatted = formatBrazilPhone(value);
    if (formatted) return formatted;

    const cleaned = value.replace(/\D/g, "");
    return cleaned.length >= 8 ? cleaned : "";
};

const parseBulkLine = (line: string): AudienceContactInput | null => {
    const trimmed = line.trim();
    if (!trimmed) return null;

    const explicitSeparator = trimmed.match(/^(.*?)[|;,]\s*(.+)$/);
    let phonePart = trimmed;
    let namePart = "";

    if (explicitSeparator) {
        phonePart = explicitSeparator[1].trim();
        namePart = explicitSeparator[2].trim();
    } else {
        const alphaMatch = trimmed.match(/[A-Za-zÀ-ÿ]/);
        if (alphaMatch?.index !== undefined) {
            phonePart = trimmed.slice(0, alphaMatch.index).trim();
            namePart = trimmed.slice(alphaMatch.index).trim();
        } else {
            phonePart = trimmed;
        }
    }

    const phone = normalizePhone(phonePart);
    if (!phone) return null;

    return {
        phone_number: phone,
        name: namePart || null,
        metadata: {},
    };
};

export const AddAudienceContactsDialog = ({
    audienceId,
    audienceName,
    onContactsAdded,
}: AddAudienceContactsDialogProps) => {
    const [open, setOpen] = useState(false);
    const [activeTab, setActiveTab] = useState("single");
    const [singlePhone, setSinglePhone] = useState("");
    const [singleName, setSingleName] = useState("");
    const [bulkValue, setBulkValue] = useState("");
    const [isSubmittingSingle, setIsSubmittingSingle] = useState(false);
    const [isSubmittingBulk, setIsSubmittingBulk] = useState(false);
    const [isLoadingSchema, setIsLoadingSchema] = useState(false);
    const [expectedMetadataKeys, setExpectedMetadataKeys] = useState<string[]>([]);

    const [file, setFile] = useState<File | null>(null);
    const [headers, setHeaders] = useState<string[]>([]);
    const [rawData, setRawData] = useState<string[][]>([]);
    const [previewRows, setPreviewRows] = useState<string[][]>([]);
    const [selectedPhoneCol, setSelectedPhoneCol] = useState("");
    const [selectedNameCol, setSelectedNameCol] = useState("");
    const [selectedVarCols, setSelectedVarCols] = useState<string[]>([]);
    const [isSubmittingFile, setIsSubmittingFile] = useState(false);

    const parsedBulkContacts = useMemo(
        () => bulkValue.split(/\r?\n/).map(parseBulkLine).filter(Boolean) as AudienceContactInput[],
        [bulkValue],
    );

    useEffect(() => {
        if (!open) {
            setActiveTab("single");
            setExpectedMetadataKeys([]);
            setFile(null);
            setHeaders([]);
            setRawData([]);
            setPreviewRows([]);
            setSelectedPhoneCol("");
            setSelectedNameCol("");
            setSelectedVarCols([]);
            return;
        }

        let cancelled = false;

        const loadMetadataSchema = async () => {
            setIsLoadingSchema(true);
            try {
                const keys = await audienceService.getAudienceMetadataKeys(audienceId);
                if (!cancelled) {
                    setExpectedMetadataKeys(keys);
                }
            } catch (error) {
                console.error(error);
                if (!cancelled) {
                    toast.error("Erro ao carregar as variáveis da audiência.");
                }
            } finally {
                if (!cancelled) {
                    setIsLoadingSchema(false);
                }
            }
        };

        void loadMetadataSchema();

        return () => {
            cancelled = true;
        };
    }, [audienceId, open]);

    useEffect(() => {
        setSelectedVarCols((current) => current.filter((column) => column !== selectedPhoneCol && column !== selectedNameCol));
    }, [selectedNameCol, selectedPhoneCol]);

    const resetFileImport = () => {
        setFile(null);
        setHeaders([]);
        setRawData([]);
        setPreviewRows([]);
        setSelectedPhoneCol("");
        setSelectedNameCol("");
        setSelectedVarCols([]);
    };

    const resetForm = () => {
        setSinglePhone("");
        setSingleName("");
        setBulkValue("");
        resetFileImport();
    };

    const handleAfterMutation = async (result: AudienceMutationResult) => {
        await onContactsAdded?.(result);
        toast.success(
            result.insertedCount > 0
                ? `${result.insertedCount} contato(s) adicionados${result.skippedCount > 0 ? `, ${result.skippedCount} ignorado(s)` : ""}.`
                : `${result.skippedCount} contato(s) ignorado(s).`,
        );
        resetForm();
        setOpen(false);
    };

    const processFile = useCallback(async (uploadedFile: File) => {
        try {
            const buffer = await uploadedFile.arrayBuffer();
            const workbook = XLSX.read(buffer, { type: "array" });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as unknown[][];

            const cleanData = jsonData
                .filter((row) => Array.isArray(row) && row.some((cell) => String(cell ?? "").trim().length > 0))
                .map((row) => row.map((cell) => String(cell ?? "").trim()));

            if (cleanData.length < 2) {
                toast.error("O arquivo parece estar vazio ou sem cabeçalho.");
                return;
            }

            const headerRow = cleanData[0].map((header, index) => header || `Coluna ${index + 1}`);
            const dataRows = cleanData.slice(1);

            setFile(uploadedFile);
            setHeaders(headerRow);
            setRawData(dataRows);
            setPreviewRows(dataRows.slice(0, 5));

            const phoneIdx = headerRow.findIndex((header) => /celular|telefone|phone|mobile|whatsapp/i.test(header));
            const nameIdx = headerRow.findIndex((header) => /^nome$|^name$|cliente/i.test(header));

            const initialPhoneCol = phoneIdx !== -1 ? headerRow[phoneIdx] : headerRow[0];
            const initialNameCol = nameIdx !== -1 ? headerRow[nameIdx] : "";

            setSelectedPhoneCol(initialPhoneCol);
            setSelectedNameCol(initialNameCol);

            const availableMetadataColumns = headerRow.filter(
                (header) => header !== initialPhoneCol && header !== initialNameCol,
            );
            const autoMatchedVars = expectedMetadataKeys.filter((key) => availableMetadataColumns.includes(key));
            setSelectedVarCols(autoMatchedVars);
        } catch (error) {
            console.error(error);
            toast.error("Erro ao ler o arquivo.");
            resetFileImport();
        }
    }, [expectedMetadataKeys]);

    const onDrop = useCallback((acceptedFiles: File[]) => {
        const uploadedFile = acceptedFiles[0];
        if (uploadedFile) {
            void processFile(uploadedFile);
        }
    }, [processFile]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
            "application/vnd.ms-excel": [".xls"],
            "text/csv": [".csv"],
        },
        maxFiles: 1,
    });

    const toggleVarCol = (column: string) => {
        setSelectedVarCols((current) => (
            current.includes(column)
                ? current.filter((item) => item !== column)
                : [...current, column]
        ));
    };

    const fileSchemaValidation = useMemo(() => {
        const normalizedSelected = [...selectedVarCols].sort((a, b) => a.localeCompare(b));
        const normalizedExpected = [...expectedMetadataKeys].sort((a, b) => a.localeCompare(b));

        const missing = normalizedExpected.filter((key) => !normalizedSelected.includes(key));
        const extra = normalizedSelected.filter((key) => !normalizedExpected.includes(key));
        const isValid = missing.length === 0 && extra.length === 0;

        return {
            isValid,
            missing,
            extra,
        };
    }, [expectedMetadataKeys, selectedVarCols]);

    const previewFileRows = useMemo(() => {
        const phoneIndex = headers.indexOf(selectedPhoneCol);
        const nameIndex = selectedNameCol ? headers.indexOf(selectedNameCol) : -1;

        if (phoneIndex === -1) return [];

        return previewRows.map((row) => {
            const rawPhone = row[phoneIndex] || "";
            const formattedPhone = normalizePhone(rawPhone);
            const metadata = selectedVarCols.reduce<Record<string, string>>((acc, column) => {
                const index = headers.indexOf(column);
                if (index !== -1) acc[column] = row[index] || "";
                return acc;
            }, {});

            return {
                rawPhone,
                formattedPhone,
                name: nameIndex !== -1 ? row[nameIndex] || "" : "",
                metadata,
            };
        });
    }, [headers, previewRows, selectedPhoneCol, selectedNameCol, selectedVarCols]);

    const parsedFileContacts = useMemo(() => {
        const phoneIndex = headers.indexOf(selectedPhoneCol);
        const nameIndex = selectedNameCol ? headers.indexOf(selectedNameCol) : -1;

        if (phoneIndex === -1) return [];

        return rawData.reduce<AudienceContactInput[]>((acc, row) => {
            const phone = normalizePhone(row[phoneIndex] || "");
            if (!phone) return acc;

            const metadata = selectedVarCols.reduce<Record<string, string>>((currentMetadata, column) => {
                const index = headers.indexOf(column);
                if (index !== -1) {
                    currentMetadata[column] = row[index] || "";
                }
                return currentMetadata;
            }, {});

            acc.push({
                phone_number: phone,
                name: nameIndex !== -1 ? (row[nameIndex] || null) : null,
                metadata,
            });

            return acc;
        }, []);
    }, [headers, rawData, selectedPhoneCol, selectedNameCol, selectedVarCols]);

    const handleSingleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const phone = normalizePhone(singlePhone);

        if (!phone) {
            toast.error("Informe um telefone válido.");
            return;
        }

        setIsSubmittingSingle(true);
        try {
            const result = await audienceService.addContactsToAudience({
                audienceId,
                contacts: [{
                    phone_number: phone,
                    name: singleName.trim() || null,
                    metadata: {},
                }],
            });
            await handleAfterMutation(result);
        } catch (error) {
            console.error(error);
            toast.error("Erro ao adicionar contato.");
        } finally {
            setIsSubmittingSingle(false);
        }
    };

    const handleBulkSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (parsedBulkContacts.length === 0) {
            toast.error("Cole ao menos um contato válido.");
            return;
        }

        setIsSubmittingBulk(true);
        try {
            const result = await audienceService.addContactsToAudience({
                audienceId,
                contacts: parsedBulkContacts,
            });
            await handleAfterMutation(result);
        } catch (error) {
            console.error(error);
            toast.error("Erro ao importar contatos.");
        } finally {
            setIsSubmittingBulk(false);
        }
    };

    const handleFileSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!file) {
            toast.error("Selecione um arquivo CSV ou XLSX.");
            return;
        }

        if (!selectedPhoneCol) {
            toast.error("Selecione a coluna de telefone.");
            return;
        }

        if (!fileSchemaValidation.isValid) {
            toast.error("A planilha não corresponde exatamente às variáveis da audiência.");
            return;
        }

        if (parsedFileContacts.length === 0) {
            toast.error("Nenhum contato válido foi encontrado na planilha.");
            return;
        }

        setIsSubmittingFile(true);
        try {
            const result = await audienceService.addContactsToAudience({
                audienceId,
                contacts: parsedFileContacts,
            });
            await handleAfterMutation(result);
        } catch (error) {
            console.error(error);
            toast.error("Erro ao importar contatos pela planilha.");
        } finally {
            setIsSubmittingFile(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                    <UserPlus className="h-4 w-4" />
                    Adicionar contatos
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden p-0">
                <div className="flex max-h-[90vh] flex-col">
                    <div className="border-b bg-gradient-to-r from-primary/10 via-background to-background px-6 py-5">
                        <DialogHeader className="space-y-2">
                            <DialogTitle>Adicionar contatos em {audienceName}</DialogTitle>
                            <DialogDescription>
                                Cadastre manualmente, cole em lote ou importe CSV/XLSX. A importação por arquivo só é permitida se as variáveis coincidirem com a estrutura atual da audiência.
                            </DialogDescription>
                        </DialogHeader>
                    </div>

                    <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
                        <section className="space-y-4 rounded-xl border bg-card/60 p-4">
                            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                <div className="space-y-1">
                                    <h3 className="text-sm font-semibold">Estrutura atual da audiência</h3>
                                    <p className="text-xs text-muted-foreground">
                                        Na importação por arquivo, as variáveis mapeadas precisam ser exatamente as mesmas da audiência atual.
                                    </p>
                                </div>
                                {isLoadingSchema ? (
                                    <Badge variant="outline" className="gap-2">
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                        Lendo estrutura...
                                    </Badge>
                                ) : expectedMetadataKeys.length > 0 ? (
                                    <div className="flex flex-wrap gap-2">
                                        {expectedMetadataKeys.map((key) => (
                                            <Badge key={key} variant="secondary">{key}</Badge>
                                        ))}
                                    </div>
                                ) : (
                                    <Badge variant="outline">Sem variáveis adicionais</Badge>
                                )}
                            </div>
                        </section>

                        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                            <TabsList className="grid w-full grid-cols-3">
                                <TabsTrigger value="single">Manual</TabsTrigger>
                                <TabsTrigger value="bulk">Texto em lote</TabsTrigger>
                                <TabsTrigger value="file">Arquivo CSV/XLSX</TabsTrigger>
                            </TabsList>

                            <TabsContent value="single" className="space-y-4 rounded-xl border bg-card/60 p-4">
                                <div className="flex items-center justify-between gap-3">
                                    <div>
                                        <h3 className="text-sm font-semibold">Adicionar um contato</h3>
                                        <p className="text-xs text-muted-foreground">Preencha telefone e nome opcional.</p>
                                    </div>
                                    <Badge variant="outline">Manual</Badge>
                                </div>

                                <form className="space-y-4" onSubmit={handleSingleSubmit}>
                                    <div className="grid gap-4 md:grid-cols-2">
                                        <div className="space-y-2">
                                            <Label htmlFor="single-phone">Telefone</Label>
                                            <Input
                                                id="single-phone"
                                                placeholder="5511999999999"
                                                value={singlePhone}
                                                onChange={(e) => setSinglePhone(e.target.value)}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="single-name">Nome</Label>
                                            <Input
                                                id="single-name"
                                                placeholder="Nome do contato"
                                                value={singleName}
                                                onChange={(e) => setSingleName(e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    <div className="flex justify-end">
                                        <Button type="submit" disabled={isSubmittingSingle} className="gap-2">
                                            {isSubmittingSingle ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                                <UserPlus className="h-4 w-4" />
                                            )}
                                            Adicionar contato
                                        </Button>
                                    </div>
                                </form>
                            </TabsContent>

                            <TabsContent value="bulk" className="space-y-4 rounded-xl border bg-card/60 p-4">
                                <div className="flex items-center justify-between gap-3">
                                    <div>
                                        <h3 className="text-sm font-semibold">Importar em lote</h3>
                                        <p className="text-xs text-muted-foreground">
                                            Uma linha por contato. Aceita `telefone`, `telefone|nome`, `telefone,nome` ou `telefone nome`.
                                        </p>
                                    </div>
                                    <Badge variant="outline" className="gap-1">
                                        <Upload className="h-3.5 w-3.5" />
                                        Lote
                                    </Badge>
                                </div>

                                <form className="space-y-4" onSubmit={handleBulkSubmit}>
                                    <div className="space-y-2">
                                        <Label htmlFor="bulk-contacts">Lista de contatos</Label>
                                        <Textarea
                                            id="bulk-contacts"
                                            className="min-h-[180px]"
                                            placeholder={`5511999999999|João Silva\n11988887777 Maria Souza\n55 11 98888-7777`}
                                            value={bulkValue}
                                            onChange={(e) => setBulkValue(e.target.value)}
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            {parsedBulkContacts.length > 0
                                                ? `${parsedBulkContacts.length} contato(s) válidos prontos para importação.`
                                                : "Nenhum contato válido detectado ainda."}
                                        </p>
                                    </div>

                                    <div className="flex justify-end">
                                        <Button type="submit" disabled={isSubmittingBulk} className="gap-2">
                                            {isSubmittingBulk ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                                <Upload className="h-4 w-4" />
                                            )}
                                            Importar contatos
                                        </Button>
                                    </div>
                                </form>
                            </TabsContent>

                            <TabsContent value="file" className="space-y-4 rounded-xl border bg-card/60 p-4">
                                <div className="flex items-center justify-between gap-3">
                                    <div>
                                        <h3 className="text-sm font-semibold">Importar por planilha</h3>
                                        <p className="text-xs text-muted-foreground">
                                            Use CSV, XLS ou XLSX. O mapeamento de variáveis deve coincidir exatamente com a audiência atual.
                                        </p>
                                    </div>
                                    <Badge variant="outline" className="gap-1">
                                        <FileSpreadsheet className="h-3.5 w-3.5" />
                                        Planilha
                                    </Badge>
                                </div>

                                <form className="space-y-4" onSubmit={handleFileSubmit}>
                                    <div
                                        {...getRootProps()}
                                        className={cn(
                                            "flex min-h-[160px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-8 text-center transition-colors",
                                            isDragActive
                                                ? "border-primary bg-primary/5"
                                                : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/40",
                                        )}
                                    >
                                        <input {...getInputProps()} />
                                        <FileSpreadsheet className="mb-3 h-10 w-10 text-muted-foreground" />
                                        <p className="font-medium">
                                            {file ? file.name : "Arraste seu CSV/XLSX aqui ou clique para selecionar"}
                                        </p>
                                        <p className="text-sm text-muted-foreground">
                                            A importação só será liberada se as variáveis selecionadas forem idênticas às da audiência.
                                        </p>
                                    </div>

                                    {headers.length > 0 && (
                                        <div className="grid gap-4 lg:grid-cols-[minmax(0,300px)_1fr]">
                                            <div className="space-y-4">
                                                <div className="space-y-2">
                                                    <Label>Coluna de telefone</Label>
                                                    <Select value={selectedPhoneCol} onValueChange={setSelectedPhoneCol}>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Selecione a coluna" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {headers.map((header) => (
                                                                <SelectItem key={header} value={header}>{header}</SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>

                                                <div className="space-y-2">
                                                    <Label>Coluna de nome</Label>
                                                    <Select value={selectedNameCol || "__none__"} onValueChange={(value) => setSelectedNameCol(value === "__none__" ? "" : value)}>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Selecione a coluna" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="__none__">Não usar nome</SelectItem>
                                                            {headers
                                                                .filter((header) => header !== selectedPhoneCol)
                                                                .map((header) => (
                                                                    <SelectItem key={header} value={header}>{header}</SelectItem>
                                                                ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>

                                                <div className="space-y-2">
                                                    <Label>Variáveis da audiência</Label>
                                                    <div className="max-h-48 space-y-2 overflow-y-auto rounded-md border p-3">
                                                        {headers
                                                            .filter((header) => header !== selectedPhoneCol && header !== selectedNameCol)
                                                            .map((header) => (
                                                                <div key={header} className="flex items-center space-x-2">
                                                                    <Checkbox
                                                                        id={`file-var-${header}`}
                                                                        checked={selectedVarCols.includes(header)}
                                                                        onCheckedChange={() => toggleVarCol(header)}
                                                                    />
                                                                    <label htmlFor={`file-var-${header}`} className="cursor-pointer text-sm">
                                                                        {header}
                                                                    </label>
                                                                </div>
                                                            ))}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="space-y-4">
                                                <div className={cn(
                                                    "rounded-xl border p-4",
                                                    fileSchemaValidation.isValid
                                                        ? "border-emerald-200 bg-emerald-50/70 text-emerald-900"
                                                        : "border-amber-200 bg-amber-50/70 text-amber-900",
                                                )}>
                                                    <div className="flex items-start gap-3">
                                                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                                                        <div className="space-y-2 text-sm">
                                                            <p className="font-semibold">
                                                                {fileSchemaValidation.isValid
                                                                    ? "Schema compatível com a audiência."
                                                                    : "Schema incompatível com a audiência."}
                                                            </p>
                                                            {!fileSchemaValidation.isValid && (
                                                                <>
                                                                    {fileSchemaValidation.missing.length > 0 && (
                                                                        <p>Faltando na planilha selecionada: {fileSchemaValidation.missing.join(", ")}</p>
                                                                    )}
                                                                    {fileSchemaValidation.extra.length > 0 && (
                                                                        <p>Variáveis extras selecionadas: {fileSchemaValidation.extra.join(", ")}</p>
                                                                    )}
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="overflow-hidden rounded-xl border">
                                                    <Table>
                                                        <TableHeader>
                                                            <TableRow>
                                                                <TableHead>Telefone bruto</TableHead>
                                                                <TableHead>Telefone</TableHead>
                                                                <TableHead>Nome</TableHead>
                                                                <TableHead>Variáveis</TableHead>
                                                            </TableRow>
                                                        </TableHeader>
                                                        <TableBody>
                                                            {previewFileRows.map((row, index) => (
                                                                <TableRow key={`${row.rawPhone}-${index}`}>
                                                                    <TableCell className="text-xs">{row.rawPhone || "-"}</TableCell>
                                                                    <TableCell className="text-xs font-medium">{row.formattedPhone || "Inválido"}</TableCell>
                                                                    <TableCell className="text-xs">{row.name || "-"}</TableCell>
                                                                    <TableCell className="text-xs text-muted-foreground">
                                                                        {Object.keys(row.metadata).length > 0
                                                                            ? Object.entries(row.metadata).map(([key, value]) => `${key}: ${value}`).join(" • ")
                                                                            : "Sem variáveis"}
                                                                    </TableCell>
                                                                </TableRow>
                                                            ))}
                                                        </TableBody>
                                                    </Table>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex items-center justify-between gap-3">
                                        <Button type="button" variant="ghost" onClick={resetFileImport} disabled={!file || isSubmittingFile}>
                                            Limpar arquivo
                                        </Button>
                                        <Button
                                            type="submit"
                                            disabled={isSubmittingFile || !file || !fileSchemaValidation.isValid || parsedFileContacts.length === 0 || isLoadingSchema}
                                            className="gap-2"
                                        >
                                            {isSubmittingFile ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                                <FileSpreadsheet className="h-4 w-4" />
                                            )}
                                            Importar planilha
                                        </Button>
                                    </div>
                                </form>
                            </TabsContent>
                        </Tabs>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default AddAudienceContactsDialog;
