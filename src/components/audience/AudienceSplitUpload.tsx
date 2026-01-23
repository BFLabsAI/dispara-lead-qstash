"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import * as XLSX from "xlsx";
import { UploadCloud, FileSpreadsheet, Users, Tag as TagIcon, Loader2, CheckCircle2, ArrowRight, ArrowLeft, Table as TableIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn, getTagColor } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { supabase } from "@/services/supabaseClient";
import { audienceService, AudienceContact } from "@/services/audienceService";
import { useAdminStore } from "@/store/adminStore";
import { formatBrazilPhone } from "@/lib/phoneUtils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface AudienceSplitUploadProps {
    onSuccess?: () => void;
}

const STEPS = ["Arquivo", "Mapeamento", "Configuração"];

export const AudienceSplitUpload = ({ onSuccess }: AudienceSplitUploadProps) => {
    const [currentStep, setCurrentStep] = useState(0);
    const [file, setFile] = useState<File | null>(null);
    const [headers, setHeaders] = useState<string[]>([]);
    const [rawData, setRawData] = useState<any[][]>([]);
    const [previewRows, setPreviewRows] = useState<any[][]>([]);

    // Mapping State
    const [selectedPhoneCol, setSelectedPhoneCol] = useState<string>("");
    const [selectedNameCol, setSelectedNameCol] = useState<string>("");
    const [nameFormat, setNameFormat] = useState<'full' | 'first'>('full');
    const [selectedVarCols, setSelectedVarCols] = useState<string[]>([]);

    // Config State
    const [splitCount, setSplitCount] = useState<number>(1);
    const [baseName, setBaseName] = useState("");
    const [tags, setTags] = useState<string[]>([]);
    const [currentTag, setCurrentTag] = useState("");

    // Processing State
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);

    const impersonatedId = useAdminStore((state) => state.impersonatedTenantId);
    const [tenantId, setTenantId] = useState<string | null>(impersonatedId);

    useEffect(() => {
        const fetchTenant = async () => {
            if (impersonatedId) {
                setTenantId(impersonatedId);
                return;
            }

            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data } = await supabase
                    .from('users_dispara_lead_saas_02')
                    .select('tenant_id')
                    .eq('id', user.id)
                    .single();
                if (data?.tenant_id) setTenantId(data.tenant_id);
            }
        };
        fetchTenant();
    }, [impersonatedId]);

    // --- STEP 1: FILE UPLOAD ---
    const onDrop = useCallback((acceptedFiles: File[]) => {
        const uploadedFile = acceptedFiles[0];
        if (uploadedFile) {
            setFile(uploadedFile);
            processFile(uploadedFile);
            // Auto-set base name from file name
            setBaseName(uploadedFile.name.split('.')[0]);
        }
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
            'application/vnd.ms-excel': ['.xls'],
            'text/csv': ['.csv']
        },
        maxFiles: 1
    });

    const processFile = async (f: File) => {
        try {
            const buffer = await f.arrayBuffer();
            const workbook = XLSX.read(buffer, { type: 'array' });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

            // Filter out completely empty rows (common in Excel with formatting)
            // We join all cell values to check if there is any visible content
            const cleanData = jsonData.filter(row => {
                if (!Array.isArray(row) || row.length === 0) return false;
                const rowContent = row
                    .map(cell => (cell !== null && cell !== undefined) ? String(cell).trim() : "")
                    .join("");
                return rowContent.length > 0;
            });

            if (cleanData.length < 2) {
                toast.error("O arquivo parece estar vazio ou sem cabeçalho.");
                return;
            }

            const headerRow = cleanData[0].map(h => String(h || "").trim());
            const dataRows = cleanData.slice(1);

            setHeaders(headerRow);
            setRawData(dataRows);
            setPreviewRows(dataRows.slice(0, 5));

            // Auto-detect phone column (look for 'celular', 'telefone', 'phone', 'mobile')
            const phoneIdx = headerRow.findIndex(h => /celular|telefone|phone|mobile|whatsapp/i.test(h));
            if (phoneIdx !== -1) {
                setSelectedPhoneCol(headerRow[phoneIdx]);
            } else if (headerRow.length > 0) {
                setSelectedPhoneCol(headerRow[0]);
            }

            // Auto-detect name column (look for 'nome', 'name', 'cliente')
            const nameIdx = headerRow.findIndex(h => /^nome$|^name$|cliente/i.test(h));
            if (nameIdx !== -1) {
                setSelectedNameCol(headerRow[nameIdx]);
            }

            setCurrentStep(1); // Move to mapping
        } catch (error) {
            console.error(error);
            toast.error("Erro ao ler arquivo.");
            setFile(null);
        }
    };

    // --- STEP 2: MAPPING ---
    const toggleVarCol = (col: string) => {
        if (selectedVarCols.includes(col)) {
            setSelectedVarCols(selectedVarCols.filter(c => c !== col));
        } else {
            setSelectedVarCols([...selectedVarCols, col]);
        }
    };

    // Title Case Helper
    const toTitleCase = (str: string) => {
        if (!str) return "";
        return str.toLowerCase().replace(/(?:^|\s)\w/g, match => match.toUpperCase());
    };

    const previewFormatted = useMemo(() => {
        const phoneIndex = headers.indexOf(selectedPhoneCol);
        if (phoneIndex === -1) return [];

        const nameIndex = selectedNameCol ? headers.indexOf(selectedNameCol) : -1;

        return previewRows.map(row => {
            const rawPhone = row[phoneIndex];
            const formatted = formatBrazilPhone(rawPhone);

            // Format name if selected
            let formattedName: string | undefined;
            if (nameIndex !== -1) {
                const rawName = String(row[nameIndex] || "");
                formattedName = toTitleCase(rawName);
                if (nameFormat === 'first') {
                    formattedName = formattedName.split(' ')[0];
                }
            }

            const vars = selectedVarCols.reduce((acc, col) => {
                const idx = headers.indexOf(col);
                if (idx !== -1) acc[col] = row[idx];
                return acc;
            }, {} as Record<string, any>);

            return { raw: rawPhone, formatted, formattedName, ...vars };
        });
    }, [headers, previewRows, selectedPhoneCol, selectedNameCol, nameFormat, selectedVarCols]);

    // --- STEP 3: CONFIG ---
    const handleAddTag = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && currentTag.trim()) {
            e.preventDefault();
            if (!tags.includes(currentTag.trim())) {
                setTags([...tags, currentTag.trim()]);
            }
            setCurrentTag("");
        }
    };

    // --- FINAL: UPLOAD ---
    const handleUpload = async () => {
        if (!tenantId || !baseName) return;

        const phoneIndex = headers.indexOf(selectedPhoneCol);
        if (phoneIndex === -1) {
            toast.error("Coluna de telefone inválida.");
            return;
        }

        setIsProcessing(true);
        setProgress(0);

        try {
            // Parse all contacts
            const parsedContacts: AudienceContact[] = rawData
                .map((row): AudienceContact | null => {
                    const rawPhone = row[phoneIndex];
                    const formatted = formatBrazilPhone(rawPhone);

                    if (!formatted) return null;

                    // Format name using the selected column and format option
                    let name: string | undefined;
                    if (selectedNameCol) {
                        const nameIdx = headers.indexOf(selectedNameCol);
                        if (nameIdx !== -1) {
                            const rawName = String(row[nameIdx] || "");
                            name = toTitleCase(rawName);
                            if (nameFormat === 'first') {
                                name = name.split(' ')[0];
                            }
                        }
                    }

                    // Extract Metadata (excluding phone and name columns)
                    const metadata = selectedVarCols.reduce((acc, col) => {
                        // Skip if this is the name column (it's already in the name field)
                        if (col === selectedNameCol) return acc;

                        const idx = headers.indexOf(col);
                        if (idx !== -1) acc[col] = String(row[idx] || "");
                        return acc;
                    }, {} as Record<string, string>);

                    return {
                        phone_number: formatted, // 55ddd9xxxxxxxx
                        name: name,
                        metadata: metadata
                    };
                })
                .filter((c): c is AudienceContact => c !== null);

            if (parsedContacts.length === 0) {
                toast.error("Nenhum contato válido encontrado com a coluna selecionada.");
                setIsProcessing(false);
                return;
            }

            const batchSize = Math.ceil(parsedContacts.length / splitCount);

            for (let i = 0; i < splitCount; i++) {
                const start = i * batchSize;
                const end = Math.min(start + batchSize, parsedContacts.length);
                const chunk = parsedContacts.slice(start, end);

                const partName = splitCount > 1 ? `${baseName} - Parte ${i + 1}/${splitCount}` : baseName;

                await audienceService.createAudience({
                    name: partName,
                    description: `Importado de ${file?.name}. ${splitCount > 1 ? `Parte ${i + 1}/${splitCount}` : ''}`,
                    tags: tags,
                    contacts: chunk,
                    tenantId: tenantId
                });

                setProgress(((i + 1) / splitCount) * 100);
            }

            toast.success("Audiências criadas com sucesso!");
            setFile(null);
            setRawData([]);
            setHeaders([]);
            setCurrentStep(0);
            if (onSuccess) onSuccess();

        } catch (error) {
            console.error(error);
            toast.error("Erro ao processar e salvar.");
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Stepper Header (Simple) */}
            <div className="flex justify-between items-center mb-6">
                {STEPS.map((step, idx) => (
                    <div key={idx} className={cn("flex items-center gap-2 text-sm", currentStep === idx ? "font-bold text-primary" : "text-muted-foreground")}>
                        <div className={cn("w-6 h-6 rounded-full flex items-center justify-center border text-xs", currentStep === idx ? "bg-primary text-primary-foreground border-primary" : "border-muted-foreground")}>
                            {idx + 1}
                        </div>
                        {step}
                    </div>
                ))}
            </div>

            {/* STEP 1: UPLOAD */}
            {currentStep === 0 && (
                <div
                    {...getRootProps()}
                    className={`
                    border-2 border-dashed rounded-lg p-10 flex flex-col items-center justify-center cursor-pointer transition-colors h-64
                    ${isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50'}
                    `}
                >
                    <input {...getInputProps()} />
                    <UploadCloud className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-lg font-medium text-center mb-1">Arraste seu arquivo Excel aqui</p>
                    <p className="text-sm text-muted-foreground text-center">ou clique para selecionar</p>
                </div>
            )}

            {/* STEP 2: MAPPING */}
            {currentStep === 1 && (
                <Card className="glass-card">
                    <CardHeader>
                        <CardTitle className="text-lg">Mapeamento de Colunas</CardTitle>
                        <CardDescription>Indique a coluna do telefone e quais dados salvar.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="flex items-center justify-between p-3 bg-blue-50 text-blue-800 rounded-md text-sm border border-blue-100">
                            <div className="flex items-center gap-2">
                                <TableIcon className="h-4 w-4" />
                                <span className="font-semibold">{rawData.length}</span> linhas de dados identificadas.
                            </div>
                            <span className="text-xs opacity-75">Linhas vazias foram removidas.</span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Coluna de Telefone (Obrigatório)</Label>
                                    <Select value={selectedPhoneCol} onValueChange={setSelectedPhoneCol}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Selecione a coluna..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {headers.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Name Column Selector */}
                                <div className="space-y-2 pt-4 border-t">
                                    <Label>Coluna de Nome (Opcional)</Label>
                                    <p className="text-xs text-muted-foreground mb-2">Selecione a coluna com os nomes. Formatação automática será aplicada.</p>
                                    <Select value={selectedNameCol || "__none__"} onValueChange={v => setSelectedNameCol(v === "__none__" ? "" : v)}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="-- Não usar nome --" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="__none__">-- Não usar nome --</SelectItem>
                                            {headers.filter(h => h !== selectedPhoneCol).map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {selectedNameCol && (
                                    <div className="space-y-3 pt-3 animate-in slide-in-from-top-2">
                                        <Label className="text-xs">Formatação do Nome</Label>
                                        <div className="flex gap-3">
                                            <div
                                                className={cn(
                                                    "flex items-center gap-2 px-3 py-2 rounded-md border cursor-pointer text-sm",
                                                    nameFormat === 'full' ? "border-primary bg-primary/10" : "hover:bg-muted"
                                                )}
                                                onClick={() => setNameFormat('full')}
                                            >
                                                <div className={cn("w-3 h-3 rounded-full border", nameFormat === 'full' ? "bg-primary border-primary" : "border-muted-foreground")} />
                                                Nome Completo
                                            </div>
                                            <div
                                                className={cn(
                                                    "flex items-center gap-2 px-3 py-2 rounded-md border cursor-pointer text-sm",
                                                    nameFormat === 'first' ? "border-primary bg-primary/10" : "hover:bg-muted"
                                                )}
                                                onClick={() => setNameFormat('first')}
                                            >
                                                <div className={cn("w-3 h-3 rounded-full border", nameFormat === 'first' ? "bg-primary border-primary" : "border-muted-foreground")} />
                                                Primeiro Nome
                                            </div>
                                        </div>
                                        <p className="text-xs text-muted-foreground">* Nomes serão convertidos para Capitalizado (Ex: "BRUNO" → "Bruno").</p>
                                    </div>
                                )}

                                <div className="space-y-2 pt-4 border-t">
                                    <Label>Variáveis Adicionais (Opcional)</Label>
                                    <p className="text-xs text-muted-foreground mb-2">Selecione outras colunas para salvar como metadados (ex: Email, Empresa).</p>
                                    <div className="border rounded-md p-3 max-h-32 overflow-y-auto space-y-2">
                                        {headers.filter(h => h !== selectedPhoneCol && h !== selectedNameCol).map(h => (
                                            <div key={h} className="flex items-center space-x-2">
                                                <Checkbox id={h} checked={selectedVarCols.includes(h)} onCheckedChange={() => toggleVarCol(h)} />
                                                <label htmlFor={h} className="text-sm cursor-pointer select-none font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                                    {h}
                                                </label>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="border rounded-lg overflow-hidden">
                                <div className="bg-muted p-2 text-xs font-semibold border-b">Pré-visualização (5 primeiros registros)</div>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-[100px]">Original</TableHead>
                                            <TableHead className="w-[120px]">Formatado</TableHead>
                                            {selectedNameCol && <TableHead className="w-[100px]">Nome</TableHead>}
                                            {selectedVarCols.slice(0, 1).map(v => <TableHead key={v}>{v}</TableHead>)}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {previewFormatted.map((row, i) => (
                                            <TableRow key={i}>
                                                <TableCell className="text-xs truncate max-w-[100px]">{row.raw}</TableCell>
                                                <TableCell className="text-xs font-medium text-green-600 truncate">{row.formatted || 'Inválido'}</TableCell>
                                                {selectedNameCol && <TableCell className="text-xs font-medium text-blue-600 truncate">{row.formattedName}</TableCell>}
                                                {selectedVarCols.slice(0, 1).map(v => (
                                                    <TableCell key={v} className="text-xs truncate max-w-[80px]">{row[v]}</TableCell>
                                                ))}
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>

                        <div className="flex justify-between pt-4">
                            <Button variant="ghost" onClick={() => { setFile(null); setCurrentStep(0); }}>Cancelar</Button>
                            <Button onClick={() => setCurrentStep(2)} disabled={!selectedPhoneCol}>
                                Próximo <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* STEP 3: CONFIG */}
            {currentStep === 2 && (
                <Card className="glass-card">
                    <CardHeader>
                        <CardTitle className="text-lg">Configuração Final</CardTitle>
                        <CardDescription>Defina o nome, tags e divisão da lista.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Input Name */}
                        <div className="space-y-2">
                            <Label>Nome da Audiência</Label>
                            <Input
                                value={baseName}
                                onChange={(e) => setBaseName(e.target.value)}
                                placeholder="Ex: Leads Outubro"
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label className="flex items-center gap-2">
                                    <Users className="h-4 w-4" /> Dividir em quantas listas?
                                </Label>
                                <div className="flex flex-col gap-2">
                                    <div className="flex items-center gap-4">
                                        <Input
                                            type="number"
                                            min={1}
                                            max={Math.min(50, rawData.length)}
                                            value={splitCount}
                                            onChange={(e) => {
                                                const val = parseInt(e.target.value);
                                                const maxVal = Math.min(50, rawData.length);
                                                setSplitCount(isNaN(val) || val < 1 ? 1 : (val > maxVal ? maxVal : val));
                                            }}
                                            className="w-24"
                                        />
                                        <span className="text-sm text-muted-foreground">
                                            {(() => {
                                                const total = rawData.length;
                                                if (splitCount <= 1) return `${total} contatos em lista única`;

                                                const size = Math.ceil(total / splitCount);
                                                const lastSize = total - (size * (splitCount - 1));

                                                if (lastSize === size) {
                                                    return `${splitCount} listas de ${size} contatos`;
                                                }
                                                return `${splitCount - 1} listas de ${size} e 1 lista de ${lastSize} contatos`;
                                            })()}
                                        </span>
                                    </div>
                                    <p className="text-xs text-muted-foreground">O máximo de listas é baseado no número de contatos (1 por lista).</p>
                                </div>
                            </div>

                            {/* Tags */}
                            <div className="space-y-2">
                                <Label className="flex items-center gap-2">
                                    <TagIcon className="h-4 w-4" /> Tags
                                </Label>
                                <div className="space-y-2">
                                    <Input
                                        placeholder="Digite e pressione Enter..."
                                        value={currentTag}
                                        onChange={(e) => setCurrentTag(e.target.value)}
                                        onKeyDown={handleAddTag}
                                    />
                                    <div className="flex flex-wrap gap-2">
                                        {tags.map(tag => {
                                            const colors = getTagColor(tag);
                                            return (
                                                <Badge
                                                    key={tag}
                                                    variant="secondary"
                                                    className="px-2 py-1 text-sm border"
                                                    style={{
                                                        backgroundColor: colors.bg,
                                                        color: colors.text,
                                                        borderColor: colors.border
                                                    }}
                                                >
                                                    {tag} <button onClick={() => setTags(tags.filter(t => t !== tag))} className="ml-1 hover:text-red-500">×</button>
                                                </Badge>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-between pt-4 border-t">
                            <Button variant="ghost" onClick={() => setCurrentStep(1)} disabled={isProcessing}>
                                <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
                            </Button>
                            <Button onClick={handleUpload} disabled={isProcessing || !baseName} className="min-w-[150px]">
                                {isProcessing ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                                {isProcessing ? "Processando..." : "Finalizar Importação"}
                            </Button>
                        </div>
                        {isProcessing && (
                            <div className="space-y-2">
                                <Progress value={progress} className="h-2" />
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    );
};
