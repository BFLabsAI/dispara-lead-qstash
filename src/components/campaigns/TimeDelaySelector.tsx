"use client";

import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Clock } from "lucide-react";
import React from "react";

interface TimeDelaySelectorProps {
    tempoMin: number;
    setTempoMin: (val: number) => void;
    tempoMax: number;
    setTempoMax: (val: number) => void;
    minLimit?: number;
    maxLimit?: number;
}

export const TimeDelaySelector = ({
    tempoMin,
    setTempoMin,
    tempoMax,
    setTempoMax,
    minLimit = 15,
    maxLimit = 200
}: TimeDelaySelectorProps) => {

    const handleValueChange = (vals: number[]) => {
        const [newMin, newMax] = vals;

        // Ensure min doesn't go below limit
        const safeMin = Math.max(minLimit, newMin);

        // Simple heuristic to enforce gap:
        // By default, prefer pushing bounds outwards to satisfy gap
        let finalMin = safeMin;
        let finalMax = newMax;

        // If gap is less than 20
        if (finalMax - finalMin < 20) {
            // Detect direction of movement by comparing to previous state
            // If newMin > tempoMin, user is dragging min up. Push max up.
            if (finalMin > tempoMin) {
                finalMax = finalMin + 20;
            } else {
                // Otherwise (dragging max down, or min down), push min down to satisfy gap
                finalMin = Math.max(minLimit, finalMax - 20);
            }
        }

        // Final sanity check
        // If finalMin was pushed below minLimit by logic above (shouldn't happen due to max), clamp it
        finalMin = Math.max(minLimit, finalMin);
        // Ensure max is at least min + 20
        finalMax = Math.max(finalMin + 20, finalMax);

        setTempoMin(finalMin);
        setTempoMax(finalMax);
    };

    // Ensure current values are within bounds for display
    const displayMin = Math.max(minLimit, tempoMin);
    const displayMax = Math.max(displayMin + 20, tempoMax);

    return (
        <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5">
                <Clock className="h-4 w-4" /> Intervalo de Envio (segundos)
            </Label>
            <Slider
                defaultValue={[displayMin, displayMax]}
                value={[displayMin, displayMax]}
                min={minLimit}
                max={maxLimit}
                step={1}
                onValueChange={handleValueChange}
                className="py-4"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
                <span>Mín: {displayMin}s</span>
                <span>Máx: {displayMax}s</span>
            </div>
        </div>
    );
};
